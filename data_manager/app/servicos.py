"""Regras de montagem das respostas: junta engine, stores e formatação. As rotas só chamam daqui."""

from datetime import date, timedelta
from typing import Any

from app import formatar as fmt
from app.engine.ajustes import gerar_ajustes
from app.engine.classificacao import calcular_status
from app.engine.custo import comparar_parcelamento, juros_estimados
from app.engine.modelos import Ajuste, Estado, Evento, Features, Projecao
from app.engine.projecao import eventos_previstos, ocorrencias, projetar_cliente, proximo_salario
from app.schemas import (
    AjusteResposta,
    ProjecaoResposta,
    PontoResposta,
    EventoResposta,
    StatusResposta,
)
from app.store.memoria_store import MemoriaStore
from app.store.status_store import BigQueryStatusStore


def status(store: BigQueryStatusStore, f: Features) -> StatusResposta:
    """Status pré-calculado pelo pipeline; se faltar no cache, calcula na hora com o mesmo engine."""
    linha = store.status(f.id_usuario)
    if linha is None:
        s, _ = calcular_status(f, store.regras, store.taxa_juros_dia)
        linha = {k: getattr(s, k) for k in s.__dataclass_fields__}
        linha["estado"] = s.estado.value
    dados = {k: v for k, v in linha.items() if k in StatusResposta.model_fields}
    dados["sinais"] = list(dados.get("sinais") or [])
    dados["formatado"] = {
        "saldo_hoje": fmt.brl(dados["saldo_hoje"]),
        "sobra_ate_salario": fmt.brl(max(dados["disponivel_ate_salario"], 0)),
        "sobra_por_dia": fmt.brl(dados["sobra_por_dia"]),
        "proximo_salario": fmt.dia(dados["proximo_salario_data"]),
        "dia_que_acaba": fmt.dia(dados["dia_que_acaba"]),
        "saldo_vespera_salario": fmt.brl(dados["saldo_projetado_vespera_salario"]),
        "juros_estimados": fmt.brl(dados["juros_estimados"]),
        "reserva_sugerida": fmt.brl(dados["reserva_sugerida"]) if dados["reserva_sugerida"] else None,
    }
    return StatusResposta(**dados)


def projecao(f: Features, p: Projecao | None = None) -> ProjecaoResposta:
    p = p or projetar_cliente(f)
    return ProjecaoResposta(
        id_usuario=f.id_usuario,
        data_referencia=f.data_referencia,
        saldo_inicial=p.saldo_inicial,
        fim=p.fim,
        saida_variavel_diaria=p.saida_variavel_diaria,
        saldo_final=p.saldo_final,
        saldo_minimo=p.saldo_minimo,
        dia_que_acaba=p.dia_que_acaba,
        pontos=[
            PontoResposta(
                data=pt.data,
                saldo=pt.saldo,
                eventos=[EventoResposta(data=e.data, descricao=e.descricao, valor=e.valor, tipo_item=e.tipo_item) for e in pt.eventos],
            )
            for pt in p.pontos
        ],
    )


def ajuste(a: Ajuste) -> AjusteResposta:
    if a.resolve and a.impacto_dias:
        impacto = "resolve: o dinheiro chega até o salário"
    elif a.impacto_dias:
        impacto = f"dá mais {a.impacto_dias} dia{'s' if a.impacto_dias > 1 else ''}"
    elif a.ganho_vespera_salario > 0:
        impacto = f"libera {fmt.brl(a.ganho_vespera_salario)} até o salário"
    else:
        impacto = None
    return AjusteResposta(
        ajuste_id=a.ajuste_id,
        tipo=a.tipo,
        titulo=a.titulo,
        valor=a.valor,
        impacto_dias=a.impacto_dias,
        resolve=a.resolve,
        ganho_vespera_salario=a.ganho_vespera_salario,
        esforco=a.esforco,
        acao=a.acao,
        detalhes=a.detalhes,
        formatado={"valor": fmt.brl(a.valor), "impacto": impacto},
    )


def ajustes(store: BigQueryStatusStore, memoria: MemoriaStore, f: Features, tipo: str | None = None) -> dict[str, Any]:
    st = status(store, f)
    lista: list[Ajuste] = []
    if st.estado != Estado.JA_NO_BURACO:
        lista = gerar_ajustes(f, projetar_cliente(f), memoria.recusas(f.id_usuario))
    if tipo:
        lista = [a for a in lista if a.tipo == tipo]
    return {
        "id_usuario": f.id_usuario,
        "estado": st.estado,
        "encaminhar_atendimento": st.encaminhar_atendimento,
        "ajustes": [ajuste(a) for a in lista],
    }


