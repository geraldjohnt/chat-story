/**
 * Verifies a built artifact before it is deployed:
 *  - index.html, manifest and every referenced story file exist
 *  - manifest is a production manifest (no fixtures)
 *  - no pending outlines, memory files, fixtures, env files or rendered PNG/ZIP outputs
 *  - no obvious secrets
 *   tsx scripts/verify-dist.ts [--dir dist] [--fixtures]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { formatIssues, hasErrors, validateLibrary } from './lib/library';

const args = process.argv.slice(2);
const dir = path.resolve(args.includes('--dir') ? args[args.indexOf('--dir') + 1] ?? 'dist' : 'dist');
const fixtures = args.includes('--fixtures');
const problems: string[] = [];

function walk(d: string): string[] {
  return readdirSync(d).flatMap((n) => {
    const p = path.join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

let files: string[] = [];
try { files = walk(dir).map((f) => path.relative(dir, f).split(path.sep).join('/')); } catch { problems.push(`missing build directory ${dir}`); }

if (!files.includes('index.html')) problems.push('index.html is missing');
if (!files.includes('stories/manifest.json')) problems.push('stories/manifest.json is missing');

const report = validateLibrary(path.join(dir, 'stories'), { production: !fixtures });
if (hasErrors(report.issues)) problems.push('published story data is invalid:\n' + formatIssues(report.issues));
const allowed = new Set(report.referencedFiles.map((f) => `stories/${f}`));
for (const f of files.filter((f) => f.startsWith('stories/'))) {
  if (!allowed.has(f)) problems.push(`unexpected file in published stories: ${f}`);
}

const forbidden = [/pending-outlines/i, /(^|\/)memory\//, /fixtures?\//i, /(^|\/)\.env/, /\.(png|zip)$/i, /CLAUDE\.md$/, /\.map$/];
for (const f of files) if (forbidden.some((r) => r.test(f))) problems.push(`forbidden file in artifact: ${f}`);

const secretPatterns = [/ghp_[A-Za-z0-9]{20,}/, /github_pat_[A-Za-z0-9_]{20,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /AKIA[0-9A-Z]{16}/, /sk-ant-[A-Za-z0-9-]{10,}/];
for (const f of files.filter((f) => /\.(js|html|json|css|txt)$/.test(f))) {
  const text = readFileSync(path.join(dir, f), 'utf8');
  if (secretPatterns.some((r) => r.test(text))) problems.push(`possible secret in ${f}`);
  if (!fixtures && /"fixture"\s*:\s*true|"environment"\s*:\s*"fixture"/.test(text)) problems.push(`fixture data found in ${f}`);
}

if (problems.length) {
  console.error('Artifact verification FAILED:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log(`Artifact verification passed: ${files.length} files, ${report.manifest?.stories.length ?? 0} published stories (${dir}).`);
