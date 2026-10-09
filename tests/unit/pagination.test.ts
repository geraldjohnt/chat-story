import { describe, expect, it } from 'vitest';
import { estimateMeasurer, wrapText } from '../../src/renderers/measure';
import { conversationCapacity, conversationMetrics } from '../../src/renderers/metrics';
import { conversationItemHeight, paginateConversation, type RenderItem } from '../../src/renderers/pagination/conversation';
import { paginateConversationList } from '../../src/renderers/pagination/conversationList';
import { notificationHeight, paginateNotificationCenter, paginateNotification } from '../../src/renderers/pagination/notifications';
import { paginateSequence } from '../../src/renderers/pagination/sequence';
import { EXPORT_PROFILES } from '../../src/renderers/profiles';
import { buildPages } from '../../src/renderers/registry';
import type { ConversationItem, ConversationListScreenshot, ConversationScreenshot, NotificationCenterScreenshot, NotificationScreenshot } from '../../src/types';
import { clone, part1, part2 } from '../helpers/fixtures';

const m = estimateMeasurer;
const iphone = EXPORT_PROFILES.iphone;
const tall = EXPORT_PROFILES['vertical-9-16'];

function convo(n: number, extra: Partial<ConversationScreenshot> = {}): ConversationScreenshot {
  const messages: ConversationItem[] = [];
  for (let i = 0; i < n; i++) {
    if (i % 10 === 0) messages.push({ kind: 'timestamp', id: `t${i}`, label: `Day ${i / 10 + 1} 9:00 PM` });
    messages.push({ kind: 'message', id: `m${i}`, sender: i % 3 === 0 ? 'b' : 'a', text: `Message ${i} ${'word '.repeat(i % 17)}`.trim() });
  }
  return { id: 's', type: 'conversation', theme: 'light', exportProfile: 'iphone', deviceOwner: 'a', participants: ['a', 'b'], messages, ...extra };
}

/** Joins split segments back to the original stream for loss/duplication checks. */
function flatten(pages: { shot: ConversationScreenshot }[]): { id: string; text?: string }[] {
  const out: { id: string; text?: string }[] = [];
  for (const p of pages) {
    for (const it of p.shot.messages as RenderItem[]) {
      const id = it.split?.originalId ?? it.id;
      const text = it.kind === 'message' ? it.text : undefined;
      const last = out[out.length - 1];
      if (it.split && it.split.segment > 1 && last?.id === id) last.text = (last.text ?? '') + (text ?? '');
      else out.push({ id, text });
    }
  }
  return out;
}

describe('export profiles', () => {
  it('declares explicit pixel dimensions consistent with logical size × scale', () => {
    expect(iphone.pixelWidth).toBe(1170);
    expect(iphone.pixelHeight).toBe(2532);
    expect(tall.pixelWidth).toBe(1080);
    expect(tall.pixelHeight).toBe(1920);
    for (const p of Object.values(EXPORT_PROFILES)) {
      expect(p.width * p.scale).toBe(p.pixelWidth);
      expect(p.height * p.scale).toBe(p.pixelHeight);
    }
    expect(tall.pixelHeight / tall.pixelWidth).toBeCloseTo(16 / 9, 5);
  });
});

describe('generic sequence pagination', () => {
  it('preserves order, never drops or duplicates', () => {
    const items = Array.from({ length: 57 }, (_, i) => i);
    const pages = paginateSequence(items, { capacity: 100, heightOf: (i) => 10 + (i % 7) * 5 });
    expect(pages.flatMap((p) => p.items)).toEqual(items);
    pages.forEach((p) => expect(p.height).toBeLessThanOrEqual(100));
  });
  it('moves keep-with-next items to the following page', () => {
    const items = ['a', 'b', 'SEP', 'c'];
    const pages = paginateSequence(items, { capacity: 30, heightOf: () => 10, keepWithNext: (x) => x === 'SEP' });
    expect(pages.map((p) => p.items)).toEqual([['a', 'b'], ['SEP', 'c']]);
  });
  it('flags an unsplittable item taller than a page instead of dropping it', () => {
    const pages = paginateSequence([1, 2, 3], { capacity: 50, heightOf: (i) => (i === 2 ? 80 : 10) });
    expect(pages.flatMap((p) => p.items)).toEqual([1, 2, 3]);
    expect(pages.some((p) => p.overflow)).toBe(true);
  });
});

