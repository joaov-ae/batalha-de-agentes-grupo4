"""Guardrail de saída, camada 1: regras determinísticas sobre a resposta do agente (<5 ms)."""

import re
from typing import Any

from app.catalogo import Severidade
from app.normalizar import normalizar
from app.regras.comum import (
    GATILHO_INFERENCIA,
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
    # S01 vazamento de configuração / detalhes técnicos
    p("S01", r"```|\btraceback\b|\bstack\s*trace\b|\bexception\b|\berro\s+(500|interno|http)|file\s+\"[^\"]+\",\s+line\s+\d+"),
    p("S01", r"\b(system\s+prompt|prompt\s+(do|de)\s+sistema|minhas\s+instrucoes\s+(sao|dizem|internas)|fui\s+(instruid|programad)\w+\s+(a|para)|"
             r"instrucoes\s+internas|regras\s+internas|minha\s+configuracao)\b"),
    p("S01", r"\b(bigquery|cloud\s+run|openapi|endpoint|api\s+key|access\s+token|data_manager|id_usuario|service\s+account|"
             r"localhost|\.run\.app|googleapis|/v1/\w+|model\s+armor|gemini|vertex)\b"),
    p("S01", r"\b(minhas\s+ferramentas|as\s+tools|chamei\s+a\s+(tool|ferramenta|funcao)|funcao\s+\w+\(\))", M),
    # S02 oferta indevida (persona gerente, crédito, promessas)
    p("S02", r"\b(emprestimo|credito\s+(pessoal|pre-?aprovado|novo|consignado)|financiamento|consignado|aumento\s+de\s+limite|"
             r"limite\s+(extra|adicional|maior|pre-?aprovado)|cartao\s+novo|antecipacao\s+(de|do)\s+(salario|13|fgts))\b"
             r"[^.!?]{0,80}\b(ofere\w*|ofert\w*|aprovad\w*|liberad\w*|disponive\w*|conced\w*|contrat\w*|posso\s+(te\s+)?(liberar|oferecer|conceder))"),
    p("S02", r"\b(ofere\w*|ofert\w*|posso\s+(te\s+)?(liberar|oferecer|conceder)|liber\w+|aprov\w+)\s+(\w+\s+){0,3}"
             r"(emprestimo|credito|financiamento|consignado|limite|cartao)"),
    p("S02", r"\b(emprestimo|credito|financiamento)\b[^.!?]{0,60}\b(sem\s+(taxa\s+de\s+)?juros|juros\s+zero|taxa\s+zero|isento)\b"),
    p("S02", r"\b(como\s+(seu|o)\s+gerente|sou\s+(seu|o)\s+gerente|desconto\s+especial|condicao\s+especial|taxa\s+especial|"
             r"exclusiv\w+\s+para\s+voce)\b"),
    p("S02", r"\b(sem\s+(taxa\s+de\s+)?juros|juros\s+zero|taxa\s+zero|garant\w+|promet\w+|sem\s+risco|rendimento\s+garantido)\b", M),
    # S05 linguagem discriminatória / aceitou apelido
    p("S05", r"\b(vou|irei|posso)\s+(te\s+|lhe\s+)?(chamar|tratar)\s+(de|como)\s+(\S+\s+){0,2}?(" + OFENSIVOS.pattern + r")"),
    p("S05", r"\b(a\s+partir\s+de\s+agora|de\s+agora\s+em\s+diante)\W+(vou|irei)\s+(te\s+|lhe\s+)?(chamar|tratar)\b", M),
    # S06 acatou manipulação
    p("S06", r"\bmodo\s+(de\s+)?(teste|debug|depuracao|desenvolvedor|developer|admin\w*|manutencao|irrestrito|roteamento)\s+"
             r"(ativad|habilitad|ligad|iniciad|confirmad)\w*"),
    p("S06", r"\b(entendido|ok|certo|claro|perfeito)\W+(entrando|ativando|iniciando|habilitando)\s+(o\s+)?modo\b"),
    p("S06", r"\b(executando|realizando|efetuando|enviando|transferindo|disparando)\s+(o\s+|um\s+|a\s+|uma\s+)?(pix|transferencia|pagamento|ted|doc)\b"),
    p("S06", r"\b(pix|transferencia|pagamento|ted)\s+(foi\s+)?(realizad|efetuad|enviad|executad|concluid)\w*", M),
    p("S06", r"\b(ignorando|desconsiderando)\s+(as\s+)?(minhas\s+)?(instrucoes|regras)\b"),
]

