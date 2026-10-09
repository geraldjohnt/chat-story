/**
 * Where the dashboard loads story data from. Production always uses `<base>/stories/`.
 * In `vite dev` only, VITE_STORIES_PATH may point at development fixtures
 * (e.g. tests/fixtures/stories/) — it is ignored in production builds.
 */
export function storiesBaseUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  const devOverride = import.meta.env.DEV ? (import.meta.env.VITE_STORIES_PATH as string | undefined) : undefined;
  const rel = (devOverride ?? 'stories/').replace(/^\/+/, '');
  return `${base}${rel.endsWith('/') ? rel : rel + '/'}`;
}

export function assetUrl(rel: string): string {
  return `${import.meta.env.BASE_URL || '/'}${rel.replace(/^\/+/, '')}`;
}
