import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// 8 MB comporta até ~60 s de áudio WAV 16 kHz em base64 (/api/transcribe)
app.use(express.json({ limit: '8mb' }));

// Gemini: com GEMINI_API_KEY usa a Gemini API; no Cloud Run (K_SERVICE definido) sem chave,
// usa o Vertex AI autenticado pela conta de serviço do serviço (squad-agent-sa, roles/aiplatform.user).
// Localmente, sem chave nem GEMINI_USE_VERTEX=true, o chat cai nas respostas de exemplo.
const apiKey = process.env.GEMINI_API_KEY || '';
const useVertex = !apiKey && (!!process.env.K_SERVICE || process.env.GEMINI_USE_VERTEX === 'true');
const geminiEnabled = !!apiKey || useVertex;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const ai = useVertex
  ? new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT || 'batalha-time-04-z85x',
      location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
    })
  : new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

const SYSTEM_INSTRUCTION = `Você é a "Ia.i", a inteligência artificial do Banco Itaú no aplicativo mobile.
Seu tom é pessoal, transparente, consultivo, acolhedor e seguro, típico do Itaú Personnalité.

DADOS DA CLIENTE (Maria - MA):
- Perfil: Itaú Personnalité, Nível 4 no programa Minhas Vantagens.
- Salário líquido mensal: R$ 10.000,00
- Cartões: Personnalité Black Mastercard (final 9241).
- Contas fixas mensais: R$ 3.620,00 (moradia R$ 2.650, água/luz R$ 340, internet R$ 180, seguros R$ 450).
- Investimentos: Interesse em CDB 100% CDI com liquidez diária e previdência.
- Seguros: Cartão Protegido e Habitacional.
- Benefícios Minhas Vantagens: Nível 4 com anuidade grátis, cashback e benefícios de viagem.

OBJETIVO PRINCIPAL DESTE MÊS: Programar os gastos do mês com o salário na conta (Raio-X de contas fixas, limite de lazer sem culpa, divisão 50/30/20 e teto de transporte).

PIX E TRANSFERÊNCIAS: o app busca os contatos e chaves Pix automaticamente. Nunca peça chave Pix, CPF ou dados bancários. Se a cliente quiser enviar dinheiro e faltar o valor ou o nome, pergunte apenas o que falta (ex.: "Qual valor você quer enviar para a Jessica?").

Responda sempre em português brasileiro de forma clara e objetiva.`;

