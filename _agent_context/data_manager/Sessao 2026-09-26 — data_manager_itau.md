# Sessão 2026-09-26: construção do data_manager_itau

Registro técnico da sessão que planejou e implementou o `data_manager_itau`. O documento cobre o pedido inicial, o plano aprovado, as decisões, os achados na base, tudo o que foi escrito (arquivos e recursos GCP), os resultados, os testes e as pendências.

---

## 1. Pedido inicial (prompt, via `/plan`)

> Eu estou construindo o data_manager_itau, um serviço que vai consultar uma base do BigQuery do GCP chamada extrato_sistentico, basicamente, terá uma gente conversacional que ficará responsável por ajudar um cliente que está próximo a se endividar, nosso objetivo é ajudar ele a ficar mais saudável financeiramente para não entrar nesse problema. Hoje, identificamos 4 status desse cliente, quando cada requisição chegar ele precisa primeiramente identificar qual o status desse cliente. Na requisição para o agente, vai a query e o status dele. Depois, nesse projeto, quero criar todas os tipos de query que esse agente pode puxar, pensando nesse contexto e no escopo, tente identificar quais queries boas seriam interessantes do cliente puxar. Talvez seja interessante construir uma pipeline de dados no GCP também para poder salvar previamente em algum banco NoSQL o status pré-calculado. Já pense em como esse código ficaria armazenado no GCP, provavelmente pelo CloudRun, avalie todos os serviços que eu tenho acesso, porque não são todos.. O escopo tá dentro de @_agent_context/

A referência de escopo é `_agent_context/Escopo — Agente Otimizador.md`, com 4 estados (vai faltar, zero a zero, fecha bem, já está no buraco), 3 momentos de atuação, 3 tipos de ajuste, a regra "o LLM só redige" e o score de alerta de 6 sinais.

### Mensagens do usuário durante a sessão
1. Respostas às perguntas de esclarecimento (ver §3).
2. Aprovação do plano (ExitPlanMode).
3. "Pode continuar", depois de interromper um comando de teste.
4. **"Nada será gravado na base, apenas leitura"**: passou a ser uma restrição do projeto (ver §8).
5. "Salva tudo nessa sessão no _agent_context, se possível o json dela", depois alterado para: "apenas faça um resumo de tudo dessa sessão num .md no _agent_context, bem completo e técnico, pegue os writes, o plano, o prompt inicial". Este documento é essa entrega.

---

## 2. Levantamento inicial (somente leitura)

### 2.1 Projeto e acessos GCP
- Projeto ativo: `batalha-time-04-z85x` ("Batalha Agentes Time 04"), região `us-central1`.
- Papéis da conta do gcloud CLI no projeto:
  - aiplatform.user
  - artifactregistry.writer
  - bigquery.admin, bigquery.dataEditor, bigquery.jobUser
  - cloudbuild.builds.editor
  - discoveryengine.editor
  - iam.serviceAccountTokenCreator, iam.serviceAccountUser
  - logging.viewer, monitoring.viewer
  - run.admin
  - secretmanager.secretAccessor
  - serviceusage.serviceUsageConsumer
  - storage.objectAdmin
  - viewer
- APIs habilitadas:
  - aiplatform, analyticshub, apikeys, artifactregistry
  - bigquery e família: connection, datapolicy, datatransfer, migration, reservation, storage
  - billing, cloudbuild, cloudresourcemanager, cloudshell, containerregistry
  - dataform, dataplex, discoveryengine, generativelanguage
  - iam, iamcredentials, logging, modelarmor, monitoring, pubsub
  - run, secretmanager, serviceusage, storage, telemetry

| Serviço | Situação | Evidência |
|---|---|---|
| Cloud Run | ✅ | `run.admin` |
| Cloud Build + Artifact Registry | ✅ | repo `agentes` (DOCKER, us-central1) já tem a imagem `farol:v1` |
| BigQuery | ✅ | `bigquery.admin` |
| **Firestore / Datastore** | ❌ | `constraints/gcp.restrictServiceUsage` bloqueia `firestore.googleapis.com` |
| **Cloud Scheduler** | ❌ | `RESOURCE_USAGE_RESTRICTION_VIOLATED` |
| **BQ scheduled queries** (Data Transfer) | ❌ | `restrictServiceUsage` em `bigquerydatatransfer.googleapis.com` |
| Cloud Storage | ⚠️ | nenhum bucket; `objectAdmin` não permite criar bucket |
| Service accounts | ⚠️ | só existe `313377205892-compute@developer.gserviceaccount.com`, com `artifactregistry.writer`, `logging.logWriter` e `storage.admin` (**nenhum papel de BigQuery**) |
| Cloud Run services/jobs existentes | — | nenhum |

