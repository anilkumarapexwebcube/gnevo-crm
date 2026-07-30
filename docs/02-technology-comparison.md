# 02 · Technology Comparison & Decision Record

> Deliverables 2 (comparison) + inputs to 3 & 4. Every selection includes **why**, **alternatives**, **pricing**, **free trial**, **scalability**, and **limitations**. This doubles as our ADR (Architecture Decision Record) index.

> ⚠️ Pricing is indicative (2025–2026 public list prices), USD, before enterprise discounts. Re-verify before contracting.

---

## Legend
- **Pick** = what we ship. **Alt** = viable alternative(s) we evaluated. **Scale** = how it holds at 100k customers / 1,000 employees. **Limit** = known limitation to manage.

---

## 1. Frontend framework

| Aspect | Detail |
|---|---|
| **Pick** | **Next.js 15+ (App Router, RSC, streaming)** + React 19 + TypeScript |
| **Why** | Server Components cut client JS; streaming + partial prerender = fast dashboards; huge talent pool; first-class Vercel + self-host support; matches brief. |
| **Alt** | Remix/React Router 7 (great data loading, smaller ecosystem); TanStack Start (new, promising); SvelteKit (smaller talent pool); Nuxt (Vue). |
| **Pricing** | OSS/free. Hosting cost separate (self-hosted containers under hybrid model → ~compute only). |
| **Trial** | N/A (OSS). |
| **Scale** | Proven at very large scale; RSC + edge caching handle read-heavy dashboards well. |
| **Limit** | App Router complexity; RSC mental model has a learning curve; avoid over-fetching in server components. |

## 2. Styling & UI kit

| Aspect | Detail |
|---|---|
| **Pick** | **Tailwind CSS v4** + **shadcn/ui** (Radix primitives) + **Motion** for animation |
| **Why** | Tailwind v4 Oxide engine is fast; CSS-first tokens fit our design system; shadcn = own-your-components (no lock-in), accessible via Radix; Motion is the animation standard. |
| **Alt** | Panda CSS / vanilla-extract (typed CSS); MUI / Mantine / Chakra (heavier, more opinionated); Park UI. |
| **Pricing** | Free/OSS. |
| **Scale** | Zero runtime cost (Tailwind compiles); component ownership avoids upgrade lock. |
| **Limit** | shadcn components are copied in → you own maintenance; enforce consistency via our design-system package. |

## 3. Client data / tables / forms

| Aspect | Detail |
|---|---|
| **Pick** | **TanStack Query** (server state), **TanStack Table** (data grids), **React Hook Form + Zod** (forms + validation), **Recharts** (charts) |
| **Why** | Best-in-class, framework-agnostic, actively maintained; Zod schemas shared front↔back for end-to-end type safety. |
| **Alt** | SWR (simpler than Query); AG Grid (heavier, richer enterprise grid — consider for the biggest tables); Valibot (lighter than Zod); Tremor/visx/ECharts for charts. |
| **Pricing** | Free/OSS. AG Grid Enterprise ~$999/dev perpetual if adopted for mega-grids. |
| **Scale** | Query cache + virtualization (TanStack Virtual) handles 100k-row tables via server pagination. |
| **Limit** | TanStack Table is headless (more wiring); Recharts struggles past ~10k points → switch to ECharts/visx for heavy viz. |

## 4. Backend framework

| Aspect | Detail |
|---|---|
| **Pick** | **NestJS** (TypeScript) — modular monolith → extractable microservices |
| **Why** | DI, modules, guards/interceptors/pipes map cleanly to RBAC, validation, audit; great for multi-squad codebases; first-class OpenAPI, GraphQL, WebSockets, BullMQ, microservice transports. |
| **Alt** | Fastify plain (faster, less structure); Hono (edge-first, lightweight); AdonisJS; Go (Fiber/Echo) or Elixir/Phoenix for extreme concurrency (different talent pool). |
| **Pricing** | Free/OSS. |
| **Scale** | Modular monolith scales horizontally behind a load balancer; extract high-load domains (search, automation, AI) to services later. |
| **Limit** | Nest adds abstraction overhead; discipline needed to keep modules decoupled. Uses Express by default → switch to Fastify adapter for throughput. |

