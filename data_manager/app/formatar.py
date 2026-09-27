"""Formatação pt-BR para o LLM só redigir, sem fazer conta nem converter número."""

from datetime import date

MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro",
         "outubro", "novembro", "dezembro"]


def brl(valor: float | None) -> str | None:
    if valor is None:
        return None
    sinal = "-" if valor < 0 else ""
    inteiro, centavos = f"{abs(valor):,.2f}".split(".")
    return f"{sinal}R$ {inteiro.replace(',', '.')},{centavos}"


def dia(d: date | None) -> str | None:
    """Data por extenso curta, ex.: '5 de janeiro'."""
    if d is None:
        return None
    return f"{d.day} de {MESES[d.month - 1]}"
