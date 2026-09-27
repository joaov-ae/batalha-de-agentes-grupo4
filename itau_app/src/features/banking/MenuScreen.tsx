import React from 'react';
import {
  CreditCard,
  PieChart,
  Globe2,
  BookOpen,
  Shield,
  HelpCircle,
  ChevronRight,
  Sparkles,
  ListOrdered,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';

export interface MenuScreenProps {
  onNavigateToCartoes: () => void;
  onNavigateToControleGastos: () => void;
  onNavigateToRegional: () => void;
  onNavigateToExtrato: () => void;
  onNavigateToIai: () => void;
  /** Simulador de 4 passos (Raio-X, lazer, transporte, resumo) */
  onNavigateToSimulador?: () => void;
  onOpenStorybook: () => void;
  className?: string;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({
  onNavigateToCartoes,
  onNavigateToControleGastos,
  onNavigateToRegional,
  onNavigateToExtrato,
  onNavigateToIai,
  onNavigateToSimulador,
  onOpenStorybook,
  className = '',
}) => {
  return (
    <div className={`bg-[#F4F6F8] min-h-full pb-20 select-none text-slate-800 ${className}`}>
      {/* Header Profile */}
      <div className="bg-white p-5 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#002244] text-white font-bold text-base flex items-center justify-center shadow-sm">
            RA
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-base text-slate-900 leading-tight">Roberto Alves</h2>
            <p className="text-xs text-slate-400 mt-0.5">Agência 0340 • Conta 92104-1</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Ia.i AI Chat Feature Highlight */}
        <div
          onClick={onNavigateToIai}
          className="bg-gradient-to-r from-[#002244] to-[#0A3159] p-4 rounded-2xl text-white flex items-center justify-between cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EC7000] to-[#BA4E00] text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white block">
                  Ia.i • Inteligência Financeira
                </span>
                <span className="text-[10px] font-bold bg-[#EC7000] text-white px-1.5 py-0.2 rounded">
                  IA
                </span>
              </div>
              <span className="text-[11px] text-slate-200 block mt-0.5">
                Planejamento de objetivos e gastos
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#FFA24C] group-hover:translate-x-0.5 transition-transform" />
        </div>

        {/* Storybook Feature Highlight */}
        <div
          onClick={onOpenStorybook}
          className="bg-gradient-to-r from-[#FFF4EB] to-white p-4 rounded-2xl border border-[#FFD8B5] flex items-center justify-between cursor-pointer hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF4785] to-[#EC7000] text-white flex items-center justify-center shadow-sm">
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 block group-hover:text-[#EC7000] transition-colors">
                  Storybook Design System
                </span>
                <span className="text-[10px] font-bold bg-[#FF4785] text-white px-1.5 py-0.2 rounded">
                  localhost:6006
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Abrir Storybook em nova aba (/storybook)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[#EC7000] font-bold text-xs">
            <span>Abrir</span>
            <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Navigation Section */}
        <div className="bg-white rounded-3xl p-2 shadow-xs border border-slate-100 divide-y divide-slate-100">
          <button
            type="button"
            onClick={onNavigateToExtrato}
            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ListOrdered className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800 group-hover:text-[#EC7000] transition-colors">
                Extrato da Conta Corrente
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
          </button>

          <button
            type="button"
            onClick={onNavigateToCartoes}
            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#EC7000] flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800 group-hover:text-[#EC7000] transition-colors">
                Cartões & Fatura (Imagem 1)
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
          </button>

          <button
            type="button"
            onClick={onNavigateToControleGastos}
            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <PieChart className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800 group-hover:text-[#EC7000] transition-colors">
                Controle de Gastos (Imagem 2)
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
          </button>

          {onNavigateToSimulador && (
            <button
              type="button"
              onClick={onNavigateToSimulador}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#EC7000] flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-[#EC7000] transition-colors block">
                    Simulador de Controle de Gastos
                  </span>
                  <span className="text-[10px] text-slate-500">Programar contas fixas, lazer e transporte</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateToRegional}
            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Globe2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800 group-hover:text-[#EC7000] transition-colors">
                Tarjetas LatAm / Paraguai (Imagens 3 e 4)
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
          </button>
        </div>

        {/* Security & Settings Section */}
        <div className="bg-white rounded-3xl p-2 shadow-xs border border-slate-100 divide-y divide-slate-100">
          <div className="w-full flex items-center justify-between p-3.5 text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800">
                Segurança e Senhas
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </div>

          <div className="w-full flex items-center justify-between p-3.5 text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800">
                Ajuda e Atendimento 24h
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </div>
        </div>

        <div className="text-center pt-2 pb-6">
          <p className="text-[11px] text-slate-400">Banco Itaú Unibanco S.A. • Versão 6.24.0</p>
        </div>
      </div>
    </div>
  );
};
