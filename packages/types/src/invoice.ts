import { z } from 'zod';
import { IdSchema, PaginationQuerySchema, TimestampsSchema } from './common.js';

export const InvoiceStatusSchema = z.enum(['draft', 'pending', 'sent', 'paid', 'void']);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const InvoiceLineSchema = z.object({
  id: IdSchema,
  description: z.string().min(1).max(300),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().nonnegative(),
});
export type InvoiceLine = z.infer<typeof InvoiceLineSchema>;

export const InvoiceSchema = z
  .object({
    id: IdSchema,
    organizationId: IdSchema,
    customerId: IdSchema.nullable(),
    number: z.string(),
    status: InvoiceStatusSchema,
    currency: z.string().length(3),
    notes: z.string().nullable(),
  })
  .merge(TimestampsSchema);
export type Invoice = z.infer<typeof InvoiceSchema>;

export const CreateInvoiceLineSchema = z.object({
  description: z.string().min(1).max(300),
  quantity: z.coerce.number().int().min(1).default(1),
  unitPrice: z.coerce.number().nonnegative().default(0),
});

export const CreateInvoiceRequestSchema = z.object({
  customerId: IdSchema.optional(),
  currency: z.string().length(3).default('USD'),
  status: InvoiceStatusSchema.optional(),
  dueDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
  lines: z.array(CreateInvoiceLineSchema).min(1).max(50),
});
export type CreateInvoiceRequest = z.infer<typeof CreateInvoiceRequestSchema>;

export const UpdateInvoiceStatusSchema = z.object({
  status: InvoiceStatusSchema,
});
export type UpdateInvoiceStatus = z.infer<typeof UpdateInvoiceStatusSchema>;

export const ListInvoicesQuerySchema = PaginationQuerySchema.extend({
  status: InvoiceStatusSchema.optional(),
});
export type ListInvoicesQuery = z.infer<typeof ListInvoicesQuerySchema>;
