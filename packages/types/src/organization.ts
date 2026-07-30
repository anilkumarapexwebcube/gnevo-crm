import { z } from 'zod';
import { IdSchema, SlugSchema, TimestampsSchema } from './common.js';

export const OrgPlanSchema = z.enum(['trial', 'starter', 'growth', 'enterprise']);
export type OrgPlan = z.infer<typeof OrgPlanSchema>;

export const OrganizationSchema = z
  .object({
    id: IdSchema,
    name: z.string().min(1).max(120),
    slug: SlugSchema,
    plan: OrgPlanSchema,
  })
  .merge(TimestampsSchema);
export type Organization = z.infer<typeof OrganizationSchema>;
