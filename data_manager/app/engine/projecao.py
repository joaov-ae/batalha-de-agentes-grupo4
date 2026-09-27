"""Motor de projeção: saldo dia a dia até a véspera do próximo salário.

saldo(d) = saldo(d-1) + entradas recorrentes(d) - saídas recorrentes(d) - ritmo variável diário.
O consumo no cartão não entra no ritmo: ele chega à conta pela fatura, que é um item recorrente.
"""

import calendar
from collections import defaultdict
from collections.abc import Iterable
from datetime import date, timedelta

from app.engine.modelos import Evento, Features, ItemRecorrente, PontoProjecao, Projecao

HORIZONTE_SEM_RENDA_DIAS = 30


def dia_no_mes(ano: int, mes: int, dia: int) -> date:
    return date(ano, mes, min(dia, calendar.monthrange(ano, mes)[1]))


def mes_seguinte(d: date, dia: int) -> date:
    ano, mes = (d.year + 1, 1) if d.month == 12 else (d.year, d.month + 1)
    return dia_no_mes(ano, mes, dia)


def ocorrencias(item: ItemRecorrente, ref: date, ate: date) -> list[date]:
    """Datas futuras (ref < data <= ate) em que o item deve acontecer."""
    if item.parcelas_restantes is not None and item.parcelas_restantes <= 0:
        return []
    if item.ocorreu_no_mes_atual:
        proxima = mes_seguinte(ref, item.dia_tipico)
    else:
        no_mes = dia_no_mes(ref.year, ref.month, item.dia_tipico)
        if no_mes > ref:
            proxima = no_mes
        elif item.tipo == "S":
            # Saída atrasada neste mês: assume que sai amanhã (conservador).
            proxima = ref + timedelta(days=1)
        else:
            # Entrada atrasada: não conta com ela antes do mês que vem (conservador).
            proxima = mes_seguinte(ref, item.dia_tipico)
    limite = item.parcelas_restantes if item.parcelas_restantes is not None else 10**6
    datas: list[date] = []
    while proxima <= ate and len(datas) < limite:
        datas.append(proxima)
        proxima = mes_seguinte(proxima, item.dia_tipico)
    return datas


def proximo_salario(f: Features) -> date | None:
    renda = f.renda_principal
    if renda is None:
        return None
    datas = ocorrencias(renda, f.data_referencia, f.data_referencia + timedelta(days=62))
    return datas[0] if datas else None


def fim_padrao(f: Features) -> date:
    """Véspera do próximo salário (ou 30 dias, para quem não tem renda recorrente)."""
    salario = proximo_salario(f)
    if salario is None:
        return f.data_referencia + timedelta(days=HORIZONTE_SEM_RENDA_DIAS)
    return salario - timedelta(days=1)


def eventos_previstos(f: Features, ate: date) -> list[Evento]:
    eventos = []
    for item in f.itens:
        valor = item.valor_previsto if item.tipo == "E" else -item.valor_previsto
        for d in ocorrencias(item, f.data_referencia, ate):
            eventos.append(Evento(d, round(valor, 2), item.chave, item.descricao, item.tipo_item, item.reagendavel))
    return sorted(eventos, key=lambda e: (e.data, e.valor))


def projetar(
    saldo_inicial: float,
    eventos: Iterable[Evento],
    saida_variavel_diaria: float,
    ref: date,
    fim: date,
) -> Projecao:
    por_dia: dict[date, list[Evento]] = defaultdict(list)
    for e in eventos:
        por_dia[e.data].append(e)
    pontos = []
    saldo = saldo_inicial
    d = ref + timedelta(days=1)
    while d <= fim:
        do_dia = tuple(por_dia.get(d, ()))
        saldo = round(saldo + sum(e.valor for e in do_dia) - saida_variavel_diaria, 2)
        pontos.append(PontoProjecao(d, saldo, do_dia))
        d += timedelta(days=1)
    return Projecao(ref, saldo_inicial, fim, tuple(pontos), saida_variavel_diaria)


def projetar_cliente(
    f: Features,
    *,
    ate: date | None = None,
    eventos: Iterable[Evento] | None = None,
    saida_variavel_diaria: float | None = None,
) -> Projecao:
    fim = ate or fim_padrao(f)
    evs = eventos_previstos(f, fim) if eventos is None else eventos
    ritmo = f.saida_variavel_diaria if saida_variavel_diaria is None else saida_variavel_diaria
    return projetar(f.saldo_hoje, evs, ritmo, f.data_referencia, fim)


def dias_ganhos(base: Projecao, nova: Projecao) -> tuple[int, bool]:
    """Dias a mais de dinheiro e se a nova projeção fica sem negativo até o fim."""
    if base.dia_que_acaba is None:
        return 0, nova.dia_que_acaba is None
    if nova.dia_que_acaba is None:
        return (base.fim - base.dia_que_acaba).days + 1, True
    return max(0, (nova.dia_que_acaba - base.dia_que_acaba).days), False
