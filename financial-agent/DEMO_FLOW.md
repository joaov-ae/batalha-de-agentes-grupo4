# Fluxo Completo da Demo

Este runbook testa a API privada do agente diretamente pelo terminal. Não precisa de frontend. Os dados são sintéticos/históricos: o `data-manager-itau` está configurado com `DATA_REFERENCIA=2025-12-15` e o agente roda com `DEMO_MODE=true`. Não use as respostas como situação financeira atual de clientes.

## O que será chamado

1. `GET /admin/candidatos-demo` no data_manager lista perfis sintéticos para teste.
2. `GET /v1/clientes/{UUID}/status` confirma o estado do perfil.
3. `POST /analyze` no agente mostra o alerta; não gera ajustes ainda.
4. Se o alerta pedir consentimento e a pessoa aceitar, `POST /savings` consulta os ajustes determinísticos.
5. `POST /chat` testa conversa financeira e recusa de investimentos.

O data_manager determina estado, projeção e ajustes. O agente formata a resposta e aplica seus bloqueios, inclusive encaminhamento humano para `ja_no_buraco`.

## Pré-requisitos

- `gcloud` instalado e autenticado no projeto `batalha-time-04-z85x`.
- Permissão para gerar identity token por impersonation da service account `squad-agent-sa`.
- Essa service account precisa de `roles/run.invoker` nos serviços privados.
- `curl` e Python instalados.

Não imprima, salve ou compartilhe os tokens. Eles ficam somente em variáveis da sessão do terminal.

## Preparar sessão

Execute no Bash:

```bash
PROJECT_ID="batalha-time-04-z85x"
RUNTIME_SA="squad-agent-sa@${PROJECT_ID}.iam.gserviceaccount.com"
DM_URL="https://data-manager-itau-zqj7scngrq-uc.a.run.app"
AGENT_URL="https://financial-agent-zqj7scngrq-uc.a.run.app"

DM_TOKEN="$(gcloud auth print-identity-token \
  --impersonate-service-account="$RUNTIME_SA" \
  --audiences="$DM_URL")"
AGENT_TOKEN="$(gcloud auth print-identity-token \
  --impersonate-service-account="$RUNTIME_SA" \
  --audiences="$AGENT_URL")"

export DM_URL AGENT_URL DM_TOKEN AGENT_TOKEN
```

Se a geração do token falhar por impersonation, peça ao administrador para conceder `roles/iam.serviceAccountTokenCreator` à sua conta na service account de teste. Não torne os serviços públicos para contornar IAM.

## Verificar Serviços

```bash
curl -sS -H "Authorization: Bearer $DM_TOKEN" "$DM_URL/health"
curl -sS -H "Authorization: Bearer $AGENT_TOKEN" "$AGENT_URL/health"
```

O primeiro health mostra a data de referência do data_manager. Confirme que é `2025-12-15` antes de interpretar os resultados como demo histórica.

## Escolher Perfil Sintético

Liste os candidatos de demonstração:

```bash
curl -sS -H "Authorization: Bearer $DM_TOKEN" \
  "$DM_URL/admin/candidatos-demo"
```

Copie um `id_usuario` UUID da resposta e defina:

```bash
USER_ID="COLE_O_UUID_SINTETICO_AQUI"
```

Confira o estado antes de continuar:

```bash
curl -sS -H "Authorization: Bearer $DM_TOKEN" \
  "$DM_URL/v1/clientes/$USER_ID/status"
```

Estados úteis para demonstração:

- `vai_faltar`: alerta de risco e convite para procurar ajustes.
- `zero_a_zero`: orçamento projetado no limite e convite para ajustes.
- `fecha_bem`: projeção positiva; não deve oferecer cortes automaticamente.
- `ja_no_buraco` ou `encaminhar_atendimento=true`: deve encaminhar para atendimento humano e não sugerir cortes.

## Momento 1: Análise Inicial

```bash
curl -sS -X POST "$AGENT_URL/analyze" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER_ID\"}"
```

Observe `status`, `mensagem`, `pergunta`, `requer_consentimento_para_economia`, `tendencia` e `modo_demo`. A projeção e os valores vêm do data_manager. A primeira resposta não deve listar ajustes.

## Momento 2: Ajustes com Consentimento

Só faça esta chamada se o alerta pedir consentimento e a pessoa/testador confirmar que quer ver ajustes:

```bash
curl -sS -X POST "$AGENT_URL/savings" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER_ID\",\"consent\":true}"
```

Confira `acoes`, `periodo` e `modo_demo`. São sugestões; nenhuma ação é executada. Se o perfil estiver encaminhado para atendimento humano, `acoes` deve vir vazio mesmo que esta chamada seja feita.

Sem consentimento:

```bash
curl -i -sS -X POST "$AGENT_URL/savings" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER_ID\"}"
```

O resultado esperado é HTTP `409`.

## Momento 3: Chat

```bash
curl -sS -X POST "$AGENT_URL/chat" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER_ID\",\"message\":\"Como posso economizar sem mexer nos gastos essenciais?\"}"
```

Teste também o bloqueio de investimento:

```bash
curl -sS -X POST "$AGENT_URL/chat" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER_ID\",\"message\":\"Qual ação devo comprar?\"}"
```

O esperado é `status=fora_escopo`, sem recomendação de investimento.

## Erros Comuns

- `401`/`403`: token IAM ausente/inválido, ou identidade sem `roles/run.invoker`.
- `404`: UUID sem perfil carregado no data_manager; escolha outro candidato sintético.
- `409` em `/savings`: faltou consentimento explícito.
- `503`: data_manager ou modelo temporariamente indisponível; tente novamente mais tarde.
- Base exibida diretamente no navegador: esperado, pois Cloud Run é API privada e não página web.

## Limite da Demo

O agente e o data_manager estão privados e integrados, mas a data de referência do data_manager está fixa em `2025-12-15`. Não execute `/admin/pipeline` para trocar a data sem combinar com quem mantém o data_manager: o pipeline recalcula estado compartilhado. Para clientes reais ainda são necessários dados atuais, identidade Firebase vinculada ao UUID financeiro, `DEMO_MODE=false` e service accounts de menor privilégio. O fluxo de produção está descrito em [DEPLOY.md](DEPLOY.md).