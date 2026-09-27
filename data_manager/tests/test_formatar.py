from datetime import date

from app.formatar import brl, dia


def test_brl():
    assert brl(1234.5) == "R$ 1.234,50"
    assert brl(-883.22) == "-R$ 883,22"
    assert brl(None) is None


def test_dia():
    assert dia(date(2026, 1, 7)) == "7 de janeiro"
