import type { z } from 'zod';
import type {
  storySchema, partSchema, manifestSchema, manifestEntrySchema, screenshotSchema, conversationScreenshotSchema,
  notificationScreenshotSchema, notificationCenterScreenshotSchema, conversationListScreenshotSchema,
  conversationItemSchema, notificationItemSchema, conversationRowSchema, characterSchema, presentationSchema,
  accessGateConfigSchema, SCREENSHOT_TYPES, EXPORT_PROFILE_IDS, STORY_STATUSES,
} from '../schemas';

export type Story = z.infer<typeof storySchema>;
export type StoryStatus = (typeof STORY_STATUSES)[number];
export type Character = z.infer<typeof characterSchema>;
export type Part = z.infer<typeof partSchema>;
export type Manifest = z.infer<typeof manifestSchema>;
export type ManifestEntry = z.infer<typeof manifestEntrySchema>;
export type Screenshot = z.infer<typeof screenshotSchema>;
export type ScreenshotType = (typeof SCREENSHOT_TYPES)[number];
export type ExportProfileId = (typeof EXPORT_PROFILE_IDS)[number];
export type ConversationScreenshot = z.infer<typeof conversationScreenshotSchema>;
export type NotificationScreenshot = z.infer<typeof notificationScreenshotSchema>;
export type NotificationCenterScreenshot = z.infer<typeof notificationCenterScreenshotSchema>;
export type ConversationListScreenshot = z.infer<typeof conversationListScreenshotSchema>;
export type ConversationItem = z.infer<typeof conversationItemSchema>;
export type MessageItem = Extract<ConversationItem, { kind: 'message' }>;
export type NotificationItem = z.infer<typeof notificationItemSchema>;
export type ConversationRow = z.infer<typeof conversationRowSchema>;
export type Presentation = z.infer<typeof presentationSchema>;
export type ScreenshotTheme = 'light' | 'dark';
export type AccessGateConfig = z.infer<typeof accessGateConfigSchema>;
