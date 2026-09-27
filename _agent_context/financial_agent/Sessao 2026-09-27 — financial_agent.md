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
- Suíte de testes automatizados com 40 testes cobrindo todos os fluxos críticos, guardrails, fallbacks, usuários de demonstração e inicialização ADC.
- Totalmente compatível com execução na raiz do monorepo e dentro do diretório `financial-agent/`.
- Verificado e 100% aprovado com Ruff linter e formatação isort padronizada (`pyproject.toml`).

## 6. Blindagem de Produção e Demonstração
- **Vertex AI ADC no Cloud Run**: `vertex_ai_enabled()` detecta automaticamente o ambiente Cloud Run via `K_SERVICE` na ausência de chaves estáticas, utilizando a quota e autenticação da SA `squad-agent-sa` via Application Default Credentials (ADC).
- **Allowlist de Demonstração Expandida**: `DEFAULT_DEMO_USERS` inclui os perfis oficiais da demo:
  - `5865ce27-0681-4dcc-9475-3df9d15a6858` (Renata Lopes - app principal)
  - `139aae21-0535-4a19-bbf2-d2b8f0c7a0d8` (Maria - extrato real)
  - `d6c59567-c0e0-4966-ba09-883eb6d859e2` (Maria - projeção negativa)
- **Tolerância a Cold Start nos Guardrails**: Timeout ampliado para 6s (configurável via `GUARDRAILS_TIMEOUT_SECONDS`) para evitar erros 503 falsos na inicialização de containers frios.
- **Resiliência Local**: Clientes de guardrails e data_manager ignoram a busca de `id_token` do GCP quando conectados a URLs locais (`localhost` / `127.0.0.1`).
