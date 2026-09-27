"""Publica (ou atualiza) o juiz de tom no Vertex AI Agent Engine.

    uv run python deploy_agent_engine.py

Staging em gs://<staging_bucket>/<staging_pasta> (bucket existente; criado só se faltar e houver permissão).
O resource_name vai para artefatos/deploy.json.
O agente leva o prompt de artefatos/juiz_tom_prompt.json já renderizado na instrução.
"""

import json
import logging
from datetime import datetime, timezone
from importlib.metadata import version

import vertexai
from google.api_core.exceptions import NotFound
from google.cloud import storage
from vertexai import agent_engines

from juiz.config import get_settings
from juiz_tom.agent import carregar_prompt, criar_agente

log = logging.getLogger("deploy")


def garantir_bucket(nome: str, projeto: str, regiao: str) -> None:
    cliente = storage.Client(project=projeto)
    try:
        cliente.get_bucket(nome)
    except NotFound:
        log.info("criando bucket %s em %s", nome, regiao)
        cliente.create_bucket(nome, location=regiao)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
    s = get_settings()
    garantir_bucket(s.staging_bucket.removeprefix("gs://"), s.projeto, s.regiao)
    vertexai.init(project=s.projeto, location=s.regiao, staging_bucket=s.staging_bucket)

    prompt = carregar_prompt()
    app = agent_engines.AdkApp(agent=criar_agente(prompt))
    # Mesmas versões do ambiente local, para o pickle do agente abrir igual no Agent Engine.
    requirements = [
        f"google-cloud-aiplatform[agent_engines,adk]=={version('google-cloud-aiplatform')}",
        f"google-adk=={version('google-adk')}",
        f"pydantic=={version('pydantic')}",
        f"pydantic-settings=={version('pydantic-settings')}",
        f"cloudpickle=={version('cloudpickle')}",
    ]
    kwargs = dict(
        requirements=requirements,
        extra_packages=["juiz"],
        display_name=s.nome_agente,
        gcs_dir_name=s.staging_pasta,
        description="LLM-as-judge de tom (amigável, cuidadoso, não alarmista) das mensagens do Agente Otimizador.",
    )

    anterior = json.loads(s.deploy_json.read_text()) if s.deploy_json.exists() else None
    if anterior:
        log.info("atualizando %s", anterior["resource_name"])
        remoto = agent_engines.update(resource_name=anterior["resource_name"], agent_engine=app, **kwargs)
    else:
        log.info("criando %s", s.nome_agente)
        remoto = agent_engines.create(app, **kwargs)

    info = {
        "resource_name": remoto.resource_name,
        "display_name": s.nome_agente,
        "projeto": s.projeto,
        "regiao": s.regiao,
        "modelo": prompt.get("modelo", s.modelo_juiz),
        "limiar_aprovacao": prompt.get("limiar_aprovacao", s.limiar_aprovacao),
        "prompt_gerado_em": prompt.get("gerado_em"),
        "publicado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    s.deploy_json.write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(info, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
