import { z } from 'zod';
import { IdSchema, TimestampsSchema } from './common.js';

// ── Tickets ──

export const TicketStatusSchema = z.enum(['open', 'pending', 'resolved', 'closed']);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const TicketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;

export const CreateTicketRequestSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  priority: TicketPrioritySchema.default('medium'),
  customerId: IdSchema.optional(),
});
export type CreateTicketRequest = z.infer<typeof CreateTicketRequestSchema>;

export const UpdateTicketRequestSchema = z.object({
  status: TicketStatusSchema.optional(),
  priority: TicketPrioritySchema.optional(),
  assigneeId: IdSchema.nullable().optional(),
});
export type UpdateTicketRequest = z.infer<typeof UpdateTicketRequestSchema>;

export const AddTicketMessageSchema = z.object({
  body: z.string().min(1).max(5000),
});
export type AddTicketMessage = z.infer<typeof AddTicketMessageSchema>;

// ── Knowledge base ──

export const ArticleSchema = z
  .object({
    id: IdSchema,
    title: z.string(),
    body: z.string(),
    category: z.string().nullable(),
    keywords: z.string().nullable(),
    published: z.boolean(),
  })
  .merge(TimestampsSchema);
export type Article = z.infer<typeof ArticleSchema>;

/** Title: max 120 chars. Body (HTML from the rich text editor): max 100k chars. */
export const CreateArticleRequestSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(100000),
  category: z.string().max(60).optional(),
  keywords: z.string().max(300).optional(),
  published: z.boolean().default(false),
});
export type CreateArticleRequest = z.infer<typeof CreateArticleRequestSchema>;

export const UpdateArticleRequestSchema = CreateArticleRequestSchema.partial();
export type UpdateArticleRequest = z.infer<typeof UpdateArticleRequestSchema>;

// ── Announcements ──

export const CreateAnnouncementRequestSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});
export type CreateAnnouncementRequest = z.infer<typeof CreateAnnouncementRequestSchema>;
