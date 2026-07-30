import { z } from 'zod';
import { EmailSchema, IdSchema, SlugSchema } from './common.js';
import { SystemRoleSchema } from './rbac.js';

export const PasswordSchema = z
  .string()
  .min(12, 'password must be at least 12 characters')
  .max(128)
  .regex(/[a-z]/, 'must contain a lowercase letter')
  .regex(/[A-Z]/, 'must contain an uppercase letter')
  .regex(/[0-9]/, 'must contain a number');

export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1),
  // Optional org slug for users who belong to multiple orgs.
  organizationSlug: SlugSchema.optional(),
  // Optional TOTP code — required only when the account has 2FA enabled.
  code: z.string().min(6).max(8).optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  fullName: z.string().min(1).max(120),
  organizationName: z.string().min(1).max(120),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int(),
});
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

/** The authenticated principal carried through the request context. */
export const AuthUserSchema = z.object({
  id: IdSchema,
  organizationId: IdSchema,
  email: EmailSchema,
  fullName: z.string(),
  roles: z.array(SystemRoleSchema.or(z.string())),
  mfaEnabled: z.boolean(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

/** JWT access-token payload. */
export const AccessTokenPayloadSchema = z.object({
  sub: IdSchema, // user id
  org: IdSchema, // organization id (tenant)
  roles: z.array(z.string()),
  type: z.literal('access'),
  sid: IdSchema.optional(), // session id — enables server-side revocation
});
export type AccessTokenPayload = z.infer<typeof AccessTokenPayloadSchema>;

export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
