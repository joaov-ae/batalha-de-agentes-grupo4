"""Tools de status, projeção e leitura dos compromissos do cliente."""

from typing import Any

from fastapi import APIRouter

from app import formatar as fmt
from app import servicos
from app.deps import ClienteDep, MemoriaDep, StatusStoreDep
from app.schemas import ProjecaoResposta, ResumoRecebimentoResposta, StatusResposta

router = APIRouter(prefix="/v1/clientes/{id_usuario}", tags=["cliente"])


@router.get(
    "/status",
    operation_id="obter_status",
    response_model=StatusResposta,
    summary="Estado do cliente no mês (chame primeiro em toda conversa)",
    description=(
        "Classificação determinística: vai_faltar, zero_a_zero, fecha_bem ou ja_no_buraco. Traz saldo de hoje, "
        "próximo salário, dia em que o dinheiro acaba, sobra por dia, score de alerta e juros estimados. "
        "Se encaminhar_atendimento=true, não ofereça ajustes: reconheça e ofereça atendimento humano."
    ),
)
def obter_status(f: ClienteDep, store: StatusStoreDep) -> StatusResposta:
    return servicos.status(store, f)


@router.get(
    "/projecao",
    operation_id="obter_projecao",
    response_model=ProjecaoResposta,
    summary="Saldo projetado dia a dia até a véspera do salário",
    description="Série diária com os lançamentos previstos de cada dia. Base de 'no ritmo atual, acaba no dia X'.",
)
def obter_projecao(f: ClienteDep) -> ProjecaoResposta:
    return servicos.projecao(f)


@router.get(
    "/resumo-salario",
    operation_id="resumo_recebimento",
    response_model=ResumoRecebimentoResposta,
    summary="Momento 1 (salário caiu): quanto sobra, por dia, quando acaba e os 3 melhores ajustes",
)
def resumo_recebimento(f: ClienteDep, store: StatusStoreDep, memoria: MemoriaDep) -> ResumoRecebimentoResposta:
    st = servicos.status(store, f)
    principais = servicos.ajustes(store, memoria, f)["ajustes"][:3]
    sobra = max(st.disponivel_ate_salario, 0)
    return ResumoRecebimentoResposta(
        id_usuario=f.id_usuario,
        estado=st.estado,
        sobra_ate_salario=sobra,
        sobra_por_dia=st.sobra_por_dia,
        dias_ate_salario=st.dias_ate_salario,
        proximo_salario_data=st.proximo_salario_data,
        dia_que_acaba=st.dia_que_acaba,
        principais_ajustes=principais,
        formatado={
            "sobra_ate_salario": fmt.brl(sobra),
            "sobra_por_dia": fmt.brl(st.sobra_por_dia),
            "proximo_salario": fmt.dia(st.proximo_salario_data),
            "dia_que_acaba": fmt.dia(st.dia_que_acaba),
        },
    )


@router.get(
    "/ritmo",
    operation_id="ritmo_do_mes",
    summary="Momento 3: o gasto desta semana antecipa o fim do dinheiro?",
    description="Compara o ritmo da última semana com o dos últimos 3 meses e o consumo do mês com a média do próprio cliente.",
)
def ritmo_do_mes(f: ClienteDep, store: StatusStoreDep) -> dict[str, Any]:
    return servicos.ritmo_do_mes(f, store)


@router.get(
    "/compromissos",
    operation_id="listar_compromissos_ate_salario",
    summary="Contas fixas, parcelas, assinaturas e fatura previstas até o salário",
)
def listar_compromissos(f: ClienteDep) -> dict[str, Any]:
    return servicos.compromissos(f)


@router.get(
    "/recorrencias",
    operation_id="listar_recorrencias",
    summary="Tudo que se repete no extrato: salário, contas fixas, assinaturas, financiamentos, fatura",
)
def listar_recorrencias(f: ClienteDep) -> dict[str, Any]:
    itens = sorted(f.itens, key=lambda i: (i.tipo, i.tipo_item, -i.valor_previsto))
    return {
        "id_usuario": f.id_usuario,
        "renda_mensal": f.renda_mensal,
        "itens": [
            {
                "chave": i.chave,
                "tipo": "entrada" if i.tipo == "E" else "saida",
                "tipo_item": i.tipo_item,
                "descricao": i.descricao,
                "dia_tipico": i.dia_tipico,
                "valor_mensal": i.valor_previsto,
                "grupo_assinatura": i.grupo_assinatura,
                "parcelas_restantes": i.parcelas_restantes,
            }
            for i in itens
            if not (i.parcelas_restantes is not None and i.parcelas_restantes <= 0)
        ],
    }


@router.get(
    "/parcelas",
    operation_id="listar_parcelas_ativas",
    summary="Parcelas e financiamentos ativos e quando cada parcela termina",
)
def listar_parcelas(f: ClienteDep) -> dict[str, Any]:
    ativos = []
    for i in f.itens:
        if i.tipo_item not in ("parcela", "financiamento"):
            continue
        if i.parcelas_restantes is not None and i.parcelas_restantes <= 0:
            continue
        ativos.append(
            {
                "descricao": i.descricao,
                "tipo_item": i.tipo_item,
                "valor_mensal": i.valor_previsto,
                "dia_tipico": i.dia_tipico,
                "parcelas_restantes": i.parcelas_restantes,
                "formatado": {"valor_mensal": fmt.brl(i.valor_previsto)},
            }
        )
    return {"id_usuario": f.id_usuario, "total_mensal": round(sum(a["valor_mensal"] for a in ativos), 2), "parcelas": ativos}

