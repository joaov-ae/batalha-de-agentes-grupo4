# Sessão 2026-09-27 — Financial Agent (Agente Otimizador Financeiro)

## 1. Visão Geral do Serviço
O `financial-agent` é a API de recomendação e otimização financeira do Grupo 4. Ele consome dados determinísticos do `data_manager` e protege toda a comunicação através dos `guardrails`.

- **Linguagem / Framework**: Python 3.12 / FastAPI / Uvicorn
- **LLM**: Google Gemini 2.5 Flash via `@google/genai`
- **Ambiente de Nuvem**: Google Cloud Run (`financial-agent`), build via Cloud Build

## 2. Endpoints Principais
- `POST /analyze`:
  - Entrada: `{ "user_id": "<uuid>" }`
  - Consulta `data_manager` (`/v1/clientes/{id}/status` e `/ritmo`).
  - Identifica risco de fechamento negativo ou superávit.
  - Se houver risco, solicita consentimento do cliente para buscar oportunidades; não sugere cortes de imediato.
  - Se o status for `ja_no_buraco` ou `encaminhar_atendimento`, encaminha para atendimento humano.
- `POST /savings`:
  - Entrada: `{ "user_id": "<uuid>", "consent": true }`
  - Requer consentimento explícito.
  - Consulta ajustes determinísticos do `data_manager` (`/ajustes/discricionarios` e `/ajustes/assinaturas`).
  - Formata e protege as sugestões de economia (ex: assinaturas redundantes, cortes graduais de 15%).
- `POST /chat`:
  - Chat seguro restrito ao escopo de finanças pessoais e organização de orçamento.
  - Fail-closed com guardrails de entrada e saída.

## 3. Segurança e Guardrails
- **Guardrail de Entrada**: Valida mensagens e intenções contra jailbreaks, comandos maliciosos e perguntas fora de escopo.
- **Guardrail de Saída**: Valida respostas antes de devolver ao cliente. Se houver violação, a resposta é bloqueada ou higienizada sem expor termos protegidos.
- **Fail-Closed**: Se o serviço de guardrails estiver indisponível no `/analyze` (saída) ou no `/chat`, a API devolve HTTP 503 para garantir conformidade e segurança bancária.

## 4. Observabilidade e Propagação de Traces
- **Trace / Session ID**: Suporta `session_id` no corpo do payload JSON e cabeçalhos HTTP `X-Session-ID` / `X-Trace-ID`.
- **Geração Automática**: Quando não informado, gera automaticamente um UUID v4.
- **Propagação**: Repassa o `session_id` nos headers de resposta (`Access-Control-Expose-Headers`), nas chamadas HTTP para o serviço de guardrails e nos logs estruturados de auditoria (`session_id=...`).

## 5. Testes e Qualidade
- Suíte de testes automatizados com 37 testes cobrindo todos os fluxos críticos, guardrails, fallbacks e propagação de rastreamento.
- Totalmente compatível com execução na raiz do monorepo e dentro do diretório `financial-agent/`.
- Verificado e aprovado com Ruff linter.
