# Deploy do agente no Google Cloud Run

Para executar a demonstração ponta a ponta pela API, siga [DEMO_FLOW.md](DEMO_FLOW.md). Este documento cobre deploy, configuração e prontidão de produção.

O agente é uma API privada, sem frontend próprio. Um consumidor autorizado chama `POST /analyze` com o UUID do usuário. A API consulta primeiro `/status` do `data-manager-itau`, usa `/ritmo` para contextualizar a tendência e devolve a classificação determinística do serviço. Se houver risco, pergunta se a pessoa quer ver ajustes; não sugere cortes nessa primeira resposta.

Depois de um consentimento afirmativo, o app chama `POST /savings` com `{ "user_id": "...", "consent": true }`. A API consulta `/ajustes/discricionarios` e `/ajustes/assinaturas` no data_manager e apresenta somente os ajustes determinísticos devolvidos pelo serviço. Não pede ao Gemini para calcular valores. Se o data_manager indicar `encaminhar_atendimento=true` ou `ja_no_buraco`, não oferece cortes e encaminha para atendimento humano.

Como esta é uma demonstração, o `data-manager-itau` usa a data de referência configurada no próprio serviço (atualmente `2025-12-15`). As respostas incluem `modo_demo` e a data retornada pelo serviço; não apresente essa previsão como dado atual.

O serviço fica privado no Cloud Run (`--no-allow-unauthenticated`). O backend do app invoca a API com identidade IAM no cabeçalho `Authorization` e encaminha o Firebase ID token da sessão do usuário em `X-Firebase-ID-Token`. Em modo de produção (`DEMO_MODE=false`), a API valida a assinatura/revogação do token e exige o custom claim Firebase `financial_user_id` igual ao `user_id` solicitado. O backend confiável deve atribuir esse claim a partir do vínculo verificado da conta com o ID de cliente usado pelo data_manager; o app não pode escolher o claim. Nunca exponha credencial de service account no navegador.

O Firebase Admin não define esse vínculo sozinho: o backend de cadastro/login precisa atribuir `financial_user_id` via Firebase Admin depois de verificar a conta e sua associação com o perfil financeiro. Se ainda não existe esse fluxo de identidade no app, mantenha a demo sintética e não mude `DEMO_MODE` para falso até o mapeamento estar configurado.

## Identidade do runtime

O runtime atual da demo ainda usa `squad-agent-sa`, que tem `roles/bigquery.admin` e outros papéis de projeto. A conta de deploy não tem `iam.serviceAccounts.create`, então não foi possível trocá-la sem um administrador. Como o agente agora consulta dados somente pelo `data-manager-itau`, sua conta dedicada precisa apenas de `roles/run.invoker` no serviço data_manager e `roles/secretmanager.secretAccessor` no segredo Gemini; não precisa de BigQuery IAM:

```bash
PROJECT_ID="batalha-time-04-z85x"
RUNTIME_SA="financial-agent-runtime@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create financial-agent-runtime --project "$PROJECT_ID"
gcloud run services add-iam-policy-binding data-manager-itau --project "$PROJECT_ID" \
  --region us-central1 --member="serviceAccount:${RUNTIME_SA}" --role="roles/run.invoker"
gcloud secrets add-iam-policy-binding gemini-api-key --project "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" --role="roles/secretmanager.secretAccessor"
```

## Implantar

Publique a imagem no repositório existente e então implante-a no Cloud Run. O build usa a conta padrão de Compute Engine do projeto porque ela já pode escrever no Artifact Registry:

```bash
PROJECT_ID="batalha-time-04-z85x"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
BUILD_SA="projects/${PROJECT_ID}/serviceAccounts/${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
IMAGE="us-central1-docker.pkg.dev/${PROJECT_ID}/batalha-agentes/financial-agent:latest"

gcloud builds submit \
  --config cloudbuild.yaml \
  --project "$PROJECT_ID" \
  --region us-central1 \
  --service-account "$BUILD_SA" \
  --substitutions="_IMAGE=${IMAGE}"

gcloud run deploy financial-agent \
  --image "$IMAGE" \
  --project "$PROJECT_ID" \
  --region us-central1 \
  --service-account financial-agent-runtime@batalha-time-04-z85x.iam.gserviceaccount.com \
  --no-allow-unauthenticated \
  --set-env-vars=GOOGLE_CLOUD_PROJECT=batalha-time-04-z85x,DATA_MANAGER_URL=https://data-manager-itau-zqj7scngrq-uc.a.run.app,DEMO_MODE=true \
  --set-secrets=GEMINI_API_KEY=gemini-api-key:latest \
  --memory=512Mi --cpu=1 --timeout=120s
```

