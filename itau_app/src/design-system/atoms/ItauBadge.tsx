import React from 'react';

export type BadgeVariant = 'danger' | 'success' | 'orange' | 'neutral' | 'blue';

export interface ItauBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const ItauBadge: React.FC<ItauBadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const variantStyles = {
    danger: 'bg-red-50 text-red-600 border border-red-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    orange: 'bg-[#FFF4EB] text-[#D45D00] border border-[#FFE0C4]',
    blue: 'bg-blue-50 text-blue-700 border border-blue-200',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  const dotColors = {
    danger: 'bg-red-500',
    success: 'bg-emerald-500',
    orange: 'bg-[#EC7000]',
    blue: 'bg-blue-500',
    neutral: 'bg-slate-400',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
