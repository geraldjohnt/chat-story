import { z } from 'zod';
import { characterIdSchema, isoDateTimeSchema, nonEmpty, slugSchema, storyIdSchema } from './common';

export const STORY_STATUSES = ['planned', 'ongoing', 'completed', 'on-hold'] as const;

export const characterSchema = z.looseObject({
  id: characterIdSchema,
  name: nonEmpty,
  /** Name as saved in contacts (shown in chat headers). Defaults to name. */
  contactName: z.string().optional(),
  role: z.string().optional(),
  age: z.number().int().min(0).max(130).optional(),
  description: z.string().default(''),
  avatar: z.looseObject({ initials: z.string().max(3).optional(), color: z.string().optional() }).optional(),
});

export const relationshipSchema = z.looseObject({
  from: characterIdSchema,
  to: characterIdSchema,
  type: nonEmpty,
  description: z.string().default(''),
});

export const secretSchema = z.looseObject({
  id: nonEmpty,
  holder: characterIdSchema,
  description: nonEmpty,
  revealedInPart: z.number().int().min(1).nullable().optional(),
});

export const plotOutlineEntrySchema = z.looseObject({
  partNumber: z.number().int().min(1),
  title: nonEmpty,
  beats: z.array(z.string()).default([]),
});

export const timelineEntrySchema = z.looseObject({
  id: nonEmpty,
  /** In-story time, e.g. "Week 1, Friday night" or an ISO date. */
  when: nonEmpty,
  event: nonEmpty,
  partNumber: z.number().int().min(1).optional(),
});

export const threadSchema = z.looseObject({
  id: nonEmpty,
  description: nonEmpty,
  introducedInPart: z.number().int().min(1).optional(),
  resolvedInPart: z.number().int().min(1).nullable().optional(),
});

export const partSummarySchema = z.looseObject({
  partNumber: z.number().int().min(1),
  title: nonEmpty,
  summary: z.string(),
});

export const storySchema = z.looseObject({
  schemaVersion: z.literal(1),
  id: storyIdSchema,
  title: nonEmpty,
  slug: slugSchema,
  genre: nonEmpty,
  tags: z.array(z.string()).optional(),
  language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
  setting: z.string(),
  premise: z.string(),
  synopsis: z.string(),
  characters: z.array(characterSchema),
  relationships: z.array(relationshipSchema),
  centralConflict: z.string(),
  secrets: z.array(secretSchema),
  plotOutline: z.array(plotOutlineEntrySchema),
  plannedEnding: z.string(),
  continuity: z.array(z.string()),
  timeline: z.array(timelineEntrySchema),
  unresolvedThreads: z.array(threadSchema),
  plannedPartCount: z.number().int().min(0),
  completedPartCount: z.number().int().min(0),
  status: z.enum(STORY_STATUSES),
  partSummaries: z.array(partSummarySchema),
  /** Marks development fixtures. Production validation rejects fixture stories. */
  fixture: z.boolean().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
