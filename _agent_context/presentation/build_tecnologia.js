const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const fa = require("react-icons/fa6");

const C = {
  bg: "121212", card: "1B1A19", border: "2A2320", orange: "EC7000", orange2: "FF9A3D",
  text: "F5F1EC", sub: "B9B0A6", dark: "1A0E00",
};
const FONT = "Arial";
const OUT = process.argv[2] || "tecnologia.pptx";

async function bgImage(strength) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
    <defs><radialGradient id="g" cx="1920" cy="1080" r="1900" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#EC7000" stop-opacity="${strength}"/>
      <stop offset="0.55" stop-color="#EC7000" stop-opacity="0"/>
    </radialGradient></defs>
    <rect width="1920" height="1080" fill="#${C.bg}"/>
    <rect width="1920" height="1080" fill="url(#g)"/></svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

async function icon(Comp, color = "#" + C.dark) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color, size: 256 }));
  const buf = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

function header(s, title, y = 0.42) {
  s.addShape("roundRect", { x: 0.5, y, w: 0.06, h: 0.5, fill: { color: C.orange }, line: { color: C.orange }, rectRadius: 0.03 });
  s.addText(title, { x: 0.72, y: y - 0.04, w: 8.8, h: 0.58, fontFace: FONT, fontSize: 24, bold: true, color: C.text, margin: 0, valign: "middle", isTextBox: true });
}

function eyebrow(s, text, x, y, w = 6) {
  s.addText(text, { x, y, w, h: 0.25, fontFace: FONT, fontSize: 9, bold: true, color: C.orange2, charSpacing: 2, margin: 0, isTextBox: true });
}

function card(s, x, y, w, h, opts = {}) {
  s.addShape("roundRect", { x, y, w, h, fill: { color: opts.fill || C.card }, line: { color: opts.line || C.border, width: 0.75 }, rectRadius: 0.12 });
}

