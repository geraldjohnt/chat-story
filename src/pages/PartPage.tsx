import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { EmptyState, ErrorPanel, Loading, PageHeader, StatusBadge } from '../components/ui';
import { ScaledScreenshot } from '../features/preview/ScaledScreenshot';
import { ScreenshotViewer } from '../features/preview/ScreenshotViewer';
import { useFontsReady } from '../hooks/useFontsReady';
import { useStoryEntry } from '../hooks/useStoryEntry';
import { getMeasurer } from '../renderers/measure';
import { EXPORT_PROFILES } from '../renderers/profiles';
import { buildPages, characterMap, type RenderedPage } from '../renderers/registry';
import { screenshotFilename, zipFilename } from '../services/exportNames';
import { DataLoadError, loadPart } from '../services/storyRepository';
import type { ExportProfileId, Part, ScreenshotTheme } from '../types';

type Status = { kind: 'idle' } | { kind: 'busy'; label: string } | { kind: 'ok'; label: string } | { kind: 'error'; label: string };

export function PartPage() {
  const { storyId, partNumber: pn } = useParams();
  const partNumber = Number(pn);
  const { status, item, error, refresh, baseUrl, cacheToken, fetcher } = useStoryEntry(storyId);
  const [part, setPart] = useState<Part | null>(null);
  const [partError, setPartError] = useState<DataLoadError | null>(null);
  const [reload, setReload] = useState(0);
  const [theme, setTheme] = useState<'' | ScreenshotTheme>('');
  const [profile, setProfile] = useState<'' | ExportProfileId>('');
  const [selected, setSelected] = useState<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  /** Set when the viewer moved here from a neighbouring part: open at its first or last screenshot. */
  const openAt = (location.state as { viewer?: 'first' | 'last' } | null)?.viewer;
  const [viewedPart, setViewedPart] = useState(partNumber);
  const [exportStatus, setExportStatus] = useState<Status>({ kind: 'idle' });
  const fonts = useFontsReady();

  const entry = item?.entry;
  const story = item?.story;

  useEffect(() => {
    if (!entry || !story || !Number.isInteger(partNumber)) return;
    let alive = true;
    setPart(null);
    setPartError(null);
    loadPart(entry, story, partNumber, { baseUrl, cacheToken, fetcher }).then(
      (r) => alive && setPart(r.part),
      (e: unknown) => alive && setPartError(e instanceof DataLoadError ? e : new DataLoadError(String(e), 'network')),
    );
    return () => {
      alive = false;
    };
  }, [entry, story, partNumber, baseUrl, cacheToken, fetcher, reload]);

  // Leaving the part normally closes the viewer; moving via the viewer keeps it open (no flash, stays fullscreen).
  if (viewedPart !== partNumber) {
    setViewedPart(partNumber);
    if (!openAt) setSelected(null);
  }

  const characters = useMemo(() => characterMap(story?.characters ?? []), [story]);
  const pages = useMemo(
    () => (part && fonts.ready ? buildPages(part, getMeasurer(), { theme: theme || undefined, profile: profile || undefined }) : []),
    [part, fonts.ready, theme, profile],
  );

  const partReady = part?.partNumber === partNumber && pages.length > 0;
  useEffect(() => {
    if (!openAt || !partReady) return;
    setSelected(openAt === 'last' ? pages.length - 1 : 0);
    void navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
  }, [openAt, partReady, pages.length, navigate, location.pathname, location.search]);

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorPanel title="The story library could not be loaded" error={error ?? 'Unknown error'} onRetry={() => void refresh()} />;
  if (!entry) return <EmptyState title="Story not found" icon="🔍"><p><Link to="/library">Back to the library</Link></p></EmptyState>;
  if (!story) return <ErrorPanel title={`Story ${entry.id} could not be loaded`} error={item?.error ?? 'Unknown error'} onRetry={() => void refresh()} />;
  const ref = entry.parts.find((p) => p.partNumber === partNumber);
  if (!ref) return <EmptyState title="Part not found" icon="🔍"><p>This story has no part {pn}. <Link to={`/stories/${entry.id}`}>Back to the story</Link>.</p></EmptyState>;

  const prev = entry.parts.find((p) => p.partNumber === partNumber - 1);
  const next = entry.parts.find((p) => p.partNumber === partNumber + 1);

  const doPng = async (page: RenderedPage) => {
    setExportStatus({ kind: 'busy', label: `Rendering ${screenshotFilename(entry.id, partNumber, page.index)}…` });
    try {
      const { exportPagePng } = await import('../services/exporter');
      const name = await exportPagePng(entry.id, partNumber, page, characters);
      setExportStatus({ kind: 'ok', label: `Downloaded ${name} (${page.profile.pixelWidth} × ${page.profile.pixelHeight}).` });
    } catch (e) {
      setExportStatus({ kind: 'error', label: `PNG export failed: ${(e as Error).message}` });
    }
  };
  const doZip = async () => {
    setExportStatus({ kind: 'busy', label: 'Preparing ZIP…' });
    try {
      const { exportPartZip } = await import('../services/exporter');
      const r = await exportPartZip(entry.id, partNumber, pages, characters, (d, t) => setExportStatus({ kind: 'busy', label: `Rendering screenshot ${Math.min(d + 1, t)} of ${t}…` }));
      setExportStatus({ kind: 'ok', label: `Downloaded ${r.filename} with ${r.count} screenshot${r.count === 1 ? '' : 's'}.` });
    } catch (e) {
      setExportStatus({ kind: 'error', label: `ZIP export failed: ${(e as Error).message}` });
    }
  };
  const busy = exportStatus.kind === 'busy';

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/library">Library</Link> <span aria-hidden="true">›</span> <Link to={`/stories/${entry.id}`}>{story.title}</Link> <span aria-hidden="true">›</span> <span>Part {partNumber}</span>
      </nav>
      <PageHeader
        eyebrow={<>Part {partNumber} of {entry.partCount}{story.plannedPartCount > entry.partCount ? ` (${story.plannedPartCount} planned)` : ''}</>}
        title={part?.title ?? ref.title ?? `Part ${partNumber}`}
        subtitle={part && <><StatusBadge status={part.status} /> {part.summary}</>}
      />
      <div className="progress" aria-label={`Story progress: part ${partNumber} of ${entry.partCount}`}>
        <div className="progress__bar" style={{ width: `${(partNumber / Math.max(entry.partCount, 1)) * 100}%` }} />
      </div>

      <section className="toolbar card" aria-label="Preview and export">
        <label className="field">
          <span>Screenshot theme</span>
          <select value={theme} onChange={(e) => setTheme(e.target.value as ScreenshotTheme | '')}>
            <option value="">As authored</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className="field">
          <span>Export profile</span>
          <select value={profile} onChange={(e) => setProfile(e.target.value as ExportProfileId | '')}>
            <option value="">As authored</option>
            {Object.values(EXPORT_PROFILES).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <div className="toolbar__actions">
          <button className="btn btn--primary" onClick={() => void doZip()} disabled={busy || pages.length === 0}>
            Export part as ZIP
          </button>
        </div>
        <p className="muted small toolbar__note">Theme and profile changes only affect this preview and export; story files are never modified. {pages.length > 0 && `ZIP: ${zipFilename(entry.id, partNumber)} · ${pages.length} PNG${pages.length === 1 ? '' : 's'}`}</p>
        {exportStatus.kind !== 'idle' && (
          <p className={`export-status export-status--${exportStatus.kind}`} role={exportStatus.kind === 'error' ? 'alert' : 'status'} aria-live="polite">{exportStatus.label}</p>
        )}
      </section>

      {partError ? (
        <ErrorPanel title={`Part ${partNumber} could not be loaded`} error={partError} onRetry={() => setReload((n) => n + 1)} />
      ) : !part || !fonts.ready ? (
        <Loading label="Loading screenshots…" />
      ) : (
        <>
          {fonts.error && <p className="warn-text">Screenshot font did not load ({fonts.error}); previews may differ from exports.</p>}
          <ol className="gallery" aria-label="Screenshots">
            {pages.map((page) => (
              <li key={page.key} className="gallery__item card">
                <button className="gallery__preview" onClick={() => setSelected(pages.indexOf(page))} aria-label={`Open screenshot ${page.index} preview`}>
                  <ScaledScreenshot page={page} characters={characters} />
                </button>
                <div className="gallery__meta">
                  <span className="small"><strong>#{page.index}</strong> · {page.shot.type}{page.pages > 1 ? ` · ${page.screenshotId} (${page.page}/${page.pages})` : ` · ${page.screenshotId}`}</span>
                  <button className="btn btn--small" onClick={() => void doPng(page)} disabled={busy} aria-label={`Export screenshot ${page.index} as PNG`}>PNG</button>
                </div>
              </li>
            ))}
          </ol>
          {part.cliffhanger && <p className="cliffhanger card"><strong>Cliffhanger:</strong> {part.cliffhanger}</p>}
        </>
      )}

      <nav className="pager" aria-label="Part navigation">
        {prev ? <Link className="btn" to={`/stories/${entry.id}/parts/${prev.partNumber}`}>← Part {prev.partNumber}</Link> : <span />}
        <Link className="btn btn--ghost" to={`/stories/${entry.id}`}>All parts</Link>
        {next ? <Link className="btn" to={`/stories/${entry.id}/parts/${next.partNumber}`}>Part {next.partNumber} →</Link> : <span />}
      </nav>

      {selected !== null && (
        <ScreenshotViewer
          pages={partReady && !openAt ? pages : []}
          index={selected}
          characters={characters}
          onIndexChange={setSelected}
          onClose={() => setSelected(null)}
          onExport={(page) => void doPng(page)}
          busy={busy}
          status={exportStatus.kind === 'idle' ? undefined : exportStatus}
          partNumber={partNumber}
          prevPart={prev && { partNumber: prev.partNumber, onGo: () => void navigate(`/stories/${entry.id}/parts/${prev.partNumber}`, { state: { viewer: 'last' } }) }}
          nextPart={next && { partNumber: next.partNumber, onGo: () => void navigate(`/stories/${entry.id}/parts/${next.partNumber}`, { state: { viewer: 'first' } }) }}
        />
      )}
    </>
  );
}
