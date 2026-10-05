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
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded gap-1.5 h-8',
    md: 'text-sm px-4 py-2 rounded-md gap-2 h-10',
    lg: 'text-base px-5 py-2.5 rounded-md gap-2.5 h-11',
  };

  const variantStyles = {
    primary: 'bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-semibold shadow-sm hover:shadow-amber-500/10 active:translate-y-px',
    secondary: 'bg-zinc-800 hover:bg-zinc-700/80 text-zinc-100 border border-zinc-700/60 shadow-sm active:translate-y-px',
    outline: 'bg-transparent hover:bg-zinc-800/60 text-zinc-200 border border-zinc-700/80 active:translate-y-px',
    danger: 'bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 border border-rose-800/50 active:translate-y-px',
    ghost: 'bg-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200',
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
