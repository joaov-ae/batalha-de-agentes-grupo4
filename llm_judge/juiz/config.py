from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

RAIZ = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="JUIZ_", extra="ignore")

    projeto: str = "batalha-time-04-z85x"
    regiao: str = "us-central1"

    # Modelo que julga (em produção e no DSPy) e modelo que reescreve o prompt durante a otimização.
    modelo_juiz: str = "gemini-2.5-flash"
    modelo_prompt: str = "gemini-2.5-pro"

    # Thinking do Gemini 2.5. Desligado: a `justificativa` já vem antes da nota e faz o papel de raciocínio.
    pensar: bool = False

    # Flexibilidade: aprova a partir desta nota. Na base de ouro, aprovado <=> nota >= 3 em 100% dos casos.
    limiar_aprovacao: int = 3

    base_ouro: Path = RAIZ / "gold_dataset" / "avaliacao_tom_50.xlsx"
    artefatos: Path = RAIZ / "artefatos"

    # Bucket já existente (a conta de dev não tem storage.buckets.create); o deploy fica numa pasta própria.
    staging_bucket: str = "gs://batalha-time-04-z85x-cloudbuild"
    staging_pasta: str = "agent_engine/juiz-tom-itau"
    nome_agente: str = "juiz-tom-itau"
    service_account: str = "squad-agent-sa@batalha-time-04-z85x.iam.gserviceaccount.com"

    @property
    def prompt_json(self) -> Path:
        return self.artefatos / "juiz_tom_prompt.json"

    @property
    def deploy_json(self) -> Path:
        return self.artefatos / "deploy.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()
