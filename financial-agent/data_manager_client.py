import json
import os
import re
import unicodedata
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

# Roteamento da pergunta do chat para a tool mais específica do data_manager. A ordem importa:
# o primeiro grupo que casar vence. Sem casamento, cai na visão genérica do último ano.
CONTEXT_ROUTES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("recorrencias", ("assinatura", "assinaturas", "streaming", "netflix", "disney", "globoplay", "paramount",
                      "spotify", "deezer", "hbo", "prime video", "recorrente", "recorrencia", "mensalidade")),
    ("parcelas", ("parcela", "parcelas", "parcelado", "parcelamento", "financiamento", "prestacao")),
    ("fatura", ("fatura", "cartao")),
    ("evolucao-saldo", ("saldo", "evolucao", "sobrou", "sobra", "negativo", "cheque especial", "limite")),
    ("transacoes", ("lancamento", "lancamentos", "transacao", "transacoes", "compra", "compras", "o que foi",
                    "extrato", "debito", "cobranca")),
    ("gastos", ("gasto", "gastos", "gastei", "gastando", "categoria", "categorias", "delivery", "restaurante",
                "lazer", "mercado", "viagem", "viagens", "loja", "despesa", "despesas")),
)
GENERIC_CONTEXT_ROUTE = "resumo-anual"


def _normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.casefold())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


def route_for_message(message: str) -> str:
    normalized = _normalize(message)
    for route, terms in CONTEXT_ROUTES:
        if any(re.search(rf"\b{re.escape(term)}", normalized) for term in terms):
            return route
    return GENERIC_CONTEXT_ROUTE


def get_customer_context(user_id: str, message: str) -> dict:
    """Busca os dados do cliente que respondem à pergunta: tool específica ou, na falta dela, o resumo do ano."""
    route = route_for_message(message)
    encoded_id = quote(user_id, safe="")
    return {"fonte": route, "dados": _get_json(f"/v1/clientes/{encoded_id}/{route}", user_id)}
