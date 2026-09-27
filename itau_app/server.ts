import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import fs from 'fs';
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

// Instrução do Gemini montada com o perfil real da cliente (ver montarPerfilCliente)
function montarSystemInstruction(p: PerfilCliente): string {
  const fixas = p.fixas.grupos.map((g) => `${g.nome} ${fmtBRL(g.valor)}`).join(', ');
  const tetos = p.tetos.map((t) => `${t.categoria} ${fmtBRL(t.valor)} (${t.percentual.toFixed(1)}%)`).join('; ');
  return `Você é a "Ia.i", a inteligência artificial do Banco Itaú no aplicativo mobile.
Seu tom é pessoal, transparente, consultivo, acolhedor e sem julgamento, típico do Itaú Personnalité.

DADOS DA CLIENTE (${p.nome} - ${p.iniciais}), calculados sobre o extrato real:
- Perfil: ${p.segmento}, Nível ${p.nivel} no programa Minhas Vantagens.
- Renda mensal recorrente: ${fmtBRL(p.renda.mensal)} (salário de ${fmtBRL(p.renda.salario)}, que caiu hoje, + ${fmtBRL(p.renda.outras)} de outras entradas recorrentes).
- Saldo em conta corrente: ${fmtBRL(p.saldoHoje)}; limite da conta: ${fmtBRL(p.limiteConta)}.
- Despesas fixas: ${fmtBRL(p.fixas.total)}/mês (${p.fixas.percentualRenda.toFixed(1)}% da renda): ${fixas}. Sobram ${fmtBRL(p.sobraAposFixas)} (${p.sobraAposFixasPct.toFixed(1)}% da renda).
- Fatura do cartão: cerca de ${fmtBRL(p.faturaCartao)}/mês.
- Situação do mês: se nada mudar, fecha o ciclo com ${fmtBRL(p.situacao.saldoVesperaSalario)} na véspera do próximo salário (${p.situacao.proximoSalario}). A renda cobre as despesas médias, mas não sobra margem: um gasto fora do planejado leva a conta ao negativo.
- Histórico: ficou no negativo em ${p.historico.mesesNoNegativo} dos ${p.historico.meses} meses (${p.historico.quais.join(', ')}).
- Tetos sugeridos por categoria: ${tetos}.
- Nunca invente valores em reais: use apenas os números acima ou os que vierem na pergunta.
- Metas ativas no app: Comprar uma casa, Comprar Carro Novo e Chegada do Bebê (ganha 1,5 ponto Itaú Shop por real aportado).

PIX E TRANSFERÊNCIAS: o app busca os contatos e chaves Pix automaticamente. Nunca peça chave Pix, CPF ou dados bancários. Se a cliente quiser enviar dinheiro e faltar o valor ou o nome, pergunte apenas o que falta (ex.: "Qual valor você quer enviar para a Jessica?").

Responda sempre em português brasileiro de forma clara e objetiva, chamando a cliente de ${p.primeiroNome}.`;
}

app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { messages, userMessage } = req.body;

    // Build chat contents
    const prompt = userMessage || (messages && messages[messages.length - 1]?.text) || 'Olá Ia.i!';

    const perfil = await montarPerfilCliente();

    if (!geminiEnabled) {
      // Sem Gemini (ex.: rodando local sem credenciais): resposta de exemplo com os números reais do perfil
      return res.json({
        text:
          `Olá, ${perfil.primeiroNome}! Sou a **ia.i**. Sua renda recorrente é de **${fmtBRL(perfil.renda.mensal)}** e as despesas fixas somam ` +
          `**${fmtBRL(perfil.fixas.total)}** (${perfil.fixas.percentualRenda.toFixed(1)}%). Sobram ${fmtBRL(perfil.sobraAposFixas)} para o resto do mês. ` +
          `Como posso te ajudar a programar os gastos?`,
      });
    }

    // Call Gemini 3.8 Flash per guidelines
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: montarSystemInstruction(perfil),
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
      WHERE id_usuario = '5865ce27-0681-4dcc-9475-3df9d15a6858'
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
// Cliente da demo: nome fictício, dados reais da base. Perfil "renda recorrente, fica no negativo em alguns
// meses (não todos), renda cobre as despesas médias sem margem para imprevistos" (estado zero_a_zero).
const MARIA_ID_USUARIO = '5865ce27-0681-4dcc-9475-3df9d15a6858';
const MARIA_SALDO_SNAPSHOT = 2794.3; // saldo_hoje no data_manager (data_referencia 2025-12-15)
const MARIA_LIMITE_CONTA = 28000;
const CLIENTE_NOME = 'Renata Lopes';

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

