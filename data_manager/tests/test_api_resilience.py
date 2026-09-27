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


def test_api_novas_rotas_enriquecidas():
    from app.deps import cliente as dep_cliente, status_store as dep_status_store
    from unittest.mock import MagicMock

    uid = "11111111-2222-3333-4444-555555555555"
    dummy_features = Features(
        id_usuario=uid,
        data_referencia=date(2025, 12, 15),
        saldo_hoje=1000.0,
        itens=(
            ItemRecorrente("salario", "E", "salario", "salario", "salario", 7, 5000.0, date(2025, 12, 7), True),
            ItemRecorrente("fatura", "S", "fatura", "fatura", "fatura", 25, 300.0, date(2025, 11, 25), False),
            ItemRecorrente("aluguel", "S", "conta_fixa", "aluguel", "aluguel", 28, 700.0, date(2025, 11, 28), False),
        ),
        saida_variavel_diaria=0.0,
    )

    mock_store = MagicMock()
    mock_store.taxa_juros_dia = 0.002

    app.dependency_overrides[dep_cliente] = lambda: dummy_features
    app.dependency_overrides[dep_status_store] = lambda: mock_store

    try:
        with TestClient(app) as client:
            # 1. Simular transação com parcelamento
            r_tx = client.post(
                f"/v1/clientes/{uid}/simulacoes/transacao",
                json={"valor": 600.0, "canal": "cartao", "parcelas": 3, "descricao": "TV"},
            )
            assert r_tx.status_code == 200
            data_tx = r_tx.json()
            assert data_tx["parcelas"] == 3
            assert data_tx["valor_parcela"] == 200.0
            assert "contas_comprometidas" in data_tx

            # 2. Obter opções de investimento
            r_inv = client.get(f"/v1/clientes/{uid}/investimentos")
            assert r_inv.status_code == 200
            data_inv = r_inv.json()
            assert len(data_inv["produtos"]) == 3
            assert data_inv["valor_sugerido_reserva"] > 0

            # 3. Registrar decisão de poupar
            r_poup = client.post(
                f"/v1/clientes/{uid}/memoria/poupar",
                json={"valor": 150.0, "origem": "recusa_compra", "motivo": "desistiu da compra supérflua"},
            )
            assert r_poup.status_code == 200
            data_poup = r_poup.json()
            assert data_poup["valor_poupado"] == 150.0
            assert data_poup["total_poupado_acumulado"] == 150.0

            # 4. Checar se persistiu na rota /memoria
            with patch("app.bq.run_file", return_value=[{"saldo_ciclo": 200.0}]):
                r_mem = client.get(f"/v1/clientes/{uid}/memoria")
                assert r_mem.status_code == 200
                data_mem = r_mem.json()
                assert data_mem["total_poupado"] == 150.0
                assert len(data_mem["historico_poupanca"]) == 1
    finally:
        app.dependency_overrides.clear()


