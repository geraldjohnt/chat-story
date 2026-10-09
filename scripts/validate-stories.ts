/**
 * Validates the story library: manifest, story.json files, part files, cross references and counts.
 *   npm run validate:stories                 # production library in ./stories
 *   npm run validate:stories -- --root tests/fixtures/stories --fixtures
 */
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { formatIssues, hasErrors, validateLibrary } from './lib/library';

const args = process.argv.slice(2);
const rootArg = args.includes('--root') ? args[args.indexOf('--root') + 1] : 'stories';
const fixtures = args.includes('--fixtures');
const root = path.resolve(rootArg ?? 'stories');

const report = validateLibrary(root, { production: !fixtures });

// The memory index must not reference IDs that have no story, nor miss published ones.
if (!fixtures && existsSync('memory/story-index.json') && report.manifest) {
  try {
    const index = JSON.parse(readFileSync('memory/story-index.json', 'utf8')) as { stories?: { id: string; status?: string }[] };
    const indexIds = new Set((index.stories ?? []).map((s) => s.id));
    for (const s of report.manifest.stories) {
      if (!indexIds.has(s.id)) report.issues.push({ file: 'memory/story-index.json', severity: 'warning', message: `published story ${s.id} is missing from the memory index` });
    }
  } catch (e) {
    report.issues.push({ file: 'memory/story-index.json', severity: 'error', message: `invalid JSON: ${(e as Error).message}` });
  }
}

const storyCount = report.manifest?.stories.length ?? 0;
const partCount = report.stories.reduce((n, s) => n + s.parts.length, 0);
if (report.issues.length) console.log(formatIssues(report.issues));
if (hasErrors(report.issues)) {
  console.error(`\nStory validation FAILED for ${path.relative(process.cwd(), root) || '.'}`);
  process.exit(1);
}
console.log(`Story validation passed: ${storyCount} stor${storyCount === 1 ? 'y' : 'ies'}, ${partCount} part${partCount === 1 ? '' : 's'} (${fixtures ? 'fixtures' : 'production'})`);
