import type { ReactNode } from 'react';

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function Notice({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'error' }) {
  return <p className={tone === 'error' ? 'notice notice--error' : 'notice'}>{children}</p>;
}

export function LoadingState({ label }: { label: string }) {
  return (
    <p className="loading" role="status">
      {label}
    </p>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <div className="progress__bar" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function Collapsible({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="collapsible" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="collapsible__body">{children}</div>
    </details>
  );
}
