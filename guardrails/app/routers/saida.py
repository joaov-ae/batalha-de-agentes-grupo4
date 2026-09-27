from fastapi import APIRouter

from app.deps import MotorDep
from app.schemas import SaidaRequest, Veredito

router = APIRouter(prefix="/v1", tags=["guardrails"])


@router.post(
    "/saida",
    operation_id="guardrail_saida",
    summary="Avalia a resposta do agente antes de ir ao cliente",
    description=(
        "Chamar depois do LLM, com `contexto_tools` (respostas do data_manager no turno). reescrever: gere de novo "
        "seguindo `instrucao_agente` e envie `tentativa+1`. bloquear: entregue `resposta_sugerida`. "
        "mascarar: entregue `texto_sanitizado`."
    ),
)
async def saida(req: SaidaRequest, motor: MotorDep) -> Veredito:
    return await motor.avaliar_saida(req)
