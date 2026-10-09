import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  checkStoryConsistency, hasErrors, parseJsonText, parseManifest, parsePart, parseStory, type ValidationIssue,
} from '../../src/services/validation';
import type { Manifest, Part, Story } from '../../src/types';

export interface LibraryReport {
  root: string;
  manifest: Manifest | null;
  stories: { story: Story; parts: Part[] }[];
  issues: ValidationIssue[];
  /** Every file (relative to root) that the manifest references. */
  referencedFiles: string[];
}

function readJson(root: string, rel: string, issues: ValidationIssue[]): unknown | undefined {
  const abs = path.resolve(root, rel);
  const rootAbs = path.resolve(root);
  if (abs !== rootAbs && !abs.startsWith(rootAbs + path.sep)) {
    issues.push({ file: rel, severity: 'error', message: 'Path escapes the stories directory' });
    return undefined;
  }
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    issues.push({ file: rel, severity: 'error', message: 'Referenced file does not exist' });
    return undefined;
  }
  const parsed = parseJsonText(rel, readFileSync(abs, 'utf8'));
  issues.push(...parsed.issues);
  return parsed.ok ? parsed.value : undefined;
}

/** Validate a stories directory (manifest + every referenced file). Pure read-only. */
export function validateLibrary(root: string, opts: { production: boolean }): LibraryReport {
  const issues: ValidationIssue[] = [];
  const report: LibraryReport = { root, manifest: null, stories: [], issues, referencedFiles: [] };
  const rawManifest = readJson(root, 'manifest.json', issues);
  if (rawManifest === undefined) return report;
  const m = parseManifest('manifest.json', rawManifest, opts);
  issues.push(...m.issues);
  if (!m.ok) return report;
  report.manifest = m.value;
  report.referencedFiles.push('manifest.json');

  for (const entry of m.value.stories) {
    const rawStory = readJson(root, entry.storyPath, issues);
    report.referencedFiles.push(entry.storyPath);
    if (rawStory === undefined) continue;
    const s = parseStory(entry.storyPath, rawStory, opts);
    issues.push(...s.issues);
    if (!s.ok) continue;
    const parts: Part[] = [];
    let partsOk = true;
    for (const ref of entry.parts) {
      report.referencedFiles.push(ref.path);
      const rawPart = readJson(root, ref.path, issues);
      if (rawPart === undefined) { partsOk = false; continue; }
      const p = parsePart(ref.path, rawPart, s.value);
      issues.push(...p.issues);
      if (p.ok) parts.push(p.value); else partsOk = false;
    }
    if (partsOk) issues.push(...checkStoryConsistency(entry, s.value, parts));
    report.stories.push({ story: s.value, parts });
  }

  // Story directories on disk that the manifest does not reference (e.g. half-published work).
  const referencedDirs = new Set(m.value.stories.map((e) => e.storyPath.split('/')[0]));
  if (existsSync(root)) {
    for (const name of readdirSync(root)) {
      if (statSync(path.join(root, name)).isDirectory() && !referencedDirs.has(name)) {
        issues.push({ file: name, severity: 'warning', message: 'Directory is not referenced by manifest.json and will not be published' });
      }
    }
  }
  return report;
}

export function formatIssues(issues: ValidationIssue[]): string {
  return issues.map((i) => `${i.severity === 'error' ? '✖' : '⚠'} ${i.file}: ${i.message}`).join('\n');
}

export { hasErrors };
