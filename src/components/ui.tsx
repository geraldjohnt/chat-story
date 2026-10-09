import type { ReactNode } from 'react';
import type { StoryStatus } from '../types';
import type { DataLoadError } from '../services/storyRepository';

const STATUS_LABEL: Record<string, string> = { planned: 'Planned', ongoing: 'Ongoing', completed: 'Completed', 'on-hold': 'On hold', draft: 'Draft', final: 'Final' };

export function StatusBadge({ status }: { status: StoryStatus | 'draft' | 'final' }) {
  return <span className={`badge badge--${status}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function EmptyState({ title, children, icon = '💬' }: { title: string; children?: ReactNode; icon?: string }) {
  return (
    <section className="empty card" aria-label={title}>
      <div className="empty__icon" aria-hidden="true">{icon}</div>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorPanel({ title, error, onRetry }: { title: string; error: DataLoadError | Error | string; onRetry?: () => void }) {
  const message = typeof error === 'string' ? error : error.message;
  const issues = typeof error === 'object' && 'issues' in error ? (error as DataLoadError).issues : [];
  return (
    <section className="error-panel card" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      {issues.length > 0 && (
        <details>
          <summary>{issues.length} validation issue{issues.length === 1 ? '' : 's'}</summary>
          <ul className="issues">
            {issues.slice(0, 50).map((i, n) => <li key={n}><code>{i.file}</code> {i.message}</li>)}
          </ul>
        </details>
      )}
      {onRetry && <button className="btn" onClick={onRetry}>Retry</button>}
    </section>
  );
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}
