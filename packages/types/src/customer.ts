import { z } from 'zod';
import { IdSchema, PaginationQuerySchema, TimestampsSchema } from './common.js';

export const CustomerTypeSchema = z.enum(['company', 'individual']);
export type CustomerType = z.infer<typeof CustomerTypeSchema>;

export const CustomerStatusSchema = z.enum(['active', 'prospect', 'churned', 'archived']);
export type CustomerStatus = z.infer<typeof CustomerStatusSchema>;

export const CustomerSchema = z
  .object({
    id: IdSchema,
    organizationId: IdSchema,
    name: z.string().min(1).max(160),
    type: CustomerTypeSchema,
    status: CustomerStatusSchema,
    industry: z.string().max(120).nullable(),
    website: z.string().max(200).nullable(),
    ownerId: IdSchema.nullable(),
  })
  .merge(TimestampsSchema);
export type Customer = z.infer<typeof CustomerSchema>;

export const CreateCustomerRequestSchema = z.object({
  name: z.string().min(1).max(160),
  type: CustomerTypeSchema.default('company'),
  industry: z.string().max(120).optional(),
  website: z.string().max(200).optional(),
  ownerId: IdSchema.optional(),
});
export type CreateCustomerRequest = z.infer<typeof CreateCustomerRequestSchema>;

export const UpdateCustomerRequestSchema = CreateCustomerRequestSchema.partial().extend({
  status: CustomerStatusSchema.optional(),
  // Values for admin-defined custom fields (key → value).
  custom: z.record(z.string()).optional(),
  tags: z.array(z.string().min(1).max(40)).max(50).optional(),
});
export type UpdateCustomerRequest = z.infer<typeof UpdateCustomerRequestSchema>;

export const ListCustomersQuerySchema = PaginationQuerySchema.extend({
  status: CustomerStatusSchema.optional(),
  type: CustomerTypeSchema.optional(),
  q: z.string().max(160).optional(),
});
export type ListCustomersQuery = z.infer<typeof ListCustomersQuerySchema>;

export const ContactSchema = z
  .object({
    id: IdSchema,
    organizationId: IdSchema,
    customerId: IdSchema.nullable(),
    name: z.string().min(1).max(160),
    email: z.string().email().nullable(),
    phone: z.string().max(40).nullable(),
    title: z.string().max(120).nullable(),
    isPrimary: z.boolean(),
  })
  .merge(TimestampsSchema);
export type Contact = z.infer<typeof ContactSchema>;

export const CreateContactRequestSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  title: z.string().max(120).optional(),
});
export type CreateContactRequest = z.infer<typeof CreateContactRequestSchema>;
