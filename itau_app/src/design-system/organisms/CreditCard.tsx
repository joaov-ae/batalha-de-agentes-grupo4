import React, { useState } from 'react';
import { Wifi, Eye, EyeOff } from 'lucide-react';

export type CardVariant = 'click-orange' | 'black' | 'gold';

export interface CreditCardProps {
  variant?: CardVariant;
  holderName?: string;
  lastDigits?: string;
  cardName?: string;
  type?: string;
  expiry?: string;
  cvv?: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  showFlipButton?: boolean;
}

export const CreditCard: React.FC<CreditCardProps> = ({
  variant = 'click-orange',
  holderName = 'ROBERTO ALVES',
  lastDigits = '1226',
  cardName = 'Itaú Click',
  type = 'Crédito',
  expiry = '09/29',
  cvv = '482',
  isActive = true,
  onClick,
  className = '',
  showFlipButton = true,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);

  const variantStyles = {
    'click-orange': {
      bg: 'bg-gradient-to-br from-[#FF6B00] via-[#EC7000] to-[#CF5B00]',
      textColor: 'text-white',
      chipColor: 'bg-gradient-to-tr from-amber-200 to-amber-400 border-amber-500/40',
      mastercardColor: true,
      shadow: 'shadow-[0_12px_28px_rgba(236,112,0,0.35)]',
    },
    black: {
      bg: 'bg-gradient-to-br from-[#23272E] via-[#16181D] to-[#0A0B0D]',
      textColor: 'text-white',
      chipColor: 'bg-gradient-to-tr from-slate-300 to-slate-400 border-slate-500/40',
      mastercardColor: true,
      shadow: 'shadow-[0_12px_28px_rgba(0,0,0,0.35)]',
    },
    gold: {
      bg: 'bg-gradient-to-br from-[#D4AF37] via-[#B8860B] to-[#996515]',
      textColor: 'text-white',
      chipColor: 'bg-gradient-to-tr from-amber-100 to-amber-300 border-amber-600/40',
      mastercardColor: true,
      shadow: 'shadow-[0_12px_28px_rgba(184,134,11,0.35)]',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className={`relative select-none transition-all duration-300 perspective-1000 ${
        isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-70'
      } ${className}`}
    >
      <div
        onClick={onClick}
        className={`
          relative w-full aspect-[1.586/1] rounded-[22px] p-5 flex flex-col justify-between overflow-hidden cursor-pointer
          border border-white/20 transition-transform duration-500
          ${style.bg} ${style.textColor} ${style.shadow}
        `}
      >
        {/* Subtle holographic sheen overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none transform -rotate-12 translate-y-[-20%]" />

        {!isFlipped ? (
          /* Card Front */
          <>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                {/* Mastercard brand circles */}
                <div className="flex -space-x-2">
                  <div className="w-5 h-5 rounded-full bg-[#EB001B] opacity-90" />
                  <div className="w-5 h-5 rounded-full bg-[#F79E1B] opacity-90" />
                </div>
                <span className="font-bold text-sm tracking-tight drop-shadow-sm">
                  {cardName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium tracking-widest tabular-nums opacity-90">
                  •••• {lastDigits}
                </span>
              </div>
            </div>

            {/* Chip & Contactless */}
            <div className="flex items-center justify-between my-auto relative z-10">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-7 rounded-md border ${style.chipColor} flex flex-col justify-between p-1 opacity-90 shadow-inner`}>
                  <div className="h-0.5 bg-black/20 rounded w-full" />
                  <div className="h-0.5 bg-black/20 rounded w-2/3" />
                  <div className="h-0.5 bg-black/20 rounded w-full" />
                </div>
                <Wifi className="w-4 h-4 rotate-90 opacity-70" />
              </div>
            </div>

            {/* Card Footer */}
            <div className="flex items-end justify-between relative z-10">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                  {type}
                </span>
                <span className="text-xs font-semibold tracking-wide drop-shadow-sm block mt-0.5">
                  {holderName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-[9px] uppercase font-medium opacity-70 block leading-none">Validade</span>
                  <span className="text-xs font-mono font-semibold tabular-nums mt-0.5 block">{expiry}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Card Back */
          <div className="h-full flex flex-col justify-between py-1 relative z-10">
            <div className="h-8 bg-black/70 -mx-5 mt-2" />
            <div className="flex items-center justify-between px-2">
              <div className="text-[10px] text-white/80">Código de Segurança (CVV)</div>
              <div className="bg-white text-slate-900 font-mono font-bold text-xs px-2.5 py-1 rounded">
                {showSensitive ? cvv : '•••'}
              </div>
            </div>
            <div className="text-[9px] opacity-70 px-2 leading-tight">
              Para suporte ligue para 4004-4828. Este cartão é pessoal e intransferível.
            </div>
          </div>
        )}
      </div>

      {/* Quick flip / sensitive toggle button */}
      {showFlipButton && (
        <div className="flex justify-end gap-2 mt-2 px-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsFlipped(!isFlipped);
            }}
            className="text-[11px] font-semibold text-slate-500 hover:text-[#EC7000] transition-colors flex items-center gap-1 py-0.5 px-2 rounded-md hover:bg-slate-100"
          >
            {isFlipped ? 'Ver frente' : 'Ver verso (CVV)'}
          </button>
          {isFlipped && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSensitive(!showSensitive);
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-[#EC7000] transition-colors flex items-center gap-1 py-0.5 px-2 rounded-md hover:bg-slate-100"
            >
              {showSensitive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showSensitive ? 'Ocultar' : 'Revelar'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
