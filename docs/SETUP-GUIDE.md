# Gnevo CRM — Setup & Run Guide

How to run this project on a fresh machine, step by step. Follow the sections in order.

---

## 1. What you need (prerequisites)

| Tool | Version | Required? | Notes |
|------|---------|-----------|-------|
| **Node.js** | 20 LTS or 22 | ✅ | https://nodejs.org |
| **pnpm** | 9+ | ✅ | `npm i -g pnpm` (or use `corepack enable`) |
| **PostgreSQL** | 16 / 17 | ✅ | Local install **or** free cloud [Neon](https://neon.tech) |
| **Redis** | 7+ | ⭕ optional | Only for background jobs (automations, webhooks, scheduled). Free cloud: [Upstash](https://upstash.com). Skip it and run `dev:core`. |
| **SMTP** | — | ⭕ optional | For real invite / reset emails. Without it, links print to the API console. Gmail App Password or [Mailtrap](https://mailtrap.io) work. |
| **AI key** | — | ⭕ optional | Enables AI chat / summaries / insights. RAG search needs OpenAI **or** Google AI. |

> **Windows note:** everything works on Windows. If a build ever fails with
> `EPERM … query_engine-windows.dll.node`, a `node` process is holding the file —
> stop running dev servers, then rebuild. Use PowerShell or Git Bash.

---

## 2. Get the code & install

```bash
# from the folder where you keep projects
git clone <your-repo-url> gnevo-crm
cd gnevo-crm

pnpm install
```

This is a pnpm + Turborepo monorepo:

```
apps/
  api      → NestJS REST API        (http://localhost:4000)
  web      → Next.js 15 app          (http://localhost:3000)
  workers  → BullMQ background jobs   (needs Redis)
packages/
  db       → Prisma schema + client + migrations
  types    → shared Zod contracts
  auth     → password hashing + RBAC
  ai       → multi-provider AI + embeddings
  config   → shared tsconfig/eslint
```

---

## 3. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set at least these (everything else is optional):

1. **`DATABASE_URL`** — your Postgres connection string
   (Neon: copy the "pooled connection string", keep `?sslmode=require`).
2. **`JWT_ACCESS_SECRET`** and **`JWT_REFRESH_SECRET`** — long random strings:
   ```bash
   openssl rand -hex 32
   ```
3. Leave `SMTP_*`, `REDIS_URL`, AI keys, Stripe, Google blank for a first run — the
   app runs fine without them (emails just log to the console).

There is **one** `.env` in the repo root — the API, DB scripts, and workers all read it.

---

## 4. Build, migrate, seed

Run these once, in order:

```bash
pnpm build                                   # compile shared packages (required before DB scripts)
pnpm --filter @gnevo/db migrate:deploy       # apply all database migrations
pnpm db:seed                                 # create demo org, roles, and login
```

`db:seed` creates a demo workspace and this login:

```
Email:    owner@acme.test
Password: DemoPassw0rd!
```

> Fresh dev DB and want migrations tracked as you change the schema? use
> `pnpm db:migrate` (migrate:dev) instead of `migrate:deploy`.

---

## 5. Run it

```bash
# Full stack (api + web + workers) — needs REDIS_URL set
pnpm dev

# OR: just api + web (no Redis needed; background jobs won't run)
pnpm dev:core
```

Then open **http://localhost:3000** and sign in with the demo login above.

- Web app: http://localhost:3000
- API: http://localhost:4000  (Swagger docs at `/docs` if enabled)

---

## 6. First things to try

1. **Sign in** as `owner@acme.test`.
2. **Team** (sidebar → Admin → Team): invite a teammate by email, pick a role
   (Owner / Admin / HR / Manager / Employee / Viewer). If SMTP is off, the invite
   link is printed in the **API server console** — open it to accept.
3. **Structure**: create Offices → Departments → Teams; view the **Org chart**.
4. **Roles**: open the permission matrix; create/clone a custom role; import/export role JSON.
5. **HR**: clock in/out, request leave, see Analytics.
6. **AI Search** (`/search`): click **Reindex** (needs an OpenAI or Google AI key), then search.

---

## 7. Common commands

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Run api + web + workers (watch mode) |
| `pnpm dev:core` | Run api + web only (no Redis) |
| `pnpm build` | Build all apps & packages |
| `pnpm --filter @gnevo/db migrate:deploy` | Apply existing DB migrations |
| `pnpm db:migrate` | Create + apply a new migration (dev) |
| `pnpm db:seed` | Seed demo data |
| `pnpm db:studio` | Open Prisma Studio (browse the DB) |
| `pnpm lint` / `pnpm typecheck` | Lint / type-check everything |

---

## 8. Optional services — when you want them

- **Redis (background jobs):** set `REDIS_URL` (Upstash free tier works) and run `pnpm dev`.
  Powers automations, outbound webhooks, scheduled reports, weekly client snapshots.
- **Email:** fill `SMTP_HOST/PORT/USER/PASS/FROM`. Gmail needs an *App Password*
  (not your normal password). Real invite/reset/report emails then send.
- **AI:** add any provider key (Groq is free and used first). For **AI Search**
  (semantic/RAG) you specifically need `OPENAI_API_KEY` or `GOOGLE_AI_API_KEY`, then
  click **Reindex** on `/search`.
- **Google Search Console:** create an OAuth client, set `GOOGLE_CLIENT_ID/SECRET`,
  and add redirect URI `http://localhost:4000/v1/integrations/google/callback`.
- **Stripe (invoices):** add `STRIPE_SECRET_KEY` (test mode is free).

---

## 9. Troubleshooting

| Symptom | Fix |
|--------|-----|
| API won't start, prints a Zod/env error | A required var in `.env` is missing/invalid (usually `DATABASE_URL` or a JWT secret). |
| `EPERM … query_engine-windows.dll.node` on build | Stop running `node`/dev processes, then rebuild (Windows file lock). |
| Web build fails with a stale/`PageNotFound` cache error | Delete `apps/web/.next` and rebuild. |
| Invite/reset email never arrives | SMTP not configured — the link is in the **API console**. Set `SMTP_*` to send for real. |
| "No embedding provider configured" on AI Search | Add `OPENAI_API_KEY` or `GOOGLE_AI_API_KEY`, then Reindex. |
| Background automations/webhooks don't fire | `REDIS_URL` not set, or you're running `dev:core` (no workers). |
| Can't join an existing workspace via Register | Register creates a **new** org. To join an existing one, get an **invite** from an admin. |

---

## 10. Production build (brief)

```bash
pnpm build
pnpm --filter @gnevo/db migrate:deploy
# then start each app's built output (api: node dist/main; web: next start; workers: node dist)
```

Set `NODE_ENV=production`, strong JWT secrets, real `DATABASE_URL`/`REDIS_URL`,
and production `API_URL`/`WEB_URL`/`CORS_ORIGINS`/`WEBAUTHN_*`. Files are stored in
Postgres (bytea) by default; for scale, swap to S3/R2 (documented seam in the files module).

---

*More detail on features lives in `docs/PROGRESS.md`; user-management specifics in `docs/USER-MANAGEMENT.md`.*
