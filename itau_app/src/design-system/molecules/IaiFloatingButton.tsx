import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

export interface IaiFloatingButtonProps {
  /** Callback fired when the user clicks the button to open Ia.i chat */
  onClick: () => void;
  /** Custom classes for positioning or styling */
  className?: string;
  /** Whether the button starts expanded */
  defaultExpanded?: boolean;
}

type ButtonState = 'vamos-conversar' | 'salario-programar' | 'compact-icon';

export const IaiFloatingButton: React.FC<IaiFloatingButtonProps> = ({
  onClick,
  className = '',
  defaultExpanded = true,
}) => {
  const [isCompressed, setIsCompressed] = useState(!defaultExpanded);

  // Automatically compress after 3 seconds to remain as a compact floating icon button
  useEffect(() => {
    if (!defaultExpanded) return;
    const timer = setTimeout(() => {
      setIsCompressed(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [defaultExpanded]);

  const handleInteraction = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <div
      className={`absolute bottom-5 right-5 z-40 select-none flex items-center ${className}`}
    >
      <button
        onClick={handleInteraction}
        type="button"
        aria-label="Abrir assistente Ia.i: Salário na conta, vamos programar o mês?"
        className={`relative flex items-center h-12 px-[13px] rounded-full bg-white border border-slate-200/90 shadow-[0_6px_22px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_26px_rgba(0,71,186,0.2)] active:scale-95 transition-[box-shadow,transform] duration-300 ease-out cursor-pointer`}
      >
        {/* Orange Sparkle Icon - fixed solid without flickering/pulsing */}
        <div className="flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-[#EC7000] fill-[#EC7000]" />
        </div>

        {/* Text area: stays mounted and retracts smoothly (width + opacity) into the icon */}
        <div
          aria-hidden={isCompressed}
          className={`flex items-center text-left whitespace-nowrap overflow-hidden transition-[max-width,opacity,margin] duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] ${
            isCompressed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[280px] opacity-100 ml-3'
          }`}
        >
          <span className="text-xs font-semibold text-slate-800 tracking-tight pr-1">
            Salário na conta, vamos programar o mês?
          </span>
        </div>

        {/* Blue "beta" Badge centralized at the bottom for both expanded and compact states */}
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider text-[#0047BA] bg-[#EBF3FC] border border-[#B9D7F9] px-1.5 py-[0.5px] rounded-full shadow-2xs whitespace-nowrap pointer-events-none z-10">
          beta
        </span>
      </button>
    </div>
  );
};