## 5. ORM & database

| Aspect | Detail |
|---|---|
| **Pick** | **PostgreSQL 16/17** + **Prisma 5+** (with typed raw SQL for hot paths) |
| **Why** | Postgres = correctness, JSONB, partitioning, `pgvector`, FTS, mature ops; Prisma = type-safe, great DX, migrations. |
| **Alt** | **Drizzle ORM** (thin, SQL-first, excellent for perf & edge — strong candidate; we allow it for hot paths); Kysely (query builder); TypeORM/MikroORM. |
| **Pricing** | Postgres OSS. Managed (hybrid model): **Neon** (serverless, branching) or **Supabase** or **AWS RDS/Aurora**. See cost doc. |
| **Trial** | Neon free tier; Supabase free tier; RDS via AWS free tier. |
| **Scale** | Read replicas, partitioning by tenant/time, PgBouncer pooling, Citus/Aurora for extreme scale. |
| **Limit** | Prisma historically weaker on complex SQL & connection pooling in serverless → use PgBouncer/Prisma Accelerate or Drizzle for hot paths. |

## 6. Caching, queue, realtime

| Layer | Pick | Why / Alt / Scale / Limit |
|---|---|---|
| **Cache/session/rate-limit** | **Redis 7** (managed: Upstash or ElastiCache) | Ubiquitous, fast. Alt: KeyDB, Dragonfly (faster drop-in). Scale: cluster mode. Limit: memory cost — set eviction policy. |
| **Queue / jobs** | **BullMQ** (on Redis) | Native TS, retries, rate-limit, cron, flows. Alt: Temporal (durable workflows — strong for the automation engine), pg-boss (Postgres-only, no Redis). Scale: many workers. Limit: Redis-bound; for complex long-running workflows consider Temporal. |
| **Realtime** | **Socket.IO + Redis adapter** (NestJS gateway) | Presence, typing, notifications, live dashboards. Alt: native `ws`, Ably/Pusher (managed, offload scaling), Supabase Realtime, Centrifugo. Scale: horizontal via Redis pub/sub. Limit: sticky sessions / adapter needed behind LB. |

## 7. Search

| Aspect | Detail |
|---|---|
| **Pick** | **Meilisearch** (global instant search) + **pgvector** (semantic/RAG) |
| **Why** | Meilisearch = fast, typo-tolerant, simple ops, cheap self-host; pgvector keeps embeddings next to data. |
| **Alt** | **Typesense** (very similar); **Elasticsearch/OpenSearch** (heavier, best for log/analytics scale); Algolia (managed, excellent, pricey); Qdrant/Weaviate (dedicated vector DBs). |
| **Pricing** | Meilisearch OSS free (self-host); Meilisearch Cloud from ~$30/mo. Algolia usage-based (can get expensive). |
| **Trial** | Meilisearch Cloud trial; Algolia free tier (10k records). |
| **Scale** | Meilisearch handles millions of docs; shard/replicate. Move to OpenSearch if analytics-search grows. |
| **Limit** | Meilisearch weaker on complex aggregations/analytics than Elasticsearch. |

## 8. AI providers (multi-provider by design)

