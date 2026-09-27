import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import id_token


class GuardrailsUnavailable(RuntimeError):
    pass


def service_url() -> str:
    return os.getenv("GUARDRAILS_URL", "https://guardrails-itau-zqj7scngrq-uc.a.run.app").rstrip("/")


def guardrails_timeout() -> float:
    try:
        return float(os.getenv("GUARDRAILS_TIMEOUT_SECONDS", "6"))
    except ValueError:
        return 6.0


def _post_json(path: str, payload: dict) -> dict:
    base = service_url()
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if not base.startswith(("http://localhost", "http://127.0.0.1")):
        try:
            token = id_token.fetch_id_token(GoogleAuthRequest(), base)
            headers["Authorization"] = f"Bearer {token}"
        except Exception as exc:
            raise GuardrailsUnavailable("Não foi possível autenticar no serviço de guardrails.") from exc

    request = Request(
        f"{base}{path}",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    timeout = guardrails_timeout()
    try:
        with urlopen(request, timeout=timeout) as response:
            verdict = json.loads(response.read())
    except HTTPError as exc:
        raise GuardrailsUnavailable(f"Guardrails retornou HTTP {exc.code}.") from exc
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise GuardrailsUnavailable("Não foi possível consultar o serviço de guardrails.") from exc

    if not isinstance(verdict, dict) or verdict.get("decisao") not in {
        "permitir", "permitir_com_instrucao", "mascarar", "reescrever", "bloquear"
    }:
        raise GuardrailsUnavailable("Resposta inválida do serviço de guardrails.")
    return verdict


def check_input(
    message: str,
    user_id: str,
    finance_state: str | None = None,
    session_id: str | None = None,
) -> dict:
    return _post_json("/v1/entrada", {
        "mensagem": message,
        "id_usuario": user_id,
        "sessao_id": session_id,
        "estado_cliente": finance_state,
    })


def check_output(
    response: str,
    user_message: str | None,
    tool_context: dict,
    user_id: str,
    session_id: str | None = None,
    attempt: int = 1,
) -> dict:
    return _post_json("/v1/saida", {
        "resposta": response,
        "mensagem_usuario": user_message,
        "contexto_tools": tool_context,
        "id_usuario": user_id,
        "sessao_id": session_id,
        "tentativa": attempt,
    })