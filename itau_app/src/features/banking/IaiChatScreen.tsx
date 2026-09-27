import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  X,
  Sparkles,
  Check,
  CheckCheck,
  Send,
  Mic,
  ThumbsUp,
  ThumbsDown,
  Copy,
  ChevronRight,
  Download,
  CircleCheck,
  Loader2,
  Play,
  Pause,
  FileCode2,
  QrCode,
  SlidersHorizontal,
  Target,
  House,
} from 'lucide-react';
import { useVoiceInput, VoicePixIntent } from './useVoiceInput';
import {
  PixFlow,
  PixContato,
  PixComprovante,
  PixSaldos,
  BankLogo,
  formatBRL,
  formatPixDate,
  downloadComprovante,
} from './PixFlow';
import {
  PlanoSalarioData,
  SaidasBox,
  SemanaBox,
  ChartBox,
  AlternativasBox,
  PropostaBox,
  BiometriaOverlay,
  AvaliacaoCard,
  logEvento,
  brl,
  signed,
} from './PlanoSalario';
import { FinancialGoal, ScreenType, CategoryCap } from '../studio/studioTypes';
import { useCliente } from '../cliente/ClienteContext';
import { DEFAULT_INVESTMENT_OPTIONS } from '../studio/studioConstants';
import confetti from 'canvas-confetti';

export interface IaiChatScreenProps {
  onBack: () => void;
  /** Navegação para outras telas (simulador de gastos, tela inicial...) */
  onNavigate?: (screen: ScreenType) => void;
  onGoalCreated?: (goal: FinancialGoal) => void;
  /** Abre a Área Pix nas abas Copia e Cola ou QR Code */
  onStartPixArea?: (mode: 'copia_cola' | 'qr_code') => void;
  /** Saldos compartilhados com a Home e o Extrato */
  saldos: PixSaldos;
  /** Pix concluído: o App desconta o valor do saldo */
  onPixDone?: (comprovante: PixComprovante) => void;
  /** Pergunta enviada automaticamente ao abrir (landing, extrato) */
  initialPrompt?: string;
  /** Abre direto na jornada "+ Nova Missão" */
  isGoalCreationFlow?: boolean;
  /** Aberto pelo botão flutuante no dia do salário: jornada "plano do mês" */
  salaryPlanMode?: boolean;
  /** Alerta antes de um Pix que aperta o mês (opt-in "Pode me avisar") */
  pixGuard?: boolean;
  onPixGuardOptIn?: () => void;
  className?: string;
  skipIntro?: boolean;
}

// Jornada "plano do mês no dia do salário": cards só na saudação; depois, conversa livre
interface PlanCard {
  label: string;
  primary?: boolean;
  action: 'semana' | 'saidas' | 'aviso';
}
type PlanBlock = 'saidas' | 'grafico-neg' | 'grafico-pos' | 'alternativas' | 'proposta' | 'avaliacao' | 'semana';
// Etapa que espera uma resposta da cliente (null = conversa normal)
type PlanStage = null | 'depois_semana' | 'depois_aviso' | 'corte' | 'alternativa' | 'confirmacao' | 'avisar' | 'optin';
interface PlanOption {
  id: string;
  descricao: string;
  /** Reserva quando o Gemini não está disponível */
  palavras: string[];
}

type QuickAction =
  | { type: 'view_wizard'; label: string }
  | { type: 'view_home'; label: string }
  | { type: 'create_goal'; label: string; goal: { title: string; target: number; deadline: string } };

interface ChatMessage {
  id: string;
  sender: 'user' | 'iai';
  text: string;
  timestamp: string;
  /** Mensagem de voz: o texto transcrito fica em `text`, mas só o áudio é exibido */
  audio?: {
    url: string;
    duration: number;
  };
  pixSelection?: {
    amount: number;
    contatos: PixContato[];
  };
  pixReview?: {
    amount: number;
    contato: PixContato;
  };
  pixReceipt?: PixComprovante;
  /** Resumo de tetos por categoria (jornada de controle de gastos) */
  categoryCaps?: CategoryCap[];
  /** Botão de ação abaixo da resposta */
  quickAction?: QuickAction;
  /** Respostas sugeridas (jornada de criação de meta) */
  chips?: string[];
  /** Bloco visual da jornada do plano do mês */
  planBlock?: PlanBlock;
  /** Cards de resposta da jornada do plano do mês (alinhados à direita) */
  planCards?: PlanCard[];
  /** Mensagem discreta (rodapé da jornada) */
  subtle?: boolean;
}

// Links para artigos da Central de Ajuda do app: [título](/ajuda/slug). Outros links ficam como texto.
// O texto é escapado antes: a resposta do agente nunca vira HTML arbitrário.
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Destaque de valores no texto: [[pos:...]] verde, [[neg:...]] vermelho
const formatRich = (s: string) =>
  escapeHtml(s)
    .replace(
      /\[([^\]\n]{1,120})\]\((\/ajuda\/[a-z0-9-]{1,60})\)/g,
      '<a href="$2" data-ajuda="$1" class="font-semibold text-[#EC7000] underline underline-offset-2 hover:text-[#D45D00]">$1</a>',
    )
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[\[pos:(.*?)\]\]/g, '<b class="text-[#1E8E3E]">$1</b>')
    .replace(/\[\[neg:(.*?)\]\]/g, '<b class="text-[#C62828]">$1</b>');


// Jornada "+ Nova Missão": respostas sugeridas em cada passo
const GOAL_FLOW_CHIPS: Record<1 | 2 | 3, string[]> = {
  1: ['Comprar uma casa', 'Viagem internacional', 'Reserva de emergência', 'Trocar de carro'],
  2: ['R$ 50.000', 'R$ 150.000', 'R$ 700.000'],
  3: ['12 meses', 'dezembro 2028', 'dezembro 2030'],
};

// Mensagem única para falha técnica do chat: nunca inventar uma resposta no lugar da IA
const CHAT_ERROR_TEXT = 'Não consegui falar com o assistente agora. Pode tentar de novo em alguns instantes?';

// Respostas sugeridas e ideias para o usuário clicar com um toque
export const QUICK_SUGGESTIONS = [
  { icon: '🏖️', label: 'Lazer sem culpa', prompt: 'Quanto posso gastar com lazer sem culpa?' },
  { icon: '📊', label: 'Raio-X de contas', prompt: 'Faça o Raio-X das minhas contas fixas.' },
  { icon: '✈️', label: 'Gastos com Viagens', prompt: 'Quanto gastei com viagens este mês?' },
  { icon: '🛍️', label: 'Lojas e Delivery', prompt: 'Quanto gastei com lojas e compras recentemente?' },
  { icon: '🛡️', label: 'Proteger orçamento', prompt: 'Como evitar que minha conta fique negativa antes do salário?' },
  { icon: '🎯', label: 'Divisão do salário', prompt: 'Programe a divisão do salário entre gastos essenciais e não essenciais.' },
  { icon: '🚗', label: 'Teto de Transporte', prompt: 'Definir meu teto de gastos de transporte do mês.' },
];

const isCategoryCapsRequest = (text: string) => {
  const t = text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  if (t.includes('transporte')) return false;
  return /categoria|divisao|essenciais|controle de gastos|tetos? (maximo|de gastos)|teto por/.test(t);
};

// Extrai valor e nome de frases como "Envia um Pix de R$10 para Jessica por favor"
const parsePixRequest = (text: string): { amount: number | null; nome: string | null } => {
  let amount: number | null = null;
  const decimal = text.match(/(\d+)[.,](\d{1,2})(?!\d)/);
  const thousands = text.match(/(\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?(?!\d)/);
  const integer = text.match(/(\d+)/);
  if (thousands) {
    amount = parseFloat(`${thousands[1].replace(/\./g, '')}.${thousands[2] || '0'}`);
  } else if (decimal) {
    amount = parseFloat(`${decimal[1]}.${decimal[2]}`);
  } else if (integer) {
    amount = parseFloat(integer[1]);
  }
  // "20 mil", "1,5 mil", "2 mil reais"
  const mil = text.match(/(\d+(?:[.,]\d+)?)\s*mil\b/i);
  if (mil) amount = parseFloat(mil[1].replace(',', '.')) * 1000;
  if (amount !== null && !(amount > 0)) amount = null;

  const nomeMatch = text.match(/(?:^|\s)(?:para|pra|pro)\s+(?:(?:a|o|minha|meu)\s+)?(\p{L}{2,})/iu);
  let nome = nomeMatch ? nomeMatch[1] : null;

  // Resposta curta a "para quem?": "Jessica", "pra Jessica", "a Jessica"
  if (!nome) {
    const words = text.replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
    const candidates = words.filter((w) => w.length >= 3 && !PIX_STOPWORDS.has(stripAccents(w.toLowerCase())));
    if (words.length <= 3 && candidates.length === 1) nome = candidates[0];
  }
  return { amount, nome };
};

const stripAccents = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '');

const PIX_STOPWORDS = new Set([
  'pix', 'reais', 'real', 'conto', 'contos', 'valor', 'para', 'pra', 'pro', 'faz', 'fazer', 'manda', 'mande', 'mandar',
  'envia', 'envie', 'enviar', 'transfere', 'transferir', 'transferencia', 'sim', 'nao', 'ok', 'por', 'favor', 'obrigado',
  'obrigada', 'mil', 'cem', 'dez', 'vinte', 'trinta', 'cinquenta', 'agora', 'hoje', 'ela', 'ele',
]);

