import type { NotificationCenterScreenshot, NotificationItem, NotificationScreenshot } from '../../types';
import { countLines, type TextMeasurer } from '../measure';
import type { ExportProfile } from '../profiles';
import { paginateSequence } from './sequence';
import type { PaginatedShot } from './types';

export const NOTIF = {
  sidePad: 10,
  cardPadX: 14,
  cardPadY: 12,
  iconSize: 38,
  titleLine: 20,
  bodyFont: 15,
  bodyLine: 20,
  gap: 8,
  stackExtra: 14,
  lockClockArea: 210,
  lockBottomControls: 110,
  centerHeader: 150,
  groupHeader: 34,
};

export function notificationBodyWidth(profile: ExportProfile): number {
  return profile.width - NOTIF.sidePad * 2 - NOTIF.cardPadX * 2 - NOTIF.iconSize - 10 - 4;
}

export function notificationHeight(n: NotificationItem, profile: ExportProfile, measurer: TextMeasurer, scale = 1): number {
  const lines = countLines(n.body, notificationBodyWidth(profile), NOTIF.bodyFont * scale, measurer);
  const content = Math.max(NOTIF.iconSize, NOTIF.titleLine * scale + lines * NOTIF.bodyLine * scale);
  return NOTIF.cardPadY * 2 + content + ((n.groupCount ?? 1) > 1 ? NOTIF.stackExtra : 0);
}

function shared<T extends NotificationScreenshot | NotificationCenterScreenshot>(
  shot: T, profile: ExportProfile, measurer: TextMeasurer, capacity: number, groupHeaders: boolean,
): PaginatedShot<T>[] {
  const scale = shot.presentation?.fontScale ?? 1;
  const pages = paginateSequence<NotificationItem>(shot.notifications, {
    capacity,
    heightOf: (n, prev, isFirst) =>
      (isFirst ? 0 : NOTIF.gap) +
      (groupHeaders && (isFirst || prev?.app !== n.app) ? NOTIF.groupHeader : 0) +
      notificationHeight(n, profile, measurer, scale),
  });
  return pages.map((p, i) => ({
    shot: { ...shot, notifications: p.items },
    page: i + 1,
    pages: pages.length,
    contentHeight: p.height,
    capacity,
    overflow: p.overflow,
  }));
}

export function paginateNotification(shot: NotificationScreenshot, profile: ExportProfile, measurer: TextMeasurer) {
  const status = shot.presentation?.showStatusBar === false ? 0 : profile.statusBarHeight;
  const capacity = profile.height - status - NOTIF.lockClockArea - NOTIF.lockBottomControls - profile.homeIndicatorHeight;
  return shared(shot, profile, measurer, capacity, false);
}

export function paginateNotificationCenter(shot: NotificationCenterScreenshot, profile: ExportProfile, measurer: TextMeasurer) {
  const status = shot.presentation?.showStatusBar === false ? 0 : profile.statusBarHeight;
  const capacity = profile.height - status - NOTIF.centerHeader - profile.homeIndicatorHeight - 12;
  return shared(shot, profile, measurer, capacity, true);
}