### 2.2 Base
`batalha-time-04-z85x.hackathon_dados.extrato_sintetico`:
- 467.585 linhas, 1.000 clientes, de 01/01/2025 a 31/12/2025
- 59 MB, sem partição nem cluster
- O dataset tem também `extrato_sintetico_copy` e `extrato_sintetico_copy_copy`, não usadas

Schema:

| coluna | tipo |
|---|---|
| id_usuario | STRING |
| anomesdia | TIMESTAMP |
| anomes | INTEGER |
| tipo | STRING (`E`/`S`) |
| descr | STRING |
| vlr | FLOAT (sempre > 0) |
| nom_cate_macro, nom_cate_micro | STRING |
| saldo_apos | FLOAT |
| parcela_atual, parcela_total | FLOAT |

Perfil:
- 35.077 entradas e 432.508 saídas.
- 56.141 linhas com `saldo_apos < 0`.
- 29.847 linhas com parcela.
- Prefixos de `descr`: pix, cart, pag, debito, assin, cred, da, deb, seg, mensal, plano, recarga, iptu, saque, int, bol, ch, pagto.

---

## 3. Perguntas de esclarecimento e decisões

| Pergunta | Resposta |
|---|---|
| O repositório contém o agente (LLM)? | **Só dados e tools.** O agente (ex.: imagem `farol`) é outro serviço que chama esta API |
| Qual é o "hoje"? (a base termina em 31/12/2025) | **Parâmetro `DATA_REFERENCIA`, padrão 2025-12-15** |
| Definição dos 6 sinais do score | **Não existe; proponha** (proposta calibrada em §5.4) |
| Durante a implementação | **"Nada será gravado na base, apenas leitura"** |

---

## 4. Plano aprovado (resumo fiel)

Arquivo original: `~/.claude/plans/jazzy-forging-moler.md`.

- **Arquitetura**
  - SQL de features parametrizado por `@data_referencia`.
  - Cloud Run Job `dm-pipeline`, com SQL e engine Python, grava o dataset `data_manager`.
  - Cloud Run Service `data-manager-itau` (FastAPI) com cache em memória.
  - Tools expostas via OpenAPI para o agente, que chama com ID token e `roles/run.invoker`.
- **"NoSQL"**: como o Firestore está bloqueado, o status fica na tabela de serving `status_cliente`, carregada inteira em memória, atrás de um Protocol `StatusStore` que permite trocar o backend.
- **Pipeline**:
  - `stg_extrato` → `recorrencias` → `perfil_mensal` → `ritmo_variavel` → `score_alerta`
  - engine em lote → `status_cliente`, `projecao_diaria`, `ajustes_sugeridos`
  - views `contagem_estados` e `candidatos_demo`
  - Disparo sob demanda, porque não há Scheduler.
- **Princípio central**: um único engine Python (projeção, classificação, ajustes) usado pelo pipeline em lote e pela API nas simulações. O SQL só extrai e agrega.
- **Regras dos estados**, em ordem de precedência:
  1. `ja_no_buraco`: saldo de hoje < 0 ou 3 meses seguidos com dia negativo
  2. `vai_faltar`: mínimo projetado < 0
  3. `zero_a_zero`: véspera do salário ≤ 10% da renda
  4. `fecha_bem`: o restante
- **Catálogo de tools**: ver §6.
- **Deploy**: `bq mk`, `gcloud builds submit`, `gcloud run jobs deploy`, `gcloud run deploy --no-allow-unauthenticated`, e o SA do agente com `run.invoker`.
- **Verificação planejada**: pytest do engine, dry-run do SQL, contagem por estado, back-test, curl das tools e smoke test após o deploy.

---

## 5. Achados na base que mudaram o desenho

### 5.1 O que move o saldo é a categoria, não o canal
Primeira hipótese: linhas `cart credito ...` não mexem no saldo. Ela é verdadeira, mas incompleta.

