import React, { useEffect, useState } from 'react';
import { useCliente } from '../cliente/ClienteContext';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  CalendarDays,
  Repeat,
  MessageSquare,
  Lock,
  Delete,
  CreditCard,
  Check,
  ArrowLeftRight,
  Share2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

// ================= Tipos compartilhados com o chat =================

export interface PixContato {
  id: string;
  idUsuario: string;
  nome: string;
  primeiroNome: string;
  documento: string;
  banco: string;
  codigoBanco: string;
  sigla: string;
  cor: string;
  corTexto: string;
  tipoChave: string;
  chave: string;
  origem: string;
}

export type PixFonteId = 'conta' | 'infinite' | 'black';

export interface PixFonte {
  id: PixFonteId;
  titulo: string;
  resumo: string;
}

export interface PixComprovante {
  amount: number;
  contato: PixContato;
  fonte: PixFonte;
  mensagem?: string;
  dataIso: string;
  idTransacao: string;
  /** Nome de quem envia (cliente do app) */
  pagador?: string;
}

export interface PixSaldos {
  conta: number;
  limiteConta: number;
  infinite: number;
  black: number;
}

// ================= Helpers =================

export const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatPixDate = (iso: string) => {
  const d = new Date(iso);
  const date = d
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/\./g, '')
    .replace(/ de /g, ' ');
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} às ${time}`;
};

const capitalizeName = (name: string) =>
  name
    .toLowerCase()
    .split(' ')
    .map((w) => (['de', 'da', 'do', 'dos', 'das'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');

export const BankLogo: React.FC<{ contato: PixContato; size?: 'sm' | 'md' }> = ({ contato, size = 'md' }) => (
  <div
    className={`${size === 'sm' ? 'w-7 h-7 text-[9px]' : 'w-9 h-9 text-[10px]'} rounded-full flex items-center justify-center font-extrabold shrink-0 border border-black/5`}
    style={{ backgroundColor: contato.cor, color: contato.corTexto }}
    aria-hidden="true"
  >
    {contato.sigla}
  </div>
);

// Gera o comprovante como PNG (desenhado em canvas) e dispara o download
export const downloadComprovante = (c: PixComprovante) => {
  const W = 720;
  const H = 1040;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const font = (weight: number, size: number) => `${weight} ${size}px "Plus Jakarta Sans", Arial, sans-serif`;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Cabeçalho laranja
  ctx.fillStyle = '#EC7000';
  ctx.fillRect(0, 0, W, 150);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(800, 44);
  ctx.fillText('Itaú', 48, 92);
  ctx.font = font(600, 22);
  ctx.textAlign = 'right';
  ctx.fillText('Comprovante de transferência', W - 48, 84);
  ctx.textAlign = 'left';

  // Selo de sucesso
  ctx.fillStyle = '#E8F7F0';
  ctx.beginPath();
  ctx.arc(80, 222, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0F9D58';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(66, 223);
  ctx.lineTo(77, 234);
  ctx.lineTo(96, 211);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = font(800, 30);
  ctx.fillText('Pix enviado', 130, 216);
  ctx.fillStyle = '#64748B';
  ctx.font = font(500, 20);
  ctx.fillText(formatPixDate(c.dataIso), 130, 246);

  ctx.fillStyle = '#0F172A';
  ctx.font = font(800, 52);
  ctx.fillText(formatBRL(c.amount), 48, 340);

  const rows: [string, string][] = [
    ['Para', capitalizeName(c.contato.nome)],
    ['CPF', c.contato.documento],
    ['Instituição', `${c.contato.banco} (${c.contato.codigoBanco})`],
    [`Chave Pix (${c.contato.tipoChave})`, c.contato.chave],
    ['De', `${c.pagador || 'Cliente'} • Itaú Personnalité`],
    ['Pago com', c.fonte.titulo],
    ['Tipo de transferência', 'Pix'],
  ];
  if (c.mensagem) rows.push(['Mensagem', c.mensagem.slice(0, 40)]);
  rows.push(['ID da transação', c.idTransacao]);

  let y = 410;
  rows.forEach(([label, value]) => {
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(48, y - 34);
    ctx.lineTo(W - 48, y - 34);
    ctx.stroke();
    ctx.fillStyle = '#64748B';
    ctx.font = font(500, 18);
    ctx.fillText(label, 48, y);
    ctx.fillStyle = '#0F172A';
    ctx.font = font(700, label === 'ID da transação' ? 16 : 21);
    ctx.fillText(value, 48, y + 30);
    y += 74;
  });

  ctx.fillStyle = '#94A3B8';
  ctx.font = font(500, 15);
  ctx.fillText('Protótipo de hackathon — comprovante ilustrativo, sem valor legal.', 48, H - 40);

  const link = document.createElement('a');
  link.download = `comprovante-pix-${c.idTransacao.slice(-10)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

// ================= Fluxo em tela cheia =================

type Step = 'fonte' | 'revisao' | 'alerta' | 'senha' | 'processando' | 'sucesso';

/** Resultado de /api/pix/simular (simulação determinística do data_manager) */
interface PixGuardResult {
  fica_negativo: boolean;
  saldo_minimo_depois?: number;
  juros_adicionais?: number;
  data_sugerida?: string;
  data_sugerida_resolve?: boolean;
  contas_comprometidas?: { descricao: string; valor: number; formatado?: { data?: string; valor?: string } }[];
  formatado?: { dia_que_acaba_depois?: string | null; juros_adicionais?: string; data_sugerida?: string };
}

export interface PixFlowProps {
  amount: number;
  contato: PixContato;
  saldos: PixSaldos;
  /** Opt-in "Pode me avisar": avisa antes de um Pix que aperta o mês, sem bloquear */
  pixGuard?: boolean;
  onClose: () => void;
  onDone: (comprovante: PixComprovante, action: 'voltar' | 'nova') => void;
}

const logEvento = (name: string, detail = '') =>
  fetch('/api/eventos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, detail }),
    keepalive: true,
  }).catch(() => {});

