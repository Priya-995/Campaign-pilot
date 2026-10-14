import React from 'react';
import { PackageOpen, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({
  title = 'No items found',
  description = 'Try adjusting your filters or create a new item to get started.',
  icon: Icon = PackageOpen,
  actionLabel,
  onAction
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
      <div className="p-3 bg-slate-800/80 rounded-2xl text-slate-400 mb-4 border border-slate-700/50">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading this data. Please try again.',
  onRetry
}) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center border border-rose-500/20 rounded-2xl bg-rose-500/5">
      <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400 mb-4 border border-rose-500/20">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-rose-200 mb-1">{title}</h3>
      <p className="text-sm text-rose-300/80 max-w-sm mb-5">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
