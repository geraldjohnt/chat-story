import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { accessGateConfigSchema } from '../../src/schemas';
import { verifyPassword } from '../../src/services/accessGate';

describe('npm run setup:password', () => {
  it('writes a config the browser verifier accepts, without the plaintext password', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'cds-gate-'));
    const out = path.join(dir, 'access-gate.json');
    try {
      execFileSync('npx', ['tsx', 'scripts/setup-password.ts', '--stdin', '--out', out], { input: 'cli-password-42\n', stdio: ['pipe', 'ignore', 'pipe'] });
      const text = readFileSync(out, 'utf8');
      expect(text).not.toContain('cli-password-42');
      const cfg = accessGateConfigSchema.parse(JSON.parse(text));
      expect(await verifyPassword('cli-password-42', cfg)).toBe(true);
      expect(await verifyPassword('cli-password-43', cfg)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);
});