Na amostra, compras via `pix qrs` em mercado e posto também não moviam o `saldo_apos`. Medi, por micro-categoria, a fração de linhas em que existe um saldo anterior `p` (do mesmo dia ou do dia anterior) com `p ± vlr = saldo_apos`:
- **33 micro-categorias têm fração 0,0**: Mercado, Posto de combustivel, Pedagio, Estacionamento, Passagem de onibus, Manutencao da casa, Aluguel de carro, Delivery, Restaurantes, Padaria, Cafeteria, Outras comidas e bebidas, Loja de conveniencia, Transporte por app, Compras, Vestuario e acessorios, Brinquedos e artigos infantis, Artigos esportivos, Moveis e decoracao, Eletronicos, Cinema, Outros entretenimentos, Livros musica e video, Videogames, Ingresso de shows, Eventos e festas, Museu e teatro, Hospedagem, Passagem aerea e taxas, Outros gastos de viagem, Compra de moedas, Produtos de beleza, Outros cuidados pessoais.
- As demais ficam em cerca de 99%. A exceção é `Juros pagos`, com 0,83.

Consequências:
- `afeta_conta = micro NOT IN consumo`.
- O consumo chega à conta pela **fatura**, que é tratada como item recorrente.
- O ritmo variável usa só as saídas da conta que não são recorrentes, para não contar a fatura duas vezes.

### 5.2 Não há ordem dentro do dia: reconstrução do saldo de fechamento
Três regras foram testadas:

| Regra | Resultado |
|---|---|
| Offset constante por cliente + soma acumulada, excluindo só o cartão | cobertura média de 5% (falhou) |
| Mesma ideia, com a regra por categoria | 97% em média, mínimo de 50% (drift) |
| **Encadeamento local** | fechamento = saldo `c` de um lançamento que move a conta cuja abertura implícita `c − fluxo_do_dia` coincide com `saldo_apos − valor` de algum lançamento do dia (o primeiro da cadeia), com join por igualdade em centavos |

A regra final reconcilia `fech(d) = fech(d−1) + fluxo(d)` em **98,7%** de 262.172 dias. Não houve nenhum dia ambíguo, e 416 dias ficaram sem candidato; nesses, o fallback é o menor saldo do dia. Dias só com consumo repetem o saldo anterior, e dias sem lançamento herdam o último fechamento (calendário preenchido).

### 5.3 Renda e datas
- Fontes de renda:
  - 400 clientes com CLT + recebimentos diversos
  - 300 com CLT + aluguel + recebimentos diversos
  - 100 só com CLT
  - 100 só com recebimentos diversos (sem salário)
  - 100 com INSS + recebimentos diversos
- O salário CLT cai no 5º dia útil (dias 5, 6 e 7; a moda é 7). A fatura tem dia fixo por cliente (5, 15, 20, 25...).
- A renda recorrente exclui 13º, PLR e juros. O 13º infla os saldos de dezembro.

### 5.4 Score de alerta: calibração
- **Juros aparecem sem saldo negativo:** 367 clientes têm juros nos últimos 3 meses sem nenhum dia negativo. É ruído da base sintética.
- **Primeira versão:** dia negativo, fatura mínima/parcial, juros > 0, saque ou empréstimo, queda do saldo e gasto acima do habitual. Deu **238** clientes com score ≥ 4.
- **Versões testadas** (clientes com score ≥ 4):

  | Variante | Clientes |
  |---|---|
  | fatura mínima + juros em 2 meses + empréstimo | 114 |
  | fatura mínima + juros em 3 meses + empréstimo | 87 |
  | **fatura mín./parcial em 2+ meses + juros em 2+ meses + empréstimo** | **130 (escolhida)** |
  | fatura mínima + juros em 2 meses + saque ou empréstimo | 137 |

- **Os 6 sinais finais** (1 ponto cada; score ≥ 4 antecipa o aviso):
  1. `saldo_em_queda`: saldo médio m3 > m2 > m1
  2. `dias_no_negativo`: algum dia negativo nos meses 0 a 3
  3. `fatura_minimo_ou_parcial`: fatura mínima ou parcial em 2 ou mais meses
  4. `juros_de_limite`: juros em 2 ou mais dos 3 meses completos
  5. `emprestimo`: micro `Emprestimos` ou `Outros emprestimos` nos meses 0 a 3
  6. `gasto_acima_do_habitual`: consumo + saídas da conta de m1 > 1,15 × média de m2 a m4
