import { z } from 'zod';
import { EmailSchema, IdSchema, TimestampsSchema } from './common.js';

export const UserStatusSchema = z.enum(['active', 'invited', 'suspended', 'disabled']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const UserSchema = z
  .object({
    id: IdSchema,
    organizationId: IdSchema,
    email: EmailSchema,
    fullName: z.string().min(1).max(120),
    status: UserStatusSchema,
    departmentId: IdSchema.nullable(),
    officeId: IdSchema.nullable(),
    mfaEnabled: z.boolean(),
    lastActiveAt: z.coerce.date().nullable(),
  })
  .merge(TimestampsSchema);
export type User = z.infer<typeof UserSchema>;

export const InviteUserRequestSchema = z.object({
  email: EmailSchema,
  fullName: z.string().min(1).max(120),
  roleKeys: z.array(z.string()).min(1),
  departmentId: IdSchema.optional(),
  officeId: IdSchema.optional(),
});
export type InviteUserRequest = z.infer<typeof InviteUserRequestSchema>;
