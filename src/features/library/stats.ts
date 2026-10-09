import type { Library, LoadedStory } from '../../services/storyRepository';

export interface LibraryStats {
  stories: number;
  parts: number;
  completed: number;
  ongoing: number;
  planned: number;
  onHold: number;
  failed: number;
}

export function computeStats(lib: Library | null): LibraryStats {
  const s: LibraryStats = { stories: 0, parts: 0, completed: 0, ongoing: 0, planned: 0, onHold: 0, failed: 0 };
  if (!lib) return s;
  for (const { entry, story } of lib.stories) {
    s.stories++;
    s.parts += entry.partCount;
    if (!story) s.failed++;
    const status = story?.status ?? entry.status;
    if (status === 'completed') s.completed++;
    else if (status === 'ongoing') s.ongoing++;
    else if (status === 'planned') s.planned++;
    else if (status === 'on-hold') s.onHold++;
  }
  return s;
}

export type SortKey = 'updated' | 'created' | 'title' | 'id-asc' | 'id-desc';

export interface LibraryFilter {
  query: string;
  genre: string;
  status: string;
  sort: SortKey;
}

export function searchText(item: LoadedStory): string {
  const { entry, story } = item;
  const parts = [entry.title, entry.synopsis ?? '', entry.genres.join(' '), entry.id];
  if (story) {
    parts.push(story.premise, story.synopsis, story.setting, story.genre, story.centralConflict, (story.tags ?? []).join(' '));
    parts.push(...story.characters.map((c) => `${c.name} ${c.role ?? ''}`));
  }
  return parts.join(' \n ').toLowerCase();
}

export function filterStories(items: LoadedStory[], f: LibraryFilter): LoadedStory[] {
  const terms = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  const out = items.filter((it) => {
    if (f.genre && !it.entry.genres.includes(f.genre)) return false;
    if (f.status && it.entry.status !== f.status) return false;
    if (terms.length) {
      const hay = searchText(it);
      return terms.every((t) => hay.includes(t));
    }
    return true;
  });
  const byId = (a: LoadedStory, b: LoadedStory) => a.entry.id.localeCompare(b.entry.id, undefined, { numeric: true });
  const by = {
    'id-asc': byId,
    'id-desc': (a: LoadedStory, b: LoadedStory) => byId(b, a),
    title: (a: LoadedStory, b: LoadedStory) => a.entry.title.localeCompare(b.entry.title),
    created: (a: LoadedStory, b: LoadedStory) => Date.parse(b.entry.createdAt) - Date.parse(a.entry.createdAt),
    updated: (a: LoadedStory, b: LoadedStory) => Date.parse(b.entry.updatedAt) - Date.parse(a.entry.updatedAt),
  }[f.sort] ?? ((a: LoadedStory, b: LoadedStory) => Date.parse(b.entry.updatedAt) - Date.parse(a.entry.updatedAt));
  return [...out].sort(by);
}

export function allGenres(items: LoadedStory[]): string[] {
  return [...new Set(items.flatMap((i) => i.entry.genres))].sort();
}
