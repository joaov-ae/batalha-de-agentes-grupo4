import pytest

from cliente import extrair_veredito
from juiz import prompt
from juiz.contrato import VereditoTom
from juiz_tom.agent import criar_agente

PROMPT = {
    "instrucao": "INSTRUCAO {nao_e_variavel}", "limiar_aprovacao": 3, "modelo": "gemini-2.5-flash", "pensar": False,
    "demos": [{"id": "MSG-003", "cenario": "M2", "mensagem": "ALERTA!!!", "justificativa": "alarmista", "nota": 1}],
}


def test_agente_usa_prompt_renderizado_sem_templating():
    ag = criar_agente(PROMPT)
    assert ag.name == "juiz_tom"
    assert ag.output_schema is VereditoTom
    assert ag.output_key == "veredito_tom"
    assert ag.include_contents == "none"
    # static_instruction vai literal: chaves do prompt não viram variáveis de estado.
    assert ag.static_instruction == prompt.renderizar(PROMPT)
    assert "{nao_e_variavel}" in ag.static_instruction
    assert not ag.instruction


def test_extrair_veredito_do_state_delta_rederiva_aprovacao():
    eventos = [{"content": {"parts": [{"text": "lixo"}]}},
               {"actions": {"state_delta": {"veredito_tom": {"justificativa": "ok", "nota": 3, "aprovado": False}}}}]
    v = extrair_veredito(eventos, limiar=3)
    assert v.nota == 3 and v.aprovado is True
    assert extrair_veredito(eventos, limiar=4).aprovado is False


def test_extrair_veredito_do_texto():
    eventos = [{"content": {"parts": [{"text": '{"justificativa": "alarmista", "nota": 1, "aprovado": true}'}]}}]
    v = extrair_veredito(eventos)
    assert v.nota == 1 and v.aprovado is False


def test_extrair_veredito_sem_resposta_falha():
    with pytest.raises(ValueError):
        extrair_veredito([{"content": {"parts": [{"text": "sem json"}]}}])
