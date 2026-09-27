"""Tools de leitura do extrato (consultas parametrizadas no BigQuery, nunca SQL livre)."""

from typing import Annotated, Any

from fastapi import APIRouter, Query

from app import bq, servicos
from app import formatar as fmt
from app.deps import ClienteDep, StatusStoreDep

router = APIRouter(prefix="/v1/clientes/{id_usuario}", tags=["extrato"])


@router.get(
    "/gastos",
    operation_id="gasto_por_categoria",
    summary="Gasto por categoria no mês atual contra a média do próprio cliente",
    description="via_fatura=true indica consumo que chega à conta pela fatura do cartão.",
)
def gasto_por_categoria(f: ClienteDep, meses: Annotated[int, Query(ge=1, le=11)] = 3) -> dict[str, Any]:
    linhas = bq.run_file("gastos_por_categoria", id_usuario=f.id_usuario, meses=meses)
    return {"id_usuario": f.id_usuario, "meses_media": meses, "categorias": linhas}


@router.get(
    "/evolucao-saldo",
    operation_id="evolucao_saldo",
    summary="Saldo médio, mínimo e de fim de mês, mês a mês (mostra a erosão do saldo)",
)
def evolucao_saldo(f: ClienteDep, meses: Annotated[int, Query(ge=1, le=11)] = 6) -> dict[str, Any]:
    return {"id_usuario": f.id_usuario, "meses": bq.run_file("evolucao_saldo", id_usuario=f.id_usuario, meses=meses)}


@router.get(
    "/fatura",
    operation_id="historico_fatura",
    summary="Pagamentos de fatura: valor e se foi integral, parcial ou mínimo",
)
def historico_fatura(f: ClienteDep, meses: Annotated[int, Query(ge=1, le=11)] = 6) -> dict[str, Any]:
    return {"id_usuario": f.id_usuario, "pagamentos": bq.run_file("historico_fatura", id_usuario=f.id_usuario, meses=meses)}


@router.get(
    "/transacoes",
    operation_id="ultimas_transacoes",
    summary="Últimos lançamentos, opcionalmente de uma categoria (para 'o que foi isso?')",
)
def ultimas_transacoes(
    f: ClienteDep,
    categoria: Annotated[str, Query(max_length=60, description="Categoria macro ou micro, ex.: Delivery")] = "",
    limite: Annotated[int, Query(ge=1, le=100)] = 20,
) -> dict[str, Any]:
    linhas = bq.run_file("ultimas_transacoes", id_usuario=f.id_usuario, categoria=categoria, limite=limite)
    return {"id_usuario": f.id_usuario, "transacoes": linhas}


@router.get(
    "/resumo-anual",
    operation_id="resumo_anual",
    summary="Visão genérica dos últimos 12 meses (fallback quando nenhuma tool específica responde)",
    description="Agregado para o LLM: saldo mês a mês, gasto por categoria, principais gastos, recorrências e "
    "últimos lançamentos. Campos formatado trazem os valores prontos em R$.",
)
def resumo_anual(f: ClienteDep) -> dict[str, Any]:
    return servicos.resumo_anual(f)


@router.get(
    "/custo-limite",
    operation_id="custo_do_limite",
    summary="Juros de limite pagos no ano e juros estimados se entrar no limite até o salário",
    description="Taxa diária calibrada na própria base (juros pagos / saldo devedor diário).",
)
def custo_do_limite(f: ClienteDep, store: StatusStoreDep) -> dict[str, Any]:
    ano = bq.run_file("custo_limite", id_usuario=f.id_usuario)[0]
    st = servicos.status(store, f)
    return {
        "id_usuario": f.id_usuario,
        **ano,
        "juros_estimados_ate_salario": st.juros_estimados,
        "taxa_juros_limite_dia": store.taxa_juros_dia,
        "formatado": {
            "juros_pagos_ano": fmt.brl(ano["juros_pagos_ano"]),
            "juros_estimados_ate_salario": fmt.brl(st.juros_estimados),
        },
    }
