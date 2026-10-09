import { z } from 'zod';

/** Public, inspectable configuration for the casual client-side access gate. Contains no plaintext password. */
export const accessGateConfigSchema = z.looseObject({
  schemaVersion: z.literal(1),
  enabled: z.boolean(),
  algorithm: z.literal('argon2id'),
  params: z.looseObject({
    memorySize: z.number().int().min(8192).max(262144),
    iterations: z.number().int().min(1).max(10),
    parallelism: z.number().int().min(1).max(4),
    hashLength: z.number().int().min(16).max(64),
  }),
  /** Base64-encoded random salt (>= 16 bytes). */
  salt: z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/).min(22),
  /** Lowercase hex Argon2id output. */
  hash: z.string().regex(/^[0-9a-f]+$/),
  createdAt: z.string().optional(),
}).refine((c) => c.hash.length === c.params.hashLength * 2, { message: 'hash length does not match params.hashLength' });
