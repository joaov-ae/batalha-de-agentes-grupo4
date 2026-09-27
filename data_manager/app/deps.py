"""Dependências das rotas: stores da aplicação e validação do cliente."""

from typing import Annotated

from fastapi import Depends, HTTPException, Path, Request

from app.engine.modelos import Features
from app.store.memoria_store import MemoriaStore
from app.store.status_store import BigQueryStatusStore

IdUsuario = Annotated[
    str,
    Path(description="id_usuario do cliente (UUID).", pattern=r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"),
]


def status_store(request: Request) -> BigQueryStatusStore:
    return request.app.state.status_store


def memoria_store(request: Request) -> MemoriaStore:
    return request.app.state.memoria_store


StatusStoreDep = Annotated[BigQueryStatusStore, Depends(status_store)]
MemoriaDep = Annotated[MemoriaStore, Depends(memoria_store)]


def cliente(id_usuario: IdUsuario, store: StatusStoreDep) -> Features:
    f = store.features(id_usuario)
    if f is None:
        raise HTTPException(404, f"cliente {id_usuario} não encontrado na base")
    return f


ClienteDep = Annotated[Features, Depends(cliente)]
