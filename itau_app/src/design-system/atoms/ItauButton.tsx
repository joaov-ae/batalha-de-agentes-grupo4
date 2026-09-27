import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ItauButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  children: React.ReactNode;
}

export const ItauButton: React.FC<ItauButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-150 active:scale-[0.98] select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EC7000]';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-2 min-h-[36px] gap-1.5',
    md: 'text-sm px-5 py-3 min-h-[46px] gap-2',
    lg: 'text-base px-6 py-3.5 min-h-[52px] gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-[#EC7000] hover:bg-[#D45D00] text-white shadow-sm hover:shadow active:bg-[#B94E00]',
    secondary: 'bg-[#002244] hover:bg-[#001733] text-white',
    outline: 'bg-white hover:bg-slate-50 text-[#002244] border border-[#002244] active:bg-slate-100',
    ghost: 'bg-transparent hover:bg-slate-100 text-[#002244] active:bg-slate-200',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  const disabledStyles = 'opacity-40 cursor-not-allowed pointer-events-none filter grayscale-[30%]';

  return (
    <button
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || isLoading ? disabledStyles : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
