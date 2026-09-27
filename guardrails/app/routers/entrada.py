from fastapi import APIRouter

from app.deps import MotorDep
from app.schemas import EntradaRequest, Veredito

router = APIRouter(prefix="/v1", tags=["guardrails"])


@router.post(
    "/entrada",
    operation_id="guardrail_entrada",
    summary="Avalia a mensagem do cliente antes do modelo",
    description=(
        "Chamar antes do LLM. bloquear: responda `resposta_sugerida` sem chamar o modelo. "
        "permitir_com_instrucao: siga `instrucao_agente`. mascarar: use `texto_sanitizado` no lugar da mensagem."
    ),
)
async def entrada(req: EntradaRequest, motor: MotorDep) -> Veredito:
    return await motor.avaliar_entrada(req)
