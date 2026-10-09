import { z } from 'zod';

/** Current schema versions. Bump only together with a migration in src/schemas/migrations.ts. */
export const STORY_SCHEMA_VERSION = 1;
export const PART_SCHEMA_VERSION = 1;
export const MANIFEST_SCHEMA_VERSION = 1;

export const storyIdSchema = z
  .string()
  .regex(/^\d{4,}$/, 'Story IDs are zero-padded numeric strings with at least four digits (e.g. "0001")');

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slugs are lowercase words separated by single hyphens');

export const characterIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, 'Character IDs are lowercase, start with a letter and may contain digits and hyphens');

export const isoDateTimeSchema = z.iso.datetime({ offset: true, message: 'Expected an ISO 8601 date-time, e.g. 2026-01-31T21:15:00Z' });

export const hexColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Expected a hex color like #34C759');

export const nonEmpty = z.string().trim().min(1, 'Must not be empty');
