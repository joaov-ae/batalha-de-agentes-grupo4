"""Dry-run de todas as queries no BigQuery (só com OBS_TESTAR_BQ=1 e as tabelas já criadas pelo seed)."""

import os
from datetime import date
from pathlib import Path

import pytest

from app import bq

pytestmark = pytest.mark.skipif(os.environ.get("OBS_TESTAR_BQ") != "1", reason="defina OBS_TESTAR_BQ=1")

PARAMS = {
    "data_inicio": date(2025, 1, 1), "data_fim": date(2025, 12, 31), "granularidade": "mes",
    "fonte": "", "limite": 10, "id_usuario": "x",
}


@pytest.mark.parametrize("arquivo", sorted(bq.QUERIES_DIR.glob("*.sql")), ids=lambda p: p.stem)
def test_query_valida(arquivo: Path) -> None:
    sql = arquivo.read_text()
    usados = {k: v for k, v in PARAMS.items() if f"@{k}" in sql}
    bq.run(sql, dry_run=True, **usados)
