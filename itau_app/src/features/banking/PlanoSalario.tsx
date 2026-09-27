/**
 * Jornada "plano do mês no dia do salário" (protótipo prototipo-iai).
 * Todos os valores em R$ vêm de /api/plano-salario, calculados por regra no data_manager;
 * o texto só apresenta os números. Cada valor calculado leva o selo <CalcBadge />.
 */
import React, { useState } from 'react';
import { Calculator, Fingerprint, Check, ThumbsUp, ThumbsDown } from 'lucide-react';

export interface PontoSaldo {
  data: string;
  saldo: number;
}

export interface PlanoSalarioData {
  origem: string;
  dataReferencia: string;
  cliente: {
    saldoHoje: number;
    rendaMensal: number;
    proximoSalario: { data: string; formatado: string; valor: number };
    estado: string;
  };
  saidas: { icone: string; nome: string; quando: string; valor: number; tipo: string }[];
  totalSaidas: number;
  projecao: {
    saldoFinal: number;
    diaQueAcaba: string | null;
    diaNegativo: number | null;
    diaQueAcabaFormatado: string | null;
    jurosEstimados: number;
    pontos: PontoSaldo[];
    pontosRecalculados: PontoSaldo[];
  };
  corte: {
    ajusteId: string;
    servicos: string[];
    mantido: string | null;
    economiaMensal: number;
    ganhoAteSalario: number;
    saldoFinalComCorte: number;
    resolve: boolean;
  } | null;
  pix: {
    ajusteId: string;
    destinatario: string;
    descricao: string;
    valor: number;
    dataAtual: string;
    diaAtual: number;
    dataIsoNova: string;
    novaData: string;
    novoDia: number;
    saldoFinalMes: number;
    saldoProximoMes: number;
    limiteSemanal: number;
    resolve: boolean;
  } | null;
  limiteConta: { juros: number };
  ajusteGasto: { ajusteId: string; categoria: string; tetoSugerido: number; gastoMesAtual: number; mediaMensal: number } | null;
  /** Projeção positiva, mas abaixo de 10% da renda (estado zero_a_zero) */
  semMargem: boolean;
  semana: {
    diasAteSalario: number;
    semanas: number;
    gastoDeCostumeSemana: number;
    sobraAteSalario: number;
    limiteSemanalHoje: number;
    limiteSemanalComAjuste: number;
  };
  proximoMes: { entradas: number; saidasFixas: number; gastoDiaADia: number };
}

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const signed = (v: number) => `${v >= 0 ? '+' : '−'}${brl(Math.abs(v))}`;

/** Registra um evento da jornada (Cloud Logging no servidor). Nunca interrompe a interface. */
export const logEvento = (name: string, detail = '') => {
  fetch('/api/eventos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, detail }),
    keepalive: true,
  }).catch(() => {});
};

/** Selo de número calculado: separa o que vem de regra do que é texto gerado por IA */
export const CalcBadge: React.FC<{ texto?: string }> = ({ texto = 'Calculado a partir do seu extrato' }) => (
  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EEF1FA] text-[#1A2B6D] text-[10px] font-bold mb-2">
    <Calculator className="w-3 h-3" />
    {texto}
  </div>
);

const Box: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5">{children}</div>
);