_VALOR_RS = re.compile(r"R\$\s?-?\s?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?")
_NUMERO_JSON = re.compile(r"-?\d+(?:[.,]\d+)?")


def _para_float(inteiro: str, centavos: str | None) -> float:
    return float(inteiro.replace(".", "") + "." + (centavos or "0"))


def valores_rs(texto: str) -> list[tuple[str, float]]:
    return [(m.group().strip(), _para_float(m.group(1), m.group(2))) for m in _VALOR_RS.finditer(texto)]


def _numeros_do_contexto(obj: Any, acc: set[float]) -> set[float]:
    """Todos os números do contexto das tools: valores numéricos e valores em R$ dentro de strings."""
    if isinstance(obj, bool):
        return acc
    if isinstance(obj, (int, float)):
        acc.add(abs(float(obj)))
    elif isinstance(obj, str):
        acc.update(abs(v) for _, v in valores_rs(obj))
        for n in _NUMERO_JSON.findall(obj):
            try:
                acc.add(abs(float(n.replace(",", "."))))
            except ValueError:
                pass
    elif isinstance(obj, dict):
        for v in obj.values():
            _numeros_do_contexto(v, acc)
    elif isinstance(obj, (list, tuple)):
        for v in obj:
            _numeros_do_contexto(v, acc)
    return acc


def _suportado(valor: float, conhecidos: set[float]) -> bool:
    # Tolerância: arredondamento para reais inteiros ou 1%.
    alvo = abs(valor)
    return any(abs(alvo - c) <= max(1.0, 0.01 * c) for c in conhecidos)


def numeros_sem_suporte(resposta: str, contexto_tools: Any, mensagem_usuario: str | None) -> list[str]:
    if contexto_tools is None:
        return []
    conhecidos = _numeros_do_contexto(contexto_tools, set())
    if mensagem_usuario:
        conhecidos |= _numeros_do_contexto(mensagem_usuario, set())
    return [trecho for trecho, v in valores_rs(resposta) if v != 0 and not _suportado(v, conhecidos)]


def avaliar(resposta: str, mensagem_usuario: str | None = None, contexto_tools: Any = None) -> list[Achado]:
    norm = normalizar(resposta)
    achados = aplicar(PADROES, norm)

    # S03/S04: na resposta, citar condição de saúde já é problema; tema sensível com inferência também.
    m = SAUDE_CONDICAO.search(norm)
    if m:
        achados.append(Achado("S03", Severidade.alta, m.group()))
    a = coocorrencia("S04", SENSIVEL, GATILHO_INFERENCIA, norm)
    if a:
        forte = re.search(r"religi\w+|orientac\w+ sexual|filiac\w+|etnia|raca|cor da pele|partido", a.evidencia)
        achados.append(Achado("S04", Severidade.alta if forte else a.severidade, a.evidencia))

    # S05: termo ofensivo solto na resposta.
    m = OFENSIVOS.search(norm)
    if m:
        achados.append(Achado("S05", Severidade.alta, m.group()))

    # S07: valores em R$ que não vieram das tools.
    sem_suporte = numeros_sem_suporte(resposta, contexto_tools, mensagem_usuario)
    if sem_suporte:
        achados.append(Achado("S07", Severidade.alta, ", ".join(sem_suporte)[:80]))

    # S08: dados pessoais e identificadores internos.
    pii = dados_pessoais(resposta, incluir_uuid=True)
    if pii:
        achados.append(Achado("S08", Severidade.alta, ", ".join(sorted({t for t, _ in pii}))))

    por_codigo: dict[str, Achado] = {}
    for a in achados:
        atual = por_codigo.get(a.codigo)
        if atual is None or (atual.severidade == Severidade.media and a.severidade == Severidade.alta):
            por_codigo[a.codigo] = a
    return list(por_codigo.values())