def compromissos(f: Features) -> dict[str, Any]:
    p = projetar_cliente(f)
    eventos = [e for pt in p.pontos for e in pt.eventos]
    return {
        "id_usuario": f.id_usuario,
        "ate": p.fim,
        "proximo_salario_data": proximo_salario(f),
        "total_saidas": round(-sum(e.valor for e in eventos if e.valor < 0), 2),
        "total_entradas": round(sum(e.valor for e in eventos if e.valor > 0), 2),
        "compromissos": [
            {"data": e.data, "descricao": e.descricao, "valor": e.valor, "tipo_item": e.tipo_item,
             "reagendavel": e.reagendavel, "formatado": {"valor": fmt.brl(abs(e.valor)), "data": fmt.dia(e.data)}}
            for e in eventos
        ],
    }


def ritmo_do_mes(f: Features, store: BigQueryStatusStore) -> dict[str, Any]:
    """Momento 3: o gasto desta semana antecipa o fim do dinheiro?"""
    base = projetar_cliente(f)
    semana = projetar_cliente(f, saida_variavel_diaria=f.saida_variavel_diaria_7d)
    dias_antes = None
    if semana.dia_que_acaba and (base.dia_que_acaba is None or semana.dia_que_acaba < base.dia_que_acaba):
        referencia = base.dia_que_acaba or (base.fim + timedelta(days=1))
        dias_antes = (referencia - semana.dia_que_acaba).days
    consumo = [
        {
            "categoria": c.macro,
            "gasto_mes_atual": c.gasto_mes_atual,
            "esperado_ate_hoje": c.esperado_ate_hoje,
            "media_mensal_3m": c.media_mensal_3m,
            "acima_do_esperado": round(c.gasto_mes_atual - c.esperado_ate_hoje, 2),
        }
        for c in sorted(f.consumo, key=lambda c: c.esperado_ate_hoje - c.gasto_mes_atual)
    ]
    return {
        "id_usuario": f.id_usuario,
        "saida_variavel_diaria_3m": f.saida_variavel_diaria,
        "saida_variavel_diaria_ultima_semana": f.saida_variavel_diaria_7d,
        "dia_que_acaba_ritmo_3m": base.dia_que_acaba,
        "dia_que_acaba_ritmo_semana": semana.dia_que_acaba,
        "dias_antes": dias_antes,
        "fora_da_curva": dias_antes is not None and dias_antes > 0,
        "juros_estimados_ritmo_semana": juros_estimados(semana, store.taxa_juros_dia),
        "consumo_por_categoria": consumo,
        "formatado": {
            "dia_que_acaba_ritmo_semana": fmt.dia(semana.dia_que_acaba),
            "dias_antes": f"{dias_antes} dias antes" if dias_antes else None,
        },
    }


