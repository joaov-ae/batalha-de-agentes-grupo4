import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  ShieldCheck, 
  Sliders, 
  TrendingUp, 
  Bell, 
  Check, 
  ChevronRight,
  Lock,
  ArrowRight
} from 'lucide-react';
import { ScreenType } from './studioTypes';

interface IaiLandingScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onActivateWithCategoryCaps: () => void;
  onGoToRegularChat: () => void;
}

export const IaiLandingScreen: React.FC<IaiLandingScreenProps> = ({
  onNavigate,
  onActivateWithCategoryCaps,
  onGoToRegularChat,
}) => {
  const [agreed, setAgreed] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleApprove = () => {
    if (!agreed) return;

    // Dispara toast de funcionalidade ativada
    setShowToast(true);

    // Após breve exibição do feedback visual, direciona para a jornada de análise de teto máximo
    setTimeout(() => {
      onActivateWithCategoryCaps();
    }, 1300);
  };

  return (
    <div className="relative flex-1 h-full flex flex-col justify-between bg-white text-slate-800 font-sans select-none overflow-hidden">
      {/* Toast flutuante de funcionalidade ativada */}
      {showToast && (
        <div className="absolute top-4 left-4 right-4 z-50 bg-[#002244] text-white p-3.5 rounded-2xl shadow-2xl border border-amber-400/40 flex items-center justify-between animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Funcionalidade ativada!</p>
              <span className="text-[10px] text-amber-300">Iniciando análise de tetos de gastos...</span>
            </div>
          </div>
          <Sparkles className="w-4 h-4 text-itau-orange animate-spin" />
        </div>
      )}

      {/* Top Header */}
      <header className="px-4 py-3 border-b border-[#E8ECEF] flex items-center justify-between flex-shrink-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#EC7000] to-amber-500 flex items-center justify-center text-white font-bold text-xs shadow-xs">
            ia
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#002244]">ia.i</span>
            <span className="text-[9px] bg-[#002244] text-white font-mono px-1.5 py-0.2 rounded-full uppercase font-bold tracking-wider">
              BETA
            </span>
          </div>
        </div>

        <button 
          onClick={() => onNavigate('hub')}
          className="p-1 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5 stroke-[2]" />
        </button>
      </header>

      {/* Conteúdo Rolável da Landing */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Banner de Destaque com o Personnalité & ia.i */}
        <section className="bg-gradient-to-b from-[#FFF9F3] via-[#FFF4EB] to-[#FFEFE2] rounded-3xl p-5 border border-[#FFDFC4] shadow-xs text-center space-y-3 relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-white border border-[#FFDFC4] flex items-center justify-center mx-auto shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#EC7000] to-amber-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-base font-extrabold text-[#002244] tracking-tight">
              Sua Consultoria Financeira com IA
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed px-1">
              Conheça a <strong>ia.i</strong>: inteligência artificial do Itaú Personnalité que aprende seu padrão de vida e te ajuda a gastar com equilíbrio e sem culpa.
            </p>
          </div>
        </section>

        {/* Pilares e Informações da Funcionalidade */}
        <section className="space-y-2.5">
          <h2 className="text-[11px] font-bold text-[#002244] uppercase tracking-wider px-1">
            Como a ia.i funciona para você
          </h2>

          {/* Item 1: Análise de Tetos por Categoria */}
          <div className="p-3.5 bg-white border border-[#E8ECEF] rounded-2xl shadow-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-itau-orange flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sliders className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#002244]">Controle de Gastos por Categoria</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                Calcula automaticamente tetos em dinheiro e porcentagem para Essenciais, Lazer e Transporte a partir do seu salário de R$ 10.000.
              </p>
            </div>
          </div>

          {/* Item 2: Alertas Proativos sem Culpa */}
          <div className="p-3.5 bg-white border border-[#E8ECEF] rounded-2xl shadow-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0047BA] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bell className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#002244]">Notificações de Margem Segura</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                Receba lembretes discretos no seu Personnalité Black ao atingir 80% do limite de lazer, evitando surpresas no fechamento da fatura.
              </p>
            </div>
          </div>

          {/* Item 3: Segurança Bancária Itaú */}
          <div className="p-3.5 bg-white border border-[#E8ECEF] rounded-2xl shadow-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#002244]">Segurança e Sigilo Absoluto</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                Seus dados financeiros permanecem protegidos pelos padrões mais rigorosos do Banco Itaú e da LGPD.
              </p>
            </div>
          </div>
        </section>

        {/* Checkbox de Aceite e Termos */}
        <section className="bg-[#FAFBFD] p-3.5 rounded-2xl border border-[#E8ECEF] space-y-2">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-itau-orange rounded border-slate-300 cursor-pointer"
            />
            <span className="text-[11px] text-slate-700 leading-relaxed">
              Li e concordo com os <strong>Termos de Uso de IA Financeira</strong> e autorizo a ia.i a analisar meus dados de extrato para sugerir tetos de gastos.
            </span>
          </label>
        </section>
      </div>

      {/* Botões do Rodapé: Ativar vs Agora Não */}
      <footer className="p-4 bg-white border-t border-[#E8ECEF] flex-shrink-0 space-y-2 z-10">
        <button
          onClick={handleApprove}
          disabled={!agreed}
          className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
            agreed 
              ? 'bg-[#EC7000] hover:bg-itau-orange-dark text-white active:scale-98 cursor-pointer' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-75'
          }`}
        >
          <span>Ativar e Analisar Tetos de Gastos</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onGoToRegularChat}
          className="w-full py-2.5 text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors text-center"
        >
          Agora não
        </button>
      </footer>
    </div>
  );
};
