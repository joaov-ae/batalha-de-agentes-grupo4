"""Contratos de entrada e saída das tools (viram o OpenAPI que o agente importa)."""

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field

EstadoLiteral = Literal["vai_faltar", "zero_a_zero", "fecha_bem", "ja_no_buraco"]


class StatusResposta(BaseModel):
    id_usuario: str
    data_referencia: date
    estado: EstadoLiteral = Field(description="Estado do mês. ja_no_buraco => não otimizar, encaminhar para atendimento.")
    saldo_hoje: float
    renda_mensal: float
    proximo_salario_data: date | None
    proximo_salario_valor: float | None
    dias_ate_salario: int
    saldo_projetado_vespera_salario: float
    saldo_minimo_projetado: float
    data_saldo_minimo: date | None
    dia_que_acaba: date | None = Field(description="Primeiro dia com saldo projetado negativo; null se não acaba.")
    compromissos_ate_salario: float
    disponivel_ate_salario: float = Field(description="Saldo + entradas previstas - contas previstas até o salário.")
    sobra_por_dia: float
    reserva_sugerida: float
    score_alerta: int
    sinais: list[str]
    antecipar_aviso: bool
    juros_estimados: float = Field(description="Juros de limite estimados até o salário, em R$.")
    encaminhar_atendimento: bool
    formatado: dict[str, str | None] = Field(description="Valores prontos para a fala (R$ e datas em pt-BR).")


class EventoResposta(BaseModel):
    data: date
    descricao: str
    valor: float
    tipo_item: str


class PontoResposta(BaseModel):
    data: date
    saldo: float
    eventos: list[EventoResposta] = []


class ProjecaoResposta(BaseModel):
    id_usuario: str
    data_referencia: date
    saldo_inicial: float
    fim: date
    saida_variavel_diaria: float
    saldo_final: float
    saldo_minimo: float
    dia_que_acaba: date | None
    pontos: list[PontoResposta]


class AjusteResposta(BaseModel):
    ajuste_id: str = Field(description="Use este id em registrar_decisao.")
    tipo: Literal["mudanca_data", "assinatura_redundante", "gasto_discricionario"]
    titulo: str
    valor: float
    impacto_dias: int = Field(description="Dias a mais com dinheiro antes do salário.")
    resolve: bool = Field(description="Com o ajuste, a conta não fica negativa até o salário.")
    ganho_vespera_salario: float
    esforco: int = Field(description="1 um toque; 2 ação fora do app; 3 mudança de hábito.")
    acao: str | None = Field(description="Ação executável em um toque, se houver.")
    detalhes: dict[str, Any]
    formatado: dict[str, str | None]


class AjustesResposta(BaseModel):
    id_usuario: str
    estado: EstadoLiteral
    encaminhar_atendimento: bool
    ajustes: list[AjusteResposta]


class ResumoRecebimentoResposta(BaseModel):
    id_usuario: str
    estado: EstadoLiteral
    sobra_ate_salario: float
    sobra_por_dia: float
    dias_ate_salario: int
    proximo_salario_data: date | None
    dia_que_acaba: date | None
    principais_ajustes: list[AjusteResposta]
    formatado: dict[str, str | None]


class ContaComprometida(BaseModel):
    data: date
    descricao: str
    valor: float
    tipo_item: str
    formatado: dict[str, str | None]


class SimularTransacaoPedido(BaseModel):
    valor: float = Field(gt=0, description="Valor do Pix/pagamento/compra em R$.")
    data: date | None = Field(None, description="Data do débito; padrão = dia seguinte à data de referência.")
    canal: Literal["pix", "pagamento", "cartao"] = "pix"
    descricao: str = "nova transação"
    parcelas: int = Field(1, ge=1, le=24, description="Número de parcelas (para compras no cartão). Padrão = 1.")


class SimularTransacaoResposta(BaseModel):
    id_usuario: str
    fica_negativo: bool
    dia_que_acaba_antes: date | None
    dia_que_acaba_depois: date | None
    saldo_minimo_depois: float
    juros_estimados_antes: float
    juros_estimados_depois: float
    juros_adicionais: float
    data_debito_na_conta: date
    data_sugerida: date | None = Field(description="Data (dia do salário) em que o pagamento não deixa a conta negativa.")
    data_sugerida_resolve: bool
    parcelas: int = 1
    valor_parcela: float | None = None
    contas_comprometidas: list[ContaComprometida] = Field(
        default_factory=list,
        description="Contas fixas e faturas que vencerão após o dinheiro acabar e antes da próxima renda.",
    )
    formatado: dict[str, str | None]


class ProdutoInvestimento(BaseModel):
    nome: str
    tipo: str
    rentabilidade: str
    liquidez: str
    risco: str
    resgate_imediato: bool
    descricao: str
    rendimento_estimado_mes: float | None = None
    formatado: dict[str, str | None]


class OpcoesInvestimentoResposta(BaseModel):
    id_usuario: str
    saldo_hoje: float
    valor_sugerido_reserva: float
    produtos: list[ProdutoInvestimento]
    formatado: dict[str, str | None]


class RegistroPoupancaPedido(BaseModel):
    valor: float = Field(gt=0, description="Valor economizado/poupado em R$.")
    origem: Literal["recusa_compra", "meta_reserva", "ajuste_categoria"] = "recusa_compra"
    motivo: str | None = Field(None, description="Motivo ou descrição opcional da economia (ex: 'desistiu do fone').")


class RegistroPoupancaResposta(BaseModel):
    id_usuario: str
    valor_poupado: float
    total_poupado_acumulado: float
    origem: str
    motivo: str | None
    criado_em: str
    mensagem: str
    formatado: dict[str, str | None]


class SimularReservaPedido(BaseModel):
    valor: float = Field(gt=0, description="Valor a separar no dia do salário, em R$.")


class SimularReservaResposta(BaseModel):
    id_usuario: str
    valor: float
    data_reserva: date | None
    proximo_ciclo_fim: date
    saldo_minimo_proximo_ciclo_sem_reserva: float
    saldo_minimo_proximo_ciclo_com_reserva: float
    reserva_cabe: bool = Field(description="A reserva não deixa a conta negativa no próximo ciclo.")
    formatado: dict[str, str | None]


class SimularParcelamentoPedido(BaseModel):
    parcelas: int = Field(3, ge=2, le=24)
    valor_fatura: float | None = Field(None, gt=0, description="Padrão: próxima fatura prevista.")


class DecisaoPedido(BaseModel):
    ajuste_id: str
    aceito: bool


class MetaReservaPedido(BaseModel):
    valor: float = Field(gt=0)


class AgendarPixPedido(BaseModel):
    valor: float = Field(gt=0)
    data: date
    descricao: str = ""
    ajuste_id: str | None = None


class SepararReservaPedido(BaseModel):
    valor: float = Field(gt=0)
    data: date | None = None


class LembreteTetoPedido(BaseModel):
    categoria: str
    teto: float = Field(gt=0)
    ajuste_id: str | None = None


class AcaoResposta(BaseModel):
    acao_id: str
    tipo_acao: str
    simulado: bool = Field(True, description="No protótipo as ações são simuladas; diga isso ao cliente/banca.")
    payload: dict[str, Any]
