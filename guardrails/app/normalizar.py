"""Normalização do texto para os detectores: pega ofuscação sem depender da grafia.

O texto normalizado serve só para detecção; o que volta ao agente é sempre o texto original (ou mascarado).
"""

import re
import unicodedata

_ZERO_WIDTH = re.compile(r"[​-‏⁠-⁤﻿­]")
_LEET = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s", "!": "i", "|": "l"})
_TOKEN = re.compile(r"\S+")
# Tokens com letra e dígito que são legítimos em finanças: 12x, 5o (5º), 1a, 10k, 3h, R$300, 2mil.
_MISTO_LEGITIMO = re.compile(r"^(r\$[\d.,]+|\d+(x|o|a|h|k|s|mil|min|am|pm|gb|mb)|\d+[.,/:\-]\d+.*)$")
_TEM_LETRA = re.compile(r"[a-z]")
_TEM_LEET = re.compile(r"[0134578@$!|]")
# l e t r a s  e s p a ç a d a s  ou  s.e.p.a.r.a.d.a.s (4+ letras isoladas seguidas).
_ESPACADO = re.compile(r"\b(?:[a-z][\s.\-_*]){3,}[a-z]\b")
_BASE64 = re.compile(r"[A-Za-z0-9+/]{40,}={0,2}")
_ESPACOS = re.compile(r"\s+")


def _sem_acento(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


def _base(texto: str) -> str:
    texto = unicodedata.normalize("NFKC", texto)
    texto = _ZERO_WIDTH.sub("", texto)
    return _sem_acento(texto).lower()


def token_leet(token: str) -> bool:
    """Token que mistura letras com dígitos/símbolos de leetspeak (ex.: m3m0r1a), exceto os legítimos."""
    t = token.strip(".,;:?!()[]\"'")
    return (
        len(t) >= 2
        and bool(_TEM_LETRA.search(t))
        and bool(_TEM_LEET.search(t))
        and not _MISTO_LEGITIMO.match(t)
    )


def _desleet(token: str) -> str:
    return token.translate(_LEET) if token_leet(token) else token


def normalizar(texto: str) -> str:
    """minúsculas, sem acento, sem zero-width, leetspeak convertido e letras espaçadas juntadas."""
    t = _base(texto)
    t = _TOKEN.sub(lambda m: _desleet(m.group()), t)
    t = _ESPACADO.sub(lambda m: re.sub(r"[\s.\-_*]", "", m.group()), t)
    return _ESPACOS.sub(" ", t).strip()


def proporcao_leet(texto: str) -> tuple[int, float]:
    """(quantidade, proporção) de tokens em leetspeak."""
    tokens = [t for t in _base(texto).split() if _TEM_LETRA.search(t) or any(c.isdigit() for c in t)]
    if not tokens:
        return 0, 0.0
    n = sum(token_leet(t) for t in tokens)
    return n, n / len(tokens)


def tem_zero_width(texto: str) -> bool:
    return bool(_ZERO_WIDTH.search(texto))


def tem_base64(texto: str) -> bool:
    return bool(_BASE64.search(texto))


def espacado(texto: str) -> bool:
    return bool(_ESPACADO.search(_base(texto)))