/** Componente visual generativo: linha do saldo até o próximo salário (série diária projetada) */
export const ProjectionChart: React.FC<{ pontos: PontoSaldo[]; tipo: 'neg' | 'pos' }> = ({ pontos, tipo }) => {
  if (pontos.length < 2) return null;
  const W = 300;
  const H = 110;
  const saldos = pontos.map((p) => p.saldo);
  const max = Math.max(...saldos, 0);
  const min = Math.min(...saldos, 0);
  const span = max - min || 1;
  const x = (i: number) => 6 + (i * (W - 12)) / (pontos.length - 1);
  const y = (v: number) => 10 + ((max - v) * (H - 30)) / span;
  const yZero = y(0);
  const cor = tipo === 'neg' ? '#EC7000' : '#1E8E3E';
  const linha = pontos.map((p, i) => `${x(i).toFixed(1)},${y(p.saldo).toFixed(1)}`).join(' ');
  const idxNeg = pontos.findIndex((p) => p.saldo < 0);
  const ultimo = pontos.length - 1;
  const dia = (iso: string) => Number(iso.slice(8, 10));

  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={
          tipo === 'neg' && idxNeg >= 0
            ? `Projeção do saldo cruzando o zero perto do dia ${dia(pontos[idxNeg].data)}`
            : 'Projeção do saldo no positivo até o salário'
        }
      >
        <line x1="0" y1={yZero} x2={W} y2={yZero} stroke="#bbb" strokeDasharray="4 4" />
        <text x={W - 4} y={yZero - 4} fontSize="9" fill="#888" textAnchor="end">
          R$ 0
        </text>
        <polyline fill="none" stroke={cor} strokeWidth="2.5" strokeLinejoin="round" points={linha} />
        {tipo === 'neg' && idxNeg >= 0 && (
          <>
            <circle cx={x(idxNeg)} cy={y(pontos[idxNeg].saldo)} r="4" fill="#C62828" />
            <text x={Math.min(x(idxNeg), W - 60)} y={H - 4} fontSize="9" fill="#C62828" textAnchor="middle">
              fica negativa ~dia {dia(pontos[idxNeg].data)}
            </text>
          </>
        )}
        {tipo === 'neg' && idxNeg < 0 && (() => {
          // Sem cruzar o zero: marca o ponto de folga mínima
          const idxMin = saldos.indexOf(Math.min(...saldos));
          return (
            <>
              <circle cx={x(idxMin)} cy={y(saldos[idxMin])} r="4" fill="#EC7000" />
              <text x={Math.min(Math.max(x(idxMin), 50), W - 50)} y={H - 4} fontSize="9" fill="#B45309" textAnchor="middle">
                folga de só {brl(saldos[idxMin])} ~dia {dia(pontos[idxMin].data)}
              </text>
            </>
          );
        })()}
        {tipo === 'pos' && (
          <>
            <circle cx={x(ultimo)} cy={y(pontos[ultimo].saldo)} r="4" fill="#1E8E3E" />
            <text x={x(ultimo) - 4} y={y(pontos[ultimo].saldo) - 8} fontSize="9" fill="#1E8E3E" textAnchor="end">
              {signed(pontos[ultimo].saldo)}
            </text>
          </>
        )}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>Hoje</span>
        <span>Próximo salário</span>
      </div>
    </>
  );
};

export const SaidasBox: React.FC<{ plano: PlanoSalarioData }> = ({ plano }) => (
  <Box>
    <CalcBadge />
    <div className="divide-y divide-slate-100">
      {plano.saidas.map((s, i) => (
        <div key={i} className="flex items-center justify-between py-2 text-xs gap-3">
          <div className="min-w-0">
            <span className="text-slate-800">
              {s.icone} {s.nome}
            </span>
            <small className="block text-[10px] text-slate-400">{s.quando}</small>
          </div>
          <b className="text-slate-900 tabular-nums shrink-0">{brl(s.valor)}</b>
        </div>
      ))}
    </div>
    <div className="flex justify-between pt-2 mt-1 border-t border-slate-200 text-xs">
      <span className="font-bold text-slate-700">Total até o salário</span>
      <b className="tabular-nums text-slate-900">{brl(plano.totalSaidas)}</b>
    </div>
  </Box>
);

/** "Quanto posso gastar por semana?": como o valor semanal é calculado */
export const SemanaBox: React.FC<{ plano: PlanoSalarioData }> = ({ plano }) => {
  const s = plano.semana;
  const linhas: [string, string][] = [
    ['Saldo hoje', brl(plano.cliente.saldoHoje)],
    [`Contas até ${plano.cliente.proximoSalario.formatado}`, `− ${brl(plano.totalSaidas)}`],
    ['Gasto de costume por semana', brl(s.gastoDeCostumeSemana)],
    ['Sobra prevista até o salário', signed(s.sobraAteSalario)],
  ];
  return (
    <Box>
      <CalcBadge />
      <div className="text-center py-1">
        <span className="text-[11px] text-slate-500">Pra gastar por semana</span>
        <p className="text-2xl font-extrabold text-[#EC7000] tabular-nums">{brl(s.limiteSemanalHoje)}</p>
        <span className="text-[10px] text-slate-400">
          {s.diasAteSalario} dias até o salário (~{s.semanas.toLocaleString('pt-BR')} semanas)
        </span>
      </div>
      <div className="mt-2 divide-y divide-slate-100">
        {linhas.map(([label, valor]) => (
          <div key={label} className="flex justify-between py-1.5 text-xs">
            <span className="text-slate-600">{label}</span>
            <b className="tabular-nums text-slate-900">{valor}</b>
          </div>
        ))}
      </div>
    </Box>
  );
};

export const ChartBox: React.FC<{ plano: PlanoSalarioData; tipo: 'neg' | 'pos' }> = ({ plano, tipo }) => (
  <Box>
    <CalcBadge texto={tipo === 'neg' ? 'Projeção do seu saldo' : 'Projeção recalculada'} />
    <ProjectionChart pontos={tipo === 'neg' ? plano.projecao.pontos : plano.projecao.pontosRecalculados} tipo={tipo} />
  </Box>
);

