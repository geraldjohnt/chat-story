import { argon2id } from 'hash-wasm';
import { accessGateConfigSchema } from '../schemas';
import type { AccessGateConfig } from '../types';
import { assetUrl } from './dataSource';

/**
 * Casual client-side access gate. NOT a security boundary: the config, the verification code and
 * every published JSON file are downloadable by anyone who knows the URL.
 */
export const DEFAULT_ARGON2_PARAMS = { memorySize: 19456, iterations: 2, parallelism: 1, hashLength: 32 } as const;
const SESSION_KEY = 'cds.gate.unlocked';

export type GateState =
  | { status: 'disabled'; reason: 'not-configured' | 'turned-off' }
  | { status: 'invalid'; message: string }
  | { status: 'enabled'; config: AccessGateConfig };

export async function loadGateConfig(fetcher: typeof fetch = fetch): Promise<GateState> {
  let res: Response;
  try {
    res = await fetcher(assetUrl('access-gate.json'), { cache: 'no-cache' });
  } catch {
    return { status: 'invalid', message: 'Could not load access-gate.json (network error).' };
  }
  if (res.status === 404) return { status: 'disabled', reason: 'not-configured' };
  if (!res.ok) return { status: 'invalid', message: `access-gate.json returned HTTP ${res.status}` };
  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    return { status: 'invalid', message: 'access-gate.json is not valid JSON' };
  }
  const r = accessGateConfigSchema.safeParse(raw);
  if (!r.success) return { status: 'invalid', message: 'access-gate.json does not match the expected format' };
  return r.data.enabled ? { status: 'enabled', config: r.data } : { status: 'disabled', reason: 'turned-off' };
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function deriveHash(password: string, saltB64: string, params: AccessGateConfig['params']): Promise<string> {
  return argon2id({
    password: password.normalize('NFC'),
    salt: base64ToBytes(saltB64),
    parallelism: params.parallelism,
    iterations: params.iterations,
    memorySize: params.memorySize,
    hashLength: params.hashLength,
    outputType: 'hex',
  });
}

export async function verifyPassword(password: string, config: AccessGateConfig): Promise<boolean> {
  if (!password) return false;
  return constantTimeEqual(await deriveHash(password, config.salt, config.params), config.hash);
}

/** Generates a config from a password entirely in the browser (used by the Settings helper). */
export async function createGateConfig(password: string, getRandom: (a: Uint8Array) => Uint8Array = (a) => crypto.getRandomValues(a)): Promise<AccessGateConfig> {
  if (password.length < 8) throw new Error('Use at least 8 characters.');
  const salt = bytesToBase64(getRandom(new Uint8Array(16)));
  const params = { ...DEFAULT_ARGON2_PARAMS };
  const hash = await deriveHash(password, salt, params);
  return accessGateConfigSchema.parse({ schemaVersion: 1, enabled: true, algorithm: 'argon2id', params, salt, hash, createdAt: new Date().toISOString() });
}

/** Unlock state lives in sessionStorage only as a UI convenience — it is not a credential. */
export function isUnlocked(config: AccessGateConfig): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === config.hash.slice(0, 16);
  } catch {
    return false;
  }
}

export function markUnlocked(config: AccessGateConfig): void {
  try {
    sessionStorage.setItem(SESSION_KEY, config.hash.slice(0, 16));
  } catch {
    /* storage unavailable: user will be asked again next load */
  }
}

export function lock(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
