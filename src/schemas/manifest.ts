import { z } from 'zod';
import { isoDateTimeSchema, slugSchema, storyIdSchema, nonEmpty } from './common';
import { STORY_STATUSES } from './story';

/**
 * Relative POSIX path inside the stories directory. Rejects absolute paths, URLs,
 * backslashes, empty segments and any "." / ".." segment.
 */
export const safeRelativePathSchema = z
  .string()
  .min(1)
  .refine((p) => isSafeRelativePath(p), { message: 'Path must be a safe relative path (no "..", absolute paths, URLs or backslashes)' });

export function isSafeRelativePath(p: string): boolean {
  if (!p || p.length > 300) return false;
  if (p.startsWith('/') || p.includes('\\') || p.includes('\0')) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(p)) return false; // URL scheme or drive letter
  if (p.includes('%')) return false; // no encoded traversal tricks
  const segments = p.split('/');
  return segments.every((s) => s !== '' && s !== '.' && s !== '..' && /^[A-Za-z0-9._-]+$/.test(s));
}

export const manifestPartRefSchema = z.looseObject({
  partNumber: z.number().int().min(1),
  path: safeRelativePathSchema,
  title: z.string().optional(),
});

export const manifestEntrySchema = z.looseObject({
  id: storyIdSchema,
  slug: slugSchema,
  title: nonEmpty,
  genres: z.array(nonEmpty).min(1),
  status: z.enum(STORY_STATUSES),
  partCount: z.number().int().min(0),
  storyPath: safeRelativePathSchema,
  parts: z.array(manifestPartRefSchema),
  synopsis: z.string().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const manifestSchema = z.looseObject({
  schemaVersion: z.literal(1),
  /** "production" for the real library; "fixture" for development/test data. */
  environment: z.enum(['production', 'fixture']).default('production'),
  updatedAt: isoDateTimeSchema.optional(),
  stories: z.array(manifestEntrySchema),
});
