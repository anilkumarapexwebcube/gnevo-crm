# Gnevo CRM — Cloud Deployment Guide

Deploy a permanent, shareable version. Free/low-cost stack:

| Part | Host | Why |
|------|------|-----|
| **Database** | [Neon](https://neon.tech) (already used) | Serverless Postgres, free tier |
| **Redis** | [Upstash](https://upstash.com) | Serverless Redis for background jobs, free tier |
| **API** (`apps/api`) | [Railway](https://railway.app) or [Render](https://render.com) | Long-running Node server |
| **Workers** (`apps/workers`) | Same as API (2nd service) | BullMQ jobs (automations/webhooks/schedules) |
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

## Step 3 — Deploy the API (Railway example)
1. New Project → **Deploy from GitHub repo** → pick this repo.
2. Service settings:
   - **Root directory:** `/` (monorepo root)
   - **Build command:** `pnpm install --frozen-lockfile && pnpm build --filter @gnevo/api...`
   - **Start command:** `node apps/api/dist/main.js`
3. **Variables** (from `.env.example`): `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`,
   `JWT_REFRESH_SECRET`, `NODE_ENV=production`, `API_PORT=4000`,
   plus any optional keys (SMTP, AI, Stripe, Google). Set `API_URL`, `WEB_URL`,
   `CORS_ORIGINS`, `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN` after Step 5 (once you know the URLs).
4. Deploy → note the public API URL, e.g. `https://gnevo-api.up.railway.app`.
5. **Run migrations once** (Railway one-off command / shell):
   ```bash
   pnpm --filter @gnevo/db migrate:deploy
   pnpm db:seed        # optional demo data; skip in real prod and use Register instead
   ```

## Step 4 — Deploy the Workers (2nd service, same platform)
Same repo, new service:
- **Build:** `pnpm install --frozen-lockfile && pnpm build --filter @gnevo/workers...`
- **Start:** `node apps/workers/dist/main.js`
- **Variables:** `DATABASE_URL`, `REDIS_URL`, `NODE_ENV=production` (+ SMTP if you want scheduled report emails).

> No Redis / don't need automations? You can skip the Workers service entirely.

## Step 5 — Deploy the Web (Vercel)
1. **Add New Project** → import this repo.
2. Settings:
   - **Root Directory:** `apps/web`
   - Framework preset: **Next.js** (auto)
   - Install/Build are auto-detected (Vercel handles the pnpm monorepo).
3. **Environment Variables:**
   - `API_URL` = your deployed API URL (from Step 3), e.g. `https://gnevo-api.up.railway.app`
   - `NODE_ENV=production`
4. Deploy → note the web URL, e.g. `https://gnevo.vercel.app`.

## Step 6 — Wire the URLs together (important)
Now that both URLs exist, set these on the **API** service and redeploy it:
```
WEB_URL=https://gnevo.vercel.app
API_URL=https://gnevo-api.up.railway.app
CORS_ORIGINS=https://gnevo.vercel.app
WEBAUTHN_RP_ID=gnevo.vercel.app
WEBAUTHN_ORIGIN=https://gnevo.vercel.app
```
If you use Google Search Console, add this **Authorised redirect URI** in Google Cloud:
`https://gnevo-api.up.railway.app/v1/integrations/google/callback`

## Step 7 — First login
- Real use: open the web URL → **Register** to create your workspace (you become Owner),
  then invite your team from **Team**.
- Demo: if you ran `db:seed`, sign in with `owner@acme.test` / `DemoPassw0rd!` and change it.

---

## Render alternative (instead of Railway)
Render works the same. For the API: New **Web Service** → root `/`,
build `pnpm install --frozen-lockfile && pnpm build --filter @gnevo/api...`,
start `node apps/api/dist/main.js`. Workers: New **Background Worker** with the
workers build/start. Add the same env vars. (A `render.yaml` blueprint can automate
this — ask and I'll add one.)

---

## Gotchas & notes
- **Migrations** must run against the production DB once per deploy that changes the
  schema: `pnpm --filter @gnevo/db migrate:deploy`.
- **Files/avatars** are stored in Postgres (bytea). Fine for a demo/small team; for
  scale, swap to S3/R2 (there's a documented seam in the files module).
- **Secrets:** never commit real keys. Set them in each host's Variables UI. The repo
  has a CI **gitleaks** scan to catch accidental secret commits.
- **Cost:** Neon + Upstash + Vercel + Railway all have free tiers big enough for a
  demo/small team. Railway needs a card on file after the trial.
- **Cross-origin cookies:** the auth cookie is set by the Web app on its own domain and
  the browser never calls the API directly, so no third-party-cookie issues.

---

*For local setup instead, see `docs/SETUP-GUIDE.md`. For a quick throwaway demo without
deploying, use a Cloudflare/ngrok tunnel to `localhost:3000`.*
