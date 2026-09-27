"""API de guardrails do Agente Otimizador.

O orquestrador do agente chama POST /v1/entrada antes do LLM e POST /v1/saida depois dele.
Camada 1: regras determinísticas (sempre). Camada 2: Gemini + Model Armor em paralelo, com timeout e fail-open.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI

from app.config import get_settings
from app.motor import Motor
from app.routers import catalogo, entrada, saida

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("guardrails")


def _avaliadores(s) -> list:
    """Cria os clientes semânticos uma vez. Sem credencial/permissão, segue só com as regras."""
    if not s.semantico_habilitado:
        return []
    avaliadores = []
    if s.gemini_habilitado:
        try:
            from app.semantico.gemini import ClassificadorGemini

            avaliadores.append(ClassificadorGemini(
                s.projeto, s.regiao, s.modelo_gemini, s.confianca_minima_gemini, s.timeout_semantico_ms
            ))
        except Exception as e:  # noqa: BLE001
            log.warning("Gemini indisponível, seguindo sem ele: %r", e)
    if s.model_armor_habilitado:
        try:
            from app.semantico.model_armor import ClienteModelArmor

            avaliadores.append(ClienteModelArmor(s.regiao, s.model_armor_template_nome))
        except Exception as e:  # noqa: BLE001
            log.warning("Model Armor indisponível, seguindo sem ele: %r", e)
    if s.tom_habilitado:
        try:
            from app.semantico.juiz_tom import ClassificadorTom

            avaliadores.append(ClassificadorTom(
                s.projeto, s.regiao, s.modelo_tom, s.limiar_tom, s.timeout_semantico_ms
            ))
        except Exception as e:  # noqa: BLE001
            log.warning("Juiz de Tom indisponível, seguindo sem ele: %r", e)
    return avaliadores


async def _aquecer(avaliadores: list) -> None:
    """Abre as conexões (TLS + token) na subida: a primeira chamada custa ~1,5 s e não pode cair num cliente."""
    async def um(a):
        try:
            direcao = "saida" if a.nome == "juiz_tom" else "entrada"
            await asyncio.wait_for(a.avaliar(direcao, "olá, quanto sobra até o salário?", None), timeout=15)
            log.info("camada %s aquecida", a.nome)
        except Exception as e:  # noqa: BLE001
            log.warning("aquecimento de %s falhou (seguirá em fail-open se persistir): %r", a.nome, e)

    await asyncio.gather(*(um(a) for a in avaliadores))


@asynccontextmanager
async def lifespan(app: FastAPI):
    s = get_settings()
    app.state.motor = Motor(s, _avaliadores(s))
    await _aquecer(app.state.motor.avaliadores)
    log.info("guardrails prontos; camadas semânticas: %s", [a.nome for a in app.state.motor.avaliadores])
    yield


app = FastAPI(
    title="guardrails_itau",
    version="0.1.0",
    description=(
        "Guardrails de entrada e saída do Agente Otimizador. Decisões: permitir, permitir_com_instrucao, "
        "mascarar, reescrever, bloquear. Catálogo de respostas em /v1/catalogo."
    ),
    lifespan=lifespan,
)
for r in (entrada, saida, catalogo):
    app.include_router(r.router)


@app.get("/health", tags=["admin"])
@app.get("/healthz", tags=["admin"])
def healthz() -> dict[str, Any]:
    s = get_settings()
    return {
        "ok": True,
        "camadas": ["regra", *[a.nome for a in app.state.motor.avaliadores]],
        "timeout_semantico_ms": s.timeout_semantico_ms,
        "modo_semantico": {"entrada": s.modo_semantico_entrada, "saida": s.modo_semantico_saida},
    }
