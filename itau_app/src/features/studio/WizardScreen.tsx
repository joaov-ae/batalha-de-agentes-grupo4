import React, { useState } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Sliders, 
  Car, 
  ArrowRight,
  TrendingUp,
  X
} from 'lucide-react';
import { PersonaProfile, FinancialGoal, ScreenType } from './studioTypes';

interface WizardScreenProps {
  persona: PersonaProfile;
  onNavigate: (screen: ScreenType) => void;
  onGoalCreated: (goal: FinancialGoal) => void;
  initialStep?: number;
}

export const WizardScreen: React.FC<WizardScreenProps> = ({
  persona,
  onNavigate,
  onGoalCreated,
  initialStep = 1,
}) => {
  const [step, setStep] = useState<number>(initialStep);
  // Valor padrão e dinâmico conforme o vídeo (00:05 onde o usuário ajusta para R$ 3.100)
  const [leisureLimit, setLeisureLimit] = useState<number>(3100);
  const [transportLimit, setTransportLimit] = useState<number>(600);
  const [completed, setCompleted] = useState(false);

  const totalSalary = persona.monthlyIncome;
  const fixedTotal = persona.fixedCosts;

  const handleFinish = () => {
    const newGoal: FinancialGoal = {
      id: `goal-programacao-${Date.now()}`,
      title: 'Controle Mensal por Categoria',
      category: 'geral',
      targetAmount: leisureLimit + transportLimit + fixedTotal,
      currentAmount: fixedTotal + 1450,
      color: '#EC7000',
      iconName: 'Sparkles',
      deadline: 'Programação ativa',
      itauShopPointsBonus: 600,
    };
    onGoalCreated(newGoal);
    setCompleted(true);
  };

  return (
    <div className="relative flex-1 h-full bg-white flex flex-col justify-between text-slate-800 font-sans select-none overflow-hidden">
      {/* Top Header - Estilo Exato da Referência: Seta de voltar à esquerda, "PASSO X DE 4" centralizado */}
      <header className="px-4 py-3.5 border-b border-[#E8ECEF] flex items-center justify-between flex-shrink-0 bg-white">
        <button 
          onClick={() => {
            if (step > 1 && !completed) {
              setStep(step - 1);
            } else {
              onNavigate('hub');
            }
          }}
          className="p-1 rounded-full text-slate-600 hover:text-slate-900 transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>

        <span className="text-[12px] font-extrabold text-[#002244] tracking-widest uppercase">
          {completed ? 'PROGRAMAÇÃO CONCLUÍDA' : `PASSO ${step} DE 4`}
        </span>

        <button 
          onClick={() => onNavigate('hub')}
          className="p-1 rounded-full text-slate-400 hover:text-slate-700"
          aria-label="Fechar"
        >
          <X className="w-5 h-5 stroke-[2]" />
        </button>
      </header>

      {/* Barra de Progresso Laranja no Topo */}
      {!completed && (
        <div className="w-full bg-slate-100 h-1.5 flex-shrink-0">
          <div 
            className="bg-[#EC7000] h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      )}

      {/* Conteúdo Principal de cada Passo (Scrollable) */}
      <main className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* PASSO 1: RAIO-X DAS CONTAS FIXAS (00:00 da referência) */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Ícone Laranja do Escudo */}
            <div className="w-11 h-11 rounded-2xl bg-[#FFF4EB] border border-[#FFE0CC] text-[#EC7000] flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6 stroke-[2]" />
            </div>

            <div>
              <h1 className="text-lg font-bold text-[#002244] tracking-tight">
                1. Raio-X das Contas Fixas
              </h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Identificamos automaticamente seus compromissos essenciais já agendados para este mês.
              </p>
            </div>

            {/* Lista dos compromissos essenciais */}
            <div className="bg-[#FAFBFD] rounded-2xl p-4 space-y-2.5 border border-[#E8ECEF] shadow-xs">
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Moradia & Condomínio</span>
                <span className="font-bold font-mono text-slate-900">R$ 2.650</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Água e Luz (Sabesp / Enel)</span>
                <span className="font-bold font-mono text-slate-900">R$ 340</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Internet & Telefonia</span>
                <span className="font-bold font-mono text-slate-900">R$ 180</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5">
                <span className="text-slate-600 font-medium">Seguros Personnalité</span>
                <span className="font-bold font-mono text-slate-900">R$ 450</span>
              </div>

              {/* Total Comprometido */}
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
                <span className="text-[#002244]">Total Comprometido</span>
                <span className="text-[#EC7000] font-mono text-base">R$ 3.620</span>
              </div>
            </div>

            {/* Box Verde com confirmação de folga financeira */}
            <div className="p-3.5 bg-[#F0FDF4] rounded-2xl text-emerald-900 text-xs flex items-start gap-2.5 border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                Suas contas fixas usam apenas <strong>36,2%</strong> do salário. Você tem <strong>R$ 6.380 livres!</strong>
              </span>
            </div>
          </div>
        )}

        {/* PASSO 2: LAZER SEM CULPA COM SLIDER DE PARAMETRIZAÇÃO (00:01 - 00:05 da referência) */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Ícone Sparkles */}
            <div className="w-11 h-11 rounded-2xl bg-[#FFF9F3] border border-[#FFE8D6] text-[#EC7000] flex items-center justify-center shadow-xs">
              <Sparkles className="w-6 h-6 stroke-[2]" />
            </div>

            <div>
              <h1 className="text-lg font-bold text-[#002244] tracking-tight">
                2. Lazer "Sem Culpa"
              </h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Defina um valor exclusivo para restaurantes, viagens e diversão no seu Personnalité Black sem prejudicar seu futuro.
              </p>
            </div>

            {/* Card com Slider de Parametrização */}
            <div className="bg-[#FAFBFD] rounded-2xl p-5 border border-[#E8ECEF] text-center space-y-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Limite mensal de lazer sugerido</span>
              
              <div className="flex items-center justify-center gap-1">
                <p className="text-3xl font-extrabold font-mono text-[#EC7000] tracking-tight">
                  R$ {leisureLimit.toLocaleString('pt-BR')}
                </p>
              </div>

              {/* Slider de parametrização interativa */}
              <div className="space-y-2 px-1">
                <input
                  type="range"
                  min="1000"
                  max="4500"
                  step="50"
                  value={leisureLimit}
                  onChange={(e) => setLeisureLimit(Number(e.target.value))}
                  className="w-full accent-[#EC7000] cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
                />

                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>Mínimo: R$ 1.000</span>
                  <span className="text-[#EC7000] font-semibold">Sugerido: 30% (R$ 3.000)</span>
                  <span>Máximo: R$ 4.500</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-white border border-slate-200 rounded-xl p-2.5 font-medium">
                Representa <strong>{((leisureLimit / totalSalary) * 100).toFixed(1)}%</strong> da sua renda líquida mensal.
              </div>
            </div>
          </div>
        )}

        {/* PASSO 3: TETO DE TRANSPORTE & MOBILIDADE (00:06 - 00:09 da referência) */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Ícone Carro */}
            <div className="w-11 h-11 rounded-2xl bg-[#EEF4FC] border border-[#D5E4F8] text-[#0047BA] flex items-center justify-center shadow-xs">
              <Car className="w-6 h-6 stroke-[2]" />
            </div>

            <div>
              <h1 className="text-lg font-bold text-[#002244] tracking-tight">
                3. Teto de Transporte & Mobilidade
              </h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Gastos com Uber, 99 e combustível variam muito. Vamos limitar para evitar vazamento de orçamento.
              </p>
            </div>

            {/* Card com Slider de Transporte */}
            <div className="bg-[#FAFBFD] rounded-2xl p-5 border border-[#E8ECEF] text-center space-y-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Teto programado</span>
              
              <p className="text-3xl font-extrabold font-mono text-[#002244] tracking-tight">
                R$ {transportLimit.toLocaleString('pt-BR')}
              </p>

              <div className="space-y-2 px-1">
                <input
                  type="range"
                  min="300"
                  max="1200"
                  step="50"
                  value={transportLimit}
                  onChange={(e) => setTransportLimit(Number(e.target.value))}
                  className="w-full accent-[#002244] cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
                />

                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>Mínimo: R$ 300</span>
                  <span className="text-[#002244] font-semibold">Teto Médio: R$ 600</span>
                  <span>Máximo: R$ 1.200</span>
                </div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 text-xs font-medium">
                Aviso automático quando atingir <strong>85% deste teto</strong>.
              </div>
            </div>
          </div>
        )}

        {/* PASSO 4: RESUMO DA PROGRAMAÇÃO DO MÊS (00:10 - 00:13 da referência) */}
        {step === 4 && !completed && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Ícone de Sliders Verde */}
            <div className="w-11 h-11 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] text-[#059669] flex items-center justify-center shadow-xs">
              <Sliders className="w-6 h-6 stroke-[2]" />
            </div>

            <div>
              <h1 className="text-lg font-bold text-[#002244] tracking-tight">
                4. Resumo da Programação do Mês
              </h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tudo pronto! Seu orçamento inteligente está alinhado com o padrão Personnalité:
              </p>
            </div>

            {/* Cards do Resumo Exatamente como no Vídeo */}
            <div className="space-y-2.5">
              {/* Essenciais Fixos */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#E8ECEF] flex items-center justify-between shadow-xs">
                <div>
                  <h3 className="text-xs font-bold text-[#002244]">Essenciais Fixos</h3>
                  <span className="text-[10px] text-slate-500">Moradia, contas, seguros</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-slate-900 block">
                    R$ {fixedTotal.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">36,2%</span>
                </div>
              </div>

              {/* Lazer Sem Culpa (com valor parametrizado no slider) */}
              <div className="p-3.5 bg-[#FFFDF9] rounded-2xl border border-[#FFE8D6] flex items-center justify-between shadow-xs">
                <div>
                  <h3 className="text-xs font-bold text-[#EC7000]">Lazer Sem Culpa</h3>
                  <span className="text-[10px] text-slate-500">Restaurantes, cultura</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-[#EC7000] block">
                    R$ {leisureLimit.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] text-orange-400 font-mono">
                    {((leisureLimit / totalSalary) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Transporte & Apps */}
              <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex items-center justify-between shadow-xs">
                <div>
                  <h3 className="text-xs font-bold text-[#0047BA]">Transporte & Apps</h3>
                  <span className="text-[10px] text-slate-500">Teto com alerta</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-[#0047BA] block">
                    R$ {transportLimit.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] text-blue-400 font-mono">
                    {((transportLimit / totalSalary) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Investimento no Futuro */}
              <div className="p-3.5 bg-[#F0FDF4] rounded-2xl border border-[#DCFCE7] flex items-center justify-between shadow-xs">
                <div>
                  <h3 className="text-xs font-bold text-[#059669]">Investimento no Futuro</h3>
                  <span className="text-[10px] text-slate-500">CDB 100% CDI Liquidez diária</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-[#059669] block">
                    R$ 2.000,00
                  </span>
                  <span className="text-[10px] text-emerald-600 font-mono">20,0%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Estado Concluído */}
        {completed && (
          <div className="py-10 text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-[#002244]">Metas Ativadas com Sucesso!</h2>
            <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
              O controle de gastos por categoria foi parametrizado e está ativo no seu perfil. A <strong>ia.i</strong> te avisará a cada compra para você não ultrapassar os tetos.
            </p>
          </div>
        )}
      </main>

      {/* Botão de Rodapé Idêntico à Referência do Vídeo ("Continuar ->" ou "Confirmar e Ativar Metas ->") */}
      <footer className="p-4 border-t border-[#E8ECEF] bg-white flex-shrink-0">
        {completed ? (
          <button
            onClick={() => onNavigate('hub')}
            className="w-full py-3.5 bg-[#EC7000] hover:bg-itau-orange-dark text-white rounded-xl font-bold text-xs transition-colors shadow-md active:scale-98"
          >
            Voltar à Página Inicial
          </button>
        ) : (
          <button
            onClick={() => {
              if (step < 4) {
                setStep(step + 1);
              } else {
                handleFinish();
              }
            }}
            className="w-full py-3.5 bg-[#EC7000] hover:bg-itau-orange-dark text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-98"
          >
            {step === 4 ? (
              <>
                Confirmar e Ativar Metas
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Continuar
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </footer>
    </div>
  );
};
