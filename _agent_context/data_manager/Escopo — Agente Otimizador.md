# Escopo — Agente Otimizador

Sep 26, 2026 · @Carolina Siqueira

O agente mostra ao cliente se o dinheiro chega até o próximo salário e, quando não chega, oferece o menor ajuste que resolve, executável em um toque.

## Objetivo e hipótese

Reduzir a entrada no limite da conta de quem ainda tem saldo, mas vai ficar sem dinheiro antes do salário.

**Hipótese:** avisar o cliente com projeção de saldo negativa no dia do salário e no Pix ou compra que estoura o mês, oferecendo um ajuste executável, reduz a entrada no limite e os juros pagos.

**Por que agir aqui:** na base, o saldo começa a cair cerca de 3 meses antes do primeiro negativo (71,8% dos casos contra 12,1% de quem nunca negativa). Queda de renda não antecipa o negativo (3,4% contra 3,1%), então o problema é a erosão do saldo mês a mês, não um choque de renda.

**Valor para o banco:** menos clientes presos no limite hoje é menos risco de crédito e renegociação amanhã, além de mais retenção e principalidade.

## Público e regra de entrada

O cliente é classificado por uma conta determinística: projetar o saldo até o próximo salário (saldo de hoje + entradas previstas − contas fixas − fatura − parcelas − gasto variável no ritmo dos últimos 3 meses).

| Estado | Regra | O que o agente faz |
| --- | --- | --- |
| Vai faltar | Saldo hoje positivo, projeção negativa antes do salário | Aviso + ajustes (público principal) |
| Zero a zero | Projeção entre zero e 10% da renda | Reserva automática no dia do salário |
| Fecha bem | Projeção acima de 10% da renda | Mensagem curta com a sobra e convite para guardar em algum investimento do banco.&#32; |
| Já está no buraco | No limite hoje, ou 3 meses ou mais no vermelho | Não otimiza: reconhece e encaminha para atendimento |

O score de alerta (6 sinais nos últimos 3 meses) serve de reforço: score 4 ou mais antecipa o aviso do meio do mês. Hoje são 133 clientes em alerta (65 alto, 68 médio).

## Momentos de atuação

O agente fala em dois momentos no MVP. O terceiro entra só se sobrar tempo.

| # | Gatilho | Jornada | Mensagem-núcleo | No MVP? |
| --- | --- | --- | --- | --- |
| 1 | Salário cai na conta | Recebimento | "Sobram R$ X até o dia 5, ou R$ Y por dia. No ritmo atual, acaba no dia 26. Estes ajustes resolvem." | Sim |
| 2 | Pix ou compra que deixa a projeção negativa | Pix e compras | "Com esse pagamento, sua conta fica negativa no dia 22, cerca de R$ X de juros. Agendar para o dia 5?" | Sim |
| 3 | Gasto do mês sai da curva prevista | Acompanhamento | "No ritmo desta semana, o dinheiro acaba 4 dias antes." | Se sobrar tempo |

Foram descartados como gatilho: abertura do app sem contexto e notificações semanais genéricas, porque não há decisão acontecendo nesses momentos.

## Dentro do escopo

**O que o agente calcula (regra, sem LLM)**

- Separação do extrato em recorrente (salário, contas fixas, assinaturas, parcelas, fatura) e variável
- Projeção de saldo dia a dia até o próximo salário e o dia em que o dinheiro acaba
- Classificação do mês (tabela acima) e score de alerta
- Custo estimado em reais de entrar no limite

**Que ajustes ele pode sugerir (só três tipos, todos visíveis no extrato)**

1. Assinaturas redundantes: 2 ou mais serviços da mesma categoria (152 clientes com 2+ de música, 272 com 3+ de vídeo)
2. Mudança de data: agendar um Pix, pagamento ou compra para depois do salário
3. Gasto discricionário acima da média do próprio cliente, sempre comparado com ele mesmo e nunca com outras pessoas

Cada ajuste vem com o impacto em dias ("dá mais 3 dias"), e a lista é ordenada pelo menor esforço para o cliente.

**O que ele executa com um toque**

- Agendar Pix ou pagamento
- Separar reserva no dia do salário
- Criar um lembrete de teto de gasto
- Mostrar a simulação de parcelar a fatura, quando parcelar sai mais barato que o limite

**O que ele lembra**

