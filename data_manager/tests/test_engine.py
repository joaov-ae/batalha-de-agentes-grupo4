from datetime import date

import pytest

from app.engine.ajustes import MAX_RECUSAS, gerar_ajustes
from app.engine.classificacao import Regras, calcular_status, classificar
from app.engine.custo import comparar_parcelamento, juros_estimados
from app.engine.modelos import ConsumoCategoria, Estado, Features, ItemRecorrente
from app.engine.projecao import ocorrencias, projetar_cliente, proximo_salario

REF = date(2025, 12, 15)


def item(chave, tipo, tipo_item, dia, valor, **kw):
    kw.setdefault("ultima_data", date(2025, 11, dia))
    kw.setdefault("ocorreu_no_mes_atual", dia <= REF.day)
    return ItemRecorrente(chave=chave, tipo=tipo, tipo_item=tipo_item, descricao=chave, micro=chave,
                          dia_tipico=dia, valor_previsto=valor, **kw)


SALARIO = item("Salario CLT", "E", "salario", 7, 5000.0)


def cliente(saldo=1000.0, itens=(), ritmo=0.0, **kw):
    return Features("u1", REF, saldo, (SALARIO, *itens), ritmo, **kw)


def test_ocorrencias_respeita_mes_atual_e_parcelas():
    ja_foi = item("x", "S", "conta_fixa", 10, 100.0)
    assert ocorrencias(ja_foi, REF, date(2026, 2, 28)) == [date(2026, 1, 10), date(2026, 2, 10)]
    vai = item("y", "S", "conta_fixa", 20, 100.0)
    assert ocorrencias(vai, REF, date(2026, 1, 31)) == [date(2025, 12, 20), date(2026, 1, 20)]
    acabou = item("z", "S", "parcela", 20, 100.0, parcelas_restantes=0)
    assert ocorrencias(acabou, REF, date(2026, 6, 30)) == []
    uma = item("w", "S", "parcela", 20, 100.0, parcelas_restantes=1)
    assert ocorrencias(uma, REF, date(2026, 6, 30)) == [date(2025, 12, 20)]


def test_saida_atrasada_sai_amanha_e_entrada_atrasada_fica_para_o_mes_que_vem():
    atrasada = item("s", "S", "conta_fixa", 10, 50.0, ocorreu_no_mes_atual=False)
    assert ocorrencias(atrasada, REF, date(2025, 12, 31)) == [date(2025, 12, 16)]
    renda = item("r", "E", "salario", 10, 50.0, ocorreu_no_mes_atual=False)
    assert ocorrencias(renda, REF, date(2026, 1, 31)) == [date(2026, 1, 10)]


def test_projecao_ate_vespera_do_salario():
    f = cliente(saldo=1000.0, itens=[item("Conta", "S", "conta_fixa", 20, 300.0)], ritmo=10.0)
    assert proximo_salario(f) == date(2026, 1, 7)
    p = projetar_cliente(f)
    assert p.fim == date(2026, 1, 6)
    assert len(p.pontos) == 22
    # 1000 - 300 - 22 dias * 10
    assert p.saldo_final == pytest.approx(480.0)
    assert p.dia_que_acaba is None


def test_quatro_estados():
    regras = Regras()
    renda = SALARIO.valor_previsto
    buraco = cliente(saldo=-10.0)
    assert classificar(buraco, projetar_cliente(buraco), regras) is Estado.JA_NO_BURACO
    cronico = cliente(saldo=5000.0, meses_vermelho_consecutivos=3)
    assert classificar(cronico, projetar_cliente(cronico), regras) is Estado.JA_NO_BURACO
    falta = cliente(saldo=500.0, itens=[item("Conta", "S", "conta_fixa", 20, 800.0)])
    assert classificar(falta, projetar_cliente(falta), regras) is Estado.VAI_FALTAR
    zero = cliente(saldo=0.05 * renda)
    assert classificar(zero, projetar_cliente(zero), regras) is Estado.ZERO_A_ZERO
    bem = cliente(saldo=0.5 * renda)
    assert classificar(bem, projetar_cliente(bem), regras) is Estado.FECHA_BEM


def test_status_dia_que_acaba_e_juros():
    f = cliente(saldo=500.0, itens=[item("Conta", "S", "conta_fixa", 20, 800.0)], score=4)
    s, p = calcular_status(f, Regras(), taxa_juros_dia=0.001)
    assert s.estado is Estado.VAI_FALTAR
    assert s.dia_que_acaba == date(2025, 12, 20)
    assert s.antecipar_aviso
    # -300 por 18 dias (20/12 a 06/01)
    assert s.juros_estimados == pytest.approx(300 * 18 * 0.001)
    assert juros_estimados(p, 0.001) == s.juros_estimados


def test_mudanca_de_data_resolve_e_vem_primeiro():
    pix = item("Outras transferencias", "S", "conta_fixa", 20, 800.0, reagendavel=True)
    f = cliente(saldo=500.0, itens=[pix])
    ajustes = gerar_ajustes(f, projetar_cliente(f))
    assert ajustes[0].tipo == "mudanca_data"
    assert ajustes[0].resolve
    assert ajustes[0].detalhes["data_sugerida"] == "2026-01-07"


def test_assinatura_redundante_mantem_a_cobranca_mais_distante():
    subs = [
        item("netflix", "S", "assinatura", 20, 40.0, grupo_assinatura="video"),
        item("hbo max", "S", "assinatura", 10, 30.0, grupo_assinatura="video"),
        item("spotify", "S", "assinatura", 20, 20.0, grupo_assinatura="musica"),
    ]
    f = cliente(saldo=60.0, itens=subs)
    ajustes = gerar_ajustes(f, projetar_cliente(f))
    video = [a for a in ajustes if a.ajuste_id == "assinatura_redundante:video"]
    assert len(video) == 1 and not any(a.ajuste_id.endswith("musica") for a in ajustes)
    assert video[0].detalhes["servico_mantido_no_calculo"] == "hbo max"
    assert video[0].valor == 40.0
    assert video[0].resolve


def test_discricionario_compara_com_a_propria_media():
    fatura = item("Pagamento de fatura", "S", "fatura", 5, 1500.0)
    delivery = ConsumoCategoria("Delivery", gasto_mes_atual=600.0, media_mensal_3m=600.0, esperado_ate_hoje=290.0)
    f = cliente(saldo=1400.0, itens=[fatura], consumo=(delivery,))
    ajustes = gerar_ajustes(f, projetar_cliente(f))
    d = [a for a in ajustes if a.tipo == "gasto_discricionario"]
    assert len(d) == 1
    assert d[0].detalhes["teto_sugerido"] == 600.0
    assert d[0].detalhes["efeito_na_fatura_de"] == "2026-01-05"
    assert d[0].valor > 0


def test_recusado_duas_vezes_sai_da_lista():
    pix = item("Outras transferencias", "S", "conta_fixa", 20, 800.0, reagendavel=True)
    f = cliente(saldo=500.0, itens=[pix])
    base = projetar_cliente(f)
    aid = "mudanca_data:Outras transferencias"
    assert any(a.ajuste_id == aid for a in gerar_ajustes(f, base, {aid: MAX_RECUSAS - 1}))
    assert not any(a.ajuste_id == aid for a in gerar_ajustes(f, base, {aid: MAX_RECUSAS}))


def test_parcelamento_price():
    c = comparar_parcelamento(1000.0, 3, 0.05, custo_limite=100.0)
    # PMT = 367.21 -> custo 101.63
    assert c.custo_parcelamento == pytest.approx(101.63, abs=0.01)
    assert not c.parcelar_compensa
