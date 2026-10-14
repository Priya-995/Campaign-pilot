import React from 'react';
import { Sparkles } from 'lucide-react';

export function Badge({
  children,
  variant = 'default', // 'default', 'success', 'warning', 'danger', 'info', 'ai', 'channel'
  size = 'md',        // 'sm', 'md'
  icon: Icon,
  className = ''
}) {
  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5'
  };

  const variants = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    info: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    ai: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    channel: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {variant === 'ai' && !Icon && <Sparkles className="w-3 h-3 text-purple-400" />}
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}