| Aspect | Detail |
|---|---|
| **Pick** | Abstraction layer over **OpenAI, Anthropic Claude, Google Gemini, DeepSeek, xAI Grok, Perplexity, OpenRouter**; **user/workspace-selectable**; BYO-key supported |
| **Why** | No lock-in, cost/quality routing, resilience, and it's a headline differentiator. OpenRouter gives one API to hundreds of models. |
| **Alt** | Single-vendor (simpler, risky); LiteLLM / Vercel AI SDK as the unifying library (we'll use **Vercel AI SDK** + a thin router, or **LiteLLM** proxy). |
| **Pricing** | Usage-based per token, varies wildly by model. BYO-key shifts cost to customer. See cost doc for representative rates. |
| **Trial** | Most offer free credits; OpenRouter has free models; Gemini has a free tier. |
| **Scale** | Stateless calls; cache prompts/responses; rate-limit per workspace; queue heavy jobs. |
| **Limit** | Rate limits, latency variance, cost control, prompt-injection risk (mitigated in security doc). |

## 9. Authentication & identity

| Aspect | Detail |
|---|---|
| **Pick** | First-party auth in NestJS (Redis sessions + rotating refresh JWTs) — OIDC social (Google/Microsoft/GitHub), magic link, TOTP 2FA, **WebAuthn passkeys**; **RBAC + permission matrix**; **WorkOS** for enterprise SSO/SAML/SCIM |
| **Why** | Control over sessions/devices/audit; passkeys are the 2026 standard; WorkOS is the fast path to enterprise SSO revenue without building SAML ourselves. |
| **Alt** | **Clerk** (fastest DX, great UI, per-MAU pricing); **Auth0** (mature, pricey at scale); **Keycloak**/**Ory** (self-host, full control, ops burden); Supabase Auth. |
| **Pricing** | WorkOS: SSO ~$125/connection/mo (or per-org enterprise), free up to a few connections; Clerk free to 10k MAU then usage; Auth0 gets expensive fast. Self-host (Keycloak/Ory) = compute only. |
| **Trial** | Clerk/WorkOS/Auth0 all have free tiers. |
| **Scale** | Stateless JWT verification scales; sessions in Redis; WorkOS/Clerk offload IdP scaling. |
| **Limit** | Rolling our own auth = security responsibility (mitigated by audits, best-practice libs). Managed = cost + some lock-in. |

## 10. Email / SMS / WhatsApp

| Channel | Pick | Alt | Pricing (indicative) | Trial |
|---|---|---|---|---|
| Transactional email | **Resend** or **Postmark** | Amazon SES (cheapest at scale), SendGrid, Mailgun | Resend ~$20/mo (50k emails); Postmark ~$15/mo (10k); SES ~$0.10/1k | Free tiers all |
| Marketing email | **Amazon SES** + own engine | SendGrid Marketing, Customer.io | SES ~$0.10/1k emails | AWS free tier |
| SMS | **Twilio** | MessageBird, Vonage, AWS SNS | ~$0.0079/SMS US (varies by country) | Twilio trial credit |
| WhatsApp | **Meta WhatsApp Cloud API** (direct) + Twilio fallback | 360dialog, MessageBird | Per-conversation pricing by country | Meta free tier (limited) |
| Push | **Web Push (VAPID)** + FCM | OneSignal, Pusher Beams | Free (self) / OneSignal free tier | — |

## 11. Storage, files, documents

| Function | Pick | Alt | Notes |
|---|---|---|---|
| Object storage | **Cloudflare R2** | AWS S3, Backblaze B2, Wasabi | R2 = **zero egress fees** (big cost win for a media-heavy agency CRM) |
| Virus scan | **ClamAV** (self-host) | VirusTotal API, cloud AV | Scan on upload, quarantine bucket |
| PDF generation | **Gotenberg** (Chromium/LibreOffice) | React-PDF, Puppeteer, Playwright print | Invoices, contracts, reports |
| OCR | **Tesseract** / cloud OCR (Google Vision, AWS Textract) | — | Document text extraction, receipts |
| Image optimization | **Sharp** + Cloudflare Images/CDN | imgproxy, Thumbor | On-the-fly resize + WebP/AVIF |

**R2 pricing:** ~$0.015/GB-month storage, **$0 egress**, minimal Class A/B op fees. S3 charges egress (~$0.09/GB) — R2 wins for CRM media.

## 12. Observability & monitoring

| Function | Pick | Alt | Pricing | Trial |
|---|---|---|---|---|
| Errors | **Sentry** | Rollbar, Bugsnag, Highlight | Team ~$26/mo, scales by events; self-host free (OSS) | Free dev tier |
| Metrics/logs/traces | **OpenTelemetry → Grafana stack** (Prometheus/Loki/Tempo) or **Grafana Cloud** | Datadog (best UX, expensive), New Relic, SigNoz (OSS all-in-one), Better Stack | Self-host = compute; Grafana Cloud free tier then usage; Datadog $$$ | Grafana Cloud free tier; Datadog 14-day |
| Uptime | **Better Stack** / UptimeRobot | Pingdom, Checkly | Free tiers available | Yes |
| Product analytics | **PostHog** (self-host or cloud) | Mixpanel, Amplitude | PostHog free to 1M events/mo | Yes |

## 13. Testing & QA

| Type | Pick | Alt | Notes |
|---|---|---|---|
| Unit | **Vitest** | Jest, node:test | Fast, ESM-native; Jest for Nest defaults |
| Integration | **Vitest + Testcontainers** | Jest + Supertest | Real Postgres/Redis in Docker |
| E2E | **Playwright** | Cypress | Cross-browser, fast, parallel |
| Load/perf | **k6** | Artillery, Gatling, Locust | Script in JS, CI-friendly |
| Security | **Semgrep + Trivy + OWASP ZAP + Dependabot/Renovate** | Snyk (paid, polished) | SAST + container scan + DAST + deps |

## 14. Infra, IaC, CI/CD

| Function | Pick | Alt | Notes |
|---|---|---|---|
| Containers | **Docker + Compose** (dev) | Podman | Dev/prod parity |
| Orchestration (prod) | **Kubernetes (managed: EKS/GKE)** | ECS/Fargate, Nomad, Fly.io, Railway | Start simpler (Fly/Railway/ECS) if team prefers; K8s when scale demands |
| IaC | **Terraform** (+ Terragrunt) | Pulumi (TS), OpenTofu (OSS fork) | OpenTofu if avoiding HashiCorp licensing concerns |
| CDN/WAF/DNS | **Cloudflare** | AWS CloudFront + WAF, Fastly | DDoS, WAF, R2, Workers |
| CI/CD | **GitHub Actions** | GitLab CI, CircleCI, Buildkite | Matches brief |
| Deploy strategy | **Blue-green / canary** (Argo Rollouts) | Flagger, native rolling | Zero-downtime + fast rollback |

## 15. GraphQL vs REST vs tRPC

| Aspect | Detail |
|---|---|
| **Pick** | **REST (OpenAPI) as the primary public/versioned API** + **GraphQL** for complex client aggregation (dashboards) + optional **tRPC** internally between our own Next.js ↔ Nest for type-safe RPC |
| **Why** | REST = stable public contract, webhooks, easy for integrators; GraphQL = flexible client-driven fetch for rich dashboards; tRPC = zero-boilerplate internal calls. |
| **Alt** | REST-only (simplest); GraphQL-only (over-fetch control but caching/versioning harder). |
| **Scale** | REST caches at CDN; GraphQL needs persisted queries + complexity limits to stay safe at scale. |
| **Limit** | Running all three = surface area to maintain → keep GraphQL scoped to read/dashboard use cases initially. Detailed in API doc. |

---

## Consolidated decision summary

| Layer | Decision |
|---|---|
| Frontend | Next.js 15 + React 19 + TS + Tailwind v4 + shadcn/ui + Motion + TanStack + RHF/Zod + Recharts |
| Backend | NestJS (Fastify adapter) + Prisma (+Drizzle hot paths) |
| Data | PostgreSQL 16/17 (managed) + Redis 7 (managed) + Cloudflare R2 |
| Queue/Realtime | BullMQ (+Temporal for durable automation later) + Socket.IO/Redis |
| Search/AI | Meilisearch + pgvector; multi-provider AI abstraction (Vercel AI SDK / LiteLLM) |
| Auth | First-party (sessions+JWT, passkeys, TOTP, OIDC) + WorkOS enterprise SSO |
| Comms | Resend/SES + Twilio + WhatsApp Cloud API + Web Push/FCM |
| Observability | OTel + Grafana stack + Sentry + PostHog |
| Testing | Vitest + Playwright + k6 + Semgrep/Trivy/ZAP |
| Infra | Docker + K8s (managed) + Terraform + Cloudflare + GitHub Actions |
| API | REST/OpenAPI + GraphQL (dashboards) + tRPC (internal) |

Cost implications of every managed service above are modeled in [`03-cost-estimation.md`](03-cost-estimation.md).
