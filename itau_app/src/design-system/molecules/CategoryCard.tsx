import React from 'react';
import { Check } from 'lucide-react';

export interface CategoryCardProps {
  id: string;
  name: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  selected?: boolean;
  onSelect?: (id: string) => void;
  className?: string;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  id,
  name,
  icon,
  iconBgColor = 'bg-orange-50 text-[#EC7000]',
  selected = false,
  onSelect,
  className = '',
}) => {
  return (
    <button
      onClick={() => onSelect?.(id)}
      type="button"
      className={`
        w-full flex items-center justify-between p-3.5 rounded-2xl transition-all duration-200 
        cursor-pointer select-none text-left border
        ${
          selected
            ? 'bg-[#FFF7F0] border-[#EC7000] shadow-[0_2px_12px_rgba(236,112,0,0.15)] ring-1 ring-[#EC7000]'
            : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50 shadow-sm'
        }
        ${className}
      `}
    >
      <div className="flex items-center gap-3.5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgColor}`}>
          {icon}
        </div>
        <span className="text-sm font-semibold text-slate-800">
          {name}
        </span>
      </div>

      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
          selected
            ? 'bg-[#EC7000] border-[#EC7000] text-white shadow-sm'
            : 'border-slate-300 bg-white'
        }`}
      >
        {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
      </div>
    </button>
  );
};
