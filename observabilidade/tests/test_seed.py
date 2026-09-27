from collections import Counter, defaultdict
from datetime import date

import pytest

from app.catalogo import CODIGOS, MAX_RECUSAS, STATUS_COM_CONSENTIMENTO, StatusAlerta
from seed.gerar import Gerador, Params, clientes_base, serializar
from seed.schemas import POR_NOME, TABELAS


def _gerar(seed: int = 7) -> dict[str, list[dict]]:
    params = Params(seed=seed, n_clientes=200)
    return serializar(Gerador(params, clientes_base(200, "sintetico", seed)).gerar())


@pytest.fixture(scope="module")
def base() -> dict[str, list[dict]]:
    return _gerar()


def test_deterministico() -> None:
    assert _gerar(3) == _gerar(3)
    assert _gerar(3) != _gerar(4)


def test_colunas_batem_com_schema(base) -> None:
    for t in TABELAS:
        colunas = {f.name for f in t.schema}
        assert base[t.nome], f"{t.nome} vazia"
        for linha in base[t.nome]:
            assert set(linha) == colunas, t.nome
        obrigatorias = [f.name for f in t.schema if f.mode == "REQUIRED"]
        assert all(linha[c] is not None for linha in base[t.nome] for c in obrigatorias), t.nome


def test_integridade_referencial(base) -> None:
    clientes = {c["id_usuario"] for c in base["clientes"]}
    conversas = {c["conversa_id"] for c in base["conversas"]}
    mensagens = {m["mensagem_id"] for m in base["mensagens"]}
    alertas = {a["alerta_id"] for a in base["alertas"]}
    for tabela in ("conversas", "mensagens", "intervencoes", "alertas", "ajustes_oferecidos", "feedback_mensagens"):
        assert {ln["id_usuario"] for ln in base[tabela]} <= clientes, tabela
    assert {m["conversa_id"] for m in base["mensagens"]} <= conversas
    assert {i["mensagem_id"] for i in base["intervencoes"]} <= mensagens
    assert {f["mensagem_id"] for f in base["feedback_mensagens"]} <= mensagens
    assert {a["alerta_id"] for a in base["ajustes_oferecidos"]} <= alertas
    assert {i["codigo"] for i in base["intervencoes"]} <= set(CODIGOS)


def test_so_tratamento_conversa_e_controle_tem_resultado(base) -> None:
    grupo = {c["id_usuario"]: c["grupo_ab"] for c in base["clientes"]}
    assert {grupo[c["id_usuario"]] for c in base["conversas"]} == {"tratamento"}
    assert {r["grupo_ab"] for r in base["resultado_ciclo"]} == {"tratamento", "controle"}


def test_no_maximo_um_aviso_por_dia(base) -> None:
    por_dia = Counter((a["id_usuario"], a["criado_em"][:10]) for a in base["alertas"])
    assert max(por_dia.values()) == 1


def test_nao_insiste_apos_duas_recusas(base) -> None:
    ofertas = defaultdict(list)
    for aj in sorted(base["ajustes_oferecidos"], key=lambda a: a["criado_em"]):
        ofertas[(aj["id_usuario"], aj["chave"])].append(aj["resultado"])
    for resultados in ofertas.values():
        # Depois da 2ª recusa, o ajuste não volta a ser oferecido.
        recusas = [i for i, r in enumerate(resultados) if r == "recusado"]
        if len(recusas) >= MAX_RECUSAS:
            assert recusas[MAX_RECUSAS - 1] == len(resultados) - 1


def test_consentimento_so_nos_status_de_risco(base) -> None:
    for a in base["alertas"]:
        assert a["requer_consentimento"] == (StatusAlerta(a["status_alerta"]) in STATUS_COM_CONSENTIMENTO)
        if not a["requer_consentimento"]:
            assert a["consentiu"] is None and a["n_ajustes_oferecidos"] == 0


def test_desativou_nao_recebe_mais_aviso(base) -> None:
    desativou_em = {}
    for a in sorted(base["alertas"], key=lambda a: a["criado_em"]):
        uid = a["id_usuario"]
        assert uid not in desativou_em, "aviso depois de desativar notificações"
        if a["desativou_notificacao"]:
            desativou_em[uid] = a["criado_em"]
    ativos = {c["id_usuario"]: c["notificacoes_ativas"] for c in base["clientes"]}
    assert all(not ativos[uid] for uid in desativou_em)


def test_fora_da_curva_so_depois_do_lancamento(base) -> None:
    meses = {a["criado_em"][:7] for a in base["alertas"] if a["momento"] == "fora_da_curva"}
    assert meses and min(meses) >= "2025-07"


def _taxa(linhas, cond, meses) -> float:
    sel = [ln for ln in linhas if ln["mes"][:7] in meses]
    return sum(cond(ln) for ln in sel) / len(sel)


def test_tendencias_de_longo_prazo(base) -> None:
    inicio, fim = {"2025-01", "2025-02", "2025-03"}, {"2025-10", "2025-11", "2025-12"}
    fb = [dict(f, mes=f["criado_em"]) for f in base["feedback_mensagens"]]
    assert _taxa(fb, lambda f: f["voto"] == "up", fim) > _taxa(fb, lambda f: f["voto"] == "up", inicio) + 0.05

    rc = base["resultado_ciclo"]
    trat = [r for r in rc if r["grupo_ab"] == "tratamento"]
    ctrl = [r for r in rc if r["grupo_ab"] == "controle"]
    neg = lambda r: r["entrou_no_negativo"]  # noqa: E731
    assert _taxa(trat, neg, fim) < _taxa(ctrl, neg, fim)


def test_schemas_particionados_por_campo_existente() -> None:
    for t in TABELAS:
        if t.campo_particao:
            assert t.campo_particao in {f.name for f in t.schema}
    assert POR_NOME["resultado_ciclo"].campo_particao is None
