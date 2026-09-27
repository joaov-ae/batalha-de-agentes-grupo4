from datetime import date
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.deps import get_store
from app.main import app
from seed.schemas import POR_NOME


class FakeStore:
    def __init__(self, respostas: dict[str, list[dict[str, Any]]] | None = None) -> None:
        self.respostas = respostas or {}
        self.consultas: list[tuple[str, dict[str, Any]]] = []
        self.inseridos: dict[str, list[dict[str, Any]]] = {}
        self.falhar = False

    def consultar(self, nome: str, **params: Any) -> list[dict[str, Any]]:
        self.consultas.append((nome, params))
        return self.respostas.get(nome, [])

    def inserir(self, tabela: str, linhas: list[dict[str, Any]]) -> None:
        if self.falhar:
            raise RuntimeError("bq fora")
        self.inseridos.setdefault(tabela, []).extend(linhas)


@pytest.fixture
def store() -> FakeStore:
    return FakeStore()


@pytest.fixture
def client(store: FakeStore):
    app.dependency_overrides[get_store] = lambda: store
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


RESUMO = {
    "clientes_ativos": 10, "conversas": 20, "conversas_com_intervencao": 4, "pct_conversas_com_intervencao": 0.2,
    "intervencoes": 5, "clientes_com_intervencao": 3, "clientes_encaminhados_atendimento": 1, "votos": 8,
    "like_rate": 0.75, "alertas": 6, "pct_alertas_com_ajuste_aceito": 0.5, "pct_clientes_desativaram_notificacao": 0.1,
}


def test_health(client) -> None:
    assert client.get("/health").json()["ok"] is True


def test_resumo_usa_janela_padrao(client, store) -> None:
    store.respostas["resumo"] = [RESUMO]
    r = client.get("/v1/metricas/resumo")
    assert r.status_code == 200
    assert r.json()["like_rate"] == 0.75
    assert store.consultas[0] == ("resumo", {"data_inicio": date(2025, 1, 1), "data_fim": date(2025, 12, 31)})


def test_periodo_invertido_422(client) -> None:
    assert client.get("/v1/metricas/resumo?data_inicio=2025-05-01&data_fim=2025-01-01").status_code == 422


def test_feedback_agrupa_quebras(client, store) -> None:
    store.respostas["feedback_quebras"] = [
        {"dimensao": "origem", "valor": "cliente", "votos": 3, "like_rate": 0.6},
        {"dimensao": "origem", "valor": "proativa", "votos": 2, "like_rate": 0.5},
        {"dimensao": "estado_cliente", "valor": "vai_faltar", "votos": 5, "like_rate": 0.4},
    ]
    dados = client.get("/v1/metricas/feedback?granularidade=semana").json()["dados"]
    assert [q["valor"] for q in dados["quebras"]["origem"]] == ["cliente", "proativa"]
    serie = next(p for n, p in store.consultas if n == "feedback_serie")
    assert serie["granularidade"] == "semana"


def test_intervencoes_pivota_fontes(client, store) -> None:
    store.respostas["intervencoes_serie"] = [
        {"periodo": "2025-01-01", "fonte": "guardrails", "intervencoes": 2, "clientes": 2},
        {"periodo": "2025-01-01", "fonte": "agente_escopo", "intervencoes": 3, "clientes": 1},
    ]
    serie = client.get("/v1/metricas/intervencoes").json()["dados"]["serie"]
    assert serie == [{"periodo": "2025-01-01", "total": 5, "por_fonte": {"guardrails": 2, "agente_escopo": 3}}]


def test_impacto_calcula_diferenca_e_acumulado(client, store) -> None:
    linha = {"dias_no_limite_medio": 1.0, "juros_pagos_medio": 1.0, "pct_chegou_sem_limite": 0.0}
    store.respostas["impacto"] = [
        {**linha, "mes": "2025-01-01", "grupo_ab": "controle", "clientes": 100, "taxa_entrada_negativo": 0.20,
         "juros_pagos_total": 50.0},
        {**linha, "mes": "2025-01-01", "grupo_ab": "tratamento", "clientes": 100, "taxa_entrada_negativo": 0.15,
         "juros_pagos_total": 30.0},
    ]
    dados = client.get("/v1/metricas/impacto").json()["dados"]
    assert dados["por_mes"][0]["diferenca_pp_entrada_negativo"] == -5.0
    assert dados["acumulado"]["tratamento"]["taxa_entrada_negativo"] == pytest.approx(0.15)


