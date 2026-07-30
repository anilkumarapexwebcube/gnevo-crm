import { z } from 'zod';
import { IdSchema, TimestampsSchema } from './common.js';

export const DealStatusSchema = z.enum(['open', 'won', 'lost']);
export type DealStatus = z.infer<typeof DealStatusSchema>;

export const PipelineStageSchema = z.object({
  id: IdSchema,
  organizationId: IdSchema,
  pipelineId: IdSchema,
  name: z.string(),
  position: z.number().int(),
});
export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export const PipelineSchema = z.object({
  id: IdSchema,
  organizationId: IdSchema,
  name: z.string(),
  isDefault: z.boolean(),
  stages: z.array(PipelineStageSchema),
});
export type Pipeline = z.infer<typeof PipelineSchema>;

export const DealSchema = z
  .object({
    id: IdSchema,
    organizationId: IdSchema,
    pipelineId: IdSchema,
    stageId: IdSchema,
    title: z.string().min(1).max(200),
    value: z.coerce.number().nonnegative(),
    currency: z.string().length(3),
    status: DealStatusSchema,
    ownerId: IdSchema.nullable(),
    customerId: IdSchema.nullable(),
  })
  .merge(TimestampsSchema);
export type Deal = z.infer<typeof DealSchema>;

export const CreateDealRequestSchema = z.object({
  title: z.string().min(1).max(200),
  value: z.coerce.number().nonnegative().default(0),
  currency: z.string().length(3).default('USD'),
  stageId: IdSchema,
  ownerId: IdSchema.optional(),
  customerId: IdSchema.optional(),
});
export type CreateDealRequest = z.infer<typeof CreateDealRequestSchema>;

export const UpdateDealRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  value: z.coerce.number().nonnegative().optional(),
  stageId: IdSchema.optional(),
  status: DealStatusSchema.optional(),
  ownerId: IdSchema.nullable().optional(),
});
export type UpdateDealRequest = z.infer<typeof UpdateDealRequestSchema>;

/** Move a deal to another stage (Kanban drag-drop). */
export const MoveDealRequestSchema = z.object({
  stageId: IdSchema,
});
export type MoveDealRequest = z.infer<typeof MoveDealRequestSchema>;
