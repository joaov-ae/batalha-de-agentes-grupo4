#!/usr/bin/env bash
# Deploy do observabilidade-itau no Cloud Run (projeto batalha-time-04-z85x).
#
# O SA de execução (squad-agent-sa) precisa de bigquery.jobUser no projeto, dataEditor no dataset
# observabilidade (seed e ingestão gravam) e dataViewer em data_manager (o seed lê status_cliente).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

PROJETO=${PROJETO:-batalha-time-04-z85x}
REGIAO=${REGIAO:-us-central1}
TAG=${TAG:-v1}
IMAGEM=us-central1-docker.pkg.dev/${PROJETO}/agentes/observabilidade-itau:${TAG}
SA=${SA:-squad-agent-sa@batalha-time-04-z85x.iam.gserviceaccount.com}
ALLOW_UNAUTHENTICATED=${ALLOW_UNAUTHENTICATED:-false}
RUN_SEED=${RUN_SEED:-false}
SA_INVOKER=${SA_INVOKER:-}   # SA de quem chama a API (agente/front), se autenticada

# 1. Dataset (idempotente)
bq --project_id=${PROJETO} show ${PROJETO}:observabilidade >/dev/null 2>&1 \
  || bq --project_id=${PROJETO} mk --location=${REGIAO} --dataset \
       --description "Observabilidade do Agente Otimizador (base simulada + eventos)" ${PROJETO}:observabilidade

# 2. Imagem
gcloud builds submit --project ${PROJETO} --config cloudbuild.yaml --substitutions=_TAG=${TAG} .

# 3. Job do seed (recria as tabelas com WRITE_TRUNCATE: apaga eventos ingeridos. Só rode enquanto simulado.)
gcloud run jobs deploy obs-seed --project ${PROJETO} --region ${REGIAO} \
  --image ${IMAGEM} --service-account ${SA} \
  --command python --args=-m,seed.gerar \
  --memory 1Gi --task-timeout 900 --max-retries 0

if [[ "${RUN_SEED}" == "true" ]]; then
  echo "Executando o seed da base simulada..."
  gcloud run jobs execute obs-seed --project ${PROJETO} --region ${REGIAO} --wait
fi

# 4. API (stateless: o cache é só otimização, pode escalar)
AUTH_FLAG="--no-allow-unauthenticated"
if [[ "${ALLOW_UNAUTHENTICATED}" == "true" ]]; then
  AUTH_FLAG="--allow-unauthenticated"
fi

gcloud run deploy observabilidade-itau --project ${PROJETO} --region ${REGIAO} \
  --image ${IMAGEM} --service-account ${SA} \
  ${AUTH_FLAG} --min-instances 0 --max-instances 3 --memory 512Mi

# 5. Quem pode chamar a API (se não for pública)
if [[ -n "${SA_INVOKER}" && "${ALLOW_UNAUTHENTICATED}" != "true" ]]; then
  gcloud run services add-iam-policy-binding observabilidade-itau --project ${PROJETO} --region ${REGIAO} \
    --member serviceAccount:${SA_INVOKER} --role roles/run.invoker
fi

URL=$(gcloud run services describe observabilidade-itau --project ${PROJETO} --region ${REGIAO} --format 'value(status.url)')
echo "API: ${URL}   OpenAPI: ${URL}/openapi.json"
