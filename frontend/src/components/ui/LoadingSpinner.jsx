import React from 'react';

export function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
      <div
        className={`${sizes[size]} rounded-full border-indigo-500/20 border-t-indigo-500 animate-spin`}
      />
      {text && <p className="text-sm font-medium animate-pulse">{text}</p>}
    </div>
  );
}

export function SkeletonRow({ cols = 4 }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-slate-800/60 animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-slate-800 rounded"
          style={{ width: `${Math.max(20, 100 / cols - 5)}%` }}
        />
      ))}
    </div>
  );
}
