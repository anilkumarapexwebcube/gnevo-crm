# Gnevo CRM

Enterprise SaaS CRM for digital marketing & SEO agencies. Multi-tenant, AI-native, built for 100k+ customers / 1,000+ employees.

> 📚 Full architecture & planning package: [`docs/`](docs/00-README.md) (25 deliverables).
> This README covers running the **Sprint 1 / M0 foundation** that's been scaffolded.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 · React 19 · Tailwind v4 |
| Backend | NestJS · Prisma · PostgreSQL 17 (+pgvector) |
| Infra | Redis · BullMQ · Meilisearch · Cloudflare R2 (MinIO in dev) |
| Monorepo | pnpm workspaces · Turborepo |

## Monorepo layout

```
apps/
  web/       Next.js frontend (app shell + login)
  api/       NestJS API (auth, RBAC, tenancy, leads)
  workers/   BullMQ workers (queues skeleton)
packages/
  types/     Shared Zod schemas (the contract)
  auth/      Password hashing + RBAC helpers
  db/        Prisma schema, RLS, tenant client, seed
  config/    Shared tsconfig / eslint / prettier
infra/       (IaC — to be filled in M0/Infra squad)
docs/        Planning & architecture package
```

## Prerequisites

- Node 22+, pnpm 9+, Docker Desktop

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Start local infra (Postgres, Redis, Meilisearch, MinIO, MailHog)
docker compose up -d

# 3. Configure environment
cp .env.example .env

# 4. Create the database schema + seed demo data (also enables RLS)
pnpm db:migrate       # runs prisma migrate dev (creates tables)
pnpm db:seed          # seeds demo org + roles + users, applies rls.sql

# 5. Run everything (web :3000, api :4000, workers)
pnpm dev
```

**Demo login (dev):** `owner@acme.test` / `DemoPassw0rd!` — visit http://localhost:3000/login.
API docs (Swagger): http://localhost:4000/docs · Health: http://localhost:4000/health/ready

## What's implemented in Sprint 1 (M0)

- ✅ Monorepo (pnpm + Turborepo) with shared config/types/auth/db packages
- ✅ Prisma schema: orgs, offices, departments, teams, users, RBAC (roles/permissions), sessions, leads, audit log
- ✅ **Two-layer multi-tenancy:** app-layer tenant client (`forTenant`) + Postgres **RLS** policies (`rls.sql`)
- ✅ Auth: register (creates org + owner + seeded roles), login, `/me`, JWT access + refresh (hashed sessions)
- ✅ RBAC: permission matrix + global `JwtAuthGuard` + `RbacGuard` + `@RequirePermissions`
- ✅ First CRM vertical: **Leads** CRUD (tenant-scoped, keyset pagination, RBAC-gated)
- ✅ Next.js app shell + working login page against the API
- ✅ Workers skeleton (BullMQ queues + example email worker)
- ✅ CI (GitHub Actions): typecheck, lint, test, build, secret + dep scan
- ✅ Unit tests: password hashing, RBAC logic

## Common scripts

```bash
pnpm dev          # run all apps
pnpm build        # build all
pnpm test         # run tests
pnpm lint         # lint
pnpm typecheck    # typecheck
pnpm db:studio    # Prisma Studio
```

## Next (Sprint 2)

Projects/tasks, automation engine, AI foundation, SEO project + rank tracking — see [`docs/16-roadmap-sprints-milestones.md`](docs/16-roadmap-sprints-milestones.md).
