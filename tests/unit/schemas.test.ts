import { describe, expect, it } from 'vitest';
import { isSafeRelativePath, partSchema, screenshotSchema, storySchema } from '../../src/schemas';
import { checkStoryConsistency, parseJsonText, parseManifest, parsePart, parseStory } from '../../src/services/validation';
import type { ManifestEntry } from '../../src/types';
import { clone, part1, part2, readFixture, story1 } from '../helpers/fixtures';

const manifest = () => readFixture<{ stories: ManifestEntry[] }>('manifest.json');
const msgs = (issues: { message: string }[]) => issues.map((i) => i.message).join('\n');

describe('story and part schemas', () => {
  it('accepts valid fixture metadata, parts and screenshots', () => {
    expect(storySchema.safeParse(story1()).success).toBe(true);
    expect(partSchema.safeParse(part1()).success).toBe(true);
    for (const s of [...part1().screenshots, ...part2().screenshots]) expect(screenshotSchema.safeParse(s).success).toBe(true);
    expect(parsePart('p1', part1(), story1()).ok).toBe(true);
    expect(parsePart('p2', part2(), story1()).ok).toBe(true);
  });

  it('preserves unknown fields instead of silently discarding them', () => {
    const s = { ...story1(), futureField: { keep: true } };
    const r = parseStory('story.json', s);
    expect(r.ok && (r.value as Record<string, unknown>).futureField).toEqual({ keep: true });
  });

  it('reports invalid JSON', () => {
    const r = parseJsonText('x.json', '{ "a": ');
    expect(r.ok).toBe(false);
    expect(msgs(r.issues)).toMatch(/Invalid JSON/);
  });

  it('rejects missing required fields', () => {
    const s = clone(story1()) as Record<string, unknown>;
    delete s.title;
    delete s.status;
    const r = parseStory('story.json', s);
    expect(r.ok).toBe(false);
    expect(msgs(r.issues)).toMatch(/title/);
    expect(msgs(r.issues)).toMatch(/status/);
  });

  it('rejects unsupported or missing schema versions with a clear message', () => {
    expect(msgs(parseStory('s', { ...story1(), schemaVersion: 2 }).issues)).toMatch(/Unsupported story schemaVersion 2/);
    expect(msgs(parsePart('p', { ...part1(), schemaVersion: 99 }).issues)).toMatch(/Unsupported part schemaVersion 99/);
    const noVersion = clone(story1()) as Record<string, unknown>;
    delete noVersion.schemaVersion;
    expect(msgs(parseStory('s', noVersion).issues)).toMatch(/schemaVersion: missing/);
  });

  it('rejects invalid story IDs, statuses and timestamps', () => {
    expect(parseStory('s', { ...story1(), id: '12' }).ok).toBe(false);
    expect(parseStory('s', { ...story1(), status: 'finished' }).ok).toBe(false);
    expect(parseStory('s', { ...story1(), createdAt: 'yesterday' }).ok).toBe(false);
  });

  it('rejects invalid character references in story metadata', () => {
    const s = clone(story1());
    s.relationships.push({ from: 'avery', to: 'ghost', type: 'rivals', description: '' });
    expect(msgs(parseStory('s', s).issues)).toMatch(/unknown character "ghost"/);
  });

  it('rejects invalid character references in screenshots', () => {
    const p = clone(part1());
    const shot = p.screenshots[0]!;
    if (shot.type !== 'conversation') throw new Error('fixture');
    shot.messages.push({ kind: 'message', id: 'zz', sender: 'ghost', text: 'hi' });
    const r = parsePart('p', p, story1());
    expect(r.ok).toBe(false);
    expect(msgs(r.issues)).toMatch(/unknown character "ghost"/);
  });

  it('requires the device owner to be a participant and senders to belong to the conversation', () => {
    const p = clone(part1());
    const shot = p.screenshots[0]!;
    if (shot.type !== 'conversation') throw new Error('fixture');
    shot.deviceOwner = 'casey';
    shot.messages.push({ kind: 'message', id: 'q', sender: 'robin', text: 'hi' });
    const m = msgs(parsePart('p', p, story1()).issues);
    expect(m).toMatch(/deviceOwner "casey" must be one of the participants/);
    expect(m).toMatch(/sender "robin" is not a participant/);
  });

  it('validates message types, reactions and receipts', () => {
    const bad = (msg: unknown) => {
      const p = clone(part1()) as unknown as { screenshots: { messages: unknown[] }[] };
      p.screenshots[0]!.messages.push(msg);
      return parsePart('p', p, story1());
    };
    expect(bad({ kind: 'sticker', id: 'a', sender: 'avery' }).ok).toBe(false);
    expect(bad({ kind: 'message', id: 'a', sender: 'avery' }).ok).toBe(false); // no text/attachment
    expect(bad({ kind: 'message', id: 'a', sender: 'avery', text: 'x', reactions: [{ by: 'jordan', type: 'fire' }] }).ok).toBe(false);
    expect(bad({ kind: 'message', id: 'a', sender: 'jordan', text: 'x', receipt: { status: 'read' } }).ok).toBe(false);
    expect(bad({ kind: 'message', id: 'a', sender: 'avery', text: 'x', sentAt: 'not a date' }).ok).toBe(false);
    expect(bad({ kind: 'message', id: 'm1', sender: 'avery', text: 'dup id' }).ok).toBe(false);
  });

  it('rejects duplicate screenshot ids and unknown screenshot types or profiles', () => {
    const p = clone(part1());
    p.screenshots.push(clone(p.screenshots[0]!));
    expect(msgs(parsePart('p', p, story1()).issues)).toMatch(/duplicate screenshot id/);
    expect(screenshotSchema.safeParse({ ...part1().screenshots[0], type: 'video' }).success).toBe(false);
    expect(screenshotSchema.safeParse({ ...part1().screenshots[0], exportProfile: 'square' }).success).toBe(false);
  });
});

