import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorPanel, Loading, PageHeader, StatusBadge, formatDate } from '../components/ui';
import { useLibrary } from '../features/library/LibraryContext';
import { allGenres, filterStories, type SortKey } from '../features/library/stats';
import { STORY_STATUSES } from '../schemas';

export function LibraryPage() {
  const { status, library, error, refresh } = useLibrary();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const genre = params.get('genre') ?? '';
  const statusFilter = params.get('status') ?? '';
  const sort = (params.get('sort') as SortKey) || 'updated';
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };
  const items = useMemo(() => library?.stories ?? [], [library]);
  const genres = useMemo(() => allGenres(items), [items]);
  const results = useMemo(() => filterStories(items, { query, genre, status: statusFilter, sort }), [items, query, genre, statusFilter, sort]);

  if (status === 'loading') return <Loading label="Loading story library…" />;
  if (status === 'error' || !library) return <ErrorPanel title="The story library could not be loaded" error={error ?? 'Unknown error'} onRetry={() => void refresh()} />;

  return (
    <>
      <PageHeader title="Story library" subtitle={`${items.length} published stor${items.length === 1 ? 'y' : 'ies'}`} />
      <form className="filters card" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="field field--grow">
          <span>Search</span>
          <input type="search" placeholder="Title, premise, characters, setting…" value={query} onChange={(e) => set('q', e.target.value)} />
        </label>
        <label className="field">
          <span>Genre</span>
          <select value={genre} onChange={(e) => set('genre', e.target.value)}>
            <option value="">All genres</option>
            {genres.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select value={statusFilter} onChange={(e) => set('status', e.target.value)}>
            <option value="">All statuses</option>
            {STORY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Sort by</span>
          <select value={sort} onChange={(e) => set('sort', e.target.value)}>
            <option value="updated">Recently updated</option>
            <option value="created">Newest first</option>
            <option value="title">Title (A–Z)</option>
            <option value="id-asc">Story number (low → high)</option>
            <option value="id-desc">Story number (high → low)</option>
          </select>
        </label>
      </form>
      {items.length === 0 ? (
        <EmptyState title="No published stories yet">
          <p>Approved stories will appear here after they are published to GitHub.</p>
        </EmptyState>
      ) : results.length === 0 ? (
        <EmptyState title="No matching stories" icon="🔍"><p>Try a different search or clear the filters.</p></EmptyState>
      ) : (
        <ul className="story-grid" aria-label="Stories">
          {results.map(({ entry, story, error: err }) => (
            <li key={entry.id} className="story-card card">
              <div className="story-card__top">
                <span className="muted small">#{entry.id}</span>
                <StatusBadge status={entry.status} />
              </div>
              <h2 className="story-card__title"><Link to={`/stories/${entry.id}`}>{entry.title}</Link></h2>
              <p className="story-card__synopsis">{story?.synopsis || entry.synopsis || 'No synopsis.'}</p>
              {err && <p className="warn-text small">This story's metadata failed to load: {err.message}</p>}
              <div className="story-card__meta muted small">
                <span>{entry.genres.join(', ')}</span>
                <span>{entry.partCount} part{entry.partCount === 1 ? '' : 's'}</span>
                <span>Updated {formatDate(entry.updatedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
