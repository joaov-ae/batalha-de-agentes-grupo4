"""Testa a resiliência da API e do cache em memória."""

from datetime import date
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.engine.modelos import Features, ItemRecorrente
from app.main import app
from app.store.status_store import BigQueryStatusStore


def test_healthz_local():
    with TestClient(app) as client:
        res = client.get("/healthz")
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        assert "data_referencia" in data


def test_status_store_fallback():
    store = BigQueryStatusStore()
    dummy_status = [{
        "id_usuario": "test-uuid",
        "data_referencia": "2025-12-15",
        "estado": "fecha_bem",
        "saldo_hoje": 1500.0,
        "renda_mensal": 5000.0,
        "proximo_salario_data": "2026-01-07",
        "proximo_salario_valor": 5000.0,
        "dias_ate_salario": 23,
        "saldo_projetado_vespera_salario": 500.0,
        "saldo_minimo_projetado": 500.0,
        "data_saldo_minimo": "2026-01-06",
        "dia_que_acaba": None,
        "compromissos_ate_salario": 1000.0,
        "disponivel_ate_salario": 500.0,
        "sobra_por_dia": 21.73,
        "reserva_sugerida": 500.0,
        "score_alerta": 0,
        "sinais": [],
        "antecipar_aviso": False,
        "juros_estimados": 0.0,
        "encaminhar_atendimento": False,
    }]

    with (
        patch("app.bq.run_file", side_effect=Exception("Forbidden: No job permission")),
        patch("app.bq.list_table_rows", return_value=dummy_status),
        patch("app.store.status_store.carregar_features", return_value={
            "test-uuid": Features(
                id_usuario="test-uuid",
                data_referencia=date(2025, 12, 15),
                saldo_hoje=1500.0,
                itens=(ItemRecorrente("salario", "E", "salario", "salario", "salario", 7, 5000.0, date(2025, 12, 7), True),),
                saida_variavel_diaria=20.0,
            )
        }),
        patch("app.store.status_store.carregar_taxa_juros_dia", return_value=0.001),
    ):
        store.recarregar()
        assert store.status("test-uuid") is not None
        assert store.status("test-uuid")["estado"] == "fecha_bem"
        assert len(store.todos_status()) == 1
