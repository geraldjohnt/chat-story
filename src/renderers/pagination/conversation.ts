import type { ConversationItem, ConversationScreenshot, MessageItem } from '../../types';
import { conversationCapacity, conversationMetrics, type ConversationMetrics } from '../metrics';
import { countLines, wrapText, type TextMeasurer } from '../measure';
import type { ExportProfile } from '../profiles';
import { paginateSequence } from './sequence';
import type { PaginatedShot } from './types';

/** Segment metadata attached to messages that had to be split across screenshots. */
export interface SplitInfo {
  originalId: string;
  segment: number;
  segments?: number;
}

export type RenderItem = ConversationItem & { split?: SplitInfo };

export function isGroupConversation(shot: ConversationScreenshot): boolean {
  return shot.participants.length > 2;
}

function startsRun(item: RenderItem, prev: RenderItem | undefined, isFirst: boolean): boolean {
  if (isFirst || !prev) return true;
  if (item.kind !== 'message' && item.kind !== 'typing') return true;
  if (prev.kind !== 'message' && prev.kind !== 'typing') return true;
  return prev.sender !== item.sender;
}

export function conversationItemHeight(
  item: RenderItem,
  prev: RenderItem | undefined,
  isFirst: boolean,
  ctx: { m: ConversationMetrics; measurer: TextMeasurer; group: boolean; owner: string; hideReceipts: boolean },
): number {
  const { m } = ctx;
  const newRun = startsRun(item, prev, isFirst);
  const gap = isFirst ? 0 : newRun ? m.gapNewSender : m.gapSameSender;
  switch (item.kind) {
    case 'timestamp':
      return gap + m.timestampHeight;
    case 'system':
      return gap + m.systemHeight;
    case 'typing':
      return gap + m.typingHeight + (ctx.group && newRun && item.sender !== ctx.owner ? m.senderLabelHeight : 0);
    case 'message': {
      let h = gap;
      if (ctx.group && newRun && item.sender !== ctx.owner) h += m.senderLabelHeight;
      if (item.reactions?.length) h += m.reactionSpace;
      if (item.unsent) return h + m.systemHeight;
      if (item.attachment) {
        h += item.attachment.type === 'image' || item.attachment.type === 'video' ? m.imageAttachmentHeight : m.cardAttachmentHeight;
        if (item.text?.trim()) h += m.gapSameSender;
      }
      if (item.text?.trim()) {
        const lines = countLines(item.text, m.textMaxWidth, m.fontSize, ctx.measurer);
        h += lines * m.lineHeight + m.bubblePadY * 2;
      }
      if (item.receipt && !ctx.hideReceipts && item.sender === ctx.owner) h += m.receiptHeight;
      return h;
    }
  }
}

/** Splits a message whose text cannot fit on one page at line boundaries. */
function splitMessage(item: MessageItem & { split?: SplitInfo }, available: number, m: ConversationMetrics, measurer: TextMeasurer, group: boolean): [RenderItem, RenderItem] | null {
  if (!item.text?.trim() || item.attachment) return null;
  const label = group ? m.senderLabelHeight : 0;
  const reaction = item.reactions?.length ? m.reactionSpace : 0;
  const maxLines = Math.floor((available - label - reaction - m.bubblePadY * 2 - m.receiptHeight) / m.lineHeight);
  const lines = wrapText(item.text, m.textMaxWidth, m.fontSize, measurer);
  if (maxLines < 1 || lines.length <= maxLines) return null;
  // Find the character offset at the end of line `maxLines` in the original text.
  let offset = 0;
  for (let i = 0; i < maxLines; i++) {
    const line = lines[i] ?? '';
    const idx = item.text.indexOf(line, offset);
    offset = idx >= 0 ? idx + line.length : offset + line.length;
  }
  // Prefer to break after a sentence end within the last few lines.
  const head = item.text.slice(0, offset);
  const sentence = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '), head.lastIndexOf('\n'));
  if (sentence > head.length * 0.85) offset = sentence + 1;
  const base = item.split ?? { originalId: item.id, segment: 1 };
  const first: RenderItem = { ...item, text: item.text.slice(0, offset), reactions: undefined, receipt: undefined, id: base.segment === 1 ? item.id : `${base.originalId}~${base.segment}`, split: { ...base } };
  const rest: RenderItem = { ...item, text: item.text.slice(offset), id: `${base.originalId}~${base.segment + 1}`, split: { originalId: base.originalId, segment: base.segment + 1 } };
  return [first, rest];
}

export function paginateConversation(shot: ConversationScreenshot, profile: ExportProfile, measurer: TextMeasurer): PaginatedShot<ConversationScreenshot>[] {
  const group = isGroupConversation(shot);
  const fontScale = shot.presentation?.fontScale ?? 1;
  const m = conversationMetrics(profile, fontScale, group);
  const showComposer = shot.presentation?.showComposer ?? true;
  const showStatusBar = shot.presentation?.showStatusBar ?? true;
  const capacity = conversationCapacity(profile, m, showComposer, showStatusBar);
  const ctx = { m, measurer, group, owner: shot.deviceOwner, hideReceipts: shot.presentation?.hideReceipts ?? false };
  const pages = paginateSequence<RenderItem>(shot.messages, {
    capacity,
    heightOf: (item, prev, isFirst) => conversationItemHeight(item, prev, isFirst, ctx),
    keepWithNext: (item) => item.kind === 'timestamp',
    split: (item, available) => (item.kind === 'message' ? splitMessage(item, available, m, measurer, group) : null),
  });
  // Number split segments.
  const totals = new Map<string, number>();
  for (const p of pages) for (const it of p.items) if (it.split) totals.set(it.split.originalId, Math.max(totals.get(it.split.originalId) ?? 0, it.split.segment));
  return pages.map((p, i) => ({
    shot: { ...shot, messages: p.items.map((it) => (it.split ? { ...it, split: { ...it.split, segments: totals.get(it.split.originalId) } } : it)) as ConversationItem[] },
    page: i + 1,
    pages: pages.length,
    contentHeight: p.height,
    capacity,
    overflow: p.overflow,
  }));
}
