"""Prompt agnóstico de framework: artefatos/juiz_tom_prompt.json -> instrução de sistema com exemplos.

É o mesmo texto que o agente ADK usa e que qualquer serviço pode reimplementar chamando o Gemini direto.
"""

import json
from pathlib import Path

from juiz.contrato import CRITERIOS

FORMATO_SAIDA = (
    'Responda só com JSON no formato {"justificativa": "<1 ou 2 frases>", "nota": <1-5>, "aprovado": <nota >= LIMIAR>}.'
)


def escapar(texto: str) -> str:
    return texto.replace("<", "‹").replace(">", "›")


def entrada_usuario(mensagem: str, cenario: str | None = None) -> str:
    """Texto enviado como turno do usuário: a mensagem vai entre tags e é DADO, não instrução."""
    return f"<cenario>{escapar(cenario or 'não informado')}</cenario>\n<mensagem>\n{escapar(mensagem)}\n</mensagem>"


def carregar(caminho: Path) -> dict:
    return json.loads(caminho.read_text(encoding="utf-8"))


def padrao(limiar: int = 3) -> dict:
    """Prompt antes da otimização (zero-shot), usado enquanto não existe artefato."""
    return {"instrucao": CRITERIOS, "demos": [], "limiar_aprovacao": limiar}


def renderizar(prompt: dict) -> str:
    limiar = prompt.get("limiar_aprovacao", 3)
    partes = [prompt["instrucao"].strip()]
    if prompt.get("demos"):
        partes.append("Exemplos avaliados por humanos:")
        for d in prompt["demos"]:
            saida = {"justificativa": d["justificativa"], "nota": d["nota"], "aprovado": d["nota"] >= limiar}
            partes.append(f"{entrada_usuario(d['mensagem'], d['cenario'])}\n{json.dumps(saida, ensure_ascii=False)}")
    partes.append(FORMATO_SAIDA.replace("LIMIAR", str(limiar)))
    return "\n\n".join(partes)
