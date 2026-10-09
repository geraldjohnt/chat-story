import { Link, useParams } from 'react-router-dom';
import { EmptyState, ErrorPanel, Loading, PageHeader, StatusBadge, formatDate } from '../components/ui';
import { useStoryEntry } from '../hooks/useStoryEntry';

export function StoryPage() {
  const { storyId } = useParams();
  const { status, item, error, refresh } = useStoryEntry(storyId);
  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorPanel title="The story library could not be loaded" error={error ?? 'Unknown error'} onRetry={() => void refresh()} />;
  if (!item) return <EmptyState title="Story not found" icon="🔍"><p>No published story has ID “{storyId}”. <Link to="/library">Back to the library</Link>.</p></EmptyState>;
  const { entry, story } = item;
  if (!story) return <ErrorPanel title={`Story ${entry.id} could not be loaded`} error={item.error ?? 'Unknown error'} onRetry={() => void refresh()} />;
  const chars = new Map(story.characters.map((c) => [c.id, c.name]));
  const name = (id: string) => chars.get(id) ?? id;
  const summary = (n: number) => story.partSummaries.find((s) => s.partNumber === n);

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/library">Library</Link> <span aria-hidden="true">›</span> <span>{story.title}</span></nav>
      <PageHeader
        eyebrow={<>#{story.id} · {story.genre} · {story.setting}</>}
        title={story.title}
        subtitle={<><StatusBadge status={story.status} /> {entry.partCount} of {story.plannedPartCount || entry.partCount} planned parts · updated {formatDate(story.updatedAt)}</>}
        actions={entry.parts.length > 0 && <Link className="btn btn--primary" to={`/stories/${entry.id}/parts/1`}>Read part 1</Link>}
      />
      <div className="overview">
        <section className="card section" aria-labelledby="synopsis">
          <h2 id="synopsis">Synopsis</h2>
          <p>{story.synopsis || story.premise}</p>
          {story.centralConflict && (<><h3>Central conflict</h3><p>{story.centralConflict}</p></>)}
        </section>
        <section className="card section" aria-labelledby="parts">
          <h2 id="parts">Parts</h2>
          {entry.parts.length === 0 ? <p className="muted">No parts have been published yet.</p> : (
            <ol className="part-list">
              {entry.parts.map((p) => {
                const s = summary(p.partNumber);
                return (
                  <li key={p.partNumber}>
                    <Link to={`/stories/${entry.id}/parts/${p.partNumber}`} className="part-list__link">
                      <span className="part-list__num">Part {p.partNumber}</span>
                      <span className="part-list__title">{s?.title ?? p.title ?? `Part ${p.partNumber}`}</span>
                      {s?.summary && <span className="muted small">{s.summary}</span>}
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
        <section className="card section" aria-labelledby="characters">
          <h2 id="characters">Characters</h2>
          <ul className="people">
            {story.characters.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong>{c.role && <span className="muted"> — {c.role}</span>}
                {c.description && <p className="small">{c.description}</p>}
              </li>
            ))}
          </ul>
          {story.relationships.length > 0 && (
            <>
              <h3>Relationships</h3>
              <ul className="small">
                {story.relationships.map((r, i) => <li key={i}><strong>{name(r.from)}</strong> → <strong>{name(r.to)}</strong>: {r.type}{r.description && ` — ${r.description}`}</li>)}
              </ul>
            </>
          )}
        </section>
        {story.plotOutline.length > 0 && (
          <section className="card section" aria-labelledby="arc">
            <h2 id="arc">Story arc</h2>
            <ol className="small">
              {story.plotOutline.map((o) => <li key={o.partNumber}><strong>{o.title}</strong>{o.beats.length > 0 && <> — {o.beats.join(' ')}</>}</li>)}
            </ol>
          </section>
        )}
        {(story.secrets.length > 0 || story.unresolvedThreads.length > 0) && (
          <section className="card section" aria-labelledby="threads">
            <h2 id="threads">Secrets & open threads</h2>
            <details>
              <summary>Show spoilers</summary>
              {story.secrets.length > 0 && <ul className="small">{story.secrets.map((s) => <li key={s.id}><strong>{name(s.holder)}:</strong> {s.description}{s.revealedInPart ? ` (revealed in part ${s.revealedInPart})` : ''}</li>)}</ul>}
              {story.unresolvedThreads.length > 0 && <ul className="small">{story.unresolvedThreads.map((t) => <li key={t.id}>{t.description} {t.resolvedInPart ? <span className="muted">(resolved in part {t.resolvedInPart})</span> : <span className="muted">(open)</span>}</li>)}</ul>}
            </details>
          </section>
        )}
      </div>
    </>
  );
}
