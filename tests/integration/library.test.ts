import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateLibrary } from '../../scripts/lib/library';
import { FIXTURE_ROOT } from '../helpers/fixtures';

const dirs: string[] = [];
function copyFixtures(): string {
  const d = mkdtempSync(path.join(tmpdir(), 'cds-'));
  dirs.push(d);
  cpSync(FIXTURE_ROOT, d, { recursive: true });
  return d;
}
const edit = (file: string, fn: (j: Record<string, unknown>) => void) => {
  const j = JSON.parse(readFileSync(file, 'utf8'));
  fn(j);
  writeFileSync(file, JSON.stringify(j));
};
const errors = (root: string, production = false) => validateLibrary(root, { production }).issues.filter((i) => i.severity === 'error').map((i) => `${i.file}: ${i.message}`).join('\n');
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

describe('validateLibrary (filesystem)', () => {
  it('validates the fixture library and lists referenced files', () => {
    const r = validateLibrary(FIXTURE_ROOT, { production: false });
    expect(r.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(r.referencedFiles).toHaveLength(6);
  });

  it('validates the production library', () => {
    const r = validateLibrary(path.resolve('stories'), { production: true });
    expect(r.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(r.manifest?.environment).toBe('production');
    expect(r.stories).toHaveLength(r.manifest?.stories.length ?? -1);
  });

  it('rejects fixtures when validated as production', () => {
    expect(errors(FIXTURE_ROOT, true)).toMatch(/fixtures must never be published/);
  });

  it('reports missing part files', () => {
    const d = copyFixtures();
    rmSync(path.join(d, '9001-fixture-renderer-coverage/part-2.json'));
    expect(errors(d)).toMatch(/part-2.json: Referenced file does not exist/);
  });

  it('reports invalid JSON in a part file', () => {
    const d = copyFixtures();
    writeFileSync(path.join(d, '9001-fixture-renderer-coverage/part-1.json'), '{ not json');
    expect(errors(d)).toMatch(/part-1.json: Invalid JSON/);
  });

  it('reports a missing manifest', () => {
    const d = copyFixtures();
    rmSync(path.join(d, 'manifest.json'));
    expect(errors(d)).toMatch(/manifest.json: Referenced file does not exist/);
  });

  it('rejects traversal paths in the manifest', () => {
    const d = copyFixtures();
    edit(path.join(d, 'manifest.json'), (m) => {
      (m.stories as { storyPath: string }[])[0]!.storyPath = '../outside/story.json';
    });
    expect(errors(d)).toMatch(/safe relative path/);
  });

  it('detects part-number and storyId mismatches inside part files', () => {
    const d = copyFixtures();
    edit(path.join(d, '9001-fixture-renderer-coverage/part-2.json'), (p) => {
      p.partNumber = 1;
      p.storyId = '9002';
    });
    const e = errors(d);
    expect(e).toMatch(/storyId "9002" does not match story "9001"/);
  });

  it('warns about story directories missing from the manifest', () => {
    const d = copyFixtures();
    cpSync(path.join(d, '9002-fixture-completed-sample'), path.join(d, '9003-orphan'), { recursive: true });
    const w = validateLibrary(d, { production: false }).issues.filter((i) => i.severity === 'warning');
    expect(w.map((i) => i.file)).toContain('9003-orphan');
  });
});
