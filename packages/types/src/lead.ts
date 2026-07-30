import { z } from 'zod';
import { EmailSchema, IdSchema, PaginationQuerySchema, TimestampsSchema } from './common.js';

export const LeadStatusSchema = z.enum([
  'new',
  'contacted',
  'qualified',
  'unqualified',
  'converted',
]);
export type LeadStatus = z.infer<typeof LeadStatusSchema>;

export const LeadSourceSchema = z.enum([
  'website',
  'google_ads',
  'organic',
  'referral',
  'social',
  'email',
  'manual',
  'import',
  'other',
]);
export type LeadSource = z.infer<typeof LeadSourceSchema>;

export const LeadSchema = z
  .object({
    id: IdSchema,
    organizationId: IdSchema,
    name: z.string().min(1).max(160),
    email: EmailSchema.nullable(),
    phone: z.string().max(40).nullable(),
    company: z.string().max(160).nullable(),
    status: LeadStatusSchema,
    source: LeadSourceSchema,
    score: z.number().int().min(0).max(100).nullable(),
    ownerId: IdSchema.nullable(),
  })
  .merge(TimestampsSchema);
export type Lead = z.infer<typeof LeadSchema>;

export const CreateLeadRequestSchema = z.object({
  name: z.string().min(1).max(160),
  email: EmailSchema.optional(),
  phone: z.string().max(40).optional(),
  company: z.string().max(160).optional(),
  source: LeadSourceSchema.default('manual'),
  ownerId: IdSchema.optional(),
});
export type CreateLeadRequest = z.infer<typeof CreateLeadRequestSchema>;

export const UpdateLeadRequestSchema = CreateLeadRequestSchema.partial().extend({
  status: LeadStatusSchema.optional(),
  score: z.number().int().min(0).max(100).optional(),
  tags: z.array(z.string().min(1).max(40)).max(50).optional(),
});
export type UpdateLeadRequest = z.infer<typeof UpdateLeadRequestSchema>;

export const ListLeadsQuerySchema = PaginationQuerySchema.extend({
  status: LeadStatusSchema.optional(),
  source: LeadSourceSchema.optional(),
  ownerId: IdSchema.optional(),
  q: z.string().max(160).optional(),
});
export type ListLeadsQuery = z.infer<typeof ListLeadsQuerySchema>;