// Endpoint: saldo em conta da cliente (demo por padrão; ou último saldo_apos da base)
app.get('/api/pix/saldo', async (_req: Request, res: Response) => {
  // Mesmo saldo_hoje usado pelo data_manager na projeção do mês
  try {
    const st = await dataManager('/status');
    return res.json({ saldo: Number(st.saldo_hoje), limiteConta: MARIA_LIMITE_CONTA, origem: 'data_manager', idUsuario: MARIA_ID_USUARIO });
  } catch (err) {
    console.warn('Pix saldo: data_manager indisponível, usando snapshot.', err instanceof Error ? err.message : err);
    return res.json({ saldo: MARIA_SALDO_SNAPSHOT, limiteConta: MARIA_LIMITE_CONTA, origem: 'snapshot', idUsuario: MARIA_ID_USUARIO });
  }
});

// ================= Plano do mês no dia do salário (protótipo "prototipo-iai") =================
// Os números vêm do data_manager_itau (Cloud Run, regras determinísticas sobre o BigQuery);
// aqui só se monta a resposta da jornada. O LLM não calcula nenhum valor em R$.
// Sem acesso ao data_manager (ex.: rodando local), usa a cópia em data/plano-salario-snapshot.json.
const DATA_MANAGER_URL = process.env.DATA_MANAGER_URL || 'https://data-manager-itau-zqj7scngrq-uc.a.run.app';
const PLANO_SNAPSHOT = JSON.parse(fs.readFileSync(path.resolve('data/plano-salario-snapshot.json'), 'utf8'));

// Nomes amigáveis para as descrições do extrato sintético
const DESCRICOES: Record<string, [string, string]> = {
  'debito conta parc emprest': ['💳', 'Parcela do empréstimo'],
  'da tv cabo': ['📺', 'TV a cabo'],
  'plano cel': ['📱', 'Plano de celular'],
  'debito conta tar pacote': ['🏦', 'Tarifa do pacote de serviços'],
  'seg resid': ['🏠', 'Seguro residencial'],
  'pag bol seg carro': ['🚗', 'Seguro do carro'],
  'debito conta seg vida': ['🛡️', 'Seguro de vida'],
  'assin paramount plus': ['📺', 'Paramount+'],
  'assin globoplay': ['📺', 'Globoplay'],
  'assin hbo max': ['📺', 'HBO Max'],
  'pix transf terc': ['🔁', 'Pix agendado (transferência)'],
  'pag bol mensal esc': ['🎓', 'Mensalidade escolar'],
  'da agua esg': ['💧', 'Água e esgoto'],
  'pix energ': ['💡', 'Conta de luz'],
  'pag gas encan': ['🔥', 'Gás'],
  'pag fat cart credito integral': ['💳', 'Fatura do cartão'],
  'pag tit parc imov': ['🏠', 'Parcela do imóvel'],
  'pag bol cond': ['🏢', 'Condomínio'],
  'pag energ elet': ['💡', 'Conta de luz'],
  'pix qrs claro': ['📶', 'Internet e TV (Claro)'],
  'pix qrs distrib gas': ['🔥', 'Gás'],
  'deb agua': ['💧', 'Água'],
  'mensal cel': ['📱', 'Plano de celular'],
  'assin disney plus': ['📺', 'Disney+'],
  'cred salario empresa': ['💰', 'Salário'],
  'pix transf receb': ['💸', 'Pix recebido'],
};
const nomeAmigavel = (descr: string) => {
  const d = DESCRICOES[descr];
  return d ? { icone: d[0], nome: d[1] } : { icone: '•', nome: descr.charAt(0).toUpperCase() + descr.slice(1) };
};
const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const diaNum = (iso: string) => Number(iso.slice(8, 10));
const round2 = (v: number) => Math.round(v * 100) / 100;

