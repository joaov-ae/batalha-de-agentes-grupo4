"""Valida sintaxe e custo de todo SQL via dry-run (não executa nem grava nada).

Requer credenciais do GCP: DM_TESTAR_BQ=1 uv run pytest tests/test_sql_dryrun.py
Os SQL de pipeline dependem das tabelas criadas pelos anteriores; rode o pipeline uma vez antes.
"""

import os
from pathlib import Path

import pytest
from google.cloud import bigquery

from app import bq

pytestmark = pytest.mark.skipif(os.environ.get("DM_TESTAR_BQ") != "1", reason="defina DM_TESTAR_BQ=1")

RAIZ = Path(__file__).parent.parent
ARQUIVOS = sorted((RAIZ / "pipeline" / "sql").glob("*.sql")) + sorted((RAIZ / "app" / "queries").glob("*.sql"))
PARAMS = {"id_usuario": "x", "meses": 3, "limite": 10, "categoria": "", "micro_renda": "Salario CLT"}


@pytest.mark.parametrize("arquivo", ARQUIVOS, ids=lambda p: p.name)
def test_dry_run(arquivo: Path):
    sql = bq.render(arquivo.read_text())
    params = [bq._param("data_referencia", bq.get_settings().data_referencia)]
    params += [bq._param(k, v) for k, v in PARAMS.items() if f"@{k}" in sql]
    config = bigquery.QueryJobConfig(dry_run=True, use_query_cache=False, query_parameters=params)
    job = bq.client().query(sql, job_config=config)
    assert job.total_bytes_processed < 200 * 1024**2