- **Resultado:** 130 clientes com score ≥ 4 (26 com score ≥ 5). O escopo cita 133.

### 5.5 Taxa de juros do limite
Calculada como juros pagos no mês dividido pela soma dos saldos devedores diários do mês, só nos meses com dias negativos (1.776 meses). Resultado: **0,10187% ao dia (cerca de 3,1% ao mês)**, gravado em `data_manager.parametros.taxa_juros_limite_dia`. Nenhum número foi inventado.

### 5.6 Recorrência (resultado)
Critério: presente em 3 ou mais dos 4 meses completos anteriores, só lançamentos que movem a conta.

| tipo_item | itens | clientes | valor médio |
|---|---|---|---|
| conta_fixa | 9.237 | 1.000 | 263 |
| assinatura | 3.021 | 1.000 | 28 |
| fatura | 1.000 | 1.000 | 1.562 |
| entrada_recorrente | 905 | 905 | 3.094 |
| salario | 800 | 800 | 5.490 |
| financiamento | 738 | 712 | 2.719 |
| parcela | 438 | 438 | 306 |
| aluguel_recebido | 300 | 300 | 1.150 |
| beneficio | 100 | 100 | 2.623 |

Todos os clientes têm pelo menos 1 entrada recorrente. Grupos de assinatura:
- **vídeo:** netflix, disney plus, hbo max, star plus, paramount plus, globoplay, apple tv, amazon prime
- **música:** spotify prem, deezer prem, youtube music
- **outros:** canva pro

---

## 6. Implementação

### 6.1 Estrutura (todos os arquivos escritos na sessão)

```
data_manager_itau/
  pyproject.toml, uv.lock          # uv; fastapi, uvicorn, google-cloud-bigquery, google-cloud-run, pydantic(-settings); dev: pytest, httpx
  Dockerfile, .dockerignore, .gitignore, cloudbuild.yaml, deploy.sh, README.md
  app/
    config.py        # Settings (pydantic-settings, env): projeto, regiao, tabela_fonte, dataset_dm, data_referencia=2025-12-15,
                     # corte_zero_a_zero=0.10, corte_score_alerta=4, meses_vermelho_buraco=3,
                     # taxa_parcelamento_fatura_mes=None, job_pipeline="dm-pipeline"
    bq.py            # client() (aceita GOOGLE_OAUTH_ACCESS_TOKEN p/ dev), render() com Template.safe_substitute($fonte,$dm),
                     # run(sql, **params) com data_referencia injetada, run_file(), table()
    formatar.py      # brl() "R$ 1.234,50", dia() "7 de janeiro"
    schemas.py       # contratos Pydantic das tools (StatusResposta, ProjecaoResposta, AjusteResposta, simulações, ações...)
    deps.py          # IdUsuario (Path com regex UUID), StatusStoreDep, MemoriaDep, ClienteDep (404 se não existe)
    servicos.py      # monta respostas: status, projecao, ajuste(s), compromissos, ritmo_do_mes, data_debito,
                     # ciclo_seguinte, simular_transacao, simular_reserva, simular_parcelamento
    main.py          # FastAPI + lifespan (carrega cache), /healthz, inclui 6 routers
    engine/
      modelos.py       # Estado, ItemRecorrente, ConsumoCategoria, Features, Evento, PontoProjecao, Projecao, Ajuste
      projecao.py      # ocorrencias, proximo_salario, fim_padrao, eventos_previstos, projetar, projetar_cliente, dias_ganhos
      classificacao.py # Regras, classificar, Status, calcular_status
      custo.py         # juros_estimados, comparar_parcelamento (Price)
      ajustes.py       # _mudanca_data, _assinaturas, _discricionarios, gerar_ajustes (MAX_RECUSAS=2)
    store/
      features_store.py  # carregar_features() (1.000 clientes), carregar_taxa_juros_dia()
      status_store.py    # Protocol StatusStore + BigQueryStatusStore (cache em memória, lock)
      memoria_store.py   # SOMENTE EM PROCESSO (sem BigQuery): eventos, ações, recusas, meta_reserva
    queries/*.sql      # features_saldo, features_recorrencias, features_ritmo_score, features_consumo, parametros,
                       # status_todos, gastos_por_categoria, evolucao_saldo, historico_fatura, ultimas_transacoes,
                       # custo_limite, resultado_ciclo_anterior, contagem_estados, candidatos_demo
    routers/ cliente.py, extrato.py, ajustes.py, simulacao.py, memoria.py, admin.py
  pipeline/
    run.py           # executa sql 00..08 -> calcular_lote() -> grava 3 tabelas (load_table_from_json, WRITE_TRUNCATE,
                     # schema explícito, cluster id_usuario) -> executa 90_views.sql
    sql/00_ref_categorias.sql   # consumo / discricionario / reagendavel / fora_da_rotina por micro
    sql/01_stg_extrato.sql      # data, valor_sinal, canal, afeta_conta, servico/grupo_assinatura, tipo_fatura; filtro <= @data_referencia
    sql/02_saldo_diario.sql     # fechamento por encadeamento + calendário preenchido
    sql/03_recorrencias.sql     # chave = serviço (assinatura) | micro; >=3 de 4 meses; dia_tipico = moda (CTE dia_moda)
    sql/04_perfil_mensal.sql    # por cliente-mês: saldo min/médio/fim, dias negativos, juros, fatura, consumo, saques, empréstimos, renda
    sql/05_ritmo_variavel.sql   # saída variável diária 90d e 7d (não recorrente, afeta conta)
    sql/06_consumo_categoria.sql# discricionário: mês atual vs média 3m, esperado pró-rata (Loja de conveniencia separada)
    sql/07_score_alerta.sql     # 6 sinais + meses_vermelho_consecutivos
    sql/08_parametros.sql       # taxa_juros_limite_dia calibrada
    sql/90_views.sql            # contagem_estados, candidatos_demo
  tests/
    test_engine.py      # 10 testes do engine
    test_formatar.py    # 2 testes
    test_sql_dryrun.py  # dry-run de 24 SQL (só com DM_TESTAR_BQ=1)
```

