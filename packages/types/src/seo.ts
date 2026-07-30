import { z } from 'zod';
import { IdSchema, TimestampsSchema } from './common.js';

export const SeoProjectSchema = z
  .object({
    id: IdSchema,
    organizationId: IdSchema,
    customerId: IdSchema.nullable(),
    name: z.string().min(1).max(160),
    siteUrl: z.string().url(),
    gscConnected: z.boolean(),
  })
  .merge(TimestampsSchema);
export type SeoProject = z.infer<typeof SeoProjectSchema>;

export const CreateSeoProjectRequestSchema = z.object({
  name: z.string().min(1).max(160),
  siteUrl: z.string().url(),
  customerId: IdSchema.optional(),
});
export type CreateSeoProjectRequest = z.infer<typeof CreateSeoProjectRequestSchema>;

export const KeywordSchema = z.object({
  id: IdSchema,
  seoProjectId: IdSchema,
  term: z.string().min(1).max(200),
  position: z.number().int().nullable(),
  clicks: z.number().int(),
  impressions: z.number().int(),
});
export type Keyword = z.infer<typeof KeywordSchema>;

export const CreateKeywordRequestSchema = z.object({
  seoProjectId: IdSchema,
  term: z.string().min(1).max(200),
  position: z.coerce.number().int().min(1).max(200).optional(),
});
export type CreateKeywordRequest = z.infer<typeof CreateKeywordRequestSchema>;

export const UpdateKeywordRequestSchema = z.object({
  position: z.coerce.number().int().min(1).max(200).nullable().optional(),
  clicks: z.coerce.number().int().min(0).optional(),
  impressions: z.coerce.number().int().min(0).optional(),
});
export type UpdateKeywordRequest = z.infer<typeof UpdateKeywordRequestSchema>;
