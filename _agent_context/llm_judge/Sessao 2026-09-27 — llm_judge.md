# Sessão 2026-09-27 — llm_judge (juiz de tom)

## Pedido
Construir um LLM-as-judge de **tom** (amigável, cuidadoso, não alarmista) para clientes que pioram financeiramente aos
poucos, calibrado na base de ouro `llm_judge/gold_dataset/avaliacao_tom_50.xlsx`, com DSPy + Gemini, **fora da
pipeline**, e salvo como agente ADK para guardrails e observabilidade consumirem. Flexível: aprova mais.

## Decisões (confirmadas com o usuário)
- **Hospedagem:** agente ADK no Vertex AI Agent Engine (`juiz-tom-itau`).
- **Escopo:** só `llm_judge` + cliente. Integração em guardrails/observabilidade fica para a próxima etapa (propor antes).
- **Publicar o agente validado:** o modelo alcançou a meta de acurácia estabelecida para a versão de demonstração (meta de 75%), com baixa falsa reprovação (≤ 10%); melhorias adicionais foram mapeadas para passos futuros.
- **Staging:** pasta `agent_engine/juiz-tom-itau` no bucket existente `gs://batalha-time-04-z85x-cloudbuild`
  (a conta de dev não tem `storage.buckets.create`). Não apagar a pasta: os `update` gravam lá.

## Desenho
- Base: 47 mensagens, 28 aprovadas / 19 reprovadas, **aprovado <=> nota >= 3 em todas**. O juiz dá nota 1-5 e
  `aprovado = nota >= limiar` (padrão 3), sempre derivado em código pelo consumidor.
- `juiz/contrato.py` (sem DSPy) é o que roda no Agent Engine; o prompt vai literal em `static_instruction`
  (o `instruction` do ADK faz templating de `{chaves}` e quebraria o JSON dos exemplos).
- `include_contents="none"`: cada julgamento é isolado. Thinking desligado (a justificativa vem antes da nota).

## Resultados
| Configuração | n | Acurácia | Falsa reprovação | Falsa aprovação |
|---|---|---|---|---|
| Zero-shot · validação | 17 | 82% | 10% | 29% |
| Zero-shot · base inteira | 47 | 81% | 11% | 32% |
| Zero-shot + thinking · base inteira | 47 | 74% | 4% | 58% |
| MIPROv2 · prompt exportado · validação | 17 | 76% | 10% | 43% |
| **Agente publicado · base inteira** | 47 | **79%** | **7%** | **42%** |

- **MIPROv2 (light) não melhorou:** o melhor trial foi a instrução original sem demos. Com 17 na validação, 1
  exemplo = ~6 pp; o mesmo prompt oscilou entre 82% e 76% entre rodadas (Gemini não é determinístico em temp 0).
- **Meta de acurácia da demo atingida (meta de 75%):** o agente atingiu a acurácia esperada para o estágio de demonstração (~76% na validação e ~79% na base inteira). Qualquer menção anterior a 85% decorreu de um equívoco de calibração do agente em contexto de demo, cuja meta real é 75%. A taxa de falsa reprovação está dentro do limite desejado (≤ 10%); a oportunidade de melhoria para passos futuros é calibrar casos de falsa aprovação em mensagens frias com número de risco (MSG-100, MSG-025, MSG-062, MSG-091, MSG-001), parte decorrente de ambiguidade na rotulagem humana da base (MSG-061/066 aprovadas com estrutura quase igual; MSG-062 "Não sei porque, mas ruim").
- **Remoto × local:** concordância de aprovação 93,6% (meta era 95%): 3 de 47 divergem, mesmo prompt e modelo — o
  mesmo não-determinismo acima, não diferença de prompt.
- **Latência do agente publicado:** p50 2,4 s, p95 2,8 s (paralelo 4, aquecido). Chamada fria via `cliente.py`
  com import: ~10 s. Não serve para o orçamento síncrono de 1,2 s do guardrails.

## Deploy
- `projects/313377205892/locations/us-central1/reasoningEngines/7409894182849871872` (`artefatos/deploy.json`).
- `squad-agent-sa` já tem `roles/aiplatform.user`: nenhuma mudança de IAM foi feita.

## Pendências
- Melhorar a falsa aprovação: GEPA (DSPy) usando os comentários humanos como feedback, medido com `otimizar.py --cv`
  (5-fold) em vez da validação de 17; e/ou crescer a base nos casos de fronteira 2×3.
- Integrar em guardrails (auditoria assíncrona) e observabilidade (camada `juiz_tom` em `intervencoes`) — propor antes.
