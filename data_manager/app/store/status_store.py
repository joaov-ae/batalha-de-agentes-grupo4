"""Store do status pré-calculado.

Firestore/Datastore estão bloqueados pela organização no projeto (constraints/gcp.restrictServiceUsage),
então o "banco NoSQL" do status é a tabela de serving `data_manager.status_cliente`, carregada inteira
em memória na subida do Cloud Run (~1.000 linhas). Para trocar por Firestore depois, basta outra
implementação do Protocol StatusStore.
"""

import logging
import threading
from datetime import datetime
from typing import Any, Protocol

from app import bq
from app.config import get_settings
from app.engine.classificacao import Regras
from app.engine.modelos import Features
from app.store.features_store import carregar_features, carregar_taxa_juros_dia

log = logging.getLogger(__name__)


class StatusStore(Protocol):
    def status(self, id_usuario: str) -> dict[str, Any] | None: ...
    def features(self, id_usuario: str) -> Features | None: ...
    def recarregar(self) -> None: ...


class BigQueryStatusStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._status: dict[str, dict[str, Any]] = {}
        self._features: dict[str, Features] = {}
        self.taxa_juros_dia: float = 0.0
        self.carregado_em: datetime | None = None
        s = get_settings()
        self.regras = Regras(s.corte_zero_a_zero, s.corte_score_alerta, s.meses_vermelho_buraco)

    def recarregar(self) -> None:
        try:
            status = {r["id_usuario"]: r for r in bq.run_file("status_todos")}
        except Exception as e:
            log.warning("Falha ao rodar query de status_todos (%s); usando list_table_rows...", e)
            status = {r["id_usuario"]: r for r in bq.list_table_rows("status_cliente")}

        features = carregar_features(status=status)
        taxa = carregar_taxa_juros_dia()
        with self._lock:
            self._status, self._features, self.taxa_juros_dia = status, features, taxa
            self.carregado_em = datetime.now()
        log.info("cache carregado: %d status, %d features, taxa_dia=%.6f", len(status), len(features), taxa)

    def status(self, id_usuario: str) -> dict[str, Any] | None:
        return self._status.get(id_usuario)

    def todos_status(self) -> list[dict[str, Any]]:
        return list(self._status.values())

    def features(self, id_usuario: str) -> Features | None:
        return self._features.get(id_usuario)

    def resumo(self) -> dict[str, Any]:
        return {
            "clientes": len(self._status),
            "carregado_em": self.carregado_em,
            "taxa_juros_limite_dia": self.taxa_juros_dia,
        }
