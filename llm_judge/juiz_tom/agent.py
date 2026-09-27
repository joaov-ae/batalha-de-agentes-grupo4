"""Agente ADK do juiz de tom (publicado no Vertex AI Agent Engine como `juiz-tom-itau`).

Cada consulta é independente: o turno do usuário é a mensagem a julgar (idealmente já no formato de
`juiz.prompt.entrada_usuario`); o agente devolve um `VereditoTom` em JSON e grava em `state["veredito_tom"]`.
O prompt vem de artefatos/juiz_tom_prompt.json (gerado por otimizar.py); sem ele, usa o prompt zero-shot.
"""

import logging

from google.adk.agents import LlmAgent
from google.adk.planners import BuiltInPlanner
from google.genai import types

from juiz import prompt as prompt_juiz
from juiz.config import get_settings
from juiz.contrato import VereditoTom

log = logging.getLogger(__name__)


def carregar_prompt() -> dict:
    s = get_settings()
    if s.prompt_json.exists():
        return prompt_juiz.carregar(s.prompt_json)
    log.warning("%s não existe; usando o prompt zero-shot", s.prompt_json)
    return prompt_juiz.padrao(s.limiar_aprovacao)


def criar_agente(prompt: dict | None = None) -> LlmAgent:
    s = get_settings()
    prompt = prompt or carregar_prompt()
    pensar = prompt.get("pensar", s.pensar)
    return LlmAgent(
        name="juiz_tom",
        model=prompt.get("modelo", s.modelo_juiz),
        description="Julga se o tom de uma mensagem ao cliente é amigável, cuidadoso e não alarmista (nota 1-5).",
        # static_instruction vai literal como instrução de sistema: sem templating de {chaves} do ADK.
        static_instruction=prompt_juiz.renderizar(prompt),
        output_schema=VereditoTom,
        output_key="veredito_tom",
        # Cada julgamento é isolado: o histórico da sessão não entra no prompt.
        include_contents="none",
        generate_content_config=types.GenerateContentConfig(temperature=0),
        planner=BuiltInPlanner(thinking_config=types.ThinkingConfig(thinking_budget=-1 if pensar else 0)),
    )


root_agent = criar_agente()
