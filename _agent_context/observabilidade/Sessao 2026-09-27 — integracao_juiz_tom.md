# Sessão 2026-09-27 — Integração do Juiz de Tom na Observabilidade

## Pedido
Incorporar o agente avaliador de tom e seus eventos na observabilidade, permitindo registrar intervenções de tom tanto vindas do guardrails quanto de chamadas diretas de auditoria.

## Decisões Técnicas
- **Fonte `juiz_tom`**: Adicionada a enumeração `Fonte.juiz_tom = "juiz_tom"` no catálogo de intervenções.
- **Catálogo de códigos**: Registrado `S10` (`tom_inadequado`) em `_GUARDRAILS` e `AG_TOM_INADEQUADO` em `_AGENTE`.
- **Endpoint `POST /v1/eventos/tom`**: Recebe `TomEvento` com texto, nota (1–5), indicação de aprovação, justificativa e latência. Se `aprovado=False`, insere automaticamente registro em `intervencoes` com `fonte="juiz_tom"`, `direcao="saida"`, `codigo="S10"`, `camada="juiz_tom"`.
- **Compatibilidade de schema BigQuery**: A tabela existente `intervencoes` acomoda nativamente os eventos com as colunas já modeladas (`fonte`, `camada`, `codigo`, `latencia_ms`).
- **Suíte de testes**: 36 testes passando (15 testes de dry-run do BigQuery pulados sem credenciais de nuvem).
