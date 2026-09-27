from types import SimpleNamespace as NS

from juiz.metrica import avaliar, pontuar


def ex(aprovado, nota, id_="X"):
    return NS(id=id_, cenario="c", mensagem="m", aprovado=aprovado, nota=nota, comentario="")


def test_acerto_exato_vale_1():
    assert pontuar(ex(True, 4), NS(nota=4)) == 1.0


def test_falsa_reprovacao_custa_mais_que_falsa_aprovacao():
    # mesma distância de nota (1), erro de lados opostos do limiar
    falsa_reprovacao = pontuar(ex(True, 3), NS(nota=2))
    falsa_aprovacao = pontuar(ex(False, 2), NS(nota=3))
    assert falsa_reprovacao < falsa_aprovacao


def test_nota_invalida_vale_zero():
    assert pontuar(ex(True, 3), NS(nota="abc")) == 0.0


def test_trace_exige_acerto_e_nota_proxima():
    assert pontuar(ex(True, 4), NS(nota=3), trace=[]) == 1.0
    assert pontuar(ex(True, 5), NS(nota=3), trace=[]) == 0.0
    assert pontuar(ex(False, 2), NS(nota=3), trace=[]) == 0.0


def test_avaliar_matriz_e_taxas():
    pares = [
        (ex(True, 4, "a"), NS(nota=4)),   # VP
        (ex(True, 3, "b"), NS(nota=2)),   # FN (falsa reprovação)
        (ex(False, 1, "c"), NS(nota=1)),  # VN
        (ex(False, 2, "d"), NS(nota=3)),  # FP (falsa aprovação)
        (ex(True, 3, "e"), None),         # falha de parse -> reprovação
    ]
    r = avaliar(pares, limiar=3)
    assert (r.vp, r.vn, r.fp, r.fn, r.falhas_parse) == (1, 1, 1, 2, 1)
    assert r.acuracia == 0.4
    assert r.taxa_falsa_reprovacao == 2 / 3
    assert r.taxa_falsa_aprovacao == 0.5
    assert {e["id"] for e in r.erros} == {"b", "d", "e"}


def test_limiar_flexivel_muda_aprovacao():
    pares = [(ex(True, 3), NS(nota=2))]
    assert avaliar(pares, limiar=3).fn == 1
    assert avaliar(pares, limiar=2).vp == 1
