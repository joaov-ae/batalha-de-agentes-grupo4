"""Estruturas de entrada e saída do engine. Puro Python: nada aqui depende do BigQuery."""

from dataclasses import dataclass, field
from datetime import date
from enum import StrEnum


class Estado(StrEnum):
    VAI_FALTAR = "vai_faltar"
    ZERO_A_ZERO = "zero_a_zero"
    FECHA_BEM = "fecha_bem"
    JA_NO_BURACO = "ja_no_buraco"


TIPOS_RENDA_PRINCIPAL = ("salario", "beneficio", "entrada_recorrente", "aluguel_recebido")


@dataclass(frozen=True)
class ItemRecorrente:
    chave: str
    tipo: str  # "E" entrada, "S" saída
    tipo_item: str  # salario, beneficio, aluguel_recebido, entrada_recorrente, conta_fixa, assinatura, parcela, financiamento, fatura
    descricao: str
    micro: str
    dia_tipico: int
    valor_previsto: float
    ultima_data: date
    ocorreu_no_mes_atual: bool
    reagendavel: bool = False
    grupo_assinatura: str | None = None
    parcelas_restantes: int | None = None


@dataclass(frozen=True)
class ConsumoCategoria:
    macro: str
    gasto_mes_atual: float
    media_mensal_3m: float
    esperado_ate_hoje: float


@dataclass(frozen=True)
class Features:
    """Tudo o que o engine precisa de um cliente, já agregado pelo pipeline SQL."""

    id_usuario: str
    data_referencia: date
    saldo_hoje: float
    itens: tuple[ItemRecorrente, ...]
    saida_variavel_diaria: float
    saida_variavel_diaria_7d: float = 0.0
    score: int = 0
    sinais: tuple[str, ...] = ()
    meses_vermelho_consecutivos: int = 0
    consumo: tuple[ConsumoCategoria, ...] = ()

    @property
    def renda_mensal(self) -> float:
        return round(sum(i.valor_previsto for i in self.itens if i.tipo == "E"), 2)

    @property
    def renda_principal(self) -> ItemRecorrente | None:
        entradas = [i for i in self.itens if i.tipo == "E" and i.tipo_item in TIPOS_RENDA_PRINCIPAL]
        return max(entradas, key=lambda i: i.valor_previsto, default=None)


@dataclass(frozen=True)
class Evento:
    data: date
    valor: float  # com sinal: entrada > 0, saída < 0
    chave: str
    descricao: str
    tipo_item: str
    reagendavel: bool = False


@dataclass(frozen=True)
class PontoProjecao:
    data: date
    saldo: float
    eventos: tuple[Evento, ...] = ()


@dataclass(frozen=True)
class Projecao:
    data_referencia: date
    saldo_inicial: float
    fim: date  # último dia projetado (véspera do salário, ou outro limite)
    pontos: tuple[PontoProjecao, ...]
    saida_variavel_diaria: float

    @property
    def saldo_final(self) -> float:
        return self.pontos[-1].saldo if self.pontos else self.saldo_inicial

    @property
    def saldo_minimo(self) -> float:
        return min((p.saldo for p in self.pontos), default=self.saldo_inicial)

    @property
    def data_saldo_minimo(self) -> date | None:
        if not self.pontos:
            return None
        return min(self.pontos, key=lambda p: p.saldo).data

    @property
    def dia_que_acaba(self) -> date | None:
        """Primeiro dia com saldo projetado negativo."""
        return next((p.data for p in self.pontos if p.saldo < 0), None)

    @property
    def saldo_devedor_dia_acumulado(self) -> float:
        return sum(-p.saldo for p in self.pontos if p.saldo < 0)


@dataclass
class Ajuste:
    ajuste_id: str  # estável entre execuções: <tipo>:<chave>
    tipo: str  # mudanca_data | assinatura_redundante | gasto_discricionario
    titulo: str
    valor: float  # R$ liberados até o salário (ou economia do mês)
    impacto_dias: int  # dias a mais de dinheiro antes do salário
    resolve: bool  # com o ajuste, a projeção não fica negativa
    ganho_vespera_salario: float
    esforco: int  # 1 = um toque, 2 = ação fora do app, 3 = mudança de hábito
    acao: str | None  # agendar_pix | lembrete_teto | None
    detalhes: dict = field(default_factory=dict)
