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
} from 'lucide-react';
import { useVoiceInput, VoicePixIntent } from './useVoiceInput';
import { FinancialGoal } from './goalsStore';
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
import confetti from 'canvas-confetti';

export interface IaiChatScreenProps {
  onBack: () => void;
  onGoalCreated?: (goal: FinancialGoal) => void;
  activeGoals?: FinancialGoal[];
  className?: string;
  skipIntro?: boolean;
}

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
}

// Saldos iniciais dos cartões (limites fictícios); o saldo em conta vem da base via /api/pix/saldo
const CARD_LIMITS = { infinite: 24572.2, black: 13220.98 };
const FALLBACK_SALDOS: PixSaldos = { conta: 1744.32, limiteConta: 16455, ...CARD_LIMITS };

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
  className = '',
  skipIntro = false,
}) => {
  // Opening preparation stages: 'preparing' -> 'ready' -> 'chat'
  const [openingPhase, setOpeningPhase] = useState<'preparing' | 'ready' | 'chat'>(
    skipIntro ? 'chat' : 'preparing'
  );

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
  const [saldos, setSaldos] = useState<PixSaldos | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadSaldos = async (): Promise<PixSaldos> => {
    if (saldos) return saldos;
    try {
      const res = await fetch('/api/pix/saldo');
      const data = await res.json();
      const loaded = { conta: Number(data.saldo), limiteConta: Number(data.limiteConta), ...CARD_LIMITS };
      setSaldos(loaded);
      return loaded;
    } catch {
      setSaldos(FALLBACK_SALDOS);
      return FALLBACK_SALDOS;
    }
  };

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
          text: 'Desculpe, Maria, não consegui entender o seu áudio. Pode gravar de novo, um pouco mais perto do microfone, ou digitar o que precisa?',
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

  // Initial Opening Animation Transition matching Video 2 (00:08 - 00:11)
  useEffect(() => {
    if (skipIntro) return;

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
    opts?: { audioMsgId?: string; pixIntent?: VoicePixIntent | null },
  ) => {
    const text = (textToSend || inputValue).trim();
    // Mensagem de voz já está em "loading" (ouvindo o áudio), por isso não é bloqueada aqui
    if (!text || (isLoading && !opts?.audioMsgId)) return;

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

      // Allow user to see conversational loading steps sequentially
      await new Promise((resolve) => setTimeout(resolve, 3800));

      // Prompt 1: Faça o Raio-X das minhas contas fixas.
      if (lowerText.includes('raio-x') || lowerText.includes('raio x') || lowerText.includes('contas fixas')) {
        const iaiMsg: ChatMessage = {
          id: `iai-${Date.now()}`,
          sender: 'iai',
          text: `Com certeza, Maria! Preparei o Raio-X completo das suas contas fixas deste mês:

• **Moradia e condomínio:** R$ 2.650,00 (26,5%)
• **Energia elétrica e água:** R$ 340,00 (3,4%)
• **Internet e telefonia:** R$ 180,00 (1,8%)
• **Seguros (Cartão Protegido e Habitacional):** R$ 450,00 (4,5%)
• **TOTAL DE CONTAS FIXAS:** R$ 3.620,00 (36,2% da sua renda líquida)

💡 **Diagnóstico Ia.i:** Excelente! Suas despesas fixas estão bem abaixo do limite recomendado de 50%. Todas estão cadastradas no débito automático do Itaú, garantindo pontualidade e pontos no Minhas Vantagens!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, iaiMsg]);
        return;
      }

      // Prompt 2: Quanto posso gastar com lazer sem culpa?
      if (lowerText.includes('lazer') || lowerText.includes('sem culpa')) {
        const iaiMsg: ChatMessage = {
          id: `iai-${Date.now()}`,
          sender: 'iai',
          text: `Maria, com o seu salário na conta e as contas fixas já cobertas, calculamos sua margem de tranquilidade:

• **Teto recomendado para lazer e estilo de vida:** **R$ 2.000,00 no mês** (cerca de 20% do seu salário).
• **Sugestão de distribuição semanal:** R$ 500,00 por semana para restaurantes, bares, passeios e compras pessoais.

🔒 **Dica inteligente:** Ativei um aviso no seu Personnalité Black para te notificar quando você atingir 80% dessa meta. Assim você aproveita o mês com liberdade e zero culpa!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, iaiMsg]);
        return;
      }

      // Prompt 3: Programe a divisão do salário entre gastos essenciais e não essenciais.
      if (lowerText.includes('divisão') || lowerText.includes('divisao') || lowerText.includes('essenciais') || lowerText.includes('não essenciais')) {
        const iaiMsg: ChatMessage = {
          id: `iai-${Date.now()}`,
          sender: 'iai',
          text: `Perfeito, Maria! Estruturei a programação do seu salário seguindo a regra 50-30-20 personalizada para a sua realidade:

• **50% Gastos Essenciais (R$ 5.000,00):** Moradia, alimentação no supermercado, contas de consumo, saúde e transporte básico.
• **30% Estilo de Vida e Lazer (R$ 3.000,00):** Restaurantes, delivery, compras pessoais, passeios e cuidados.
• **20% Futuro e Reserva (R$ 2.000,00):** Aporte automático em CDB 100% CDI com liquidez diária e proteção FGC.

Deseja que eu programe o investimento automático de R$ 2.000,00 no dia que o seu salário cair?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, iaiMsg]);
        return;
      }

      // Prompt 4: Definir meu teto de gastos de transporte do mês.
      if (lowerText.includes('transporte') || lowerText.includes('teto')) {
        const iaiMsg: ChatMessage = {
          id: `iai-${Date.now()}`,
          sender: 'iai',
          text: `Ótimo planejamento, Maria! Analisei seu histórico de mobilidade dos últimos 90 dias:

• **Média histórica:** R$ 720,00/mês (combustível nos postos Ipiranga, Sem Parar e corridas por app).
• **Teto sugerido para este mês:** **R$ 750,00**.

Criei um controle inteligente de categoria ativo no app. Você receberá avisos em tempo real a cada abastecimento ou corrida no seu cartão Itaú!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, iaiMsg]);
        return;
      }

      if (isProfileQuery) {
        const iaiMsg: ChatMessage = {
          id: `iai-${Date.now()}`,
          sender: 'iai',
          text: `Seu perfil mostra que você tem uma rotina financeira bem estruturada e diversificada, Maria. Vou te contar um pouco sobre os principais pontos:

• **Preferências de investimento:** Você demonstra interesse em investir em CDB e já declarou esse objetivo. Isso mostra que você busca segurança e rentabilidade estável para o seu dinheiro.

• **Produtos e serviços:** Você tem dois cartões ativos, incluindo um Personnalité Black Mastercard, que oferece benefícios diferenciados. Além disso, você conta com um financiamento imobiliário vigente, o que indica planejamento de longo prazo.

• **Seguros:** Seu perfil inclui seguros importantes, como o Cartão Protegido e o Habitacional, que ajudam a proteger seu patrimônio e suas transações.

• **Benefícios disponíveis:** Você faz parte do programa Minhas Vantagens Nível 4 e tem vários benefícios ativos, como anuidade grátis, cashback, experiências em viagens, frete e descontos em parceiros.

Se quiser saber mais sobre algum desses pontos ou programar seu mês, é só me contar o que precisa.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, iaiMsg]);
        return;
      }

      // Fallback or API request
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: text,
          messages: messages.map((m) => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.text })),
        }),
      });

      const data = await response.json();

      const iaiMsg: ChatMessage = {
        id: `iai-${Date.now()}`,
        sender: 'iai',
        text: data.text || 'Entendi, Maria. Posso te ajudar com detalhes sobre seus cartões Personnalité, CDB ou planejamento de gastos.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, iaiMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `iai-${Date.now()}`,
          sender: 'iai',
          text: 'Com base no seu perfil Personnalité Nível 4, organizei o raio-x e limites para você programar seu mês com total segurança.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
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
    setSaldos((prev) => {
      const base = prev || FALLBACK_SALDOS;
      const key = comprovante.fonte.id;
      return { ...base, [key]: base[key] - comprovante.amount };
    });

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
        text: `Pronto, Maria! Seu Pix de **${formatBRL(comprovante.amount)}** para **${comprovante.contato.primeiroNome}** foi enviado. Aqui está o comprovante:`,
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
          saldos={saldos || FALLBACK_SALDOS}
          onClose={() => setPixFlow(null)}
          onDone={handlePixDone}
        />
      )}

      {/* Header matching Video 2: Back (<), Pill "Hoje", Close (X) */}
      <header className="sticky top-0 z-20 bg-[#FAF9F7]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-100 shrink-0">
        <button
          onClick={onBack}
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
          onClick={onBack}
          type="button"
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          aria-label="Fechar conversa"
        >
          <X className="w-5 h-5 text-slate-600 stroke-[2]" />
        </button>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5">
        {/* Initial Assistant Welcoming Message & Suggestion Cards (Video 2 00:12) */}
        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-[#EC7000] fill-[#EC7000]" />
          </div>

          <div className="space-y-3 flex-1 max-w-[320px]">
            <p className="text-xs font-semibold text-slate-800 leading-snug">
              ia.i, Maria! Vamos programar os gastos deste mês?
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

        {/* Dynamic Chat Messages */}
        {messages.map((msg) => (
          <div key={msg.id} className="animate-fadeIn">
            {msg.sender === 'user' ? (
              /* User Message - Right Aligned with "MA" Avatar */
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

                {/* Dark User Avatar "MA" (Maria) */}
                <div className="w-8 h-8 rounded-full bg-[#1A1F2C] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs" title="Maria">
                  MA
                </div>
              </div>
            ) : (
              /* Assistant Message - Left Aligned with Sparkle Icon matching Video 1 */
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-[#EC7000] fill-[#EC7000]" />
                </div>

                <div className="flex-1 max-w-[340px] space-y-3">
                  <div className="text-xs text-slate-800 leading-relaxed space-y-2 whitespace-pre-line">
                    {msg.text.split('\n\n').filter(Boolean).map((paragraph, idx) => {
                      const formatted = paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                      return (
                        <p
                          key={idx}
                          dangerouslySetInnerHTML={{ __html: formatted }}
                          className="text-slate-800 leading-relaxed"
                        />
                      );
                    })}
                  </div>

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
