# data_manager_itau

Camada de dados e tools do **Agente Otimizador** (escopo em `_agent_context/`). Aqui fica tudo o que é
determinístico: projeção de saldo até o próximo salário, classificação do cliente em 4 estados, score de
alerta, ajustes com impacto em dias e simulações. O agente (LLM, outro serviço) só redige a partir
destes números.

```
BigQuery hackathon_dados.extrato_sintetico  (somente leitura)
        │  pipeline/sql/00..08  (features, parametrizado por @data_referencia)
        ▼
Cloud Run Job dm-pipeline ──► dataset data_manager: stg_extrato, saldo_diario, recorrencias,
  (SQL + engine Python)        perfil_mensal, ritmo_variavel, consumo_categoria, score_alerta,
                               parametros, status_cliente ★, projecao_diaria, ajustes_sugeridos,
                               views contagem_estados e candidatos_demo
                                         │
Cloud Run Service data-manager-itau ◄────┘ carrega status + features em memória na subida
  FastAPI /v1/clientes/{id}/...  → tools do agente (OpenAPI em /openapi.json)
  A API é SOMENTE LEITURA no BigQuery.
```

## Estados

| Estado | Regra (em ordem de precedência) |
|---|---|
| `ja_no_buraco` | saldo de hoje < 0 **ou** 3 meses seguidos com algum dia negativo → não otimiza, encaminha |
| `vai_faltar` | saldo mínimo projetado antes do salário < 0 |
| `zero_a_zero` | saldo na véspera do salário ≤ 10% da renda (`CORTE_ZERO_A_ZERO`) |
| `fecha_bem` | acima disso |

Projeção: `saldo(d) = saldo(d-1) + entradas recorrentes − saídas recorrentes − ritmo variável diário`,
até a véspera do próximo salário. O engine (`app/engine/`) é o mesmo no pipeline e nas simulações da API.

## O que a base mostrou (e mudou o desenho)

- **O que move o saldo é a categoria, não o canal.** 33 micro-categorias de consumo (mercado,
  restaurante, delivery, lojas, app, posto...) nunca alteram `saldo_apos`, nem via Pix; todas as outras
  alteram em ~99% das linhas. O consumo chega à conta pela **fatura**. Ver `pipeline/sql/00_ref_categorias.sql`.
- **Não há ordem dentro do dia.** O saldo de fechamento é reconstruído por encadeamento
  (`02_saldo_diario.sql`), reconciliando `fech(d) = fech(d-1) + fluxo(d)` em **98,7%** dos dias.
- **Juros de limite aparecem até sem saldo negativo** (ruído da base sintética). A taxa do limite é
  calibrada só nos meses com dias negativos: **~0,102%/dia (~3,1%/mês)**, em `data_manager.parametros`.
- Renda: 800 clientes CLT (5º dia útil), 100 INSS, 100 só com "Recebimentos diversos" recorrentes.

## Score de alerta (proposta, calibrada)

6 sinais, 1 ponto cada; score ≥ 4 antecipa o aviso. Na referência 2025-12-15, **130 clientes**
com score ≥ 4 (o escopo cita 133).

1. saldo médio em queda por 3 meses seguidos
2. algum dia negativo nos últimos 3 meses
3. fatura paga no mínimo/parcial em 2+ meses
4. juros de limite em 2+ dos 3 meses
5. empréstimo novo
6. gasto do último mês > 15% acima da média dos 3 anteriores

## Resultados (referência 2025-12-15)

| Estado | Clientes |
|---|---|
| fecha_bem | 821 |
| ja_no_buraco | 163 |
| vai_faltar | 13 |
| zero_a_zero | 3 |

**Back-test** (referência 2025-10-15, comparando com o que aconteceu até o salário seguinte):
`vai_faltar` 30 clientes, dos quais 63% negativaram de fato; `fecha_bem` só 0,8% negativaram;
`ja_no_buraco` 97,7% seguiram negativos. O público "vai faltar" é pequeno nesta base: a maioria tem
saldo alto e quem negativa costuma estar cronicamente no buraco.

## Tools (`/v1/clientes/{id_usuario}/...`)

