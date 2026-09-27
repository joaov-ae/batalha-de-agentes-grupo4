# 🏆 Batalha de Agentes Itaú — Grupo 4
## Agente Otimizador Financeiro & Prevenção ao Superendividamento

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![Google Cloud Run](https://img.shields.io/badge/Google_Cloud_Run-Deployed-4285F4.svg)](https://cloud.google.com/run)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_%2F_3.8_Flash-8E75C2.svg)](https://deepmind.google/technologies/gemini/)
[![Vertex AI](https://img.shields.io/badge/Vertex_AI-Agent_Engine_%2B_ADC-34A853.svg)](https://cloud.google.com/vertex-ai)

Solução desenvolvida pelo **Grupo 4** para o Hackathon Batalha de Agentes Itaú. O sistema atua como um parceiro financeiro proativo e empático no aplicativo Itaú, identificando tendências de erosão de saldo e propondo ajustes viáveis em gastos não essenciais **antes** que o cliente entre no cheque especial ou no rotativo do cartão.

---

## 🏛️ Arquitetura do Ecossistema

O projeto é estruturado em microsserviços desacoplados e distribuídos no **Google Cloud Run**, governados por princípios estritos de segurança bancária (*Zero Trust*, isolamento de quotas e desacoplamento matemático):

```mermaid
flowchart TD
    subgraph Cliente ["Canal do Usuário"]
        App["📱 Itaú App (React + Vite)\nTema Personnalité"]
        BFF["⚙️ BFF Express (server.ts)\nCloud Run: itau-app"]
        App -->|/api/*| BFF
    end

    subgraph Orquestracao ["Orquestração Inteligente"]
        Agent["🤖 Financial Agent\nFastAPI • Cloud Run"]
        BFF -->|POST /chat (com fallback)| Agent
    end

    subgraph Seguranca ["Governança & Segurança"]
        Guard["🛡️ Guardrails + Juiz de Tom (S10)\nFastAPI • Cloud Run\nRegras <1ms + Vertex AI ~900ms"]
        Judge["⚖️ LLM Judge (DSPy)\nVertex AI Agent Engine"]
        Agent -->|POST /v1/entrada\nPOST /v1/saida| Guard
        Guard -.->|Calibração & Auditoria| Judge
    end

    subgraph Dados ["Inteligência Determinística"]
        DM["📊 Data Manager\nFastAPI • Cloud Run"]
        BQ_Data[("🗄️ BigQuery\nhackathon_dados")]
        Agent -->|GET /status, /ritmo, /ajustes| DM
        BFF -->|GET /status, /compromissos| DM
        DM -->|Consultas Parametrizadas| BQ_Data
    end

    subgraph Auditoria ["Observabilidade Contínua"]
        Obs["📈 Observabilidade API\nFastAPI • Cloud Run"]
        BQ_Obs[("📊 BigQuery\nDataset observabilidade\n8 Tabelas + Views A/B")]
        Obs --> BQ_Obs
        Guard -.->|POST /v1/eventos/tom| Obs
        Agent -.->|Traces e Logs| Obs
    end
```

---

## 🌐 Serviços em Produção (Cloud Run — `us-central1`)

| Serviço | Diretório | Visibilidade | URL Oficial | Responsabilidade |
| :--- | :--- | :---: | :--- | :--- |
| **`itau-app`** | [`itau_app/`](itau_app/) | **Público** | [`https://itau-app-313377205892.us-central1.run.app`](https://itau-app-313377205892.us-central1.run.app) | Front-end mobile simulado (React + Tailwind) e BFF Express com Vertex AI. |
| **`financial-agent`** | [`financial-agent/`](financial-agent/) | Privado (IAM) | `https://financial-agent-313377205892.us-central1.run.app` | Orquestrador de diálogo financeiro, geração de planos de economia e fail-closed. |
| **`guardrails-itau`** | [`guardrails/`](guardrails/) | Privado (IAM) | `https://guardrails-itau-313377205892.us-central1.run.app` | Filtro léxico/semântico contra jailbreaks, vazamento de PII e avaliação de tom (`S10`). |
| **`data-manager-itau`** | [`data_manager/`](data_manager/) | Privado (IAM) | `https://data-manager-itau-313377205892.us-central1.run.app` | Matemática determinística: projeção de fluxo de caixa, ritmo de gastos e simulações. |
| **`observabilidade-itau`** | [`observabilidade/`](observabilidade/) | Privado (IAM) | `https://observabilidade-itau-313377205892.us-central1.run.app` | Ingestão e consultas analíticas de métricas, like rate e impacto A/B no BigQuery. |
| **`juiz-tom-itau`** | [`llm_judge/`](llm_judge/) | Privado (IAM) | Vertex AI Reasoning Engine `7409894182849871872` | Juiz de empatia e tom não-alarmista calibrado com DSPy sobre base ouro. |

---

## 💎 Pilares de Engenharia e Boas Práticas Bancárias

1. **Desacoplamento Matemático Estrito (*Zero Alucinação*)**:
   - Modelos de linguagem (LLMs) **nunca executam cálculos matemáticos**, não definem saldos e não calculam juros.
   - Toda lógica contábil é processada deterministicamente no `data_manager` via consultas analíticas no BigQuery. O `financial-agent` atua exclusivamente na tradução empática e humana dos dados.

2. **Arquitetura de Segurança Fail-Closed**:
   - Em caso de indisponibilidade ou falha do serviço de Guardrails, o agente financeiro bloqueia a entrega de respostas não validadas, retornando `HTTP 503`. Segurança e conformidade regulatória sempre precedem a disponibilidade.

3. **Autenticação Zero-Trust via IAM**:
   - Nenhuma chave estática ou senha trafega entre os microsserviços. Toda chamada interna utiliza tokens OIDC de curta duração emitidos pela infraestrutura Google Cloud com a Service Account `squad-agent-sa` (`roles/run.invoker`).

4. **Rastreabilidade Ponta a Ponta**:
   - Todos os endpoints aceitam e propagam identificadores unificados `session_id` e `trace_id` nos corpos e cabeçalhos HTTP (`X-Session-ID`, `X-Trace-ID`), expostos via CORS para auditoria completa de ponta a ponta.

---

## 🎯 Roteiro da Demonstração (Demo Script)

Para apresentar a solução à banca avaliadora, siga o fluxo integrado:

1. **Acesso ao Aplicativo**:
   - Acesse [`itau-app`](https://itau-app-313377205892.us-central1.run.app) no navegador.
   - Observe a persona real da base carregada: **Renata Lopes** (`5865ce27-0681-4dcc-9475-3df9d15a6858`), cliente Personnalité com renda de R$ 8.058,12 e saldo de R$ 2.794,30.

2. **Aviso Proativo no Dia do Salário ("Bora ver o mês?")**:
   - Clique no card flutuante de notificação na Home.
   - O sistema demonstra que, apesar do salário recente, 80,9% da renda está comprometida com custos fixos e a conta fechará com apenas **R$ 107,45 de margem** no dia 07/01.

3. **Plano de Ajustes em 1 Toque**:
   - O assistente sugere:
     1. Revisão de streamings duplicados.
     2. Reagendamento de um Pix de **R$ 191,36** para a data do próximo crédito de salário.
   - O impacto é recalculado deterministicamente pelo `data_manager`, aumentando a folga do cliente.

4. **Chat Consultivo Ia.i**:
   - Abra a conversa e pergunte: *"Como estão meus gastos esse mês?"*.
   - A resposta sintetiza o diagnóstico do orçamento sem alucinar valores e sem recomendar investimentos indevidos para perfis sem margem.

5. **Guardrails de Proteção Pix**:
   - Simule uma transferência Pix com valor elevado (ex: R$ 3.000).
   - O guardrail integrado avisa preventivamente que a transferência consumirá o limite da conta (cheque especial), evitando a entrada inadvertida no vermelho.

---

## 📊 Business Case e Storytelling Executivo

O diretório [`pitch_analytics/`](pitch_analytics/) contém o estudo de impacto com dados reais de 2025:
* **A "Catraca Sem Volta"**: Clientes que entram no cheque especial apresentam 97,7% de taxa de reincidência, com saldo médio caindo de -R$ 1,3k para -R$ 5,1k em 7 meses.
* **Janela de Ouro**: Há uma janela de 45 a 60 dias entre a erosão silenciosa de saldo e a inadimplência, onde a intervenção preventiva do agente gera o maior retorno.
* **Ganhos para o Banco**: Redução expressiva de Provisão para Devedores Duvidosos (PDD), preservação da principalidade bancária do cliente e redução de churn para bancos digitais.
* Visualize os relatórios executivos em [`pitch_storytelling_executivo.pdf`](pitch_analytics/pitch_storytelling_executivo.pdf).

---

## 🧪 Testes e Verificação

Para validar localmente as suítes de testes automatizados de todos os serviços:

```bash
# 1. Financial Agent (40 testes unitários + linting)
python3 -m unittest discover -s financial-agent/tests
ruff check financial-agent/

# 2. Guardrails (73 testes unitários e de integração)
cd guardrails && uv run pytest

# 3. Observabilidade (36 testes unitários e de schemas)
cd observabilidade && uv run pytest

# 4. LLM Judge (testes de concordância e acurácia)
cd llm_judge && uv run pytest
```

---

**Grupo 4 — Batalha de Agentes Itaú 2026**