// Token de identidade para chamar o data_manager (serviço privado; a SA tem roles/run.invoker)
let cachedIdToken: { value: string | null; expires: number } | null = null;
async function getIdToken(audience: string): Promise<string | null> {
  if (cachedIdToken && cachedIdToken.expires > Date.now()) return cachedIdToken.value;
  let value: string | null = null;
  try {
    const res = await fetch(
      `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(audience)}`,
      { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(3000) },
    );
    if (res.ok) value = await res.text();
  } catch {
    value = null;
  }
  cachedIdToken = { value, expires: Date.now() + (value ? 45 : 5) * 60 * 1000 };
  return value;
}

async function dataManager(pathAndQuery: string, init?: { method?: string; body?: unknown }): Promise<any> {
  const token = await getIdToken(DATA_MANAGER_URL);
  if (!token) throw new Error('Sem token de identidade (fora do Cloud Run)');
  const res = await fetch(`${DATA_MANAGER_URL}/v1/clientes/${PLANO_SNAPSHOT.id_usuario}${pathAndQuery}`, {
    method: init?.method || 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`data_manager ${pathAndQuery}: HTTP ${res.status}`);
  return res.json();
}

async function carregarDadosPlano() {
  try {
    const [status, compromissos, projecao, ajustes, recorrencias] = await Promise.all([
      dataManager('/status'),
      dataManager('/compromissos'),
      dataManager('/projecao'),
      dataManager('/ajustes'),
      dataManager('/recorrencias'),
    ]);
    return { status, compromissos, projecao, ajustes, recorrencias, origem: 'data_manager' };
  } catch (err) {
    console.warn('Plano do salário: data_manager indisponível, usando snapshot.', err instanceof Error ? err.message : err);
    return { ...PLANO_SNAPSHOT, origem: 'snapshot' };
  }
}

// ================= Perfil da cliente (dados reais, nome fictício) =================
const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Grupos de despesas fixas a partir da descrição do extrato sintético
const GRUPOS_FIXAS: { nome: string; icone: string; padrao: RegExp }[] = [
  { nome: 'Moradia e condomínio', icone: '🏠', padrao: /cond|imov|alug/ },
  { nome: 'Contas da casa', icone: '💡', padrao: /energ|agua|gas|claro|cel|internet|tv|tar pacote/ },
  { nome: 'Educação', icone: '🎓', padrao: /esc|facul|curso/ },
  { nome: 'Seguros', icone: '🛡️', padrao: /seg /i },
  { nome: 'Empréstimos', icone: '💳', padrao: /emprest/ },
  { nome: 'Assinaturas', icone: '📺', padrao: /^assin/ },
  { nome: 'Transferências programadas', icone: '🔁', padrao: /transf/ },
];

export interface PerfilCliente {
  idUsuario: string;
  nome: string;
  primeiroNome: string;
  iniciais: string;
  segmento: string;
  nivel: number;
  saldoHoje: number;
  limiteConta: number;
  renda: { mensal: number; salario: number; outras: number; salarioDia: number; salarioData: string };
  fixas: {
    total: number;
    percentualRenda: number;
    grupos: { nome: string; icone: string; valor: number; percentual: number; itens: string[] }[];
  };
  sobraAposFixas: number;
  sobraAposFixasPct: number;
  faturaCartao: number;
  gastosMedios: { categoria: string; media: number }[];
  estiloDeVidaMedio: number;
  transporteMedio: number;
  tetos: { categoria: string; descricao: string; valor: number; percentual: number; cor: string }[];
  situacao: { estado: string; saldoVesperaSalario: number; proximoSalario: string; sobraPorDia: number };
  historico: { meses: number; mesesNoNegativo: number; quais: string[] };
  origem: string;
}

const MESES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

async function carregarHistoricoMensal(): Promise<{ mes: string; saldo_minimo: number }[]> {
  try {
    const rows = await runPixQuery(
      `SELECT FORMAT_DATE('%Y-%m', mes), saldo_minimo FROM \`batalha-time-04-z85x.data_manager.perfil_mensal\`
       WHERE id_usuario = @id ORDER BY mes`,
      { id: MARIA_ID_USUARIO },
    );
    return rows.map((r) => ({ mes: r[0], saldo_minimo: Number(r[1]) }));
  } catch {
    return PLANO_SNAPSHOT.historico_mensal || [];
  }
}

let perfilCache: { value: PerfilCliente; expires: number } | null = null;
async function montarPerfilCliente(): Promise<PerfilCliente> {
  if (perfilCache && perfilCache.expires > Date.now()) return perfilCache.value;

  const d = await carregarDadosPlano();
  let gastos = PLANO_SNAPSHOT.gastos;
  if (d.origem === 'data_manager') gastos = await dataManager('/gastos').catch(() => PLANO_SNAPSHOT.gastos);
  const historico = await carregarHistoricoMensal();

  const st = d.status;
  const itens: any[] = d.recorrencias.itens || [];
  const entradas = itens.filter((i) => i.tipo === 'entrada');
  const salario = entradas.filter((i) => i.tipo_item === 'salario').reduce((s, i) => s + Number(i.valor_mensal), 0);
  const rendaMensal = entradas.reduce((s, i) => s + Number(i.valor_mensal), 0);
  const saidasFixas = itens.filter((i) => i.tipo === 'saida' && ['conta_fixa', 'financiamento', 'assinatura', 'parcela'].includes(i.tipo_item));
  const totalFixas = saidasFixas.reduce((s, i) => s + Number(i.valor_mensal), 0);
  const fatura = itens.filter((i) => i.tipo_item === 'fatura').reduce((s, i) => s + Number(i.valor_mensal), 0);

  const grupos = new Map<string, { nome: string; icone: string; valor: number; itens: string[] }>();
  for (const item of saidasFixas) {
    const g = GRUPOS_FIXAS.find((x) => x.padrao.test(item.descricao)) || { nome: 'Outras contas', icone: '📄', padrao: /./ };
    const atual = grupos.get(g.nome) || { nome: g.nome, icone: g.icone, valor: 0, itens: [] };
    atual.valor += Number(item.valor_mensal);
    atual.itens.push(nomeAmigavel(item.descricao).nome);
    grupos.set(g.nome, atual);
  }

  const categorias: any[] = gastos?.categorias || [];
  const media = (macros: string[]) =>
    categorias.filter((c) => macros.includes(c.macro)).reduce((s, c) => s + Number(c.media_mensal), 0);
  const transporteMedio = media(['Posto de combustivel', 'Transporte por app', 'Transporte publico']);
  const estiloDeVidaMedio = media(['Lazer', 'Delivery', 'Lojas e sites', 'Restaurantes', 'Viagens']);

  // Tetos: fixas como estão; 25% da sobra para imprevistos; transporte na média real; o resto para estilo de vida
  const sobra = rendaMensal - totalFixas;
  const reserva = Math.max(0, Math.round(sobra * 0.25));
  const transporte = Math.min(Math.max(0, sobra - reserva), Math.ceil(transporteMedio / 10) * 10);
  const estilo = Math.max(0, Math.round(sobra - reserva - transporte));
  const pct = (v: number) => (rendaMensal > 0 ? (100 * v) / rendaMensal : 0);

  const negativos = historico.filter((h) => h.saldo_minimo < 0);
  const [primeiro] = CLIENTE_NOME.split(' ');
  const perfil: PerfilCliente = {
    idUsuario: MARIA_ID_USUARIO,
    nome: CLIENTE_NOME,
    primeiroNome: primeiro,
    iniciais: CLIENTE_NOME.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(),
    segmento: 'Itaú Personnalité',
    nivel: 4,
    saldoHoje: Number(st.saldo_hoje),
    limiteConta: MARIA_LIMITE_CONTA,
    renda: {
      mensal: round2(rendaMensal),
      salario: round2(salario),
      outras: round2(rendaMensal - salario),
      salarioDia: diaNum(st.proximo_salario_data),
      salarioData: st.formatado?.proximo_salario || dataCurta(st.proximo_salario_data),
    },
    fixas: {
      total: round2(totalFixas),
      percentualRenda: pct(totalFixas),
      grupos: [...grupos.values()]
        .sort((a, b) => b.valor - a.valor)
        .map((g) => ({ ...g, valor: round2(g.valor), percentual: pct(g.valor) })),
    },
    sobraAposFixas: round2(sobra),
    sobraAposFixasPct: pct(sobra),
    faturaCartao: round2(fatura),
    gastosMedios: categorias.map((c) => ({ categoria: c.macro, media: Number(c.media_mensal) })),
    estiloDeVidaMedio: round2(estiloDeVidaMedio),
    transporteMedio: round2(transporteMedio),
    tetos: [
      { categoria: 'Essenciais Fixos', descricao: 'Moradia, contas, escola, seguros e assinaturas', valor: round2(totalFixas), percentual: pct(totalFixas), cor: '#002244' },
      { categoria: 'Lazer, Delivery & Compras', descricao: `Hoje você gasta em média ${fmtBRL(estiloDeVidaMedio)}/mês`, valor: estilo, percentual: pct(estilo), cor: '#EC7000' },
      { categoria: 'Transporte & Apps', descricao: `Combustível e apps (média ${fmtBRL(transporteMedio)}/mês), alerta em 85%`, valor: transporte, percentual: pct(transporte), cor: '#0047BA' },
      { categoria: 'Reserva p/ Imprevistos', descricao: 'Colchão para o gasto fora do planejado', valor: reserva, percentual: pct(reserva), cor: '#059669' },
    ],
    situacao: {
      estado: st.estado,
      saldoVesperaSalario: Number(st.saldo_projetado_vespera_salario),
      proximoSalario: st.formatado?.proximo_salario || st.proximo_salario_data,
      sobraPorDia: Number(st.sobra_por_dia || 0),
    },
    historico: {
      meses: historico.length,
      mesesNoNegativo: negativos.length,
      quais: negativos.map((h) => `${MESES_PT[Number(h.mes.slice(5, 7)) - 1]}/${h.mes.slice(2, 4)}`),
    },
    origem: d.origem,
  };
  perfilCache = { value: perfil, expires: Date.now() + 10 * 60 * 1000 };
  return perfil;
}

// Endpoint: perfil da cliente para o front (nome fictício, números reais)
app.get('/api/cliente', async (_req: Request, res: Response) => {
  try {
    return res.json(await montarPerfilCliente());
  } catch (err) {
    console.error('Perfil da cliente:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Falha ao montar o perfil da cliente.' });
  }
});