const diasNegativo = (plano: PlanoSalarioData) => {
  if (!plano.projecao.diaQueAcaba) return 0;
  const ms = new Date(plano.cliente.proximoSalario.data).getTime() - new Date(plano.projecao.diaQueAcaba).getTime();
  return Math.max(1, Math.round(ms / 86400000));
};

export const AlternativasBox: React.FC<{ plano: PlanoSalarioData }> = ({ plano }) => {
  const p = plano.pix!;
  const dias = diasNegativo(plano);
  return (
    <Box>
      <CalcBadge />
      <div className="space-y-2.5">
        <div className="p-3 rounded-xl bg-[#FAFBFD] border border-slate-100 text-xs text-slate-700 leading-relaxed">
          🔁 <b className="text-slate-900">Reagendar um Pix</b>
          <br />
          O Pix agendado de {brl(p.valor)} ({p.descricao.toLowerCase()}), no dia {p.dataAtual}, pode ir para o dia {p.novaData}, o dia do
          seu salário.
          <div className="mt-1.5 font-semibold">
            → Você fecha o mês com <span className={p.saldoFinalMes >= 0 ? 'text-[#1E8E3E]' : 'text-[#C62828]'}>{signed(p.saldoFinalMes)}</span>
          </div>
        </div>
        {plano.projecao.saldoFinal < 0 || !plano.ajusteGasto ? (
          <div className="p-3 rounded-xl bg-[#FAFBFD] border border-slate-100 text-xs text-slate-700 leading-relaxed">
            🏦 <b className="text-slate-900">Deixar o limite da conta cobrir</b>
            <br />
            {plano.projecao.saldoFinal < 0 ? (
              <>
                A conta fica negativa por {dias} {dias === 1 ? 'dia' : 'dias'}, com juros do limite de cerca de {brl(plano.limiteConta.juros)}.
              </>
            ) : (
              <>Se aparecer um gasto fora do planejado, o limite cobre, mas você paga juros sobre cada dia no negativo.</>
            )}
            <div className="mt-1.5 font-semibold">
              → Você fecha o mês com{' '}
              <span className={plano.projecao.saldoFinal >= 0 ? 'text-[#1E8E3E]' : 'text-[#C62828]'}>{signed(plano.projecao.saldoFinal)}</span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[#FAFBFD] border border-slate-100 text-xs text-slate-700 leading-relaxed">
            🧾 <b className="text-slate-900">Colocar um teto em {plano.ajusteGasto.categoria}</b>
            <br />
            Você já gastou {brl(plano.ajusteGasto.gastoMesAtual)} em {plano.ajusteGasto.categoria} este mês; a sua média é{' '}
            {brl(plano.ajusteGasto.mediaMensal)}. Um teto de {brl(plano.ajusteGasto.tetoSugerido)} com aviso evita que isso vire o gasto fora do
            planejado.
            <div className="mt-1.5 font-semibold">
              → Protege a sua folga de <span className="text-[#1E8E3E]">{brl(plano.projecao.saldoFinal)}</span>
            </div>
          </div>
        )}
      </div>
    </Box>
  );
};

export const PropostaBox: React.FC<{ plano: PlanoSalarioData }> = ({ plano }) => {
  const p = plano.pix!;
  const cls = (v: number) =>
    v >= 0 ? 'bg-emerald-50 text-[#1E8E3E] border-emerald-100' : 'bg-red-50 text-[#C62828] border-red-100';
  return (
    <Box>
      <div className="flex justify-between py-1.5 text-xs border-b border-slate-100">
        <span className="text-slate-600">
          Pix: <b className="text-slate-900">{p.descricao}</b>
        </span>
        <b className="tabular-nums">{brl(p.valor)}</b>
      </div>
      <div className="flex justify-between py-1.5 text-xs">
        <span className="text-slate-600">Data</span>
        <span>
          <span className="line-through text-slate-400">{p.dataAtual}</span> → <b>{p.novaData}</b>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className={`rounded-xl border p-2.5 text-[11px] ${cls(p.saldoFinalMes)}`}>
          Este mês
          <strong className="block text-sm tabular-nums">{signed(p.saldoFinalMes)}</strong>
        </div>
        <div className={`rounded-xl border p-2.5 text-[11px] ${cls(p.saldoProximoMes)}`}>
          Próximo mês
          <strong className="block text-sm tabular-nums">{signed(p.saldoProximoMes)}</strong>
        </div>
      </div>
      <small className="block mt-2 text-[11px] text-slate-500 leading-snug">
        {p.saldoProximoMes >= 0
          ? 'O Pix já entra no plano do próximo mês e ainda sobra dinheiro.'
          : `Atenção: o próximo mês também fecha no negativo, porque suas saídas fixas (${brl(plano.proximoMes.saidasFixas)}) são maiores que as entradas recorrentes (${brl(plano.proximoMes.entradas)}). No próximo salário eu te mostro o plano.`}
      </small>
      <div className="mt-2">
        <CalcBadge />
      </div>
    </Box>
  );
};

/** Confirmação biométrica (no produto: componente nativo do app). Repete valor, destinatário e data. */
export const BiometriaOverlay: React.FC<{ plano: PlanoSalarioData; onConfirm: () => void; onCancel: () => void }> = ({
  plano,
  onConfirm,
  onCancel,
}) => {
  const [ok, setOk] = useState(false);
  const p = plano.pix!;
  const tocar = () => {
    if (ok) return;
    setOk(true);
    setTimeout(onConfirm, 800);
  };
  return (
    <div className="absolute inset-0 z-50 bg-black/50 flex items-end animate-in fade-in" role="dialog" aria-label="Confirme o reagendamento">
      <div className="w-full bg-white rounded-t-3xl p-5 pb-7 text-center">
        <h4 className="text-sm font-bold text-slate-900">Confirme o reagendamento</h4>
        <p className="text-[11px] text-slate-500 mt-0.5">Confira os dados antes de autorizar</p>
        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs space-y-1.5 text-left">
          <div className="flex justify-between">
            <span className="text-slate-500">Pix</span>
            <b>{p.descricao}</b>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Valor</span>
            <b>{brl(p.valor)}</b>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Nova data</span>
            <b>{p.novaData}</b>
          </div>
        </div>
        <button
          type="button"
          onClick={tocar}
          className={`mx-auto mt-4 w-16 h-16 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
            ok ? 'border-[#1E8E3E] bg-emerald-50 text-[#1E8E3E]' : 'border-[#EC7000] bg-[#FFF4EB] text-[#EC7000]'
          }`}
          aria-label="Tocar no sensor para confirmar"
        >
          {ok ? <Check className="w-7 h-7 stroke-[3]" /> : <Fingerprint className="w-8 h-8" />}
        </button>
        <small className="block mt-2 text-[11px] text-slate-500">{ok ? 'Confirmado' : 'Toque no sensor para confirmar'}</small>
        {!ok && (
          <button type="button" onClick={onCancel} className="mt-3 text-[11px] font-semibold text-slate-500 underline cursor-pointer">
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
};

const MOTIVOS = ['Informação correta', 'Fácil de entender', 'Resolveu meu problema', 'Outro motivo'];

/** Avaliação da conversa: motivos aparecem depois do voto; enviar só habilita com motivo */
export const AvaliacaoCard: React.FC<{ onSend: (voto: 'up' | 'down', motivo: string) => void }> = ({ onSend }) => {
  const [voto, setVoto] = useState<'up' | 'down' | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  if (enviado) {
    return <Box><h4 className="text-xs font-bold text-slate-900">Obrigada pela avaliação! 🧡</h4></Box>;
  }
  return (
    <Box>
      <h4 className="text-xs font-bold text-slate-900">Avalie essa conversa</h4>
      <div className="flex gap-2 mt-2">
        {(['up', 'down'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVoto(v)}
            className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-colors ${
              voto === v ? 'border-[#EC7000] bg-[#FFF4EB] text-[#EC7000]' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
            aria-label={v === 'up' ? 'Gostei' : 'Não gostei'}
          >
            {v === 'up' ? <ThumbsUp className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />}
          </button>
        ))}
      </div>
      {voto && (
        <div className="flex flex-wrap gap-1.5 mt-2.5 animate-in fade-in">
          {MOTIVOS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMotivo(m)}
              className={`px-2.5 py-1 rounded-full border text-[11px] cursor-pointer ${
                motivo === m ? 'border-[#EC7000] bg-[#FFF4EB] text-[#EC7000] font-semibold' : 'border-slate-200 text-slate-600'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      )}
      {voto && motivo && (
        <button
          type="button"
          onClick={() => {
            setEnviado(true);
            onSend(voto, motivo);
          }}
          className="mt-3 w-full h-9 rounded-xl bg-[#EC7000] hover:bg-[#D45D00] text-white text-xs font-bold cursor-pointer"
        >
          Enviar avaliação
        </button>
      )}
    </Box>
  );
};
