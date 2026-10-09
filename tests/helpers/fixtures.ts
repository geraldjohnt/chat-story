import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Part, Story } from '../../src/types';

export const FIXTURE_ROOT = path.resolve('tests/fixtures/stories');
export const readFixture = <T = unknown>(rel: string): T => JSON.parse(readFileSync(path.join(FIXTURE_ROOT, rel), 'utf8')) as T;
export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const story1 = () => readFixture<Story>('9001-fixture-renderer-coverage/story.json');
export const part1 = () => readFixture<Part>('9001-fixture-renderer-coverage/part-1.json');
export const part2 = () => readFixture<Part>('9001-fixture-renderer-coverage/part-2.json');

/** fetch() stand-in that serves files from a directory (or overrides) under a fake base URL. */
export function fileFetcher(root: string, overrides: Record<string, string | number> = {}) {
  const calls: string[] = [];
  const fn = async (url: string): Promise<Response> => {
    calls.push(url);
    const rel = url.replace(/^\/stories\//, '').replace(/\?.*$/, '');
    if (rel in overrides) {
      const o = overrides[rel]!;
      return typeof o === 'number' ? new Response('', { status: o }) : new Response(o, { status: 200 });
    }
    try {
      return new Response(readFileSync(path.join(root, rel), 'utf8'), { status: 200 });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  };
  return Object.assign(fn, { calls });
}
