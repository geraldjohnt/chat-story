import { z } from 'zod';
import { isoDateTimeSchema, nonEmpty, storyIdSchema } from './common';
import { screenshotSchema } from './screenshot';

/** "draft" parts exist but are not final; "final" parts count toward completedPartCount. */
export const PART_STATUSES = ['draft', 'final'] as const;

export const partSchema = z.looseObject({
  schemaVersion: z.literal(1),
  storyId: storyIdSchema,
  partNumber: z.number().int().min(1),
  title: nonEmpty,
  summary: z.string(),
  status: z.enum(PART_STATUSES),
  screenshots: z.array(screenshotSchema).min(1, 'A part needs at least one screenshot'),
  cliffhanger: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
