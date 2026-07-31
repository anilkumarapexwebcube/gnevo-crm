# Gnevo CRM — Cloud Deployment Guide

Deploy a permanent, shareable version. Free/low-cost stack:

| Part | Host | Why |
|------|------|-----|
| **Database** | [Neon](https://neon.tech) (already used) | Serverless Postgres, free tier |
| **Redis** | [Upstash](https://upstash.com) | Serverless Redis for background jobs, free tier |
| **API** (`apps/api`) | [Render](https://render.com) | Long-running Node server (Web Service) |
| **Workers** (`apps/workers`) | [Render](https://render.com) (Background Worker) | BullMQ jobs (automations/webhooks/schedules) |
| **Web** (`apps/web`) | [Vercel](https://vercel.com) | Best Next.js host, free tier |

> The browser only talks to the **Web** app; the Web app talks to the **API**
> server-to-server via `API_URL`. So Web is public, API can be public too (needed
> for the Google OAuth callback + so Web can reach it).

---

## Step 0 — Push the code to GitHub
All three hosts deploy from a Git repo.
```bash
git add -A && git commit -m "Deploy" && git push
```

## Step 1 — Database (Neon)
You already have it. In the Neon dashboard copy the **pooled** connection string
(`...-pooler...`), keep `?sslmode=require`. Save it as `DATABASE_URL`.

## Step 2 — Redis (Upstash)
Create a Redis database → copy the **`redis://` (or `rediss://`) URL**. Save as `REDIS_URL`.

## Step 3 — Deploy the API (Render)
1. Render dashboard → **New +** → **Web Service** → **Build and deploy from a Git repository** → pick this repo.
2. Service settings:
   - **Root Directory:** `/` (monorepo root)
   - **Runtime:** Node
   - **Build Command:** `pnpm install --frozen-lockfile --prod=false && pnpm --filter @gnevo/api... build`
     > `--prod=false` is required because `NODE_ENV=production` makes pnpm skip
     > devDependencies (`typescript`, `@gnevo/config`'s shared tsconfigs) that the
     > build needs. Runtime only needs the built `dist/`, so keep `NODE_ENV=production`.
   - **Start Command:** `node apps/api/dist/main.js`
   - **Instance Type:** Free (or Starter if you need it always-on without spin-down)
3. **Environment** tab → add vars (from `.env.example`): `DATABASE_URL`, `REDIS_URL`,
   `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV=production`,
   plus any optional keys (SMTP, AI, Stripe, Google). Set `API_URL`, `WEB_URL`,
   `CORS_ORIGINS`, `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN` after Step 5 (once you know the URLs).
   > **Port:** don't set `API_PORT` on Render — the app binds Render's injected `PORT`
   > automatically (falls back to `API_PORT`/4000 only for local dev). Nothing to do here.
4. Deploy → note the public API URL, e.g. `https://gnevo-api.onrender.com`.
5. **Run migrations.** Render's **Shell** and one-off **Jobs** are paid-only, so on the
   free tier use ONE of these:
   - **Easiest (run once from your machine):** your local `.env` `DATABASE_URL` already
     points at the same Neon DB, so run locally: `pnpm --filter @gnevo/db migrate:deploy`
     (optionally `pnpm --filter @gnevo/db exec tsx prisma/seed.ts` to pre-seed permissions
     + RLS — no demo data is created; you make your workspace via Register).
   - **Automatic (recommended):** prepend migrations to the **Start Command** so every
     deploy applies pending migrations before booting (idempotent, no Shell needed):
     ```
     pnpm --filter @gnevo/db exec prisma migrate deploy && node apps/api/dist/main.js
     ```
   > The `pnpm` scripts wrap `dotenv -e ../../.env`; on Render there's no `.env` file, so
   > the automatic option calls the Prisma binary directly (env vars come from the service).

## Step 4 — Deploy the Workers (Render Background Worker)
Same repo, new Render service — this time pick **Background Worker** (not Web Service),
since workers don't need to accept HTTP traffic:
- **Root Directory:** `/`
- **Build Command:** `pnpm install --frozen-lockfile --prod=false && pnpm --filter @gnevo/workers... build`
- **Start Command:** `node apps/workers/dist/main.js`
- **Environment:** `DATABASE_URL`, `REDIS_URL`, `NODE_ENV=production` (+ SMTP if you want scheduled report emails).

> **Render Background Workers have NO free tier** (minimum paid ~$7/mo) — only Web
> Services and Static Sites are free. Options: **(a) skip Workers for now** — the CRM
> (API + Web) runs fine without it; only background jobs (automations, webhook delivery,
> scheduled report emails) won't run until you add it. **(b)** pay for a Render Starter
> worker. **(c)** run the worker on a free-tier alt (Fly.io / Railway). Add it later when
> you actually need automations — nothing else depends on it.

## Step 5 — Deploy the Web (Vercel)
1. **Add New Project** → import this repo.
2. Settings:
   - **Root Directory:** `apps/web`
   - Framework preset: **Next.js** (auto)
   - Install/Build are auto-detected (Vercel handles the pnpm monorepo).
3. **Environment Variables:**
   - `API_URL` = your deployed API URL (from Step 3), e.g. `https://gnevo-api.onrender.com`
   - `NODE_ENV=production`
4. Deploy → note the web URL, e.g. `https://gnevo.vercel.app`.

## Step 6 — Wire the URLs together (important)
Now that both URLs exist, set these on the **API** service (Render → Environment) and redeploy it:
```
WEB_URL=https://gnevo.vercel.app
API_URL=https://gnevo-api.onrender.com
CORS_ORIGINS=https://gnevo.vercel.app
WEBAUTHN_RP_ID=gnevo.vercel.app
WEBAUTHN_ORIGIN=https://gnevo.vercel.app
```
If you use Google Search Console, add this **Authorised redirect URI** in Google Cloud:
`https://gnevo-api.onrender.com/v1/integrations/google/callback`

## Step 6.5 — Email (SMTP) — REQUIRED for magic links, invites & password reset
These features **email a link** to the user. If SMTP isn't configured the API can't send
mail — it just logs the link to the server console (invisible on a cloud host), so users
never receive it. Set these on the **API** service (Render → Environment) and redeploy:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your Gmail / Google Workspace address>
SMTP_PASS=<16-char Gmail App Password — NOT your normal password>
SMTP_FROM=Gnevo CRM <your address>
```
Gmail needs 2-Step Verification on + an **App Password** (Google Account → Security →
App passwords). Works for a demo, but Gmail-sent mail often lands in **Spam** — for
production use a transactional provider (Resend / Brevo / SendGrid) with your own domain
verified (SPF/DKIM); just swap `SMTP_HOST/USER/PASS` for theirs.

## Step 7 — First login
- Open the web URL → **Register** to create your workspace (the first account becomes the
  **Owner**), then invite your team from **Team**. There are no demo/seed accounts.

---

## Render specifics & tips
- **Free tier spin-down:** Render's free Web Services spin down after ~15 min of
  inactivity and take ~30–50s to wake on the next request. Fine for a demo; annoying
  for a live team tool. Upgrade the API service to **Starter** ($7/mo) if you want it
  always warm — the Web (Vercel) side stays free either way.
- **`render.yaml` blueprint:** you can define both the API (Web Service) and Workers
  (Background Worker) in one `render.yaml` at the repo root so both spin up together
  from a single "New Blueprint" deploy. Ask and I'll add one.
- **Health check path:** set it to `/health/live` (simple liveness). The API exposes
  `/health/live` (returns `{status:'ok'}`) and `/health/ready` (also checks the DB) —
  there is **no bare `/health`**. Both are excluded from the `/v1` prefix.
- **Shell access:** the **Shell** tab on a Render service gives you a one-off terminal in
  the running container — that's where you run the migration command in Step 3.5.
- **Auto-deploy:** by default Render redeploys on every push to your connected branch;
  turn this off in settings if you want manual deploys only.

---

## Full environment variable reference (API service)
| Variable | Required? | Enables / notes |
|----------|-----------|-----------------|
| `DATABASE_URL` | ✅ required | Neon Postgres connection string |
| `REDIS_URL` | ✅ required | Upstash Redis (no quotes in the UI) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ✅ required | ≥16 chars; use strong random in prod (`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`) |
| `NODE_ENV` | ✅ `production` | (Render only — do NOT set on Vercel) |
| `API_URL` | ✅ | This service's own public URL (non-empty, no trailing `/`) |
| `WEB_URL` | ✅ | Vercel URL, no trailing `/` — used in emailed links |
| `CORS_ORIGINS` | ✅ | Vercel origin, no trailing `/`, comma-separated for multiple |
| `WEBAUTHN_RP_ID` | ✅ | web **domain only** (no scheme, no `/`) — passkeys |
| `WEBAUTHN_ORIGIN` | ✅ | full web origin, no trailing `/` |
| `SMTP_HOST/PORT/USER/PASS/FROM` | for email | magic link, invitations, password reset (see Step 6.5) |
| `GROQ_API_KEY` *(or any one AI key)* | for AI | AI Assistant + AI Search. Others: `OPENAI_/ANTHROPIC_/GOOGLE_AI_/OPENROUTER_/DEEPSEEK_/XAI_API_KEY` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | for GSC | Google Search Console integration (redirect URI `${API_URL}/v1/integrations/google/callback`, scope `webmasters.readonly`) |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | for payments | Stripe billing |
| `DATABASE_REPLICA_URL`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` | optional | sensible defaults; leave unset |

> **Vercel (web) service** only needs `API_URL=<your Render API URL>`. Do **not** set
> `NODE_ENV` there (it breaks the pnpm devDependency install).

## Gotchas & notes
- **Migrations** must run against the production DB once per deploy that changes the
  schema: `pnpm --filter @gnevo/db migrate:deploy`.
- **Files/avatars** are stored in Postgres (bytea). Fine for a demo/small team; for
  scale, swap to S3/R2 (there's a documented seam in the files module).
- **Secrets:** never commit real keys. Set them in each host's Environment/Variables UI.
  The repo has a CI **gitleaks** scan to catch accidental secret commits.
- **Cost:** Neon + Upstash + Vercel + Render all have free tiers big enough for a
  demo/small team. No card required for Render's free tier (unlike Railway, which
  needs one after the trial).
- **Cross-origin cookies:** the auth cookie is set by the Web app on its own domain and
  the browser never calls the API directly, so no third-party-cookie issues.

---

*For local setup instead, see `docs/SETUP-GUIDE.md`. For a quick throwaway demo without
deploying, use a Cloudflare/ngrok tunnel to `localhost:3000`.*