app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { messages, userMessage } = req.body;

    // Build chat contents
    const prompt = userMessage || (messages && messages[messages.length - 1]?.text) || 'Olá Ia.i!';

    if (!geminiEnabled) {
      // Graceful offline mock response if API key is not configured
      const lower = prompt.toLowerCase();
      let reply = '';
      let missionJson = null;

      if (lower.includes('raio-x') || lower.includes('raio x') || lower.includes('contas fixas')) {
        reply = `Com certeza, Maria! Preparei o Raio-X completo das suas contas fixas deste mês:

• **Moradia e condomínio:** R$ 2.650,00 (26,5%)
• **Energia elétrica e água:** R$ 340,00 (3,4%)
• **Internet e telefonia:** R$ 180,00 (1,8%)
• **Seguros (Cartão Protegido e Habitacional):** R$ 450,00 (4,5%)
• **TOTAL DE CONTAS FIXAS:** R$ 3.620,00 (36,2% da sua renda líquida)

💡 **Diagnóstico Ia.i:** Excelente! Suas despesas fixas estão bem abaixo do limite recomendado de 50%. Todas estão cadastradas no débito automático do Itaú, garantindo pontualidade e pontos no Minhas Vantagens!`;
      } else if (lower.includes('lazer') || lower.includes('sem culpa')) {
        reply = `Maria, com o seu salário na conta e as contas fixas já cobertas, calculamos sua margem de tranquilidade:

• **Teto recomendado para lazer e estilo de vida:** **R$ 2.000,00 no mês** (cerca de 20% do seu salário).
• **Sugestão de distribuição semanal:** R$ 500,00 por semana para restaurantes, bares, passeios e compras pessoais.

🔒 **Dica inteligente:** Ativei um aviso no seu Personnalité Black para te notificar quando você atingir 80% dessa meta. Assim você aproveita o mês com liberdade e zero culpa!`;
      } else if (lower.includes('divisão') || lower.includes('divisao') || lower.includes('essenciais') || lower.includes('salário') || lower.includes('salario')) {
        reply = `Perfeito, Maria! Estruturei a programação do seu salário seguindo a regra 50-30-20 personalizada para a sua realidade:

• **50% Gastos Essenciais (R$ 5.000,00):** Moradia, alimentação no supermercado, contas de consumo, saúde e transporte básico.
• **30% Estilo de Vida e Lazer (R$ 3.000,00):** Restaurantes, delivery, compras pessoais, passeios e cuidados.
• **20% Futuro e Reserva (R$ 2.000,00):** Aporte automático em CDB 100% CDI com liquidez diária e proteção FGC.

Deseja que eu programe o investimento automático de R$ 2.000,00 no dia que o seu salário cair?`;
      } else if (lower.includes('transporte') || lower.includes('teto')) {
        reply = `Ótimo planejamento, Maria! Analisei seu histórico de mobilidade dos últimos 90 dias:

• **Média histórica:** R$ 720,00/mês (combustível nos postos Ipiranga, Sem Parar e corridas por app).
• **Teto sugerido para este mês:** **R$ 750,00**.

Criei um controle inteligente de categoria ativo no app. Você receberá avisos em tempo real a cada abastecimento ou corrida no seu cartão Itaú!`;
      } else if (lower.includes('sabe sobre mim') || lower.includes('habitos') || lower.includes('hábitos') || lower.includes('sobre mim') || lower.includes('perfil')) {
        reply = `Seu perfil mostra que você tem uma rotina financeira bem estruturada e diversificada, Maria. Vou te contar um pouco sobre os principais pontos:

• **Preferências de investimento:** Você demonstra interesse em investir em CDB e já declarou esse objetivo. Isso mostra que você busca segurança e rentabilidade estável para o seu dinheiro.

• **Produtos e serviços:** Você tem dois cartões ativos, incluindo um Personnalité Black Mastercard, que oferece benefícios diferenciados. Além disso, você conta com um financiamento imobiliário vigente, o que indica planejamento de longo prazo.

• **Seguros:** Seu perfil inclui seguros importantes, como o Cartão Protegido e o Habitacional, que ajudam a proteger seu patrimônio e suas transações.

• **Benefícios disponíveis:** Você faz parte do programa Minhas Vantagens Nível 4 com anuidade grátis, cashback, experiências em viagens e descontos em parceiros.

Se quiser saber mais sobre algum desses pontos ou programar seu mês, é só me contar o que precisa.`;
      } else if (lower.includes('pix') || lower.includes('transferir') || lower.includes('transfere') || lower.includes('enviar dinheiro')) {
        reply = `Encontrei contatos frequentes salvos no seu aplicativo. Selecione para quem você deseja realizar a transferência Pix para conferirmos os dados no modal de decisão.`;
      } else {
        reply = `Olá, Maria! Sou a **ia.i**, sua assistente de inteligência financeira Itaú Personnalité. Como posso te apoiar hoje a programar os gastos do seu mês ou tirar dúvidas sobre seus investimentos?`;
      }

      if (missionJson) {
        reply += `\n\n\`\`\`json:mission\n${JSON.stringify(missionJson, null, 2)}\n\`\`\``;
      }

      return res.json({ text: reply });
    }

    // Call Gemini 3.8 Flash per guidelines
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const replyText = response.text || 'Desculpe, tive uma oscilação momentânea. Como posso ajudar com seus investimentos Itaú?';
    return res.json({ text: replyText });
  } catch (error) {
    console.error('Error in /api/gemini/chat:', error);
    return res.status(500).json({
      error: 'Falha ao processar solicitação de IA',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Endpoint: transcrição de áudio (voz → texto) com Gemini
// Sem GEMINI_API_KEY responde 503 e o front usa o reconhecimento de voz do navegador.
const ALLOWED_AUDIO_TYPES = ['audio/wav', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/flac'];

app.post('/api/transcribe', async (req: Request, res: Response) => {
  if (!geminiEnabled) {
    return res.status(503).json({ error: 'not_configured' });
  }

  const { audio, mimeType } = req.body || {};
  if (typeof audio !== 'string' || !audio || !ALLOWED_AUDIO_TYPES.includes(mimeType)) {
    return res.status(400).json({ error: 'Áudio inválido.' });
  }

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: audio } },
            {
              text:
                'Você recebe um áudio de uma cliente falando com a assistente do banco.\n' +
                '1) "texto": transcreva exatamente o que é falado, em português do Brasil, escrevendo valores em reais no formato "R$ 10". Se não houver fala, deixe vazio.\n' +
                '2) "pix": identifique se a cliente quer enviar dinheiro para alguém (Pix, transferência, "manda", "envia", "paga fulano" etc.). ' +
                'Se sim, preencha "ehPix": true, "valor" (número em reais, ou null se não disser) e "destinatario" (nome ou apelido da pessoa, sem artigo, ou null). ' +
                'Se não, "ehPix": false.',
            },
          ],
        },
      ],
      config: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            texto: { type: Type.STRING },
            pix: {
              type: Type.OBJECT,
              properties: {
                ehPix: { type: Type.BOOLEAN },
                valor: { type: Type.NUMBER, nullable: true },
                destinatario: { type: Type.STRING, nullable: true },
              },
              required: ['ehPix'],
            },
          },
          required: ['texto', 'pix'],
        },
      },
    });

    let parsed: { texto?: string; pix?: { ehPix?: boolean; valor?: number | null; destinatario?: string | null } } = {};
    try {
      parsed = JSON.parse(response.text || '{}');
    } catch {
      parsed = { texto: response.text || '' };
    }
    return res.json({
      text: (parsed.texto || '').trim(),
      pix: parsed.pix?.ehPix
        ? { valor: parsed.pix.valor ?? null, destinatario: parsed.pix.destinatario ?? null }
        : null,
    });
  } catch (error) {
    console.error('Error in /api/transcribe:', error instanceof Error ? error.message : error);
    return res.status(502).json({ error: 'Falha ao transcrever o áudio.' });
  }
});

