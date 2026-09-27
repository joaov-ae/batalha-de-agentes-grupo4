from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.deps import MotorDep
from app.schemas import SaidaRequest, Veredito
from app.semantico.juiz_tom import VereditoTom

router = APIRouter(prefix="/v1", tags=["guardrails"])


class AuditoriaTomRequest(BaseModel):
    mensagem: str = Field(min_length=1, description="Texto da resposta do agente a ser avaliada.")
    cenario: str | None = Field(default=None, description="Cenário financeiro do cliente (opcional).")


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


@router.post(
    "/auditoria/tom",
    operation_id="auditoria_tom",
    summary="Avalia diretamente o tom de uma resposta do agente",
    description="Avaliação pontual de tom (LLM one-shot prompt). Retorna nota (1 a 5), justificativa e aprovação.",
    response_model=VereditoTom,
)
async def auditar_tom(req: AuditoriaTomRequest, motor: MotorDep) -> VereditoTom:
    for a in motor.avaliadores:
        if getattr(a, "nome", None) == "juiz_tom" and hasattr(a, "julgar_direto"):
            return await a.julgar_direto(req.mensagem, req.cenario)
    from app.config import get_settings
    from app.semantico.juiz_tom import ClassificadorTom

    s = get_settings()
    juiz = ClassificadorTom(s.projeto, s.regiao, s.modelo_tom, s.limiar_tom, s.timeout_semantico_ms)
    return await juiz.julgar_direto(req.mensagem, req.cenario)
