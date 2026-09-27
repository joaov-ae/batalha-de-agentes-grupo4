"""Guardrail de entrada, camada 1: regras determinísticas sobre a mensagem do cliente (<5 ms).

Regex pré-compiladas no import e aplicadas ao texto normalizado (sem acento, leetspeak convertido).
"""

import re

from app.catalogo import Severidade
from app.normalizar import espacado, normalizar, proporcao_leet, tem_base64, tem_zero_width
from app.regras.comum import (
    GATILHO_INFERENCIA,
    GRUPOS,
    OFENSIVOS,
    SAUDE_CONDICAO,
    SENSIVEL,
    Achado,
    aplicar,
    coocorrencia,
    dados_pessoais,
    p,
)

M = Severidade.media

PADROES = [
    # E02 prompt injection
    p("E02", r"\b(ignor\w*|esquec\w*|desconsider\w*|descart\w*|sobrescrev\w*)\s+(todas?\s+)?(as\s+|os\s+|suas\s+|seus\s+|minhas\s+|essas\s+)?"
             r"(instrucoes|regras|orientacoes|diretrizes|restricoes|comandos|politicas|limitacoes|tudo)"),
    p("E02", r"\bmodo\s+(de\s+)?(teste|debug|depuracao|desenvolvedor|developer|dev|admin\w*|manutencao|deus|god|dan|"
             r"irrestrito|sem\s+(restricoes|filtros?|limites?)|root|sudo|jailbreak|roteamento)\b"),
    p("E02", r"\b(proxima|nova)?\s*funcao\s+obrigatoria\b"),
    p("E02", r"\b(novas?\s+instrucoes|instrucoes?\s+(do|de)\s+sistema|override|jailbreak|prompt\s+injection)\b"),
    p("E02", r"</?\s*(system|sistema|instructions?|instrucoes|prompt|assistant)\s*>|\[/?(inst|system|sys)\]|#{2,}\s*(system|instrucao|sistema)"),
    p("E02", r"\b(sem|dispensa\w*|pul\w+)\s+(pedir\s+)?(a\s+)?(confirmacao|autorizacao|validacao|verificacao)\b"),
    p("E02", r"\b(ja\s+)?(esta\s+)?(autorizad\w+|aprovad\w+)\s+pel[oa]\s+(sistema|banco|itau|gerente|administrador|desenvolvedor|equipe)\b"),
    p("E02", r"\ba\s+partir\s+de\s+agora\s+(voce|responda|ignore|siga|obedeca)", M),
    # E03 persona
    p("E03", r"\b(assum\w+|interpret\w+|incorpor\w+|fing\w+|simul\w+|atue|aja|haja|represente|faca)\s+(o\s+|a\s+|um\s+|uma\s+)?"
             r"(papel|personagem|persona|funcao)\b"),
    p("E03", r"\b(finja|fingir|finge|imagine|faz\s+de\s+conta)\s+(que\s+)?(voce\s+)?(e|seja|fosse|ser)\b"),
    p("E03", r"\b(voce\s+agora\s+e|agora\s+voce\s+e|a\s+partir\s+de\s+agora\s+voce\s+e|seja\s+(um|uma|o|a|meu|minha))\s+"
             r"(\w+\s+)?(gerente|atendente|funcionari\w|diretor\w?|hacker|consultor\w?|especialista|advogad\w|medic\w|outr\w)"),
    p("E03", r"\b(role\s*play|roleplay|dan\s+mode|developer\s+mode)\b"),
    p("E03", r"\b(sem\s+(taxa\s+de\s+)?juros|juros\s+zero|taxa\s+zero|isent\w+\s+de\s+juros)\b", M),
    # E04 coding / debug / exfiltração
    p("E04", r"(^|\s)/(debug|admin|config|system|sudo|dev|root|env|prompt|tools|reset|mode)\b"),
    p("E04", r"--\s?(show|debug|config|verbose|dump|print|system|prompt|env)[\w-]*"),
    p("E04", r"\b(show[\s_-]?config|print[\s_-]?config|dump|stack\s*trace|traceback|variaveis\s+de\s+ambiente|env\s+vars?|"
             r"api[\s_-]?keys?|chaves?\s+de\s+api|credenciais|service\s+account|access\s+token)\b"),
    p("E04", r"\b(mostr\w+|revel\w+|exib\w+|imprim\w+|repit\w+|repet\w+|list\w+|copi\w+|cole|me\s+(de|diga|passe|mostre|conte))\s+"
             r"((o|a|as|os|seu|sua|suas|seus|todo\s+o|todas\s+as)\s+){0,2}"
             r"(prompt|instrucoes|configurac\w+|codigo(?!\s+de\s+barras)(\s+fonte)?|regras\s+internas|system\s+prompt|"
             r"ferramentas|tools|endpoints?|funcoes\s+disponiveis|mensagem\s+(inicial|de\s+sistema))\b"),
    p("E04", r"\b(qual|quais)\s+(e|sao)\s+((o|a|as|os|seu|sua|suas|seus)\s+){0,2}(prompt|instrucoes|configurac\w+|regras\s+internas)\b"),
    p("E04", r"\b(escrev\w+|ger\w+|cri\w+|program\w+|rode|execut\w+)\s+(um\s+|uma\s+|o\s+|esse\s+)?"
             r"(codigo(?!\s+de\s+barras)|script|programa|query|sql|comando|funcao\s+em)\b"),
    p("E04", r"```|<script|\bimport\s+os\b|os\.system|subprocess|\beval\s*\(|\bexec\s*\(|\$\{[^}]*\}|\{\{[^}]*\}\}|"
             r"\b(select|drop|insert|delete|update|union)\b[^.?!]{0,80}\b(from|table|into|set|select)\b|;\s*--|\bor\s+1\s*=\s*1\b"),
    # E05 apelo emocional
    p("E05", r"\b(minha|a\s+minha|nossa)\s+vida\s+(corre|esta\s+em|depende)|\bcorr\w+\s+(risco|perigo)\s+de\s+vida|"
             r"\b(vida|vidas)\s+(corre|correm)\s+(risco|perigo)"),
    p("E05", r"\b(vou|vai|quero)\s+(me\s+matar|morrer|me\s+machucar|acabar\s+com\s+(tudo|minha\s+vida))|\bsuicid\w*|"
             r"\bnao\s+(aguento|quero\s+viver)\s+mais\b|\b(me\s+)?mat(ar|o)\s+(alguem|eles|voce)\b"),
    p("E05", r"\bse\s+voce\s+(consegue\s+|puder\s+)?(ler|leu)\s+isso\b|\b(e|eh)\s+(muito\s+)?urgente\b|\burgentissimo\b|"
             r"\b(questao|caso)\s+de\s+vida\s+ou\s+morte\b|\beu\s+(te\s+)?imploro\b|\bsendo\s+ameacad\w+|\bsequestr\w+"),
    p("E05", r"\b(estou|to|tou)\s+(desesperad\w+|em\s+panico)\b|\b(alguem|minha\s+(mae|filh\w|famil\w+)|meu\s+(pai|filho))\s+(vai\s+)?morrer\b"),
    # E06 viés / discriminação
    p("E06", r"\b(me\s+)?(cham\w+|trat\w+|apelid\w+)\s+(me\s+)?(de|como)\s+(\S+\s+){0,2}?(" + OFENSIVOS.pattern + r")"),
    p("E06", r"\b" + GRUPOS + r"\s+(sao|costumam|gastam|nao\s+sabem|nunca|sempre|tendem|so\s+sabem)\b"),
    p("E06", r"\b(pior(es)?|melhor(es)?|mais\s+(pobres?|burr\w+|preguicos\w+|caloteir\w+))\s+(que\s+)?(os\s+|as\s+)?" + GRUPOS + r"\b"),
    p("E06", r"\b(me\s+)?(chame|chama|me\s+trate)\s+(de|como)\s+\S+", M),
]