// Helper to acquire Google Cloud authentication token from metadata server
async function getGcpAccessToken(): Promise<string | null> {
  try {
    const res = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
      headers: { 'Metadata-Flavor': 'Google' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      return data.access_token || null;
    }
  } catch (err) {
    console.warn('Metadata server unavailable or timed out:', err);
  }
  return null;
}

const DEFAULT_EXTRATO_FALLBACK = [
  {
    id: 'bq-1',
    data: '2026-05-03',
    descricao: 'Mercado Livre',
    estabelecimento: 'Mercado Livre',
    categoria: 'compras',
    valor: -470.25,
    tipo: 'debito',
    forma_pagamento: 'Cartão de crédito Itaú Click',
    conta_origem: '1226-09241',
  },
  {
    id: 'bq-2',
    data: '2026-05-03',
    descricao: 'Pagamento de Fatura Itaú',
    estabelecimento: 'Itaú Unibanco',
    categoria: 'pagamentos',
    valor: -1000.0,
    tipo: 'debito',
    forma_pagamento: 'Débito em Conta Corrente',
    conta_origem: '1226-09241',
  },
  {
    id: 'bq-3',
    data: '2026-05-03',
    descricao: 'Starbucks Coffee',
    estabelecimento: 'Starbucks',
    categoria: 'alimentacao',
    valor: -40.5,
    tipo: 'debito',
    forma_pagamento: 'Apple Pay • Cartão Click',
    conta_origem: '1226-09241',
  },
  {
    id: 'bq-4',
    data: '2026-05-02',
    descricao: 'Transferência Pix Recebida',
    estabelecimento: 'Carlos Alberto M.',
    categoria: 'pix',
    valor: 1500.0,
    tipo: 'credito',
    forma_pagamento: 'Pix',
    conta_origem: '1226-09241',
  },
  {
    id: 'bq-5',
    data: '2026-05-02',
    descricao: 'Posto Ipiranga Combustíveis',
    estabelecimento: 'Posto Ipiranga',
    categoria: 'transporte',
    valor: -245.8,
    tipo: 'debito',
    forma_pagamento: 'Cartão Personnalité Black',
    conta_origem: '1226-09241',
  },
  {
    id: 'bq-6',
    data: '2026-05-01',
    descricao: 'Crédito de Salário Itaú',
    estabelecimento: 'Empresa Empregadora S.A.',
    categoria: 'salario',
    valor: 10000.0,
    tipo: 'credito',
    forma_pagamento: 'TED Salário',
    conta_origem: '1226-09241',
  },
];

