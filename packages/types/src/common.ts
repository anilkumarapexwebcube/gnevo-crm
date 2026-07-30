import { z } from 'zod';

/** Branded id — a UUID string used across the domain. */
export const IdSchema = z.string().uuid();
export type Id = z.infer<typeof IdSchema>;

export const EmailSchema = z.string().email().max(320).toLowerCase();
export const SlugSchema = z
  .string()
  .min(2)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase kebab-case slug');

/** Keyset pagination query shared by all list endpoints. */
export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const PaginationMetaSchema = z.object({
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  limit: z.number().int(),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/** Generic paginated envelope. */
export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    pagination: PaginationMetaSchema,
  });
}

/** RFC 9457 Problem Details error shape returned by the API. */
export const ProblemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  requestId: z.string().optional(),
  errors: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

export const TimestampsSchema = z.object({
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
