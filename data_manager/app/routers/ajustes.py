"""Tools de ajustes: só os 3 tipos do escopo, com impacto em dias, sem os recusados 2 vezes."""

from fastapi import APIRouter

from app import servicos
from app.deps import ClienteDep, MemoriaDep, StatusStoreDep
from app.schemas import AjustesResposta

router = APIRouter(prefix="/v1/clientes/{id_usuario}/ajustes", tags=["ajustes"])


@router.get(
    "",
    operation_id="listar_ajustes",
    response_model=AjustesResposta,
    summary="Ajustes possíveis, do menor esforço para o maior, com impacto em dias",
    description="Vazio para ja_no_buraco. Ajuste recusado 2 vezes não volta. Sempre ofereça a opção 'agora não'.",
)
def listar_ajustes(f: ClienteDep, store: StatusStoreDep, memoria: MemoriaDep) -> dict:
    return servicos.ajustes(store, memoria, f)


@router.get(
    "/assinaturas",
    operation_id="assinaturas_redundantes",
    response_model=AjustesResposta,
    summary="2 ou mais serviços do mesmo tipo (vídeo ou música) e quanto libera cancelar",
    description="O banco não cancela o serviço: aponte a redundância e o caminho para o cliente cancelar.",
)
def assinaturas_redundantes(f: ClienteDep, store: StatusStoreDep, memoria: MemoriaDep) -> dict:
    return servicos.ajustes(store, memoria, f, tipo="assinatura_redundante")


@router.get(
    "/reagendamentos",
    operation_id="pagamentos_reagendaveis",
    response_model=AjustesResposta,
    summary="Pix e pagamentos previstos antes do salário que podem ir para o dia do salário",
)
def pagamentos_reagendaveis(f: ClienteDep, store: StatusStoreDep, memoria: MemoriaDep) -> dict:
    return servicos.ajustes(store, memoria, f, tipo="mudanca_data")


@router.get(
    "/discricionarios",
    operation_id="gastos_acima_da_media",
    response_model=AjustesResposta,
    summary="Categorias acima da média do PRÓPRIO cliente neste mês, com teto sugerido",
    description="Fale de números e datas, nunca de hábitos. Nunca compare com outras pessoas.",
)
def gastos_acima_da_media(f: ClienteDep, store: StatusStoreDep, memoria: MemoriaDep) -> dict:
    return servicos.ajustes(store, memoria, f, tipo="gasto_discricionario")
