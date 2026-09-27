from datetime import date
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    projeto: str = "batalha-time-04-z85x"
    regiao: str = "us-central1"
    tabela_fonte: str = "batalha-time-04-z85x.hackathon_dados.extrato_sintetico"
    dataset_dm: str = "batalha-time-04-z85x.data_manager"

    # "Hoje" do protótipo: a base termina em 31/12/2025.
    data_referencia: date = date(2025, 12, 15)

    # Estado "zero a zero": projeção na véspera do salário entre 0 e este percentual da renda.
    corte_zero_a_zero: float = 0.10
    # Score de alerta a partir do qual o aviso do meio do mês é antecipado.
    corte_score_alerta: int = 4
    # Meses seguidos com dia negativo que caracterizam "já está no buraco".
    meses_vermelho_buraco: int = 3
    # Taxa mensal de parcelamento da fatura. Sem valor configurado, a simulação responde indisponível
    # (o agente não pode inventar número). Informe a taxa real do produto, ex.: 0.089.
    taxa_parcelamento_fatura_mes: float | None = None

    # Cloud Run Job do pipeline, disparado por POST /admin/pipeline.
    job_pipeline: str = "dm-pipeline"


@lru_cache
def get_settings() -> Settings:
    return Settings()