def data_debito(f: Features, data: date, canal: str) -> date:
    """Compra no cartão só sai da conta na fatura seguinte ao fechamento do mês da compra."""
    if canal != "cartao":
        return data
    fatura = next((i for i in f.itens if i.tipo_item == "fatura"), None)
    if fatura is None:
        return data
    fim_mes = (data.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    datas = ocorrencias(fatura, f.data_referencia, fim_mes + timedelta(days=62))
    return next((d for d in datas if d > fim_mes), data)


def datas_debito(f: Features, data: date, canal: str, parcelas: int = 1) -> list[date]:
    """Calcula as datas de débito para 1 ou N parcelas no cartão ou à vista."""
    primeira = data_debito(f, data, canal)
    if parcelas <= 1 or canal != "cartao":
        return [primeira]

    fatura = next((i for i in f.itens if i.tipo_item == "fatura"), None)
    if fatura is None:
        return [primeira + timedelta(days=30 * i) for i in range(parcelas)]

    ate = primeira + timedelta(days=35 * (parcelas + 2))
    todas = ocorrencias(fatura, f.data_referencia, ate)
    futuras = [d for d in todas if d >= primeira]

    resultado = []
    for i in range(parcelas):
        if i < len(futuras):
            resultado.append(futuras[i])
        else:
            base_calc = resultado[-1] if resultado else primeira
            resultado.append(base_calc + timedelta(days=30))
    return resultado


def ciclo_seguinte(f: Features) -> tuple[date | None, date]:
    """(dia do próximo salário, véspera do salário seguinte)."""
    renda = f.renda_principal
    salario = proximo_salario(f)
    if renda is None or salario is None:
        fim = f.data_referencia + timedelta(days=60)
        return None, fim
    datas = ocorrencias(renda, f.data_referencia, salario + timedelta(days=45))
    seguinte = datas[1] if len(datas) > 1 else salario + timedelta(days=30)
    return salario, seguinte - timedelta(days=1)


def simular_transacao(
    f: Features,
    store: BigQueryStatusStore,
    valor: float,
    data: date | None,
    canal: str,
    descricao: str,
    parcelas: int = 1,
) -> dict[str, Any]:
    base = projetar_cliente(f)
    dt_base = data or (f.data_referencia + timedelta(days=1))
    debito_datas = datas_debito(f, dt_base, canal, parcelas)
    debito_primeira = debito_datas[0]
    valor_parcela = round(valor / parcelas, 2)

    novos_eventos = []
    for idx, d_parc in enumerate(debito_datas):
        desc = f"{descricao} ({idx+1}/{parcelas})" if parcelas > 1 else descricao
        novos_eventos.append(Evento(d_parc, -valor_parcela, "simulacao", desc, "simulacao"))

    nova = projetar_cliente(f, ate=base.fim, eventos=eventos_previstos(f, base.fim) + novos_eventos)

    salario, fim_ciclo2 = ciclo_seguinte(f)
    sugerida_resolve = False
    if salario is not None:
        adiada_datas = datas_debito(f, salario, canal, parcelas) if canal == "cartao" else [salario]
        adiadas = [
            Evento(d, -valor_parcela, "simulacao", f"{descricao} ({i+1}/{parcelas})" if parcelas > 1 else descricao, "simulacao")
            for i, d in enumerate(adiada_datas)
        ]
        dois_ciclos = projetar_cliente(f, ate=fim_ciclo2, eventos=eventos_previstos(f, fim_ciclo2) + adiadas)
        sugerida_resolve = dois_ciclos.dia_que_acaba is None

    juros_antes = juros_estimados(base, store.taxa_juros_dia)
    juros_depois = juros_estimados(nova, store.taxa_juros_dia)

    contas_comprometidas = []
    if nova.dia_que_acaba is not None:
        for e in eventos_previstos(f, base.fim):
            if e.valor < 0 and e.tipo_item != "simulacao" and e.data >= nova.dia_que_acaba:
                contas_comprometidas.append({
                    "data": e.data,
                    "descricao": e.descricao,
                    "valor": round(abs(e.valor), 2),
                    "tipo_item": e.tipo_item,
                    "formatado": {
                        "data": fmt.dia(e.data),
                        "valor": fmt.brl(abs(e.valor)),
                    },
                })

    return {
        "id_usuario": f.id_usuario,
        "fica_negativo": nova.dia_que_acaba is not None,
        "dia_que_acaba_antes": base.dia_que_acaba,
        "dia_que_acaba_depois": nova.dia_que_acaba,
        "saldo_minimo_depois": nova.saldo_minimo,
        "juros_estimados_antes": juros_antes,
        "juros_estimados_depois": juros_depois,
        "juros_adicionais": round(juros_depois - juros_antes, 2),
        "data_debito_na_conta": debito_primeira,
        "data_sugerida": salario,
        "data_sugerida_resolve": sugerida_resolve,
        "parcelas": parcelas,
        "valor_parcela": valor_parcela if parcelas > 1 else None,
        "contas_comprometidas": contas_comprometidas,
        "formatado": {
            "valor": fmt.brl(valor),
            "valor_parcela": fmt.brl(valor_parcela) if parcelas > 1 else None,
            "dia_que_acaba_depois": fmt.dia(nova.dia_que_acaba),
            "juros_adicionais": fmt.brl(round(juros_depois - juros_antes, 2)),
            "data_sugerida": fmt.dia(salario),
        },
    }


def produtos_investimento(f: Features) -> dict[str, Any]:
    """Retorna opções de investimento de liquidez diária adequadas para reserva ou clientes fecha_bem."""
    proj = projetar_cliente(f)
    sobra = max(0.0, proj.saldo_minimo)
    sugerida = round(sobra, 2) if sobra > 0 else max(round(f.saldo_hoje * 0.2, 2), 100.0)
    rend_mes = round(sugerida * 0.0085, 2)

    produtos = [
        {
            "nome": "CDB Itaú DI",
            "tipo": "Renda Fixa Privada",
            "rentabilidade": "100% do CDI",
            "liquidez": "Diária com resgate imediato",
            "risco": "Muito baixo",
            "resgate_imediato": True,
            "descricao": "Proteção do FGC até R$ 250 mil. Excelente para reserva de emergência e alta liquidez.",
            "rendimento_estimado_mes": rend_mes,
            "formatado": {
                "rendimento_estimado_mes": fmt.brl(rend_mes),
            },
        },
        {
            "nome": "Tesouro Selic 2029",
            "tipo": "Título Público Federal",
            "rentabilidade": "100% Taxa Selic",
            "liquidez": "D+1 (dias úteis)",
            "risco": "Mínimo (garantia soberana)",
            "resgate_imediato": False,
            "descricao": "Títulos do Tesouro Direto pós-fixados, investimento com máxima segurança.",
            "rendimento_estimado_mes": rend_mes,
            "formatado": {
                "rendimento_estimado_mes": fmt.brl(rend_mes),
            },
        },
        {
            "nome": "Fundo Itaú Soberano DI Simples",
            "tipo": "Fundo DI Renda Fixa",
            "rentabilidade": "~100% do CDI",
            "liquidez": "Diária (D+0)",
            "risco": "Muito baixo",
            "resgate_imediato": True,
            "descricao": "Sem taxa de administração, alocado integralmente em títulos públicos.",
            "rendimento_estimado_mes": rend_mes,
            "formatado": {
                "rendimento_estimado_mes": fmt.brl(rend_mes),
            },
        },
    ]
    return {
        "id_usuario": f.id_usuario,
        "saldo_hoje": f.saldo_hoje,
        "valor_sugerido_reserva": sugerida,
        "produtos": produtos,
        "formatado": {
            "saldo_hoje": fmt.brl(f.saldo_hoje),
            "valor_sugerido_reserva": fmt.brl(sugerida),
        },
    }


def simular_reserva(f: Features, valor: float) -> dict[str, Any]:
    salario, fim_ciclo2 = ciclo_seguinte(f)
    eventos = eventos_previstos(f, fim_ciclo2)
    sem = projetar_cliente(f, ate=fim_ciclo2, eventos=eventos)
    data_reserva = salario or f.data_referencia + timedelta(days=1)
    com = projetar_cliente(f, ate=fim_ciclo2, eventos=eventos + [Evento(data_reserva, -round(valor, 2), "reserva", "reserva", "reserva")])

    def minimo_ciclo(p: Projecao) -> float:
        return min((pt.saldo for pt in p.pontos if pt.data >= data_reserva), default=p.saldo_final)

    min_sem, min_com = minimo_ciclo(sem), minimo_ciclo(com)
    return {
        "id_usuario": f.id_usuario,
        "valor": valor,
        "data_reserva": salario,
        "proximo_ciclo_fim": fim_ciclo2,
        "saldo_minimo_proximo_ciclo_sem_reserva": min_sem,
        "saldo_minimo_proximo_ciclo_com_reserva": min_com,
        "reserva_cabe": min_com >= 0,
        "formatado": {"valor": fmt.brl(valor), "data_reserva": fmt.dia(salario), "saldo_minimo_com_reserva": fmt.brl(min_com)},
    }


def simular_parcelamento(f: Features, store: BigQueryStatusStore, taxa_mensal: float, parcelas: int, valor_fatura: float | None) -> dict[str, Any]:
    base = projetar_cliente(f)
    eventos = eventos_previstos(f, base.fim)
    fatura = next((e for e in eventos if e.tipo_item == "fatura"), None)
    item = next((i for i in f.itens if i.tipo_item == "fatura"), None)
    valor = valor_fatura or (-fatura.valor if fatura else (item.valor_previsto if item else 0.0))
    comparacao = comparar_parcelamento(valor, parcelas, taxa_mensal, 0.0)
    juros_evitados = 0.0
    if fatura is not None:
        primeira = round(-(comparacao.custo_parcelamento + valor) / parcelas, 2)
        ajustados = [Evento(e.data, primeira, e.chave, e.descricao, e.tipo_item) if e is fatura else e for e in eventos]
        nova = projetar_cliente(f, ate=base.fim, eventos=ajustados)
        juros_evitados = juros_estimados(base, store.taxa_juros_dia) - juros_estimados(nova, store.taxa_juros_dia)
    comparacao = comparar_parcelamento(valor, parcelas, taxa_mensal, juros_evitados)
    return {
        "id_usuario": f.id_usuario,
        "data_fatura": fatura.data if fatura else None,
        "valor_fatura": comparacao.valor_fatura,
        "parcelas": parcelas,
        "valor_parcela": round((comparacao.custo_parcelamento + comparacao.valor_fatura) / parcelas, 2),
        "taxa_mensal": taxa_mensal,
        "custo_parcelamento": comparacao.custo_parcelamento,
        "juros_de_limite_evitados": comparacao.custo_limite,
        "parcelar_compensa": comparacao.parcelar_compensa and comparacao.custo_limite > 0,
        "observacao": "Mostrar ao cliente só quando parcelar_compensa = true.",
        "formatado": {
            "valor_parcela": fmt.brl(round((comparacao.custo_parcelamento + comparacao.valor_fatura) / parcelas, 2)),
            "custo_parcelamento": fmt.brl(comparacao.custo_parcelamento),
            "juros_de_limite_evitados": fmt.brl(comparacao.custo_limite),
        },
    }
