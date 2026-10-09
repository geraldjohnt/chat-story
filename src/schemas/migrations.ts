/**
 * Schema migrations.
 *
 * All files are currently schemaVersion 1, so there are no migrations yet.
 * When a schema changes:
 *  1. Bump the version constant in common.ts and the z.literal() in the schema.
 *  2. Add a pure function here: (old: unknown) => new, that copies every existing
 *     field (including unknown ones) and only adds/renames what changed.
 *  3. Run `npm run migrate:stories` (to be added with the first migration), which must
 *     write migrated files alongside a validated result and never drop content.
 *  4. Document the change in memory/project-memory.md.
 */
export type Migration = (input: Record<string, unknown>) => Record<string, unknown>;

export const storyMigrations: Record<number, Migration> = {};
export const partMigrations: Record<number, Migration> = {};

export function describeUnsupportedVersion(kind: string, version: unknown, supported: number): string {
  return `Unsupported ${kind} schemaVersion ${JSON.stringify(version)} (this build supports ${supported}). Update the app or migrate the file.`;
}
