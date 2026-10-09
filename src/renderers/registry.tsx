import type { Character, ExportProfileId, Part, Screenshot, ScreenshotTheme, Story } from '../types';
import { ConversationListView } from './components/ConversationListView';
import { ConversationView } from './components/ConversationView';
import { NotificationCenterView, NotificationView } from './components/NotificationViews';
import type { TextMeasurer } from './measure';
import { paginateConversation } from './pagination/conversation';
import { paginateConversationList } from './pagination/conversationList';
import { paginateNotification, paginateNotificationCenter } from './pagination/notifications';
import type { PaginatedShot } from './pagination/types';
import { getProfile, type ExportProfile } from './profiles';
import type { CharacterMap, RendererDefinition, RendererRegistry, ScreenProps } from './types';

/**
 * Screenshot renderer registry. To add a new type: add its schema to
 * src/schemas/screenshot.ts, write a paginate function and a component, and register it here.
 */
export const RENDERERS: RendererRegistry = {
  conversation: {
    type: 'conversation',
    label: 'Conversation',
    description: 'One-to-one or group iMessage-style thread.',
    paginate: paginateConversation,
    Component: ConversationView,
  },
  notification: {
    type: 'notification',
    label: 'Lock-screen notification',
    description: 'Lock screen with clock and one or more notifications.',
    paginate: paginateNotification,
    Component: NotificationView,
  },
  'notification-center': {
    type: 'notification-center',
    label: 'Notification Center',
    description: 'Stacked, grouped notification cards.',
    paginate: paginateNotificationCenter,
    Component: NotificationCenterView,
  },
  'conversation-list': {
    type: 'conversation-list',
    label: 'Conversation list',
    description: 'Messages inbox with pinned and unread conversations.',
    paginate: paginateConversationList,
    Component: ConversationListView,
  },
};

export function getRenderer<T extends Screenshot>(type: T['type']): RendererDefinition<T> {
  const def = (RENDERERS as unknown as Record<string, RendererDefinition<T>>)[type];
  if (!def) throw new Error(`No renderer registered for screenshot type "${type}"`);
  return def;
}

export interface RenderOverrides {
  theme?: ScreenshotTheme;
  profile?: ExportProfileId;
}

/** One output image. Several pages may come from one authored screenshot (overflow). */
export interface RenderedPage {
  key: string;
  /** 1-based position among all rendered pages in the part — used in export filenames. */
  index: number;
  screenshotId: string;
  screenshotIndex: number;
  page: number;
  pages: number;
  profile: ExportProfile;
  shot: Screenshot;
  overflow: boolean;
}

export function characterMap(characters: Character[]): CharacterMap {
  return new Map(characters.map((c) => [c.id, c]));
}

/** Applies temporary preview overrides (never mutates source data) and paginates every screenshot. */
export function buildPages(part: Part, measurer: TextMeasurer, overrides: RenderOverrides = {}): RenderedPage[] {
  const out: RenderedPage[] = [];
  part.screenshots.forEach((source, si) => {
    const shot = { ...source, theme: overrides.theme ?? source.theme, exportProfile: overrides.profile ?? source.exportProfile } as Screenshot;
    const profile = getProfile(shot.exportProfile);
    const renderer = getRenderer(shot.type);
    const pages = renderer.paginate(shot as never, profile, measurer) as PaginatedShot<Screenshot>[];
    for (const pg of pages) {
      out.push({
        key: `${source.id}#${pg.page}`,
        index: out.length + 1,
        screenshotId: source.id,
        screenshotIndex: si + 1,
        page: pg.page,
        pages: pg.pages,
        profile,
        shot: pg.shot,
        overflow: pg.overflow,
      });
    }
  });
  return out;
}

export function ScreenshotRenderer({ page, characters }: { page: RenderedPage; characters: CharacterMap }) {
  const { Component } = getRenderer(page.shot.type) as RendererDefinition<Screenshot>;
  const props: ScreenProps = { shot: page.shot, page: page.page, pages: page.pages, profile: page.profile, characters };
  return <Component {...props} />;
}

export type { Story };
