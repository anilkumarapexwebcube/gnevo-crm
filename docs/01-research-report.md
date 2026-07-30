# 01 · Research Report — Competitive & Technology Landscape

> Deliverable 1. Goal: understand what the best CRMs do well (and badly) so Gnevo CRM can beat them for the *digital-marketing-agency* use case, and justify our 2026 technology choices with evidence rather than fashion.

---

## Part A — Competitive analysis

We studied ten platforms across UX, features, automation, architecture, permissions, reporting, dashboards, speed, AI, notifications, integrations, API, data model, workflow, and security. Summary of what each does best and where the opening is for us.

### 1. HubSpot
- **Strengths:** Best-in-class marketing + CRM fusion, generous free tier, polished onboarding, strong content/SEO tooling, huge app marketplace, excellent reporting UX.
- **Weaknesses:** Pricing scales punishingly (per-marketing-contact billing), customization hits ceilings, workflow builder gets slow on large portals, developer API rate limits are tight.
- **Steal:** The marketing-hub ↔ CRM object model, sequences, and the "lifecycle stage" concept. Their empty states and onboarding checklists.
- **Beat them on:** Price transparency, agency multi-client management, deep SEO/PPC operational tooling (they aim at marketers-who-sell, not agencies-who-deliver).

### 2. Salesforce
- **Strengths:** Infinitely customizable, enterprise-grade permissions (profiles, roles, sharing rules, field-level security), massive ecosystem, powerful reporting, Flow automation.
- **Weaknesses:** Steep learning curve, dated UX in places, slow to configure, expensive, needs admins/consultants, governor limits.
- **Steal:** The permission model depth (org-wide defaults, role hierarchy, sharing rules), audit trail, and platform extensibility mindset.
- **Beat them on:** Time-to-value, out-of-the-box speed, modern UX, agency-native workflows.

### 3. Zoho CRM
- **Strengths:** Best value for money, huge module breadth (Zoho One suite), decent automation (blueprints), good customization.
- **Weaknesses:** UX feels fragmented across the suite, inconsistent design, performance dips, integrations feel bolted-on.
- **Steal:** Blueprint (state-machine process enforcement), breadth of built-in modules.
- **Beat them on:** Design coherence, single unified product feel, speed.

### 4. Monday CRM (monday.com)
- **Strengths:** Superb visual UX, flexible board/column model, delightful automations ("when column changes → do X"), strong collaboration.
- **Weaknesses:** Not a "real" relational CRM underneath (board-centric), reporting is limited for sales analytics, gets expensive per seat.
- **Steal:** The automation recipe UX, colorful status columns, board views, and the general joy of the product.
- **Beat them on:** True relational data model, deal analytics, agency delivery workflows.

### 5. ClickUp CRM
- **Strengths:** Everything-app flexibility, custom fields, multiple views (list/board/gantt/calendar), aggressive feature velocity.
- **Weaknesses:** Feature overload, performance/stability complaints, cluttered UX, jack-of-all-trades.
- **Steal:** Multi-view flexibility, custom-field engine, docs+tasks integration.
- **Beat them on:** Performance, focus, opinionated defaults, polish.

### 6. Pipedrive
- **Strengths:** The cleanest sales-pipeline UX in the market, fast, sales-rep-friendly, easy to adopt.
- **Weaknesses:** Narrow (sales-only), thin marketing/service, limited reporting depth, weak for agencies delivering work.
- **Steal:** The pipeline drag-drop UX, activity-based selling model, "one clear next action".
- **Beat them on:** Breadth (marketing/delivery/support), reporting, scale.

### 7. Freshsales (Freshworks)
- **Strengths:** Good AI (Freddy) for lead scoring, clean UI, built-in phone/email, fair pricing.
- **Weaknesses:** Ecosystem smaller, deeper customization limited, reporting mid-tier.
- **Steal:** Built-in lead scoring UX, integrated comms (call/email/chat in one).
- **Beat them on:** SEO/marketing depth, extensibility, multi-provider AI.