// "Pix", "transferência", "transfere", ou "manda/envia/passa" + valor
const detectPixIntent = (text: string) => {
  const t = stripAccents(text.toLowerCase());
  if (/\bpix\b|transfer/.test(t)) return true;
  return /\b(mand|envi|pass)(a|e|ar|o)\b/.test(t) && /(\d|reais|\bconto)/.test(t);
};

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// Alturas fixas das barras do "waveform" do balão de áudio
const WAVE_BARS = [6, 10, 14, 9, 16, 12, 7, 13, 17, 11, 8, 15, 10, 6, 12, 16, 9, 13, 7, 11, 14, 8];

const AudioBubble: React.FC<{ url: string; duration: number }> = ({ url, duration }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play().catch(() => setPlaying(false));
  };

  return (
    <div className="flex items-center gap-2.5 w-[210px]">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          setCurrent(0);
        }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setCurrent(a.currentTime);
          setProgress(Math.min(1, a.currentTime / duration));
        }}
      />
      <button
        type="button"
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-[#EC7000] text-white flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
        aria-label={playing ? 'Pausar áudio' : 'Ouvir áudio'}
      >
        {playing ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white ml-0.5" />}
      </button>
      <div className="flex-1 flex items-center gap-[2px] h-5" aria-hidden="true">
        {WAVE_BARS.map((h, i) => (
          <span
            key={i}
            className={`w-[3px] rounded-full transition-colors ${
              i / WAVE_BARS.length < progress ? 'bg-[#EC7000]' : 'bg-slate-400/60'
            }`}
            style={{ height: h }}
          />
        ))}
      </div>
      <span className="text-[10px] text-slate-500 tabular-nums shrink-0">
        {formatDuration(playing || current > 0 ? current : duration)}
      </span>
    </div>
  );
};

