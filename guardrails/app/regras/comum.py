"""Peças compartilhadas pelos detectores de entrada e saída."""

import re
from dataclasses import dataclass

from app.catalogo import Severidade


@dataclass(frozen=True)
class Achado:
    codigo: str
    severidade: Severidade
    evidencia: str


@dataclass(frozen=True)
class Padrao:
    codigo: str
    regex: re.Pattern
    severidade: Severidade = Severidade.alta


def p(codigo: str, padrao: str, severidade: Severidade = Severidade.alta) -> Padrao:
    return Padrao(codigo, re.compile(padrao), severidade)


def aplicar(padroes: list[Padrao], texto: str) -> list[Achado]:
    achados = []
    for pad in padroes:
        m = pad.regex.search(texto)
        if m:
            achados.append(Achado(pad.codigo, pad.severidade, m.group()[:80]))
    return achados


def coocorrencia(codigo: str, alvo: re.Pattern, gatilho: re.Pattern, texto: str) -> Achado | None:
    """Alvo + gatilho de inferência = alta; só o alvo = média (a camada semântica decide)."""
    m = alvo.search(texto)
    if not m:
        return None
    g = gatilho.search(texto)
    if g:
        return Achado(codigo, Severidade.alta, f"{m.group()} / {g.group()}"[:80])
    return Achado(codigo, Severidade.media, m.group()[:80])


# Termos pejorativos (raça, origem, orientação, deficiência) e placeholders mascarados (****).
OFENSIVOS = re.compile(
    r"\b(macac[oa]s?|crioul[oa]s?|tiziu|neguinh[oa]|negao|negona|escurinh[oa]|pretinh[oa]|mulat[oa]s?|"
    r"gorila|sarara|favelad[oa]|sapatao|viad[oa]|bichinha|bicha|traveco|retardad[oa]|mongoloide|"
    r"aleijad[oa]|baianada|paraiba|judeuzinho|cigan[oa] ladr\w*)\b|\*{3,}"
)

# Grupos em contexto de estereótipo.
GRUPOS = r"(negros?|pretos?|pardos?|indigenas?|nordestinos?|baianos?|judeus?|ciganos?|asiaticos?|chineses?|" \
         r"mulheres|gays?|lesbicas?|trans|evangelicos?|catolicos?|muculmanos?|imigrantes?|venezuelanos?|haitianos?)"

GATILHO_INFERENCIA = re.compile(
    r"\b(indic\w*|suger\w*|revel\w*|infer\w*|deduz\w*|deduz|descobr\w*|adivinh\w*|significa\w*|quer dizer|"
    r"da (pra|para) saber|consegue saber|saber (se|qual)|sinal de|evidencia\w*|apont\w*|mostra que|"
    r"provavel\w*|parece (que|ser)|deve ser|seria|estou com|tenho (alguma|algum)|"
    r"(qual|que|quais)( e| sao)? (a |o )?(doenca\w*|condic\w+|problema\w*|religiao|partido|orientacao|raca|etnia)|qual (e )?(a |o )?(minha|meu|sua|seu|dele|dela))\b"
)

SAUDE_CONDICAO = re.compile(
    r"\b(procedimentos? (medic|cirurg|hospitalar)\w*|doencas?|doente|diagnostic\w*|tratamentos? (medic|de saude|contra|para)\w*|"
    r"cirurgi\w+|internac\w+|gravid\w+|gestac\w+|cancer|tumor|hiv|aids|depressao|ansiedade|transtorno\w*|"
    r"condic\w+ de saude|problemas? de saude|estado de saude|saude (mental|dele|dela|do cliente|da cliente)|"
    r"psiquiatr\w*|quimioterapia|dialise|doenca cronica|deficiencia|dependencia quimica|vicio)\b"
)

SENSIVEL = re.compile(
    r"\b(religi\w+|filiac\w+ (religios|partidari|politic)\w*|igrejas?|templos?|dizimos?|evangelic\w*|catolic\w*|"
    r"espirit[ae]s?|umbanda|candomble|judaic\w*|judeus?|muculman\w*|islamic\w*|ateus?|ateia|crenca\w*|"
    r"partidos? politicos?|politic\w+|ideolog\w+|eleitor\w*|em quem (vot\w+)|sindicaliz\w+|sindicatos?|"
    r"orientac\w+ sexual|homossexua\w*|heterossexua\w*|bissexua\w*|gays?|lesbica\w*|lgbt\w*|transgener\w*|"
    r"racas?|racia\w*|etnia\w*|etnic\w*|cor da pele|origem etnica)\b"
)

CPF = re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")
CARTAO = re.compile(r"\b(?:\d[ -]?){12,18}\d\b")
UUID = re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.I)
SENHA = re.compile(r"\b(senha|pin|token|c[oó]digo de seguran[cç]a|cvv)\s*(é|e|eh|:|=)?\s*(\S*\d\S*)", re.I)


def _luhn(numero: str) -> bool:
    digitos = [int(c) for c in numero if c.isdigit()]
    if not 13 <= len(digitos) <= 19:
        return False
    soma = 0
    for i, d in enumerate(reversed(digitos)):
        if i % 2:
            d *= 2
            d -= 9 if d > 9 else 0
        soma += d
    return soma % 10 == 0


def dados_pessoais(texto: str, incluir_uuid: bool = False) -> list[tuple[str, str]]:
    """[(tipo, trecho)] de CPF, cartão (Luhn), senha e, na saída, UUID de cliente."""
    achados = [("cpf", m.group()) for m in CPF.finditer(texto)]
    achados += [("cartao", m.group()) for m in CARTAO.finditer(texto) if _luhn(m.group())]
    achados += [("senha", m.group(3)) for m in SENHA.finditer(texto)]
    if incluir_uuid:
        achados += [("id", m.group()) for m in UUID.finditer(texto)]
    return achados


def mascarar(texto: str, incluir_uuid: bool = False) -> str:
    for tipo, trecho in dados_pessoais(texto, incluir_uuid):
        if tipo == "cartao":
            digitos = "".join(c for c in trecho if c.isdigit())
            texto = texto.replace(trecho, f"cartão final {digitos[-4:]}")
        else:
            texto = texto.replace(trecho, f"[{tipo.upper()} OCULTO]")
    return texto
