"""Cliente do juiz de tom publicado no Agent Engine. É este arquivo que guardrails e observabilidade vão usar.

    from cliente import ClienteJuizTom
    juiz = ClienteJuizTom()                       # resource_name de artefatos/deploy.json (ou JUIZ_RESOURCE_NAME)
    v = await juiz.julgar("Esse Pix de R$ 600 ...", cenario="M2 Pix que deixa a conta negativa")
    v.nota, v.aprovado, v.justificativa

Credenciais: ADC (no Cloud Run, o SA do serviço precisa de roles/aiplatform.user — a squad-agent-sa já tem).
Latência: alguns segundos por chamada; use fora do caminho síncrono (auditoria assíncrona ou em lote).
"""

import asyncio
import json
import os
from collections.abc import Iterable

import vertexai
from vertexai import agent_engines

from juiz.config import get_settings
from juiz.contrato import VereditoTom, aprovar
from juiz.prompt import entrada_usuario


def resource_name_padrao() -> str:
    if nome := os.environ.get("JUIZ_RESOURCE_NAME"):
        return nome
    return json.loads(get_settings().deploy_json.read_text())["resource_name"]


def extrair_veredito(eventos: Iterable[dict], limiar: int = 3) -> VereditoTom:
    """Lê o veredito dos eventos do ADK: primeiro o state_delta (output_key), senão o último texto JSON."""
    veredito = None
    for ev in eventos:
        delta = (ev.get("actions") or {}).get("state_delta") or {}
        if "veredito_tom" in delta:
            veredito = delta["veredito_tom"]
            continue
        for parte in (ev.get("content") or {}).get("parts") or []:
            if parte.get("text"):
                try:
                    veredito = json.loads(parte["text"])
                except json.JSONDecodeError:
                    pass
    if veredito is None:
        raise ValueError("o juiz não devolveu veredito")
    v = VereditoTom.model_validate(veredito)
    # O consumidor sempre re-deriva a aprovação: o limiar é dele, não do LLM.
    return v.model_copy(update={"aprovado": aprovar(v.nota, limiar)})


class ClienteJuizTom:
    def __init__(self, resource_name: str | None = None, limiar: int | None = None):
        s = get_settings()
        vertexai.init(project=s.projeto, location=s.regiao)
        self._agente = agent_engines.get(resource_name or resource_name_padrao())
        self._limiar = limiar or s.limiar_aprovacao

    async def julgar(self, mensagem: str, cenario: str | None = None, user_id: str = "juiz-tom") -> VereditoTom:
        # Sem session_id: o Agent Engine cria uma sessão por julgamento (cada julgamento é isolado).
        eventos = [ev async for ev in self._agente.async_stream_query(user_id=user_id, message=entrada_usuario(mensagem, cenario))]
        return extrair_veredito(eventos, self._limiar)

    async def julgar_lote(self, itens: list[tuple[str, str | None]], paralelo: int = 8) -> list[VereditoTom | None]:
        sem = asyncio.Semaphore(paralelo)

        async def um(mensagem, cenario):
            async with sem:
                try:
                    return await self.julgar(mensagem, cenario)
                except Exception:
                    return None

        return await asyncio.gather(*(um(m, c) for m, c in itens))


if __name__ == "__main__":
    import sys

    print(asyncio.run(ClienteJuizTom().julgar(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)).model_dump_json(indent=2))
