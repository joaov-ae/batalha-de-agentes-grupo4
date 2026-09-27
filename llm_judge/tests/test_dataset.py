from collections import Counter

from juiz import dataset


def test_base_tem_47_exemplos_com_invariante():
    rotulos = dataset.carregar()
    assert len(rotulos) == 47
    assert len({r.id for r in rotulos}) == 47
    assert Counter(r.aprovado for r in rotulos) == {True: 28, False: 19}
    # A flexibilidade do juiz depende disto: aprovado <=> nota >= 3.
    assert all(r.aprovado == (r.nota >= 3) for r in rotulos)


def test_exemplo_so_expoe_cenario_e_mensagem_como_entrada():
    ex = dataset.exemplos()[0]
    assert set(ex.inputs().keys()) == {"cenario", "mensagem"}


def test_split_estratificado_e_disjunto():
    base = dataset.exemplos()
    treino, val = dataset.dividir(base)
    assert len(treino) + len(val) == 47
    assert not {e.id for e in treino} & {e.id for e in val}
    assert 29 <= len(treino) <= 31
    # proporção de aprovados parecida nos dois lados (28/47 ~ 0.6)
    for parte in (treino, val):
        assert 0.5 <= sum(e.aprovado for e in parte) / len(parte) <= 0.7


def test_split_deterministico():
    base = dataset.exemplos()
    assert [e.id for e in dataset.dividir(base)[1]] == [e.id for e in dataset.dividir(base)[1]]


def test_dobras_cobrem_a_base_uma_vez():
    base = dataset.exemplos()
    dobras = dataset.dobras(base, 5)
    ids_val = [e.id for _, va in dobras for e in va]
    assert sorted(ids_val) == sorted(e.id for e in base)
    for tr, va in dobras:
        assert not {e.id for e in tr} & {e.id for e in va}
