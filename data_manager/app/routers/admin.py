"""Operação: disparar pipeline, recarregar cache, tamanho dos públicos. Não são tools do agente."""

from typing import Annotated, Any

from fastapi import APIRouter, Query

from app import bq
from app.config import get_settings
from app.deps import StatusStoreDep

router = APIRouter(prefix="/admin", tags=["admin"], include_in_schema=True)


@router.post("/pipeline", summary="Dispara o Cloud Run Job do pipeline (sem Cloud Scheduler no projeto)")
def disparar_pipeline() -> dict[str, Any]:
    from google.cloud import run_v2

    s = get_settings()
    nome = f"projects/{s.projeto}/locations/{s.regiao}/jobs/{s.job_pipeline}"
    operacao = run_v2.JobsClient().run_job(name=nome)
    return {"job": nome, "execucao": operacao.metadata.name if operacao.metadata else None,
            "observacao": "Ao terminar, chame POST /admin/cache/recarregar."}


@router.post("/cache/recarregar", summary="Recarrega status e features do BigQuery (somente leitura)")
def recarregar_cache(store: StatusStoreDep) -> dict[str, Any]:
    store.recarregar()
    return store.resumo()


@router.get("/contagem-estados", summary="Quantos clientes em cada estado (tamanho do público)")
def contagem_estados(store: StatusStoreDep) -> list[dict[str, Any]]:
    try:
        return bq.run_file("contagem_estados")
    except Exception:
        from collections import Counter
        all_status = store.todos_status()
        total = len(all_status) or 1
        ref = get_settings().data_referencia.isoformat()
        counts = Counter(s.get("estado") for s in all_status)
        scores = Counter(s.get("estado") for s in all_status if s.get("antecipar_aviso"))
        resultado = []
        for estado, count in counts.most_common():
            pct = round(count / total, 4)
            resultado.append({
                "data_referencia": ref,
                "estado": estado,
                "clientes": count,
                "pct_base": pct,
                "acima_de_5pct": pct >= 0.05,
                "com_score_alerta": scores.get(estado, 0),
            })
        return resultado


@router.get("/candidatos-demo", summary="Clientes candidatos para o protótipo")
def candidatos_demo(store: StatusStoreDep, limite: Annotated[int, Query(ge=1, le=100)] = 20) -> list[dict[str, Any]]:
    try:
        return bq.run_file("candidatos_demo", limite=limite)
    except Exception:
        # Fallback usando dados do store e ajustes_sugeridos via list_table_rows
        all_status = store.todos_status()
        candidatos = [
            s for s in all_status
            if s.get("estado") in ("vai_faltar", "zero_a_zero")
        ]
        return candidatos[:limite]