### 6.2 Engine: regras
- **ocorrencias(item, ref, ate)**:
  - Se o item já ocorreu no mês atual, a próxima ocorrência é no mês seguinte, no `dia_tipico`.
  - Senão, é neste mês se o dia ainda não passou.
  - Se o dia já passou, uma **saída atrasada** vai para ref+1 (conservador) e uma **entrada atrasada** vai para o mês seguinte (conservador).
  - Respeita `parcelas_restantes`; com 0, não gera ocorrência.
- **Horizonte**: de ref+1 até a véspera do próximo salário, que é a próxima ocorrência da maior entrada recorrente entre salário, benefício, entrada recorrente e aluguel. Sem renda, usa 30 dias.
- **Projeção**: `saldo(d) = saldo(d−1) + Σ eventos(d) − saida_variavel_diaria`.
- **Status**:
  - `disponivel = saldo_hoje + entradas previstas − compromissos` e `sobra_por_dia = max(disponivel, 0) / dias`
  - `reserva_sugerida` = saldo da véspera arredondado para baixo em múltiplos de 10 (só em zero_a_zero e fecha_bem)
  - `antecipar_aviso = score ≥ 4`
  - `juros_estimados = Σ saldo devedor diário × taxa`
  - `encaminhar_atendimento` = estado buraco
- **dias_ganhos**:
  - Se a base não fica negativa: 0 dias.
  - Se o ajuste elimina o negativo: `(fim − dia_que_acaba) + 1` e `resolve = True`.
  - Caso contrário: diferença entre os dias em que o dinheiro acaba.
- **Ajustes** (ordenados por esforço, depois pelos que resolvem, depois por mais dias, depois por maior valor; os recusados 2 vezes são filtrados):
  1. `mudanca_data:<micro>` (esforço 1, ação `agendar_pix`): saída reagendável (Outras transferencias, Boleto, Titulo de capitalizacao, Consorcio) movida para o dia do salário.
  2. `assinatura_redundante:<video|musica>` (esforço 2, sem ação, porque o banco não cancela): grupo com 2 ou mais serviços. O cálculo mantém o serviço com a **próxima cobrança mais distante** (desempate pelo mais caro) e o cliente escolhe qual manter. Na primeira versão o serviço mantido era o mais caro, o que dava impacto 0; foi corrigido.
  3. `gasto_discricionario:<macro>` (esforço 3, ação `lembrete_teto`):
     - Condição: gasto do mês > 1,10 × esperado pró-rata e excesso ≥ R$ 20.
     - Economia = (ritmo do mês − média) × fração restante do mês.
     - A economia reduz a primeira fatura prevista após o fim do mês, se ela cair antes do salário.
     - Teto sugerido = média do **próprio** cliente.
