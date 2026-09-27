"""Acesso ao BigQuery: cliente único, templating de nomes de tabela e queries parametrizadas.

Mesmo padrão de data_manager/app/bq.py (replicado, não importado: cada serviço é independente).
"""

import os
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path
from string import Template
from typing import Any

import google.oauth2.credentials
from google.cloud import bigquery

from app.config import get_settings

QUERIES_DIR = Path(__file__).parent / "queries"


@lru_cache
def client() -> bigquery.Client:
    s = get_settings()
    credentials = None
    # Dev local: GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token). No Cloud Run, vale o SA do serviço.
    if token := os.environ.get("GOOGLE_OAUTH_ACCESS_TOKEN"):
        credentials = google.oauth2.credentials.Credentials(token)
    return bigquery.Client(project=s.projeto, location=s.regiao, credentials=credentials)


def render(sql: str) -> str:
    """Substitui $obs e $dm (safe: preserva outros `$`)."""
    s = get_settings()
    return Template(sql).safe_substitute(obs=s.dataset_obs, dm=s.dataset_dm)


def _param(nome: str, valor: Any) -> bigquery.ScalarQueryParameter:
    if isinstance(valor, bool):
        tipo = "BOOL"
    elif isinstance(valor, int):
        tipo = "INT64"
    elif isinstance(valor, float):
        tipo = "FLOAT64"
    elif isinstance(valor, datetime):
        tipo = "TIMESTAMP"
    elif isinstance(valor, date):
        tipo = "DATE"
    else:
        tipo = "STRING"
    return bigquery.ScalarQueryParameter(nome, tipo, valor)


def run(sql: str, dry_run: bool = False, **params: Any) -> list[dict[str, Any]]:
    """Executa SQL (já com $obs/$dm) com parâmetros nomeados e devolve as linhas como dicts."""
    config = bigquery.QueryJobConfig(
        query_parameters=[_param(k, v) for k, v in params.items()], dry_run=dry_run, use_query_cache=not dry_run
    )
    job = client().query(render(sql), job_config=config)
    if dry_run:
        return []
    return [dict(row.items()) for row in job.result()]


def run_file(nome: str, dry_run: bool = False, **params: Any) -> list[dict[str, Any]]:
    """Executa app/queries/<nome>.sql."""
    return run((QUERIES_DIR / f"{nome}.sql").read_text(), dry_run=dry_run, **params)


def table(nome: str) -> str:
    return f"{get_settings().dataset_obs}.{nome}"
