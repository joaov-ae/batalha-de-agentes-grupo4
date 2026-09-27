"""API do observabilidade-itau: métricas de longo prazo do Agente Otimizador e ingestão de eventos.

Hoje as tabelas são populadas pela simulação (python -m seed.gerar); a ingestão em /v1/eventos grava nas
mesmas tabelas quando o financial-agent, o guardrails e o front passarem a emitir eventos.
"""

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import clientes, eventos, metricas
from app.store import BigQueryStore

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.store = BigQueryStore(ttl_s=get_settings().cache_ttl_s)
    yield


app = FastAPI(
    title="observabilidade_itau",
    version="0.1.0",
    description=(
        "Observabilidade do Agente Otimizador: conversas com intervenção (guardrails e agente), avisos proativos, "
        "ajustes, likes/dislikes e impacto A/B de longo prazo."
    ),
    lifespan=lifespan,
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
for r in (metricas, clientes, eventos):
    app.include_router(r.router)


@app.get("/health", tags=["admin"])
@app.get("/healthz", tags=["admin"])
def healthz() -> dict[str, Any]:
    s = get_settings()
    return {"ok": True, "dataset": s.dataset_obs, "janela_padrao": [s.data_inicio, s.data_fim]}
