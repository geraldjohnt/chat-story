import { Link } from 'react-router-dom';
import { EmptyState, ErrorPanel, Loading, PageHeader, StatusBadge, formatDate } from '../components/ui';
import { useLibrary } from '../features/library/LibraryContext';
import { computeStats } from '../features/library/stats';

export function HomePage() {
  const { status, library, error, refresh } = useLibrary();
  if (status === 'loading') return <Loading label="Loading story library…" />;
  if (status === 'error' || !library) return <ErrorPanel title="The story library could not be loaded" error={error ?? 'Unknown error'} onRetry={() => void refresh()} />;
  const stats = computeStats(library);
  const recent = [...library.stories].sort((a, b) => Date.parse(b.entry.updatedAt) - Date.parse(a.entry.updatedAt)).slice(0, 5);
  const cards = [
    { label: 'Published stories', value: stats.stories },
    { label: 'Total parts', value: stats.parts },
    { label: 'Completed', value: stats.completed },
    { label: 'Ongoing', value: stats.ongoing },
    { label: 'Planned', value: stats.planned },
    { label: 'On hold', value: stats.onHold },
  ];
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Overview of the published story library." />
      <section aria-label="Library statistics" className="stats">
        {cards.map((c) => (
          <div key={c.label} className="stat card">
            <div className="stat__value">{c.value}</div>
            <div className="stat__label">{c.label}</div>
          </div>
        ))}
      </section>
      {stats.failed > 0 && <p className="warn-text">{stats.failed} stor{stats.failed === 1 ? 'y' : 'ies'} could not be loaded. Open the library for details.</p>}
      {library.stories.length === 0 ? (
        <EmptyState title="No published stories yet">
          <p>The library is empty. Stories appear here after an outline is approved in Claude Code, generated, validated and pushed to GitHub.</p>
          <ol className="steps">
            <li>Ask Claude Code for a relationship-drama outline (<code>/outline</code>).</li>
            <li>Review the proposal and approve it explicitly (<code>/approve</code>).</li>
            <li>Claude generates, validates and publishes the story; GitHub Pages redeploys.</li>
            <li>Tap <strong>Refresh</strong> here once the deployment finishes.</li>
          </ol>
        </EmptyState>
      ) : (
        <section className="card section" aria-labelledby="recent-title">
          <h2 id="recent-title">Recently updated</h2>
          <ul className="list">
            {recent.map(({ entry }) => (
              <li key={entry.id} className="list__row">
                <Link to={`/stories/${entry.id}`} className="list__link">
                  <span className="list__title">{entry.title}</span>
                  <span className="muted small">#{entry.id} · {entry.partCount} part{entry.partCount === 1 ? '' : 's'} · updated {formatDate(entry.updatedAt)}</span>
                </Link>
                <StatusBadge status={entry.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