| operation_id | Rota | Uso |
|---|---|---|
| `obter_status` | `GET /status` | **primeira chamada**: estado, projeção, score, juros |
| `obter_projecao` | `GET /projecao` | saldo dia a dia até o salário |
| `resumo_recebimento` | `GET /resumo-salario` | momento 1: sobra, por dia, quando acaba, top 3 ajustes |
| `simular_transacao` | `POST /simulacoes/transacao` | momento 2: Pix/compra (à vista ou parcelada no cartão) negativa a conta? Quais contas compromete? Agendar resolve? |
| `obter_opcoes_investimento` | `GET /investimentos` | opções de liquidez diária (CDB 100% CDI, Tesouro Selic, Fundo DI) para reserva (`fecha_bem`) |
| `ritmo_do_mes` | `GET /ritmo` | momento 3: ritmo da semana vs 3 meses |
| `listar_compromissos_ate_salario` | `GET /compromissos` | contas previstas até o salário |
| `listar_recorrencias` | `GET /recorrencias` | salário, fixas, assinaturas, financiamentos |
| `listar_parcelas_ativas` | `GET /parcelas` | parcelas e financiamentos |
| `gasto_por_categoria` | `GET /gastos` | mês atual vs média própria |
| `evolucao_saldo` | `GET /evolucao-saldo` | erosão do saldo mês a mês |
| `historico_fatura` | `GET /fatura` | integral/parcial/mínimo |
| `ultimas_transacoes` | `GET /transacoes` | "o que foi isso?" |
| `custo_do_limite` | `GET /custo-limite` | juros pagos no ano e estimados |
| `listar_ajustes` | `GET /ajustes` | os 3 tipos, por esforço, sem recusados 2x |
| `assinaturas_redundantes` | `GET /ajustes/assinaturas` | 2+ serviços de vídeo/música |
| `pagamentos_reagendaveis` | `GET /ajustes/reagendamentos` | mover para o dia do salário |
| `gastos_acima_da_media` | `GET /ajustes/discricionarios` | acima da própria média |
| `simular_reserva` | `POST /simulacoes/reserva` | separar R$ X no salário |
| `simular_parcelamento_fatura` | `POST /simulacoes/parcelamento-fatura` | só com `TAXA_PARCELAMENTO_FATURA_MES` configurada (senão 409) |
| `obter_memoria` / `registrar_decisao` / `registrar_poupanca` | `/memoria...` | memória em processo (inclui `POST /memoria/poupar` para "Prefiro poupar") |
| `agendar_pix` / `separar_reserva` / `criar_lembrete_teto` | `POST /acoes/...` | **simuladas** (`simulado: true`) |

Admin: `POST /admin/pipeline`, `POST /admin/cache/recarregar`, `GET /admin/contagem-estados`,
`GET /admin/candidatos-demo`, `GET /healthz`.

## Restrições do projeto GCP (verificadas)

- **Firestore/Datastore bloqueados** pela org (`constraints/gcp.restrictServiceUsage`). O "NoSQL" do
  status é a tabela `status_cliente` carregada em memória (`app/store/status_store.py`, Protocol
  `StatusStore` para trocar de backend).
- **Cloud Scheduler e scheduled queries bloqueados**: o pipeline é um Cloud Run Job disparado sob demanda.
- **A API não grava no BigQuery.** Memória do cliente e ações simuladas vivem no processo
  (`max-instances=1`) e se perdem ao reiniciar.
- O SA default do Compute **não tem papéis de BigQuery**: veja o cabeçalho de `deploy.sh`.

## Rodar local

```bash
uv sync
# O ADC desta máquina faz impersonation de um SA de outro projeto; use o token do gcloud CLI:
export GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token)   # vale 1h
uv run python -m pipeline.run                 # DATA_REFERENCIA=2025-12-15 por padrão
uv run uvicorn app.main:app --port 8080
uv run pytest                                 # engine (sem GCP)
DM_TESTAR_BQ=1 uv run pytest tests/test_sql_dryrun.py   # dry-run de todo SQL
```

Config por env (ver `app/config.py`): `DATA_REFERENCIA`, `DATASET_DM`, `CORTE_ZERO_A_ZERO`,
`CORTE_SCORE_ALERTA`, `MESES_VERMELHO_BURACO`, `TAXA_PARCELAMENTO_FATURA_MES`.