describe('manifest validation', () => {
  it('accepts the empty production manifest', () => {
    const r = parseManifest('m', { schemaVersion: 1, environment: 'production', stories: [] }, { production: true });
    expect(r.ok).toBe(true);
  });

  it('rejects a fixture manifest in production mode', () => {
    expect(msgs(parseManifest('m', readFixture('manifest.json'), { production: true }).issues)).toMatch(/fixtures must never be published/);
  });

  it('rejects duplicate story IDs and duplicate part numbers', () => {
    const m = manifest();
    m.stories.push(clone(m.stories[0]!));
    expect(msgs(parseManifest('m', m).issues)).toMatch(/duplicate story ID 9001/);
    const m2 = manifest();
    m2.stories[0]!.parts[1]!.partNumber = 1;
    expect(msgs(parseManifest('m', m2).issues)).toMatch(/duplicate part number 1/);
  });

  it('rejects incorrect part counts', () => {
    const m = manifest();
    m.stories[0]!.partCount = 5;
    expect(msgs(parseManifest('m', m).issues)).toMatch(/partCount 5 does not match 2/);
  });

  it.each([
    '../secrets.json', '/etc/passwd', 'a/../../b.json', 'https://evil.example/x.json', 'a\\b.json', './x.json', 'a//b.json', '%2e%2e/x.json', 'C:/x.json', '',
  ])('rejects unsafe path %j', (p) => {
    expect(isSafeRelativePath(p)).toBe(false);
    const m = manifest();
    m.stories[0]!.storyPath = p;
    expect(parseManifest('m', m).ok).toBe(false);
  });

  it('accepts normal relative paths', () => {
    expect(isSafeRelativePath('0001-the-secret/part-1.json')).toBe(true);
  });
});

describe('story consistency', () => {
  const entry = () => manifest().stories[0]!;
  it('passes for the fixture story', () => {
    expect(checkStoryConsistency(entry(), story1(), [part1(), part2()]).filter((i) => i.severity === 'error')).toEqual([]);
  });
  it('detects completedPartCount mismatches', () => {
    const s = { ...story1(), completedPartCount: 2 };
    expect(msgs(checkStoryConsistency(entry(), s, [part1(), part2()]))).toMatch(/completedPartCount 2 does not match 1/);
  });
  it('detects missing part files', () => {
    expect(msgs(checkStoryConsistency(entry(), story1(), [part1()]))).toMatch(/partCount 2 but 1 part files/);
  });
  it('enforces completed-story rules', () => {
    const s = { ...story1(), status: 'completed' as const };
    const e = { ...entry(), status: 'completed' as const };
    const m = msgs(checkStoryConsistency(e, s, [part1(), part2()]));
    expect(m).toMatch(/cannot contain draft parts/);
    expect(m).toMatch(/plannedPartCount equal to its part count/);
    expect(m).toMatch(/unresolved thread "th1"/);
  });
  it('rejects parts on a planned story and mismatched IDs', () => {
    const m = msgs(checkStoryConsistency({ ...entry(), status: 'planned' }, { ...story1(), status: 'planned', id: '9003' }, [part1(), part2()]));
    expect(m).toMatch(/must not have published parts/);
    expect(m).toMatch(/does not match manifest id/);
  });
});
