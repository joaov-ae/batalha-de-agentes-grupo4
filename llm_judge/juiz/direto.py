"""Juiz chamando o Gemini direto (google-genai), com o prompt exportado.

Implementação de referência para quem for reescrever o juiz sem ADK, e a forma de medir localmente exatamente o
prompt que vai para o Agent Engine.
"""

import asyncio

from google import genai
from google.genai import types

from juiz.contrato import VereditoTom, aprovar
from juiz.config import get_settings
from juiz.prompt import entrada_usuario, renderizar


def config_geracao(prompt: dict, pensar: bool = False) -> types.GenerateContentConfig:
    return types.GenerateContentConfig(
        system_instruction=renderizar(prompt),
        temperature=0,
        response_mime_type="application/json",
        response_schema=VereditoTom,
        thinking_config=types.ThinkingConfig(thinking_budget=-1 if pensar else 0),
    )


class JuizDireto:
    def __init__(self, prompt: dict, modelo: str | None = None, pensar: bool | None = None):
        s = get_settings()
        self._client = genai.Client(vertexai=True, project=s.projeto, location=s.regiao)
        self._modelo = modelo or s.modelo_juiz
        self._config = config_geracao(prompt, s.pensar if pensar is None else pensar)
        self._limiar = prompt.get("limiar_aprovacao", s.limiar_aprovacao)

    async def julgar(self, mensagem: str, cenario: str | None = None) -> VereditoTom:
        resp = await self._client.aio.models.generate_content(
            model=self._modelo, contents=entrada_usuario(mensagem, cenario), config=self._config
        )
        v = resp.parsed
        if v is None:
            raise ValueError(f"resposta do Gemini fora do schema: {resp.text!r}")
        return v.model_copy(update={"aprovado": aprovar(v.nota, self._limiar)})

    async def julgar_lote(self, itens: list[tuple[str, str | None]], paralelo: int = 8) -> list[VereditoTom | None]:
        sem = asyncio.Semaphore(paralelo)

        async def um(mensagem, cenario):
            async with sem:
                try:
                    return await self.julgar(mensagem, cenario)
                except Exception:
                    return None

        return await asyncio.gather(*(um(m, c) for m, c in itens))
