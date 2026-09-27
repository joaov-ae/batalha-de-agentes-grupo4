from datetime import date
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    projeto: str = "batalha-time-04-z85x"
    regiao: str = "us-central1"
    # Dataset próprio do serviço (eventos simulados hoje, reais depois da integração com o agente).
    dataset_obs: str = "batalha-time-04-z85x.observabilidade"
    # Somente leitura: o seed usa os clientes reais de status_cliente quando a tabela está acessível.
    dataset_dm: str = "batalha-time-04-z85x.data_manager"

    # Janela padrão das métricas quando o chamador não informa datas (horizonte da simulação).
    data_inicio: date = date(2025, 1, 1)
    data_fim: date = date(2025, 12, 31)

    # Cache das consultas de métricas, em segundos (0 desliga).
    cache_ttl_s: int = 300


@lru_cache
def get_settings() -> Settings:
    return Settings()