def test_timeline_404(client) -> None:
    assert client.get("/v1/clientes/x/timeline").status_code == 404


def test_intervindos_filtra_fonte(client, store) -> None:
    client.get("/v1/clientes/intervindos?fonte=guardrails&limite=10")
    nome, params = store.consultas[0]
    assert nome == "clientes_intervindos" and params["fonte"] == "guardrails" and params["limite"] == 10
    assert client.get("/v1/clientes/intervindos?fonte=xpto").status_code == 422


# ----------------------------------------------------------------------- ingestão
def _colunas(tabela: str) -> set[str]:
    return {f.name for f in POR_NOME[tabela].schema}


@pytest.mark.parametrize(
    ("rota", "tabela", "corpo"),
    [
        ("conversa", "conversas", {"id_usuario": "u1", "origem": "proativa", "momento": "salario"}),
        ("mensagem", "mensagens", {"id_usuario": "u1", "conversa_id": "c1", "papel": "agente", "endpoint": "/chat",
                                   "status": "respondido", "latencia_agente_ms": 1200}),
        ("feedback", "feedback_mensagens", {"id_usuario": "u1", "mensagem_id": "m1", "voto": "down",
                                            "motivo": "nao_entendi"}),
        ("alerta", "alertas", {"id_usuario": "u1", "momento": "pix_compra", "status_alerta": "risco_vermelho",
                               "consentiu": True, "n_ajustes_oferecidos": 2}),
        ("ajuste", "ajustes_oferecidos", {"id_usuario": "u1", "tipo": "mudanca_data", "valor": 250.0,
                                          "resultado": "aceito"}),
        ("intervencao", "intervencoes", {"id_usuario": "u1", "codigo": "AG_FILTRO_NUMERO"}),
    ],
)
def test_eventos_gravam_colunas_do_schema(client, store, rota, tabela, corpo) -> None:
    r = client.post(f"/v1/eventos/{rota}", json=corpo)
    assert r.status_code == 201, r.text
    linha = store.inseridos[tabela][0]
    assert set(linha) == _colunas(tabela)
    assert r.json()["ids"] and r.json()["tabela"] == tabela


def test_alerta_deriva_consentimento(client, store) -> None:
    client.post("/v1/eventos/alerta", json={"id_usuario": "u1", "momento": "salario",
                                            "status_alerta": "saldo_estimado_positivo"})
    assert store.inseridos["alertas"][0]["requer_consentimento"] is False


def test_intervencao_com_veredito_do_guardrails(client, store) -> None:
    veredito = {
        "decisao": "bloquear", "permitido": False, "degradado": False, "latencia_ms": 512.3,
        "violacoes": [
            {"codigo": "E02", "categoria": "prompt_injection", "severidade": "alta", "camada": "regra"},
            {"codigo": "E04", "categoria": "coding_debug", "severidade": "media", "camada": "gemini"},
        ],
    }
    r = client.post("/v1/eventos/intervencao", json={"id_usuario": "u1", "mensagem_id": "m1", "veredito": veredito})
    assert r.status_code == 201
    linhas = store.inseridos["intervencoes"]
    assert [ln["codigo"] for ln in linhas] == ["E02", "E04"]
    assert all(ln["fonte"] == "guardrails" and ln["direcao"] == "entrada" for ln in linhas)
    assert set(linhas[0]) == _colunas("intervencoes")


@pytest.mark.parametrize(
    "corpo",
    [
        {"id_usuario": "u1"},
        {"id_usuario": "u1", "codigo": "XYZ"},
        {"id_usuario": "u1", "codigo": "E02", "veredito": {"decisao": "bloquear"}},
    ],
)
def test_intervencao_invalida_422(client, corpo) -> None:
    assert client.post("/v1/eventos/intervencao", json=corpo).status_code == 422


def test_motivo_em_like_422(client) -> None:
    r = client.post("/v1/eventos/feedback", json={"id_usuario": "u1", "mensagem_id": "m1", "voto": "up",
                                                  "motivo": "insistente"})
    assert r.status_code == 422


def test_falha_de_gravacao_503(client, store) -> None:
    store.falhar = True
    r = client.post("/v1/eventos/feedback", json={"id_usuario": "u1", "mensagem_id": "m1", "voto": "up"})
    assert r.status_code == 503
