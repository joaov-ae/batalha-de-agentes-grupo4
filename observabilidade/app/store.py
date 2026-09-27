"""Acesso aos dados de observabilidade atrás de uma interface, para os testes trocarem o BigQuery por um fake."""

import threading
import time
from datetime import date, datetime
from typing import Any, Protocol

from app import bq


class ObsStore(Protocol):
    def consultar(self, nome: str, **params: Any) -> list[dict[str, Any]]:
        """Executa app/queries/<nome>.sql com os parâmetros nomeados."""
        ...

    def inserir(self, tabela: str, linhas: list[dict[str, Any]]) -> None:
        """Grava eventos (streaming insert) na tabela do dataset de observabilidade."""
        ...


def _json(v: Any) -> Any:
    return v.isoformat() if isinstance(v, (date, datetime)) else v


class BigQueryStore:
    def __init__(self, ttl_s: int = 300) -> None:
        self._ttl_s = ttl_s
        self._lock = threading.Lock()
        self._cache: dict[tuple, tuple[float, list[dict[str, Any]]]] = {}

    def consultar(self, nome: str, **params: Any) -> list[dict[str, Any]]:
        chave = (nome, tuple(sorted(params.items())))
        agora = time.monotonic()
        with self._lock:
            if (item := self._cache.get(chave)) and item[0] > agora:
                return item[1]
        linhas = bq.run_file(nome, **params)
        if self._ttl_s > 0:
            with self._lock:
                self._cache[chave] = (agora + self._ttl_s, linhas)
        return linhas

    def inserir(self, tabela: str, linhas: list[dict[str, Any]]) -> None:
        if not linhas:
            return
        erros = bq.client().insert_rows_json(bq.table(tabela), [{k: _json(v) for k, v in ln.items()} for ln in linhas])
        if erros:
            raise RuntimeError(f"falha ao gravar em {tabela}: {erros}")
        # Métricas em cache ficariam defasadas em relação ao evento recém-gravado.
        with self._lock:
            self._cache.clear()