### 8. GoHighLevel (GHL)
- **Strengths:** *The* agency-focused platform — white-label, sub-accounts per client, funnels, email/SMS marketing, campaigns, snapshots. This is our closest philosophical competitor.
- **Weaknesses:** UX is dated and cluttered, performance issues, "everything but janky", support complaints, tech debt visible.
- **Steal:** The agency ↔ sub-account (client) hierarchy, white-label, campaign builder, funnel/landing tooling, snapshots (templated client setups).
- **Beat them on:** UX quality, performance, reliability, modern AI, SEO operational depth. **This is our primary target to displace.**

### 9. Bitrix24
- **Strengths:** Enormous free tier, all-in-one (CRM+tasks+intranet+telephony+sites), self-hostable.
- **Weaknesses:** Overwhelming, cluttered UX, steep learning curve, dated design.
- **Steal:** All-in-one intranet concept (internal chat, announcements, HR), self-host option.
- **Beat them on:** Design, focus, performance.

### 10. Salesforce/HubSpot ecosystem takeaways (cross-cutting)
- **Notifications:** Best systems offer per-channel preferences, digest batching, @mentions, and in-app + email + push parity. We'll match.
- **Command palette / keyboard-first:** Linear and Notion (not CRMs, but the UX bar) prove keyboard-first + ⌘K palette is now table stakes for "fast" software. We adopt it.
- **Realtime presence & collaboration:** Notion/Linear/Monday set the expectation of live cursors, presence, and instant updates. We build realtime in from day one.

### Competitive synthesis → our wedge

| Gap in the market | Gnevo CRM answer |
|---|---|
| Agency platforms (GHL/Bitrix) have poor UX | Linear/Notion-grade UX with agency depth |
| Great-UX CRMs (Pipedrive/Monday) lack delivery + SEO ops | Native SEO/PPC/content project modules |
| Deep CRMs (Salesforce/HubSpot) are slow to configure & pricey | Opinionated defaults, fast time-to-value, transparent pricing |
| AI is bolted on / single-vendor | **Multi-provider AI (OpenAI/Claude/Gemini/DeepSeek/Grok/OpenRouter/Perplexity), user-selectable**, RAG over the workspace |
| Client management is an afterthought | Multi-office / multi-department / agency↔client hierarchy is core to the data model |

---

## Part B — Technology research (2026)

Rationale for each layer is expanded in [`02-technology-comparison.md`](02-technology-comparison.md) (with alternatives, pricing, trials, scalability, limitations). This section records the *research finding* — what's modern, maintained, and appropriate — not just the pick.

### Frontend
- **Finding:** Next.js (App Router, React Server Components, streaming) remains the enterprise default in 2026; React 19 stabilized Actions, `use()`, and the compiler. Tailwind CSS v4 (Oxide engine, CSS-first config) is fast and current. shadcn/ui (Radix + Tailwind, copy-in components) is the de-facto design-system base. TanStack Query/Table, React Hook Form + Zod, and Motion (formerly Framer Motion) are all actively maintained and best-in-class.
- **Decision:** Matches the brief. Adopt as specified.

### Backend
- **Finding:** NestJS (TypeScript, modular, DI, mature) is the strongest choice for a large multi-squad backend needing structure. Prisma is the leading TS ORM; **Prisma 5+ with the new Rust-free query engine and typed SQL** is production-proven at scale. For 100k-customer scale we pair Prisma with raw SQL/`pg` for hot paths.
- **Decision:** NestJS + Prisma + PostgreSQL as specified. Add **Drizzle** as an escape hatch consideration for perf-critical queries (documented as alternative).

### Data, cache, queue, realtime, search
- **PostgreSQL 16/17** — primary store; partitioning + `pgvector` for embeddings (RAG).
- **Redis 7** — cache, sessions, rate-limit counters, pub/sub, BullMQ backing store.
- **BullMQ** — background jobs, the automation engine's execution layer, retries, schedulers.
- **Realtime:** Socket.IO (or native WS via NestJS gateway) for chat/presence/notifications; scale-out via Redis adapter.
- **Search:** **Meilisearch** for typo-tolerant instant global search (self-hostable, cheap, fast); **OpenSearch/Elasticsearch** reserved for heavy analytics/log search if needed. Postgres FTS for simple cases.
- **Vectors/RAG:** `pgvector` first (co-located with data, simplest ops); Qdrant as scale-out option.

