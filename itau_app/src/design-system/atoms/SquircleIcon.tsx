import React from 'react';

export interface SquircleIconProps {
  icon: React.ReactNode;
  variant?: 'orange' | 'navy' | 'light' | 'white' | 'gray';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  bordered?: boolean;
}

export const SquircleIcon: React.FC<SquircleIconProps> = ({
  icon,
  variant = 'orange',
  size = 'md',
  className = '',
  bordered = true,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xl text-sm',
    md: 'w-11 h-11 rounded-2xl text-base',
    lg: 'w-13 h-13 rounded-2xl text-lg',
    xl: 'w-16 h-16 rounded-3xl text-xl',
  };

  const variantClasses = {
    orange: 'bg-white text-[#EC7000] border-[#FFD8B5] hover:bg-[#FFF4EB]',
    navy: 'bg-[#002244] text-white border-[#002244]',
    light: 'bg-[#FFF4EB] text-[#EC7000] border-[#FFE7D1]',
    white: 'bg-white text-[#1C2024] border-slate-200',
    gray: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div
      className={`flex items-center justify-center shrink-0 transition-colors ${
        bordered ? 'border shadow-[0_2px_8px_rgba(0,0,0,0.03)]' : ''
      } ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {icon}
    </div>
  );
};
