"""Visão por cliente: quem sofreu intervenção e a linha do tempo de eventos."""

from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query

from app.catalogo import Fonte
from app.deps import PeriodoDep, StoreDep

router = APIRouter(prefix="/v1/clientes", tags=["clientes"])


@router.get("/intervindos")
def intervindos(
    store: StoreDep,
    p: PeriodoDep,
    fonte: Fonte | None = None,
    limite: Annotated[int, Query(ge=1, le=1000)] = 50,
) -> dict[str, Any]:
    """Ranking de reincidência: clientes com mais intervenções no período."""
    linhas = store.consultar(
        "clientes_intervindos", data_inicio=p.data_inicio, data_fim=p.data_fim,
        fonte=fonte.value if fonte else "", limite=limite,
    )
    return {"periodo": p.model_copy(update={"granularidade": None}), "clientes": linhas}


@router.get("/{id_usuario}/timeline")
def timeline(store: StoreDep, id_usuario: str, limite: Annotated[int, Query(ge=1, le=2000)] = 200) -> dict[str, Any]:
    """Todos os eventos observados do cliente, do mais recente ao mais antigo."""
    cliente = store.consultar("cliente", id_usuario=id_usuario)
    if not cliente:
        raise HTTPException(404, "cliente não encontrado na base de observabilidade")
    return {"cliente": cliente[0], "eventos": store.consultar("cliente_timeline", id_usuario=id_usuario, limite=limite)}
