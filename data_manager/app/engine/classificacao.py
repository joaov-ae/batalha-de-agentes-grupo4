"""Classificação do cliente nos 4 estados do escopo, a partir da projeção."""

from dataclasses import dataclass
from datetime import date

from app.engine.custo import juros_estimados
from app.engine.modelos import Estado, Features, Projecao
from app.engine.projecao import projetar_cliente, proximo_salario


@dataclass(frozen=True)
class Regras:
    corte_zero_a_zero: float = 0.10
    corte_score_alerta: int = 4
    meses_vermelho_buraco: int = 3


def classificar(f: Features, p: Projecao, regras: Regras) -> Estado:
    """Ordem de precedência: buraco > vai faltar > zero a zero > fecha bem."""
    if f.saldo_hoje < 0 or f.meses_vermelho_consecutivos >= regras.meses_vermelho_buraco:
        return Estado.JA_NO_BURACO
    if p.saldo_minimo < 0:
        return Estado.VAI_FALTAR
    if p.saldo_final <= regras.corte_zero_a_zero * f.renda_mensal:
        return Estado.ZERO_A_ZERO
    return Estado.FECHA_BEM


@dataclass(frozen=True)
class Status:
    id_usuario: str
    data_referencia: date
    estado: Estado
    saldo_hoje: float
    renda_mensal: float
    proximo_salario_data: date | None
    proximo_salario_valor: float | None
    dias_ate_salario: int
    saldo_projetado_vespera_salario: float
    saldo_minimo_projetado: float
    data_saldo_minimo: date | None
    dia_que_acaba: date | None
    compromissos_ate_salario: float
    disponivel_ate_salario: float
    sobra_por_dia: float
    reserva_sugerida: float
    score_alerta: int
    sinais: tuple[str, ...]
    antecipar_aviso: bool
    juros_estimados: float
    encaminhar_atendimento: bool


def calcular_status(f: Features, regras: Regras, taxa_juros_dia: float) -> tuple[Status, Projecao]:
    p = projetar_cliente(f)
    estado = classificar(f, p, regras)
    salario = proximo_salario(f)
    renda = f.renda_principal
    eventos = [e for pt in p.pontos for e in pt.eventos]
    compromissos = -sum(e.valor for e in eventos if e.valor < 0)
    entradas = sum(e.valor for e in eventos if e.valor > 0)
    # "Sobram R$ X até o dia do salário, ou R$ Y por dia": dinheiro livre depois das contas fixas.
    disponivel = round(f.saldo_hoje + entradas - compromissos, 2)
    dias = max(len(p.pontos), 1)
    reserva = 0.0
    if estado in (Estado.ZERO_A_ZERO, Estado.FECHA_BEM) and p.saldo_final > 0:
        reserva = float(int(p.saldo_final // 10 * 10))
    status = Status(
        id_usuario=f.id_usuario,
        data_referencia=f.data_referencia,
        estado=estado,
        saldo_hoje=round(f.saldo_hoje, 2),
        renda_mensal=f.renda_mensal,
        proximo_salario_data=salario,
        proximo_salario_valor=renda.valor_previsto if renda else None,
        dias_ate_salario=(salario - f.data_referencia).days if salario else len(p.pontos),
        saldo_projetado_vespera_salario=p.saldo_final,
        saldo_minimo_projetado=p.saldo_minimo,
        data_saldo_minimo=p.data_saldo_minimo,
        dia_que_acaba=p.dia_que_acaba,
        compromissos_ate_salario=round(compromissos, 2),
        disponivel_ate_salario=disponivel,
        sobra_por_dia=round(max(disponivel, 0) / dias, 2),
        reserva_sugerida=reserva,
        score_alerta=f.score,
        sinais=f.sinais,
        antecipar_aviso=f.score >= regras.corte_score_alerta,
        juros_estimados=juros_estimados(p, taxa_juros_dia),
        encaminhar_atendimento=estado is Estado.JA_NO_BURACO,
    )
    return status, p