Ajustes aceitos e recusados, o resultado do mês anterior (chegou ou não ao salário sem usar o limite) e a meta de reserva.

## Fora do escopo

| Fica de fora | Por quê |
| --- | --- |
| Plano de saída para quem já está no buraco | Exige crédito, renegociação e atendimento humano; o agente só reconhece e encaminha |
| Recomendação de investimentos | Exige suitability e não é a dor escolhida; vira próximo passo no pitch |
| Oferta de crédito novo | Conflita com o objetivo de tirar o cliente do limite |
| Cancelar assinatura por ele | O banco não cancela o serviço; o agente aponta a redundância e leva ao caminho |
| Bloquear transações | A decisão é sempre do cliente |
| Dicas genéricas de educação financeira | O desafio veta recomendações genéricas |
| Gastos em outros bancos | A base só tem o extrato de uma conta |

## Regras de comportamento

- **Não julga.** Fala de números e datas ("acaba no dia 26"), nunca de hábitos ("você gasta demais com delivery").
- **Não decide pelo cliente.** Toda sugestão tem a opção "agora não", e o Pix nunca é bloqueado.
- **Não insiste.** Um ajuste recusado duas vezes sai da lista daquele cliente.
- **Não inventa números.** Todo valor na fala vem do cálculo por regra; o LLM só redige.
- **Linguagem simples.** Frases curtas, sem termos técnicos ("limite da conta", não "cheque especial"), com leitura acessível para diferentes níveis de letramento.
- **Reconhece o próprio limite.** Com o cliente já no buraco, ou quando ele pede algo fora do escopo, o agente diz que não é com ele e oferece atendimento humano.
- **Frequência controlada.** No máximo um aviso proativo por momento, sem notificação repetida no mesmo dia.

## Dados e componentes

| Componente | O que faz | Tecnologia |
| --- | --- | --- |
| Base de extrato | 467.585 transações de 1.000 clientes em 2025 | BigQuery (`hackathon_dados.extrato_sintetico`) |
| Motor de recorrência | Identifica salário, contas fixas, assinaturas e parcelas | SQL e regras |
| Motor de projeção | Calcula o saldo dia a dia, o dia em que acaba, o estado e o score | Python ou SQL, determinístico |
| Gerador de ajustes | Lista os ajustes possíveis com o impacto em dias | Regras |
| Agente conversacional | Redige e conversa a partir dos números prontos, sem calcular | LLM do ecossistema Google, com ferramentas |
| Memória do cliente | Estado do mês, ajustes aceitos e recusados, meta de reserva | Armazenamento por cliente |
| Ações | Agendar Pix, separar reserva, lembrete | Simuladas no protótipo |

No protótipo, as ações são simuladas e isso deve ser dito explicitamente à banca.

## Métricas de sucesso

| Tipo | Métrica | Linha de base na base |
| --- | --- | --- |
| Principal | % de clientes que chegam ao próximo salário sem usar o limite | Negativados por mês: 123 em jan, 203 em out |
| Principal | Taxa de entrada no negativo por cliente-mês | 1,8% |
| Impacto | Juros de limite pagos no ano | Mediana de R$ 850 (quem negativa) contra R$ 137 |
| Engajamento | % de avisos com um ajuste aceito | Sem base: medir no piloto |
| Guardrail | Taxa de desativação das notificações | Sem base: medir no piloto |

O teste recomendado é um A/B com os clientes em alerta: metade recebe o agente e metade não, comparando a taxa de entrada no negativo após 3 meses.

## Decisões em aberto

- [ ] Rodar a regra de projeção na base e contar quantos clientes caem em cada estado (esse é o tamanho do público no pitch)
- [ ] Confirmar o corte do "zero a zero" (10% da renda é uma sugestão) e descartar qualquer estado com menos de 5% da base
- [ ] Escolher os 2 clientes reais da base para o protótipo: um "vai faltar" com assinatura redundante e um "zero a zero"
- [ ] Definir o canal do aviso (notificação push, tela do Pix, chat no app)
- [ ] Preparar a resposta para "por que o Itaú reduziria a receita de juros de limite?", com um número público de custo de inadimplência
- [ ] Registrar as limitações da base: é sintética, tem 70% de clientes com financiamento imobiliário (acima da realidade) e o AUC de 0,93 provavelmente está inflado
