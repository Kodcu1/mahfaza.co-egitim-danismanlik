import React from 'react';
import { Inbox, AlertCircle } from 'lucide-react';
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
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-slate-200 rounded-2xl bg-white shadow-xs">
      <div className="text-slate-400 mb-3">
        {icon || <Inbox className="w-8 h-8" />}
      </div>
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
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
      <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-slate-500 font-medium tracking-wide">{message}</p>
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
    <div className="flex flex-col items-center justify-center text-center p-8 border border-rose-200 bg-rose-50/50 rounded-2xl">
      <AlertCircle className="w-7 h-7 text-rose-500 mb-2" />
      <h4 className="text-sm font-semibold text-rose-900">{title}</h4>
      <p className="text-xs text-rose-600 max-w-md mt-1 mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Tekrar Dene
        </Button>
      )}
    </div>
  );
};
