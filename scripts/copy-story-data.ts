/**
 * Deterministically copies the published story library into the build output.
 * Only manifest.json and the files it references are copied — never pending outlines,
 * memory, fixtures or stray files. Fails the build if validation fails.
 *
 *   tsx scripts/copy-story-data.ts [--root stories] [--out dist] [--fixtures]
 */
import { copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { formatIssues, hasErrors, validateLibrary } from './lib/library';

const args = process.argv.slice(2);
const opt = (name: string, def: string) => (args.includes(name) ? args[args.indexOf(name) + 1] ?? def : def);
const root = path.resolve(opt('--root', 'stories'));
const outDir = path.resolve(opt('--out', 'dist'));
const fixtures = args.includes('--fixtures');

if (!existsSync(path.join(outDir, 'index.html'))) {
  console.error(`No build found at ${outDir}. Run vite build first.`);
  process.exit(1);
}
const report = validateLibrary(root, { production: !fixtures });
if (hasErrors(report.issues)) {
  console.error(formatIssues(report.issues));
  console.error('Refusing to copy invalid story data into the build.');
  process.exit(1);
}
const target = path.join(outDir, 'stories');
rmSync(target, { recursive: true, force: true });
for (const rel of [...new Set(report.referencedFiles)].sort()) {
  const dest = path.join(target, rel);
  mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(path.join(root, rel), dest);
}
console.log(`Copied ${report.referencedFiles.length} story data file(s) into ${path.relative(process.cwd(), target)}`);
