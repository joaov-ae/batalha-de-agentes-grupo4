# Sessão 2026-09-26/27 — itau_app (front end da demo)

Registro das decisões tomadas ao publicar o front end no Cloud Run. Código em `itau_app/`.

## Origem

- Protótipo exportado do Google AI Studio ("Itaú Banking & Design System Storybook"): React + Vite +
  Tailwind com um servidor Express (`server.ts`). Não é só estático: o servidor expõe as APIs `/api/*`.

## Deploy

- Serviço Cloud Run `itau-app`, região `us-central1`, público (`--allow-unauthenticated`).
  URL: https://itau-app-313377205892.us-central1.run.app
- Imagem no repositório Artifact Registry `agentes` (us-central1). Nossa conta não pode criar
  repositórios nem habilitar APIs, então `gcloud run deploy --source` não funciona; usamos build Docker + push.
- Roda com a SA `squad-agent-sa` (a mesma do `data-manager-itau`): tem `aiplatform.user` e `bigquery.jobUser`.
  Com a SA default do Compute, BigQuery e Vertex AI retornam 403 e o app usa dados de exemplo.

## Decisões

- **Segurança**: o endpoint de extrato aceitava `?sql=` e executava SQL arbitrário com a SA. Removido;
  todas as consultas são fixas e parametrizadas.
- **Gemini sem chave**: no Cloud Run usa Vertex AI (`gemini-3.8-flash`, location `global`; em
  `us-central1` o modelo retorna 404). `GEMINI_API_KEY`, se definida, tem prioridade.
- **Pix pelo chat**: a base `hackathon_dados` não tem nomes. O nome digitado mapeia de forma
  determinística para 1–2 `id_usuario` que fazem "pix transf"; banco/sobrenome/chave são gerados do id.
  Cliente demo "Maria" = `139aae21-0535-4a19-bbf2-d2b8f0c7a0d8` (saldo R$ 1.744,32, perto dos R$ 1.800 do
  protótipo). Saldo insuficiente → mostra o saldo negativo e bloqueia todas as formas de pagamento.
- **Voz**: o áudio é enviado como mensagem (balão), sem mostrar o texto durante a gravação. O Gemini
  devolve transcrição + intenção de Pix (valor, destinatário) em JSON, porque frases como
  "faz uma transferência…" ou "manda 20 reais…" não eram reconhecidas por palavra-chave e caíam no chat
  geral, que pedia a chave Pix. Cloud Speech-to-Text não está habilitado no projeto.
- **Extrato**: com o BigQuery ao vivo, a consulta passou a trazer as 100 transações mais recentes da Maria
  já no formato da tela (`data`, `descricao`, `valor`, `categoria`...).

## Integração do protótipo do Vertex AI Studio (Build)

- Fonte: prompt salvo `5379879883260297216` (bucket `cloud-ai-platform-066165bc-…/prompt-data/`), que guarda a
  conversa e o código (`app_builder_data.code_repository_state`). O app do Studio não tem backend (Gemini
  chamado no navegador com chave) e usa dados fixos; por isso as telas foram trazidas para cá, e não publicadas.
- Onde os dois divergiam, ficou: botão flutuante em **3 s** com transição (pedido mais recente); Pix por
  contato com o fluxo completo daqui (senha, comprovante, saldo insuficiente); Pix Copia e Cola/QR com o
  fluxo do Studio (alerta de renda → volta à Home).
- Saldo **R$ 17.829,50** e limite **R$ 28.000** (valores pedidos no Studio), iguais em Home, Extrato e Pix.
  Nenhum usuário da base tem esse saldo exato (o mais próximo: R$ 17.765,74).
- Correções junto: extrato não recalculava a lista quando os dados do BigQuery chegavam (dependência
  faltando no `useMemo`); "20 mil" era lido como R$ 20.

## Jornada "plano do mês no dia do salário" (protótipo `prototipo-iai`)

- A demo precisa de um cliente que feche o mês no negativo; a "Maria" passou a ser o cliente real
  `d6c59567` (estado `vai_faltar` no data_manager): saldo R$ 3.776,24, fecha em −R$ 883,22 em 6/1, salário em 7/1.
  Saldo, extrato e contatos usam esse cliente. Textos de persona (salário R$ 10.000, metas) não mudaram.
- O corte de streaming (ficar só com o Globoplay) **não resolve** para esse cliente (−R$ 844,71); reagendar o
  Pix de R$ 962,77 de 6/1 para 7/1 resolve (+R$ 79,55). O texto se adapta aos números (`resolve` de cada ajuste).
- **Próximo mês fica negativo** (−R$ 517,17): as saídas recorrentes (R$ 7.687,30) superam as entradas
  (R$ 7.383,22). O protótipo pede para conferir isso; a proposta mostra em vermelho com a explicação.
- Sem dados de Cofrinho na base: a 2ª alternativa virou "deixar o limite da conta cobrir" (juros do data_manager).
- Destinatário do Pix não tem nome na base ("pix transf terc"): aparece como "Pix agendado (transferência)" e o
  card "Avisar quem recebe" abre o compartilhamento do celular (`navigator.share`).
- Cards fora do caminho da demo mostram o aviso do protótipo e registram `path_not_in_demo`.

## Pendências / ideias

- O áudio gravado só existe na sessão do navegador (não é salvo).
- Saldo e limites descontados após um Pix são só da sessão (recarregar volta ao valor da base).