- **Parcelamento da fatura**: tabela Price. Os juros evitados vêm da projeção com a 1ª parcela no lugar da fatura. Sem `TAXA_PARCELAMENTO_FATURA_MES`, a rota retorna 409, para não inventar número.

### 6.3 Catálogo de tools (operation_id → rota), prefixo `/v1/clientes/{id_usuario}`

| operation_id | Método e rota | Fonte |
|---|---|---|
| obter_status | GET /status | cache `status_cliente` (fallback: engine) |
| obter_projecao | GET /projecao | engine |
| resumo_recebimento | GET /resumo-salario | engine (momento 1) |
| ritmo_do_mes | GET /ritmo | engine: ritmo 7d vs 90d (momento 3) |
| listar_compromissos_ate_salario | GET /compromissos | engine |
| listar_recorrencias | GET /recorrencias | cache |
| listar_parcelas_ativas | GET /parcelas | cache |
| gasto_por_categoria | GET /gastos?meses= | BQ |
| evolucao_saldo | GET /evolucao-saldo?meses= | BQ `perfil_mensal` |
| historico_fatura | GET /fatura?meses= | BQ |
| ultimas_transacoes | GET /transacoes?categoria=&limite= | BQ |
| custo_do_limite | GET /custo-limite | BQ + engine |
| listar_ajustes | GET /ajustes | engine + memória |
| assinaturas_redundantes | GET /ajustes/assinaturas | idem |
| pagamentos_reagendaveis | GET /ajustes/reagendamentos | idem |
| gastos_acima_da_media | GET /ajustes/discricionarios | idem |
| simular_transacao | POST /simulacoes/transacao | engine (momento 2); cartão → debita na fatura seguinte |
| simular_reserva | POST /simulacoes/reserva | engine, próximo ciclo |
| simular_parcelamento_fatura | POST /simulacoes/parcelamento-fatura | engine, 409 sem taxa |
| obter_memoria | GET /memoria | memória em processo + BQ (ciclo anterior) |
| registrar_decisao | POST /memoria/decisoes | memória em processo |
| definir_meta_reserva | PUT /memoria/meta-reserva | memória em processo |
| agendar_pix | POST /acoes/agendar-pix | simulado |
| separar_reserva | POST /acoes/separar-reserva | simulado |
| criar_lembrete_teto | POST /acoes/lembrete-teto | simulado |

Admin: `POST /admin/pipeline` (dispara o Job via `run_v2`), `POST /admin/cache/recarregar`, `GET /admin/contagem-estados`, `GET /admin/candidatos-demo`, `GET /healthz`.

Toda consulta ao BigQuery é parametrizada (`@id_usuario`, `@data_referencia`, ...). Não há SQL livre vindo do LLM. As respostas trazem um campo `formatado` com valores em R$ e datas em pt-BR.

---

## 7. Execuções e resultados

### 7.1 Pipeline (referência 2025-12-15)
- Os SQLs 00 a 08 levam de 1,7 a 6,3 s cada. O pipeline completo leva cerca de 55 s.
- Tabelas gravadas: `status_cliente` com 1.000 linhas, `projecao_diaria` com 22.610 e `ajustes_sugeridos` com 2.076.
- Bugs encontrados e corrigidos durante as execuções:
  - `Template.substitute` quebrava com o `$` de regex. Troquei por `safe_substitute`.
  - `ARRAY_AGG(STRUCT(NULL, NULL))` classificava todo item como `parcela`. Agora o STRUCT só entra quando `parcela_total` não é nulo.
  - `APPROX_TOP_COUNT` contava NULL e deixava `dia_tipico` nulo. Troquei por uma CTE `dia_moda`.

| Estado | Clientes | % | com score ≥ 4 |
|---|---|---|---|
| fecha_bem | 821 | 82,1% | 43 |
| ja_no_buraco | 163 | 16,3% | 83 |
| vai_faltar | 13 | 1,3% | 3 |
| zero_a_zero | 3 | 0,3% | 1 |

- Médias por estado:
  - vai_faltar: saldo 3.382 e véspera −1.079
  - fecha_bem: saldo 29.805
  - ja_no_buraco: saldo −7.006
  - zero_a_zero: véspera 140
