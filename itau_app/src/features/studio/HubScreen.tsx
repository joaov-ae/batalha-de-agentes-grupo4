import React, { useState } from 'react';
import { IaiFloatingButton } from '../../design-system/molecules/IaiFloatingButton';
import { 
  Eye, 
  EyeOff, 
  Search, 
  Bell, 
  MessageSquare, 
  ChevronRight, 
  Zap, 
  Barcode, 
  Sparkles, 
  CreditCard, 
  PiggyBank, 
  Wallet,
  Car,
  HeartHandshake,
  Home,
  ShoppingBag,
  Award
} from 'lucide-react';
import { PersonaProfile, FinancialGoal, ScreenType } from './studioTypes';

interface HubScreenProps {
  persona: PersonaProfile;
  goals: FinancialGoal[];
  itauShopPoints: number;
  onNavigate: (screen: ScreenType) => void;
  onOpenQuickPrompt: (prompt: string) => void;
  onOpenNewGoalFlow: () => void;
  onSelectGoal: (goal: FinancialGoal) => void;
  /** Botão flutuante no dia do salário: abre a jornada "plano do mês" */
  onOpenSalaryPlan: () => void;
  /** Saldo em conta e limite: os mesmos valores usados no fluxo de Pix */
  saldo: number;
  limiteConta: number;
}

