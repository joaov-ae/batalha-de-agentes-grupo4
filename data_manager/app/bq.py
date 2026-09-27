"""Acesso ao BigQuery: cliente único, templating de nomes de tabela e queries parametrizadas."""

import os
from datetime import date
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
    # Dev local: permite usar a conta do gcloud CLI sem mexer no ADC da máquina
    # (GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token)). No Cloud Run, vale o SA do serviço.
    if token := os.environ.get("GOOGLE_OAUTH_ACCESS_TOKEN"):
        credentials = google.oauth2.credentials.Credentials(token)
    return bigquery.Client(project=s.projeto, location=s.regiao, credentials=credentials)


def render(sql: str) -> str:
    """Substitui $fonte e $dm (safe: preserva o `$` de regex como `...)$`)."""
    s = get_settings()
    return Template(sql).safe_substitute(fonte=s.tabela_fonte, dm=s.dataset_dm)


def _param(nome: str, valor: Any) -> bigquery.ScalarQueryParameter:
    if isinstance(valor, bool):
        tipo = "BOOL"
    elif isinstance(valor, int):
        tipo = "INT64"
    elif isinstance(valor, float):
        tipo = "FLOAT64"
    elif isinstance(valor, date):
        tipo = "DATE"
    else:
        tipo = "STRING"
    return bigquery.ScalarQueryParameter(nome, tipo, valor)


def run(sql: str, **params: Any) -> list[dict[str, Any]]:
    """Executa SQL (já com $fonte/$dm) com parâmetros nomeados e devolve as linhas como dicts.

    data_referencia é sempre injetada a partir da configuração, salvo se passada explicitamente.
    """
    params.setdefault("data_referencia", get_settings().data_referencia)
    config = bigquery.QueryJobConfig(query_parameters=[_param(k, v) for k, v in params.items()])
    job = client().query(render(sql), job_config=config)
    return [dict(row.items()) for row in job.result()]


def run_file(nome: str, **params: Any) -> list[dict[str, Any]]:
    """Executa app/queries/<nome>.sql."""
    return run((QUERIES_DIR / f"{nome}.sql").read_text(), **params)


def table(nome: str) -> str:
    return f"{get_settings().dataset_dm}.{nome}"


def list_table_rows(nome: str, max_results: int | None = None) -> list[dict[str, Any]]:
    """Lê linhas diretamente da tabela via list_rows (sem criar Job de query no BQ).
    Permite leitura de tabelas do dataset mesmo quando o Service Account não tem roles/bigquery.jobUser no projeto.
    """
    t_ref = client().get_table(table(nome))
    return [dict(row.items()) for row in client().list_rows(t_ref, max_results=max_results)]
