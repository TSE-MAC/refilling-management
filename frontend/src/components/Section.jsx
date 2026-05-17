import React from 'react';

export default function Section({ title, action, count, children, className = '' }) {
  return (
    <section className={`mb-5 ${className}`}>
      <div className="flex items-end justify-between mb-2.5">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-[15px] font-bold text-ops-ink uppercase tracking-wider">
            {title}
          </h2>
          {typeof count === 'number' && (
            <span className="text-[11px] font-mono font-bold text-slate-500 tabular-nums">
              {count.toString().padStart(2, '0')}
            </span>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