// Endpoint: tudo o que a jornada precisa, já calculado por regra
app.get('/api/plano-salario', async (_req: Request, res: Response) => {
  const d = await carregarDadosPlano();
  const st = d.status;
  const ajustes: any[] = d.ajustes.ajustes || [];
  const ajustePix = ajustes.find((a) => a.tipo === 'mudanca_data');
  const ajusteCorte = ajustes.find((a) => a.tipo === 'assinatura_redundante');
  const ajusteGasto = ajustes.find((a) => a.tipo === 'gasto_discricionario');

  const saldoFinal = Number(d.projecao.saldo_final);
  const pontos = (d.projecao.pontos || []).map((p: any) => ({ data: p.data, saldo: Number(p.saldo) }));
  const pontosComSaldoInicial = [{ data: d.projecao.data_referencia || st.data_referencia, saldo: Number(d.projecao.saldo_inicial) }, ...pontos];

  // Reagendar o Pix para o dia do salário: o valor sai da projeção deste ciclo
  const valorPix = ajustePix ? Number(ajustePix.valor) : 0;
  const dataPixAtual: string | null = ajustePix?.detalhes?.datas_previstas?.[0] || null;
  const dataPixNova: string | null = ajustePix?.detalhes?.data_sugerida || null;
  const saldoFinalMes = round2(saldoFinal + valorPix);
  const pontosRecalculados = pontosComSaldoInicial.map((p) => ({
    data: p.data,
    saldo: round2(dataPixAtual && p.data >= dataPixAtual ? p.saldo + valorPix : p.saldo),
  }));

  // Próximo mês (regra): fecha com o que sobrar + renda recorrente − saídas recorrentes − gasto do dia a dia
  const itens: any[] = d.recorrencias.itens || [];
  const entradasMes = itens.filter((i) => i.tipo === 'entrada').reduce((s, i) => s + Number(i.valor_mensal), 0);
  const saidasMes = itens.filter((i) => i.tipo !== 'entrada').reduce((s, i) => s + Number(i.valor_mensal), 0);
  const variavelMes = Number(d.projecao.saida_variavel_diaria || 0) * 31;
  const saldoProximoMes = round2(saldoFinalMes + entradasMes - saidasMes - variavelMes);

  // Quanto dá pra gastar por semana: o gasto de costume + a sobra distribuída até o salário
  const diasAteSalario = Number(st.dias_ate_salario) || pontos.length || 1;
  const limiteSemanal = round2((Number(d.projecao.saida_variavel_diaria || 0) + Math.max(0, saldoFinalMes) / diasAteSalario) * 7);

  const saidas = (d.compromissos.compromissos || []).map((c: any) => ({
    ...nomeAmigavel(c.descricao),
    quando: `${c.tipo_item === 'conta_fixa' || c.tipo_item === 'financiamento' ? 'vence' : 'dia'} ${dataCurta(c.data)}`,
    valor: Math.abs(Number(c.valor)),
    tipo: c.tipo_item,
  }));

  const servicos: any[] = ajusteCorte?.detalhes?.servicos || [];
  const mantido = ajusteCorte?.detalhes?.servico_mantido_no_calculo;

  res.json({
    origem: d.origem,
    dataReferencia: st.data_referencia,
    cliente: {
      saldoHoje: Number(st.saldo_hoje),
      rendaMensal: Number(st.renda_mensal),
      proximoSalario: { data: st.proximo_salario_data, formatado: st.formatado?.proximo_salario, valor: Number(st.proximo_salario_valor) },
      estado: st.estado,
    },
    saidas,
    totalSaidas: Number(d.compromissos.total_saidas),
    projecao: {
      saldoFinal,
      diaQueAcaba: st.dia_que_acaba,
      diaNegativo: st.dia_que_acaba ? diaNum(st.dia_que_acaba) : null,
      diaQueAcabaFormatado: st.formatado?.dia_que_acaba,
      jurosEstimados: Number(st.juros_estimados || 0),
      pontos: pontosComSaldoInicial,
      pontosRecalculados,
    },
    corte: ajusteCorte
      ? {
          ajusteId: ajusteCorte.ajuste_id,
          servicos: servicos.map((s) => nomeAmigavel(`assin ${s.servico}`).nome),
          mantido: mantido ? nomeAmigavel(`assin ${mantido}`).nome : null,
          economiaMensal: Number(ajusteCorte.detalhes?.economia_mensal || ajusteCorte.valor),
          ganhoAteSalario: Number(ajusteCorte.ganho_vespera_salario),
          saldoFinalComCorte: round2(saldoFinal + Number(ajusteCorte.ganho_vespera_salario)),
          resolve: !!ajusteCorte.resolve,
        }
      : null,
    pix: ajustePix
      ? {
          ajusteId: ajustePix.ajuste_id,
          destinatario: 'transferência agendada',
          descricao: nomeAmigavel('pix transf terc').nome,
          valor: valorPix,
          dataAtual: dataCurta(dataPixAtual!),
          diaAtual: diaNum(dataPixAtual!),
          dataIsoNova: dataPixNova,
          novaData: dataCurta(dataPixNova!),
          novoDia: diaNum(dataPixNova!),
          saldoFinalMes,
          saldoProximoMes,
          limiteSemanal,
          resolve: !!ajustePix.resolve,
        }
      : null,
    // Alternativa 2: deixar o limite da conta cobrir (quanto custa em juros), quando a projeção fica negativa
    limiteConta: { juros: Number(st.juros_estimados || 0) },
    // Alternativa 2 quando a projeção fica positiva, mas sem folga: teto num gasto acima da própria média
    ajusteGasto: ajusteGasto
      ? {
          ajusteId: ajusteGasto.ajuste_id,
          categoria: String(ajusteGasto.detalhes?.categoria || 'gastos variáveis'),
          tetoSugerido: Number(ajusteGasto.detalhes?.teto_sugerido ?? ajusteGasto.valor),
          gastoMesAtual: Number(ajusteGasto.detalhes?.gasto_mes_atual || 0),
          mediaMensal: Number(ajusteGasto.detalhes?.media_mensal_3m || 0),
        }
      : null,
    // Folga "sem margem": abaixo de 10% da renda (mesmo corte do estado zero_a_zero)
    semMargem: saldoFinal >= 0 && saldoFinal <= 0.1 * Number(st.renda_mensal),
    proximoMes: { entradas: round2(entradasMes), saidasFixas: round2(saidasMes), gastoDiaADia: round2(variavelMes) },
  });
});

