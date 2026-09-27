"""Model Armor (GCP): filtros gerenciados de prompt injection/jailbreak e RAI (ódio, assédio, perigoso, sexual)."""

import logging

from google.api_core.client_options import ClientOptions
from google.cloud import modelarmor_v1 as ma

from app.catalogo import CATALOGO, Severidade
from app.credenciais import credenciais
from app.schemas import Violacao
from app.semantico.base import Direcao

log = logging.getLogger(__name__)

_MATCH = ma.FilterMatchState.MATCH_FOUND

# Tipo de filtro RAI -> código do catálogo, por direção.
_RAI = {
    "entrada": {"hate_speech": "E06", "harassment": "E06", "dangerous": "E10", "sexually_explicit": "E10"},
    "saida": {"hate_speech": "S05", "harassment": "S05", "dangerous": "S09", "sexually_explicit": "S09"},
}


def _violacao(codigo: str, evidencia: str) -> Violacao:
    return Violacao(
        codigo=codigo, categoria=CATALOGO[codigo].categoria, severidade=Severidade.alta,
        camada="model_armor", evidencia=evidencia,
    )


def interpretar(direcao: Direcao, resultado: "ma.SanitizationResult") -> list[Violacao]:
    """Converte o SanitizationResult nos códigos do catálogo. SDP fica com as regex (que mascaram)."""
    if resultado.filter_match_state != _MATCH:
        return []
    nocivo = "E10" if direcao == "entrada" else "S09"
    violacoes: list[Violacao] = []
    for nome, fr in resultado.filter_results.items():
        if fr.pi_and_jailbreak_filter_result.match_state == _MATCH:
            violacoes.append(_violacao("E02", f"pi_and_jailbreak ({ma.DetectionConfidenceLevel(fr.pi_and_jailbreak_filter_result.confidence_level).name})"))
        if fr.rai_filter_result.match_state == _MATCH:
            for tipo, r in fr.rai_filter_result.rai_filter_type_results.items():
                if r.match_state == _MATCH:
                    violacoes.append(_violacao(_RAI[direcao].get(tipo, nocivo), f"rai:{tipo}"))
        if fr.malicious_uri_filter_result.match_state == _MATCH:
            violacoes.append(_violacao(nocivo, "malicious_uri"))
        if fr.csam_filter_filter_result.match_state == _MATCH:
            violacoes.append(_violacao(nocivo, "csam"))
    return violacoes


class ClienteModelArmor:
    nome = "model_armor"

    def __init__(self, regiao: str, template: str):
        self._client = ma.ModelArmorAsyncClient(
            credentials=credenciais(),
            client_options=ClientOptions(api_endpoint=f"modelarmor.{regiao}.rep.googleapis.com")
        )
        self._template = template

    async def avaliar(self, direcao: Direcao, texto: str, contexto: str | None) -> list[Violacao]:
        if direcao == "entrada":
            resp = await self._client.sanitize_user_prompt(
                request=ma.SanitizeUserPromptRequest(name=self._template, user_prompt_data=ma.DataItem(text=texto))
            )
        else:
            resp = await self._client.sanitize_model_response(
                request=ma.SanitizeModelResponseRequest(
                    name=self._template, model_response_data=ma.DataItem(text=texto), user_prompt=contexto or ""
                )
            )
        return interpretar(direcao, resp.sanitization_result)