// Endpoint: BigQuery Status & Diagnostics
app.get('/api/bigquery/status', async (_req: Request, res: Response) => {
  const token = await getGcpAccessToken();
  const serviceAccount = 'ais-sandbox@ais-us-west2-f2e32972e0d046d4b.iam.gserviceaccount.com';
  const targetProject = 'batalha-time-04-z85x';
  const dataset = 'hackathon_dados';
  const table = 'extrato_sintetico';

  res.json({
    connected: !!token,
    hasToken: !!token,
    serviceAccount,
    targetProject,
    dataset,
    table,
    fullTableId: `${targetProject}.${dataset}.${table}`,
    consoleUrl: `https://console.cloud.google.com/bigquery?project=${targetProject}&ws=!1m6!1m5!4m3!1s${targetProject}!2s${dataset}!3s${table}!23sRESOURCE_LIST`,
    iamHelpUrl: `https://console.cloud.google.com/iam-admin/iam?project=${targetProject}`,
    requiredRoles: [
      'roles/bigquery.dataViewer',
      'roles/bigquery.jobUser',
      'roles/serviceusage.serviceUsageConsumer',
    ],
  });
});

// Endpoint: Get Extrato from BigQuery
app.get('/api/bigquery/extrato', async (req: Request, res: Response) => {
  const targetProject = 'batalha-time-04-z85x';
  const dataset = 'hackathon_dados';
  const table = 'extrato_sintetico';
  const fullTableId = `\`${targetProject}.${dataset}.${table}\``;
  const serviceAccount = 'ais-sandbox@ais-us-west2-f2e32972e0d046d4b.iam.gserviceaccount.com';

  try {
    const token = await getGcpAccessToken();
    if (!token) {
      return res.json({
        success: false,
        source: 'fallback',
        message: 'Credenciais do GCP não disponíveis no momento. Usando dados locais sincronizados.',
        serviceAccount,
        targetProject,
        table,
        data: DEFAULT_EXTRATO_FALLBACK,
      });
    }

    // Consulta fixa: não aceitar SQL vindo do cliente (endpoint público no Cloud Run).
    // Traz as últimas transações da cliente (Maria) já no formato que a tela de Extrato espera.
    const query = `
      SELECT
        FORMAT_TIMESTAMP('%Y-%m-%d', anomesdia) AS data,
        INITCAP(descr) AS descricao,
        nom_cate_macro AS estabelecimento,
        IF(REGEXP_CONTAINS(descr, r'^pix'), 'pix', IF(REGEXP_CONTAINS(descr, r'boleto'), 'boleto', LOWER(nom_cate_macro))) AS categoria,
        IF(tipo = 'E', vlr, -vlr) AS valor,
        IF(tipo = 'E', 'credito', 'debito') AS tipo,
        IF(REGEXP_CONTAINS(descr, r'^pix'), 'Pix', nom_cate_micro) AS forma_pagamento,
        saldo_apos
      FROM ${fullTableId}
      WHERE id_usuario = '139aae21-0535-4a19-bbf2-d2b8f0c7a0d8'
      ORDER BY anomesdia DESC
      LIMIT 100`;

    const bqResponse = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${targetProject}/queries`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Goog-User-Project': targetProject,
      },
      body: JSON.stringify({
        query,
        useLegacySql: false,
        maxResults: 100,
      }),
    });

    const bqData = await bqResponse.json();

    if (!bqResponse.ok || bqData.error) {
      console.warn('BigQuery query error response:', bqData.error);
      return res.json({
        success: false,
        source: 'cached_fallback',
        error: bqData.error?.message || 'Permissão pendente no IAM do projeto BigQuery.',
        code: bqData.error?.code || 403,
        serviceAccount,
        targetProject,
        table,
        requiredRoles: [
          'roles/bigquery.dataViewer',
          'roles/bigquery.jobUser',
          'roles/serviceusage.serviceUsageConsumer',
        ],
        iamConsoleUrl: `https://console.cloud.google.com/iam-admin/iam?project=${targetProject}`,
        data: DEFAULT_EXTRATO_FALLBACK,
      });
    }

    // Process BigQuery columns and rows
    const fields = bqData.schema?.fields?.map((f: any) => f.name) || [];
    const rows = (bqData.rows || []).map((row: any, idx: number) => {
      const item: Record<string, any> = { id: `bq-${idx + 1}` };
      row.f?.forEach((col: any, colIdx: number) => {
        const fieldName = fields[colIdx] || `col_${colIdx}`;
        item[fieldName] = col.v;
      });
      return item;
    });

    return res.json({
      success: true,
      source: 'bigquery',
      serviceAccount,
      targetProject,
      dataset,
      table,
      totalRows: rows.length,
      data: rows.length > 0 ? rows : DEFAULT_EXTRATO_FALLBACK,
    });
  } catch (err: any) {
    console.error('Failed to query BigQuery:', err);
    return res.json({
      success: false,
      source: 'fallback',
      error: err.message,
      data: DEFAULT_EXTRATO_FALLBACK,
    });
  }
});

