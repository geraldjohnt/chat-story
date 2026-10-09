/**
 * Guards approved story parts. Lists existing part files that were modified or deleted compared
 * with a base ref (default: HEAD, i.e. uncommitted + staged changes). Exits non-zero unless
 * --allow is passed, which must only be used after the user explicitly authorised revisions.
 *   npm run check:parts
 *   npm run check:parts -- --base origin/main
 *   npm run check:parts -- --allow
 */
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] ?? 'HEAD' : 'HEAD';
let out = '';
try {
  out = execFileSync('git', ['diff', '--name-status', base, '--', 'stories/'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
} catch {
  console.log(`Could not diff against ${base} (no commits yet?). Nothing to check.`);
  process.exit(0);
}
const changed = out
  .split('\n')
  .filter(Boolean)
  .map((l) => l.split('\t'))
  .filter(([status, file]) => /^[MDR]/.test(status ?? '') && /\/part-\d+\.json$/.test(file ?? ''));
if (!changed.length) {
  console.log('No existing story parts were modified or deleted.');
  process.exit(0);
}
console.log('Existing story parts changed:');
for (const [s, f] of changed) console.log(`  ${s}\t${f}`);
if (args.includes('--allow')) {
  console.log('Allowed with --allow (explicit user authorisation required).');
  process.exit(0);
}
console.error('Approved parts must not be rewritten or deleted without explicit authorisation. Re-run with --allow only if the user approved these revisions.');
process.exit(1);
