import json
import logging
import os
import time
from typing import Any

import httpx
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import id_token

logger = logging.getLogger("financial_agent.guardrails_client")


class GuardrailsUnavailable(RuntimeError):
    pass


def service_url() -> str:
    return os.getenv("GUARDRAILS_URL", "https://guardrails-itau-zqj7scngrq-uc.a.run.app").rstrip("/")


def guardrails_timeout() -> float:
    try:
        return float(os.getenv("GUARDRAILS_TIMEOUT_SECONDS", "4.0"))
    except ValueError:
        return 4.0


_token_cache: dict[str, tuple[str, float]] = {}
_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=guardrails_timeout(),
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=50, keepalive_expiry=30.0),
        )
    return _client


def _get_id_token(audience: str) -> str:
    now = time.time()
    cached = _token_cache.get(audience)
    if cached and cached[1] > now:
        return cached[0]

    try:
        token = id_token.fetch_id_token(GoogleAuthRequest(), audience)
        # ID tokens do GCP expiram em 3600 segundos; renova em 3000s (~50 min)
        _token_cache[audience] = (token, now + 3000)
        return token
    except Exception as exc:
        raise GuardrailsUnavailable("Não foi possível autenticar no serviço de guardrails.") from exc


async def _post_json(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    base = service_url()
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    if not base.startswith(("http://localhost", "http://127.0.0.1")):
        token = _get_id_token(base)
        headers["Authorization"] = f"Bearer {token}"

    url = f"{base}{path}"
    timeout = guardrails_timeout()
    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=50, keepalive_expiry=30.0),
        ) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code >= 400:
                raise GuardrailsUnavailable(f"Guardrails retornou HTTP {resp.status_code}.")
            verdict = resp.json()
    except httpx.HTTPStatusError as exc:
        raise GuardrailsUnavailable(f"Guardrails retornou HTTP {exc.response.status_code}.") from exc
    except (httpx.RequestError, json.JSONDecodeError) as exc:
        raise GuardrailsUnavailable("Não foi possível consultar o serviço de guardrails.") from exc

    if not isinstance(verdict, dict) or verdict.get("decisao") not in {
        "permitir", "permitir_com_instrucao", "mascarar", "reescrever", "bloquear"
    }:
        raise GuardrailsUnavailable("Resposta inválida do serviço de guardrails.")
    return verdict


async def check_input(
    message: str,
    user_id: str,
    finance_state: str | None = None,
    session_id: str | None = None,
    historico: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "mensagem": message,
        "id_usuario": user_id,
        "sessao_id": session_id,
        "estado_cliente": finance_state,
    }
    if historico:
        payload["historico"] = historico
    return await _post_json("/v1/entrada", payload)


async def check_output(
    response: str,
    user_message: str | None,
    tool_context: dict[str, Any],
    user_id: str,
    session_id: str | None = None,
    attempt: int = 1,
) -> dict[str, Any]:
    return await _post_json("/v1/saida", {
        "resposta": response,
        "mensagem_usuario": user_message,
        "contexto_tools": tool_context,
        "id_usuario": user_id,
        "sessao_id": session_id,
        "tentativa": attempt,
    })


def check_input_sync(
    message: str,
    user_id: str,
    finance_state: str | None = None,
    session_id: str | None = None,
    historico: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    coro = check_input(message, user_id, finance_state, session_id, historico)
    if loop and loop.is_running():
        # Executa em nova thread para evitar deadlocks no event loop ativo
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            return executor.submit(asyncio.run, coro).result()
    return asyncio.run(coro)


def check_output_sync(
    response: str,
    user_message: str | None,
    tool_context: dict[str, Any],
    user_id: str,
    session_id: str | None = None,
    attempt: int = 1,
) -> dict[str, Any]:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    coro = check_output(response, user_message, tool_context, user_id, session_id, attempt)
    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            return executor.submit(asyncio.run, coro).result()
    return asyncio.run(coro)