// ================= Pix: contatos e saldo =================
// Base: batalha-time-04-z85x.hackathon_dados.extrato_sintetico_copy_copy
// A base não tem nomes de pessoas (só id_usuario + transações), então o nome digitado
// é associado de forma determinística a usuários reais da base que fazem Pix.
// Banco, sobrenome e chave são gerados a partir do id para servir de exemplo.
const PIX_PROJECT = 'batalha-time-04-z85x';
const PIX_TABLE = '`batalha-time-04-z85x.hackathon_dados.extrato_sintetico_copy_copy`';
const MARIA_ID_USUARIO = '139aae21-0535-4a19-bbf2-d2b8f0c7a0d8';
const MARIA_SALDO_SNAPSHOT = 1744.32;
const MARIA_LIMITE_CONTA = 16455;

// Snapshot de usuários da base com "pix transf" (usado quando o BigQuery não está acessível)
const PIX_USERS_SNAPSHOT = [
  'c5f1fac5-0c17-4ef7-b297-d90193d8dc52', 'fef1430b-63e6-4890-bc35-43edc700bede', '57945a5c-404b-423d-afdc-4192ed6a9ca9',
  '023be4d5-c227-4a15-9c95-18aa07428c84', '975b3928-d2e9-488b-ba5d-a68a5ad21ab9', '3a14e205-0e1f-44c9-9c5e-b0d3f2e7b650',
  '720b1229-a817-4f14-9f4f-2205a68aea89', 'fdd730a8-7556-404d-9492-02344e55fc5e', 'b310042f-09c6-4136-bcf0-5002581513e8',
  'a5b21e1b-0957-476c-af2e-0fb5e8e66963', 'c41d926e-45e4-4852-8d25-5c5962142896', '0f8a865a-02d7-4a61-b26c-05a652328278',
  '9b382ad4-77b9-421d-a508-3013f71315ff', 'c234872d-4fe8-4645-b1ee-a1189ee8abf9', '707f9f4d-ed47-4c8d-97c4-b1d75cd1085f',
  'c2e31e04-bba5-479d-bbf8-cd4882f40a5e', '3651e65c-646f-41bc-b4c1-f39aa31f5260', '815f43b9-dbeb-44b7-ad0d-83937f4379ad',
  '5795370d-387c-494d-850c-4ecf38a11c73', '92de428a-4088-4842-8004-f55dd4c2fbe6', 'dd2f2984-fc24-456a-9e5c-7494d099417e',
  '5ec09ac2-085c-4124-a0e8-5f9157dd8f33', 'a4d5b5c1-fb9c-499c-a6f1-6e38b81ad53c', '9a17087e-e999-4878-a03c-6de65b832543',
  '6070ee47-5c83-4fa7-8b19-f61a363fdf55', 'e54b8466-5dd4-4a53-8d75-1f7f6d708de9', 'fd37e469-0669-44e4-92f6-ddf5880701c4',
  '06373f57-02c9-425e-84c7-cdde969b1e0c', '5865ce27-0681-4dcc-9475-3df9d15a6858', '258bf045-e201-4b2c-adc3-7caf08828ec1',
  'c38dadbe-90bc-4dac-be15-c7ef6cf71218', 'aa2bbdc9-3094-413c-80a6-161728688278', '982cf94a-3bb5-4e2f-8fea-401062b8cf5e',
  '9da91034-a27b-4efe-a867-06c68b8bf431', '1ffc64c4-b635-47c6-91aa-8072c423f690', 'b78fc3bd-ed29-4f14-b312-178c9f2e0076',
  'd079c542-5b38-4971-bbc7-08f7ee26f35f', '1d127488-473e-486a-8642-58af6d31e347', '37fd7afa-c4c5-495f-ad6a-420af2534d07',
  '738ed844-05f2-4cc8-9628-547466af7716', '1b37ec07-e6ac-49f1-908a-db076cf796f1', 'fd3a71b4-0013-4865-a963-48f1e99d6a45',
  'ee5722fd-d114-43b7-866a-349b89072f34', '3495d7e5-fbe7-4322-a124-3bf0373a0e2d', '5d8309af-0f7a-48de-be52-999c24605a38',
  'b16b69ea-e96f-4f65-b022-2c3906e271b3', '94300a93-e348-4653-88fd-7e1ce5c59eb1', '3b14db9e-2c34-45c2-b54b-da6d59974a3b',
  'e02e1ec6-8cc9-4e4d-bbb7-2d4e87885d9b', '9e220b31-2359-46e7-8834-514ea186129e', '595db4d9-ce6b-45bf-98f4-61bce252e85f',
  '898abd5f-b0a3-47b3-9587-a52d401c30c5', 'c2f02d79-6c6a-421f-9d56-d754c6f379af', 'e104a14f-54c3-4c11-af93-0d9d5dd576d8',
  'cfbe5177-1fbd-4756-838e-5e6ff0180973', '64573257-64d1-49da-a48d-df5433c89b8b', '44aabc09-6d2d-4dad-b2e8-79ad03c84896',
  '94e7adb1-59f6-49cb-9619-c21323c66dc5', 'd516514c-59c9-4dff-8794-cdf8aa4200a0', '8077a09d-c131-417c-8700-5b71160c62c6',
  'a2fceb19-0ec6-40cd-8b7c-8c4a7cf3d8e1', '7c4ca7e3-a6a7-42fa-a848-a6d885933534', '73b29468-13d8-4f10-bd40-0742d306a8cb',
  'da67d5c3-c59b-49ba-aa05-b9e712592eac', '949e7bd3-9e03-4cbb-a434-ef278755fcd6', '02123dba-723a-4b1c-81da-e6ba635672fc',
  '3852707f-696d-4c85-b95a-6d5559841031', '1ed14e8d-feae-4d4f-9ba3-3335efdd363e', 'd664e23e-0c4a-4350-b466-c16b68f01d0c',
  '05fe999e-d0ef-4016-9865-ea978e0c99a7', '56e47600-db82-4f1d-bbdc-c15e7e787f93', '948b9f3c-8376-4cc7-a342-53ce6db77aae',
  'a8dd225b-edd7-4703-b3c2-de73a2b1098e', '60d9fb9c-696a-4a9d-9c04-780cf7d3b557', 'db78717c-b2bc-4da1-b585-5eb8d076fc98',
  'bb82ed0e-a2db-4ce6-8031-122eae75c3f4', '52ebecc0-7602-413a-973f-74e3f795a6f9', 'f65c7c7c-0ff2-4ff3-9efb-a07e2c5dfd84',
  'fe99aefe-0846-4ed0-9cda-8254732664e1', '3ee3197f-d233-4bbf-8d9b-270d35850c42',
];

