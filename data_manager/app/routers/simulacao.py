"""Tools de simulação: tudo calculado pelo engine, nada inventado."""

from typing import Any

from fastapi import APIRouter, HTTPException

from app import servicos
from app.config import get_settings
from app.deps import ClienteDep, StatusStoreDep
from app.schemas import (
    SimularParcelamentoPedido,
    SimularReservaPedido,
    SimularReservaResposta,
    SimularTransacaoPedido,
    SimularTransacaoResposta,
)

router = APIRouter(prefix="/v1/clientes/{id_usuario}/simulacoes", tags=["simulacoes"])


@router.post(
    "/transacao",
    operation_id="simular_transacao",
    response_model=SimularTransacaoResposta,
    summary="Momento 2: este Pix/compra deixa a conta negativa? Quanto de juros? Agendar para o salário resolve?",
    description="Nunca bloqueie o pagamento: mostre o efeito e ofereça agendar para data_sugerida ou 'agora não'.",
)
def simular_transacao(f: ClienteDep, store: StatusStoreDep, pedido: SimularTransacaoPedido) -> dict[str, Any]:
    return servicos.simular_transacao(f, store, pedido.valor, pedido.data, pedido.canal, pedido.descricao)


@router.post(
    "/reserva",
    operation_id="simular_reserva",
    response_model=SimularReservaResposta,
    summary="Efeito de separar R$ X no dia do salário (estado zero a zero)",
)
def simular_reserva(f: ClienteDep, pedido: SimularReservaPedido) -> dict[str, Any]:
    return servicos.simular_reserva(f, pedido.valor)


@router.post(
    "/parcelamento-fatura",
    operation_id="simular_parcelamento_fatura",
    summary="Parcelar a fatura contra usar o limite: mostrar só quando parcelar sai mais barato",
    responses={409: {"description": "Taxa de parcelamento não configurada (TAXA_PARCELAMENTO_FATURA_MES)."}},
)
def simular_parcelamento(f: ClienteDep, store: StatusStoreDep, pedido: SimularParcelamentoPedido) -> dict[str, Any]:
    taxa = get_settings().taxa_parcelamento_fatura_mes
    if taxa is None:
        raise HTTPException(
            409,
            "Taxa de parcelamento da fatura não configurada; não é possível simular sem inventar número.",
        )
    return servicos.simular_parcelamento(f, store, taxa, pedido.parcelas, pedido.valor_fatura)
