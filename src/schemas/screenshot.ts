import { z } from 'zod';
import { characterIdSchema, hexColorSchema, isoDateTimeSchema, nonEmpty } from './common';

export const SCREENSHOT_TYPES = ['conversation', 'notification', 'notification-center', 'conversation-list'] as const;
export const EXPORT_PROFILE_IDS = ['iphone', 'vertical-9-16'] as const;
export const SCREENSHOT_THEMES = ['light', 'dark'] as const;

export const screenshotThemeSchema = z.enum(SCREENSHOT_THEMES);
export const exportProfileIdSchema = z.enum(EXPORT_PROFILE_IDS);

export const statusBarSchema = z.looseObject({
  time: z.string().regex(/^\d{1,2}:\d{2}$/, 'Status-bar time must look like 9:41').optional(),
  battery: z.number().int().min(0).max(100).optional(),
  signal: z.number().int().min(0).max(4).optional(),
  wifi: z.boolean().optional(),
  charging: z.boolean().optional(),
});

/** Optional per-screenshot visual overrides. Everything is optional; renderer defaults apply. */
export const presentationSchema = z.looseObject({
  statusBar: statusBarSchema.optional(),
  showStatusBar: z.boolean().optional(),
  showComposer: z.boolean().optional(),
  composerText: z.string().optional(),
  outgoingBubbleColor: hexColorSchema.optional(),
  incomingBubbleColor: hexColorSchema.optional(),
  backgroundColor: hexColorSchema.optional(),
  wallpaper: z
    .looseObject({
      from: hexColorSchema,
      to: hexColorSchema,
      angle: z.number().min(0).max(360).optional(),
    })
    .optional(),
  fontScale: z.number().min(0.85).max(1.3).optional(),
  /** Unread badge shown next to the back chevron in a conversation header. */
  backBadgeCount: z.number().int().min(0).max(999).optional(),
  /** Hide the "Delivered"/"Read" receipt even if a message has one. */
  hideReceipts: z.boolean().optional(),
});

export const REACTION_TYPES = ['heart', 'thumbs-up', 'thumbs-down', 'haha', 'emphasis', 'question'] as const;

export const reactionSchema = z.looseObject({
  by: characterIdSchema,
  type: z.enum(REACTION_TYPES),
});

export const attachmentSchema = z.looseObject({
  type: z.enum(['image', 'video', 'file', 'link', 'voice', 'location', 'contact']),
  label: nonEmpty,
  /** Optional secondary line, e.g. a URL host or duration. */
  detail: z.string().optional(),
});

export const receiptSchema = z.looseObject({
  status: z.enum(['sending', 'sent', 'delivered', 'read', 'failed']),
  /** Display time shown after "Read", e.g. "9:42 PM". */
  at: z.string().optional(),
});

const textMessageSchema = z.looseObject({
  kind: z.literal('message'),
  id: nonEmpty,
  sender: characterIdSchema,
  text: z.string().optional(),
  attachment: attachmentSchema.optional(),
  sentAt: isoDateTimeSchema.optional(),
  reactions: z.array(reactionSchema).optional(),
  receipt: receiptSchema.optional(),
  unsent: z.boolean().optional(),
});

const timestampItemSchema = z.looseObject({
  kind: z.literal('timestamp'),
  id: nonEmpty,
  /** Display label, e.g. "Today 9:41 PM" or "Sat, Mar 8 at 11:02 PM". */
  label: nonEmpty,
  at: isoDateTimeSchema.optional(),
});

const typingItemSchema = z.looseObject({
  kind: z.literal('typing'),
  id: nonEmpty,
  sender: characterIdSchema,
});

const systemItemSchema = z.looseObject({
  kind: z.literal('system'),
  id: nonEmpty,
  text: nonEmpty,
});

export const conversationItemSchema = z
  .discriminatedUnion('kind', [textMessageSchema, timestampItemSchema, typingItemSchema, systemItemSchema])
  .superRefine((item, ctx) => {
    if (item.kind === 'message' && !item.text?.trim() && !item.attachment && !item.unsent) {
      ctx.addIssue({ code: 'custom', message: 'A message needs text, an attachment, or unsent: true' });
    }
  });

const baseScreenshot = {
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'Screenshot IDs are lowercase slugs, e.g. "s01"'),
  theme: screenshotThemeSchema,
  exportProfile: exportProfileIdSchema,
  presentation: presentationSchema.optional(),
  /** Free-form notes for authoring/continuity (never rendered). */
  meta: z.looseObject({ beat: z.string().optional(), notes: z.string().optional() }).optional(),
};

export const conversationScreenshotSchema = z.looseObject({
  ...baseScreenshot,
  type: z.literal('conversation'),
  /** Character whose phone is shown. Their messages are outgoing (right, blue). */
  deviceOwner: characterIdSchema,
  participants: z.array(characterIdSchema).min(2, 'A conversation needs at least two participants'),
  /** Header title. Defaults to the other participant's name or a comma-separated group name. */
  title: z.string().optional(),
  messages: z.array(conversationItemSchema).min(1, 'A conversation screenshot needs at least one item'),
});

export const notificationItemSchema = z.looseObject({
  id: nonEmpty,
  app: z.enum(['messages', 'phone', 'mail', 'calendar', 'photos', 'social', 'other']).default('messages'),
  appName: z.string().optional(),
  /** Sender character (for Messages notifications). */
  sender: characterIdSchema.optional(),
  /** Overrides the heading line; defaults to the sender's name. */
  title: z.string().optional(),
  body: nonEmpty,
  /** Display time, e.g. "now", "2m ago", "9:41 PM". */
  time: nonEmpty,
  /** Shows a stacked group with "+N more" when greater than 1. */
  groupCount: z.number().int().min(1).optional(),
});

const lockHeaderSchema = z.looseObject({
  time: z.string().regex(/^\d{1,2}:\d{2}$/, 'Lock-screen time must look like 9:41'),
  date: nonEmpty,
});

export const notificationScreenshotSchema = z.looseObject({
  ...baseScreenshot,
  type: z.literal('notification'),
  deviceOwner: characterIdSchema.optional(),
  lockScreen: lockHeaderSchema,
  notifications: z.array(notificationItemSchema).min(1),
});

export const notificationCenterScreenshotSchema = z.looseObject({
  ...baseScreenshot,
  type: z.literal('notification-center'),
  deviceOwner: characterIdSchema.optional(),
  lockScreen: lockHeaderSchema,
  notifications: z.array(notificationItemSchema).min(1),
});

export const conversationRowSchema = z.looseObject({
  id: nonEmpty,
  participants: z.array(characterIdSchema).min(1),
  /** Display name; defaults to participant names. */
  name: z.string().optional(),
  preview: z.string(),
  time: nonEmpty,
  unread: z.boolean().optional(),
  unreadCount: z.number().int().min(0).optional(),
  pinned: z.boolean().optional(),
  muted: z.boolean().optional(),
});

export const conversationListScreenshotSchema = z.looseObject({
  ...baseScreenshot,
  type: z.literal('conversation-list'),
  deviceOwner: characterIdSchema,
  title: z.string().optional(),
  conversations: z.array(conversationRowSchema).min(1),
});

export const screenshotSchema = z.discriminatedUnion('type', [
  conversationScreenshotSchema,
  notificationScreenshotSchema,
  notificationCenterScreenshotSchema,
  conversationListScreenshotSchema,
]);
