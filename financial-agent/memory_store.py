import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any


@dataclass
class SessionState:
    session_id: str
    user_id: str
    conversa_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    historico: list[dict[str, str]] = field(default_factory=list)
    estado_cliente: str | None = None
    ultimo_alerta_id: str | None = None
    metadados: dict[str, Any] = field(default_factory=dict)
    criado_em: float = field(default_factory=time.time)
    atualizado_em: float = field(default_factory=time.time)

    def adicionar_fala(self, papel: str, texto: str) -> None:
        self.historico.append({
            "papel": papel,
            "texto": texto,
        })
        self.atualizado_em = time.time()

    def obter_historico_recente(self, max_turnos: int = 6) -> list[dict[str, str]]:
        return self.historico[-max_turnos:] if max_turnos > 0 else list(self.historico)

    def formatar_historico_prompt(self, max_turnos: int = 4) -> str:
        recentes = self.obter_historico_recente(max_turnos)
        if not recentes:
            return ""
        linhas = []
        for fala in recentes:
            quem = "Cliente" if fala["papel"] == "cliente" else "Assistente"
            linhas.append(f"{quem}: {fala['texto']}")
        return "\n".join(linhas)


class SessionMemoryStore:
    def __init__(self, max_sessoes: int = 5000, ttl_segundos: int = 7200) -> None:
        self._max_sessoes = max_sessoes
        self._ttl_segundos = ttl_segundos
        self._sessoes: dict[str, SessionState] = {}
        self._lock = threading.RLock()

    def obter_ou_criar(
        self,
        session_id: str,
        user_id: str,
        estado_cliente: str | None = None,
    ) -> SessionState:
        with self._lock:
            self._limpar_expirados()
            sessao = self._sessoes.get(session_id)
            if sessao is None:
                sessao = SessionState(
                    session_id=session_id,
                    user_id=user_id,
                    estado_cliente=estado_cliente,
                )
                self._sessoes[session_id] = sessao
            else:
                sessao.atualizado_em = time.time()
                if estado_cliente:
                    sessao.estado_cliente = estado_cliente
            return sessao

    def obter(self, session_id: str) -> SessionState | None:
        with self._lock:
            return self._sessoes.get(session_id)

    def registrar_fala(self, session_id: str, user_id: str, papel: str, texto: str) -> SessionState:
        with self._lock:
            sessao = self.obter_ou_criar(session_id, user_id)
            sessao.adicionar_fala(papel, texto)
            return sessao

    def _limpar_expirados(self) -> None:
        agora = time.time()
        # Se ultrapassar o limite, remove os mais antigos
        if len(self._sessoes) > self._max_sessoes:
            ordenadas = sorted(self._sessoes.items(), key=lambda item: item[1].atualizado_em)
            excesso = len(self._sessoes) - self._max_sessoes
            for sid, _ in ordenadas[:excesso]:
                self._sessoes.pop(sid, None)

        expiradas = [
            sid for sid, s in self._sessoes.items()
            if agora - s.atualizado_em > self._ttl_segundos
        ]
        for sid in expiradas:
            self._sessoes.pop(sid, None)

    def limpar_tudo(self) -> None:
        with self._lock:
            self._sessoes.clear()


# Instância global singleton em memória
memory_store = SessionMemoryStore()
