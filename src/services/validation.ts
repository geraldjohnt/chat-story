import type { z } from 'zod';
import {
  manifestSchema, partSchema, storySchema, MANIFEST_SCHEMA_VERSION, PART_SCHEMA_VERSION, STORY_SCHEMA_VERSION,
  describeUnsupportedVersion,
} from '../schemas';
import type { Manifest, ManifestEntry, Part, Screenshot, Story } from '../types';

export type Severity = 'error' | 'warning';
export interface ValidationIssue {
  file: string;
  message: string;
  severity: Severity;
}

export type Parsed<T> = { ok: true; value: T; issues: ValidationIssue[] } | { ok: false; issues: ValidationIssue[] };

function zodIssues(file: string, error: z.ZodError): ValidationIssue[] {
  return error.issues.map((i) => ({
    file,
    severity: 'error' as const,
    message: `${i.path.length ? i.path.join('.') + ': ' : ''}${i.message}`,
  }));
}

function checkVersion(file: string, raw: unknown, kind: string, supported: number): ValidationIssue | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { file, severity: 'error', message: `${kind} must be a JSON object` };
  }
  const v = (raw as Record<string, unknown>).schemaVersion;
  if (v === undefined) return { file, severity: 'error', message: 'schemaVersion: missing' };
  if (v !== supported) return { file, severity: 'error', message: describeUnsupportedVersion(kind, v, supported) };
  return null;
}

export function parseJsonText(file: string, text: string): Parsed<unknown> {
  try {
    return { ok: true, value: JSON.parse(text) as unknown, issues: [] };
  } catch (e) {
    return { ok: false, issues: [{ file, severity: 'error', message: `Invalid JSON: ${(e as Error).message}` }] };
  }
}

export function parseManifest(file: string, raw: unknown, opts: { production?: boolean } = {}): Parsed<Manifest> {
  const v = checkVersion(file, raw, 'manifest', MANIFEST_SCHEMA_VERSION);
  if (v) return { ok: false, issues: [v] };
  const r = manifestSchema.safeParse(raw);
  if (!r.success) return { ok: false, issues: zodIssues(file, r.error) };
  const m = r.data;
  const issues: ValidationIssue[] = [];
  const err = (message: string) => issues.push({ file, severity: 'error', message });
  if (opts.production && m.environment !== 'production') err('The production manifest must have environment "production" (fixtures must never be published)');
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const paths = new Set<string>();
  m.stories.forEach((s, i) => {
    const at = `stories[${i}] (${s.id})`;
    if (ids.has(s.id)) err(`${at}: duplicate story ID ${s.id}`);
    ids.add(s.id);
    if (slugs.has(s.slug)) err(`${at}: duplicate slug ${s.slug}`);
    slugs.add(s.slug);
    const dir = s.storyPath.split('/')[0] ?? '';
    if (!s.storyPath.endsWith('/story.json') || s.storyPath.split('/').length !== 2) err(`${at}: storyPath must be "<directory>/story.json"`);
    if (!dir.startsWith(`${s.id}-`) && dir !== s.id) err(`${at}: story directory "${dir}" must start with the story ID ("${s.id}-")`);
    if (s.partCount !== s.parts.length) err(`${at}: partCount ${s.partCount} does not match ${s.parts.length} part references`);
    const nums = new Set<number>();
    s.parts.forEach((p, j) => {
      if (nums.has(p.partNumber)) err(`${at}: duplicate part number ${p.partNumber}`);
      nums.add(p.partNumber);
      if (p.partNumber !== j + 1) err(`${at}: parts must be listed in order 1..n without gaps (found ${p.partNumber} at position ${j + 1})`);
      if (!p.path.startsWith(`${dir}/`)) err(`${at}: part ${p.partNumber} path must be inside ${dir}/`);
      if (p.path !== `${dir}/part-${p.partNumber}.json`) err(`${at}: part ${p.partNumber} path should be "${dir}/part-${p.partNumber}.json"`);
      if (paths.has(p.path)) err(`${at}: duplicate path ${p.path}`);
      paths.add(p.path);
    });
  });
  if (issues.length) return { ok: false, issues };
  return { ok: true, value: m, issues };
}

