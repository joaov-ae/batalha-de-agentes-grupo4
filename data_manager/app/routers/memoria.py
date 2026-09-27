"""Tools de memória do cliente e ações de um toque (simuladas no protótipo).

Nada é gravado no BigQuery: memória e ações ficam só no processo (ver app/store/memoria_store.py).
"""

from typing import Any

from fastapi import APIRouter

from app import bq
from app import formatar as fmt
from app.deps import ClienteDep, MemoriaDep
from app.engine.ajustes import MAX_RECUSAS
from app.schemas import (
    AcaoResposta,
    AgendarPixPedido,
    DecisaoPedido,
    LembreteTetoPedido,
    MetaReservaPedido,
    SepararReservaPedido,
)
from app.servicos import ciclo_seguinte

router = APIRouter(prefix="/v1/clientes/{id_usuario}", tags=["memoria e acoes"])


@router.get(
    "/memoria",
    operation_id="obter_memoria",
    summary="Ajustes aceitos e recusados, resultado do ciclo anterior e meta de reserva",
)
def obter_memoria(f: ClienteDep, memoria: MemoriaDep) -> dict[str, Any]:
    eventos = memoria.eventos(f.id_usuario)
    renda = f.renda_principal
    ciclo = None
    if renda is not None:
        ciclo = bq.run_file("resultado_ciclo_anterior", id_usuario=f.id_usuario, micro_renda=renda.micro)[0]
    recusas = memoria.recusas(f.id_usuario)
    return {
        "id_usuario": f.id_usuario,
        "ajustes_aceitos": sorted({e["ajuste_id"] for e in eventos if e["tipo_evento"] == "decisao_ajuste" and e["aceito"]}),
        "ajustes_recusados": recusas,
        "ajustes_bloqueados": sorted(k for k, n in recusas.items() if n >= MAX_RECUSAS),
        "meta_reserva": memoria.meta_reserva(f.id_usuario),
        "acoes_simuladas": memoria.acoes(f.id_usuario),
        "ciclo_anterior": ciclo,
    }


@router.post(
    "/memoria/decisoes",
    operation_id="registrar_decisao",
    summary="Registra se o cliente aceitou ou recusou um ajuste (2 recusas tiram o ajuste da lista)",
)
def registrar_decisao(f: ClienteDep, memoria: MemoriaDep, pedido: DecisaoPedido) -> dict[str, Any]:
    memoria.registrar(f.id_usuario, "decisao_ajuste", ajuste_id=pedido.ajuste_id, aceito=pedido.aceito)
    recusas = memoria.recusas(f.id_usuario).get(pedido.ajuste_id, 0)
    return {"ajuste_id": pedido.ajuste_id, "aceito": pedido.aceito, "recusas": recusas, "bloqueado": recusas >= MAX_RECUSAS}


@router.put(
    "/memoria/meta-reserva",
    operation_id="definir_meta_reserva",
    summary="Define a meta de reserva do cliente",
)
def definir_meta_reserva(f: ClienteDep, memoria: MemoriaDep, pedido: MetaReservaPedido) -> dict[str, Any]:
    memoria.registrar(f.id_usuario, "meta_reserva", valor=pedido.valor)
    return {"meta_reserva": pedido.valor, "formatado": {"meta_reserva": fmt.brl(pedido.valor)}}


def _acao(memoria: MemoriaDep, id_usuario: str, tipo: str, payload: dict[str, Any]) -> AcaoResposta:
    linha = memoria.registrar_acao(id_usuario, tipo, payload)
    return AcaoResposta(acao_id=linha["acao_id"], tipo_acao=tipo, payload=payload)


@router.post(
    "/acoes/agendar-pix",
    operation_id="agendar_pix",
    response_model=AcaoResposta,
    summary="[SIMULADO] Agenda Pix ou pagamento para uma data (ex.: dia do salário)",
)
def agendar_pix(f: ClienteDep, memoria: MemoriaDep, pedido: AgendarPixPedido) -> AcaoResposta:
    if pedido.ajuste_id:
        memoria.registrar(f.id_usuario, "decisao_ajuste", ajuste_id=pedido.ajuste_id, aceito=True)
    return _acao(memoria, f.id_usuario, "agendar_pix", pedido.model_dump(mode="json"))


@router.post(
    "/acoes/separar-reserva",
    operation_id="separar_reserva",
    response_model=AcaoResposta,
    summary="[SIMULADO] Separa uma reserva no dia do salário",
)
def separar_reserva(f: ClienteDep, memoria: MemoriaDep, pedido: SepararReservaPedido) -> AcaoResposta:
    salario, _ = ciclo_seguinte(f)
    payload = pedido.model_dump(mode="json")
    payload["data"] = payload["data"] or (salario.isoformat() if salario else None)
    return _acao(memoria, f.id_usuario, "separar_reserva", payload)


@router.post(
    "/acoes/lembrete-teto",
    operation_id="criar_lembrete_teto",
    response_model=AcaoResposta,
    summary="[SIMULADO] Cria lembrete de teto de gasto para uma categoria",
)
def criar_lembrete_teto(f: ClienteDep, memoria: MemoriaDep, pedido: LembreteTetoPedido) -> AcaoResposta:
    if pedido.ajuste_id:
        memoria.registrar(f.id_usuario, "decisao_ajuste", ajuste_id=pedido.ajuste_id, aceito=True)
    return _acao(memoria, f.id_usuario, "lembrete_teto", pedido.model_dump(mode="json"))
