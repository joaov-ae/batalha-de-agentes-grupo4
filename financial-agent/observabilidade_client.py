import json
import logging
import os
import time
from typing import Any

import httpx
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import id_token

logger = logging.getLogger("financial_agent.observabilidade_client")


def observabilidade_url() -> str:
    return os.getenv("OBSERVABILIDADE_URL", "https://observabilidade-itau-zqj7scngrq-uc.a.run.app").rstrip("/")


def observabilidade_timeout() -> float:
    try:
        return float(os.getenv("OBSERVABILIDADE_TIMEOUT_SECONDS", "3.0"))
    except ValueError:
        return 3.0


_token_cache: dict[str, tuple[str, float]] = {}
_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=observabilidade_timeout(),
            limits=httpx.Limits(max_keepalive_connections=15, max_connections=40, keepalive_expiry=30.0),
        )
    return _client


def _get_id_token(audience: str) -> str | None:
    now = time.time()
    cached = _token_cache.get(audience)
    if cached and cached[1] > now:
        return cached[0]

    try:
        token = id_token.fetch_id_token(GoogleAuthRequest(), audience)
        _token_cache[audience] = (token, now + 3000)
        return token
    except Exception as exc:
        logger.warning("Falha ao obter token de auth para observabilidade: %s", exc)
        return None


async def _post_evento(rota: str, payload: dict[str, Any]) -> bool:
    base = observabilidade_url()
    # Se desabilitado explicitamente
    if os.getenv("OBSERVABILIDADE_ENABLED", "true").lower() == "false":
        return True

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if not base.startswith(("http://localhost", "http://127.0.0.1")):
        token = _get_id_token(base)
        if token:
            headers["Authorization"] = f"Bearer {token}"

    url = f"{base}{rota}"
    timeout = observabilidade_timeout()
    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            limits=httpx.Limits(max_keepalive_connections=15, max_connections=40, keepalive_expiry=30.0),
        ) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code >= 400:
                logger.warning("Observabilidade retornou status %s para %s: %s", resp.status_code, rota, resp.text)
                return False
            return True
    except Exception as exc:
        logger.warning("Falha ao emitir evento para observabilidade em %s: %s", rota, exc)
        return False


async def emitir_conversa(
    id_usuario: str,
    conversa_id: str,
    sessao_id: str | None = None,
    origem: str = "cliente",
    momento: str | None = None,
    estado_cliente: str | None = None,
) -> bool:
    return await _post_evento("/v1/eventos/conversa", {
        "id_usuario": id_usuario,
        "conversa_id": conversa_id,
        "sessao_id": sessao_id,
        "origem": origem,
        "momento": momento,
        "estado_cliente": estado_cliente,
    })


async def emitir_mensagem(
    id_usuario: str,
    mensagem_id: str,
    conversa_id: str,
    papel: str,
    endpoint: str,
    status: str | None = None,
    latencia_agente_ms: float | None = None,
    reescrita: bool = False,
) -> bool:
    return await _post_evento("/v1/eventos/mensagem", {
        "id_usuario": id_usuario,
        "mensagem_id": mensagem_id,
        "conversa_id": conversa_id,
        "papel": papel,
        "endpoint": endpoint,
        "status": status,
        "latencia_agente_ms": latencia_agente_ms,
        "reescrita": reescrita,
    })


async def emitir_intervencao(
    id_usuario: str,
    conversa_id: str | None = None,
    mensagem_id: str | None = None,
    codigo: str | None = None,
    veredito: dict[str, Any] | None = None,
    tentativa: int = 1,
) -> bool:
    payload: dict[str, Any] = {
        "id_usuario": id_usuario,
        "conversa_id": conversa_id,
        "mensagem_id": mensagem_id,
        "tentativa": tentativa,
    }
    if codigo:
        payload["codigo"] = codigo
    elif veredito:
        # Formata o veredito para o schema VereditoGuardrails do observabilidade
        payload["veredito"] = {
            "decisao": veredito.get("decisao", "bloquear"),
            "violacoes": [
                {
                    "codigo": v.get("codigo"),
                    "categoria": v.get("categoria"),
                    "camada": v.get("camada"),
                }
                for v in veredito.get("violacoes", [])
                if isinstance(v, dict) and v.get("codigo")
            ],
            "degradado": veredito.get("degradado", False),
            "latencia_ms": veredito.get("latencia_ms", 0.0),
        }
    else:
        return False

    return await _post_evento("/v1/eventos/intervencao", payload)


async def emitir_alerta(
    id_usuario: str,
    alerta_id: str,
    conversa_id: str | None,
    momento: str,
    estado_cliente: str | None,
    status_alerta: str,
    requer_consentimento: bool | None = None,
    consentiu: bool | None = None,
    n_ajustes_oferecidos: int = 0,
    desativou_notificacao: bool = False,
) -> bool:
    return await _post_evento("/v1/eventos/alerta", {
        "id_usuario": id_usuario,
        "alerta_id": alerta_id,
        "conversa_id": conversa_id,
        "momento": momento,
        "estado_cliente": estado_cliente,
        "status_alerta": status_alerta,
        "requer_consentimento": requer_consentimento,
        "consentiu": consentiu,
        "n_ajustes_oferecidos": n_ajustes_oferecidos,
        "desativou_notificacao": desativou_notificacao,
    })


async def emitir_ajuste(
    id_usuario: str,
    ajuste_id: str,
    tipo: str,
    valor: float,
    resultado: str,
    alerta_id: str | None = None,
    chave: str | None = None,
    impacto_dias: int | None = None,
    resolve: bool | None = None,
) -> bool:
    return await _post_evento("/v1/eventos/ajuste", {
        "id_usuario": id_usuario,
        "ajuste_id": ajuste_id,
        "alerta_id": alerta_id,
        "tipo": tipo,
        "chave": chave,
        "valor": valor,
        "impacto_dias": impacto_dias,
        "resolve": resolve,
        "resultado": resultado,
    })


async def emitir_tom(
    id_usuario: str,
    texto: str,
    nota: int,
    aprovado: bool,
    justificativa: str = "",
    conversa_id: str | None = None,
    mensagem_id: str | None = None,
    cenario: str | None = None,
    latencia_ms: float | None = None,
) -> bool:
    return await _post_evento("/v1/eventos/tom", {
        "id_usuario": id_usuario,
        "conversa_id": conversa_id,
        "mensagem_id": mensagem_id,
        "texto": texto,
        "nota": nota,
        "aprovado": aprovado,
        "justificativa": justificativa,
        "cenario": cenario,
        "latencia_ms": latencia_ms,
    })