function iconCircle(s, data, x, y, d = 0.5) {
  s.addShape("ellipse", { x, y, w: d, h: d, fill: { color: C.orange }, line: { color: C.orange } });
  const p = d * 0.25;
  s.addImage({ data, x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p });
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9"; // 10 x 5.625
  pres.title = "i.a na medida — Tecnologia";
  const BG = await bgImage(0.35);
  const BG_COVER = await bgImage(0.55);
  const I = {
    calc: await icon(fa.FaCalculator), shield: await icon(fa.FaShieldHalved), key: await icon(fa.FaKey),
    scale: await icon(fa.FaScaleBalanced), brain: await icon(fa.FaBrain), flag: await icon(fa.FaFlagCheckered),
  };

  // 1. Capa
  {
    const s = pres.addSlide();
    s.background = { data: BG_COVER };
    eyebrow(s, "TECNOLOGIA", 0.7, 1.55);
    s.addText("Por dentro do i.a na medida", { x: 0.7, y: 1.85, w: 8.5, h: 0.9, fontFace: FONT, fontSize: 40, bold: true, color: C.text, margin: 0, isTextBox: true });
    s.addText("Como o agente decide, se protege e é medido.", { x: 0.7, y: 2.8, w: 8, h: 0.4, fontFace: FONT, fontSize: 16, color: C.sub, margin: 0, isTextBox: true });
    s.addText("Itaú · Grupo 4 · Batalha de Agentes", { x: 0.7, y: 4.75, w: 5, h: 0.3, fontFace: FONT, fontSize: 10, color: C.sub, margin: 0, isTextBox: true });
    s.addShape("roundRect", { x: 8.45, y: 4.72, w: 0.85, h: 0.36, fill: { color: C.orange }, line: { color: C.orange }, rectRadius: 0.08 });
    s.addText("itaú", { x: 8.45, y: 4.72, w: 0.85, h: 0.36, fontFace: FONT, fontSize: 12, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addNotes("Abertura da parte técnica.");
  }

  // 2. Pipeline
  {
    const s = pres.addSlide();
    s.background = { data: BG };
    header(s, "Nosso pipeline: do app à resposta");
    eyebrow(s, "NO CAMINHO DA RESPOSTA · SÍNCRONO", 0.5, 1.12);
    const steps = [
      ["itau-app", "Cliente fala", "React + BFF. Cria session_id e trace_id"],
      ["guardrails", "Entrada", "Jailbreak, PII e fora de escopo. Regras < 1 ms"],
      ["data-manager", "Números", "Estado, projeção e ajustes já calculados"],
      ["financial-agent", "Redação", "Gemini 2.5 Flash transforma números em conversa"],
      ["guardrails", "Saída + tom", "Valida a resposta e checa empatia (S10)"],
    ];
    const w = 1.56, gap = 0.3, y = 1.42, h = 1.3;
    steps.forEach(([tag, name, desc], i) => {
      const x = 0.5 + i * (w + gap);
      card(s, x, y, w, h, i === 4 || i === 1 ? { line: C.orange } : {});
      s.addText(tag, { x: x + 0.12, y: y + 0.1, w: w - 0.24, h: 0.2, fontFace: FONT, fontSize: 8.5, bold: true, color: C.orange2, margin: 0, isTextBox: true });
      s.addText(name, { x: x + 0.12, y: y + 0.32, w: w - 0.24, h: 0.28, fontFace: FONT, fontSize: 12.5, bold: true, color: C.text, margin: 0, isTextBox: true });
      s.addText(desc, { x: x + 0.12, y: y + 0.64, w: w - 0.24, h: 0.58, fontFace: FONT, fontSize: 9, color: C.sub, margin: 0, valign: "top", isTextBox: true });
      if (i < steps.length - 1) {
        s.addShape("line", { x: x + w + 0.05, y: y + h / 2, w: gap - 0.1, h: 0, line: { color: C.orange2, width: 1.5, endArrowType: "triangle" } });
      }
    });
    s.addText("O financial-agent orquestra as etapas 2 a 5. Filtro de entrada e busca de dados rodam em paralelo.", { x: 0.5, y: 2.8, w: 9, h: 0.25, fontFace: FONT, fontSize: 9.5, italic: true, color: C.sub, margin: 0, isTextBox: true });

    eyebrow(s, "FORA DO CAMINHO · BATCH E ASSÍNCRONO", 0.5, 3.2);
    const off = [
      ["dm-pipeline", "Cloud Run Job", "SQL no BigQuery classifica os clientes em 4 estados e gera os ajustes.", "→ abastece o data-manager"],
      ["observabilidade", "BigQuery", "Eventos enviados depois da resposta, sem somar latência. 8 tabelas.", "← recebe do agente e do guardrails"],
      ["juiz-tom", "Vertex AI Agent Engine", "Versão completa do juiz de tom, para calibrar e auditar.", "↔ calibra o prompt do guardrails"],
    ];
    const w2 = 2.8, g2 = 0.3, y2 = 3.48, h2 = 1.3;
    off.forEach(([name, where, desc, link], i) => {
      const x = 0.5 + i * (w2 + g2);
      card(s, x, y2, w2, h2);
      s.addText([
        { text: name, options: { bold: true, color: C.text, fontSize: 12.5 } },
        { text: "  " + where, options: { color: C.orange2, fontSize: 8.5, bold: true } },
      ], { x: x + 0.14, y: y2 + 0.1, w: w2 - 0.28, h: 0.28, fontFace: FONT, margin: 0, isTextBox: true });
      s.addText(desc, { x: x + 0.14, y: y2 + 0.42, w: w2 - 0.28, h: 0.5, fontFace: FONT, fontSize: 9.5, color: C.sub, margin: 0, valign: "top", isTextBox: true });
      s.addText(link, { x: x + 0.14, y: y2 + 0.98, w: w2 - 0.28, h: 0.22, fontFace: FONT, fontSize: 9, bold: true, color: C.text, margin: 0, isTextBox: true });
    });
    s.addText("Tudo em Cloud Run (us-central1) · chamadas internas com token OIDC · session_id e trace_id em todas as chamadas", { x: 0.5, y: 5.0, w: 9, h: 0.22, fontFace: FONT, fontSize: 8.5, color: C.sub, margin: 0, isTextBox: true });
    s.addNotes(
      "Fluxo de uma mensagem no chat: o app (BFF Express) chama o financial-agent. O agente valida a entrada no guardrails em paralelo com a busca do snapshot no data-manager (asyncio.gather). " +
      "O Gemini só redige a partir dos números. A saída passa de novo no guardrails, que inclui o juiz de tom one-shot (gemini-2.5-flash-lite, ~0,9 s, fail-open se passar de 1,2 s). " +
      "Fora do caminho: o dm-pipeline é um Cloud Run Job que roda o SQL de features e classificação; a observabilidade recebe eventos via BackgroundTasks; o juiz completo (DSPy/ADK) está no Agent Engine, mas é lento demais (~2,4 s) para ficar no caminho síncrono. " +
      "Se o agente cair, o BFF tem fallback local."
    );
  }

  // 3. Regras de engenharia
  {
    const s = pres.addSlide();
    s.background = { data: BG };
    header(s, "Três regras que não negociamos");
    const cols = [
      [I.calc, "O LLM não faz conta", "Saldo, projeção, juros e impacto dos ajustes vêm do data-manager, calculados no BigQuery.", "Gemini só transforma números prontos em conversa."],
      [I.shield, "Fail-closed", "Se o guardrails não responde, o agente também não responde.", "HTTP 503 em vez de uma resposta sem validação."],
      [I.key, "Zero-trust", "Nenhuma chave estática trafega entre os serviços.", "Token OIDC de curta duração, conta de serviço com run.invoker."],
    ];
    const w = 2.8, gap = 0.3, y = 1.45, h = 3.2;
    cols.forEach(([ic, title, body, action], i) => {
      const x = 0.5 + i * (w + gap);
      card(s, x, y, w, h);
      iconCircle(s, ic, x + 0.25, y + 0.3, 0.55);
      s.addText(title, { x: x + 0.25, y: y + 1.0, w: w - 0.5, h: 0.35, fontFace: FONT, fontSize: 16, bold: true, color: C.orange2, margin: 0, isTextBox: true });
      s.addText(body, { x: x + 0.25, y: y + 1.42, w: w - 0.5, h: 0.9, fontFace: FONT, fontSize: 11.5, color: C.sub, margin: 0, valign: "top", isTextBox: true });
      s.addShape("line", { x: x + 0.25, y: y + 2.4, w: w - 0.5, h: 0, line: { color: C.border, width: 0.75 } });
      s.addText(action, { x: x + 0.25, y: y + 2.5, w: w - 0.5, h: 0.55, fontFace: FONT, fontSize: 11, color: C.text, margin: 0, valign: "top", isTextBox: true });
    });
    s.addNotes(
      "LLM não calcula: toda matemática (projeção dia a dia até o salário, score de 6 sinais, impacto em dias de cada ajuste) é determinística no data_manager. " +
      "Fail-closed: indisponibilidade do guardrails no /chat ou na saída do /analyze devolve 503. Exceção consciente: o juiz de tom é fail-open, porque tom ruim é menos grave que resposta perigosa. " +
      "Zero-trust: SA squad-agent-sa, tokens OIDC com cache de 50 min."
    );
  }

  // 4. Diferenciais
  {
    const s = pres.addSlide();
    s.background = { data: BG };
    header(s, "O que vai além do básico");
    const panels = [
      [I.scale, "Juiz de tom", "Toda resposta passa por um avaliador de empatia antes de chegar ao cliente.", [
        ["DSPy", "calibrado sobre 47 mensagens avaliadas por humanos"],
        ["79%", "de acerto na base ouro, com 7% de falsa reprovação"],
        ["~0,9 s", "no guardrails; fora do tom, o agente reescreve uma vez"],
      ]],
      [I.brain, "Memória de longo prazo", "O agente lembra o que o cliente já decidiu e não insiste no que foi recusado.", [
        ["2×", "ajuste recusado duas vezes sai da lista"],
        ["Metas", "guarda a meta de reserva e o total poupado"],
        ["Ciclo", "compara com o resultado do mês anterior"],
      ]],
    ];
    const w = 4.35, gap = 0.3, y = 1.4, h = 3.55;
    panels.forEach(([ic, title, lead, rows], i) => {
      const x = 0.5 + i * (w + gap);
      card(s, x, y, w, h);
      iconCircle(s, ic, x + 0.3, y + 0.3, 0.5);
      s.addText(title, { x: x + 0.95, y: y + 0.3, w: w - 1.2, h: 0.5, fontFace: FONT, fontSize: 18, bold: true, color: C.text, margin: 0, valign: "middle", isTextBox: true });
      s.addText(lead, { x: x + 0.3, y: y + 0.95, w: w - 0.6, h: 0.5, fontFace: FONT, fontSize: 11.5, color: C.sub, margin: 0, valign: "top", isTextBox: true });
      rows.forEach(([k, v], j) => {
        const ry = y + 1.65 + j * 0.6;
        s.addShape("line", { x: x + 0.3, y: ry - 0.08, w: w - 0.6, h: 0, line: { color: C.border, width: 0.75 } });
        s.addText(k, { x: x + 0.3, y: ry, w: 1.05, h: 0.42, fontFace: FONT, fontSize: 16, bold: true, color: C.orange2, margin: 0, valign: "middle", isTextBox: true });
        s.addText(v, { x: x + 1.4, y: ry, w: w - 1.7, h: 0.42, fontFace: FONT, fontSize: 11, color: C.text, margin: 0, valign: "middle", isTextBox: true });
      });
    });
    s.addNotes(
      "Juiz de tom: base ouro com 47 mensagens (28 aprovadas, 19 reprovadas). DSPy + Gemini; publicado como agente ADK no Agent Engine. " +
      "No caminho síncrono usamos uma versão one-shot com gemini-2.5-flash-lite dentro do guardrails (código S10, decisão reescrever); se passar de 1,2 s, segue sem bloquear. " +
      "Ponto fraco conhecido: falsa aprovação ainda alta (~42%). " +
      "Memória: o data-manager registra decisões do cliente (/memoria/decisoes, /memoria/poupar). Hoje vive no processo (Firestore bloqueado no projeto); a interface já está pronta para trocar de backend. " +
      "Além disso, na conversa, os últimos turnos entram no prompt (SessionMemoryStore no agente)."
    );
  }

  // 5. Métricas
  {
    const s = pres.addSlide();
    s.background = { data: BG };
    header(s, "Como vamos medir sucesso");
    const lx = 0.5, lw = 4.6, y = 1.35, h = 3.55;
    card(s, lx, y, lw, h);
    eyebrow(s, "MÉTRICA NORTE · CLIENTES SALVOS", lx + 0.3, y + 0.25, 4);
    s.addText("Taxa de entrada no vermelho", { x: lx + 0.3, y: y + 0.5, w: lw - 0.6, h: 0.35, fontFace: FONT, fontSize: 14, bold: true, color: C.text, margin: 0, isTextBox: true });
    s.addChart(pres.charts.BAR, [{ name: "Entrada no negativo", labels: ["Sem agente", "Com agente"], values: [20.9, 10.0] }], {
      x: lx + 0.2, y: y + 0.95, w: lw - 0.4, h: 2.5, barDir: "col", barGapWidthPct: 70,
      chartColors: ["6B625A", C.orange], varyColors: true,
      showValue: true, dataLabelPosition: "outEnd", dataLabelColor: C.text, dataLabelFontSize: 14, dataLabelFontBold: true,
      dataLabelFormatCode: '0.0"%"', dataLabelFontFace: FONT,
      catAxisLabelColor: C.sub, catAxisLabelFontSize: 11, catAxisLabelFontFace: FONT, catAxisLineShow: false,
      valAxisHidden: true, valAxisMinVal: 0, valAxisMaxVal: 25, valGridLine: { style: "none" }, catGridLine: { style: "none" },
      showLegend: false,
    });

    const stats = [
      ["67,8%", "de likes nas respostas avaliadas"],
      ["15,4%", "dos avisos terminam em ajuste aceito"],
      ["14,5% → 6,2%", "respostas trocadas pelo filtro de saída (jan → out)"],
    ];
    const rx = 5.4, rw = 4.1, th = 1.05, tg = 0.2;
    stats.forEach(([num, desc], i) => {
      const ty = y + i * (th + tg);
      card(s, rx, ty, rw, th);
      s.addText(num, { x: rx + 0.25, y: ty + 0.12, w: rw - 0.5, h: 0.5, fontFace: FONT, fontSize: 24, bold: true, color: C.orange2, margin: 0, valign: "middle", isTextBox: true });
      s.addText(desc, { x: rx + 0.25, y: ty + 0.62, w: rw - 0.5, h: 0.3, fontFace: FONT, fontSize: 10.5, color: C.sub, margin: 0, isTextBox: true });
    });
    s.addText("Piloto A/B simulado: 400 clientes, 12 meses de 2025 · dataset observabilidade no BigQuery", { x: 0.5, y: 5.05, w: 9, h: 0.22, fontFace: FONT, fontSize: 8.5, italic: true, color: C.sub, margin: 0, isTextBox: true });
    s.addNotes(
      "Métrica norte: taxa de entrada no negativo, tratamento × controle. No piloto simulado: 10,0% com agente contra 20,9% sem (acumulado; em dezembro a diferença chega a 18 pp). " +
      "Métricas de apoio, todas expostas em /v1/metricas: like rate (67,8% no ano), aceite de ajustes (15,4% dos alertas), taxa de fallback do filtro de saída (caindo de 14,5% para 6,2%), 24,5% das conversas com intervenção. " +
      "Deixar claro que a base é simulada: o schema é o mesmo dos eventos reais, então a troca é direta."
    );
  }

  // 6. Próximos passos
  {
    const s = pres.addSlide();
    s.background = { data: BG };
    header(s, "Próximos passos");
    const steps = [
      ["Memória persistente", "tirar a memória do processo e levar para um banco, mantendo a mesma interface."],
      ["Dados reais", "trocar a simulação pelos eventos de produção, incluindo o like/dislike do app."],
      ["Juiz mais rigoroso", "reduzir a falsa aprovação com GEPA e mais exemplos de fronteira."],
    ];
    steps.forEach(([b, t], i) => {
      const y = 1.6 + i * 0.95;
      s.addShape("ellipse", { x: 0.7, y, w: 0.45, h: 0.45, fill: { color: C.orange }, line: { color: C.orange } });
      s.addText(String(i + 1), { x: 0.7, y, w: 0.45, h: 0.45, fontFace: FONT, fontSize: 13, bold: true, color: C.dark, align: "center", valign: "middle", margin: 0, isTextBox: true });
      s.addText([
        { text: b + ": ", options: { bold: true, color: C.text } },
        { text: t, options: { color: C.sub } },
      ], { x: 1.4, y: y - 0.02, w: 7.6, h: 0.5, fontFace: FONT, fontSize: 14, margin: 0, valign: "middle", isTextBox: true });
    });
    s.addNotes("Slide opcional. Firestore está bloqueado pela org hoje, por isso a memória ainda vive em processo com max-instances=1.");
  }

  await pres.writeFile({ fileName: OUT });
  console.log("wrote", OUT);
})();
