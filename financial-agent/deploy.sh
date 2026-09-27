#!/usr/bin/env bash
# Deploy do financial-agent no Cloud Run (projeto batalha-time-04-z85x).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

PROJETO=${PROJETO:-batalha-time-04-z85x}
REGIAO=${REGIAO:-us-central1}
TAG=${TAG:-latest}
BUILD=${BUILD:-cloud}
IMAGEM=us-central1-docker.pkg.dev/${PROJETO}/agentes/financial-agent:${TAG}
SA=${SA:-squad-agent-sa@batalha-time-04-z85x.iam.gserviceaccount.com}
DATA_MANAGER_URL=${DATA_MANAGER_URL:-https://data-manager-itau-zqj7scngrq-uc.a.run.app}
GUARDRAILS_URL=${GUARDRAILS_URL:-https://guardrails-itau-zqj7scngrq-uc.a.run.app}
OBSERVABILIDADE_URL=${OBSERVABILIDADE_URL:-https://observabilidade-itau-zqj7scngrq-uc.a.run.app}

# 1. Build da imagem
if [[ "${BUILD}" == "local" ]]; then
  docker build -t "${IMAGEM}" .
  docker push "${IMAGEM}"
else
  gcloud builds submit --project "${PROJETO}" --config cloudbuild.yaml --substitutions=_IMAGE="${IMAGEM}" .
fi

# 2. Deploy no Cloud Run (privado: invocável pelo squad-agent-sa)
gcloud run deploy financial-agent --project "${PROJETO}" --region "${REGIAO}" \
  --image "${IMAGEM}" --service-account "${SA}" \
  --no-allow-unauthenticated \
  --memory=512Mi --cpu=1 --timeout=120s \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJETO},DATA_MANAGER_URL=${DATA_MANAGER_URL},GUARDRAILS_URL=${GUARDRAILS_URL},OBSERVABILIDADE_URL=${OBSERVABILIDADE_URL},DEMO_MODE=true,DEMO_ACCESS_TOKEN=demo-hackathon-key" \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest"

URL=$(gcloud run services describe financial-agent --project "${PROJETO}" --region "${REGIAO}" --format 'value(status.url)')
echo "Financial Agent deployed: ${URL}"
