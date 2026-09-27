"""Carrega as features de todos os clientes do dataset data_manager para memória.

São ~1.000 clientes e ~17 mil itens recorrentes: cabe folgado em memória, e as simulações da API
rodam em Python puro sem ir ao BigQuery.
"""

import logging
from collections import defaultdict
from dataclasses import fields

from app import bq
from app.config import get_settings
from app.engine.modelos import ConsumoCategoria, Features, ItemRecorrente

log = logging.getLogger(__name__)


def carregar_features(status: dict[str, dict] | None = None) -> dict[str, Features]:
    ref = get_settings().data_referencia
    try:
        saldos = {r["id_usuario"]: r["saldo_hoje"] for r in bq.run_file("features_saldo")}
        itens_raw = bq.run_file("features_recorrencias")
        consumo_raw = bq.run_file("features_consumo")
        ritmo_score_raw = bq.run_file("features_ritmo_score")
    except Exception as e:
        log.warning("Falha ao rodar queries de features (%s); usando list_table_rows...", e)
        if status:
            saldos = {uid: d["saldo_hoje"] for uid, d in status.items()}
        else:
            saldos = {r["id_usuario"]: r["saldo_hoje"] for r in bq.list_table_rows("status_cliente")}

        itens_raw = bq.list_table_rows("recorrencias")
        consumo_raw = bq.list_table_rows("consumo_categoria")
        ritmo_rows = {r["id_usuario"]: r for r in bq.list_table_rows("ritmo_variavel")}
        score_rows = {r["id_usuario"]: r for r in bq.list_table_rows("score_alerta")}
        ritmo_score_raw = []
        for uid, r in ritmo_rows.items():
            sc = score_rows.get(uid, {})
            ritmo_score_raw.append({
                "id_usuario": uid,
                "saida_variavel_diaria": r["saida_variavel_diaria"],
                "saida_variavel_diaria_7d": r.get("saida_variavel_diaria_7d", 0.0),
                "score": sc.get("score", 0),
                "sinais": sc.get("sinais", []),
                "meses_vermelho_consecutivos": sc.get("meses_vermelho_consecutivos", 0),
            })

    item_fields = {f.name for f in fields(ItemRecorrente)}
    itens: dict[str, list[ItemRecorrente]] = defaultdict(list)
    for r in itens_raw:
        r_dict = dict(r)
        uid = r_dict.pop("id_usuario")
        filtered = {k: v for k, v in r_dict.items() if k in item_fields}
        itens[uid].append(ItemRecorrente(**filtered))

    cons_fields = {f.name for f in fields(ConsumoCategoria)}
    consumo: dict[str, list[ConsumoCategoria]] = defaultdict(list)
    for r in consumo_raw:
        r_dict = dict(r)
        uid = r_dict.pop("id_usuario")
        filtered = {k: v for k, v in r_dict.items() if k in cons_fields}
        consumo[uid].append(ConsumoCategoria(**filtered))

    features = {}
    for r in ritmo_score_raw:
        uid = r["id_usuario"]
        if uid not in saldos:
            continue
        features[uid] = Features(
            id_usuario=uid,
            data_referencia=ref,
            saldo_hoje=saldos[uid],
            itens=tuple(itens.get(uid, ())),
            saida_variavel_diaria=r["saida_variavel_diaria"],
            saida_variavel_diaria_7d=r.get("saida_variavel_diaria_7d", 0.0),
            score=r["score"],
            sinais=tuple(r["sinais"]),
            meses_vermelho_consecutivos=r["meses_vermelho_consecutivos"],
            consumo=tuple(consumo.get(uid, ())),
        )
    return features


def carregar_taxa_juros_dia() -> float:
    try:
        linhas = bq.run_file("parametros")
    except Exception as e:
        log.warning("Falha ao rodar query de parametros (%s); usando list_table_rows...", e)
        linhas = bq.list_table_rows("parametros")
    return float(linhas[0]["taxa_juros_limite_dia"] or 0.0) if linhas else 0.0
