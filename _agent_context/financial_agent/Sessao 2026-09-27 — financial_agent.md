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
