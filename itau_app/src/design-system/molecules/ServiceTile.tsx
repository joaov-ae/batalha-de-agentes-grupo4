import React from 'react';

export interface ServiceTileProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  badge?: string;
  variant?: 'card' | 'flat' | 'elevated';
  onClick?: () => void;
  className?: string;
}

export const ServiceTile: React.FC<ServiceTileProps> = ({
  icon,
  label,
  sublabel,
  badge,
  variant = 'card',
  onClick,
  className = '',
}) => {
  const variantStyles = {
    card: 'bg-white border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-200',
    flat: 'bg-slate-50 border border-slate-100 hover:bg-slate-100',
    elevated: 'bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-slate-100 hover:shadow-lg',
  };

  return (
    <button
      onClick={onClick}
      type="button"
      className={`
        relative group flex flex-col justify-between text-left p-3.5 rounded-2xl transition-all duration-200 
        active:scale-[0.97] cursor-pointer select-none min-h-[96px] w-full
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {badge && (
        <span className="absolute top-2 right-2 bg-[#FFF4EB] text-[#EC7000] text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-[#FFD8B5]">
          {badge}
        </span>
      )}
      
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#EC7000] transition-transform group-hover:scale-110 duration-200">
        {icon}
      </div>

      <div className="mt-2">
        <span className="block text-xs font-semibold text-slate-800 leading-tight group-hover:text-[#EC7000] transition-colors">
          {label}
        </span>
        {sublabel && (
          <span className="block text-[11px] text-slate-400 font-normal mt-0.5 leading-none">
            {sublabel}
          </span>
        )}
      </div>
    </button>
  );
};
