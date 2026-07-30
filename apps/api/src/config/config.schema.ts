import { z } from 'zod';

/** Treat an empty string (e.g. `FOO=` in .env) as "not set" for optional keys. */
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const optionalStr = z.preprocess(emptyToUndefined, z.string().optional());

/**
 * Environment schema. The app validates process.env against this at boot and
 * refuses to start if anything is missing/invalid (fail fast).
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().url(),
  DATABASE_REPLICA_URL: optionalUrl,
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),

  API_PORT: z.coerce.number().int().positive().default(4000),
  API_URL: z.string().url().default('http://localhost:4000'),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Google OAuth (for GSC integration) — optional.
  GOOGLE_CLIENT_ID: optionalStr,
  GOOGLE_CLIENT_SECRET: optionalStr,

  // AI providers (all optional — engine routes to the first available key).
  GROQ_API_KEY: optionalStr,
  OPENROUTER_API_KEY: optionalStr,
  OPENAI_API_KEY: optionalStr,
  ANTHROPIC_API_KEY: optionalStr,
  GOOGLE_AI_API_KEY: optionalStr,
  DEEPSEEK_API_KEY: optionalStr,
  XAI_API_KEY: optionalStr,

  // Payments (Stripe) — optional.
  STRIPE_SECRET_KEY: optionalStr,
  STRIPE_PUBLISHABLE_KEY: optionalStr,

  // WebAuthn passkeys — RP id (host) + expected origin. Defaults suit localhost.
  WEBAUTHN_RP_ID: z.preprocess(emptyToUndefined, z.string().default('localhost')),
  WEBAUTHN_ORIGIN: z.preprocess(emptyToUndefined, z.string().url().default('http://localhost:3000')),

  // Transactional email (magic link) — optional; without it links are returned
  // in dev responses instead of emailed.
  SMTP_HOST: optionalStr,
  SMTP_PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  SMTP_USER: optionalStr,
  SMTP_PASS: optionalStr,
  SMTP_FROM: optionalStr,
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`❌ Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
