"""Gerador de ajustes: só os 3 tipos do escopo, cada um com impacto em dias, ordenados por esforço.

1. mudanca_data: saída reagendável prevista antes do salário vai para o dia do salário.
2. assinatura_redundante: 2+ serviços do mesmo grupo (vídeo ou música).
3. gasto_discricionario: categoria acima da média do PRÓPRIO cliente (nunca comparado com outras pessoas).
"""

import calendar
from collections import defaultdict
from collections.abc import Mapping
from dataclasses import replace
from datetime import timedelta

from app.engine.modelos import Ajuste, Evento, Features, Projecao
from app.engine.projecao import dias_ganhos, ocorrencias, projetar_cliente, proximo_salario

MAX_RECUSAS = 2
TOLERANCIA_DISCRICIONARIO = 1.10  # 10% acima do esperado até hoje
EXCESSO_MINIMO = 20.0  # R$; abaixo disso o ajuste não vale a conversa
GRUPOS_REDUNDANTES = ("video", "musica")


def _eventos(p: Projecao) -> list[Evento]:
    return [e for pt in p.pontos for e in pt.eventos]


def _medir(f: Features, base: Projecao, eventos: list[Evento]) -> tuple[int, bool, float]:
    nova = projetar_cliente(f, ate=base.fim, eventos=eventos)
    dias, resolve = dias_ganhos(base, nova)
    return dias, resolve, round(nova.saldo_final - base.saldo_final, 2)


def _mudanca_data(f: Features, base: Projecao) -> list[Ajuste]:
    salario = proximo_salario(f)
    if salario is None:
        return []
    eventos = _eventos(base)
    por_chave: dict[str, list[Evento]] = defaultdict(list)
    for e in eventos:
        if e.reagendavel and e.valor < 0:
            por_chave[e.chave].append(e)
    ajustes = []
    for chave, evs in por_chave.items():
        movidos = [replace(e, data=salario) if e in evs else e for e in eventos]
        dias, resolve, ganho = _medir(f, base, movidos)
        ajustes.append(
            Ajuste(
                ajuste_id=f"mudanca_data:{chave}",
                tipo="mudanca_data",
                titulo=f"Agendar {evs[0].descricao} para {salario:%d/%m}, dia do salário",
                valor=round(-sum(e.valor for e in evs), 2),
                impacto_dias=dias,
                resolve=resolve,
                ganho_vespera_salario=ganho,
                esforco=1,
                acao="agendar_pix",
                detalhes={
                    "categoria": chave,
                    "datas_previstas": [e.data.isoformat() for e in evs],
                    "data_sugerida": salario.isoformat(),
                },
            )
        )
    return ajustes


def _assinaturas(f: Features, base: Projecao) -> list[Ajuste]:
    por_grupo = defaultdict(list)
    for i in f.itens:
        if i.tipo_item == "assinatura" and i.grupo_assinatura in GRUPOS_REDUNDANTES:
            por_grupo[i.grupo_assinatura].append(i)
    ajustes = []
    for grupo, servicos in por_grupo.items():
        if len(servicos) < 2:
            continue
        # Mantém o serviço com a próxima cobrança mais distante (maior efeito até o salário); em empate,
        # o mais caro (economia mínima). É só a base do cálculo: o cliente escolhe qual manter.
        longe = base.fim + timedelta(days=62)
        servicos.sort(
            key=lambda i: ((ocorrencias(i, f.data_referencia, longe) or [longe])[0], i.valor_previsto),
            reverse=True,
        )
        cancelaveis = {i.chave for i in servicos[1:]}
        eventos = [e for e in _eventos(base) if e.chave not in cancelaveis]
        dias, resolve, ganho = _medir(f, base, eventos)
        nomes = ", ".join(i.chave for i in servicos)
        ajustes.append(
            Ajuste(
                ajuste_id=f"assinatura_redundante:{grupo}",
                tipo="assinatura_redundante",
                titulo=f"{len(servicos)} serviços de {'vídeo' if grupo == 'video' else 'música'}: {nomes}",
                valor=round(sum(i.valor_previsto for i in servicos[1:]), 2),
                impacto_dias=dias,
                resolve=resolve,
                ganho_vespera_salario=ganho,
                esforco=2,
                acao=None,  # o banco não cancela: o agente aponta a redundância e o caminho
                detalhes={
                    "grupo": grupo,
                    "servicos": [
                        {"servico": i.chave, "valor_mensal": i.valor_previsto, "dia_cobranca": i.dia_tipico}
                        for i in servicos
                    ],
                    "servico_mantido_no_calculo": servicos[0].chave,
                    "economia_mensal": round(sum(i.valor_previsto for i in servicos[1:]), 2),
                },
            )
        )
    return ajustes


def _discricionarios(f: Features, base: Projecao) -> list[Ajuste]:
    ref = f.data_referencia
    dias_mes = calendar.monthrange(ref.year, ref.month)[1]
    proporcao = ref.day / dias_mes
    fim_mes = ref.replace(day=dias_mes)
    eventos = _eventos(base)
    # O consumo entra na conta pela fatura: a economia do resto do mês reduz a primeira fatura
    # prevista depois do fechamento do mês, se ela cair antes do salário.
    fatura = next((e for e in eventos if e.tipo_item == "fatura" and e.data > fim_mes), None)
    ajustes = []
    for c in f.consumo:
        excesso = c.gasto_mes_atual - c.esperado_ate_hoje
        if c.gasto_mes_atual <= c.esperado_ate_hoje * TOLERANCIA_DISCRICIONARIO or excesso < EXCESSO_MINIMO:
            continue
        ritmo_mes = c.gasto_mes_atual / proporcao
        economia = round(max(0.0, (ritmo_mes - c.media_mensal_3m) * (1 - proporcao)), 2)
        if economia <= 0:
            continue
        dias, resolve, ganho = 0, base.dia_que_acaba is None, 0.0
        if fatura is not None:
            ajustados = [replace(e, valor=round(e.valor + economia, 2)) if e is fatura else e for e in eventos]
            dias, resolve, ganho = _medir(f, base, ajustados)
        ajustes.append(
            Ajuste(
                ajuste_id=f"gasto_discricionario:{c.macro}",
                tipo="gasto_discricionario",
                titulo=f"Teto de R$ {c.media_mensal_3m:.2f} em {c.macro} neste mês",
                valor=economia,
                impacto_dias=dias,
                resolve=resolve,
                ganho_vespera_salario=ganho,
                esforco=3,
                acao="lembrete_teto",
                detalhes={
                    "categoria": c.macro,
                    "gasto_mes_atual": c.gasto_mes_atual,
                    "esperado_ate_hoje": c.esperado_ate_hoje,
                    "media_mensal_3m": c.media_mensal_3m,
                    "teto_sugerido": c.media_mensal_3m,
                    "efeito_na_fatura_de": fatura.data.isoformat() if fatura else None,
                },
            )
        )
    return ajustes


def gerar_ajustes(f: Features, base: Projecao, recusas: Mapping[str, int] | None = None) -> list[Ajuste]:
    """Lista ordenada por menor esforço e, dentro do mesmo esforço, maior impacto.

    Ajuste recusado MAX_RECUSAS vezes sai da lista daquele cliente.
    """
    recusas = recusas or {}
    todos = _mudanca_data(f, base) + _assinaturas(f, base) + _discricionarios(f, base)
    ativos = [a for a in todos if recusas.get(a.ajuste_id, 0) < MAX_RECUSAS]
    return sorted(ativos, key=lambda a: (a.esforco, not a.resolve, -a.impacto_dias, -a.valor))
