import React, { useState } from 'react';
import {
  Barcode,
  CreditCard,
  ChevronRight,
  Bell,
  Search,
  MessageSquare,
  MoreHorizontal,
  Wallet,
  Coins,
  Tag,
  ShieldCheck,
  TrendingUp,
  Target,
  Sparkles,
  Plus,
  Car,
  Home as HomeIcon,
  Baby,
  Compass,
} from 'lucide-react';
import { PixIcon } from '../../design-system/atoms/PixIcon';
import { IaiFloatingButton } from '../../design-system/molecules/IaiFloatingButton';
import { FinancialGoal } from './goalsStore';

export interface ControleGastosHubProps {
  onStartControle: () => void;
  onNavigateToCartoes: () => void;
  onNavigateToExtrato?: () => void;
  onNavigateToIai?: () => void;
  hasActiveControl?: boolean;
  activeGoals?: FinancialGoal[];
  className?: string;
}

export const ControleGastosHub: React.FC<ControleGastosHubProps> = ({
  onStartControle,
  onNavigateToCartoes,
  onNavigateToExtrato = () => {},
  onNavigateToIai = () => {},
  hasActiveControl = false,
  activeGoals = [],
  className = '',
}) => {
  const [showBalance, setShowBalance] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'carro':
        return <Car className="w-5 h-5 text-[#EC7000]" />;
      case 'casa':
        return <HomeIcon className="w-5 h-5 text-[#0047BA]" />;
      case 'filho':
        return <Baby className="w-5 h-5 text-pink-600" />;
      default:
        return <Compass className="w-5 h-5 text-emerald-600" />;
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[#F5F6F8] relative overflow-hidden font-sans text-slate-800 ${className}`}>
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-[#002244] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-slate-700 animate-fadeIn pointer-events-none">
          {feedbackToast}
        </div>
      )}

      {/* Top Header - Matching Video 2 */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 py-2.5 flex items-center justify-between border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Avatar Maria (MA) */}
          <div className="w-9 h-9 rounded-full bg-[#002244] text-white font-bold text-xs flex items-center justify-center shadow-xs" title="Maria">
            MA
          </div>

          {/* Level Pill Badge */}
          <div className="flex items-center gap-1 bg-[#F0F3F7] px-2.5 py-1 rounded-full text-slate-800 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#EC7000]" />
            <span>Nível 4</span>
          </div>
        </div>

        {/* Right Action Icons: Search, Bell, Message */}
        <div className="flex items-center gap-2 text-slate-700">
          <button
            onClick={() => notify('Buscar no aplicativo')}
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer"
            title="Buscar"
          >
            <Search className="w-4 h-4 stroke-[2]" />
          </button>
          <button
            onClick={() => notify('Sem novas notificações')}
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer"
            title="Notificações"
          >
            <Bell className="w-4 h-4 stroke-[2]" />
          </button>
          <button
            onClick={onNavigateToIai}
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer text-[#EC7000]"
            title="Conversar com a Ia.i"
          >
            <MessageSquare className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24 space-y-3.5">
        {/* Navy Promo Banner - Matching Video 2 */}
        <div className="bg-[#002244] text-white p-4 rounded-3xl relative overflow-hidden shadow-sm">
          <p className="text-xs font-medium text-slate-200 leading-snug max-w-[240px]">
            A fatura em débito automático do seu cartão fechou
          </p>
          <button
            onClick={onNavigateToCartoes}
            type="button"
            className="mt-3 px-4 py-1.5 bg-white text-[#002244] text-xs font-bold rounded-full hover:bg-slate-100 transition-colors cursor-pointer shadow-xs active:scale-95"
          >
            Conferir detalhes
          </button>
        </div>

        {/* Section: Meu Itaú - Horizontal Quick Tiles */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-sm font-bold text-slate-800">Meu Itaú</h2>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {/* 1. Pix e transferir */}
            <button
              onClick={() => notify('Acessando Pix e Transferências')}
              type="button"
              className="flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-13 h-13 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center justify-center group-hover:border-[#32BCAD] transition-all">
                <PixIcon className="w-6 h-6 text-[#32BCAD]" />
              </div>
              <span className="text-[10px] text-slate-700 font-medium leading-tight mt-1.5">
                Pix e transferir
              </span>
            </button>

            {/* 2. Pagar */}
            <button
              onClick={() => notify('Pagamento de contas e boletos')}
              type="button"
              className="flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-13 h-13 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center justify-center group-hover:border-slate-300 transition-all">
                <Barcode className="w-6 h-6 text-slate-700 stroke-[1.8]" />
              </div>
              <span className="text-[10px] text-slate-700 font-medium leading-tight mt-1.5">
                Pagar
              </span>
            </button>

            {/* 3. Ofertas exclusivas (PLR) */}
            <button
              onClick={() => notify('Ofertas exclusivas com PLR')}
              type="button"
              className="flex flex-col items-center text-center group cursor-pointer relative"
            >
              <div className="w-13 h-13 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center justify-center group-hover:border-blue-400 transition-all relative">
                <span className="text-[9px] font-black uppercase tracking-wider text-white bg-[#0047BA] px-1 py-0.5 rounded-sm">
                  PLR
                </span>
              </div>
              <span className="text-[10px] text-slate-700 font-medium leading-tight mt-1.5">
                Ofertas exclusivas
              </span>
            </button>

            {/* 4. Cartão virtual */}
            <button
              onClick={onNavigateToCartoes}
              type="button"
              className="flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-13 h-13 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center justify-center group-hover:border-[#EC7000] transition-all">
                <CreditCard className="w-6 h-6 text-slate-700 stroke-[1.8]" />
              </div>
              <span className="text-[10px] text-slate-700 font-medium leading-tight mt-1.5">
                Cartão virtual
              </span>
            </button>

            {/* 5. Cofrinhos */}
            <button
              onClick={onStartControle}
              type="button"
              className="flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-13 h-13 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center justify-center group-hover:border-emerald-400 transition-all">
                <Coins className="w-6 h-6 text-slate-700 stroke-[1.8]" />
              </div>
              <span className="text-[10px] text-slate-700 font-medium leading-tight mt-1.5">
                Cofrinhos
              </span>
            </button>
          </div>
        </div>

        {/* Account Card - Matching Video 2 */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 space-y-3">
          <div
            onClick={onNavigateToExtrato}
            className="flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-800 group-hover:text-[#EC7000] transition-colors">
                Conta corrente
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Saldo</span>
              <div className="text-lg font-black text-slate-900 tabular-nums">
                {showBalance ? 'R$ 14.890,50' : '••••'}
              </div>
            </div>

            <button
              onClick={() => setShowBalance(!showBalance)}
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Mais opções do saldo"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 block font-medium">Limite disponível</span>
            <span className="text-xs font-bold text-slate-800 tabular-nums">
              {showBalance ? 'R$ 25.000,00' : '••••'}
            </span>
          </div>
        </div>

        {/* Personnalité Card Row - Matching Video 2 */}
        <div
          onClick={onNavigateToCartoes}
          className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs flex items-center justify-between cursor-pointer hover:border-slate-200 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
              <CreditCard className="w-4 h-4 text-slate-200" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 group-hover:text-[#EC7000] transition-colors block">
                Personnalité Black final 9241
              </span>
              <span className="text-[11px] text-slate-400">
                Fatura fechada • Débito automático
              </span>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
        </div>

        {/* Active Goals from Ia.i */}
        {activeGoals && activeGoals.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-[#EC7000]" />
                <h3 className="text-xs font-bold text-slate-900">
                  Missões e Metas Ativas
                </h3>
              </div>
              <button
                onClick={onNavigateToIai}
                className="text-xs font-bold text-[#EC7000] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Nova</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {activeGoals.map((goal) => {
                const progressPct = Math.min(
                  100,
                  Math.round((goal.currentAmount / goal.targetAmount) * 100)
                );

                return (
                  <div
                    key={goal.id}
                    onClick={onNavigateToIai}
                    className="bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs hover:border-slate-200 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                          {getCategoryIcon(goal.category)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            {goal.title}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            Prazo: {goal.timeframeMonths} meses
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-black text-slate-900 tabular-nums">
                        R$ {goal.targetAmount.toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full rounded-full bg-[#EC7000]"
                        style={{ width: `${Math.max(5, progressPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating IA.i Button: Icon by default, auto-cycles text & beta badge, opens Ia.i on tap */}
      <IaiFloatingButton onClick={onNavigateToIai} />
    </div>
  );
};
