"""Métricas de longo prazo: feedback, intervenções, avisos proativos e impacto (A/B)."""

from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from fastapi import APIRouter

from app.deps import PeriodoDep, StoreDep
from app.schemas import Metricas, Periodo, Resumo

router = APIRouter(prefix="/v1/metricas", tags=["metricas"])


def _datas(p: Periodo) -> dict[str, Any]:
    return {"data_inicio": p.data_inicio, "data_fim": p.data_fim}


def _serie(p: Periodo) -> dict[str, Any]:
    return {**_datas(p), "granularidade": p.granularidade}


def _em_paralelo(store: StoreDep, pedidos: dict[str, tuple[str, dict[str, Any]]]) -> dict[str, list[dict[str, Any]]]:
    """Executa as queries independentes de um endpoint ao mesmo tempo (cada uma leva ~1 s no BigQuery)."""
    with ThreadPoolExecutor(max_workers=len(pedidos)) as pool:
        futuros = {chave: pool.submit(store.consultar, nome, **params) for chave, (nome, params) in pedidos.items()}
        return {chave: f.result() for chave, f in futuros.items()}


@router.get("/resumo", response_model=Resumo)
def resumo(store: StoreDep, p: PeriodoDep) -> dict[str, Any]:
    """KPIs do período: conversas, intervenções, like rate, avisos com ajuste aceito e desativação."""
    linha = store.consultar("resumo", **_datas(p))[0]
    return {"periodo": p.model_copy(update={"granularidade": None}), **linha}


@router.get("/feedback", response_model=Metricas)
def feedback(store: StoreDep, p: PeriodoDep) -> dict[str, Any]:
    """Like rate ao longo do tempo, quebrado por estado, origem, status e intervenção; motivos de dislike."""
    r = _em_paralelo(store, {
        "serie": ("feedback_serie", _serie(p)),
        "quebras": ("feedback_quebras", _datas(p)),
        "motivos_dislike": ("feedback_motivos", _datas(p)),
    })
    quebras: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for ln in r["quebras"]:
        quebras[ln["dimensao"]].append({k: v for k, v in ln.items() if k != "dimensao"})
    return {"periodo": p, "dados": {**r, "quebras": dict(quebras)}}


@router.get("/intervencoes", response_model=Metricas)
def intervencoes(store: StoreDep, p: PeriodoDep) -> dict[str, Any]:
    """Intervenções por fonte e código, taxas de bloqueio/substituição e saúde do guardrails."""
    r = _em_paralelo(store, {
        "serie": ("intervencoes_serie", _serie(p)),
        "taxas": ("intervencoes_taxas", _serie(p)),
        "por_codigo": ("intervencoes_codigos", _datas(p)),
        "guardrails": ("intervencoes_guardrails", _datas(p)),
    })
    por_periodo: dict[Any, dict[str, Any]] = {}
    for ln in r["serie"]:
        item = por_periodo.setdefault(ln["periodo"], {"periodo": ln["periodo"], "total": 0, "por_fonte": {}})
        item["por_fonte"][ln["fonte"]] = ln["intervencoes"]
        item["total"] += ln["intervencoes"]
    return {"periodo": p, "dados": {**r, "serie": list(por_periodo.values())}}


@router.get("/alertas", response_model=Metricas)
def alertas(store: StoreDep, p: PeriodoDep) -> dict[str, Any]:
    """Funil do aviso proativo (/analyze -> consentimento -> /savings -> aceite) e aceite por tipo de ajuste."""
    return {
        "periodo": p,
        "dados": _em_paralelo(store, {
            "serie": ("alertas_serie", _serie(p)),
            "funil": ("alertas_funil", _datas(p)),
            "ajustes_por_tipo": ("ajustes_tipo", _datas(p)),
        }),
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
