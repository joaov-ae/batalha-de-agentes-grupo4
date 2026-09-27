import React from 'react';
import { FileText, Grid, Sparkles, ChevronRight } from 'lucide-react';

export interface MeusBeneficiosCardProps {
  points?: number;
  monetaryValue?: number;
  onExtratoClick?: () => void;
  onBeneficiosItauClick?: () => void;
  onBeneficiosCartaoClick?: () => void;
  className?: string;
}

export const MeusBeneficiosCard: React.FC<MeusBeneficiosCardProps> = ({
  points = 15000,
  monetaryValue = 150,
  onExtratoClick,
  onBeneficiosItauClick,
  onBeneficiosCartaoClick,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden ${className}`}>
      {/* Header with Points and Shop Value */}
      <div className="p-4 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50/50">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Pontos Itaú
            </span>
            <div className="text-2xl font-black text-slate-900 tabular-nums mt-0.5 tracking-tight">
              {points.toLocaleString('pt-BR')} <span className="text-sm font-semibold text-slate-500">pts</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Valem no Itaú Shop</span>
            <span className="text-sm font-bold text-[#EC7000] tabular-nums">
              R$ {monetaryValue.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      </div>

      {/* Action items */}
      <div className="divide-y divide-slate-100">
        <button
          onClick={onExtratoClick}
          type="button"
          className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-[#EC7000] transition-colors">
              Extrato de pontos
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
        </button>

        <button
          onClick={onBeneficiosItauClick}
          type="button"
          className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FFF4EB] text-[#EC7000] flex items-center justify-center">
              <Grid className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-[#EC7000] transition-colors">
              Benefícios Itaú
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
        </button>

        <button
          onClick={onBeneficiosCartaoClick}
          type="button"
          className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-[#EC7000] transition-colors">
              Benefícios do cartão
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
        </button>
      </div>
    </div>
  );
};