_PADRAO_OFENSIVO = OFENSIVOS


def avaliar(texto: str) -> list[Achado]:
    norm = normalizar(texto)
    achados = aplicar(PADROES, norm)

    # E01 ofuscação: leetspeak, base64, zero-width, letras espaçadas.
    n_leet, prop = proporcao_leet(texto)
    if n_leet >= 3 and prop >= 0.25:
        achados.append(Achado("E01", Severidade.alta, f"{n_leet} tokens em leetspeak"))
    elif n_leet >= 2:
        achados.append(Achado("E01", Severidade.media, f"{n_leet} tokens em leetspeak"))
    if tem_base64(texto):
        achados.append(Achado("E01", Severidade.alta, "trecho em base64"))
    if tem_zero_width(texto) or espacado(texto):
        achados.append(Achado("E01", Severidade.media, "caracteres invisíveis ou letras espaçadas"))

    # E06 termo ofensivo solto (sem pedido de apelido): suspeita.
    if not any(a.codigo == "E06" and a.severidade == Severidade.alta for a in achados):
        m = _PADRAO_OFENSIVO.search(norm)
        if m:
            achados.append(Achado("E06", Severidade.media, m.group()))

    # E07/E08 inferência: alvo sensível + pedido de inferência.
    for codigo, alvo in (("E07", SAUDE_CONDICAO), ("E08", SENSIVEL)):
        a = coocorrencia(codigo, alvo, GATILHO_INFERENCIA, norm)
        if a:
            achados.append(a)

    # E09 dados pessoais (no texto original, para mascarar certo).
    pii = dados_pessoais(texto)
    if pii:
        achados.append(Achado("E09", Severidade.alta, ", ".join(sorted({t for t, _ in pii}))))

    return _dedup(achados)


def _dedup(achados: list[Achado]) -> list[Achado]:
    """Um achado por código, preferindo severidade alta."""
    por_codigo: dict[str, Achado] = {}
    for a in achados:
        atual = por_codigo.get(a.codigo)
        if atual is None or (atual.severidade == Severidade.media and a.severidade == Severidade.alta):
            por_codigo[a.codigo] = a
    return list(por_codigo.values())
