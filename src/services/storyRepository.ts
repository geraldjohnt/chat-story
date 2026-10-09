import { isSafeRelativePath } from '../schemas';
import type { Manifest, ManifestEntry, Part, Story } from '../types';
import { parseJsonText, parseManifest, parsePart, parseStory, type ValidationIssue } from './validation';

export class DataLoadError extends Error {
  constructor(
    message: string,
    public readonly kind: 'network' | 'not-found' | 'invalid-json' | 'schema' | 'unsafe-path',
    public readonly issues: ValidationIssue[] = [],
  ) {
    super(message);
    this.name = 'DataLoadError';
  }
}

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export interface LoadOptions {
  baseUrl: string;
  /** Changes on manual refresh to bypass intermediate caches. */
  cacheToken?: string;
  fetcher?: Fetcher;
}

async function fetchJson(rel: string, opts: LoadOptions): Promise<unknown> {
  if (!isSafeRelativePath(rel)) throw new DataLoadError(`Refusing to load unsafe path "${rel}"`, 'unsafe-path');
  const url = `${opts.baseUrl}${rel}${opts.cacheToken ? `?v=${encodeURIComponent(opts.cacheToken)}` : ''}`;
  const f = opts.fetcher ?? ((u: string, i?: RequestInit) => fetch(u, i));
  let res: Response;
  try {
    res = await f(url, { cache: 'no-cache', headers: { Accept: 'application/json' } });
  } catch (e) {
    throw new DataLoadError(`Network error while loading ${rel}: ${(e as Error).message}`, 'network');
  }
  if (res.status === 404) throw new DataLoadError(`${rel} was not found (404). If you just published, GitHub Pages may still be deploying.`, 'not-found');
  if (!res.ok) throw new DataLoadError(`Loading ${rel} failed with HTTP ${res.status}`, 'network');
  const text = await res.text();
  const parsed = parseJsonText(rel, text);
  if (!parsed.ok) throw new DataLoadError(`${rel} is not valid JSON`, 'invalid-json', parsed.issues);
  return parsed.value;
}

export async function loadManifest(opts: LoadOptions): Promise<Manifest> {
  const raw = await fetchJson('manifest.json', opts);
  const r = parseManifest('manifest.json', raw);
  if (!r.ok) throw new DataLoadError('manifest.json failed validation', 'schema', r.issues);
  return r.value;
}

export interface LoadedStory {
  entry: ManifestEntry;
  story: Story | null;
  error: DataLoadError | null;
}

export interface Library {
  manifest: Manifest;
  stories: LoadedStory[];
  loadedAt: Date;
}

export async function loadStory(entry: ManifestEntry, opts: LoadOptions): Promise<Story> {
  const raw = await fetchJson(entry.storyPath, opts);
  const r = parseStory(entry.storyPath, raw);
  if (!r.ok) throw new DataLoadError(`${entry.storyPath} failed validation`, 'schema', r.issues);
  if (r.value.id !== entry.id) throw new DataLoadError(`${entry.storyPath} has id ${r.value.id} but the manifest says ${entry.id}`, 'schema');
  return r.value;
}

/** Loads the manifest and every story.json. One broken story never breaks the whole library. */
export async function loadLibrary(opts: LoadOptions): Promise<Library> {
  const manifest = await loadManifest(opts);
  const stories = await Promise.all(
    manifest.stories.map(async (entry): Promise<LoadedStory> => {
      try {
        return { entry, story: await loadStory(entry, opts), error: null };
      } catch (e) {
        return { entry, story: null, error: e instanceof DataLoadError ? e : new DataLoadError(String(e), 'network') };
      }
    }),
  );
  return { manifest, stories, loadedAt: new Date() };
}

export async function loadPart(entry: ManifestEntry, story: Story, partNumber: number, opts: LoadOptions): Promise<{ part: Part; warnings: ValidationIssue[] }> {
  const ref = entry.parts.find((p) => p.partNumber === partNumber);
  if (!ref) throw new DataLoadError(`Part ${partNumber} is not listed in the manifest for story ${entry.id}`, 'not-found');
  const raw = await fetchJson(ref.path, opts);
  const r = parsePart(ref.path, raw, story);
  if (!r.ok) throw new DataLoadError(`${ref.path} failed validation`, 'schema', r.issues);
  if (r.value.partNumber !== partNumber) throw new DataLoadError(`${ref.path} contains part ${r.value.partNumber}, expected ${partNumber}`, 'schema');
  return { part: r.value, warnings: r.issues.filter((i) => i.severity === 'warning') };
}