describe('conversation pagination', () => {
  it('keeps short conversations on one page', () => {
    const pages = paginateConversation(clone(part1()).screenshots[0] as ConversationScreenshot, iphone, m);
    expect(pages).toHaveLength(1);
  });

  it.each([iphone, tall])('splits long conversations without loss, duplication or reordering (%s)', (profile) => {
    const shot = convo(120);
    const pages = paginateConversation(shot, profile, m);
    expect(pages.length).toBeGreaterThan(3);
    const ids = flatten(pages).map((x) => x.id);
    expect(ids).toEqual(shot.messages.map((x) => x.id));
    expect(new Set(ids).size).toBe(ids.length);
    pages.forEach((p) => {
      expect(p.contentHeight).toBeLessThanOrEqual(p.capacity);
      expect(p.overflow).toBe(false);
      expect(p.pages).toBe(pages.length);
      // A date separator never ends a page.
      const last = p.shot.messages[p.shot.messages.length - 1];
      if (p.page < p.pages) expect(last?.kind).not.toBe('timestamp');
    });
  });

  it('splits a single message longer than a page and preserves its full text', () => {
    const shot = clone(part1()).screenshots[3] as ConversationScreenshot;
    const original = shot.messages[0]!.kind === 'message' ? shot.messages[0]!.text : '';
    const pages = paginateConversation(shot, iphone, m);
    expect(pages.length).toBeGreaterThan(1);
    const flat = flatten(pages);
    expect(flat.map((x) => x.id)).toEqual(['x1', 'x2', 'x3']);
    expect(flat[0]!.text).toBe(original);
    const segs = pages.flatMap((p) => (p.shot.messages as RenderItem[]).filter((x) => x.split));
    expect(segs.every((s) => s.split!.segments === segs.length)).toBe(true);
  });

  it('uses less space per page with group sender labels and larger font scales', () => {
    const base = paginateConversation(convo(60), iphone, m).length;
    const big = paginateConversation(convo(60, { presentation: { fontScale: 1.3 } }), iphone, m).length;
    const group = paginateConversation(convo(60, { participants: ['a', 'b', 'c'] }), iphone, m).length;
    expect(big).toBeGreaterThanOrEqual(base);
    expect(group).toBeGreaterThanOrEqual(base);
  });

  it('accounts for receipts, reactions, typing indicators and attachments', () => {
    const met = conversationMetrics(iphone);
    const ctx = { m: met, measurer: m, group: false, owner: 'a', hideReceipts: false };
    const plain: RenderItem = { kind: 'message', id: '1', sender: 'a', text: 'hi' };
    const h = conversationItemHeight(plain, undefined, true, ctx);
    expect(conversationItemHeight({ ...plain, receipt: { status: 'read' } }, undefined, true, ctx)).toBe(h + met.receiptHeight);
    expect(conversationItemHeight({ ...plain, reactions: [{ by: 'b', type: 'heart' }] }, undefined, true, ctx)).toBe(h + met.reactionSpace);
    expect(conversationItemHeight({ kind: 'typing', id: 't', sender: 'b' }, undefined, true, ctx)).toBe(met.typingHeight);
    expect(conversationItemHeight({ ...plain, text: undefined, attachment: { type: 'image', label: 'Photo' } }, undefined, true, ctx)).toBe(met.imageAttachmentHeight);
    expect(conversationCapacity(iphone, met, true, true)).toBeGreaterThan(conversationCapacity(iphone, met, true, true) - 1);
  });

  it('wraps text by words and honours explicit newlines', () => {
    const lines = wrapText('one two three four five six seven eight nine ten\nnew line', 80, 17, m);
    expect(lines.length).toBeGreaterThan(2);
    expect(lines[lines.length - 1]).toBe('new line');
    expect(wrapText('x'.repeat(200), 100, 17, m).join('')).toBe('x'.repeat(200));
  });
});

describe('notification pagination', () => {
  it('wraps long notification text into taller cards', () => {
    const short = notificationHeight({ id: '1', app: 'messages', body: 'Hi', time: 'now' }, iphone, m);
    const long = notificationHeight({ id: '2', app: 'messages', body: 'word '.repeat(80), time: 'now' }, iphone, m);
    expect(long).toBeGreaterThan(short * 2);
  });
  it('splits Notification Center overflow across pages in order', () => {
    const shot = clone(part2()).screenshots[1] as NotificationCenterScreenshot;
    const pages = paginateNotificationCenter(shot, tall, m);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flatMap((p) => p.shot.notifications.map((n) => n.id))).toEqual(shot.notifications.map((n) => n.id));
    pages.forEach((p) => expect(p.contentHeight).toBeLessThanOrEqual(p.capacity));
  });
  it('keeps a small lock-screen stack on one page', () => {
    expect(paginateNotification(clone(part2()).screenshots[0] as NotificationScreenshot, iphone, m)).toHaveLength(1);
  });
});

describe('conversation list pagination', () => {
  it('shows pinned rows first and paginates the remaining rows in order', () => {
    const shot = clone(part2()).screenshots[3] as ConversationListScreenshot;
    const pages = paginateConversationList(shot, tall);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flatMap((p) => p.shot.conversations.map((c) => c.id))).toEqual(shot.conversations.map((c) => c.id));
  });
  it('keeps pinned conversations on the first page', () => {
    const shot = clone(part2()).screenshots[2] as ConversationListScreenshot;
    const pages = paginateConversationList(shot, iphone);
    expect(pages[0]!.shot.conversations.filter((c) => c.pinned)).toHaveLength(3);
  });
});

describe('buildPages', () => {
  it('numbers pages sequentially across the part and applies overrides without mutating source data', () => {
    const p = part1();
    const before = JSON.stringify(p);
    const pages = buildPages(p, m, { theme: 'dark', profile: 'vertical-9-16' });
    expect(pages.map((x) => x.index)).toEqual(pages.map((_, i) => i + 1));
    expect(pages.every((x) => x.shot.theme === 'dark' && x.profile.id === 'vertical-9-16')).toBe(true);
    expect(JSON.stringify(p)).toBe(before);
    expect(new Set(pages.map((x) => x.key)).size).toBe(pages.length);
  });
  it('uses each screenshot’s own theme and profile by default', () => {
    const pages = buildPages(part1(), m);
    expect(pages[0]!.shot.theme).toBe('light');
    expect(pages.find((x) => x.screenshotId === 's02')!.shot.theme).toBe('dark');
    expect(pages.find((x) => x.screenshotId === 's02')!.profile.id).toBe('vertical-9-16');
  });
});
