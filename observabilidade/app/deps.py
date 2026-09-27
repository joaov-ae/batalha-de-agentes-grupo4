from datetime import date
from typing import Annotated, Literal

from fastapi import Depends, HTTPException, Query, Request

from app.config import get_settings
from app.schemas import Periodo
from app.store import ObsStore


def get_store(request: Request) -> ObsStore:
    return request.app.state.store


StoreDep = Annotated[ObsStore, Depends(get_store)]


def periodo(
    data_inicio: Annotated[date | None, Query(description="Padrão: início da janela configurada.")] = None,
    data_fim: Annotated[date | None, Query(description="Padrão: fim da janela configurada.")] = None,
    granularidade: Literal["semana", "mes"] = "mes",
) -> Periodo:
    s = get_settings()
    p = Periodo(data_inicio=data_inicio or s.data_inicio, data_fim=data_fim or s.data_fim, granularidade=granularidade)
    if p.data_inicio > p.data_fim:
        raise HTTPException(422, "data_inicio deve ser anterior ou igual a data_fim")
    return p


PeriodoDep = Annotated[Periodo, Depends(periodo)]
