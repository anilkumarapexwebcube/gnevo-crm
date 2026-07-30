# 08 · Folder Structure

> Deliverable 9. Enterprise monorepo layout with every folder explained. Optimized for a funded multi-squad team working in parallel with clear ownership boundaries.

---

## 1. Monorepo strategy

**Tooling:** **pnpm workspaces + Turborepo** (fast, cached task graph). Alternative considered: Nx (more powerful generators/graph, heavier). Turborepo chosen for simplicity + speed; can migrate to Nx if generator/codemod needs grow.

**Why a monorepo:** shared types (Zod schemas, API contracts) flow front↔back with zero drift; one PR can change API + client atomically; unified CI, linting, and versioning.

---

## 2. Top-level layout

```
gnevo-crm/
├─ apps/                    # Deployable applications
│  ├─ web/                  # Next.js 15 frontend (RSC, BFF)
│  ├─ api/                  # NestJS API (REST + GraphQL + WS)
│  ├─ workers/              # BullMQ workers (jobs + automation engine)
│  └─ realtime/             # (optional extracted) Socket.IO gateway
│
├─ packages/                # Shared, versioned internal libraries
│  ├─ ui/                   # Design system: shadcn-based components, tokens
│  ├─ config/               # Shared tsconfig, eslint, prettier, tailwind preset
│  ├─ types/                # Shared TS types + Zod schemas (contracts)
│  ├─ db/                   # Prisma schema, migrations, seed, client wrapper
│  ├─ auth/                 # Auth primitives shared web/api (session, RBAC helpers)
│  ├─ ai/                   # AI provider abstraction + RAG utils
│  ├─ integrations/         # Google/MS/Stripe/etc. client SDK wrappers
│  ├─ email-templates/      # React Email templates
│  ├─ logger/               # OTel + structured logging setup
│  ├─ utils/                # Pure shared helpers (dates, money, ids)
│  └─ testing/              # Test factories, fixtures, Testcontainers helpers
│
├─ infra/                   # Infrastructure as Code + ops
│  ├─ terraform/            # Cloud resources (VPC, K8s, DB, R2, DNS)
│  ├─ k8s/                  # Helm charts / manifests / Argo Rollouts
│  ├─ docker/               # Dockerfiles + compose for local dev
│  └─ scripts/              # Ops + migration + backup scripts
│
├─ docs/                    # This planning package + living docs
├─ .github/                 # GitHub Actions workflows, PR/issue templates, CODEOWNERS
├─ turbo.json               # Turborepo task pipeline
├─ pnpm-workspace.yaml
└─ package.json
```

---

## 3. `apps/web` — Next.js frontend

```
apps/web/
├─ src/
│  ├─ app/                          # App Router
│  │  ├─ (marketing)/               # Public site (login, pricing) — route group
│  │  ├─ (auth)/                    # Login, signup, MFA, passkey flows
│  │  ├─ (dashboard)/               # Authenticated app shell
│  │  │  ├─ layout.tsx              # Sidebar + topbar + command palette
│  │  │  ├─ leads/                  # Feature route: list, [id], new
│  │  │  ├─ customers/
│  │  │  ├─ deals/
│  │  │  ├─ projects/
│  │  │  ├─ seo/                    # SEO projects, rankings, audits...
│  │  │  ├─ marketing/
│  │  │  ├─ automations/
│  │  │  ├─ reports/
│  │  │  ├─ settings/
│  │  │  └─ ai/
│  │  ├─ api/                       # Route handlers (BFF, webhooks, tRPC edge)
│  │  └─ layout.tsx / globals.css
│  ├─ features/                     # Feature-sliced modules (colocated logic)
│  │  └─ deals/
│  │     ├─ components/             # Deal-specific components
│  │     ├─ hooks/                  # useDeals, useDealMutations (TanStack Query)
│  │     ├─ api.ts                  # Typed client calls
│  │     └─ schemas.ts              # Zod (imported from packages/types)
│  ├─ components/                   # App-level shared components (not design-system)
│  ├─ lib/                          # Client utils, query client, providers
│  ├─ hooks/                        # Cross-feature hooks
│  ├─ stores/                       # Zustand/Jotai for local UI state (sparingly)
│  └─ styles/
├─ public/
├─ next.config.ts
└─ package.json
```

**Convention:** UI primitives live in `packages/ui`; **feature logic** is *feature-sliced* under `src/features/*` (components + hooks + api + schemas colocated) so a squad owns a vertical without stepping on others.

---

## 4. `apps/api` — NestJS backend

