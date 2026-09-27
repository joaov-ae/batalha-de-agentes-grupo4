"""Pipeline do data_manager: SQL de features -> engine em lote -> tabelas de serving -> views.

Uso:  python -m pipeline.run            (DATA_REFERENCIA vem da config/env)
No GCP roda como Cloud Run Job (dm-pipeline). Não há Cloud Scheduler no projeto: disparo sob demanda.
"""

import json
import logging
import time
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path

from google.cloud import bigquery

from app import bq
from app.config import get_settings
from app.engine.ajustes import gerar_ajustes
from app.engine.classificacao import Regras, calcular_status
from app.engine.modelos import Estado
from app.store.features_store import carregar_features, carregar_taxa_juros_dia

log = logging.getLogger("pipeline")
SQL_DIR = Path(__file__).parent / "sql"

F = bigquery.SchemaField
SCHEMA_STATUS = [
    F("id_usuario", "STRING", "REQUIRED"),
    F("data_referencia", "DATE"),
    F("estado", "STRING"),
    F("saldo_hoje", "FLOAT"),
    F("renda_mensal", "FLOAT"),
    F("proximo_salario_data", "DATE"),
    F("proximo_salario_valor", "FLOAT"),
    F("dias_ate_salario", "INTEGER"),
    F("saldo_projetado_vespera_salario", "FLOAT"),
    F("saldo_minimo_projetado", "FLOAT"),
    F("data_saldo_minimo", "DATE"),
    F("dia_que_acaba", "DATE"),
    F("compromissos_ate_salario", "FLOAT"),
    F("disponivel_ate_salario", "FLOAT"),
    F("sobra_por_dia", "FLOAT"),
    F("reserva_sugerida", "FLOAT"),
    F("score_alerta", "INTEGER"),
    F("sinais", "STRING", "REPEATED"),
    F("antecipar_aviso", "BOOLEAN"),
    F("juros_estimados", "FLOAT"),
    F("encaminhar_atendimento", "BOOLEAN"),
    F("calculado_em", "TIMESTAMP"),
]
SCHEMA_PROJECAO = [
    F("id_usuario", "STRING", "REQUIRED"),
    F("data_referencia", "DATE"),
    F("data", "DATE"),
    F("saldo_projetado", "FLOAT"),
    F(
        "eventos",
        "RECORD",
        "REPEATED",
        fields=[F("descricao", "STRING"), F("valor", "FLOAT"), F("tipo_item", "STRING")],
    ),
]
SCHEMA_AJUSTES = [
    F("id_usuario", "STRING", "REQUIRED"),
    F("data_referencia", "DATE"),
    F("ordem", "INTEGER"),
    F("ajuste_id", "STRING"),
    F("tipo", "STRING"),
    F("titulo", "STRING"),
    F("valor", "FLOAT"),
    F("impacto_dias", "INTEGER"),
    F("resolve", "BOOLEAN"),
    F("ganho_vespera_salario", "FLOAT"),
    F("esforco", "INTEGER"),
    F("acao", "STRING"),
    F("detalhes", "JSON"),
]


def _json_ready(d: dict) -> dict:
    return {k: (v.isoformat() if hasattr(v, "isoformat") else list(v) if isinstance(v, tuple) else v) for k, v in d.items()}


def executar_sql(prefixos: tuple[str, ...]) -> None:
    for arquivo in sorted(SQL_DIR.glob("*.sql")):
        if arquivo.name.startswith(prefixos):
            inicio = time.monotonic()
            bq.run(arquivo.read_text())
            log.info("%s ok (%.1fs)", arquivo.name, time.monotonic() - inicio)


def gravar(tabela: str, linhas: list[dict], schema: list[bigquery.SchemaField]) -> None:
    config = bigquery.LoadJobConfig(
        schema=schema,
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
        clustering_fields=["id_usuario"],
    )
    bq.client().load_table_from_json(linhas, bq.table(tabela), job_config=config).result()
    log.info("%s: %d linhas", tabela, len(linhas))


def calcular_lote() -> None:
    s = get_settings()
    regras = Regras(s.corte_zero_a_zero, s.corte_score_alerta, s.meses_vermelho_buraco)
    taxa = carregar_taxa_juros_dia()
    features = carregar_features()
    agora = datetime.now(UTC).isoformat()
    status_rows, projecao_rows, ajuste_rows = [], [], []
    for f in features.values():
        status, proj = calcular_status(f, regras, taxa)
        status_rows.append(_json_ready(asdict(status)) | {"estado": status.estado.value, "calculado_em": agora})
        for p in proj.pontos:
            projecao_rows.append(
                {
                    "id_usuario": f.id_usuario,
                    "data_referencia": s.data_referencia.isoformat(),
                    "data": p.data.isoformat(),
                    "saldo_projetado": p.saldo,
                    "eventos": [{"descricao": e.descricao, "valor": e.valor, "tipo_item": e.tipo_item} for e in p.eventos],
                }
            )
        if status.estado is Estado.JA_NO_BURACO:
            continue
        for ordem, a in enumerate(gerar_ajustes(f, proj), start=1):
            linha = asdict(a) | {
                "id_usuario": f.id_usuario,
                "data_referencia": s.data_referencia.isoformat(),
                "ordem": ordem,
                "detalhes": json.dumps(a.detalhes, ensure_ascii=False),
            }
            ajuste_rows.append(linha)
    gravar("status_cliente", status_rows, SCHEMA_STATUS)
    gravar("projecao_diaria", projecao_rows, SCHEMA_PROJECAO)
    gravar("ajustes_sugeridos", ajuste_rows, SCHEMA_AJUSTES)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
    log.info("data_referencia=%s dataset=%s", get_settings().data_referencia, get_settings().dataset_dm)
    executar_sql(tuple(f"{i:02d}_" for i in range(10)))  # 00..08: features
    calcular_lote()
    executar_sql(("9",))  # 90+: views sobre as tabelas de serving


if __name__ == "__main__":
    main()
