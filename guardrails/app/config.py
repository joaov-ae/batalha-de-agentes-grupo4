from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

ModoSemantico = Literal["sempre", "suspeito", "nunca"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    projeto: str = "batalha-time-04-z85x"
    regiao: str = "us-central1"

    # Camada 2 (semântica). Desligada, só as regras determinísticas rodam.
    semantico_habilitado: bool = True
    gemini_habilitado: bool = True
    model_armor_habilitado: bool = False
    modelo_gemini: str = "gemini-2.5-flash-lite"
    # Confiança mínima do Gemini para uma violação valer.
    confianca_minima_gemini: float = 0.7
    # ID do template do Model Armor (criado pelo deploy.sh) na mesma região.
    model_armor_template: str = "guardrails-itau"
    # Orçamento da camada 2. Estourou: fail-open com o veredito das regras (degradado=true).
    # Medido: gemini-2.5-flash-lite responde em ~600-800 ms (mediana); por isso o orquestrador deve chamar a
    # entrada em paralelo com a geração do LLM (ver README).
    timeout_semantico_ms: int = 1200
    # sempre: roda em toda mensagem; suspeito: só quando as regras marcaram algo; nunca: desligada.
    modo_semantico_entrada: ModoSemantico = "sempre"
    modo_semantico_saida: ModoSemantico = "suspeito"

    # Na saída, a partir desta tentativa o "reescrever" vira resposta padrão (o agente não tenta de novo).
    max_tentativas_saida: int = 2
    # Falas do histórico enviadas ao Gemini (ataques em várias mensagens).
    max_historico: int = 6

    cache_tamanho: int = 2048
    cache_ttl_s: int = 600

    @property
    def model_armor_template_nome(self) -> str:
        return f"projects/{self.projeto}/locations/{self.regiao}/templates/{self.model_armor_template}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
