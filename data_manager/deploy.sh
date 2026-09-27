#!/usr/bin/env bash
# Deploy do data_manager_itau no Cloud Run (projeto batalha-time-04-z85x).
#
# PRÉ-REQUISITO (bloqueio atual): o SA de execução precisa ler/escrever no BigQuery.
# O único SA do projeto é o default do Compute, que hoje só tem artifactregistry.writer, logging.logWriter
# e storage.admin. Nossa conta não pode alterar IAM de projeto, então peça à organização:
#   roles/bigquery.jobUser       no projeto
#   roles/bigquery.dataViewer    no dataset hackathon_dados (a fonte)
#   roles/bigquery.dataEditor    no dataset data_manager    (só o JOB do pipeline escreve; a API só lê)
#   roles/run.developer          (só se for usar POST /admin/pipeline a partir da API)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

PROJETO=${PROJETO:-batalha-time-04-z85x}
REGIAO=${REGIAO:-us-central1}
TAG=${TAG:-v1}
IMAGEM=us-central1-docker.pkg.dev/${PROJETO}/agentes/data-manager-itau:${TAG}
# Usa a Service Account dedicada criada no projeto com papéis de BigQuery (admin/jobUser) e logging:
SA=${SA:-squad-agent-sa@batalha-time-04-z85x.iam.gserviceaccount.com}
DATA_REFERENCIA=${DATA_REFERENCIA:-2025-12-15}
ALLOW_UNAUTHENTICATED=${ALLOW_UNAUTHENTICATED:-false}
RUN_PIPELINE=${RUN_PIPELINE:-false}
SA_AGENTE=${SA_AGENTE:-}   # SA do serviço do agente que vai chamar a API (se autenticado)

# 1. Dataset de serving (idempotente)
bq --project_id=${PROJETO} show ${PROJETO}:data_manager >/dev/null 2>&1 \
  || bq --project_id=${PROJETO} mk --location=${REGIAO} --dataset ${PROJETO}:data_manager

# 2. Imagem
gcloud builds submit --project ${PROJETO} --config cloudbuild.yaml --substitutions=_TAG=${TAG} .

# 3. Job do pipeline (opcional, só executa se RUN_PIPELINE=true; a base já está pré-calculada)
gcloud run jobs deploy dm-pipeline --project ${PROJETO} --region ${REGIAO} \
  --image ${IMAGEM} --service-account ${SA} \
  --command python --args=-m,pipeline.run \
  --set-env-vars DATA_REFERENCIA=${DATA_REFERENCIA} \
  --memory 1Gi --task-timeout 900 --max-retries 0

if [[ "${RUN_PIPELINE}" == "true" ]]; then
  echo "Executando o job do pipeline no Cloud Run..."
  gcloud run jobs execute dm-pipeline --project ${PROJETO} --region ${REGIAO} --wait
fi

# 4. API. max-instances=1: a memória do cliente vive no processo (a API não grava no BigQuery).
#    min-instances=1: mantém o cache (status + features) aquecido.
AUTH_FLAG="--no-allow-unauthenticated"
if [[ "${ALLOW_UNAUTHENTICATED}" == "true" ]]; then
  AUTH_FLAG="--allow-unauthenticated"
fi

gcloud run deploy data-manager-itau --project ${PROJETO} --region ${REGIAO} \
  --image ${IMAGEM} --service-account ${SA} \
  ${AUTH_FLAG} --min-instances 1 --max-instances 1 --memory 1Gi \
  --set-env-vars DATA_REFERENCIA=${DATA_REFERENCIA}

# 5. Quem pode chamar a API (se não for pública): o SA do agente
if [[ -n "${SA_AGENTE}" && "${ALLOW_UNAUTHENTICATED}" != "true" ]]; then
  gcloud run services add-iam-policy-binding data-manager-itau --project ${PROJETO} --region ${REGIAO} \
    --member serviceAccount:${SA_AGENTE} --role roles/run.invoker
fi

URL=$(gcloud run services describe data-manager-itau --project ${PROJETO} --region ${REGIAO} --format 'value(status.url)')
echo "API: ${URL}   OpenAPI (contrato das tools): ${URL}/openapi.json"
