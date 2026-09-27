# Sessão 2026-09-27 — observabilidade_itau

## Pedido
Criar, numa branch nova, um serviço de observabilidade que acompanhe no longo prazo:
- conversas com intervenção;
- registro de alertas;
- clientes que sofreram intervenção;
- likes e dislikes nas mensagens.

Como o agente ainda não está em produção, a base foi simulada.

## Decisões (confirmadas com o usuário)
- **Armazenamento:** dataset novo no BigQuery, `batalha-time-04-z85x.observabilidade`. O Firestore continua bloqueado no projeto.
- **Intervenção:** conta tanto a do **guardrails** quanto o **aviso proativo** do agente.
- **Entrega:** API FastAPI de métricas e ingestão, publicada no Cloud Run como serviço **privado** (IAM). Sem dashboard e sem mudar o front por enquanto.
- **Branch:** `feat/observabilidade`, a partir da `main`.

## O agente real (`financial-agent`)
Não há fonte do agente neste repo. Li o tarball da revisão ativa no GCS do Cloud Build (`gs://batalha-time-04-z85x_cloudbuild/source/1790473092…tgz`), que contém `api.py`, `agent_finance.py` e `data_manager_client.py`.

- **`POST /analyze`** é o aviso proativo. O `status` pode ser:
  - `risco_vermelho`
  - `saldo_estimado_no_limite`
  - `saldo_estimado_positivo`
  - `atendimento_humano`
  - `dados_insuficientes`

  Só pede consentimento nos dois primeiros.
- **`POST /savings`** (exige `consent=true`) devolve ajustes dos tipos `assinatura_redundante`, `gasto_discricionario` e `mudanca_data`.
- **`POST /chat`** devolve `respondido`, `fora_escopo` ou `atendimento_humano`. O próprio agente intervém de duas formas:
  - recusa por escopo antes de chamar o Gemini;
  - troca a resposta do LLM por um fallback quando ela contém número, R$, %, termo protegido ou assunto fora do escopo.
- **Lacunas:** o agente não chama o `guardrails-itau`, não gera `conversa_id` nem `mensagem_id` e não emite eventos. O contrato do que ele precisa emitir está no README do serviço.

## O que foi feito
- `observabilidade/` com o mesmo padrão do `data_manager` (uv, FastAPI, `bq.py`, queries em `.sql`, Cloud Build/Run).
- **Oito tabelas** (fatos particionados por dia e clusterizados por `id_usuario`): `clientes`, `conversas`, `mensagens`, `intervencoes`, `alertas`, `ajustes_oferecidos`, `feedback_mensagens` e `resultado_ciclo`.
- **Códigos de intervenção:** E01–S09, copiados do catálogo do guardrails, mais os códigos `AG_*` para as intervenções do agente (`AG_ESCOPO_*`, `AG_FILTRO_*`, `AG_ATENDIMENTO_HUMANO`).
- **Seed determinístico** (`seed/gerar.py`, seed 42):
  - 400 clientes reais de `data_manager.status_cliente` (somente leitura), 50/50 tratamento × controle, 12 meses de 2025;
  - regras do escopo: 1 aviso por dia, ajuste recusado 2 vezes sai da lista, desativação corta os avisos, momento 3 só a partir de julho;
  - tendências: like rate ↑, fallback do filtro ↓, aceite ↑, 3 semanas de pico de ataque, A/B separando a partir do 3º mês.
- **Calibração:** na primeira versão, o controle derivava de 23% para 40% de entrada no negativo, porque "3 meses no vermelho → buraco" virou um estado quase sem saída. Ajustei `P_NEGATIVO[vai_faltar]` para 0,40, a permanência no buraco para 0,70 e o peso do buraco para 0,04. Com isso o controle ficou estável em ~16–23%.
- **API:**
  - `/v1/metricas/{resumo,feedback,intervencoes,alertas,impacto}`;
  - `/v1/clientes/{intervindos,{id}/timeline}`;
  - `/v1/eventos/{conversa,mensagem,feedback,intervencao,alerta,ajuste}`. A intervenção aceita o `Veredito` do guardrails sem alteração.
- **SQL sem subquery correlacionada:** o aceite é calculado por `LEFT JOIN` num conjunto `DISTINCT`. As métricas vêm das tabelas de fatos, e não das colunas agregadas de `conversas`, para continuarem válidas com a ingestão evento a evento.

## Resultados (base carregada)
- **Volumes:** 5.111 conversas, 18.376 mensagens, 1.470 intervenções, 2.134 alertas, 1.149 ajustes, 1.906 votos e 4.666 cliente-meses.
- **2025 inteiro:**
  - 24,5% das conversas tiveram intervenção;
  - like rate de 67,8%;
  - 15,4% dos alertas terminaram com ajuste aceito.
- **A/B acumulado:** tratamento com 10,0% de entrada no negativo, contra 20,9% no controle. Em dezembro, a diferença é de −18 pp.
- **Filtro de saída:** substituiu 14,5% das respostas em janeiro e 6,2% em outubro.
- **Guardrails simulado:** p50 de 0,42 ms nas regras e 622 ms no Gemini; 1,4% de degradado.

## Deploy
- Imagem `us-central1-docker.pkg.dev/batalha-time-04-z85x/agentes/observabilidade-itau:v2`.
- Job `obs-seed` publicado, mas não executado: a carga foi feita localmente com o token do gcloud.
- Service `observabilidade-itau` privado (`https://observabilidade-itau-zqj7scngrq-uc.a.run.app`), SA `squad-agent-sa`. Sem token, responde 403.
- **Latência:**

  | Situação | Tempo |
  |---|---|
  | Cold start | 7–19 s |
  | Aquecido, queries em sequência | ~3 s |
  | Aquecido, queries em paralelo (v2) | 1,1–1,7 s |
  | Cache TTL | 0,2 s |

## Testes
- 32 testes locais: seed e API com store fake.
- 15 dry-runs no BigQuery (`OBS_TESTAR_BQ=1`), todos passando.

## Pendências
- Instrumentar o `financial-agent` com os eventos (contrato no README) e integrar o guardrails ao orquestrador.
- Ligar o 👍/👎 do `IaiChatScreen.tsx` a `POST /v1/eventos/feedback`.
- Dar `roles/run.invoker` no `observabilidade-itau` aos SAs que vão chamar o serviço.
- Não rodar o seed de novo depois que houver eventos reais: o `WRITE_TRUNCATE` apaga tudo.