```
apps/api/
├─ src/
│  ├─ main.ts                       # Bootstrap (Fastify adapter, OTel, helmet)
│  ├─ app.module.ts
│  ├─ common/                       # Cross-cutting: guards, interceptors, pipes, filters
│  │  ├─ guards/                    # AuthGuard, RbacGuard, RateLimitGuard
│  │  ├─ interceptors/              # Tenant, Audit, Idempotency, Serialization
│  │  ├─ pipes/                     # ZodValidationPipe
│  │  ├─ filters/                   # Problem-Details exception filter
│  │  └─ decorators/                # @CurrentUser, @Org, @Permissions
│  ├─ config/                       # Env schema (Zod), config module
│  ├─ modules/                      # One folder per bounded context
│  │  ├─ auth/
│  │  ├─ users/
│  │  ├─ rbac/
│  │  ├─ organizations/
│  │  ├─ leads/
│  │  │  ├─ leads.module.ts
│  │  │  ├─ leads.controller.ts     # REST
│  │  │  ├─ leads.resolver.ts       # GraphQL (if applicable)
│  │  │  ├─ leads.service.ts        # Business logic
│  │  │  ├─ leads.repository.ts     # Prisma access
│  │  │  ├─ dto/                    # Request/response DTOs (Zod-derived)
│  │  │  └─ leads.spec.ts
│  │  ├─ customers/  deals/  projects/  tasks/
│  │  ├─ seo/  marketing/  campaigns/
│  │  ├─ finance/  invoices/  payments/  subscriptions/
│  │  ├─ automation/  notifications/  search/  files/
│  │  ├─ ai/  integrations/  webhooks/  audit/  reports/
│  ├─ events/                       # Domain event bus + handlers
│  └─ health/                       # Liveness/readiness probes
├─ test/                            # e2e (Playwright/Supertest)
└─ package.json
```

**Rule:** modules talk to each other only through injected **service interfaces** or the **event bus** — never by importing another module's repository. This keeps seams clean for later service extraction.

---

## 5. `apps/workers` — background processing

```
apps/workers/
├─ src/
│  ├─ main.ts                       # Worker bootstrap, queue registration
│  ├─ queues/                       # Queue definitions + processors
│  │  ├─ automation/                # Workflow step executor
│  │  ├─ email/  sms/  whatsapp/
│  │  ├─ ai/  reports/  exports/  imports/
│  │  ├─ search-index/  webhooks/  scheduled/
│  ├─ schedulers/                   # Cron jobs (renewals, digests, cleanups)
│  └─ shared/                       # Job utils, retry policy, DLQ handling
└─ package.json
```

---

## 6. `packages/db` — data layer

```
packages/db/
├─ prisma/
│  ├─ schema.prisma                 # Canonical schema (source of truth)
│  ├─ migrations/                   # Versioned SQL migrations
│  └─ seed.ts                       # Dev/test seed data
├─ src/
│  ├─ client.ts                     # PrismaClient w/ tenant middleware + read-replica routing
│  ├─ rls.ts                        # RLS session-var helpers
│  └─ index.ts
└─ package.json
```

## 7. `packages/types` — the contract

- Zod schemas for every entity + API request/response, exported to both `web` and `api`.
- Derived TS types (`z.infer`). **Single source of truth** for validation and typing → no client/server drift.

## 8. `packages/ui` — design system

```
packages/ui/
├─ src/
│  ├─ tokens/          # colors, spacing, typography, radius, shadows (CSS vars)
│  ├─ primitives/      # Button, Input, Select, Dialog, Table, Toast... (shadcn/Radix)
│  ├─ patterns/        # DataTable, PageHeader, EmptyState, StatCard, Skeletons
│  ├─ charts/          # Recharts wrappers with our theme
│  └─ hooks/           # useTheme, useMediaQuery, useKbd
├─ tailwind-preset.ts
└─ package.json
```

## 9. `infra/`

- **terraform/** — modularized (network, cluster, database, storage, dns, secrets); per-env workspaces (staging/prod).
- **k8s/** — Helm charts per app, Argo Rollouts for blue-green/canary, HPA configs.
- **docker/** — multi-stage Dockerfiles per app + `docker-compose.yml` for local (PG, Redis, Meili, MinIO, MailHog).

## 10. `.github/`

- `workflows/` — CI (lint/typecheck/test/build), security scans, deploy pipelines.
- `CODEOWNERS` — squad ownership per folder (enforces review boundaries).
- PR/issue templates, dependabot/renovate config.

---

## 11. Ownership model (CODEOWNERS)

| Path | Owning squad |
|---|---|
| `apps/api/src/modules/{leads,customers,deals,...}` , `apps/web/src/app/(dashboard)/{leads,...}` | **CRM Core** |
| `apps/*/**/{seo,marketing,campaigns}` | **Marketing** |
| `packages/ai`, `apps/api/src/modules/ai`, automation | **AI / Platform** |
| `packages/ui`, design tokens | **Design-Eng** |
| `infra/`, `.github/`, `packages/logger` | **Infra / SRE** |

This structure lets 4 squads work in parallel with minimal merge conflict, shared contracts, and enforced boundaries. Next wave: design system, wireframes, and the full feature catalog.
