"""Ingestão de eventos reais (substitui a simulação quando o agente e o front passarem a emitir).

Cada endpoint grava direto na tabela correspondente do dataset `observabilidade` (streaming insert).
"""

from typing import Any

from fastapi import APIRouter, HTTPException

from app.catalogo import CODIGOS, Fonte
from app.deps import StoreDep
from app.schemas import (
    AjusteEvento,
    AlertaEvento,
    ConversaEvento,
    EventoRegistrado,
    FeedbackEvento,
    IntervencaoEvento,
    MensagemEvento,
    _novo_id,
)

router = APIRouter(prefix="/v1/eventos", tags=["eventos"])


def _gravar(store: StoreDep, tabela: str, linhas: list[dict[str, Any]], id_campo: str) -> EventoRegistrado:
    try:
        store.inserir(tabela, linhas)
    except Exception as exc:
        raise HTTPException(503, f"não foi possível gravar o evento: {exc}") from exc
    return EventoRegistrado(tabela=tabela, ids=[ln[id_campo] for ln in linhas])


@router.post("/conversa", status_code=201, response_model=EventoRegistrado)
def conversa(ev: ConversaEvento, store: StoreDep) -> EventoRegistrado:
    linha = ev.model_dump(mode="json", exclude={"criado_em"}) | {
        "iniciada_em": ev.criado_em.isoformat(), "encerrada_em": None, "n_turnos": None,
        "teve_intervencao": None, "encaminhada_atendimento": None,
    }
    return _gravar(store, "conversas", [linha], "conversa_id")


@router.post("/mensagem", status_code=201, response_model=EventoRegistrado)
def mensagem(ev: MensagemEvento, store: StoreDep) -> EventoRegistrado:
    return _gravar(store, "mensagens", [ev.model_dump(mode="json")], "mensagem_id")


@router.post("/feedback", status_code=201, response_model=EventoRegistrado)
def feedback(ev: FeedbackEvento, store: StoreDep) -> EventoRegistrado:
    return _gravar(store, "feedback_mensagens", [ev.model_dump(mode="json")], "feedback_id")


@router.post("/intervencao", status_code=201, response_model=EventoRegistrado)
def intervencao(ev: IntervencaoEvento, store: StoreDep) -> EventoRegistrado:
    """Aceita um código (intervenções do agente, AG_*) ou o Veredito do guardrails (uma linha por violação)."""
    base = {
        "conversa_id": ev.conversa_id, "mensagem_id": ev.mensagem_id, "id_usuario": ev.id_usuario,
        "criado_em": ev.criado_em.isoformat(), "tentativa": ev.tentativa,
    }
    linhas = []
    if ev.codigo:
        cod = CODIGOS[ev.codigo]
        linhas.append(base | {
            "intervencao_id": _novo_id(), "fonte": cod.fonte.value, "direcao": cod.direcao, "codigo": cod.codigo,
            "categoria": cod.categoria, "decisao": cod.decisao.value, "camada": None, "degradado": None,
            "latencia_ms": None,
        })
    else:
        v = ev.veredito
        for viol in v.violacoes:
            cod = CODIGOS.get(viol.codigo)
            linhas.append(base | {
                "intervencao_id": _novo_id(), "fonte": Fonte.guardrails.value,
                "direcao": cod.direcao if cod else None, "codigo": viol.codigo,
                "categoria": viol.categoria or (cod.categoria if cod else None),
                # Decisão da violação: a do catálogo; o veredito carrega a decisão mais dura do merge.
                "decisao": (cod.decisao if cod else v.decisao).value, "camada": viol.camada,
                "degradado": v.degradado, "latencia_ms": v.latencia_ms,
            })
    return _gravar(store, "intervencoes", linhas, "intervencao_id")


@router.post("/alerta", status_code=201, response_model=EventoRegistrado)
def alerta(ev: AlertaEvento, store: StoreDep) -> EventoRegistrado:
    return _gravar(store, "alertas", [ev.model_dump(mode="json")], "alerta_id")


@router.post("/ajuste", status_code=201, response_model=EventoRegistrado)
def ajuste(ev: AjusteEvento, store: StoreDep) -> EventoRegistrado:
    return _gravar(store, "ajustes_oferecidos", [ev.model_dump(mode="json")], "ajuste_id")
