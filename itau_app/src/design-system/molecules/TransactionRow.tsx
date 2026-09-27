import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface TransactionRowProps {
  icon: React.ReactNode;
  iconBg?: 'light' | 'green' | 'orange' | 'gray';
  title: string;
  subtitle?: string;
  amount: string;
  installments?: string;
  type?: 'expense' | 'income' | 'info';
  date?: string;
  onClick?: () => void;
  className?: string;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  icon,
  iconBg = 'gray',
  title,
  subtitle,
  amount,
  installments,
  type = 'expense',
  onClick,
  className = '',
}) => {
  const iconBgStyles = {
    gray: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-[#FFF4EB] text-[#EC7000]',
    light: 'bg-white border border-slate-200 text-slate-700',
  };

  const amountColor = type === 'income' ? 'text-emerald-600' : 'text-slate-900';

  return (
    <button
      onClick={onClick}
      type="button"
      className={`w-full flex items-center justify-between py-3 px-1 hover:bg-slate-50/70 transition-colors text-left group cursor-pointer border-b border-slate-100/80 last:border-b-0 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconBgStyles[iconBg]}`}>
          {icon}
        </div>
        <div className="min-w-0 pr-2">
          {subtitle && (
            <span className="block text-[11px] text-slate-400 font-medium truncate uppercase tracking-wider">
              {subtitle}
            </span>
          )}
          <span className="block text-sm font-semibold text-slate-800 truncate group-hover:text-[#EC7000] transition-colors">
            {title}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-right shrink-0">
        <div>
          <span className={`block text-sm font-bold tabular-nums tracking-tight ${amountColor}`}>
            {amount}
          </span>
          {installments && (
            <span className="block text-xs text-slate-400 font-normal mt-0.5">
              {installments}
            </span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </button>
  );
};
