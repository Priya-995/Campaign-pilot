import React from 'react';

export function Card({
  children,
  className = '',
  hover = false,
  glow = false,
  onClick,
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm transition-all duration-200
        ${hover ? 'hover:border-slate-700 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-slate-950/50 cursor-pointer' : ''}
        ${glow ? 'shadow-lg shadow-indigo-500/10 border-indigo-500/30' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
