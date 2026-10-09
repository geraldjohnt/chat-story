/**
 * Creates public/access-gate.json for the casual client-side access gate.
 *   npm run setup:password            # prompts twice without echo
 *   npm run setup:password -- --stdin # reads the password from stdin (for automation)
 *   npm run setup:password -- --disable
 *   --out <file> writes somewhere other than public/access-gate.json (used by tests)
 * Stores only the Argon2id hash, the random salt and parameters — never the password.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { argon2id } from 'hash-wasm';
import { accessGateConfigSchema } from '../src/schemas/accessGate';

const args = process.argv.slice(2);
const FILE = args.includes('--out') ? (args[args.indexOf('--out') + 1] ?? 'public/access-gate.json') : 'public/access-gate.json';
const PARAMS = { memorySize: 19456, iterations: 2, parallelism: 1, hashLength: 32 };

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) return reject(new Error('No interactive terminal. Use --stdin, or the generator on the dashboard Settings page.'));
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (ch: string) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          return resolve(value);
        }
        if (c === '\u0003') {
          stdin.setRawMode(false);
          process.stdout.write('\n');
          process.exit(130);
        }
        if (c === '\u007f' || c === '\b') value = value.slice(0, -1);
        else value += c;
      }
    };
    stdin.on('data', onData);
  });
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
}

async function main() {
  if (args.includes('--disable')) {
    if (!existsSync(FILE)) return console.log('Access gate is not configured; nothing to disable.');
    const cfg = accessGateConfigSchema.parse(JSON.parse(readFileSync(FILE, 'utf8')));
    writeFileSync(FILE, JSON.stringify({ ...cfg, enabled: false }, null, 2) + '\n');
    return console.log(`Disabled the access gate in ${FILE}. Commit and push to apply.`);
  }
  let password: string;
  if (args.includes('--stdin')) {
    password = await readStdin();
  } else {
    password = await promptHidden('New access password: ');
    const again = await promptHidden('Repeat password: ');
    if (password !== again) throw new Error('Passwords do not match.');
  }
  if (password.length < 8) throw new Error('Use at least 8 characters.');
  const salt = randomBytes(16).toString('base64');
  const hash = await argon2id({ password: password.normalize('NFC'), salt: Buffer.from(salt, 'base64'), ...PARAMS, outputType: 'hex' });
  const config = accessGateConfigSchema.parse({ schemaVersion: 1, enabled: true, algorithm: 'argon2id', params: PARAMS, salt, hash, createdAt: new Date().toISOString() });
  writeFileSync(FILE, JSON.stringify(config, null, 2) + '\n');
  console.log(`Wrote ${FILE} (Argon2id hash + salt only; the password was not stored).`);
  console.log('Commit and push it to enable the gate. Remember: this is a casual deterrent, not confidentiality.');
}

main().catch((e: Error) => {
  console.error(`setup:password failed: ${e.message}`);
  process.exit(1);
});
