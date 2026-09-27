# observabilidade-itau

Observabilidade de longo prazo do Agente Otimizador:
- conversas com intervenção, tanto do `guardrails-itau` quanto do próprio `financial-agent`;
- avisos proativos e ajustes oferecidos;
- likes e dislikes nas mensagens;
- impacto A/B: taxa de entrada no negativo, tratamento × controle.

Como o agente ainda não está em produção, as tabelas são populadas por uma **simulação determinística** (`seed/`). Ela usa o vocabulário real dos serviços, então dá para trocar pelos eventos reais (`/v1/eventos/*`) sem mudar o schema.

## Estrutura

```
app/
  catalogo.py   códigos E01–S09 (guardrails) + AG_* (agente), status do /analyze e /chat, tipos de ajuste
  bq.py         cliente BigQuery, templating ($obs, $dm) e queries parametrizadas
  store.py      Protocol ObsStore + BigQueryStore (cache TTL, streaming insert)
  schemas.py    contratos de ingestão e de resposta
  routers/      metricas.py, clientes.py, eventos.py
  queries/      uma query por bloco de métrica
seed/
  gerar.py      simulação de 12 meses (piloto A/B) -> BigQuery e/ou JSONL
  schemas.py    schemas das 8 tabelas (partição diária + cluster id_usuario)
sql/90_views.sql  views v_kpis_mensais e v_impacto_ab
```

## Dataset `batalha-time-04-z85x.observabilidade`

| Tabela | Grão |
|---|---|
| `clientes` | cliente do piloto (`grupo_ab`, estado inicial, score, notificações ativas) |
| `conversas` | conversa (`origem` proativa/cliente, `momento`) |
| `mensagens` | mensagem (`endpoint`, `status` do agente, latência, `reescrita`) |
| `intervencoes` | intervenção (`fonte`: `guardrails`, `agente_escopo`, `agente_filtro_saida` ou `atendimento_humano`) |
| `alertas` | aviso proativo (`status_alerta` do `/analyze`, consentimento, desativação) |
| `ajustes_oferecidos` | ajuste do `/savings` e decisão do cliente |
| `feedback_mensagens` | like/dislike (+ motivo) |
| `resultado_ciclo` | cliente × mês (entrou no negativo, dias no limite, juros) |

### O que a simulação reproduz

Regras do escopo:
- metade dos clientes recebe o agente (grupo tratamento); a outra metade não recebe e só gera `resultado_ciclo`;
- no máximo 1 aviso por dia por cliente;
- quem desativa as notificações não recebe mais avisos;
- o ajuste recusado 2 vezes sai da lista;
- o momento 3 (`fora_da_curva`) só entra no ar em julho.

Tendências embutidas:
- like rate: ~45% → ~80%;
- fallback do filtro de saída: ~15% → ~5%;
- aceite de ajustes: ~28% → ~40%;
- 3 semanas com pico de ataques (E02, E04 e E01);
- a partir do 3º mês, o grupo tratamento entra menos no negativo que o controle.

Os clientes vêm de `data_manager.status_cliente`, com acesso somente leitura. Se essa tabela não estiver acessível, o seed usa clientes sintéticos.

## Endpoints

Métricas (`data_inicio`, `data_fim`, `granularidade=semana|mes`):

| Rota | Conteúdo |
|---|---|
| `GET /v1/metricas/resumo` | KPIs do período |
| `GET /v1/metricas/feedback` | série de like rate, quebras por estado/origem/status/intervenção, motivos de dislike |
| `GET /v1/metricas/intervencoes` | série por fonte, % bloqueio e % respostas substituídas, por código, saúde do guardrails (camada, degradado, p50/p95) |
| `GET /v1/metricas/alertas` | funil `/analyze` → consentimento → `/savings` → aceite; aceite por tipo de ajuste |
| `GET /v1/metricas/impacto` | A/B mensal e acumulado |
| `GET /v1/clientes/intervindos` | ranking de reincidência (`fonte`, `limite`) |
| `GET /v1/clientes/{id}/timeline` | todos os eventos do cliente |

Ingestão (`POST /v1/eventos/{conversa|mensagem|feedback|intervencao|alerta|ajuste}`) grava por streaming insert nas mesmas tabelas. O contrato completo está em `/openapi.json`.

## Contrato de eventos para o `financial-agent`

Hoje o agente não emite eventos, não chama o guardrails e não gera ids de conversa ou mensagem. Para sair da simulação, o orquestrador precisa:

1. Gerar `conversa_id` ao abrir o `/analyze` ou o primeiro `/chat` da sessão e enviar `POST /v1/eventos/conversa`.
2. Enviar `POST /v1/eventos/mensagem` a cada fala, com o `status` devolvido pelo agente e `latencia_agente_ms`. Quando o filtro de saída trocar a resposta do Gemini, marcar `reescrita=true`.
3. Enviar `POST /v1/eventos/intervencao`:
   - com `codigo` nas intervenções do próprio agente:
     - `AG_ESCOPO_INVEST` ou `AG_ESCOPO_GERAL` quando o status for `fora_escopo`;
     - `AG_FILTRO_NUMERO`, `AG_FILTRO_TERMO_PROTEGIDO` ou `AG_FILTRO_ESCOPO` quando o fallback do filtro de saída for aplicado;
     - `AG_ATENDIMENTO_HUMANO` quando o status for `atendimento_humano`.
   - com `veredito` (o JSON devolvido por `guardrails-itau /v1/entrada` ou `/v1/saida`, sem alteração) depois que o guardrails for integrado. O serviço grava uma linha por violação.
4. Enviar `POST /v1/eventos/alerta` ao fim da interação do aviso, quando já se sabe se houve consentimento, e `POST /v1/eventos/ajuste` para cada ação do `/savings` com a decisão do cliente.
5. No front, o 👍/👎 de `IaiChatScreen.tsx` deve enviar `POST /v1/eventos/feedback`. Hoje ele só guarda em estado local.

## Rodar

```bash
uv sync
uv run pytest                                   # seed + API (store fake)
OBS_TESTAR_BQ=1 uv run pytest tests/test_sql_dryrun.py   # dry-run das queries (precisa das tabelas)

uv run python -m seed.gerar --sem-bq --fonte-clientes sintetico --saida-local /tmp/obs   # só JSONL
GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token) uv run python -m seed.gerar  # grava no BigQuery
GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token) uv run uvicorn app.main:app --reload
```

## Deploy

```bash
./deploy.sh                    # dataset + imagem + job obs-seed + service observabilidade-itau
RUN_SEED=true ./deploy.sh      # também executa o seed
```

⚠️ O seed usa `WRITE_TRUNCATE`: rodar de novo **apaga eventos reais** que já tenham sido ingeridos. Só use enquanto a base for simulada.
