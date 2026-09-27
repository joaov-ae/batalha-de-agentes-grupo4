#!/usr/bin/env bash
# Deploy do guardrails_itau no Cloud Run (projeto batalha-time-04-z85x).
#
# PRÉ-REQUISITO: o SA de execução precisa chamar o Gemini e o Model Armor:
#   roles/aiplatform.user     no projeto (Gemini na Vertex AI)
#   roles/modelarmor.user     no projeto (sanitizeUserPrompt / sanitizeModelResponse)
# Sem esses papéis o serviço sobe e responde só com as regras determinísticas (fail-open, degradado=true).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

PROJETO=${PROJETO:-batalha-time-04-z85x}
REGIAO=${REGIAO:-us-central1}
TAG=${TAG:-v1}
IMAGEM=us-central1-docker.pkg.dev/${PROJETO}/agentes/guardrails-itau:${TAG}
SA=${SA:-squad-agent-sa@batalha-time-04-z85x.iam.gserviceaccount.com}
TEMPLATE=${TEMPLATE:-guardrails-itau}
TIMEOUT_SEMANTICO_MS=${TIMEOUT_SEMANTICO_MS:-1200}
ALLOW_UNAUTHENTICATED=${ALLOW_UNAUTHENTICATED:-false}
SA_AGENTE=${SA_AGENTE:-}   # SA do serviço do agente que vai chamar a API (se autenticado)

# 1. Imagem
gcloud builds submit --project ${PROJETO} --config cloudbuild.yaml --substitutions=_TAG=${TAG} .

# 2. API. Stateless (só cache local), então pode escalar.
#    min-instances=1 + cpu-boost: sem cold start; o aquecimento das conexões com Gemini
#    acontece na subida, não na primeira mensagem de um cliente.
AUTH_FLAG="--no-allow-unauthenticated"
if [[ "${ALLOW_UNAUTHENTICATED}" == "true" ]]; then
  AUTH_FLAG="--allow-unauthenticated"
fi

gcloud run deploy guardrails-itau --project ${PROJETO} --region ${REGIAO} \
  --image ${IMAGEM} --service-account ${SA} \
  ${AUTH_FLAG} --min-instances 1 --max-instances 3 --cpu-boost --memory 512Mi --concurrency 80 \
  --set-env-vars PROJETO=${PROJETO},REGIAO=${REGIAO},MODEL_ARMOR_HABILITADO=false,TIMEOUT_SEMANTICO_MS=${TIMEOUT_SEMANTICO_MS}

# 4. Quem pode chamar a API (se não for pública): o SA do agente
if [[ -n "${SA_AGENTE}" && "${ALLOW_UNAUTHENTICATED}" != "true" ]]; then
  gcloud run services add-iam-policy-binding guardrails-itau --project ${PROJETO} --region ${REGIAO} \
    --member serviceAccount:${SA_AGENTE} --role roles/run.invoker
fi

URL=$(gcloud run services describe guardrails-itau --project ${PROJETO} --region ${REGIAO} --format 'value(status.url)')
echo "API: ${URL}   OpenAPI: ${URL}/openapi.json   Catálogo: ${URL}/v1/catalogo"
