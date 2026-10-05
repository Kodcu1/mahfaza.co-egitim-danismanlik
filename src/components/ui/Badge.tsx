import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'amber';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  dot = true,
  className = '',
}) => {
  const dotColors = {
    neutral: 'bg-zinc-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    amber: 'bg-amber-400',
  };

  const textColors = {
    neutral: 'text-zinc-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-rose-400',
    amber: 'text-amber-300',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium tracking-wide ${textColors[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
};