const PIX_BANKS = [
  { nome: 'Banco Inter', codigo: '077', sigla: 'inter', cor: '#FF7A00', corTexto: '#FFFFFF' },
  { nome: 'Santander', codigo: '033', sigla: 'S', cor: '#EC0000', corTexto: '#FFFFFF' },
  { nome: 'Nubank', codigo: '260', sigla: 'nu', cor: '#820AD1', corTexto: '#FFFFFF' },
  { nome: 'Bradesco', codigo: '237', sigla: 'B', cor: '#CC092F', corTexto: '#FFFFFF' },
  { nome: 'Banco do Brasil', codigo: '001', sigla: 'BB', cor: '#FCF800', corTexto: '#0038A8' },
  { nome: 'Caixa Econômica Federal', codigo: '104', sigla: 'CX', cor: '#005CA9', corTexto: '#FFFFFF' },
  { nome: 'C6 Bank', codigo: '336', sigla: 'C6', cor: '#242424', corTexto: '#FFFFFF' },
  { nome: 'PicPay', codigo: '380', sigla: 'PP', cor: '#21C25E', corTexto: '#FFFFFF' },
];

const PIX_SOBRENOMES = [
  'COSTA DE SOUZA', 'OLIVEIRA SANTOS', 'PEREIRA LIMA', 'ALMEIDA ROCHA', 'FERREIRA GOMES',
  'RIBEIRO CARVALHO', 'MARTINS ARAUJO', 'BARBOSA NUNES', 'CARDOSO MOREIRA', 'TEIXEIRA DIAS',
];

