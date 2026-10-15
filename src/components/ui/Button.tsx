import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 cursor-pointer rounded-xl';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
    md: 'text-sm px-4 py-2 gap-2 h-10',
    lg: 'text-base px-5 py-2.5 gap-2.5 h-11',
  };

  const variantStyles = {
    primary:
      'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold shadow-xs shadow-amber-500/20 active:translate-y-px',
    secondary:
      'bg-slate-100 hover:bg-slate-200/90 text-slate-700 border border-slate-200 shadow-xs active:translate-y-px',
    outline:
      'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs active:translate-y-px',
    danger:
      'bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 shadow-xs active:translate-y-px',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
