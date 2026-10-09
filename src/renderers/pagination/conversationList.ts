import type { ConversationListScreenshot, ConversationRow } from '../../types';
import type { ExportProfile } from '../profiles';
import { paginateSequence } from './sequence';
import type { PaginatedShot } from './types';

export const LIST = {
  largeHeader: 104,
  searchBar: 46,
  compactHeader: 52,
  rowHeight: 78,
  pinnedRowHeight: 112,
  pinnedPerRow: 3,
  maxPinned: 9,
};

export function splitPinned(rows: ConversationRow[]): { pinned: ConversationRow[]; regular: ConversationRow[] } {
  const pinned: ConversationRow[] = [];
  const regular: ConversationRow[] = [];
  for (const r of rows) (r.pinned && pinned.length < LIST.maxPinned ? pinned : regular).push(r);
  return { pinned, regular };
}

export function pinnedHeight(count: number): number {
  return count ? Math.ceil(count / LIST.pinnedPerRow) * LIST.pinnedRowHeight + 8 : 0;
}

/**
 * Page 1 shows the large title, search field and pinned grid; continuation pages show a
 * compact title, like a scrolled list. Rows keep their original order.
 */
export function paginateConversationList(shot: ConversationListScreenshot, profile: ExportProfile): PaginatedShot<ConversationListScreenshot>[] {
  const status = shot.presentation?.showStatusBar === false ? 0 : profile.statusBarHeight;
  const { pinned, regular } = splitPinned(shot.conversations);
  const firstCap = profile.height - status - LIST.largeHeader - LIST.searchBar - pinnedHeight(pinned.length) - profile.homeIndicatorHeight;
  const nextCap = profile.height - status - LIST.compactHeader - profile.homeIndicatorHeight;
  const firstRows = Math.max(0, Math.floor(firstCap / LIST.rowHeight));
  const head = regular.slice(0, firstRows);
  const tail = regular.slice(firstRows);
  const rest = paginateSequence(tail, { capacity: nextCap, heightOf: () => LIST.rowHeight });
  const pages = [{ rows: [...pinned, ...head], height: pinnedHeight(pinned.length) + head.length * LIST.rowHeight, cap: firstCap }, ...rest.map((p) => ({ rows: p.items, height: p.height, cap: nextCap }))];
  return pages.map((p, i) => ({
    shot: { ...shot, conversations: p.rows },
    page: i + 1,
    pages: pages.length,
    contentHeight: p.height,
    capacity: p.cap,
    overflow: false,
  }));
}
