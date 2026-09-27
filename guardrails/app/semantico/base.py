from typing import Literal, Protocol

from app.schemas import Violacao

Direcao = Literal["entrada", "saida"]


class Avaliador(Protocol):
    """Camada semântica. Devolve só violações confirmadas; exceção ou demora = fail-open no motor."""

    nome: str

    async def avaliar(self, direcao: Direcao, texto: str, contexto: str | None) -> list[Violacao]: ...
