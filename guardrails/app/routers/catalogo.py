from typing import Literal

from fastapi import APIRouter

from app.catalogo import CATALOGO

router = APIRouter(prefix="/v1", tags=["catalogo"])


@router.get(
    "/catalogo",
    operation_id="catalogo_guardrails",
    summary="Códigos, decisões e respostas pré-estabelecidas",
    description="O agente pode carregar isto no prompt de sistema para saber o que cada código exige.",
)
def catalogo(direcao: Literal["entrada", "saida"] | None = None) -> list[dict]:
    return [i.dict() for i in CATALOGO.values() if direcao is None or i.direcao == direcao]
