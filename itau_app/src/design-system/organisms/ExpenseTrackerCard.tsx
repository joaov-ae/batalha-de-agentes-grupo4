import React from 'react';
import { ChevronRight, AlertCircle } from 'lucide-react';

export interface ExpenseTrackerCardProps {
  category: string;
  spent: number;
  limit: number;
  period?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const ExpenseTrackerCard: React.FC<ExpenseTrackerCardProps> = ({
  category = 'Delivery',
  spent = 33.5,
  limit = 200.0,
  period = 'De 01/03 até hoje',
  icon,
  onClick,
  className = '',
}) => {
  const percentage = Math.min(Math.round((spent / limit) * 100), 100);
  const remaining = Math.max(limit - spent, 0);
  const isNearLimit = percentage >= 80;
  const isOverLimit = spent > limit;

  // Status color logic
  const getProgressColor = () => {
    if (isOverLimit) return 'bg-red-500';
    if (isNearLimit) return 'bg-amber-500';
    return 'bg-[#1C2024]'; // matches the dark fill in the screenshot!
  };

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.04)]
        transition-all duration-200 hover:shadow-md cursor-pointer select-none group
        ${className}
      `}
    >
      {/* Category header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#EC7000] flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div>
            <span className="font-bold text-sm text-slate-800 group-hover:text-[#EC7000] transition-colors">
              {category}
            </span>
            {period && (
              <span className="block text-[11px] text-slate-400 font-normal">
                {period}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
      </div>

      {/* Amounts */}
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-base font-bold text-slate-900 tabular-nums">
          R$ {spent.toFixed(2).replace('.', ',')}
        </div>
        <div className="text-xs text-slate-500 font-medium tabular-nums">
          De R$ {limit.toFixed(2).replace('.', ',')}
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${getProgressColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Bottom status note */}
      <div className="flex items-center justify-between mt-2.5 text-[11px] text-slate-500">
        <span>{percentage}% utilizado</span>
        {isOverLimit ? (
          <span className="text-red-600 font-semibold flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Excedeu o teto
          </span>
        ) : (
          <span>Resta R$ {remaining.toFixed(2).replace('.', ',')}</span>
        )}
      </div>
    </div>
  );
};
