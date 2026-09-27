"""Vocabulário dos eventos observados.

Os valores espelham o que os serviços reais produzem, para que a troca da simulação por eventos reais não mude
o schema:
- códigos E01–E10 / S01–S09 e decisões: guardrails/app/catalogo.py (copiados, não importados: serviços independentes);
- status e tipos de ajuste: financial-agent (POST /analyze, /savings e /chat) no Cloud Run;
- intervenções próprias do agente (recusa de escopo e fallback do filtro de saída): api.py do financial-agent.
"""

from dataclasses import dataclass
from enum import StrEnum


class Fonte(StrEnum):
    guardrails = "guardrails"
    # /chat devolve status=fora_escopo antes de chamar o Gemini.
    agente_escopo = "agente_escopo"
    # /chat troca a resposta do LLM por um texto padrão (números, R$, %, termos protegidos ou fora do escopo).
    agente_filtro_saida = "agente_filtro_saida"
    # status=atendimento_humano (ja_no_buraco ou encaminhar_atendimento): o agente não otimiza e encaminha.
    atendimento_humano = "atendimento_humano"


class Decisao(StrEnum):
    permitir = "permitir"
    permitir_com_instrucao = "permitir_com_instrucao"
    mascarar = "mascarar"
    reescrever = "reescrever"
    bloquear = "bloquear"


class Momento(StrEnum):
    salario = "salario"
    pix_compra = "pix_compra"
    fora_da_curva = "fora_da_curva"


class Estado(StrEnum):
    vai_faltar = "vai_faltar"
    zero_a_zero = "zero_a_zero"
    fecha_bem = "fecha_bem"
    ja_no_buraco = "ja_no_buraco"


class StatusAlerta(StrEnum):
    """Valores de `status` do POST /analyze do financial-agent."""

    risco_vermelho = "risco_vermelho"
    saldo_estimado_no_limite = "saldo_estimado_no_limite"
    saldo_estimado_positivo = "saldo_estimado_positivo"
    atendimento_humano = "atendimento_humano"
    dados_insuficientes = "dados_insuficientes"


STATUS_POR_ESTADO = {
    Estado.vai_faltar: StatusAlerta.risco_vermelho,
    Estado.zero_a_zero: StatusAlerta.saldo_estimado_no_limite,
    Estado.fecha_bem: StatusAlerta.saldo_estimado_positivo,
    Estado.ja_no_buraco: StatusAlerta.atendimento_humano,
}
# /analyze só pede consentimento para buscar ajustes nestes dois status.
STATUS_COM_CONSENTIMENTO = {StatusAlerta.risco_vermelho, StatusAlerta.saldo_estimado_no_limite}


class StatusChat(StrEnum):
    respondido = "respondido"
    fora_escopo = "fora_escopo"
    atendimento_humano = "atendimento_humano"


class TipoAjuste(StrEnum):
    """Tipos aceitos pelo POST /savings do financial-agent."""

    assinatura_redundante = "assinatura_redundante"
    gasto_discricionario = "gasto_discricionario"
    mudanca_data = "mudanca_data"


class ResultadoAjuste(StrEnum):
    aceito = "aceito"
    recusado = "recusado"
    agora_nao = "agora_nao"
    ignorado = "ignorado"


class Voto(StrEnum):
    up = "up"
    down = "down"


class MotivoDislike(StrEnum):
    nao_entendi = "nao_entendi"
    numero_errado = "numero_errado"
    insistente = "insistente"
    fora_do_escopo = "fora_do_escopo"


class GrupoAB(StrEnum):
    tratamento = "tratamento"
    controle = "controle"


# Regra "não insiste" do escopo: um ajuste recusado duas vezes sai da lista daquele cliente.
MAX_RECUSAS = 2


@dataclass(frozen=True)
class CodigoIntervencao:
    codigo: str
    fonte: Fonte
    direcao: str  # entrada | saida
    categoria: str
    decisao: Decisao


_GUARDRAILS = [
    ("E01", "entrada", "jailbreak_ofuscacao", Decisao.bloquear),
    ("E02", "entrada", "prompt_injection", Decisao.bloquear),
    ("E03", "entrada", "persona", Decisao.bloquear),
    ("E04", "entrada", "coding_debug", Decisao.bloquear),
    ("E05", "entrada", "apelo_emocional", Decisao.permitir_com_instrucao),
    ("E06", "entrada", "vies_discriminacao", Decisao.bloquear),
    ("E07", "entrada", "inferencia_saude", Decisao.bloquear),
    ("E08", "entrada", "inferencia_sensivel", Decisao.bloquear),
    ("E09", "entrada", "dados_pessoais", Decisao.mascarar),
    ("E10", "entrada", "conteudo_nocivo", Decisao.bloquear),
    ("S01", "saida", "vazamento_config", Decisao.reescrever),
    ("S02", "saida", "oferta_indevida", Decisao.reescrever),
    ("S03", "saida", "inferencia_saude", Decisao.reescrever),
    ("S04", "saida", "inferencia_sensivel", Decisao.reescrever),
    ("S05", "saida", "linguagem_discriminatoria", Decisao.bloquear),
    ("S06", "saida", "acatou_manipulacao", Decisao.bloquear),
    ("S07", "saida", "numero_nao_suportado", Decisao.reescrever),
    ("S08", "saida", "dados_pessoais", Decisao.mascarar),
    ("S09", "saida", "conteudo_nocivo", Decisao.bloquear),
]

# Intervenções do próprio financial-agent (prefixo AG_), com os mesmos campos dos códigos do guardrails.
_AGENTE = [
    ("AG_ESCOPO_INVEST", Fonte.agente_escopo, "entrada", "investimentos", Decisao.bloquear),
    ("AG_ESCOPO_GERAL", Fonte.agente_escopo, "entrada", "fora_do_orcamento", Decisao.bloquear),
    ("AG_FILTRO_NUMERO", Fonte.agente_filtro_saida, "saida", "numero_na_resposta", Decisao.reescrever),
    ("AG_FILTRO_TERMO_PROTEGIDO", Fonte.agente_filtro_saida, "saida", "termo_protegido", Decisao.reescrever),
    ("AG_FILTRO_ESCOPO", Fonte.agente_filtro_saida, "saida", "resposta_fora_do_escopo", Decisao.reescrever),
    ("AG_ATENDIMENTO_HUMANO", Fonte.atendimento_humano, "saida", "encaminhamento", Decisao.bloquear),
]

CODIGOS: dict[str, CodigoIntervencao] = {
    **{c: CodigoIntervencao(c, Fonte.guardrails, d, cat, dec) for c, d, cat, dec in _GUARDRAILS},
    **{c: CodigoIntervencao(c, f, d, cat, dec) for c, f, d, cat, dec in _AGENTE},
}