export function parseStory(file: string, raw: unknown, opts: { production?: boolean } = {}): Parsed<Story> {
  const v = checkVersion(file, raw, 'story', STORY_SCHEMA_VERSION);
  if (v) return { ok: false, issues: [v] };
  const r = storySchema.safeParse(raw);
  if (!r.success) return { ok: false, issues: zodIssues(file, r.error) };
  const s = r.data;
  const issues: ValidationIssue[] = [];
  const err = (message: string) => issues.push({ file, severity: 'error', message });
  if (opts.production && s.fixture) err('Fixture stories must never appear in the production library');
  const charIds = new Set<string>();
  for (const c of s.characters) {
    if (charIds.has(c.id)) err(`characters: duplicate character id "${c.id}"`);
    charIds.add(c.id);
  }
  const ref = (where: string, id: string) => {
    if (!charIds.has(id)) err(`${where}: unknown character "${id}"`);
  };
  s.relationships.forEach((r2, i) => {
    ref(`relationships[${i}].from`, r2.from);
    ref(`relationships[${i}].to`, r2.to);
  });
  s.secrets.forEach((x, i) => ref(`secrets[${i}].holder`, x.holder));
  if (s.completedPartCount > s.plannedPartCount && s.status !== 'completed') {
    issues.push({ file, severity: 'warning', message: 'completedPartCount exceeds plannedPartCount; update plannedPartCount' });
  }
  if (issues.some((i) => i.severity === 'error')) return { ok: false, issues };
  return { ok: true, value: s, issues };
}

export function parsePart(file: string, raw: unknown, story?: Story): Parsed<Part> {
  const v = checkVersion(file, raw, 'part', PART_SCHEMA_VERSION);
  if (v) return { ok: false, issues: [v] };
  const r = partSchema.safeParse(raw);
  if (!r.success) return { ok: false, issues: zodIssues(file, r.error) };
  const part = r.data;
  const issues: ValidationIssue[] = [];
  if (story) issues.push(...checkPartReferences(file, part, story));
  if (issues.some((i) => i.severity === 'error')) return { ok: false, issues };
  return { ok: true, value: part, issues };
}

/** Character references, ID uniqueness and screenshot-specific rules. */
export function checkPartReferences(file: string, part: Part, story: Story): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const err = (message: string) => issues.push({ file, severity: 'error', message });
  const warn = (message: string) => issues.push({ file, severity: 'warning', message });
  if (part.storyId !== story.id) err(`storyId "${part.storyId}" does not match story "${story.id}"`);
  const chars = new Set(story.characters.map((c) => c.id));
  const shotIds = new Set<string>();
  part.screenshots.forEach((shot: Screenshot, si) => {
    const at = `screenshots[${si}] (${shot.id})`;
    if (shotIds.has(shot.id)) err(`${at}: duplicate screenshot id`);
    shotIds.add(shot.id);
    const known = (where: string, id: string | undefined) => {
      if (id !== undefined && !chars.has(id)) err(`${at}.${where}: unknown character "${id}"`);
    };
    switch (shot.type) {
      case 'conversation': {
        known('deviceOwner', shot.deviceOwner);
        const parts = new Set(shot.participants);
        if (parts.size !== shot.participants.length) err(`${at}.participants: duplicate participant`);
        shot.participants.forEach((p, i) => known(`participants[${i}]`, p));
        if (!parts.has(shot.deviceOwner)) err(`${at}: deviceOwner "${shot.deviceOwner}" must be one of the participants`);
        const itemIds = new Set<string>();
        let lastTime = -Infinity;
        shot.messages.forEach((m, mi) => {
          const w = `messages[${mi}]`;
          if (itemIds.has(m.id)) err(`${at}.${w}: duplicate item id "${m.id}"`);
          itemIds.add(m.id);
          if (m.kind === 'message' || m.kind === 'typing') {
            known(`${w}.sender`, m.sender);
            if (!parts.has(m.sender)) err(`${at}.${w}: sender "${m.sender}" is not a participant of this conversation`);
          }
          if (m.kind === 'message') {
            const seen = new Set<string>();
            m.reactions?.forEach((r, ri) => {
              known(`${w}.reactions[${ri}].by`, r.by);
              if (!parts.has(r.by)) err(`${at}.${w}.reactions[${ri}]: "${r.by}" is not a participant`);
              if (seen.has(r.by)) err(`${at}.${w}.reactions: "${r.by}" reacted more than once`);
              seen.add(r.by);
            });
            if (m.receipt && m.sender !== shot.deviceOwner) err(`${at}.${w}: receipts can only appear on the device owner's outgoing messages`);
            if (m.sentAt) {
              const t = Date.parse(m.sentAt);
              if (t < lastTime) warn(`${at}.${w}: sentAt is earlier than a previous message`);
              lastTime = t;
            }
          }
          if (m.kind === 'typing' && mi !== shot.messages.length - 1) warn(`${at}.${w}: a typing indicator is usually the last item`);
        });
        break;
      }
      case 'notification':
      case 'notification-center': {
        known('deviceOwner', shot.deviceOwner);
        const ids = new Set<string>();
        shot.notifications.forEach((n, ni) => {
          known(`notifications[${ni}].sender`, n.sender);
          if (ids.has(n.id)) err(`${at}.notifications[${ni}]: duplicate id "${n.id}"`);
          ids.add(n.id);
          if (!n.sender && !n.title) err(`${at}.notifications[${ni}]: needs a sender or a title`);
        });
        break;
      }
      case 'conversation-list': {
        known('deviceOwner', shot.deviceOwner);
        const ids = new Set<string>();
        shot.conversations.forEach((c, ci) => {
          c.participants.forEach((p, pi) => known(`conversations[${ci}].participants[${pi}]`, p));
          if (ids.has(c.id)) err(`${at}.conversations[${ci}]: duplicate id "${c.id}"`);
          ids.add(c.id);
        });
        break;
      }
    }
  });
  return issues;
}

