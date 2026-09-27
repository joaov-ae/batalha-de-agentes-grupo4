import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface CardDetailRowProps {
  label: string;
  sublabel?: string;
  value: React.ReactNode;
  secondaryValue?: string;
  valueColor?: 'default' | 'danger' | 'success' | 'orange';
  onClick?: () => void;
  className?: string;
  showChevron?: boolean;
}

export const CardDetailRow: React.FC<CardDetailRowProps> = ({
  label,
  sublabel,
  value,
  secondaryValue,
  valueColor = 'default',
  onClick,
  className = '',
  showChevron = true,
}) => {
  const valueColorStyles = {
    default: 'text-slate-900',
    danger: 'text-red-600',
    success: 'text-emerald-600',
    orange: 'text-[#EC7000]',
  };

  return (
    <button
      onClick={onClick}
      type="button"
      className={`w-full flex items-center justify-between py-3.5 px-1 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors text-left group cursor-pointer ${className}`}
    >
      <div className="flex-1 pr-3">
        <span className="block text-sm font-medium text-slate-700 leading-snug">
          {label}
        </span>
        {sublabel && (
          <span className="block text-xs text-slate-400 font-normal mt-0.5">
            {sublabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-right shrink-0">
        <div>
          <span className={`block text-sm font-bold tabular-nums tracking-tight ${valueColorStyles[valueColor]}`}>
            {value}
          </span>
          {secondaryValue && (
            <span className="block text-xs text-slate-400 font-normal tabular-nums mt-0.5">
              {secondaryValue}
            </span>
          )}
        </div>
        {showChevron && (
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        )}
      </div>
    </button>
  );
};
