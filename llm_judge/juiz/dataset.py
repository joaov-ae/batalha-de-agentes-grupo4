"""Base de ouro de tom: xlsx -> dspy.Example, com split estratificado por aprovação."""

import random
from dataclasses import dataclass
from pathlib import Path

import dspy
import openpyxl

from juiz.config import get_settings


@dataclass(frozen=True)
class Rotulo:
    id: str
    cenario: str
    mensagem: str
    aprovado: bool
    nota: int
    comentario: str


def carregar(caminho: Path | None = None) -> list[Rotulo]:
    ws = openpyxl.load_workbook(caminho or get_settings().base_ouro, read_only=True).active
    rotulos = []
    for linha in ws.iter_rows(values_only=True):
        # A planilha não tem cabeçalho e começa com uma linha vazia.
        if not linha or not linha[0]:
            continue
        id_, cenario, mensagem, aprovado, nota, comentario = linha[:6]
        rotulos.append(Rotulo(str(id_), str(cenario), str(mensagem), bool(aprovado), int(nota), str(comentario or "")))
    return rotulos


def para_exemplo(r: Rotulo) -> dspy.Example:
    return dspy.Example(
        id=r.id, cenario=r.cenario, mensagem=r.mensagem, nota=r.nota, aprovado=r.aprovado, comentario=r.comentario
    ).with_inputs("cenario", "mensagem")


def exemplos(caminho: Path | None = None) -> list[dspy.Example]:
    return [para_exemplo(r) for r in carregar(caminho)]


def dividir(dados: list[dspy.Example], frac_treino: float = 0.64, seed: int = 42) -> tuple[list, list]:
    """Split estratificado por `aprovado` (47 exemplos -> ~30 treino / ~17 validação)."""
    rng = random.Random(seed)
    treino, validacao = [], []
    for classe in (True, False):
        grupo = [e for e in dados if e.aprovado is classe]
        rng.shuffle(grupo)
        corte = round(len(grupo) * frac_treino)
        treino += grupo[:corte]
        validacao += grupo[corte:]
    rng.shuffle(treino)
    rng.shuffle(validacao)
    return treino, validacao


def dobras(dados: list[dspy.Example], k: int = 5, seed: int = 42) -> list[tuple[list, list]]:
    """k-fold estratificado: cada exemplo cai na validação exatamente uma vez."""
    rng = random.Random(seed)
    grupos: list[list] = [[] for _ in range(k)]
    for classe in (True, False):
        classe_ = [e for e in dados if e.aprovado is classe]
        rng.shuffle(classe_)
        for i, e in enumerate(classe_):
            grupos[i % k].append(e)
    return [([e for j, g in enumerate(grupos) if j != i for e in g], grupos[i]) for i in range(k)]
