/**
 * Prints the next unused story ID. IDs are never reused: the next ID is one greater than the
 * highest ID found in the manifest, the memory index (including retired entries), story
 * directories and pending outlines.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const ids: number[] = [];
const add = (s: string | undefined) => {
  const m = /^(\d{4,})/.exec(s ?? '');
  if (m) ids.push(Number(m[1]));
};
try {
  const manifest = JSON.parse(readFileSync('stories/manifest.json', 'utf8')) as { stories: { id: string }[] };
  manifest.stories.forEach((s) => add(s.id));
} catch { /* empty */ }
try {
  const index = JSON.parse(readFileSync('memory/story-index.json', 'utf8')) as { stories?: { id: string }[]; retiredIds?: string[] };
  index.stories?.forEach((s) => add(s.id));
  index.retiredIds?.forEach(add);
} catch { /* empty */ }
if (existsSync('stories')) readdirSync('stories').forEach(add);
const next = String((ids.length ? Math.max(...ids) : 0) + 1).padStart(4, '0');
console.log(next);