/** Consistency between a manifest entry, its story.json and its loaded part files. */
export function checkStoryConsistency(entry: ManifestEntry, story: Story, parts: Part[]): ValidationIssue[] {
  const file = entry.storyPath;
  const issues: ValidationIssue[] = [];
  const err = (message: string) => issues.push({ file, severity: 'error', message });
  const warn = (message: string) => issues.push({ file, severity: 'warning', message });
  if (story.id !== entry.id) err(`story.json id "${story.id}" does not match manifest id "${entry.id}"`);
  if (story.slug !== entry.slug) err(`slug "${story.slug}" does not match manifest slug "${entry.slug}"`);
  if (story.title !== entry.title) err(`title does not match the manifest title`);
  if (story.status !== entry.status) err(`status "${story.status}" does not match manifest status "${entry.status}"`);
  if (!entry.genres.includes(story.genre)) err(`manifest genres must include the story genre "${story.genre}"`);
  if (story.updatedAt !== entry.updatedAt) warn('updatedAt differs from the manifest entry');
  if (parts.length !== entry.partCount) err(`manifest partCount ${entry.partCount} but ${parts.length} part files loaded`);
  const finalCount = parts.filter((p) => p.status === 'final').length;
  if (story.completedPartCount !== finalCount) err(`completedPartCount ${story.completedPartCount} does not match ${finalCount} final part files`);
  if (parts.length > story.plannedPartCount && story.status !== 'completed') err(`there are ${parts.length} parts but plannedPartCount is ${story.plannedPartCount}`);
  parts.forEach((p, i) => {
    if (p.partNumber !== i + 1) err(`part files are not numbered 1..n (position ${i + 1} has partNumber ${p.partNumber})`);
    const ref = entry.parts[i];
    if (ref && ref.partNumber !== p.partNumber) err(`manifest part ${ref.partNumber} points to a file with partNumber ${p.partNumber}`);
    const sum = story.partSummaries.find((s) => s.partNumber === p.partNumber);
    if (!sum) err(`partSummaries is missing part ${p.partNumber}`);
    else if (sum.title !== p.title) warn(`partSummaries title for part ${p.partNumber} differs from the part file`);
  });
  const sumNums = story.partSummaries.map((s) => s.partNumber);
  if (new Set(sumNums).size !== sumNums.length) err('partSummaries has duplicate part numbers');
  if (sumNums.some((n) => n > parts.length)) err('partSummaries references a part that does not exist');
  switch (story.status) {
    case 'completed':
      if (parts.length === 0) err('a completed story must have at least one part');
      if (parts.some((p) => p.status !== 'final')) err('a completed story cannot contain draft parts');
      if (story.plannedPartCount !== parts.length) err('a completed story must have plannedPartCount equal to its part count');
      if (!story.plannedEnding.trim()) err('a completed story needs a plannedEnding describing its actual ending');
      story.unresolvedThreads.forEach((t) => {
        if (!t.resolvedInPart) err(`completed story still has an unresolved thread "${t.id}"`);
      });
      if (parts.at(-1)?.cliffhanger) warn('the final part of a completed story has a cliffhanger');
      break;
    case 'planned':
      if (parts.length > 0) err('a "planned" story must not have published parts yet (use "ongoing")');
      break;
    case 'ongoing':
      if (parts.length === 0) warn('an ongoing story has no parts yet');
      break;
  }
  return issues;
}

export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}
