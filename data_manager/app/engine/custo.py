"""Custo em reais de entrar no limite e comparação com parcelar a fatura."""

from dataclasses import dataclass

from app.engine.modelos import Projecao


def juros_estimados(p: Projecao, taxa_dia: float) -> float:
    """Juros do limite sobre o saldo devedor projetado, com a taxa diária calibrada na base."""
    return round(p.saldo_devedor_dia_acumulado * taxa_dia, 2)


@dataclass(frozen=True)
class ComparacaoParcelamento:
    valor_fatura: float
    parcelas: int
    taxa_mensal: float
    custo_parcelamento: float
    custo_limite: float
    parcelar_compensa: bool


def comparar_parcelamento(
    valor_fatura: float, parcelas: int, taxa_mensal: float, custo_limite: float
) -> ComparacaoParcelamento:
    """Custo total de juros de parcelar a fatura (Price) contra o custo projetado de usar o limite."""
    if taxa_mensal <= 0:
        custo = 0.0
    else:
        pmt = valor_fatura * taxa_mensal / (1 - (1 + taxa_mensal) ** -parcelas)
        custo = pmt * parcelas - valor_fatura
    custo = round(custo, 2)
    return ComparacaoParcelamento(
        valor_fatura=round(valor_fatura, 2),
        parcelas=parcelas,
        taxa_mensal=taxa_mensal,
        custo_parcelamento=custo,
        custo_limite=round(custo_limite, 2),
        parcelar_compensa=custo < custo_limite,
    )
