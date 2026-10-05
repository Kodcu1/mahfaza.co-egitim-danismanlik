import React from 'react';
import { Inbox, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-zinc-800 rounded-lg bg-zinc-950/40">
      <div className="text-zinc-600 mb-3">
        {icon || <Inbox className="w-8 h-8" />}
      </div>
      <h4 className="text-sm font-semibold text-zinc-300">{title}</h4>
      <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Veriler yükleniyor...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 gap-3">
      <div className="w-6 h-6 border-2 border-amber-500/80 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-zinc-500 tracking-wide">{message}</p>
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({
  title = 'Veri Alınamadı',
  message,
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-rose-950/60 bg-rose-950/10 rounded-lg">
      <AlertCircle className="w-7 h-7 text-rose-400 mb-2" />
      <h4 className="text-sm font-semibold text-rose-200">{title}</h4>
      <p className="text-xs text-zinc-400 max-w-md mt-1 mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Tekrar Dene
        </Button>
      )}
    </div>
  );
};
