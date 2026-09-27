import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  TrendingUp, 
  ShoppingBag, 
  Award, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Gift, 
  Info,
  X
} from 'lucide-react';
import { FinancialGoal, ScreenType, InvestmentSuggestion } from './studioTypes';

interface MetaDetailScreenProps {
  goal: FinancialGoal;
  itauShopPoints: number;
  onNavigate: (screen: ScreenType) => void;
  onMakeAporte: (goalId: string, amount: number, earnedPoints: number) => void;
}

export const MetaDetailScreen: React.FC<MetaDetailScreenProps> = ({
  goal,
  itauShopPoints,
  onNavigate,
  onMakeAporte,
}) => {
  const [showAporteModal, setShowAporteModal] = useState(false);
  const [aporteValue, setAporteValue] = useState('500,00');
  const [selectedInvestment, setSelectedInvestment] = useState<string>('inv-1');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastEarnedPoints, setLastEarnedPoints] = useState(0);
  const [showStoreInfo, setShowStoreInfo] = useState(false);

  const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));

  const handleConfirmAporte = () => {
    const rawVal = parseFloat(aporteValue.replace(/\./g, '').replace(',', '.')) || 500;
    // Cada R$ 100 aportados rendem 100 pontos no Itaú Shop + bônus de consistência
    const pointsBonus = Math.round(rawVal * 1.5);
    setLastEarnedPoints(pointsBonus);

    onMakeAporte(goal.id, rawVal, pointsBonus);
    setShowAporteModal(false);
    setShowStoreInfo(false);
    setShowSuccessToast(true);

    setTimeout(() => {
      setShowSuccessToast(false);
    }, 6000);
  };

  return (
    <div className="relative flex-1 h-full flex flex-col justify-between bg-[#F4F6F8] text-slate-800 font-sans select-none overflow-hidden">
      {/* Header */}
      <header className="bg-white px-4 py-3 border-b border-[#E8ECEF] flex items-center justify-between flex-shrink-0 z-10 shadow-sm">
        <button 
          onClick={() => onNavigate('hub')}
          className="p-1 rounded-full text-slate-600 hover:text-slate-900 transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2]" />
        </button>

        <div className="text-center">
          <span className="text-[10px] uppercase tracking-wider font-bold text-itau-orange block">
            Missões e Metas
          </span>
          <h1 className="text-xs font-bold text-[#002244] max-w-[200px] truncate">
            {goal.title}
          </h1>
        </div>

        {/* Saldo de Pontos Itaú Shop */}
        <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 px-2 py-1 rounded-full text-itau-orange">
          <ShoppingBag className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono font-bold">{itauShopPoints} pts</span>
        </div>
      </header>

      {/* Conteúdo rolável */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Toast de celebração de pontos */}
        {showSuccessToast && (
          <div className="bg-[#002244] text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between border border-amber-400/40 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                <Gift className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-300">+{lastEarnedPoints} Pontos Itaú Shop!</p>
                <span className="text-[10px] text-slate-300">
                  {showStoreInfo
                    ? `${itauShopPoints.toLocaleString('pt-BR')} pts para trocar por eletrônicos, viagens e vales.`
                    : 'Você subiu no ranking da sua meta.'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowStoreInfo(true)}
              className="text-[10px] bg-white/20 px-2.5 py-1 rounded-lg text-white font-bold hover:bg-white/30"
            >
              Ver Loja
            </button>
          </div>
        )}

        {/* Card Principal da Meta e Progresso */}
        <section className="bg-white rounded-2xl p-4 border border-[#E8ECEF] shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Valor Acumulado</span>
              <h2 className="text-2xl font-extrabold font-mono text-slate-900 tracking-tight">
                R$ {goal.currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h2>
              <span className="text-xs text-slate-500">
                Meta total de <strong>R$ {goal.targetAmount.toLocaleString('pt-BR')}</strong> até {goal.deadline}
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold font-mono">
              {pct}% alcançado
            </div>
          </div>

          {/* Barra de Progresso com Gamificação */}
          <div className="space-y-1 pt-1">
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-itau-orange to-amber-500 rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>Início</span>
              <span>Nível {pct > 50 ? 'Ouro' : 'Prata'} Personnalité</span>
              <span>100% Conquista</span>
            </div>
          </div>

          {/* Gamificação: Próxima Recompensa Itaú Shop */}
          <div className="p-3 bg-[#FFF9F3] border border-[#FFDFC4] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-itau-orange text-white rounded-lg">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Gamificação de Aportes</h4>
                <p className="text-[11px] text-slate-600">
                  Faça um aporte e ganhe <strong>1.5x pontos no Itaú Shop</strong> para trocar por produtos!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Sugestões de Investimentos para Acelerar a Meta */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-[#002244] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-itau-orange" />
              Sugestões de Investimentos Recomendados
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Curadoria Personnalité</span>
          </div>

          <div className="space-y-2">
            {(goal.suggestedInvestments || []).map((inv) => (
              <div 
                key={inv.id}
                onClick={() => {
                  setSelectedInvestment(inv.id);
                  setShowAporteModal(true);
                }}
                className="bg-white border border-[#E8ECEF] hover:border-itau-orange rounded-2xl p-3.5 shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mr-1.5">
                      {inv.type}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 inline">{inv.name}</h4>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 font-mono">
                    {inv.returnRate}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                  {inv.recommendedFor}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                  <span>Liquidez: {inv.liquidity}</span>
                  <span className="text-itau-orange font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Simular e Aportar <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Botão de Aporte no Rodapé */}
      <footer className="p-4 bg-white border-t border-[#E8ECEF] flex-shrink-0 z-10">
        <button
          onClick={() => setShowAporteModal(true)}
          className="w-full py-3.5 bg-itau-orange hover:bg-itau-orange-dark text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4" />
          Fazer Novo Aporte e Ganhar Pontos
        </button>
      </footer>

      {/* DRAWER / BOTTOM SHEET DE NOVO APORTE (CONVERTIDO PARA absolute inset-0 PARA FICAR RESTRITO AO VIEWPORT MOBILE) */}
      {showAporteModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-xs animate-in fade-in overflow-hidden">
          <div className="w-full bg-white rounded-t-3xl p-5 pb-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[90%] overflow-y-auto">
            {/* Pill indicador de arraste do drawer */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-1 mb-1"></div>

            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-itau-orange block">
                  Aporte Financeiro
                </span>
                <h3 className="text-sm font-bold text-[#002244]">
                  Acelerar "{goal.title}"
                </h3>
              </div>
              <button 
                onClick={() => setShowAporteModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Fechar drawer"
              >
                <X className="w-5 h-5 stroke-[2]" />
              </button>
            </div>

            {/* Input de Valor */}
            <div>
              <span className="text-xs text-slate-500 font-medium">Valor do Aporte</span>
              <div className="flex items-center text-3xl font-extrabold font-mono text-[#002244] mt-1 border-b-2 border-itau-orange pb-2">
                <span className="text-itau-orange text-xl mr-1">R$</span>
                <input
                  type="text"
                  value={aporteValue}
                  onChange={(e) => setAporteValue(e.target.value)}
                  className="w-full bg-transparent focus:outline-none"
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Recompensa Imediata Itaú Shop */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-900">
                <ShoppingBag className="w-4 h-4 text-itau-orange" />
                <span>Pontos acumulados com este aporte:</span>
              </div>
              <span className="font-bold font-mono text-itau-orange text-sm">
                +{Math.round((parseFloat(aporteValue.replace(/\./g, '').replace(',', '.')) || 500) * 1.5)} pts
              </span>
            </div>

            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              Débito imediato da sua Conta Corrente Personnalité para o ativo selecionado.
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleConfirmAporte}
                className="w-full py-3.5 bg-itau-orange hover:bg-itau-orange-dark text-white font-bold text-xs rounded-xl shadow-md transition-colors active:scale-98"
              >
                Confirmar Aporte e Resgatar Pontos
              </button>
              <button
                onClick={() => setShowAporteModal(false)}
                className="w-full py-2.5 bg-slate-100 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