### AI
- **Finding:** No single provider wins on all axes in 2026. A **provider-abstraction layer** (unified interface + per-workspace provider/key selection) is the correct architecture, routing to OpenAI, Anthropic Claude, Google Gemini, DeepSeek, xAI Grok, Perplexity, and **OpenRouter** (as a meta-gateway to many models). This is a core differentiator, not an add-on.
- **Decision:** Build a `providers/ai` abstraction; support BYO-key per workspace; RAG over workspace data via pgvector.

### Auth
- **Finding:** For a NestJS API + Next.js frontend, the pragmatic enterprise choice is a **first-party session/JWT auth** with OIDC social login (Google, Microsoft, GitHub), magic links, TOTP 2FA, WebAuthn **passkeys**, plus RBAC + permission matrix. **Auth.js/NextAuth** is fine for the web layer; for a shared API, consider **Ory (Kratos/Hydra)** self-hosted or **Keycloak** for full IAM, or a managed IdP (Clerk/WorkOS/Auth0) for speed. Enterprise buyers will want **SAML/SCIM** eventually → WorkOS is the fast path there.
- **Decision:** First-party auth in NestJS (sessions in Redis + rotating refresh tokens) with OIDC social, passkeys, TOTP; **WorkOS** as the enterprise SSO/SCIM add-on when selling upmarket. Documented in security doc.

### Comms
- **Email:** Transactional via **Resend** or **Postmark** (deliverability) / **Amazon SES** (cost at scale); marketing sends via SES + our own campaign engine. 
- **SMS/WhatsApp:** **Twilio** (SMS + WhatsApp Business API) primary; **Meta WhatsApp Cloud API** direct for volume; MessageBird/Vonage as alternates.
- **Telegram/Slack/Teams/Google Chat:** bot/webhook integrations.
- **Push:** Web Push (VAPID) + **Firebase Cloud Messaging** for mobile later.

### Infra, observability, delivery
- **Docker + Compose** for local/dev parity; **Kubernetes** (managed — EKS/GKE) for prod scale-out; **Terraform** for IaC.
- **Cloudflare** — CDN, WAF, DDoS, DNS, R2 (S3-compatible storage).
- **Observability:** **OpenTelemetry** everywhere → **Grafana stack** (Prometheus metrics, Loki logs, Tempo traces) or Grafana Cloud; **Sentry** for error tracking.
- **CI/CD:** **GitHub Actions** → build, test, scan, deploy; blue-green / canary via Argo Rollouts or Kubernetes native.

### Testing
- **Vitest** (unit, fast, Vite-native) across frontend + shared libs; **Jest** where NestJS defaults help; **Playwright** for E2E; **k6** for load/performance; **Semgrep + Trivy + OWASP ZAP** for security testing in CI.

### Storage & documents
- **Cloudflare R2 / S3** via a storage-abstraction layer; **ClamAV** for virus scanning of uploads; **Gotenberg** (headless Chromium/LibreOffice) or React-PDF for PDF generation; **Tesseract**/cloud OCR for document text extraction.

---

## Part C — Research conclusions

1. **The wedge is real:** No competitor combines agency-native structure + modern UX + SEO/PPC operational depth + multi-provider AI. GoHighLevel owns the agency niche but on poor tech; that's our opening.
2. **The specified stack is sound and current** — nothing in the brief is outdated. We refine (not replace) with: Meilisearch for search, pgvector for RAG, WorkOS for enterprise SSO, Grafana/OTel/Sentry for observability, and an explicit AI provider-abstraction layer.
3. **Multi-tenancy and the permission model are the highest-risk foundational decisions** — they must be designed before any code (covered in architecture + database docs). Getting row-level isolation and the role/permission matrix right at 100k customers / 1,000 employees is non-negotiable.
4. **Realtime, search, and AI are core, not features** — they touch the data model and must be designed in from day one.

Next: [`02-technology-comparison.md`](02-technology-comparison.md) turns these findings into a decision table with alternatives, pricing, trials, scalability, and limitations.