const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const HubScreen: React.FC<HubScreenProps> = ({
  persona,
  goals,
  itauShopPoints,
  onNavigate,
  onOpenNewGoalFlow,
  onSelectGoal,
  onOpenSalaryPlan,
  saldo,
  limiteConta,
}) => {
  // Saldo exibido por padrão conforme solicitado
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [pointsToast, setPointsToast] = useState(false);

  const showPoints = () => {
    setPointsToast(true);
    setTimeout(() => setPointsToast(false), 2600);
  };

  const getGoalIcon = (iconName: string) => {
    switch (iconName) {
      case 'Home':
        return <Home className="w-4 h-4" />;
      case 'Car':
        return <Car className="w-4 h-4" />;
      case 'HeartHandshake':
        return <HeartHandshake className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative flex-1 h-full flex flex-col overflow-hidden bg-[#F4F6F8] text-slate-800 font-sans select-none">
      {/* Top Header - Itaú Personnalité Style (Fixo no topo da tela mobile) */}
      <header className="bg-white px-4 pt-3 pb-3 border-b border-[#E8ECEF] flex-shrink-0 z-10">
        <div className="flex items-center justify-between">
          {/* Avatar Maria Andrade + Badge Nível 4 */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[#002244] text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm border border-slate-200">
                {persona.initials}
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-[#F4F6F8] px-2.5 py-1 rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-[#0047BA]"></span>
              <span className="text-[11px] font-bold text-[#002244]">Nível {persona.level}</span>
            </div>
          </div>

          {/* Action Icons + Saldo de Pontos Itaú Shop */}
          <div className="flex items-center gap-3 text-[#002244]">
            <button 
              onClick={showPoints}
              className="flex items-center gap-1 bg-orange-50 border border-orange-200/80 px-2 py-0.5 rounded-full text-itau-orange hover:bg-orange-100 transition-colors"
              title="Pontos Itaú Shop"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono font-bold">{itauShopPoints} pts</span>
            </button>

            <button aria-label="Buscar" className="p-1 hover:text-itau-orange transition-colors">
              <Search className="w-5 h-5 stroke-[2]" />
            </button>
            <button aria-label="Notificações" className="p-1 hover:text-itau-orange transition-colors relative">
              <Bell className="w-5 h-5 stroke-[2]" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-itau-orange rounded-full"></span>
            </button>
            <button aria-label="Atendimento" className="p-1 hover:text-itau-orange transition-colors">
              <MessageSquare className="w-5 h-5 stroke-[2]" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Rolável dentro do viewport do celular */}
      <div className="flex-1 overflow-y-auto pb-24 p-4 space-y-3.5">
        {/* Banner de Aviso: Fatura em débito automático fechou */}
        <section className="bg-[#002244] text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <p className="text-xs font-medium text-slate-100 pr-4 leading-relaxed">
            A fatura em débito automático do seu cartão fechou
          </p>
          <div className="mt-3">
            <button 
              onClick={() => onNavigate('cartoes')}
              className="px-4 py-1.5 bg-white text-[#002244] text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
            >
              Conferir detalhes
            </button>
          </div>
        </section>

        {/* Seção "Meu Itaú" com botão de ocultar saldo (olho) ao lado */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <h2 className="text-sm font-bold text-[#002244] tracking-tight">Meu Itaú</h2>
            <button 
              onClick={() => setShowBalance(!showBalance)}
              className="p-1 text-slate-500 hover:text-[#002244] transition-colors"
              aria-label={showBalance ? "Ocultar saldos" : "Mostrar saldos"}
            >
              {showBalance ? (
                <EyeOff className="w-4 h-4 text-slate-600 stroke-[2.2]" />
              ) : (
                <Eye className="w-4 h-4 text-slate-600 stroke-[2.2]" />
              )}
            </button>
          </div>

          {/* Atalhos circulares estilo aplicativo Itaú */}
          <div className="flex items-start justify-between px-1 text-center">
            {/* Pix e transferir */}
            <button 
              onClick={() => onNavigate('pix')}
              className="flex flex-col items-center gap-1.5 group focus:outline-none"
            >
              <div className="w-[52px] h-[52px] rounded-2xl bg-white border border-[#E8ECEF] flex items-center justify-center text-[#002244] group-hover:border-itau-orange transition-all shadow-sm">
                <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              </div>
              <span className="text-[11px] font-medium text-slate-700 leading-tight w-14">
                Pix e transferir
              </span>
            </button>

            {/* Pagar */}
            <button 
              onClick={() => onNavigate('extrato')}
              className="flex flex-col items-center gap-1.5 group focus:outline-none"
            >
              <div className="w-[52px] h-[52px] rounded-2xl bg-white border border-[#E8ECEF] flex items-center justify-center text-[#002244] group-hover:border-itau-orange transition-all shadow-sm">
                <Barcode className="w-5 h-5 text-[#002244]" />
              </div>
              <span className="text-[11px] font-medium text-slate-700 leading-tight w-14">
                Pagar
              </span>
            </button>

            {/* Ofertas exclusivas (com tag PLR) */}
            <button 
              onClick={() => onNavigate('wizard')}
              className="flex flex-col items-center gap-1.5 group focus:outline-none"
            >
              <div className="w-[52px] h-[52px] rounded-2xl bg-white border border-[#E8ECEF] flex items-center justify-center text-[#002244] group-hover:border-itau-orange transition-all shadow-sm relative">
                <span className="text-[9px] font-mono font-extrabold text-[#0047BA] border border-[#0047BA] px-1 py-0.2 rounded">
                  PLR
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-700 leading-tight w-14">
                Ofertas exclusivas
              </span>
            </button>

            {/* Cartão virtual */}
            <button 
              onClick={() => onNavigate('cartoes')}
              className="flex flex-col items-center gap-1.5 group focus:outline-none"
            >
              <div className="w-[52px] h-[52px] rounded-2xl bg-white border border-[#E8ECEF] flex items-center justify-center text-[#002244] group-hover:border-itau-orange transition-all shadow-sm">
                <CreditCard className="w-5 h-5 text-[#002244]" />
              </div>
              <span className="text-[11px] font-medium text-slate-700 leading-tight w-14">
                Cartão virtual
              </span>
            </button>

            {/* Cofrinhos */}
            <button 
              onClick={() => onNavigate('hub')}
              className="flex flex-col items-center gap-1.5 group focus:outline-none"
            >
              <div className="w-[52px] h-[52px] rounded-2xl bg-white border border-[#E8ECEF] flex items-center justify-center text-[#002244] group-hover:border-itau-orange transition-all shadow-sm">
                <PiggyBank className="w-5 h-5 text-[#002244]" />
              </div>
              <span className="text-[11px] font-medium text-slate-700 leading-tight w-14">
                Cofrinhos
              </span>
            </button>
          </div>
        </section>

        {/* Card: Conta Corrente com Saldo exibido */}
        <section 
          onClick={() => onNavigate('extrato')}
          className="bg-white rounded-2xl p-4 border border-[#E8ECEF] shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-bold text-[#002244]">Conta corrente</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>

          <div className="mt-3">
            <span className="text-[11px] text-slate-500 font-medium">Saldo</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xl font-bold font-mono tracking-tight text-slate-900">
                {showBalance ? formatBRL(saldo) : '••••'}
              </span>
              <span className="text-slate-300 font-mono text-sm tracking-widest">•••</span>
            </div>
            <span className="text-[11px] font-semibold text-[#1E8E3E] mt-1 block">+ Salário recebido hoje</span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Limite disponível</span>
            <span className="text-xs font-bold font-mono text-slate-700">
              {showBalance ? formatBRL(limiteConta) : '••••'}
            </span>
          </div>
        </section>

        {/* Card de Notificação Proativo direciona para a Landing da ia.i */}
        <section 
          onClick={() => onNavigate('iai_landing')}
          className="bg-gradient-to-r from-[#FFFDF9] via-[#FFF6EE] to-[#FFEDE0] rounded-2xl p-4 border border-[#FFDFC4] shadow-sm cursor-pointer hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-slate-800 leading-relaxed pr-1">
              <strong>R$ 10.000,00 a mais na conta!</strong> Vamos programar os gastos deste mês, na medida para você?
            </p>
            <div className="flex-shrink-0">
              <Sparkles className="w-4 h-4 text-itau-orange animate-pulse" />
            </div>
          </div>
        </section>

        {/* Card: Personnalité Black final 9241 */}
        <section 
          onClick={() => onNavigate('cartoes')}
          className="bg-white rounded-2xl p-4 border border-[#E8ECEF] shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-700" />
              <div>
                <span className="text-xs font-bold text-[#002244] block">
                  Personnalité Black final 9241
                </span>
                <span className="text-[10px] text-slate-500">
                  Fatura fechada • Débito automático
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </section>

        {/* SEÇÃO "MISSÕES E METAS ATIVAS" */}
        <section className="bg-white rounded-2xl p-4 border border-[#E8ECEF] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#002244] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-itau-orange"></span>
                Missões e Metas Ativas
              </span>
            </div>
            <button
              onClick={onOpenNewGoalFlow}
              className="text-xs font-bold text-itau-orange hover:text-itau-orange-dark flex items-center gap-0.5 active:scale-95 transition-transform"
            >
              + Nova Missão
            </button>
          </div>

          <div className="space-y-2.5">
            {goals.map((g) => {
              const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
              return (
                <div 
                  key={g.id}
                  onClick={() => onSelectGoal(g)}
                  className="p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-itau-orange transition-all cursor-pointer shadow-xs group"
                >
                  {/* Linha superior: Ícone, Título da Meta, Prazo e Valor Total da Meta */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs flex-shrink-0"
                        style={{ backgroundColor: g.color || '#EC7000' }}
                      >
                        {getGoalIcon(g.iconName)}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 group-hover:text-itau-orange transition-colors">
                          {g.title}
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          Prazo: {g.deadline}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-slate-900">
                        R$ {g.targetAmount.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {/* Linha de Progresso */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.max(5, pct)}%`, backgroundColor: g.color || '#EC7000' }}
                    />
                  </div>

                  {/* Texto do alcançado versus meta abaixo da linha de progresso */}
                  <div className="flex justify-between items-center text-[10px] font-mono mt-1.5 text-slate-500">
                    <span>
                      <strong className="text-slate-800">R$ {g.currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> alcançado
                    </span>
                    <span className="text-slate-400">
                      de R$ {g.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({pct}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {pointsToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-[#002244] text-white text-[11px] font-semibold px-4 py-2 rounded-full shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in">
          Você tem {itauShopPoints.toLocaleString('pt-BR')} pontos no Itaú Shop 🎉
        </div>
      )}

      {/* BOTÃO FLUTUANTE IA.I (recolhe em 3 s com transição suave) → jornada do plano do mês no dia do salário */}
      <IaiFloatingButton label="Seu salário caiu. Bora ver o mês?" pulse onClick={onOpenSalaryPlan} />
    </div>
  );
};