// Endpoint: registra a decisão do cliente sobre um ajuste (memória do agente no data_manager)
app.post('/api/plano-salario/decisao', async (req: Request, res: Response) => {
  const { ajusteId, aceito } = req.body || {};
  if (typeof ajusteId !== 'string' || typeof aceito !== 'boolean') return res.status(400).json({ error: 'Pedido inválido.' });
  try {
    await dataManager('/memoria/decisoes', { method: 'POST', body: { ajuste_id: ajusteId, aceito } });
    return res.json({ ok: true, origem: 'data_manager' });
  } catch (err) {
    return res.json({ ok: true, origem: 'local', aviso: err instanceof Error ? err.message : String(err) });
  }
});

// Endpoint: reagenda o Pix (após a biometria). No data_manager a ação é simulada (simulado: true).
app.post('/api/plano-salario/reagendar', async (_req: Request, res: Response) => {
  const d = await carregarDadosPlano();
  const ajustePix = (d.ajustes.ajustes || []).find((a: any) => a.tipo === 'mudanca_data');
  if (!ajustePix) return res.status(404).json({ error: 'Nenhum Pix reagendável.' });
  try {
    const resultado = await dataManager('/acoes/agendar-pix', {
      method: 'POST',
      body: {
        valor: Number(ajustePix.valor),
        data: ajustePix.detalhes.data_sugerida,
        descricao: ajustePix.titulo,
        ajuste_id: ajustePix.ajuste_id,
      },
    });
    await dataManager('/memoria/decisoes', { method: 'POST', body: { ajuste_id: ajustePix.ajuste_id, aceito: true } }).catch(() => {});
    return res.json({ ok: true, origem: 'data_manager', resultado });
  } catch (err) {
    return res.json({ ok: true, origem: 'local', simulado: true, aviso: err instanceof Error ? err.message : String(err) });
  }
});

