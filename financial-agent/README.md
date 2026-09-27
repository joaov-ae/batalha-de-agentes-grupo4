# Financial Agent API 💰

API do Agente de Otimização Financeira para a Batalha de Agentes (Time 4 / Itaú).

O agente atua de forma consultiva e responsável, analisando a situação financeira do cliente através de regras determinísticas (via `data_manager`) e complementando com inteligência generativa (Google Gemini) protegida por guardrails de entrada e saída.

---

## 🏛️ Arquitetura e Fluxo

```mermaid
flowchart LR
    Client["App Cliente / Frontend"] -->|POST /analyze| Agent["Financial Agent API"]
    Agent -->|1. Status & Ritmo| DM["data-manager-itau"]
    Agent -->|2. Validação Semântica| GR["guardrails-itau"]
    Agent -->|3. Pergunta de Consentimento| Client
    Client -->|POST /savings (consent=true)| Agent
    Agent -->|Ajustes Determinísticos| DM
    Agent -->|Sugestões Seguras| Client
```

1. **`POST /analyze`**:
   - Consulta o perfil, fechamento e ritmo no `data-manager`.
   - Se houver risco de saldo negativo, alerta o usuário e pergunta se ele autoriza a busca por oportunidades de economia.
   - **Não** sugere cortes sem consentimento explícito.
   - Se o cliente já estiver no vermelho ou com recomendação de atendimento, direciona para suporte humano sem propor cortes.

2. **`POST /savings`**:
   - Requer consentimento afirmativo (`consent: true`).
   - Busca ajustes determinísticos autorizados (gastos discricionários e assinaturas redundantes) calculados pelo `data_manager`.
   - Valida a saída contra regras de proteção e guardrails.

3. **`POST /chat`**:
   - Canal conversacional com restrição estrita de escopo (orçamento, gastos discricionários).
   - Não menciona valores inventados, conselhos de investimento ou dados fora do contexto.

---

## 🛠️ Tecnologias

- **Python 3.12**
- **FastAPI** + **Uvicorn**
- **Google GenAI SDK** (`@google/genai` / Gemini 2.5 Flash)
- **Google Cloud BigQuery** (para análises históricas complementares)
- **Google Cloud Run** + **Cloud Build**

---

## 🚀 Como Rodar Localmente

### 1. Pré-requisitos
- Python 3.12+ instalado
- Chave de API do Google Gemini (`GEMINI_API_KEY`)

### 2. Configuração de Ambiente
```bash
# Clone e entre no diretório
cd financial-agent

# Crie e ative o ambiente virtual
python3 -m venv .venv
source .venv/bin/activate

# Instale as dependências
pip install -r requirements.txt

# Crie o arquivo .env
cp .env.example .env
# Preencha a GEMINI_API_KEY no .env
```

### 3. Executando a API
```bash
uvicorn api:app --reload --port 8080
```
A documentação interativa OpenAPI estará disponível em: `http://localhost:8080/docs`

---

## 🧪 Testes Unitários e Linting

```bash
# Executar a suíte de testes
python -m unittest discover -s tests

# Executar o linter (Ruff)
ruff check .
```

---

## 🚢 Deploy no Google Cloud Run

Consulte [DEPLOY.md](DEPLOY.md) para o passo a passo completo de build e publicação via Cloud Build e Cloud Run.
Para o roteiro detalhado de demonstração com os perfis sintéticos, consulte [DEMO_FLOW.md](DEMO_FLOW.md).
