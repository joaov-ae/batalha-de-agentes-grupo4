"""Métricas de longo prazo: feedback, intervenções, avisos proativos e impacto (A/B)."""

from collections import defaultdict
from typing import Any

from fastapi import APIRouter

from app.deps import PeriodoDep, StoreDep
from app.schemas import Metricas, Periodo, Resumo

router = APIRouter(prefix="/v1/metricas", tags=["metricas"])


def _datas(p: Periodo) -> dict[str, Any]:
    return {"data_inicio": p.data_inicio, "data_fim": p.data_fim}


def _serie(p: Periodo) -> dict[str, Any]:
    return {**_datas(p), "granularidade": p.granularidade}


@router.get("/resumo", response_model=Resumo)
def resumo(store: StoreDep, p: PeriodoDep) -> dict[str, Any]:
    """KPIs do período: conversas, intervenções, like rate, avisos com ajuste aceito e desativação."""
    linha = store.consultar("resumo", **_datas(p))[0]
    return {"periodo": p.model_copy(update={"granularidade": None}), **linha}


@router.get("/feedback", response_model=Metricas)
def feedback(store: StoreDep, p: PeriodoDep) -> dict[str, Any]:
    """Like rate ao longo do tempo, quebrado por estado, origem, status e intervenção; motivos de dislike."""
    quebras: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for ln in store.consultar("feedback_quebras", **_datas(p)):
        quebras[ln["dimensao"]].append({k: v for k, v in ln.items() if k != "dimensao"})
    return {
        "periodo": p,
        "dados": {
            "serie": store.consultar("feedback_serie", **_serie(p)),
            "quebras": dict(quebras),
            "motivos_dislike": store.consultar("feedback_motivos", **_datas(p)),
        },
    }


@router.get("/intervencoes", response_model=Metricas)
def intervencoes(store: StoreDep, p: PeriodoDep) -> dict[str, Any]:
    """Intervenções por fonte e código, taxas de bloqueio/substituição e saúde do guardrails."""
    por_periodo: dict[Any, dict[str, Any]] = {}
    for ln in store.consultar("intervencoes_serie", **_serie(p)):
        item = por_periodo.setdefault(ln["periodo"], {"periodo": ln["periodo"], "total": 0, "por_fonte": {}})
        item["por_fonte"][ln["fonte"]] = ln["intervencoes"]
        item["total"] += ln["intervencoes"]
    return {
        "periodo": p,
        "dados": {
            "serie": list(por_periodo.values()),
            "taxas": store.consultar("intervencoes_taxas", **_serie(p)),
            "por_codigo": store.consultar("intervencoes_codigos", **_datas(p)),
            "guardrails": store.consultar("intervencoes_guardrails", **_datas(p)),
        },
    }


@router.get("/alertas", response_model=Metricas)
def alertas(store: StoreDep, p: PeriodoDep) -> dict[str, Any]:
    """Funil do aviso proativo (/analyze -> consentimento -> /savings -> aceite) e aceite por tipo de ajuste."""
    return {
        "periodo": p,
        "dados": {
            "serie": store.consultar("alertas_serie", **_serie(p)),
            "funil": store.consultar("alertas_funil", **_datas(p)),
            "ajustes_por_tipo": store.consultar("ajustes_tipo", **_datas(p)),
        },
    }


@router.get("/impacto", response_model=Metricas)
def impacto(store: StoreDep, p: PeriodoDep) -> dict[str, Any]:
    """A/B do escopo: entrada no negativo e chegada ao salário sem limite, tratamento x controle, por mês."""
    meses: dict[Any, dict[str, Any]] = {}
    acumulado: dict[str, dict[str, float]] = defaultdict(lambda: {"clientes": 0, "negativos": 0.0, "juros": 0.0})
    for ln in store.consultar("impacto", **_datas(p)):
        grupo = ln["grupo_ab"]
        meses.setdefault(ln["mes"], {"mes": ln["mes"]})[grupo] = {
            k: v for k, v in ln.items() if k not in ("mes", "grupo_ab")
        }
        acc = acumulado[grupo]
        acc["clientes"] += ln["clientes"]
        acc["negativos"] += (ln["taxa_entrada_negativo"] or 0) * ln["clientes"]
        acc["juros"] += ln["juros_pagos_total"] or 0
    for item in meses.values():
        t, c = item.get("tratamento"), item.get("controle")
        item["diferenca_pp_entrada_negativo"] = (
            round((t["taxa_entrada_negativo"] - c["taxa_entrada_negativo"]) * 100, 2) if t and c else None
        )
    total = {
        grupo: {
            "cliente_meses": int(acc["clientes"]),
            "taxa_entrada_negativo": acc["negativos"] / acc["clientes"] if acc["clientes"] else None,
            "juros_pagos_total": round(acc["juros"], 2),
        }
        for grupo, acc in acumulado.items()
    }
    return {"periodo": p.model_copy(update={"granularidade": "mes"}), "dados": {"por_mes": list(meses.values()), "acumulado": total}}