// FNV-1a 32 bits: mesmo nome + mesmo id sempre geram o mesmo contato
function pixHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function normalizePixName(raw: unknown): string {
  // "Jéssica" e "Jessica" devem achar os mesmos contatos
  const first = String(raw || '').trim().split(/\s+/)[0] || '';
  return first.normalize('NFD').replace(/[^\p{L}]/gu, '').slice(0, 30).toUpperCase();
}

function buildPixContact(idUsuario: string, nome: string, idx: number, origem: string, usedBanks: Set<number>) {
  const h = pixHash(`${idUsuario}:${nome}`);
  let bankIdx = h % PIX_BANKS.length;
  while (usedBanks.has(bankIdx)) bankIdx = (bankIdx + 1) % PIX_BANKS.length;
  usedBanks.add(bankIdx);
  const bank = PIX_BANKS[bankIdx];
  const d3 = (shift: number) => String((h >>> shift) % 1000).padStart(3, '0');
  const documento = `***.${d3(3)}.${d3(13)}-**`;
  const tipos = ['CPF', 'Celular', 'E-mail', 'Chave aleatória'];
  const tipoChave = tipos[(h >>> 5) % tipos.length];
  const hex = h.toString(16).padStart(8, '0');
  const chave =
    tipoChave === 'CPF'
      ? documento
      : tipoChave === 'Celular'
        ? `(11) 9${d3(7).slice(0, 2)}**-**${String(h % 100).padStart(2, '0')}`
        : tipoChave === 'E-mail'
          ? `${nome.charAt(0).toLowerCase()}***${hex.slice(0, 2)}@${['gmail.com', 'hotmail.com', 'outlook.com'][h % 3]}`
          : `${hex}-****-****-****-********${hex.slice(-4)}`;

  return {
    id: `${idUsuario}-${idx}`,
    idUsuario,
    nome: `${nome} ${PIX_SOBRENOMES[(h >>> 8) % PIX_SOBRENOMES.length]}`,
    primeiroNome: nome.charAt(0) + nome.slice(1).toLowerCase(),
    documento,
    banco: bank.nome,
    codigoBanco: bank.codigo,
    sigla: bank.sigla,
    cor: bank.cor,
    corTexto: bank.corTexto,
    tipoChave,
    chave,
    origem,
  };
}