O deploy configura o segredo Gemini e URL do data_manager, mantendo autenticação IAM obrigatória nos dois serviços. Para o backend do app invocar o financial-agent, conceda `roles/run.invoker` à identidade do backend neste serviço. `cloudbuild.yaml` constrói e publica a imagem; a implantação é um comando separado porque o Cloud Build não tem permissão para administrar serviços Cloud Run neste projeto.

Para a demonstração existente, mantenha `DEMO_MODE=true`; para uma implantação de produção, mude para `DEMO_MODE=false` e configure o Firebase Auth e o vínculo de `financial_user_id` antes de direcionar tráfego.

## Contrato da API

URL base atual: `https://financial-agent-zqj7scngrq-uc.a.run.app`. O serviço é privado; cada consumidor precisa de `roles/run.invoker`. Não use `--allow-unauthenticated` e não coloque credenciais de service account em browser, aplicativo ou repositório.

### Teste autorizado com curl

Para teste administrativo/local, gere um identity token para a audiência do serviço usando uma identidade que tenha permissão de invocação e de impersonation da service account:

```bash
SERVICE_URL="https://financial-agent-zqj7scngrq-uc.a.run.app"
TOKEN="$(gcloud auth print-identity-token \
  --impersonate-service-account=squad-agent-sa@batalha-time-04-z85x.iam.gserviceaccount.com \
  --audiences="$SERVICE_URL")"

curl -X POST "$SERVICE_URL/analyze" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"UUID_DO_PERFIL_DE_DEMO"}'
```

O token IAM autoriza a chamada ao Cloud Run; ele não substitui a autenticação individual do usuário. Na configuração atual de demonstração (`DEMO_MODE=true`), o agente aceita o UUID sintético sem Firebase token. Não use esse modo para dados reais.

Se `/analyze` responder com `requer_consentimento_para_economia: true`, só após consentimento afirmativo faça:

```bash
curl -X POST "$SERVICE_URL/savings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"UUID_DO_PERFIL_DE_DEMO","consent":true}'
```

Para conversa financeira:

```bash
curl -X POST "$SERVICE_URL/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"UUID_DO_PERFIL_DE_DEMO","message":"Como posso organizar meus gastos?"}'
```

### Liberar outro consumidor

Um administrador do projeto concede acesso IAM à conta Google do desenvolvedor para teste, ou à service account do backend chamador:

```bash
gcloud run services add-iam-policy-binding financial-agent \
  --project batalha-time-04-z85x \
  --region us-central1 \
  --member="user:EMAIL_DA_PESSOA" \
  --role="roles/run.invoker"
```

Para produção, o recomendado é o backend chamar o agente com a própria service account, encaminhar o Firebase ID token em `X-Firebase-ID-Token`, e rodar com `DEMO_MODE=false`. O backend deve obter o `user_id` do vínculo autenticado, nunca confiar em UUID arbitrário enviado pelo cliente.

Primeira etapa, ao abrir a área financeira. Em produção, o backend envia a identidade IAM de serviço no `Authorization` e o Firebase ID token do usuário no cabeçalho separado:

```http
POST /analyze
Content-Type: application/json
Authorization: Bearer TOKEN_IAM_DO_BACKEND
X-Firebase-ID-Token: TOKEN_FIREBASE_DO_USUARIO

{"user_id":"ID_DO_USUARIO"}
```

Na demonstração, `DEMO_MODE=true` permite testar UUIDs dos perfis sintéticos sem Firebase ID token; o Cloud Run continua exigindo IAM. Em produção, `DEMO_MODE=false` exige o token Firebase e o custom claim correspondente.

Quando a resposta vier com `requer_consentimento_para_economia: true`, exiba `mensagem` e `pergunta`. Só envie a segunda chamada após a pessoa confirmar:

```http
POST /savings
Content-Type: application/json
Authorization: Bearer TOKEN_IAM_DO_BACKEND
X-Firebase-ID-Token: TOKEN_FIREBASE_DO_USUARIO

{"user_id":"ID_DO_USUARIO","consent":true}
```

Sem `consent: true`, `/savings` responde `409`. Se não houver transações para o usuário na tabela, responde `404`. Quando faltar saldo confiável, a análise não afirma que o mês terminará no vermelho ou no azul.

Conversa limitada ao tema financeiro:

```http
POST /chat
Content-Type: application/json
Authorization: Bearer TOKEN_IAM_DO_BACKEND
X-Firebase-ID-Token: TOKEN_FIREBASE_DO_USUARIO

{"user_id":"ID_DO_USUARIO","message":"Como posso economizar no Delivery?"}
```

Em produção, envie também `Authorization: Bearer TOKEN_IAM_DO_BACKEND` para o Cloud Run privado. Perguntas sobre investimentos e assuntos fora de orçamento/economia são recusadas antes de chamar o modelo. O chat não recebe valores pessoais; projeções e números personalizados vêm das rotas determinísticas.

O arquivo `requirements.in` lista versões diretas fixas; `requirements.txt` é o lock com as dependências transitivas usado pelo Docker.