export const PixFlow: React.FC<PixFlowProps> = ({ amount: initialAmount, contato, saldos, pixGuard = false, onClose, onDone }) => {
  const cliente = useCliente();
  const [step, setStep] = useState<Step>('fonte');
  const [guard, setGuard] = useState<PixGuardResult | null>(null);
  const [checkingGuard, setCheckingGuard] = useState(false);

  // Antes da senha: se o alerta estiver ativo, simula o Pix na projeção do mês
  const handleConfirmarRevisao = async () => {
    if (!pixGuard || fonte?.id !== 'conta') {
      setStep('senha');
      return;
    }
    setCheckingGuard(true);
    try {
      const r: PixGuardResult = await fetch('/api/pix/simular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: amount }),
      }).then((res) => res.json());
      if (r.fica_negativo) {
        setGuard(r);
        setStep('alerta');
        logEvento('pix_guard_warned', `valor=${amount}`);
      } else {
        setStep('senha');
      }
    } catch {
      setStep('senha');
    } finally {
      setCheckingGuard(false);
    }
  };
  const [amount, setAmount] = useState(initialAmount);
  const [fonte, setFonte] = useState<PixFonte | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [editingMensagem, setEditingMensagem] = useState(false);
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [comprovante, setComprovante] = useState<PixComprovante | null>(null);
  const [showPush, setShowPush] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [editingValor, setEditingValor] = useState(false);
  const [valorDraft, setValorDraft] = useState('');

  const saldoApos = saldos.conta - amount;
  const saldoInsuficiente = saldoApos < 0;
  const fonteDisponivel = fonte ? (fonte.id === 'conta' ? saldos.conta : saldos[fonte.id]) : 0;
  const fonteCobreValor = !fonte || fonteDisponivel >= amount;

  const fontes: (PixFonte & { linhas: React.ReactNode; disponivel: number })[] = [
    {
      id: 'conta',
      titulo: 'Conta Itaú',
      resumo: 'Saldo em conta',
      disponivel: saldos.conta,
      linhas: (
        <>
          <p className={`text-[11px] leading-snug ${saldos.conta < 0 ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
            Saldo {formatBRL(saldos.conta)}
          </p>
          <p className="text-[11px] text-slate-500 leading-snug">Limite da Conta {formatBRL(saldos.limiteConta)}</p>
          {saldoInsuficiente && (
            <p className="text-[11px] text-red-600 font-bold leading-snug mt-0.5">
              Saldo após o Pix: {formatBRL(saldoApos)}
            </p>
          )}
        </>
      ),
    },
    {
      id: 'infinite',
      titulo: 'Personnalité Infinite • 3198',
      resumo: 'Cartão Personnalité Infinite • 3198',
      disponivel: saldos.infinite,
      linhas: (
        <>
          <p className="text-[11px] text-slate-500 leading-snug">Limite disponível {formatBRL(saldos.infinite)}</p>
          <p className="text-[11px] text-[#EC7000] font-semibold leading-snug">Em até 12x</p>
        </>
      ),
    },
    {
      id: 'black',
      titulo: 'Personnalité Black • 6474',
      resumo: 'Cartão Personnalité Black • 6474',
      disponivel: saldos.black,
      linhas: (
        <>
          <p className="text-[11px] text-slate-500 leading-snug">Limite disponível {formatBRL(saldos.black)}</p>
          <p className="text-[11px] text-[#EC7000] font-semibold leading-snug">Em até 12x</p>
        </>
      ),
    },
  ];

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // Senha simulada: qualquer sequência de 6 dígitos autoriza. Fica só no estado local, nunca é enviada.
  const handleConfirmarSenha = () => {
    if (senha.length < 6 || !fonte) return;
    setStep('processando');
    setTimeout(() => {
      const now = new Date();
      const stamp = now.toISOString().replace(/\D/g, '').slice(0, 12);
      const rand = Math.random().toString(36).slice(2, 13).toUpperCase().padEnd(11, '0');
      setComprovante({
        amount,
        contato,
        fonte,
        mensagem: mensagem.trim() || undefined,
        dataIso: now.toISOString(),
        idTransacao: `E60701190${stamp}${rand}`,
        pagador: cliente.nome,
      });
      setSenha('');
      setStep('sucesso');
      setShowPush(true);
    }, 1400);
  };

  useEffect(() => {
    if (!showPush) return;
    const t = setTimeout(() => setShowPush(false), 4500);
    return () => clearTimeout(t);
  }, [showPush]);

  const Header: React.FC<{ onBack: () => void; right?: React.ReactNode }> = ({ onBack, right }) => (
    <header className="px-4 pt-3 pb-1 flex items-center justify-between shrink-0">
      <button
        type="button"
        onClick={onBack}
        className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        aria-label="Voltar"
      >
        <ChevronLeft className="w-6 h-6 stroke-[2]" />
      </button>
      {right}
    </header>
  );

  // ================= Tela 3: forma de pagamento =================
  const renderFonte = () => (
    <>
      <Header
        onBack={onClose}
        right={<Eye className="w-5 h-5 text-slate-700" aria-hidden="true" />}
      />
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6 flex flex-col">
        <h1 className="text-xl font-bold text-slate-900 leading-tight mt-2">
          Escolha como quer transferir o valor de {formatBRL(amount)}
        </h1>

        {saldoInsuficiente && (
          <div className="mt-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 flex gap-2.5" role="alert">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-snug text-red-800">
              <p className="font-bold">Saldo insuficiente para este Pix</p>
              <p className="mt-0.5">
                Seu saldo é de {formatBRL(saldos.conta)}. Com esta transferência a conta ficaria em{' '}
                <strong className="text-red-600">{formatBRL(saldoApos)}</strong>. Não é possível continuar.
              </p>
            </div>
          </div>
        )}

        <div className="mt-auto pt-6 divide-y divide-slate-200">
          {fontes.map((f) => {
            const bloqueada = saldoInsuficiente || f.disponivel < amount;
            return (
              <button
                key={f.id}
                type="button"
                disabled={bloqueada}
                onClick={() => {
                  setFonte({ id: f.id, titulo: f.titulo, resumo: f.resumo });
                  setStep('revisao');
                }}
                className={`w-full py-4 flex items-center gap-3 text-left transition-colors ${
                  bloqueada ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'
                }`}
              >
                {f.id === 'conta' ? (
                  <div className="w-8 h-8 rounded-lg bg-[#002D72] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0">
                    Itaú
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-slate-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-snug">{f.titulo}</p>
                  {f.linhas}
                </div>
                {!bloqueada && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {saldoInsuficiente && (
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full h-12 rounded-xl border border-[#EC7000] text-[#EC7000] text-sm font-bold hover:bg-[#FFF4EB] transition-colors cursor-pointer"
          >
            Voltar para a conversa
          </button>
        )}
      </div>
    </>
  );

  // ================= Tela 4: revisão =================
  const Row: React.FC<{ label: string; value: string; onEdit?: () => void }> = ({ label, value, onEdit }) => (
    <div className="py-3.5 flex items-center justify-between gap-3 border-b border-slate-200">
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 leading-snug">{label}</p>
        <p className="text-xs font-bold text-slate-900 leading-snug mt-0.5 break-words">{value}</p>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-0.5 text-xs font-bold text-slate-800 hover:text-[#EC7000] shrink-0 cursor-pointer"
        >
          Editar <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  const renderRevisao = () => (
    <>
      <Header onBack={() => setStep('fonte')} />
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
        <h1 className="text-xl font-bold text-slate-900 leading-tight mt-2">
          Transferir {formatBRL(amount)} para {contato.primeiroNome}
        </h1>
        <p className="text-[11px] text-slate-500 mt-1">{capitalizeName(contato.nome)}</p>

        <div className="grid grid-cols-3 gap-2 mt-5">
          {[
            { icon: CalendarDays, label: 'Data', value: 'Hoje', onClick: () => notify('Agendamento disponível em breve') },
            { icon: Repeat, label: 'Repetir', value: 'Não', onClick: () => notify('Pix recorrente disponível em breve') },
            {
              icon: MessageSquare,
              label: 'Mensagem',
              value: mensagem ? 'Adicionada' : '',
              onClick: () => setEditingMensagem((v) => !v),
            },
          ].map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={t.onClick}
              className="bg-slate-100 hover:bg-slate-200/70 rounded-xl p-2.5 text-left transition-colors cursor-pointer min-h-[68px]"
            >
              <t.icon className="w-4 h-4 text-[#EC7000]" />
              <p className="text-[11px] text-slate-700 mt-1.5 leading-tight">{t.label}</p>
              {t.value && <p className="text-[11px] font-bold text-slate-900 leading-tight">{t.value}</p>}
            </button>
          ))}
        </div>

        {editingMensagem && (
          <input
            type="text"
            value={mensagem}
            maxLength={140}
            autoFocus
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Escreva uma mensagem para quem vai receber"
            className="mt-3 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#EC7000]"
          />
        )}

        <div className="mt-3">
          {editingValor ? (
            <div className="py-3.5 border-b border-slate-200">
              <label className="text-[11px] text-slate-500 leading-snug" htmlFor="pix-valor">
                Valor
              </label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-slate-900">R$</span>
                <input
                  id="pix-valor"
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  value={valorDraft}
                  onChange={(e) => setValorDraft(e.target.value.replace(/[^\d,]/g, ''))}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#EC7000]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = parseFloat(valorDraft.replace(',', '.'));
                    if (v > 0) setAmount(Math.round(v * 100) / 100);
                    setEditingValor(false);
                  }}
                  className="text-xs font-bold text-[#EC7000] cursor-pointer"
                >
                  OK
                </button>
              </div>
            </div>
          ) : (
            <Row
              label="Valor"
              value={formatBRL(amount)}
              onEdit={() => {
                setValorDraft(amount.toFixed(2).replace('.', ','));
                setEditingValor(true);
              }}
            />
          )}
          {!fonteCobreValor && (
            <p className="text-[11px] text-red-600 font-semibold mt-2" role="alert">
              {fonte?.id === 'conta'
                ? `Saldo insuficiente: a conta ficaria em ${formatBRL(saldoApos)}.`
                : 'Limite insuficiente neste cartão para esse valor.'}
            </p>
          )}
          <Row label="Tipo de transferência" value="Pix" />
          <Row label="Forma de pagamento" value={fonte?.resumo || ''} onEdit={() => setStep('fonte')} />
          <Row label="Instituição" value={`${contato.banco} (${contato.codigoBanco})`} />
          <Row label={`Chave Pix • ${contato.tipoChave}`} value={contato.chave} />
          <Row label="CPF" value={contato.documento} />
        </div>
      </div>
      <div className="px-5 pt-2 pb-5 shrink-0 bg-white">
        <button
          type="button"
          disabled={!fonteCobreValor || editingValor || checkingGuard}
          onClick={handleConfirmarRevisao}
          className="w-full h-12 rounded-xl bg-[#EC7000] hover:bg-[#D66500] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-between px-5 active:scale-[0.99] transition-all cursor-pointer"
        >
          <span>Confirmar transferência</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </>
  );

  // ================= Alerta da ia.i: Pix que aperta o mês (não bloqueia) =================
  const renderAlerta = () =>
    guard && (
      <>
        <Header onBack={() => setStep('revisao')} />
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
          <div className="w-11 h-11 rounded-2xl bg-[#FFF4EB] flex items-center justify-center mt-1">
            <AlertTriangle className="w-5 h-5 text-[#EC7000]" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight mt-3">Esse Pix vai apertar o seu mês</h1>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Com {formatBRL(amount)} saindo agora, sua conta fica negativa a partir de{' '}
            <b>{guard.formatado?.dia_que_acaba_depois || 'antes do salário'}</b>
            {guard.juros_adicionais ? (
              <>
                {' '}e os juros do limite aumentam cerca de <b>{guard.formatado?.juros_adicionais || formatBRL(guard.juros_adicionais)}</b>
              </>
            ) : null}
            .
          </p>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EEF1FA] text-[#1A2B6D] text-[10px] font-bold mt-3">
            Calculado a partir do seu extrato
          </div>
          {!!guard.contas_comprometidas?.length && (
            <div className="mt-3 bg-slate-50 rounded-2xl border border-slate-100 p-3">
              <p className="text-[11px] font-bold text-slate-700 mb-1.5">Contas que ficam sem saldo</p>
              {guard.contas_comprometidas.map((c, i) => (
                <div key={i} className="flex justify-between text-[11px] py-1 border-t border-slate-100 first:border-t-0">
                  <span className="text-slate-600">
                    {c.descricao} <span className="text-slate-400">· {c.formatado?.data}</span>
                  </span>
                  <b className="text-slate-800">{c.formatado?.valor || formatBRL(c.valor)}</b>
                </div>
              ))}
            </div>
          )}
          {guard.formatado?.data_sugerida && (
            <p className="text-[11px] text-slate-500 mt-3 leading-snug">
              💡 Se der para esperar, o dia {guard.formatado.data_sugerida} (dia do salário) pesa menos no mês.
            </p>
          )}
          <p className="text-[11px] text-slate-400 mt-3">Você decide: o Pix não é bloqueado.</p>
        </div>
        <div className="px-5 pt-2 pb-5 shrink-0 bg-white space-y-2">
          <button
            type="button"
            onClick={() => {
              logEvento('pix_guard_continued', `valor=${amount}`);
              setStep('senha');
            }}
            className="w-full h-12 rounded-xl bg-[#EC7000] hover:bg-[#D66500] text-white text-sm font-bold active:scale-[0.99] transition-all cursor-pointer"
          >
            Continuar mesmo assim
          </button>
          <button
            type="button"
            onClick={() => setStep('revisao')}
            className="w-full h-11 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 cursor-pointer"
          >
            Voltar e ajustar
          </button>
        </div>
      </>
    );

  // ================= Tela 5: senha de transação (simulada) =================
  const keypad: [string, string][] = [
    ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
    ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
    ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
  ];

  const pressDigit = (d: string) => setSenha((s) => (s.length < 6 ? s + d : s));

  const renderSenha = () => (
    <>
      <Header onBack={() => { setSenha(''); setStep('revisao'); }} />
      <div className="flex-1 min-h-0 overflow-y-auto px-6 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#FFF4EB] flex items-center justify-center mt-1">
          <Lock className="w-6 h-6 text-[#EC7000]" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 mt-3">Digite a senha de transação</h1>
        <p className="text-[11px] text-slate-500 mt-1 leading-snug max-w-[260px]">
          É usada para autorizar operações no app e realizar compras com seu cartão de débito
        </p>

        <div className="flex items-center gap-3 mt-5" aria-label={`${senha.length} de 6 dígitos`}>
          {Array.from({ length: 6 }).map((_, i) =>
            showSenha && i < senha.length ? (
              <span key={i} className="w-3.5 text-center text-sm font-bold text-slate-900 leading-none">
                {senha[i]}
              </span>
            ) : (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full border ${
                  i < senha.length ? 'border-slate-800 bg-slate-800' : 'border-slate-400 bg-transparent'
                }`}
              />
            ),
          )}
          <button
            type="button"
            onClick={() => setShowSenha((v) => !v)}
            className="ml-1 text-slate-600 hover:text-slate-900 cursor-pointer"
            aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <button
          type="button"
          onClick={() => notify('Para demonstração, qualquer senha de 6 dígitos funciona')}
          className="mt-6 text-xs font-bold text-[#002D72] underline cursor-pointer"
        >
          Esqueci minha senha
        </button>

        <button
          type="button"
          disabled={senha.length < 6}
          onClick={handleConfirmarSenha}
          className={`mt-auto mb-3 w-full h-11 rounded-xl text-sm font-bold transition-all ${
            senha.length < 6
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-[#EC7000] hover:bg-[#D66500] text-white cursor-pointer active:scale-[0.99]'
          }`}
        >
          Continuar
        </button>
      </div>

      <div className="bg-[#D1D5DB] px-1.5 pt-1.5 pb-4 grid grid-cols-3 gap-1.5 shrink-0 select-none">
        {keypad.map(([d, letters]) => (
          <button
            key={d}
            type="button"
            onClick={() => pressDigit(d)}
            className="h-11 rounded-md bg-white shadow-[0_1px_0_rgba(0,0,0,0.3)] flex flex-col items-center justify-center active:bg-slate-200 cursor-pointer"
          >
            <span className="text-lg leading-none text-slate-900">{d}</span>
            <span className="text-[8px] tracking-widest text-slate-700 leading-none mt-0.5 h-2">{letters}</span>
          </button>
        ))}
        <div />
        <button
          type="button"
          onClick={() => pressDigit('0')}
          className="h-11 rounded-md bg-white shadow-[0_1px_0_rgba(0,0,0,0.3)] flex items-center justify-center active:bg-slate-200 cursor-pointer"
        >
          <span className="text-lg leading-none text-slate-900">0</span>
        </button>
        <button
          type="button"
          onClick={() => setSenha((s) => s.slice(0, -1))}
          className="h-11 rounded-md flex items-center justify-center active:bg-slate-300 cursor-pointer"
          aria-label="Apagar dígito"
        >
          <Delete className="w-5 h-5 text-slate-800" />
        </button>
      </div>
    </>
  );

  // ================= Processando =================
  const renderProcessando = () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
      <Loader2 className="w-9 h-9 text-[#EC7000] animate-spin" />
      <p className="text-sm font-bold text-slate-900">Enviando seu Pix...</p>
      <p className="text-[11px] text-slate-500">Feito com a segurança Itaú</p>
    </div>
  );

  // ================= Tela 6: sucesso =================
  const renderSucesso = () =>
    comprovante && (
      <>
        {showPush && (
          <div className="absolute top-2 left-2 right-2 z-50 bg-white/95 backdrop-blur rounded-2xl shadow-lg border border-slate-200 p-3 flex gap-2.5 animate-fadeIn">
            <div className="w-8 h-8 rounded-lg bg-[#EC7000] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0">
              Itaú
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between">
                <p className="text-[11px] font-bold text-slate-900">Feito. Pix enviado</p>
                <span className="text-[10px] text-slate-400">agora</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Você enviou {formatBRL(comprovante.amount)} para {contato.nome.split(' ')[0]}, CPF {contato.documento}
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-16 pb-4 bg-[#F4F6F8]">
          <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center">
            <Check className="w-5 h-5 text-white stroke-[3]" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-3">Transferência realizada!</h1>

          <div className="mt-4 bg-white rounded-2xl p-4 space-y-3 shadow-2xs">
            <div className="border-b border-slate-100 pb-3">
              <p className="text-[11px] text-slate-500">Valor</p>
              <p className="text-xs font-bold text-slate-900">{formatBRL(comprovante.amount)} via Pix</p>
            </div>
            <div className="border-b border-slate-100 pb-3">
              <p className="text-[11px] text-slate-500">Para</p>
              <p className="text-xs font-bold text-slate-900">{capitalizeName(contato.nome)}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Data</p>
              <p className="text-xs font-bold text-slate-900">{formatPixDate(comprovante.dataIso)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-3">
            <button
              type="button"
              onClick={() => onDone(comprovante, 'nova')}
              className="bg-white rounded-2xl p-4 text-left shadow-2xs hover:bg-[#FFF8F2] transition-colors cursor-pointer"
            >
              <ArrowLeftRight className="w-5 h-5 text-[#EC7000]" />
              <p className="text-xs font-bold text-slate-900 mt-3 leading-snug">Fazer nova transferência</p>
            </button>
            <button
              type="button"
              onClick={() => downloadComprovante(comprovante)}
              className="bg-white rounded-2xl p-4 text-left shadow-2xs hover:bg-[#FFF8F2] transition-colors cursor-pointer"
            >
              <Share2 className="w-5 h-5 text-[#EC7000]" />
              <p className="text-xs font-bold text-slate-900 mt-3 leading-snug">Compartilhar comprovante</p>
            </button>
          </div>
        </div>

        <div className="px-5 pt-2 pb-5 shrink-0 bg-[#F4F6F8]">
          <button
            type="button"
            onClick={() => onDone(comprovante, 'voltar')}
            className="w-full h-12 rounded-xl bg-[#EC7000] hover:bg-[#D66500] text-white text-sm font-bold active:scale-[0.99] transition-all cursor-pointer"
          >
            Voltar para a conversa
          </button>
        </div>
      </>
    );

  return (
    <div className="absolute inset-0 z-40 bg-white flex flex-col animate-fadeIn" role="dialog" aria-label="Transferência Pix">
      {toast && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-[#002244] text-white text-[11px] font-semibold px-4 py-2 rounded-full shadow-lg pointer-events-none whitespace-nowrap">
          {toast}
        </div>
      )}
      {step === 'fonte' && renderFonte()}
      {step === 'revisao' && renderRevisao()}
      {step === 'alerta' && renderAlerta()}
      {step === 'senha' && renderSenha()}
      {step === 'processando' && renderProcessando()}
      {step === 'sucesso' && renderSucesso()}
    </div>
  );
};
