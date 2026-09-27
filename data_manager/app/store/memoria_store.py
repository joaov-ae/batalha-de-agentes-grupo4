"""Memória do cliente (ajustes aceitos/recusados, meta de reserva) e log das ações simuladas.

Regra do projeto: o serviço é SOMENTE LEITURA no BigQuery. A memória vive apenas no processo
(perde-se ao reiniciar) e o serviço roda com max-instances=1 para ela ser consistente. Para persistir
em produção, troque por outra implementação com a mesma interface (ex.: Firestore, se liberado).
"""

import threading
import uuid
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any


class MemoriaStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._eventos: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self._acoes: dict[str, list[dict[str, Any]]] = defaultdict(list)

    def eventos(self, id_usuario: str) -> list[dict[str, Any]]:
        return list(self._eventos.get(id_usuario, []))

    def acoes(self, id_usuario: str) -> list[dict[str, Any]]:
        return list(self._acoes.get(id_usuario, []))

    def recusas(self, id_usuario: str) -> dict[str, int]:
        contagem: dict[str, int] = defaultdict(int)
        for e in self.eventos(id_usuario):
            if e["tipo_evento"] == "decisao_ajuste" and e["aceito"] is False:
                contagem[e["ajuste_id"]] += 1
        return dict(contagem)

    def meta_reserva(self, id_usuario: str) -> float | None:
        metas = [e["valor"] for e in self.eventos(id_usuario) if e["tipo_evento"] == "meta_reserva"]
        return metas[-1] if metas else None

    def poupancas(self, id_usuario: str) -> list[dict[str, Any]]:
        return [e for e in self.eventos(id_usuario) if e["tipo_evento"] == "poupanca"]

    def total_poupado(self, id_usuario: str) -> float:
        return round(sum(e.get("valor", 0.0) or 0.0 for e in self.poupancas(id_usuario)), 2)

    def registrar(
        self,
        id_usuario: str,
        tipo_evento: str,
        ajuste_id: str | None = None,
        aceito: bool | None = None,
        valor: float | None = None,
    ) -> dict[str, Any]:
        linha = {
            "evento_id": str(uuid.uuid4()),
            "tipo_evento": tipo_evento,
            "ajuste_id": ajuste_id,
            "aceito": aceito,
            "valor": valor,
            "criado_em": datetime.now(UTC).isoformat(),
        }
        with self._lock:
            self._eventos[id_usuario].append(linha)
        return linha

    def registrar_poupanca(
        self,
        id_usuario: str,
        valor: float,
        origem: str = "recusa_compra",
        motivo: str | None = None,
    ) -> dict[str, Any]:
        linha = {
            "evento_id": str(uuid.uuid4()),
            "tipo_evento": "poupanca",
            "valor": valor,
            "origem": origem,
            "motivo": motivo,
            "criado_em": datetime.now(UTC).isoformat(),
        }
        with self._lock:
            self._eventos[id_usuario].append(linha)
        return linha

    def registrar_acao(self, id_usuario: str, tipo_acao: str, payload: dict[str, Any]) -> dict[str, Any]:
        linha = {
            "acao_id": str(uuid.uuid4()),
            "tipo_acao": tipo_acao,
            "payload": payload,
            "criado_em": datetime.now(UTC).isoformat(),
        }
        with self._lock:
            self._acoes[id_usuario].append(linha)
        return linha

