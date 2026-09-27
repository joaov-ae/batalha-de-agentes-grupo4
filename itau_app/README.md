# itau_app

Front end da demo (app Itaú em mockup de celular + Storybook do design system) com um BFF em Express
(`server.ts`) que fala com o Gemini e o BigQuery. Publicado no Cloud Run como **`itau-app`**.

```
Navegador (React + Vite + Tailwind)
   │  /api/*
   ▼
Cloud Run itau-app  (server.ts, Express; SA squad-agent-sa)
   ├─ /api/gemini/chat      → Gemini (Vertex AI, gemini-3.8-flash, location global)
   ├─ /api/transcribe       → Gemini: transcrição do áudio + intenção de Pix (JSON)
   ├─ /api/pix/contatos     → BigQuery hackathon_dados.extrato_sintetico_copy_copy
   ├─ /api/pix/saldo        → BigQuery (último saldo_apos da cliente demo)
   └─ /api/bigquery/extrato → BigQuery hackathon_dados.extrato_sintetico (últimas 100 transações)
```

## Funcionalidades principais

- **Chat Ia.i** (`src/features/banking/IaiChatScreen.tsx`): sugestões prontas, respostas do Gemini e
  mensagens de voz (o áudio aparece como balão; a transcrição fica nos bastidores).
- **Fluxo de Pix pelo chat** (`src/features/banking/PixFlow.tsx`): busca de contatos pelo nome →
  card de revisão → forma de pagamento → revisão → senha de 6 dígitos (simulada) → sucesso →
  comprovante na conversa com download em PNG. Bloqueia a transferência se o saldo ficar negativo.
- **Voz** (`src/features/banking/useVoiceInput.ts`): grava com MediaRecorder, converte para WAV 16 kHz e
  envia para `/api/transcribe`. Reserva: Web Speech API do navegador.

### Jornadas trazidas do protótipo do Vertex AI Studio (`src/features/studio/`)

- **Home** (`HubScreen`): saldo R$ 17.829,50 / limite R$ 28.000, card "R$ 10.000,00 a mais na conta!",
  metas com progresso "alcançado vs meta", pontos Itaú Shop e "+ Nova Missão".
- **Landing da ia.i** (`IaiLandingScreen`): termos + "Ativar e Analisar Tetos" → chat com resumo de tetos
  por categoria; "Agora não" → chat normal.
- **Metas e gamificação** (`MetaDetailScreen`): sugestões de investimento, aporte (debita a conta, entra no
  extrato) e pontos Itaú Shop (1,5 ponto por real).
- **Área Pix** (`PixModal`): Pix Copia e Cola / QR Code com alerta "vai comprometer sua renda mensal".
- **Simulador** (`WizardScreen`): Raio-X das fixas → lazer sem culpa → teto de transporte → resumo.
- No chat: criação de meta conversando, resumo de tetos, botões de ação e "Outras formas de Pix".
- Extrato: "Analisar com a ia.i" no detalhe do lançamento. Cartões: cartão virtual e bloqueio temporário.

Saldo, metas, pontos e lançamentos novos ficam no estado do `App.tsx` (compartilhados entre as telas, só na
sessão). O saldo vem de `/api/pix/saldo` (`MARIA_SALDO_FONTE=bigquery` usa o último `saldo_apos` da base).

## Dados

- Cliente demo "Maria" = `id_usuario 139aae21-0535-4a19-bbf2-d2b8f0c7a0d8` (saldo final R$ 1.744,32).
- A base não tem nomes de pessoas: o nome digitado é associado de forma determinística a 1–2 usuários
  reais que fazem Pix; banco, sobrenome e chave são gerados a partir do id (exemplo).
- Todas as consultas são fixas e parametrizadas (nada de SQL vindo do cliente).
- Sem acesso ao BigQuery, os endpoints caem em um snapshot da mesma tabela embutido no `server.ts`.

## Rodar localmente

Pré-requisito: Node.js 22.18+ (ou 24).

```bash
npm ci
npm run dev          # http://localhost:3000
```

Sem credenciais, o chat usa respostas de exemplo e o Pix usa o snapshot. Para usar o Gemini localmente,
defina `GEMINI_API_KEY` em `.env` (veja `.env.example`) ou `GEMINI_USE_VERTEX=true` com ADC configurado.

## Deploy

```bash
./deploy.sh                 # build no Cloud Build
BUILD=local ./deploy.sh     # build com Docker local + push
```

Variáveis opcionais: `PROJETO`, `REGIAO`, `TAG`, `SA`. Precisa rodar com a SA `squad-agent-sa`
(Vertex AI + BigQuery); com a SA default do Compute o app sobe, mas usa dados de exemplo.