export const IaiChatScreen: React.FC<IaiChatScreenProps> = ({
  onBack,
  onNavigate,
  onGoalCreated,
  onStartPixArea,
  saldos,
  onPixDone,
  initialPrompt,
  isGoalCreationFlow = false,
  salaryPlanMode = false,
  pixGuard = false,
  onPixGuardOptIn,
  className = '',
  skipIntro = false,
}) => {
  // Cliente exibida (nome fictício, números reais do extrato)
  const cliente = useCliente();

  // Opening preparation stages: 'preparing' -> 'ready' -> 'chat'
  const [openingPhase, setOpeningPhase] = useState<'preparing' | 'ready' | 'chat'>(
    skipIntro || isGoalCreationFlow || salaryPlanMode ? 'chat' : 'preparing'
  );

  // Jornada "plano do mês no dia do salário"
  const [plano, setPlano] = useState<PlanoSalarioData | null>(null);
  const [bioOpen, setBioOpen] = useState(false);
  const planoRef = useRef<PlanoSalarioData | null>(null);
  const sessionIdRef = useRef<string>(`session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  // Stepped conversational loading progress for IA.i response:
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLoadingSteps, setCurrentLoadingSteps] = useState<string[]>([
    'Analisando gastos mensais...',
    'Calculando médias de gastos por categoria...',
    'Organizando a resposta...',
    'Preparando a resposta...',
  ]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});

  // Fluxo Pix em tela cheia (telas de forma de pagamento → revisão → senha → sucesso)
  const [pixFlow, setPixFlow] = useState<{ amount: number; contato: PixContato } | null>(null);

  // Jornada "+ Nova Missão": 0 = fora da jornada, 1 = nome, 2 = valor, 3 = prazo
  const [goalFlowStep, setGoalFlowStep] = useState<0 | 1 | 2 | 3>(0);
  const goalDraftRef = useRef<{ title: string; target: number }>({ title: '', target: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialPromptSentRef = useRef(false);

  // Saldos vêm do App (os mesmos da Home e do Extrato)
  const loadSaldos = async (): Promise<PixSaldos> => saldos;

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Mensagem de voz: o áudio entra na conversa como balão; a transcrição (invisível) vira o pedido para a Ia.i
  const pendingAudioIdRef = useRef<string | null>(null);
  // Pix pedido pela metade (sem valor ou sem destinatário), completado pela próxima mensagem
  const pendingPixRef = useRef<{ amount: number | null; nome: string | null } | null>(null);
  const voice = useVoiceInput({
    onRecorded: ({ url, duration }) => {
      const id = `user-audio-${Date.now()}`;
      pendingAudioIdRef.current = id;
      setMessages((prev) => [...prev, { id, sender: 'user', text: '', timestamp: nowTime(), audio: { url, duration } }]);
      setCurrentLoadingSteps(['Ouvindo seu áudio...']);
      setLoadingStep(0);
      setIsLoading(true);
    },
    onResult: (text, pixIntent) => {
      const audioMsgId = pendingAudioIdRef.current ?? undefined;
      pendingAudioIdRef.current = null;
      handleSendMessage(text, { audioMsgId, pixIntent });
    },
    onError: (msg, recorded) => {
      if (!recorded) {
        notify(msg);
        return;
      }
      pendingAudioIdRef.current = null;
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `iai-${Date.now()}`,
          sender: 'iai',
          text: `Desculpe, ${cliente.primeiroNome}, não consegui entender o seu áudio. Pode gravar de novo, um pouco mais perto do microfone, ou digitar o que precisa?`,
          timestamp: nowTime(),
        },
      ]);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, loadingStep, openingPhase]);

  // Jornada "+ Nova Missão": abre direto na pergunta do nome da meta
  useEffect(() => {
    if (!isGoalCreationFlow) return;
    setGoalFlowStep(1);
    setMessages([
      {
        id: 'goal-step-1',
        sender: 'iai',
        text: 'Vamos criar sua meta! Qual o nome dela? Aqui vão alguns exemplos, se quiser usar um:',
        timestamp: nowTime(),
        chips: GOAL_FLOW_CHIPS[1],
      },
    ]);
  }, [isGoalCreationFlow]);

  // Jornada do salário: saudação com diagnóstico do Financial Agent + 3 cards
  useEffect(() => {
    if (!salaryPlanMode) return;
    logEvento('fab_opened', 'trigger=salary_received');

    setMessages([
      { id: 'plan-hello', sender: 'iai', text: `**ia.i**, ${cliente.primeiroNome}! Seu salário caiu.`, timestamp: nowTime() },
      {
        id: 'plan-hello-2',
        sender: 'iai',
        text: 'Consultando o diagnóstico do seu orçamento com o assistente financeiro...',
        timestamp: nowTime(),
      },
    ]);

    // 1. Consulta o diagnóstico proativo oficial do Financial Agent (/api/agent/analyze)
    fetch('/api/agent/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionIdRef.current }),
    })
      .then((r) => r.json())
      .then((analysis) => {
        const textoDiagnostico = analysis?.mensagem
          ? `${analysis.mensagem} ${analysis.pergunta || 'Quer ver quanto dá pra gastar por semana e fechar o mês no verde?'}`
          : 'Quer ver quanto dá pra gastar por semana e fechar o mês no verde?';

        setMessages([
          { id: 'plan-hello', sender: 'iai', text: `**ia.i**, ${cliente.primeiroNome}! Seu salário caiu.`, timestamp: nowTime() },
          {
            id: 'plan-hello-2',
            sender: 'iai',
            text: textoDiagnostico,
            timestamp: nowTime(),
            planCards: [
              { label: 'Quanto posso gastar por semana com tranquilidade?', action: 'semana' },
              { label: 'O que ainda vai sair da minha conta este mês?', action: 'saidas' },
              { label: 'Me avisa antes de um gasto apertar meu mês?', action: 'aviso' },
            ],
          },
        ]);
      })
      .catch(() => {
        setMessages([
          { id: 'plan-hello', sender: 'iai', text: `**ia.i**, ${cliente.primeiroNome}! Seu salário caiu.`, timestamp: nowTime() },
          {
            id: 'plan-hello-2',
            sender: 'iai',
            text: 'Quer ver quanto dá pra gastar por semana e fechar o mês no verde?',
            timestamp: nowTime(),
            planCards: [
              { label: 'Quanto posso gastar por semana com tranquilidade?', action: 'semana' },
              { label: 'O que ainda vai sair da minha conta este mês?', action: 'saidas' },
              { label: 'Me avisa antes de um gasto apertar meu mês?', action: 'aviso' },
            ],
          },
        ]);
      });

    // 2. Carrega os números da jornada enquanto a pessoa lê a saudação
    fetch('/api/plano-salario')
      .then((r) => r.json())
      .then((d: PlanoSalarioData) => {
        planoRef.current = d;
        setPlano(d);
      })
      .catch(() => {});
  }, [salaryPlanMode]);

  // Pergunta inicial (vinda da landing ou do extrato) enviada assim que o chat abre
  useEffect(() => {
    if (openingPhase !== 'chat' || !initialPrompt || initialPromptSentRef.current) return;
    initialPromptSentRef.current = true;
    handleSendMessage(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openingPhase, initialPrompt]);

  // Initial Opening Animation Transition matching Video 2 (00:08 - 00:11)
  useEffect(() => {
    if (skipIntro || isGoalCreationFlow || salaryPlanMode) return;

    // Phase 1 -> Phase 2 ("Preparando tudo por aqui..." -> "Pronto, vamos conversar!")
    const timer1 = setTimeout(() => {
      setOpeningPhase('ready');
    }, 1200);

    // Phase 2 -> Chat ("Pronto, vamos conversar!" -> Chat Screen)
    const timer2 = setTimeout(() => {
      setOpeningPhase('chat');
    }, 2200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [skipIntro]);

  const getConversationalLoadingSteps = (queryText: string): string[] => {
    const lower = queryText.toLowerCase();

    // Raio-X / Contas Fixas
    if (lower.includes('raio-x') || lower.includes('raio x') || lower.includes('contas fixas')) {
      return [
        'Analisando gastos mensais...',
        'Calculando médias de gastos por categoria...',
        'Identificando despesas fixas e débitos automáticos...',
        'Preparando o Raio-X das suas contas...',
      ];
    }

    // Lazer / Gastos sem culpa
    if (lower.includes('lazer') || lower.includes('sem culpa')) {
      return [
        'Analisando gastos mensais...',
        'Calculando médias de gastos por categoria...',
        'Avaliando margem segura para lazer e estilo de vida...',
        'Preparando limite recomendado sem culpa...',
      ];
    }

    // Divisão do salário
    if (
      lower.includes('divisão') ||
      lower.includes('divisao') ||
      lower.includes('essenciais') ||
      lower.includes('salário') ||
      lower.includes('salario')
    ) {
      return [
        'Analisando gastos mensais...',
        'Calculando médias de gastos por categoria...',
        'Simulando divisão entre essenciais e estilo de vida...',
        'Estruturando planejamento mensal do salário...',
      ];
    }

    // Transporte
    if (lower.includes('transporte') || lower.includes('teto')) {
      return [
        'Analisando gastos mensais...',
        'Calculando médias de gastos por categoria...',
        'Verificando despesas com combustível e mobilidade...',
        'Definindo teto de transporte do mês...',
      ];
    }

    // Pix
    if (lower.includes('pix') || lower.includes('transferir')) {
      return [
        'Localizando contatos...',
        'Consultando chaves Pix cadastradas...',
        'Verificando saldo e limites...',
        'Preparando as opções de destinatário...',
      ];
    }

    // Default conversational steps
    return [
      'Analisando gastos mensais...',
      'Calculando médias de gastos por categoria...',
      'Cruzando informações com seu perfil Itaú...',
      'Preparando a resposta...',
    ];
  };

  const handleSendMessage = async (
    textToSend?: string,
    opts?: { audioMsgId?: string; pixIntent?: VoicePixIntent | null; userShown?: boolean },
  ) => {
    const text = (textToSend || inputValue).trim();
    // Mensagem de voz já está em "loading" (ouvindo o áudio), por isso não é bloqueada aqui
    if (!text || (isLoading && !opts?.audioMsgId && !opts?.userShown)) return;

    if (goalFlowStep > 0) {
      handleGoalFlowStep(text, opts?.audioMsgId);
      return;
    }

    // Jornada do salário esperando uma resposta: se for uma resposta da etapa, a jornada segue;
    // se não for (outra pergunta), a mensagem já está na conversa e segue para a resposta normal.
    if (planStageRef.current && !opts?.userShown) {
      const tratou = await handlePlanText(text, opts?.audioMsgId);
      if (tratou) return;
      return handleSendMessage(text, { ...opts, audioMsgId: undefined, userShown: true });
    }

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Pix: intenção vinda do áudio (Gemini), frase com cara de Pix, ou resposta a um Pix que ficou pela metade
    const parsed = parsePixRequest(text);
    const pending = pendingPixRef.current;
    const continuesPending = !!pending && ((!pending.amount && !!parsed.amount) || (!pending.nome && !!parsed.nome));
    const isPixRequest = !!opts?.pixIntent || detectPixIntent(text) || continuesPending;
    const pixAmount = opts?.pixIntent?.valor || parsed.amount || pending?.amount || null;
    const pixNome = opts?.pixIntent?.destinatario || parsed.nome || pending?.nome || null;

    const steps = isPixRequest ? getConversationalLoadingSteps('pix') : getConversationalLoadingSteps(text);
    setCurrentLoadingSteps(steps);
    setLoadingStep(0);

    if (opts?.audioMsgId) {
      // Guarda a transcrição no balão de áudio (não exibida) para histórico e cópia
      setMessages((prev) => prev.map((m) => (m.id === opts.audioMsgId ? { ...m, text } : m)));
    } else if (opts?.userShown) {
      // Já exibida pela jornada do salário
      setInputValue('');
    } else {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text,
        timestamp: currentTime,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue('');
    }
    setIsLoading(true);

    // Run progressive conversational loading steps explaining analysis in real time
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 900);

    const lowerText = text.toLowerCase();

    // Check if user asked about profile/habits as in video
    const isProfileQuery =
      lowerText.includes('sabe sobre mim') ||
      lowerText.includes('habitos') ||
      lowerText.includes('hábitos') ||
      lowerText.includes('sobre mim') ||
      lowerText.includes('meu perfil');

    if (!isPixRequest) pendingPixRef.current = null;

    try {
      if (isPixRequest) {
        const amount = pixAmount;
        const nome = pixNome;
        const wait = new Promise((resolve) => setTimeout(resolve, 2800));

        if (!amount || !nome) {
          // Guarda o que já se sabe; a próxima mensagem ("10 reais", "pra Jessica") completa o pedido
          pendingPixRef.current = { amount, nome };
          await wait;
          const pergunta = !amount && !nome
            ? 'Para quem você quer enviar o Pix, e qual valor?'
            : !amount
              ? `Qual valor você quer enviar para ${nome!.charAt(0).toUpperCase()}${nome!.slice(1).toLowerCase()}?`
              : `Para quem você quer enviar os ${formatBRL(amount)}?`;
          setMessages((prev) => [
            ...prev,
            {
              id: `iai-${Date.now()}`,
              sender: 'iai',
              text: `Claro, posso te ajudar com esse Pix! ${pergunta}`,
              timestamp: nowTime(),
            },
          ]);
          return;
        }
        pendingPixRef.current = null;

        const [contatosRes] = await Promise.all([
          fetch(`/api/pix/contatos?nome=${encodeURIComponent(nome)}`).then((r) => r.json()),
          loadSaldos(),
          wait,
        ]);
        const contatos: PixContato[] = contatosRes.contatos || [];

        setMessages((prev) => [
          ...prev,
          {
            id: `iai-${Date.now()}`,
            sender: 'iai',
            text:
              contatos.length > 1
                ? 'Encontrei mais de uma pessoa com esse nome ou apelido. Escolha quem deve receber o Pix.'
                : 'Encontrei esta pessoa com esse nome. Confira se é ela quem deve receber o Pix.',
            timestamp: nowTime(),
            pixSelection: { amount, contatos },
          },
        ]);
        return;
      }

      const R = cliente;
      const tetoDe = (prefixo: string) => R.tetos.find((t) => t.categoria.startsWith(prefixo));
      const tetoEstilo = tetoDe('Lazer');
      const tetoTransp = tetoDe('Transporte');

      // Determina decorações visuais interativas (cards, botões de ação) para anexar à resposta oficial da IA
      const extraProps: Partial<ChatMessage> = {};
      if (isCategoryCapsRequest(text)) {
        extraProps.categoryCaps = R.tetos.map((t) => ({
          category: t.categoria,
          amount: t.valor,
          percentage: t.percentual,
          description: t.descricao,
          color: t.cor,
        }));
      } else if (lowerText.includes('raio-x') || lowerText.includes('raio x') || lowerText.includes('contas fixas') || isProfileQuery) {
        extraProps.quickAction = { type: 'view_wizard', label: 'Personalizar orçamento no simulador' };
      } else if ((lowerText.includes('lazer') || lowerText.includes('sem culpa')) && !lowerText.includes('impacto')) {
        const teto = tetoEstilo?.valor ?? 0;
        extraProps.quickAction = {
          type: 'create_goal',
          label: 'Salvar como meta: Lazer sem culpa',
          goal: { title: 'Lazer sem culpa', target: teto, deadline: 'este mês' },
        };
      } else if (lowerText.includes('transporte') || lowerText.includes('teto')) {
        const teto = tetoTransp?.valor ?? 0;
        extraProps.quickAction = {
          type: 'create_goal',
          label: 'Salvar teto de transporte como meta',
          goal: { title: 'Teto de transporte', target: teto, deadline: 'este mês' },
        };
      }

      // Toda análise e resposta textual é gerada oficialmente pelo backend (Financial Agent / Gemini + Guardrails)
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionIdRef.current,
        },
        body: JSON.stringify({
          userMessage: text,
          sessionId: sessionIdRef.current,
          stream: true,
          messages: messages.map((m) => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.text })),
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('text/event-stream') && response.body) {
        clearInterval(stepInterval);
        setIsLoading(false);

        const msgId = `iai-${Date.now()}`;
        let accumulatedText = '';
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setMessages((prev) => [
          ...prev,
          {
            id: msgId,
            sender: 'iai',
            text: '',
            timestamp,
          },
        ]);

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages((prev) =>
                  prev.map((m) => (m.id === msgId ? { ...m, text: accumulatedText } : m))
                );
              }
            } catch {
              // ignore non-json chunk
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  // Stream vazio é falha: mostra o erro honesto, sem os botões de ação
                  ...(accumulatedText.trim() ? { text: accumulatedText.trim(), ...extraProps } : { text: CHAT_ERROR_TEXT }),
                }
              : m
          )
        );
      } else {
        const data = response.ok ? await response.json().catch(() => null) : null;

        // Sem texto do agente (HTTP de erro ou corpo inválido): erro honesto, sem os botões de ação
        const iaiMsg: ChatMessage = {
          id: `iai-${Date.now()}`,
          sender: 'iai',
          text: data?.text || CHAT_ERROR_TEXT,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ...(data?.text ? extraProps : {}),
        };

        setMessages((prev) => [...prev, iaiMsg]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `iai-${Date.now()}`,
          sender: 'iai',
          text: CHAT_ERROR_TEXT,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
    }
  };

  const buildGoal = (title: string, target: number, deadline: string, currentAmount = 0): FinancialGoal => {
    const lower = title.toLowerCase();
    return {
      id: `goal-${Date.now()}`,
      title,
      category: lower.includes('casa') ? 'moradia' : lower.includes('carro') || lower.includes('transporte') ? 'transporte' : 'geral',
      targetAmount: target,
      currentAmount,
      color: '#EC7000',
      iconName: lower.includes('casa') ? 'Home' : lower.includes('carro') ? 'Car' : 'Sparkles',
      deadline,
      itauShopPointsBonus: 500,
      suggestedInvestments: DEFAULT_INVESTMENT_OPTIONS,
      level: 1,
    };
  };

  // Jornada "+ Nova Missão": nome → valor → prazo → meta criada na tela inicial (+500 pts Itaú Shop)
  const handleGoalFlowStep = (text: string, audioMsgId?: string) => {
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, sender: 'user', text, timestamp: nowTime() };
    const iai = (msgText: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
      id: `iai-${Date.now() + 1}`,
      sender: 'iai',
      text: msgText,
      timestamp: nowTime(),
      ...extra,
    });
    const addMessages = (reply: ChatMessage) => {
      setMessages((prev) => [
        ...(audioMsgId ? prev.map((m) => (m.id === audioMsgId ? { ...m, text } : m)) : [...prev, userMsg]),
        reply,
      ]);
      setInputValue('');
      if (audioMsgId) setIsLoading(false);
    };

    if (goalFlowStep === 1) {
      const title = text.charAt(0).toUpperCase() + text.slice(1);
      goalDraftRef.current = { title, target: 0 };
      addMessages(iai(`Boa escolha! Qual o valor estimado para "${title}"?`, { chips: GOAL_FLOW_CHIPS[2] }));
      setGoalFlowStep(2);
    } else if (goalFlowStep === 2) {
      const { amount } = parsePixRequest(text);
      if (!amount) {
        addMessages(iai('Não entendi o valor. Pode me dizer quanto você precisa juntar? Por exemplo: R$ 50.000.', { chips: GOAL_FLOW_CHIPS[2] }));
        return;
      }
      goalDraftRef.current.target = amount;
      addMessages(iai('E quando você pretende concluir essa meta?', { chips: GOAL_FLOW_CHIPS[3] }));
      setGoalFlowStep(3);
    } else if (goalFlowStep === 3) {
      const { title, target } = goalDraftRef.current;
      const goal = buildGoal(title, target, text);
      onGoalCreated?.(goal);
      addMessages(
        iai(
          `Meta criada! **"${title}"**: ${formatBRL(target)} até ${text}. Já adicionei na sua tela inicial com **+500 pontos no Itaú Shop**! 🎯\n\nA cada aporte você ganha mais pontos para trocar na loja.`,
          { quickAction: { type: 'view_home', label: 'Ver na tela inicial' } },
        ),
      );
      setGoalFlowStep(0);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 }, colors: ['#EC7000', '#002244', '#FFC107'] });
    }
  };

  // ================= Jornada "plano do mês no dia do salário" =================
  // Os cards de resposta aparecem só na saudação. Depois da primeira análise a conversa é livre (texto ou voz):
  // cada etapa termina com uma pergunta e a resposta é interpretada (Gemini) para seguir a jornada.
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const pushUser = (text: string) =>
    setMessages((prev) => [...prev, { id: `user-${Date.now()}-${Math.random()}`, sender: 'user', text, timestamp: nowTime() }]);
  const pushIai = (text: string, extra: Partial<ChatMessage> = {}) =>
    setMessages((prev) => [
      ...prev,
      { id: `iai-${Date.now()}-${Math.random()}`, sender: 'iai', text, timestamp: nowTime(), ...extra },
    ]);

  // "Analisando os dados": no produto, é onde roda o cálculo determinístico
  const thinking = async (ms = 1300, texto = 'Analisando os dados') => {
    setCurrentLoadingSteps([texto]);
    setLoadingStep(0);
    setIsLoading(true);
    await wait(ms);
    setIsLoading(false);
  };

  const getPlano = async (): Promise<PlanoSalarioData | null> => {
    if (planoRef.current) return planoRef.current;
    try {
      const d: PlanoSalarioData = await fetch('/api/plano-salario').then((r) => r.json());
      planoRef.current = d;
      setPlano(d);
      return d;
    } catch {
      return null;
    }
  };

  // Etapa atual da jornada e as respostas que ela aceita
  const planStageRef = useRef<PlanStage>(null);
  const setStage = (s: PlanStage) => {
    planStageRef.current = s;
  };

  const opcoesDaEtapa = (stage: Exclude<PlanStage, null>, d: PlanoSalarioData): PlanOption[] => {
    switch (stage) {
      case 'depois_semana':
      case 'depois_aviso':
        return [
          { id: 'saidas', descricao: 'quer ver o que ainda vai sair da conta até o salário (sim, quero, mostra)', palavras: ['sim', 'quero', 'mostra', 'pode', 'ver'] },
          { id: 'encerrar', descricao: 'não quer agora (não, agora não, depois, obrigada)', palavras: ['não', 'nao', 'depois', 'obrigad'] },
        ];
      case 'corte':
        return [
          { id: 'ver_corte', descricao: 'aceita cortar os streamings / quer ver como fica sem eles', palavras: ['ver como fica', 'cortar', 'cancel', 'aceito', 'quero ver'] },
          { id: 'outro_jeito', descricao: 'quer manter as assinaturas / pergunta se tem outro jeito / não quer cortar', palavras: ['outro', 'manter', 'não quero', 'nao quero', 'alternativa'] },
        ];
      case 'alternativa':
        return [
          { id: 'reagendar', descricao: 'escolhe reagendar o Pix para o dia do salário', palavras: ['reagend', 'pix', 'primeira', 'mudar a data'] },
          {
            id: 'segunda',
            descricao:
              d.projecao.saldoFinal < 0 || !d.ajusteGasto
                ? 'escolhe deixar o limite da conta cobrir'
                : `escolhe colocar um teto de gastos em ${d.ajusteGasto.categoria}`,
            palavras: ['limite', 'teto', 'segunda'],
          },
          { id: 'nenhuma', descricao: 'não quer nenhuma das duas opções', palavras: ['nenhuma', 'nada', 'não quero', 'nao quero'] },
        ];
      case 'confirmacao':
        return [
          { id: 'confirmar', descricao: 'confirma o reagendamento (sim, pode, confirma, ok)', palavras: ['sim', 'pode', 'confirm', 'ok', 'bora', 'fechado'] },
          { id: 'desistir', descricao: 'não quer reagendar agora (não, espera, cancelar)', palavras: ['não', 'nao', 'cancel', 'espera'] },
        ];
      case 'avisar':
        return [
          { id: 'avisar', descricao: 'quer avisar quem recebe o Pix (sim, avisa, manda)', palavras: ['sim', 'avis', 'manda', 'quero'] },
          { id: 'nao_precisa', descricao: 'não precisa avisar', palavras: ['não', 'nao', 'precisa'] },
        ];
      case 'optin':
        return [
          { id: 'optin', descricao: 'aceita receber o aviso antes de um gasto apertar o mês (sim, pode, quero)', palavras: ['sim', 'pode', 'quero', 'avis'] },
          { id: 'recusar', descricao: 'não quer receber o aviso agora', palavras: ['não', 'nao', 'agora não', 'depois'] },
        ];
    }
  };

  // Classifica a resposta livre; sem Gemini (ou com erro), usa palavras-chave apenas para respostas curtas
  const classificar = async (texto: string, stage: Exclude<PlanStage, null>, opcoes: PlanOption[]): Promise<string | null> => {
    try {
      const r = await fetch('/api/plano-salario/intencao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, etapa: stage, opcoes: opcoes.map(({ id, descricao }) => ({ id, descricao })) }),
      }).then((res) => res.json());
      if (r.origem === 'gemini') return r.opcao ?? null;
    } catch {
      /* segue para as palavras-chave apenas se houver falha de rede */
    }
    // Se o usuário digitou uma frase mais longa (mais de 3 palavras), não forçamos palavras-chave:
    // é uma pergunta ou dúvida legítima que deve ir diretamente para o Financial Agent!
    const palavrasTexto = texto.trim().split(/\s+/);
    if (palavrasTexto.length > 3) {
      return null;
    }
    const t = texto.toLowerCase();
    return opcoes.find((o) => o.palavras.some((p) => t.includes(p)))?.id ?? null;
  };

  /** Resposta livre durante a jornada. Devolve true se virou uma ação da jornada. */
  const handlePlanText = async (text: string, audioMsgId?: string): Promise<boolean> => {
    const stage = planStageRef.current;
    const d = planoRef.current;
    if (!stage || !d) return false;
    if (audioMsgId) setMessages((prev) => prev.map((m) => (m.id === audioMsgId ? { ...m, text } : m)));
    else {
      pushUser(text);
      setInputValue('');
    }
    setCurrentLoadingSteps(['Entendendo sua resposta']);
    setLoadingStep(0);
    setIsLoading(true);
    const opcao = await classificar(text, stage, opcoesDaEtapa(stage, d));
    setIsLoading(false);
    if (!opcao) {
      setStage(null); // Importante: reseta a etapa para que a conversa siga 100% livre com o Financial Agent
      return false; // não é uma resposta da etapa: o chat responde normalmente com o Financial Agent
    }
    logEvento('intent_classified', `${stage}=${opcao}`);
    await runPlanAction(opcao, text, true);
    return true;
  };

  const handlePlanCard = (card: PlanCard, msgId: string) => {
    // Os cards (só na saudação) somem depois do toque
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, planCards: undefined } : m)));
    runPlanAction(card.action, card.label, false);
  };

  const perguntarOptin = async () => {
    await wait(700);
    pushIai('Pra manter o mês no verde, posso te dar um toque antes de algum gasto apertar?');
    setStage('optin');
  };

  const runPlanAction = async (action: string, label: string, userShown: boolean) => {
    if (!userShown) pushUser(label);
    const d = await getPlano();
    if (!d) {
      notify('Não consegui carregar os dados do seu extrato agora. Tente de novo em instantes.');
      return;
    }
    const p = d.pix;
    setStage(null);

    // ---------- Card 1: quanto posso gastar por semana ----------
    if (action === 'semana') {
      logEvento('card_selected', 'weekly_budget');
      await thinking();
      const s = d.semana;
      pushIai(
        `Até o seu próximo salário, em ${d.cliente.proximoSalario.formatado}, são ${s.diasAteSalario} dias. Já descontando as contas que ainda vão sair (${brl(d.totalSaidas)}), dá pra gastar até **${brl(s.limiteSemanalHoje)} por semana** com tranquilidade.`,
        { planBlock: 'semana' },
      );
      await wait(500);
      pushIai(
        d.projecao.saldoFinal < 0
          ? `Mas atenção: mesmo no ritmo de costume, a conta fica negativa perto de ${d.projecao.diaQueAcabaFormatado}. Quer que eu te mostre o que ainda vai sair da sua conta e como resolver?`
          : `Nesse ritmo você chega ao salário com ${brl(d.projecao.saldoFinal)}${d.semMargem ? ', uma folga pequena para qualquer imprevisto' : ''}. Quer que eu te mostre o que ainda vai sair da sua conta?`,
      );
      setStage('depois_semana');
      return;
    }

    // ---------- Card 3: me avisa antes de um gasto apertar o mês ----------
    if (action === 'aviso') {
      logEvento('card_selected', 'spending_alert');
      await thinking();
      const exemplo = Math.max(50, Math.ceil((Math.max(0, d.projecao.saldoFinal) + 100) / 50) * 50);
      let sim: any = null;
      try {
        sim = await fetch('/api/pix/simular', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valor: exemplo }),
        }).then((r) => r.json());
      } catch {
        sim = null;
      }
      pushIai(
        `Claro! Hoje sua folga até o salário é de **${brl(d.projecao.saldoFinal)}**. ` +
          (sim?.fica_negativo
            ? `Um gasto de ${brl(exemplo)} fora do planejado já deixaria a conta [[neg:negativa a partir de ${sim.formatado?.dia_que_acaba_depois || 'antes do salário'}]]${sim.formatado?.juros_adicionais ? `, com cerca de ${sim.formatado.juros_adicionais} a mais de juros` : ''}.`
            : `Um gasto de ${brl(exemplo)} fora do planejado ainda cabe, mas qualquer coisa acima disso aperta o mês.`),
        { planBlock: 'grafico-neg' },
      );
      onPixGuardOptIn?.();
      logEvento('alert_opt_in', 'pix_guard=on source=card');
      await wait(600);
      pushIai(
        'Pronto, **aviso ativado** ✅. Antes de um Pix que aperte o mês, eu te mostro o impacto e você decide se continua. Quer que eu te mostre também o que ainda vai sair da sua conta até o salário?',
      );
      setStage('depois_aviso');
      return;
    }

    if (action === 'encerrar') {
      await wait(400);
      pushIai('Combinado! Se precisar, é só me chamar por aqui. 🧡');
      return;
    }

    // ---------- Card 2 (fluxo principal): saídas do mês + projeção + sugestão de corte ----------
    if (action === 'saidas') {
      logEvento('card_selected', 'upcoming_outflows');
      await thinking();
      pushIai(`Até o seu próximo salário, em ${d.cliente.proximoSalario.formatado}, ainda vão sair:`, { planBlock: 'saidas' });
      await wait(600);
      pushIai(
        d.projecao.saldoFinal < 0
          ? `Com isso e os seus gastos de costume, a previsão é fechar o mês com [[neg:${brl(Math.abs(d.projecao.saldoFinal))} no negativo]] e pagar juros do limite.`
          : d.semMargem
            ? `Com isso e os seus gastos de costume, a previsão é fechar o mês com só [[neg:${brl(d.projecao.saldoFinal)} de folga]]. A renda cobre as despesas, mas um gasto fora do planejado já leva a conta ao negativo.`
            : `Com isso e os seus gastos de costume, a previsão é fechar o mês com [[pos:${brl(d.projecao.saldoFinal)} sobrando]].`,
        { planBlock: 'grafico-neg' },
      );
      logEvento('risk_projected', `end_balance=${d.projecao.saldoFinal}`);
      await wait(700);
      const c = d.corte;
      if (c) {
        const lista = c.servicos.join(', ').replace(/, ([^,]*)$/, ' e $1');
        pushIai(
          c.resolve
            ? `Tem um ajuste pequeno que ${d.projecao.saldoFinal < 0 ? 'muda isso' : 'aumenta essa folga'}: você tem ${c.servicos.length} serviços de vídeo (${lista}). Ficando só com ${c.mantido}, você economiza **${brl(c.economiaMensal)} por mês** e fecha o mês com [[pos:${brl(c.saldoFinalComCorte)} sobrando]].\n\nQuer ver como fica sem esses streamings, ou prefere outro jeito?`
            : `Tem um ajuste pequeno que ajuda: você tem ${c.servicos.length} serviços de vídeo (${lista}). Ficando só com ${c.mantido}, você economiza **${brl(c.economiaMensal)} por mês** e libera ${brl(c.ganhoAteSalario)} até o salário, mas ainda fecharia com [[neg:${signed(c.saldoFinalComCorte)}]].\n\nQuer ver como fica sem esses streamings, ou prefere outro jeito?`,
        );
        setStage('corte');
      } else if (p) {
        pushIai('Achei um jeito de melhorar isso sem mexer nas suas assinaturas. Quer ver?');
        setStage('corte');
      }
      return;
    }

    // Aceitou o corte dos streamings
    if (action === 'ver_corte' && d.corte) {
      logEvento('suggestion_accepted', 'type=cancel_subscription');
      fetch('/api/plano-salario/decisao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ajusteId: d.corte.ajusteId, aceito: true }),
      }).catch(() => {});
      await thinking(900);
      const cancelar = d.corte.servicos.filter((s) => s !== d.corte!.mantido).join(' e ');
      pushIai(
        `Fica assim: mantendo o ${d.corte.mantido} e cancelando ${cancelar}, você economiza **${brl(d.corte.economiaMensal)} por mês** e fecha este mês com [[${d.corte.saldoFinalComCorte >= 0 ? 'pos' : 'neg'}:${signed(d.corte.saldoFinalComCorte)}]]. Veja [Como cancelar uma assinatura de streaming ou serviço](/ajuda/cancelar-assinatura).`,
      );
      await perguntarOptin();
      return;
    }

    // Recusou o corte → alternativas
    if (action === 'outro_jeito' || (action === 'ver_corte' && !d.corte)) {
      logEvento('suggestion_rejected', 'type=cancel_subscription');
      if (d.corte) {
        fetch('/api/plano-salario/decisao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ajusteId: d.corte.ajusteId, aceito: false }),
        }).catch(() => {});
      }
      if (!p) {
        pushIai('Por enquanto não encontrei outra saída no seu extrato.');
        await perguntarOptin();
        return;
      }
      await thinking();

      // Consulta o /api/agent/savings para carregar alternativas reais calculadas pelo agente
      let savingsData: any = null;
      try {
        savingsData = await fetch('/api/agent/savings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionIdRef.current, consent: true }),
        }).then((r) => r.json());
      } catch {
        savingsData = null;
      }

      if (savingsData?.acoes && savingsData.acoes.length > 0) {
        const resumoAcoes = savingsData.acoes
          .map((a: any) => `• **${a.titulo}**${a.descricao ? `: ${a.descricao}` : ''}`)
          .join('\n');
        pushIai(
          `Claro! O **Financial Agent** calculou oportunidades para manter seu orçamento protegido:\n\n${resumoAcoes}`,
          { planBlock: 'alternativas' },
        );
      } else {
        pushIai('Claro! Achei duas saídas que não mexem nas suas assinaturas:', { planBlock: 'alternativas' });
      }

      logEvento('alternatives_offered', 'n=2');
      await wait(400);
      pushIai('Qual dessas faz mais sentido pra você?');
      setStage('alternativa');
      return;
    }

    // Segunda alternativa: teto numa categoria (sem margem) ou limite da conta (negativo)
    if (action === 'segunda') {
      logEvento('alternative_selected', d.projecao.saldoFinal < 0 || !d.ajusteGasto ? 'overdraft' : 'category_cap');
      await thinking(900);
      if (d.projecao.saldoFinal >= 0 && d.ajusteGasto) {
        pushIai(
          `Combinado! Coloquei um teto de **${brl(d.ajusteGasto.tetoSugerido)}** em ${d.ajusteGasto.categoria} este mês. Quando você chegar perto dele, eu te aviso, assim esse gasto não vira o imprevisto que leva a conta ao negativo.`,
        );
      } else {
        pushIai(
          `Tudo bem. O limite da conta cobre esses dias, com cerca de ${brl(d.limiteConta.juros)} de juros. Se mudar de ideia, reagendar o Pix continua disponível.`,
        );
      }
      await perguntarOptin();
      return;
    }

    if (action === 'nenhuma' || action === 'desistir') {
      await wait(500);
      pushIai('Sem problemas, não mexi em nada. Se quiser rever depois, é só me chamar.');
      await perguntarOptin();
      return;
    }

    // Reagendar o Pix → proposta com impacto nos dois meses
    if (action === 'reagendar' && p) {
      logEvento('alternative_selected', 'reschedule_pix');
      await thinking(900);
      pushIai('Vou reagendar assim:', { planBlock: 'proposta' });
      await wait(400);
      pushIai('Posso confirmar o reagendamento?');
      setStage('confirmacao');
      return;
    }

    // Confirmação → biometria
    if (action === 'confirmar' && p) {
      setBioOpen(true);
      logEvento('auth_requested', 'biometrics');
      return;
    }

    if (action === 'avisar' || action === 'nao_precisa') {
      if (action === 'avisar' && p) {
        const texto = `Oi! Reagendei o Pix de ${brl(p.valor)} para o dia ${p.novaData}.`;
        // O banco não envia a mensagem: abre o compartilhamento do celular
        try {
          if (navigator.share) await navigator.share({ text: texto });
          else {
            await navigator.clipboard?.writeText(texto);
            notify('Mensagem copiada para você compartilhar');
          }
        } catch {
          /* compartilhamento cancelado */
        }
        logEvento('share_opened');
      }
      await perguntarOptin();
      return;
    }

    if (action === 'optin' || action === 'recusar') {
      if (action === 'optin') {
        logEvento('alert_opt_in', 'pix_guard=on');
        onPixGuardOptIn?.();
      }
      await wait(700);
      pushIai(action === 'optin' ? 'Combinado! Vou ficar de olho. 👀' : 'Tudo bem! Se mudar de ideia, é só me pedir.');
      pushIai('', { planBlock: 'avaliacao' });
    }
  };

  // Biometria confirmada → reagenda o Pix e recalcula a projeção
  const handleBiometriaOk = async () => {
    setBioOpen(false);
    const d = planoRef.current;
    if (!d?.pix) return;
    const p = d.pix;
    await fetch('/api/plano-salario/reagendar', { method: 'POST' }).catch(() => {});
    logEvento('pix_rescheduled', `${p.dataAtual} -> ${p.novaData}`);
    await thinking(700);
    pushIai(`Pronto! O Pix de ${brl(p.valor)} vai sair no dia ${p.novaData}. ✅`);
    pushIai(
      p.saldoFinalMes >= 0
        ? `Seu mês agora fecha com [[pos:${brl(p.saldoFinalMes)} sobrando]], e dá pra gastar até **${brl(p.limiteSemanal)} por semana**.`
        : `Seu mês agora fecha com [[neg:${signed(p.saldoFinalMes)}]].`,
      { planBlock: 'grafico-pos' },
    );
    logEvento('projection_updated', `end_balance=${p.saldoFinalMes}`);
    await wait(500);
    pushIai('Quer avisar quem recebe o Pix da nova data?');
    setStage('avisar');
  };

  const handleAvaliacao = async (voto: 'up' | 'down', motivo: string) => {
    logEvento('feedback', `${voto} · ${motivo}`);
    await wait(500);
    pushIai(
      'No fim do mês, eu confiro no extrato se o negativo foi evitado. Esse é o resultado que conta, não o clique.',
      { subtle: true },
    );
    logEvento('month_end_check', 'scheduled');
  };

  const handleClose = () => {
    // Fechar a jornada pelo X conta como recusa
    if (salaryPlanMode) logEvento('chat_closed');
    onBack();
  };

  const handleQuickAction = (action: QuickAction, msgId: string) => {
    if (action.type === 'view_wizard') onNavigate?.('wizard');
    else if (action.type === 'view_home') onNavigate?.('hub');
    else if (action.type === 'create_goal') {
      onGoalCreated?.(buildGoal(action.goal.title, action.goal.target, action.goal.deadline));
      // Evita salvar a mesma meta duas vezes
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, quickAction: undefined } : m)));
      notify(`Meta "${action.goal.title}" adicionada à tela inicial (+500 pts)`);
    }
  };

  // Tela 1 → 2: usuário escolhe o destinatário; a Ia.i mostra o card de revisão no chat
  const handleSelectContato = (contato: PixContato, amount: number) => {
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, sender: 'user', text: contato.nome, timestamp: nowTime() },
      {
        id: `iai-${Date.now() + 1}`,
        sender: 'iai',
        text: '',
        timestamp: nowTime(),
        pixReview: { amount, contato },
      },
    ]);
  };

  const handleNotFound = () => {
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, sender: 'user', text: 'Não encontrei quem eu procurava', timestamp: nowTime() },
      {
        id: `iai-${Date.now() + 1}`,
        sender: 'iai',
        text: 'Sem problemas! Me diga o nome completo ou o apelido de quem vai receber, junto com o valor. Por exemplo: "Pix de R$ 10 para Jessica Costa".',
        timestamp: nowTime(),
      },
    ]);
  };

  // Tela 2 → 3: "Continuar" abre o fluxo em tela cheia
  const handleOpenPixFlow = async (contato: PixContato, amount: number) => {
    await loadSaldos();
    setPixFlow({ amount, contato });
  };

  // Tela 6 → chat: volta para a conversa com o comprovante
  const handlePixDone = (comprovante: PixComprovante, action: 'voltar' | 'nova') => {
    setPixFlow(null);
    onPixDone?.(comprovante);

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#EC7000', '#002244', '#32BCAD'],
    });

    setMessages((prev) => [
      ...prev,
      {
        id: `receipt-${Date.now()}`,
        sender: 'iai',
        text: `Pronto, ${cliente.primeiroNome}! Seu Pix de **${formatBRL(comprovante.amount)}** para **${comprovante.contato.primeiroNome}** foi enviado. Aqui está o comprovante:`,
        timestamp: nowTime(),
        pixReceipt: comprovante,
      },
    ]);

    if (action === 'nova') {
      setInputValue('Envia um Pix de R$ ');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleFeedback = (msgId: string, type: 'up' | 'down') => {
    setFeedbackGiven((prev) => ({ ...prev, [msgId]: type }));
    logEvento('feedback', type);
    notify(type === 'up' ? 'Obrigado pelo feedback!' : 'Feedback registrado para melhoria.');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    notify('Resposta copiada para a área de transferência!');
  };

  // ================= RENDER PHASE 1 & 2: OPENING PREPARATION ANIMATION (Video 2 00:08 - 00:11) =================
  if (openingPhase === 'preparing' || openingPhase === 'ready') {
    return (
      <div className={`flex flex-col flex-1 min-h-0 h-full bg-[#FAF9F7] relative overflow-hidden font-sans select-none ${className}`}>
        {/* Top Header with Close (X) */}
        <header className="px-5 pt-3 pb-2 flex items-center justify-end shrink-0">
          <button
            onClick={onBack}
            type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </header>

        {/* Center / Bottom Preparation Card matching Video 2 */}
        <div className="flex-1 flex flex-col justify-end items-center pb-24 px-6 text-center">
          {openingPhase === 'preparing' ? (
            <div className="flex flex-col items-center animate-fadeIn">
              {/* Spinning Sparkle Loader */}
              <div className="w-12 h-12 rounded-full bg-[#FFF4EB] border border-[#FFD8B5] flex items-center justify-center shadow-xs mb-3.5">
                <Sparkles className="w-6 h-6 text-[#EC7000] fill-[#EC7000] animate-spin" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Preparando tudo por aqui...
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Feito com a segurança Itaú
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center animate-scaleUp">
              {/* Checkmark in red/orange circular border matching Video 2 (00:10) */}
              <div className="w-11 h-11 rounded-full border-2 border-[#EC7000] flex items-center justify-center mb-3.5 bg-white shadow-xs">
                <Check className="w-6 h-6 text-[#EC7000] stroke-[2.5]" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Pronto, vamos conversar!
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Feito com a segurança Itaú
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= RENDER PHASE 3: CONVERSATIONAL CHAT (Video 1 & Video 2 00:12) =================
  return (
    <div className={`flex flex-col flex-1 min-h-0 h-full bg-[#FAF9F7] relative overflow-hidden font-sans text-slate-800 ${className}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-[#002244] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-slate-700 animate-fadeIn pointer-events-none">
          {toastMessage}
        </div>
      )}

      {/* Fluxo Pix em tela cheia */}
      {pixFlow && (
        <PixFlow
          amount={pixFlow.amount}
          contato={pixFlow.contato}
          saldos={saldos}
          pixGuard={pixGuard}
          onClose={() => setPixFlow(null)}
          onDone={handlePixDone}
        />
      )}

      {/* Confirmação biométrica do reagendamento (jornada do salário) */}
      {bioOpen && plano && (
        <BiometriaOverlay plano={plano} onConfirm={handleBiometriaOk} onCancel={() => setBioOpen(false)} />
      )}

      {/* Header matching Video 2: Back (<), Pill "Hoje", Close (X) */}
      <header className="sticky top-0 z-20 bg-[#FAF9F7]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-100 shrink-0">
        <button
          onClick={handleClose}
          type="button"
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          aria-label="Voltar"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600 stroke-[2]" />
        </button>

        {/* "Hoje" Pill Badge */}
        <div className="bg-white border border-slate-200/70 px-3 py-0.5 rounded-full shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500">Hoje</span>
        </div>

        <button
          onClick={handleClose}
          type="button"
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          aria-label="Fechar conversa"
        >
          <X className="w-5 h-5 text-slate-600 stroke-[2]" />
        </button>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5">
        {/* Initial Assistant Welcoming Message & Suggestion Cards (Video 2 00:12) — oculto na jornada "+ Nova Missão" */}
        {!isGoalCreationFlow && !salaryPlanMode && (
        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-[#EC7000] fill-[#EC7000]" />
          </div>

          <div className="space-y-3 flex-1 max-w-[320px]">
            <p className="text-xs font-semibold text-slate-800 leading-snug">
              ia.i, {cliente.primeiroNome}! Vamos programar os gastos deste mês?
            </p>

            {/* Suggestion Cards */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSendMessage('Faça o Raio-X das minhas contas fixas.')}
                className="w-full text-left p-3.5 bg-white hover:bg-[#FFF8F2] border border-slate-200/80 hover:border-[#FFD8B5] rounded-2xl shadow-2xs transition-all cursor-pointer group active:scale-[0.98]"
              >
                <span className="text-xs text-slate-700 group-hover:text-[#EC7000] leading-snug block font-medium">
                  Faça o Raio-X das minhas contas fixas.
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage('Quanto posso gastar com lazer sem culpa?')}
                className="w-full text-left p-3.5 bg-white hover:bg-[#FFF8F2] border border-slate-200/80 hover:border-[#FFD8B5] rounded-2xl shadow-2xs transition-all cursor-pointer group active:scale-[0.98]"
              >
                <span className="text-xs text-slate-700 group-hover:text-[#EC7000] leading-snug block font-medium">
                  Quanto posso gastar com lazer sem culpa?
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage('Programe a divisão do salário entre gastos essenciais e não essenciais.')}
                className="w-full text-left p-3.5 bg-white hover:bg-[#FFF8F2] border border-slate-200/80 hover:border-[#FFD8B5] rounded-2xl shadow-2xs transition-all cursor-pointer group active:scale-[0.98]"
              >
                <span className="text-xs text-slate-700 group-hover:text-[#EC7000] leading-snug block font-medium">
                  Programe a divisão do salário entre gastos essenciais e não essenciais.
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage('Definir meu teto de gastos de transporte do mês.')}
                className="w-full text-left p-3.5 bg-white hover:bg-[#FFF8F2] border border-slate-200/80 hover:border-[#FFD8B5] rounded-2xl shadow-2xs transition-all cursor-pointer group active:scale-[0.98]"
              >
                <span className="text-xs text-slate-700 group-hover:text-[#EC7000] leading-snug block font-medium">
                  Definir meu teto de gastos de transporte do mês.
                </span>
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Dynamic Chat Messages */}
        {messages.map((msg) => (
          <div key={msg.id} className="animate-fadeIn">
            {msg.sender === 'user' ? (
              /* User Message - Right Aligned with the client avatar */
              <div className="flex items-end justify-end gap-2.5">
                <div className="bg-[#EBEFF4] border border-slate-200/80 rounded-2xl rounded-tr-xs px-4 py-2.5 max-w-[280px] shadow-2xs">
                  {msg.audio ? (
                    <AudioBubble url={msg.audio.url} duration={msg.audio.duration} />
                  ) : (
                    <p className="text-xs text-slate-900 leading-relaxed font-normal">
                      {msg.text}
                    </p>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                    <span>{msg.timestamp}</span>
                    <CheckCheck className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
                  </div>
                </div>

                {/* Dark User Avatar (iniciais da cliente) */}
                <div className="w-8 h-8 rounded-full bg-[#1A1F2C] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs" title={cliente.nome}>
                  {cliente.iniciais}
                </div>
              </div>
            ) : (
              /* Assistant Message - Left Aligned with Sparkle Icon matching Video 1 */
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-[#EC7000] fill-[#EC7000]" />
                </div>

                <div className="flex-1 max-w-[340px] space-y-3">
                  <div
                    className="text-xs text-slate-800 leading-relaxed space-y-2 whitespace-pre-line"
                    onClick={(e) => {
                      // Artigo da Central de Ajuda: link dentro do app (o artigo em si ainda não existe)
                      const link = (e.target as HTMLElement).closest('a[data-ajuda]') as HTMLAnchorElement | null;
                      if (!link) return;
                      e.preventDefault();
                      logEvento('help_article_opened', link.getAttribute('href') || '');
                      notify(`Abrindo “${link.dataset.ajuda}” na Central de Ajuda`);
                    }}
                  >
                    {msg.text.split('\n\n').filter(Boolean).map((paragraph, idx) => (
                      <p
                        key={idx}
                        dangerouslySetInnerHTML={{ __html: formatRich(paragraph) }}
                        className={msg.subtle ? 'text-[11px] text-slate-500 leading-relaxed' : 'text-slate-800 leading-relaxed'}
                      />
                    ))}
                  </div>

                  {/* Blocos da jornada "plano do mês no dia do salário" */}
                  {msg.planBlock && plano && (
                    <>
                      {msg.planBlock === 'saidas' && <SaidasBox plano={plano} />}
                      {msg.planBlock === 'semana' && <SemanaBox plano={plano} />}
                      {msg.planBlock === 'grafico-neg' && <ChartBox plano={plano} tipo="neg" />}
                      {msg.planBlock === 'grafico-pos' && <ChartBox plano={plano} tipo="pos" />}
                      {msg.planBlock === 'alternativas' && <AlternativasBox plano={plano} />}
                      {msg.planBlock === 'proposta' && <PropostaBox plano={plano} />}
                      {msg.planBlock === 'avaliacao' && <AvaliacaoCard onSend={handleAvaliacao} />}
                    </>
                  )}

                  {/* Cards de resposta da jornada: frase em primeira pessoa, alinhados à direita */}
                  {msg.planCards && (
                    <div className="flex flex-col items-end gap-2 pt-1">
                      {msg.planCards.map((card) => (
                        <button
                          key={card.label}
                          type="button"
                          onClick={() => handlePlanCard(card, msg.id)}
                          disabled={isLoading}
                          className={`max-w-[88%] text-right px-3.5 py-2.5 rounded-2xl rounded-tr-xs text-xs font-semibold border transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 ${
                            card.primary
                              ? 'bg-[#EC7000] border-[#EC7000] text-white hover:bg-[#D45D00]'
                              : 'bg-white border-[#FFD8B5] text-[#EC7000] hover:bg-[#FFF4EB]'
                          }`}
                        >
                          {card.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Recipient Selection Cards for Pix Transfer */}
                  {msg.pixSelection && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
                      {msg.pixSelection.contatos.map((contato) => (
                        <button
                          key={contato.id}
                          type="button"
                          onClick={() => handleSelectContato(contato, msg.pixSelection!.amount)}
                          className="w-full px-3.5 py-3 flex items-center gap-3 text-left hover:bg-[#FFF8F2] transition-colors cursor-pointer group"
                        >
                          <BankLogo contato={contato} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 leading-tight truncate group-hover:text-[#EC7000]">
                              {contato.nome}
                            </p>
                            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                              {contato.documento} • {contato.banco}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleNotFound}
                        className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-[#FFF8F2] transition-colors cursor-pointer"
                      >
                        <span className="text-xs text-slate-700">Não encontrei quem eu procurava</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    </div>
                  )}

                  {/* Outras formas de Pix (jornada do Studio): Copia e Cola ou QR Code na Área Pix */}
                  {msg.pixSelection && onStartPixArea && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-slate-500 block">Outras formas de Pix:</span>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { mode: 'copia_cola', icon: FileCode2, title: 'Copia e Cola', sub: 'Cole o código' },
                          { mode: 'qr_code', icon: QrCode, title: 'QR Code', sub: 'Escanear' },
                        ] as const).map((o) => (
                          <button
                            key={o.mode}
                            type="button"
                            onClick={() => onStartPixArea(o.mode)}
                            className="p-3 bg-white border border-slate-200/80 hover:border-[#EC7000] rounded-xl text-left transition-all shadow-2xs flex items-center gap-2.5 cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#EC7000] flex items-center justify-center shrink-0">
                              <o.icon className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 block leading-tight">{o.title}</span>
                              <span className="text-[9px] text-slate-500">{o.sub}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resumo dos tetos por categoria + parametrização no simulador */}
                  {msg.categoryCaps && (
                    <div className="bg-[#FAFBFD] border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-[#002244] flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-[#EC7000]" />
                          Resumo dos Tetos Propostos
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Renda {formatBRL(cliente.renda.mensal)}</span>
                      </div>
                      <div className="space-y-2">
                        {msg.categoryCaps.map((c) => (
                          <div key={c.category} className="flex justify-between items-center text-xs gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: c.color }} />
                              <div className="min-w-0">
                                <span className="font-bold text-slate-800 block">{c.category}</span>
                                <span className="text-[10px] text-slate-400">{c.description}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold font-mono text-slate-900 block">{formatBRL(c.amount)}</span>
                              <span className="text-[10px] font-semibold text-[#EC7000] font-mono">{c.percentage.toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {onNavigate && (
                        <button
                          type="button"
                          onClick={() => onNavigate('wizard')}
                          className="w-full py-2.5 bg-[#EC7000] hover:bg-[#D45D00] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                        >
                          Parametrizar e Ajustar Valores
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Respostas sugeridas (jornada de criação de meta) */}
                  {msg.chips && msg.id === messages[messages.length - 1]?.id && (
                    <div className="flex flex-wrap gap-2">
                      {msg.chips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleSendMessage(chip)}
                          className="px-3 py-1.5 rounded-full bg-white border border-[#FFD8B5] text-[11px] font-semibold text-[#EC7000] hover:bg-[#FFF4EB] transition-colors cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Botão de ação da resposta */}
                  {msg.quickAction && (
                    <button
                      type="button"
                      onClick={() => handleQuickAction(msg.quickAction!, msg.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFF4EB] border border-[#FFD8B5] text-[11px] font-bold text-[#EC7000] hover:bg-[#FFEBD9] transition-colors cursor-pointer"
                    >
                      {msg.quickAction.type === 'create_goal' ? (
                        <Target className="w-3.5 h-3.5" />
                      ) : msg.quickAction.type === 'view_home' ? (
                        <House className="w-3.5 h-3.5" />
                      ) : (
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      )}
                      {msg.quickAction.label}
                    </button>
                  )}

                  {/* Tela 2: card de revisão do Pix dentro da conversa */}
                  {msg.pixReview && (
                    <div className="bg-[#F1F3F5] rounded-2xl p-4 space-y-1">
                      <BankLogo contato={msg.pixReview.contato} size="sm" />
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide pt-2">
                        {msg.pixReview.contato.banco}
                      </p>
                      <p className="text-sm font-bold text-slate-900 leading-snug">
                        Pix de {formatBRL(msg.pixReview.amount)} para {msg.pixReview.contato.nome}
                      </p>
                      <p className="text-[11px] text-slate-500">CPF {msg.pixReview.contato.documento}</p>
                      <p className="text-[11px] text-slate-500">
                        Chave Pix ({msg.pixReview.contato.tipoChave}): {msg.pixReview.contato.chave}
                      </p>
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPixFlow(msg.pixReview!.contato, msg.pixReview!.amount)}
                          className="px-5 h-9 rounded-lg bg-[#EC7000] hover:bg-[#D66500] text-white text-xs font-bold active:scale-95 transition-all cursor-pointer"
                        >
                          Continuar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Comprovante do Pix enviado, com download */}
                  {msg.pixReceipt && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                      <div className="px-4 py-3 bg-[#F0FAF7] border-b border-emerald-100 flex items-center gap-2">
                        <CircleCheck className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-900">Comprovante de Pix</span>
                        <span className="ml-auto text-[10px] text-slate-500">{formatPixDate(msg.pixReceipt.dataIso)}</span>
                      </div>
                      <dl className="px-4 py-3 space-y-2 text-[11px]">
                        {[
                          ['Valor', formatBRL(msg.pixReceipt.amount)],
                          ['Para', msg.pixReceipt.contato.nome],
                          ['CPF', msg.pixReceipt.contato.documento],
                          ['Instituição', msg.pixReceipt.contato.banco],
                          [`Chave (${msg.pixReceipt.contato.tipoChave})`, msg.pixReceipt.contato.chave],
                          ['Pago com', msg.pixReceipt.fonte.titulo],
                          ...(msg.pixReceipt.mensagem ? [['Mensagem', msg.pixReceipt.mensagem]] : []),
                          ['ID da transação', msg.pixReceipt.idTransacao],
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-3">
                            <dt className="text-slate-500 shrink-0">{label}</dt>
                            <dd className="font-semibold text-slate-900 text-right break-all">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="px-4 pb-3">
                        <button
                          type="button"
                          onClick={() => downloadComprovante(msg.pixReceipt!)}
                          className="w-full h-9 rounded-lg border border-[#EC7000] text-[#EC7000] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#FFF4EB] transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Baixar comprovante
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Feedback Action Buttons (Thumbs Up, Down, Copy) matching Video 1 */}
                  {msg.text && !msg.subtle && (
                  <div className="flex items-center gap-3 pt-2 text-slate-400">
                    <button
                      type="button"
                      onClick={() => handleFeedback(msg.id, 'up')}
                      className={`p-1 rounded-md hover:text-slate-700 transition-colors cursor-pointer ${
                        feedbackGiven[msg.id] === 'up' ? 'text-emerald-600' : ''
                      }`}
                      title="Gostei da resposta"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFeedback(msg.id, 'down')}
                      className={`p-1 rounded-md hover:text-slate-700 transition-colors cursor-pointer ${
                        feedbackGiven[msg.id] === 'down' ? 'text-red-500' : ''
                      }`}
                      title="Não gostei da resposta"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.text)}
                      className="p-1 rounded-md hover:text-slate-700 transition-colors cursor-pointer"
                      title="Copiar resposta"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Progressive Conversational Stepped Loading matching user prompt and Video */}
        {isLoading && (
          <div className="flex items-center gap-2.5 animate-fadeIn py-1">
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[#EC7000] fill-[#EC7000] animate-pulse duration-700" />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600 font-normal">
              <span className="transition-all duration-300 ease-in-out">
                {currentLoadingSteps[loadingStep] || currentLoadingSteps[0]}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Area: Input + Disclaimer fixed to bottom of app viewport */}
      <div className="sticky bottom-0 left-0 right-0 z-30 p-3 pb-4 sm:pb-3 bg-[#FAF9F7] shrink-0 space-y-1.5 border-t border-slate-100 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
        {/* Sugestões rápidas de perguntas para o Financial Agent (chips clicáveis) */}
        {!isLoading && voice.status !== 'recording' && (
          <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden py-1 px-0.5">
            {QUICK_SUGGESTIONS.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(sug.prompt)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white hover:bg-[#FFF4EB] border border-slate-200/90 hover:border-[#FFD8B5] text-[11px] font-semibold text-slate-700 hover:text-[#EC7000] shadow-2xs transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1.5"
              >
                <span>{sug.icon}</span>
                <span>{sug.label}</span>
              </button>
            ))}
          </div>
        )}

        {voice.status === 'recording' ? (
          <div
            className="flex items-center gap-2.5 pl-2 pr-1.5 py-1.5 bg-white border border-[#FFD8B5] rounded-2xl shadow-2xs animate-fadeIn"
            role="status"
            aria-label="Gravando áudio"
          >
            <button
              type="button"
              onClick={voice.cancel}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              aria-label="Cancelar gravação"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="relative flex w-2.5 h-2.5 shrink-0" aria-hidden="true">
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />
              <span className="relative w-2.5 h-2.5 rounded-full bg-red-500" />
            </span>
            <span className="text-xs font-semibold text-slate-700 tabular-nums shrink-0">
              {formatDuration(voice.elapsed)}
            </span>
            {/* Animação de gravação (sem mostrar o que está sendo falado) */}
            <div className="flex-1 min-w-0 flex items-center justify-center gap-[3px] h-6 overflow-hidden" aria-hidden="true">
              {WAVE_BARS.map((h, i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-full bg-[#EC7000]/70 animate-pulse"
                  style={{ height: h, animationDelay: `${(i % 7) * 120}ms`, animationDuration: '900ms' }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={voice.stop}
              className="w-8 h-8 rounded-full bg-[#EC7000] text-white flex items-center justify-center cursor-pointer shadow-xs active:scale-95 transition-all shrink-0"
              aria-label="Enviar áudio"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Digite aqui"
            className="w-full pl-4 pr-11 py-2.5 bg-white border border-slate-200/80 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#EC7000] shadow-2xs transition-all"
          />

          {inputValue.trim() ? (
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 w-7 h-7 rounded-full bg-[#EC7000] text-white flex items-center justify-center cursor-pointer shadow-xs active:scale-95 transition-all"
              aria-label="Enviar"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={voice.start}
              disabled={isLoading || voice.status !== 'idle'}
              className="absolute right-2 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-[#EC7000] hover:bg-[#FFF4EB] transition-colors cursor-pointer"
              title="Gravar áudio"
              aria-label="Gravar áudio"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </form>
        )}

        {/* Disclaimer Text matching Video 1 */}
        <p className="text-[10px] text-slate-400 text-center select-none">
          Resposta gerada por IA e pode ter informações imprecisas.
        </p>
      </div>
    </div>
  );
};
