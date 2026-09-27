import React from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';

export interface PromoBannerProps {
  title?: string;
  description?: string;
  onClick?: () => void;
  className?: string;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({
  title = 'Controle de Gastos',
  description = 'Descubra os seus gastos e evite surpresas no fim do mês.',
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.04)]
        hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden group select-none
        ${className}
      `}
    >
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex-1 pr-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-[#EC7000] transition-colors mb-1">
            <span>{title}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-normal">
            {description}
          </p>
        </div>

        {/* 3D coin illustration icon cluster */}
        <div className="relative shrink-0 w-16 h-16 flex items-center justify-center">
          {/* Ambient glow */}
          <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-md" />
          
          {/* Main Gold Coin Stack */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Top coin */}
            <div className="w-10 h-7 rounded-[50%] bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 border-2 border-amber-200 flex items-center justify-center shadow-md transform -rotate-12">
              <span className="text-amber-900 font-black text-xs">$</span>
            </div>
            {/* Coin thickness/shadow */}
            <div className="w-11 h-4 rounded-[50%] bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-300 -mt-2.5 shadow-sm" />
            <div className="w-12 h-4 rounded-[50%] bg-gradient-to-b from-amber-500 to-amber-700 border border-amber-400 -mt-2.5 shadow" />
          </div>

          {/* Mini sparkle badge */}
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#EC7000] text-white flex items-center justify-center shadow">
            <Sparkles className="w-3 h-3 stroke-[2.5]" />
          </div>
        </div>
      </div>
    </div>
  );
};
