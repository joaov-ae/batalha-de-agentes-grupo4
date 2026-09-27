"""Contrato HTTP entre o agente (orquestrador) e o serviço de guardrails."""

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.catalogo import Decisao, Severidade

Camada = Literal["regra", "gemini", "model_armor"]


class Fala(BaseModel):
    papel: Literal["cliente", "agente"]
    texto: str = Field(max_length=8000)


class EntradaRequest(BaseModel):
    mensagem: str = Field(min_length=1, max_length=8000, description="Mensagem do cliente, como veio.")
    id_usuario: str | None = None
    sessao_id: str | None = None
    estado_cliente: str | None = Field(None, description="Estado do data_manager (vai_faltar, zero_a_zero...).")
    historico: list[Fala] = Field(default_factory=list, description="Últimas falas, da mais antiga à mais nova.")


class SaidaRequest(BaseModel):
    resposta: str = Field(min_length=1, max_length=16000, description="Resposta gerada pelo agente.")
    mensagem_usuario: str | None = Field(None, max_length=8000)
    contexto_tools: dict[str, Any] | list[Any] | None = Field(
        None,
        description="Respostas das tools do data_manager neste turno. Com ele, valores em R$ sem suporte "
        "viram violação S07.",
    )
    tentativa: int = Field(1, ge=1, description="1 na primeira geração; some 1 a cada reescrita.")
    id_usuario: str | None = None
    sessao_id: str | None = None


class Violacao(BaseModel):
    codigo: str
    categoria: str
    severidade: Severidade
    camada: Camada
    evidencia: str | None = None


class Veredito(BaseModel):
    decisao: Decisao
    permitido: bool = Field(description="true quando a mensagem/resposta pode seguir (permitir, com instrução ou mascarada).")
    violacoes: list[Violacao] = Field(default_factory=list)
    suspeitas: list[Violacao] = Field(
        default_factory=list, description="Sinais das regras que a camada semântica não confirmou (só observabilidade)."
    )
    instrucao_agente: str | None = Field(None, description="O que o agente deve mudar ou considerar.")
    resposta_sugerida: str | None = Field(None, description="Texto seguro para o cliente quando bloqueado.")
    texto_sanitizado: str | None = Field(None, description="Texto com dados pessoais mascarados.")
    camadas: list[Camada] = Field(default_factory=list, description="Camadas que efetivamente responderam.")
    degradado: bool = Field(False, description="true quando a camada semântica falhou ou estourou o tempo (fail-open).")
    cache: bool = False
    latencia_ms: float = 0.0
