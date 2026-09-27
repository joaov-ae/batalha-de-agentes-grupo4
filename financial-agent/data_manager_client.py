import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import id_token


class DataManagerError(RuntimeError):
    pass


class DataManagerNotFound(DataManagerError):
    pass


class DataManagerUnavailable(DataManagerError):
    pass


def service_url() -> str:
    value = os.getenv("DATA_MANAGER_URL", "https://data-manager-itau-zqj7scngrq-uc.a.run.app")
    return value.rstrip("/")


def _identity_token(audience: str) -> str:
    return id_token.fetch_id_token(GoogleAuthRequest(), audience)


def _get_json(path: str, expected_user_id: str) -> dict:
    base = service_url()
    headers = {"Accept": "application/json"}
    if not base.startswith(("http://localhost", "http://127.0.0.1")):
        try:
            token = _identity_token(base)
            headers["Authorization"] = f"Bearer {token}"
        except Exception as exc:
            raise DataManagerUnavailable("Não foi possível autenticar a chamada ao data_manager.") from exc
    request = UrlRequest(
        f"{base}{path}",
        headers=headers,
        method="GET",
    )
    try:
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read())
    except HTTPError as exc:
        if exc.code == 404:
            raise DataManagerNotFound("Perfil financeiro não encontrado no data_manager.") from exc
        if exc.code in (408, 429, 500, 502, 503, 504):
            raise DataManagerUnavailable("data_manager está temporariamente indisponível.") from exc
        raise DataManagerError(f"data_manager retornou HTTP {exc.code}.") from exc
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise DataManagerUnavailable("Não foi possível consultar data_manager.") from exc

    if not isinstance(payload, dict):
        raise DataManagerError("Resposta inválida do data_manager.")
    returned_user_id = payload.get("id_usuario")
    if returned_user_id is not None and returned_user_id != expected_user_id:
        raise DataManagerError("O data_manager retornou um perfil diferente do solicitado.")
    return payload


def get_customer_snapshot(user_id: str) -> dict:
    encoded_id = quote(user_id, safe="")
    status = _get_json(f"/v1/clientes/{encoded_id}/status", user_id)
    if status.get("encaminhar_atendimento") or status.get("estado") == "ja_no_buraco":
        return {"status": status, "ritmo": None}
    rhythm = _get_json(f"/v1/clientes/{encoded_id}/ritmo", user_id)
    return {"status": status, "ritmo": rhythm}


def get_customer_adjustments(user_id: str, status: dict) -> list[dict]:
    if status.get("encaminhar_atendimento") or status.get("estado") == "ja_no_buraco":
        return []

    encoded_id = quote(user_id, safe="")
    adjustments = []
    for path in ("ajustes/discricionarios", "ajustes/assinaturas"):
        response = _get_json(f"/v1/clientes/{encoded_id}/{path}", user_id)
        if response.get("encaminhar_atendimento") or response.get("estado") == "ja_no_buraco":
            return []
        items = response.get("ajustes", [])
        if not isinstance(items, list):
            raise DataManagerError("Lista de ajustes inválida no data_manager.")
        adjustments.extend(items)
    return adjustments