- 800 clientes têm o próximo salário em 07/01/2026.
- **vai_faltar e zero_a_zero ficam abaixo do corte de 5%** do escopo (decisões em aberto nº 1 e nº 2).

### 7.2 Back-test (dataset `data_manager_bt`, referência 2025-10-15)
- Distribuição: fecha_bem 791, ja_no_buraco 176, vai_faltar 30, zero_a_zero 3.
- Comparação com o que aconteceu até o salário seguinte:

| Estado previsto | n | negativou de fato | taxa |
|---|---|---|---|
| vai_faltar | 30 | 19 | 63,3% |
| fecha_bem | 791 | 6 | 0,8% |
| ja_no_buraco | 176 | 172 | 97,7% |
| zero_a_zero | 3 | 1 | 33,3% |

- Recall de `vai_faltar` entre quem negativou fora do buraco: 19 de 26, ou 73%.
- Conclusão: a regra funciona, mas o público é pequeno. A maioria dos clientes tem saldo alto, e quem negativa costuma estar cronicamente no buraco.

### 7.3 Candidatos de demo (`candidatos_demo`)
- **vai_faltar** `d6c59567-bb6d-4a01-a0bd-f9b6f811724b`:
  - Saldo 3.776,24; acaba em 06/01; véspera −883,22; score 3.
  - Tem 3 assinaturas de vídeo (paramount, globoplay, hbo max).
  - Ajuste nº 1: agendar o `pix transf terc` de R$ 962,77 do dia 06/01 para 07/01, o que **resolve**.
  - Ajuste nº 2: cortar assinaturas, que economiza R$ 72,95 por mês e libera R$ 38,51 antes do salário.
- **zero_a_zero** `0e371805-fbe9-4e5a-9346-364594d06aa1`:
  - Véspera 127,85; sobra R$ 457,41, ou R$ 20,79 por dia; 3 assinaturas de vídeo.
  - Simulação de Pix de R$ 500 hoje: fica negativo em 02/01, com R$ 1,68 de juros adicionais.
- Outros "vai faltar": `fd3a71b4…`, `68c12bc8…`, `63a3da0a…`, `7409c19c…`, `412dae1f…`, `a5b21e1b…`.

### 7.4 Testes
- `uv run pytest`: **12 passed** (engine + formatação).
- `DM_TESTAR_BQ=1 pytest tests/test_sql_dryrun.py`: **24 passed**. O dry-run não executa nada.
- API local (uvicorn :8765): todas as rotas foram exercitadas.
  - `id` inválido retorna 422 e cliente inexistente retorna 404.
  - Parcelamento sem taxa retorna 409.
  - Duas recusas bloqueiam o ajuste (`assinatura_redundante:video` saiu da lista).
  - A ação retorna `simulado: true`.
- Incidente: o token de dev expirou depois de 1 h (`RefreshError`) e as rotas que consultam o BigQuery deram 500. Reiniciar a API com um token novo resolveu. No Cloud Run isso não acontece, porque o serviço usa o SA.

---

## 8. Writes: tudo o que foi criado, alterado ou apagado

### 8.1 Sistema de arquivos local
- `git init` em `data_manager_itau/`. **Não houve commit.**
- Todos os arquivos listados em §6.1, cerca de 2.900 linhas sem contar o `uv.lock`, e o `.venv` criado pelo `uv sync`.
- Plano: `~/.claude/plans/jazzy-forging-moler.md`.
- Memória do Claude Code: `~/.claude/projects/-Users-joaovae-Documents-repositories-itau-data-manager-itau/memory/somente-leitura-bigquery.md` e a linha correspondente no `MEMORY.md` (regra: nada é gravado na base).
- Este arquivo.
- A config global de ADC **não** foi alterada.

### 8.2 GCP (projeto `batalha-time-04-z85x`)

