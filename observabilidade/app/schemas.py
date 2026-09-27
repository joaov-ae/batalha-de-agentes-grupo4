"""Contratos HTTP: ingestão de eventos (agente, guardrails, front) e respostas das métricas."""

import uuid
from datetime import UTC, date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.catalogo import (
    CODIGOS,
    STATUS_COM_CONSENTIMENTO,
    Decisao,
    Estado,
    Momento,
    MotivoDislike,
    ResultadoAjuste,
    StatusAlerta,
    TipoAjuste,
    Voto,
)


def _agora() -> datetime:
    return datetime.now(UTC)


def _novo_id() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------------------------- eventos
class _Evento(BaseModel):
    id_usuario: str = Field(min_length=1, max_length=64)
    criado_em: datetime = Field(default_factory=_agora, description="Momento do evento; padrão: agora (UTC).")


class ConversaEvento(_Evento):
    conversa_id: str = Field(default_factory=_novo_id)
    sessao_id: str | None = None
    origem: Literal["proativa", "cliente"]
    momento: Momento | None = Field(None, description="Só em conversas proativas (/analyze).")
    estado_cliente: Estado | None = None


class MensagemEvento(_Evento):
    mensagem_id: str = Field(default_factory=_novo_id)
    conversa_id: str
    papel: Literal["cliente", "agente"]
    endpoint: Literal["/analyze", "/savings", "/chat"]
    status: str | None = Field(None, description="status devolvido pelo agente (respondido, fora_escopo, ...).")
    latencia_agente_ms: float | None = Field(None, ge=0)
    reescrita: bool = Field(False, description="Resposta trocada pelo filtro do agente ou reescrita pelo guardrails.")


class FeedbackEvento(_Evento):
    feedback_id: str = Field(default_factory=_novo_id)
    mensagem_id: str
    conversa_id: str | None = None
    voto: Voto
    motivo: MotivoDislike | None = Field(None, description="Só para voto down.")

    @model_validator(mode="after")
    def _motivo_so_em_dislike(self) -> "FeedbackEvento":
        if self.motivo is not None and self.voto != Voto.down:
            raise ValueError("motivo só se aplica a voto 'down'")
        return self


class ViolacaoGuardrails(BaseModel):
    model_config = ConfigDict(extra="ignore")
    codigo: str
    categoria: str | None = None
    camada: str | None = None


class VereditoGuardrails(BaseModel):
    """Subconjunto do `Veredito` de POST /v1/entrada e /v1/saida do guardrails-itau (campos extras ignorados)."""

    model_config = ConfigDict(extra="ignore")
    decisao: Decisao
    violacoes: list[ViolacaoGuardrails] = Field(default_factory=list)
    degradado: bool = False
    latencia_ms: float = 0.0


class IntervencaoEvento(_Evento):
    conversa_id: str | None = None
    mensagem_id: str | None = None
    codigo: str | None = Field(None, description="Intervenção do agente (AG_*) ou um código E/S isolado.")
    veredito: VereditoGuardrails | None = Field(None, description="Resposta do guardrails; grava uma linha por violação.")
    tentativa: int = Field(1, ge=1)

    @model_validator(mode="after")
    def _um_dos_dois(self) -> "IntervencaoEvento":
        if (self.codigo is None) == (self.veredito is None):
            raise ValueError("informe exatamente um entre 'codigo' e 'veredito'")
        if self.codigo is not None and self.codigo not in CODIGOS:
            raise ValueError(f"codigo desconhecido: {self.codigo}")
        return self


class AlertaEvento(_Evento):
    """Envie ao fim da interação do aviso (/analyze), quando o consentimento já é conhecido."""

    alerta_id: str = Field(default_factory=_novo_id)
    conversa_id: str | None = None
    momento: Momento
    estado_cliente: Estado | None = None
    score_alerta: int | None = Field(None, ge=0, le=6)
    status_alerta: StatusAlerta
    requer_consentimento: bool | None = Field(None, description="Padrão: derivado do status_alerta.")
    consentiu: bool | None = None
    n_ajustes_oferecidos: int = Field(0, ge=0)
    desativou_notificacao: bool = False

    @model_validator(mode="after")
    def _derivar_consentimento(self) -> "AlertaEvento":
        if self.requer_consentimento is None:
            self.requer_consentimento = self.status_alerta in STATUS_COM_CONSENTIMENTO
        return self


class AjusteEvento(_Evento):
    ajuste_id: str = Field(default_factory=_novo_id)
    alerta_id: str | None = None
    tipo: TipoAjuste
    chave: str | None = Field(None, description="Identificador estável do ajuste (regra de 2 recusas).")
    valor: float = Field(ge=0)
    impacto_dias: int | None = Field(None, ge=0)
    resolve: bool | None = None
    resultado: ResultadoAjuste


class EventoRegistrado(BaseModel):
    tabela: str
    ids: list[str]


# ---------------------------------------------------------------------------------------------- métricas
class Periodo(BaseModel):
    data_inicio: date
    data_fim: date
    granularidade: Literal["semana", "mes"] | None = None


class Resumo(BaseModel):
    periodo: Periodo
    clientes_ativos: int
    conversas: int
    conversas_com_intervencao: int
    pct_conversas_com_intervencao: float | None
    intervencoes: int
    clientes_com_intervencao: int
    clientes_encaminhados_atendimento: int
    votos: int
    like_rate: float | None
    alertas: int
    pct_alertas_com_ajuste_aceito: float | None
    pct_clientes_desativaram_notificacao: float | None


class Metricas(BaseModel):
    """Envelope genérico: período consultado e blocos de linhas (cada bloco é uma lista de registros)."""

    periodo: Periodo
    dados: dict[str, Any]
