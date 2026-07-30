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
   - **Build Command:** `pnpm install --frozen-lockfile && pnpm --filter @gnevo/api... build`
   - **Start Command:** `node apps/api/dist/main.js`
   - **Instance Type:** Free (or Starter if you need it always-on without spin-down)
3. **Environment** tab → add vars (from `.env.example`): `DATABASE_URL`, `REDIS_URL`,
   `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV=production`,
   plus any optional keys (SMTP, AI, Stripe, Google). Set `API_URL`, `WEB_URL`,
   `CORS_ORIGINS`, `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN` after Step 5 (once you know the URLs).
   > **Port:** don't set `API_PORT` on Render — the app binds Render's injected `PORT`
   > automatically (falls back to `API_PORT`/4000 only for local dev). Nothing to do here.
4. Deploy → note the public API URL, e.g. `https://gnevo-api.onrender.com`.
5. **Run migrations once** (Render → your service → **Shell** tab, or a one-off Job).
   Run Prisma directly — the `pnpm` scripts wrap `dotenv -e ../../.env`, but on Render
   there is **no `.env` file** (vars live in the environment), so call the binary directly:
   ```bash
   pnpm --filter @gnevo/db exec prisma migrate deploy
   pnpm --filter @gnevo/db exec tsx prisma/seed.ts   # optional demo data; skip in real prod, use Register instead
   ```

## Step 4 — Deploy the Workers (Render Background Worker)
Same repo, new Render service — this time pick **Background Worker** (not Web Service),
since workers don't need to accept HTTP traffic:
- **Root Directory:** `/`
- **Build Command:** `pnpm install --frozen-lockfile && pnpm --filter @gnevo/workers... build`
- **Start Command:** `node apps/workers/dist/main.js`
- **Environment:** `DATABASE_URL`, `REDIS_URL`, `NODE_ENV=production` (+ SMTP if you want scheduled report emails).

> No Redis / don't need automations? You can skip the Workers service entirely.

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

## Step 7 — First login
- Real use: open the web URL → **Register** to create your workspace (you become Owner),
  then invite your team from **Team**.
- Demo: if you ran `db:seed`, sign in with `owner@acme.test` / `DemoPassw0rd!` and change it.

---

## Render specifics & tips
- **Free tier spin-down:** Render's free Web Services spin down after ~15 min of
  inactivity and take ~30–50s to wake on the next request. Fine for a demo; annoying
  for a live team tool. Upgrade the API service to **Starter** ($7/mo) if you want it
  always warm — the Web (Vercel) side stays free either way.
- **`render.yaml` blueprint:** you can define both the API (Web Service) and Workers
  (Background Worker) in one `render.yaml` at the repo root so both spin up together
  from a single "New Blueprint" deploy. Ask and I'll add one.
- **Health check path:** set it to `/health` — the API exposes `/health`, `/health/live`
  and `/health/ready` (these are excluded from the `/v1` prefix, so no `/v1` on them).
- **Shell access:** the **Shell** tab on a Render service gives you a one-off terminal in
  the running container — that's where you run the migration command in Step 3.5.
- **Auto-deploy:** by default Render redeploys on every push to your connected branch;
  turn this off in settings if you want manual deploys only.

---

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