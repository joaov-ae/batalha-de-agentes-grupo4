# llm_judge — juiz de tom (LLM-as-judge)

Julga se uma mensagem do Agente Otimizador ao cliente tem o tom certo para quem está, aos poucos, piorando
financeiramente: **amigável, cuidadoso e não alarmista**. Devolve uma nota de 1 a 5 e `aprovado = nota >= 3`.
O juiz é **flexível**: barra só o tom realmente ruim (alarmista, autoritário, que culpa, que insiste depois de uma
recusa, que empurra crédito).

Não entra na pipeline síncrona: é para **observabilidade** (auditoria em lote/assíncrona) e para o **guardrails**
consumir fora do caminho crítico. Publicado como agente **ADK** no **Vertex AI Agent Engine** (`juiz-tom-itau`).

## Como foi calibrado
- Base de ouro: `gold_dataset/avaliacao_tom_50.xlsx` — 47 mensagens rotuladas por humano (28 aprovadas, 19
  reprovadas; `aprovado <=> nota >= 3` em todas).
- `otimizar.py`: baseline zero-shot → **DSPy MIPROv2** (Gemini 2.5 Flash julga, Gemini 2.5 Pro propõe instruções)
  no treino (~30) → avaliação na validação (~17) separada. `--cv` roda validação cruzada 5-fold.
- Métrica: acerto da aprovação (70%) + proximidade da nota (30%); **reprovar mensagem boa custa mais** que aprovar
  mensagem ruim.
- Resultado em [`artefatos/relatorio.md`](artefatos/relatorio.md).

## Estrutura
| Caminho | O quê |
|---|---|
| `juiz/contrato.py` | `VereditoTom` (justificativa, nota, aprovado) e critérios — sem DSPy, copiável |
| `juiz/prompt.py` | prompt agnóstico: `artefatos/juiz_tom_prompt.json` → instrução de sistema |
| `juiz/direto.py` | juiz chamando o Gemini direto (google-genai) — referência para reescrever sem ADK |
| `juiz/assinatura.py`, `juiz/metrica.py`, `juiz/dataset.py` | DSPy: assinatura, métrica, base e splits |
| `juiz_tom/agent.py` | agente ADK (`root_agent`) |
| `deploy_agent_engine.py` | publica/atualiza no Agent Engine → `artefatos/deploy.json` |
| `cliente.py` | `ClienteJuizTom().julgar(mensagem, cenario)` → `VereditoTom` |
| `avaliar_remoto.py` | base de ouro contra o agente publicado: métricas, concordância e latência |

## Uso
```bash
export GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/adc-batalha.json   # ou ADC do SA no Cloud Run
uv sync
uv run pytest                          # testes sem rede
uv run python otimizar.py [--cv]       # re-calibra (rode de novo quando a base crescer)
uv run adk run juiz_tom                # conversa local com o agente (GOOGLE_GENAI_USE_VERTEXAI=true)
uv run python deploy_agent_engine.py   # publica; se já existir deploy.json, atualiza
uv run python avaliar_remoto.py        # valida o agente publicado
uv run python cliente.py "Esse Pix de R$ 600 ..." "M2 Pix que deixa a conta negativa"
```

## Consumindo (guardrails / observabilidade)
```python
from cliente import ClienteJuizTom
juiz = ClienteJuizTom()   # resource_name de artefatos/deploy.json ou JUIZ_RESOURCE_NAME
v = await juiz.julgar(texto, cenario="M1 salário caiu · vai faltar")
v.nota, v.aprovado, v.justificativa
```
- IAM: quem chama precisa de `roles/aiplatform.user` (a `squad-agent-sa` já tem).
- Latência de segundos: use em background ou em lote, nunca no orçamento de 1,2 s do guardrails.
- Sem ADK: use `juiz/direto.py` + `artefatos/juiz_tom_prompt.json` (mesmo prompt, mesmo schema).
- O consumidor sempre re-deriva `aprovado` da nota com o seu limiar (`JUIZ_LIMIAR_APROVACAO`, padrão 3).

## Configuração (`JUIZ_*`)
`JUIZ_PROJETO`, `JUIZ_REGIAO`, `JUIZ_MODELO_JUIZ` (gemini-2.5-flash), `JUIZ_MODELO_PROMPT` (gemini-2.5-pro),
`JUIZ_LIMIAR_APROVACAO` (3), `JUIZ_PENSAR` (false), `JUIZ_STAGING_BUCKET` (bucket do Cloud Build) + `JUIZ_STAGING_PASTA` (`agent_engine/juiz-tom-itau`), `JUIZ_RESOURCE_NAME`.