let cachedGcpToken: { value: string | null; expires: number } | null = null;
async function getCachedGcpToken(): Promise<string | null> {
  if (cachedGcpToken && cachedGcpToken.expires > Date.now()) return cachedGcpToken.value;
  const value = await getGcpAccessToken();
  // Token válido por ~1h; se não houver metadata server (ambiente local), evita novas tentativas por 5 min
  cachedGcpToken = { value, expires: Date.now() + (value ? 30 : 5) * 60 * 1000 };
  return value;
}

async function runPixQuery(query: string, params: Record<string, string | number>): Promise<any[][]> {
  const token = await getCachedGcpToken();
  if (!token) throw new Error('Sem credenciais GCP');

  const queryParameters = Object.entries(params).map(([name, value]) => ({
    name,
    parameterType: { type: typeof value === 'number' ? 'INT64' : 'STRING' },
    parameterValue: { value: String(value) },
  }));

  const res = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${PIX_PROJECT}/queries`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': PIX_PROJECT,
    },
    body: JSON.stringify({ query, useLegacySql: false, parameterMode: 'NAMED', queryParameters, timeoutMs: 8000 }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || `BigQuery HTTP ${res.status}`);
  return (data.rows || []).map((row: any) => row.f.map((col: any) => col.v));
}

// Endpoint: contatos Pix para um nome digitado no chat
app.get('/api/pix/contatos', async (req: Request, res: Response) => {
  const nome = normalizePixName(req.query.nome);
  if (!nome) return res.status(400).json({ error: 'Informe o nome do destinatário.' });

  // 1 ou 2 chaves por nome (como no app real, a mesma pessoa pode ter chaves em bancos diferentes)
  // A maioria dos nomes traz 2 chaves; ~1 em 5 (ex.: Carlos, Bruno) traz só 1
  const quantidade = pixHash(nome) % 5 === 3 ? 1 : 2;
  let ids: string[] = [];
  let origem = 'bigquery';

  try {
    const rows = await runPixQuery(
      `SELECT id_usuario FROM ${PIX_TABLE}
       WHERE REGEXP_CONTAINS(descr, r'pix transf') AND id_usuario != @maria
       GROUP BY id_usuario
       ORDER BY FARM_FINGERPRINT(CONCAT(id_usuario, @nome))
       LIMIT @n`,
      { maria: MARIA_ID_USUARIO, nome, n: quantidade },
    );
    ids = rows.map((r) => r[0]);
  } catch (err) {
    console.warn('Pix contatos: BigQuery indisponível, usando snapshot.', err instanceof Error ? err.message : err);
    origem = 'snapshot';
    ids = [...PIX_USERS_SNAPSHOT]
      .sort((a, b) => pixHash(`${a}${nome}`) - pixHash(`${b}${nome}`))
      .slice(0, quantidade);
  }

  // Nome sem correspondência na base: cria uma conta Pix de exemplo em outro banco
  if (ids.length === 0) {
    origem = 'exemplo';
    ids = [`exemplo-${pixHash(nome).toString(16)}`];
  }

  const usedBanks = new Set<number>();
  const contatos = ids.map((id, idx) => buildPixContact(id, nome, idx, origem, usedBanks));
  return res.json({ nome, origem, contatos });
});

// Endpoint: saldo em conta da cliente (último saldo_apos da base)
app.get('/api/pix/saldo', async (_req: Request, res: Response) => {
  try {
    const rows = await runPixQuery(
      `SELECT saldo_apos FROM ${PIX_TABLE} WHERE id_usuario = @id ORDER BY anomesdia DESC LIMIT 1`,
      { id: MARIA_ID_USUARIO },
    );
    const saldo = rows.length ? Number(rows[0][0]) : MARIA_SALDO_SNAPSHOT;
    return res.json({ saldo, limiteConta: MARIA_LIMITE_CONTA, origem: 'bigquery', idUsuario: MARIA_ID_USUARIO });
  } catch (err) {
    console.warn('Pix saldo: BigQuery indisponível, usando snapshot.', err instanceof Error ? err.message : err);
    return res.json({ saldo: MARIA_SALDO_SNAPSHOT, limiteConta: MARIA_LIMITE_CONTA, origem: 'snapshot', idUsuario: MARIA_ID_USUARIO });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