// Endpoint: simula um Pix antes de confirmar (alerta "antes de um Pix que estouraria o limite", sem bloquear)
app.post('/api/pix/simular', async (req: Request, res: Response) => {
  const valor = Number(req.body?.valor);
  if (!(valor > 0)) return res.status(400).json({ error: 'Valor inválido.' });
  try {
    const r = await dataManager('/simulacoes/transacao', { method: 'POST', body: { valor, canal: 'pix', descricao: 'pix' } });
    const contas = (r.contas_comprometidas || []).map((c: any) => ({ ...c, descricao: nomeAmigavel(c.descricao).nome }));
    return res.json({ ...r, contas_comprometidas: contas, origem: 'data_manager' });
  } catch {
    // Regra local equivalente sobre a projeção salva
    const p = PLANO_SNAPSHOT.projecao;
    const minimoDepois = Number(p.saldo_minimo) - valor;
    const primeiroNegativo = (p.pontos as any[]).find((pt) => Number(pt.saldo) - valor < 0);
    return res.json({
      fica_negativo: minimoDepois < 0,
      saldo_minimo_depois: round2(minimoDepois),
      dia_que_acaba_depois: primeiroNegativo?.data || null,
      contas_comprometidas: [],
      data_sugerida: PLANO_SNAPSHOT.status.proximo_salario_data,
      formatado: {
        dia_que_acaba_depois: primeiroNegativo ? dataCurta(primeiroNegativo.data) : null,
        data_sugerida: PLANO_SNAPSHOT.status.formatado?.proximo_salario,
      },
      origem: 'snapshot',
    });
  }
});

// Endpoint: eventos da jornada (no produto vão para o pipeline de eventos; aqui, log estruturado no Cloud Logging)
const EVENTOS_PERMITIDOS = new Set([
  'fab_opened', 'card_selected', 'risk_projected', 'suggestion_rejected', 'alternatives_offered',
  'alternative_selected', 'auth_requested', 'pix_rescheduled', 'projection_updated', 'share_opened',
  'alert_opt_in', 'feedback', 'month_end_check', 'chat_closed', 'path_not_in_demo', 'pix_guard_warned',
  'pix_guard_continued',
]);
app.post('/api/eventos', (req: Request, res: Response) => {
  const { name, detail } = req.body || {};
  if (!EVENTOS_PERMITIDOS.has(name)) return res.status(400).json({ error: 'Evento desconhecido.' });
  console.log(JSON.stringify({ severity: 'INFO', evento: name, detalhe: String(detail || '').slice(0, 200), cliente: PLANO_SNAPSHOT.id_usuario }));
  return res.status(204).end();
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