| Recurso | Ação | Estado atual |
|---|---|---|
| Dataset `data_manager` (us-central1) | criado | existe |
| Tabelas `ref_categorias`, `stg_extrato`, `saldo_diario`, `recorrencias`, `perfil_mensal`, `ritmo_variavel`, `consumo_categoria`, `score_alerta`, `parametros`, `status_cliente`, `projecao_diaria`, `ajustes_sugeridos` | criadas pelo pipeline (CREATE OR REPLACE / WRITE_TRUNCATE) | existem |
| Views `contagem_estados`, `candidatos_demo` | criadas | existem |
| Dataset `data_manager_bt` + as mesmas tabelas e views (ref. 2025-10-15) | criado para o back-test | existe (descartável) |
| Tabelas `data_manager.memoria_eventos`, `data_manager.acoes_simuladas` | criadas; **um teste gravou 3 linhas + 1 linha** (2 recusas, 1 aceite, 1 ação) antes da instrução de somente leitura | **apagadas** (`bq rm`), e o SQL 09 foi removido do repositório |
| Tabela fonte `hackathon_dados.extrato_sintetico` | apenas lida | inalterada |
| Cloud Run / Cloud Build / Artifact Registry / IAM | nada foi feito | — |

Depois de "Nada será gravado na base, apenas leitura":
- A API passou a ser somente leitura. `MemoriaStore` ficou só em processo, sem `insert_rows_json`.
- O Cloud Run deve rodar com `max-instances=1` para a memória ser consistente, e ela se perde ao reiniciar.
- **Em aberto:** confirmar se o pipeline pode continuar gravando as tabelas derivadas em `data_manager`, que é o "status pré-calculado" do pedido original. Se não puder, a alternativa é calcular tudo na subida da API, só com leitura. O pipeline não foi executado depois dessa instrução.

### 8.3 Credenciais de desenvolvimento
O ADC da máquina faz impersonation de `cognitor-runtime@cognitor-joaovae.iam.gserviceaccount.com`, que não tem acesso ao projeto e dava `bigquery.jobs.create` negado. A solução foi `app/bq.py` aceitar `GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token)`, que usa a conta do gcloud CLI. O token vale 1 h.

---

## 9. Pendências e próximos passos
1. **Papéis do SA de execução** (pedir à organização): `bigquery.jobUser` no projeto, `bigquery.dataViewer` em `hackathon_dados` e `bigquery.dataEditor` em `data_manager` (só o job). Opcionalmente `run.developer`, para `/admin/pipeline`. Sem isso, o `deploy.sh` não funciona.
2. **Build da imagem não testado**, porque o Docker daemon está parado. Rodar `gcloud builds submit --config cloudbuild.yaml`.
3. **Confirmar a regra de somente leitura para o pipeline** (§8.2) e decidir se `data_manager_bt` pode ser apagado.
4. `TAXA_PARCELAMENTO_FATURA_MES`: informar a taxa real, senão a simulação continua retornando 409.
5. Decisões do escopo que o pipeline já responde:
   - Tamanho dos públicos: `contagem_estados`.
   - Corte do zero a zero: `CORTE_ZERO_A_ZERO`.
   - Clientes de demo: `candidatos_demo`.
   - O público "vai faltar" (1,3% a 3% da base) fica abaixo do corte de 5%. Isso precisa ser discutido no pitch; uma alternativa é avaliar a data de referência logo após o salário (momento 1).
6. Integração com o agente: importar `/openapi.json` como toolset e dar `roles/run.invoker` ao SA do agente (`SA_AGENTE` no `deploy.sh`).
7. Limitações a registrar para a banca:
   - A base é sintética, e os juros aparecem sem saldo negativo.
   - O saldo reconciliado cobre 98,7% dos dias.
   - As ações são simuladas.
   - A memória não persiste.
   - Firestore e Scheduler estão bloqueados no projeto.

## Adendo 2026-09-27: rota genérica `GET /v1/clientes/{id}/resumo-anual`
- Fallback do chat quando nenhuma tool específica responde. É um agregado dos últimos 12 meses: `meses` (reusa `evolucao_saldo`, meses=11), `categorias` (`resumo_anual_categorias.sql`), `principais_gastos` (top 15, `resumo_anual_estabelecimentos.sql`), `recorrencias` e `ultimas_transacoes` (20), com campos `formatado`.
- As 4 consultas rodam em paralelo, com cache em memória de 10 min por cliente. Medido para a Renata: ~1,1 s sem cache e ~20 mil caracteres.
- A lógica de `/recorrencias` foi para `servicos.recorrencias`, e cada item ganhou `formatado.valor_mensal` (campo novo, sem quebrar o contrato).
- Os valores atuais das assinaturas da Renata (Disney+ R$ 41,28, Globoplay R$ 40,88, Paramount+ R$ 25,91) somam os R$ 108,07 exibidos na demo.
