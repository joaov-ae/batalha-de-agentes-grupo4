# Sessão 2026-09-26 — guardrails_itau

## Pedido
Criar o serviço de guardrails (entrada e saída) do Agente Otimizador, cobrindo os ataques do slide
"O que é nocivo?" (screenshots nesta pasta), com respostas pré-estabelecidas para o agente, sem atrasar a
requisição e rodando no Cloud Run como o `data_manager`.

## Decisões (confirmadas com o usuário)
- **Detecção híbrida**: regras determinísticas sempre + Gemini Flash-Lite e Model Armor em paralelo.
- **Fail-open**: se a camada semântica falhar/estourar o tempo, vale o veredito das regras (`degradado=true`).
- **Integração por HTTP pelo orquestrador** (callbacks antes/depois do modelo), não como tool do LLM.

## O que foi feito
- `guardrails/` com FastAPI: `POST /v1/entrada`, `POST /v1/saida`, `GET /v1/catalogo`, `/health`.
- Catálogo `app/catalogo.py`: E01–E10 (entrada) e S01–S09 (saída), cada um com decisão
  (`permitir`, `permitir_com_instrucao`, `mascarar`, `reescrever`, `bloquear`), `instrucao_agente` e
  `resposta_sugerida`.
- Regras em `app/regras/` sobre texto normalizado (leetspeak, zero-width, letras espaçadas). Sinais
  ambíguos viram `suspeitas` e só bloqueiam se a camada semântica confirmar.
- S07: valores em R$ da resposta conferidos contra `contexto_tools` (regra "o LLM só redige").
- `deploy.sh` cria o template do Model Armor e sobe `guardrails-itau` autenticado.

## Medições
- Regras: ~0,1–0,7 ms por mensagem (p95 < 10 ms).
- `gemini-2.5-flash-lite`: ~450–750 ms (Vertex AI `us-central1`).
- Model Armor: dispensado devido a restrições de permissões IAM no projeto GCP; filtros de conteúdo nocivo (E10/S09) absorvidos pelo Gemini.
- Serviço Cloud Run (`guardrails-itau`): publicado em `https://guardrails-itau-zqj7scngrq-uc.a.run.app` com autenticação obrigatória via `squad-agent-sa`.
- Comparativo com agente (`financial-agent`): agente leva 500 ms a 42 s por resposta; o guardrail de entrada em paralelo custa ~0 ms percebidos e o de saída em modo suspeito custa < 1 ms.

## Concluído
- Imagem Docker buildada e deployed com sucesso via Cloud Build / Cloud Run.
- Permissão `roles/run.invoker` concedida à SA `squad-agent-sa`.
- Testes ponta a ponta executados e validados contra os serviços ao vivo no Cloud Run.
- 72 testes unitários e de integração passando localmente.
