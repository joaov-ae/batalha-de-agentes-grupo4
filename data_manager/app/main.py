"""API do data_manager_itau: tools determinísticas do Agente Otimizador.

O agente (outro serviço) chama GET /v1/clientes/{id}/status primeiro e depois as demais tools.
O contrato das tools é o OpenAPI em /openapi.json.
"""

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import admin, ajustes, cliente, extrato, memoria, simulacao
from app.store.memoria_store import MemoriaStore
from app.store.status_store import BigQueryStatusStore

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.status_store = BigQueryStatusStore()
    app.state.memoria_store = MemoriaStore()
    app.state.status_store.recarregar()
    yield

app = FastAPI(
    title="data_manager_itau",
    version="0.1.0",
    description=(
        "Camada de dados do Agente Otimizador. Todo número vem de regra determinística; "
        "o LLM só redige. Estados: vai_faltar, zero_a_zero, fecha_bem, ja_no_buraco."
    ),
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
for r in (cliente, extrato, ajustes, simulacao, memoria, admin):
    app.include_router(r.router)


@app.get("/health", tags=["admin"])
@app.get("/healthz", tags=["admin"])
def healthz() -> dict[str, Any]:
    return {"ok": True, "data_referencia": get_settings().data_referencia, **app.state.status_store.resumo()}
