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
- Regras: ~0,2–1 ms por mensagem (teste de p95 < 10 ms).
- `gemini-2.5-flash-lite` (a partir do Brasil): 1ª chamada ~1,4 s (TLS + token); depois ~500–850 ms.
  `gemini-2.0-flash-lite` não está disponível no projeto (404).
- Cancelar a chamada no timeout derrubava a conexão e todas as seguintes estouravam. Correções: aquecer as
  conexões no `lifespan` e não cancelar a tarefa atrasada (termina em segundo plano). Timeout padrão
  ajustado de 800 para 1200 ms.
- Por isso a recomendação é o orquestrador chamar `/v1/entrada` **em paralelo** com a geração do LLM.

## Pendências
- Pedir `roles/aiplatform.user` e `roles/modelarmor.user` para `squad-agent-sa` e rodar `./deploy.sh`.
- Model Armor não testado ao vivo (template ainda não criado); mapeamento validado com objetos do SDK.
- Imagem Docker não buildada localmente (daemon parado); Dockerfile igual ao do data_manager.
- Integrar no agente (exemplo de código no README).
