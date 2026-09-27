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

## 4. Observabilidade, Traces e Persistência em Background
- **Zero Latency Impact via BackgroundTasks**: Toda a ingestão na API de observabilidade (`/v1/eventos/conversas`, `/v1/eventos/mensagens`, `/v1/eventos/intervencoes`, `/v1/eventos/alertas`, `/v1/eventos/ajustes`, `/v1/eventos/tom`) é despachada via `BackgroundTasks` do FastAPI após o retorno da resposta HTTP.
- **Trace & Spans W3C**: Medição precisa de spans (`dm`, `gr_in`, `llm`, `gr_out`, `total`) exposta no cabeçalho padronizado `Server-Timing`.
- **Cabeçalhos de Correlação**: Propaga `X-Session-ID`, `X-Trace-ID` e `X-Conversa-ID` no response para rastreabilidade de ponta a ponta.
- **Cache de Token de Identidade GCP**: Cache de 50 minutos para tokens OIDC do Cloud Run, eliminando handshake repetitivo de IAM nas chamadas internas.

## 5. Persistência de Estado e Juiz de Tom
- **Memória de Sessão de Alto Desempenho (`SessionMemoryStore`)**: Armazenamento thread-safe (`threading.RLock`) em memória por sessão, retendo turnos de diálogo (`historico`), metadados e estado do cliente. Evita os ~2.8s de latência do wrapper remoto ADK enquanto alimenta o prompt do Gemini com contexto multi-turnos.
- **Guardrail Assíncrono com Pré-busca Concorrente**: Execução paralela via `asyncio.gather(check_input(...), snapshot_task)` reduz a latência percebida de validação de entrada a praticamente zero.
- **Tratamento de Respostas Perigosas vs. Tom**:
  - **Bloqueio / Risco Alto (`S05`, `S06`, `S08`, `S09`)**: Retorna imediatamente a resposta do guardrail (`resposta_sugerida` ou `texto_sanitizado`) sem reconsultar o LLM.
  - **Fora do Tom (`S10`)**: Reitera exatamente **uma vez** (`attempt = 2`) com instrução corretiva de tom no prompt. Caso a segunda tentativa ainda seja considerada fora do tom pelo guardrail, a resposta é entregue ao cliente sem travar o fluxo.

## 6. Testes e Qualidade
- Suíte completa de 44 testes automatizados em `financial-agent/tests/test_agent_finance.py` cobrindo fluxos síncronos e assíncronos, fallbacks de guardrail perigoso, reiteração única de tom, persistência de histórico e emissão de métricas.
- Testes 100% aprovados em `guardrails` (73 testes) e `observabilidade` (36 testes).

## 7. Blindagem de Produção e Demonstração
- **Vertex AI ADC no Cloud Run**: `vertex_ai_enabled()` detecta automaticamente o ambiente Cloud Run via `K_SERVICE` na ausência de chaves estáticas, utilizando a quota e autenticação da SA `squad-agent-sa` via Application Default Credentials (ADC).
- **Allowlist de Demonstração Expandida**: `DEFAULT_DEMO_USERS` inclui os perfis oficiais da demo:
  - `5865ce27-0681-4dcc-9475-3df9d15a6858` (Renata Lopes - app principal)
  - `139aae21-0535-4a19-bbf2-d2b8f0c7a0d8` (Maria - extrato real)
  - `d6c59567-c0e0-4966-ba09-883eb6d859e2` (Maria - projeção negativa)
- **Tolerância a Cold Start nos Guardrails**: Timeout ampliado para 6s (configurável via `GUARDRAILS_TIMEOUT_SECONDS`) para evitar erros 503 falsos na inicialização de containers frios.
- **Resiliência Local**: Clientes de guardrails, data_manager e observabilidade ignoram a busca de `id_token` do GCP quando conectados a URLs locais (`localhost` / `127.0.0.1`).
- **Deploy Automatizado**: Script [deploy.sh](file:///Users/joaovae/Documents/repositories/batalha-de-agentes-grupo4/financial-agent/deploy.sh) com injeção automática de `DATA_MANAGER_URL`, `GUARDRAILS_URL` e `OBSERVABILIDADE_URL`.
