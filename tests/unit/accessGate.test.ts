import { describe, expect, it } from 'vitest';
import { accessGateConfigSchema } from '../../src/schemas';
import { createGateConfig, verifyPassword } from '../../src/services/accessGate';

describe('access gate hashing', () => {
  it('creates an Argon2id config without the plaintext password and verifies it', async () => {
    const cfg = await createGateConfig('correct horse battery');
    expect(accessGateConfigSchema.safeParse(cfg).success).toBe(true);
    expect(cfg.algorithm).toBe('argon2id');
    expect(JSON.stringify(cfg)).not.toContain('correct horse battery');
    expect(await verifyPassword('correct horse battery', cfg)).toBe(true);
    expect(await verifyPassword('wrong password!', cfg)).toBe(false);
    expect(await verifyPassword('', cfg)).toBe(false);
  });
  it('uses a random salt each time', async () => {
    const a = await createGateConfig('same-password');
    const b = await createGateConfig('same-password');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
  it('rejects short passwords and malformed configs', async () => {
    await expect(createGateConfig('short')).rejects.toThrow(/8 characters/);
    expect(accessGateConfigSchema.safeParse({ schemaVersion: 1, enabled: true, algorithm: 'md5' }).success).toBe(false);
  });
});
