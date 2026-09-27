#!/usr/bin/env bash
# Deploy do itau-app (front end + BFF Express) no Cloud Run (projeto batalha-time-04-z85x).
#
# Duas formas de gerar a imagem:
#   BUILD=cloud (padrão): gcloud builds submit com cloudbuild.yaml
#   BUILD=local        : docker build + docker push (útil quando o Cloud Build não está disponível;
#                        rode antes `gcloud auth configure-docker us-central1-docker.pkg.dev`)
#
# A SA squad-agent-sa já tem roles/aiplatform.user (Gemini via Vertex AI) e roles/bigquery.jobUser
# (contatos Pix, saldo e extrato). Com a SA default do Compute o app funciona, mas cai nos dados de exemplo.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

PROJETO=${PROJETO:-batalha-time-04-z85x}
REGIAO=${REGIAO:-us-central1}
TAG=${TAG:-latest}
BUILD=${BUILD:-cloud}
IMAGEM=us-central1-docker.pkg.dev/${PROJETO}/agentes/itau-app:${TAG}
SA=${SA:-squad-agent-sa@batalha-time-04-z85x.iam.gserviceaccount.com}

# 1. Imagem
if [[ "${BUILD}" == "local" ]]; then
  docker build -t "${IMAGEM}" .
  docker push "${IMAGEM}"
else
  gcloud builds submit --project "${PROJETO}" --config cloudbuild.yaml --substitutions=_TAG="${TAG}" .
fi

# 2. Serviço (público: é o front end da demo)
gcloud run deploy itau-app --project "${PROJETO}" --region "${REGIAO}" \
  --image "${IMAGEM}" --service-account "${SA}" \
  --allow-unauthenticated

URL=$(gcloud run services describe itau-app --project "${PROJETO}" --region "${REGIAO}" --format 'value(status.url)')
echo "App: ${URL}"
