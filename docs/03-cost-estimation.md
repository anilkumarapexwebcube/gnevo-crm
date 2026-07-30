# 03 · Cost Estimation & Free-Trial Options

> Deliverables 3 (cost estimation) + 4 (free-trial options). Modeled against the **hybrid** infra decision: managed data/comms/observability + self-hosted app/API containers behind Cloudflare.

> ⚠️ All figures are indicative 2025–2026 list prices in USD/month, **before** committed-use/enterprise discounts (typically −15% to −40%). Re-verify on vendor pages. Ranges reflect uncertainty; assume the higher end for budgeting.

---

## Cost model — three stages

We model three representative operating points:

| Stage | Customers | Employees (seats) | Notes |
|---|---|---|---|
| **A · Build/Beta** | < 1,000 | 10–30 internal | Dev + staging + light prod |
| **B · Growth** | ~25,000 | ~250 | Real load, HA, replicas |
| **C · Target scale** | 100,000+ | 1,000+ | Multi-AZ, sharding/partitioning, full observability |

---

## Stage A — Build / Beta (monthly)

| Category | Service | Est. cost |
|---|---|---|
| App/API compute | Small K8s or Fly.io/Railway (2–3 nodes) | $150–$400 |
| Postgres (managed) | Neon/Supabase paid or small RDS | $50–$150 |
| Redis (managed) | Upstash / small ElastiCache | $20–$80 |
| Object storage | Cloudflare R2 (low volume) | $5–$20 |
| Search | Meilisearch (self-host on a node) | ~$0 (in compute) |
| Email | Resend/Postmark starter | $20–$50 |
| SMS/WhatsApp | Twilio pay-as-you-go | $20–$100 (usage) |
| Error/monitoring | Sentry Team + Grafana Cloud free | $26–$60 |
| CDN/WAF/DNS | Cloudflare Pro | $20–$25 |
| Product analytics | PostHog free tier | $0 |
| AI | Dev credits / low usage (BYO-key possible) | $50–$300 |
| CI/CD | GitHub Actions (included minutes) | $0–$50 |
| **Subtotal** | | **~$400–$1,300/mo** |

## Stage B — Growth (~25k customers, ~250 seats)

| Category | Service | Est. cost |
|---|---|---|
| App/API compute | K8s (managed EKS/GKE, 6–12 nodes + control plane) | $1,200–$3,000 |
| Postgres | HA primary + 1–2 read replicas (Aurora/RDS/Neon scale) | $600–$2,000 |
| Redis | Cluster (cache + queue + realtime) | $200–$600 |
| Object storage | R2 (media-heavy agency data, TBs) | $100–$400 |
| Search | Meilisearch/Typesense cluster or Cloud | $100–$400 |
| Vector/RAG | pgvector (in Postgres) or Qdrant small | $0–$300 |
| Email | SES (marketing) + Postmark (txn) | $200–$800 (usage) |
| SMS/WhatsApp | Twilio + WhatsApp | $500–$5,000 (highly usage-dependent) |
| Observability | Grafana Cloud/self-host + Sentry | $200–$800 |
| Enterprise SSO | WorkOS (a handful of SSO connections) | $250–$1,000 |
| AI | Platform-funded usage (if not fully BYO-key) | $500–$5,000 |
| CDN/WAF | Cloudflare Business | $200–$250 |
| **Subtotal** | | **~$4,000–$21,000/mo** |

## Stage C — Target scale (100k+ customers, 1,000+ seats)

| Category | Service | Est. cost |
|---|---|---|
| App/API compute | Autoscaling K8s (multi-AZ, 20–60 nodes) | $6,000–$20,000 |
| Postgres | Aurora/Citus, multi-AZ, several replicas, PgBouncer | $4,000–$15,000 |
| Redis | Large cluster, HA | $1,000–$3,000 |
| Object storage | R2 (tens of TBs, $0 egress advantage) | $500–$2,500 |
| Search | OpenSearch/Meilisearch cluster | $500–$2,500 |
| Vector | Qdrant/pgvector at scale | $500–$2,000 |
| Email | SES at volume | $500–$3,000 |
| SMS/WhatsApp | Twilio/WhatsApp at volume | $2,000–$30,000+ (usage) |
| Observability | Full stack (logs are the cost driver) | $1,500–$6,000 |
| Enterprise SSO/SCIM | WorkOS (many enterprise orgs) | $2,000–$10,000 |
| AI | Platform usage (if funded) — cache aggressively | $3,000–$30,000+ (usage) |
| CDN/WAF/DDoS | Cloudflare Enterprise | $1,000–$5,000 |
| Backups/DR | Cross-region snapshots, PITR | $300–$1,500 |
| **Subtotal (infra)** | | **~$23,000–$140,000/mo** |

> **The two wild cards are AI and messaging (SMS/WhatsApp).** Both are usage-based and can dwarf infra. **Mitigations:** BYO-key for AI (shifts cost to customer), aggressive prompt/response caching, model routing (cheap model first), per-workspace quotas, and passing messaging costs through to customers with markup.

---

## People cost (funded 7+ team) — for budgeting context

Fully-loaded engineering cost dominates early-stage burn far more than infra. Rough monthly loaded ranges (region-dependent):

| Role | Count (suggested) | Note |
|---|---|---|
| Principal/Staff Eng (arch) | 1 | Owns architecture & standards |
| Senior Full-Stack | 3–4 | Split across CRM Core / Marketing / AI squads |
| Frontend/Design-Eng | 1–2 | Design system + UX |
| Backend/Platform | 2 | Data, automation engine, integrations |
| DevOps/SRE | 1 | Infra, CI/CD, observability |
| QA/SDET | 1 | Test automation |
| Product/PM | 1 | Roadmap, specs |
| Security (fractional) | 0.5 | Reviews, audits |

*(Salary numbers vary too much by geography to estimate responsibly here — plug in your local loaded rates. The org-design is in the roadmap doc.)*

---

## Cost-control levers (design them in now)

1. **BYO AI keys** per workspace → AI cost off our P&L for most tenants.
2. **Cloudflare R2** (zero egress) instead of S3 → large savings on media-heavy agency data.
3. **Aggressive caching** (Redis + CDN + AI response cache) → fewer DB/AI calls.
4. **Self-hosted search/observability** where ops capacity allows → avoid Datadog/Algolia bill shock.
5. **Committed-use discounts** on cloud + reserved DB instances at Stage B/C (−15–40%).
6. **Log sampling & retention tiers** → observability logs are a top-3 hidden cost.
7. **Per-workspace quotas/rate limits** on AI and messaging → prevent runaway bills.
8. **Right-size, then autoscale** → don't pre-provision Stage C.

---

## Free trials & credits {#free-trials--credits}

| Vendor | Free tier / trial |
|---|---|
| **Vercel** | Hobby free; Pro trial |
| **Neon** | Free serverless Postgres tier (generous) |
| **Supabase** | Free tier (Postgres + auth + storage) |
| **AWS** | 12-month free tier + startup credits (Activate: up to $100k for eligible startups) |
| **Google Cloud** | $300 free credit + startup program |
| **Azure** | $200 credit + startups program |
| **Cloudflare** | Free plan (CDN/DNS); R2 has a free allowance |
| **Upstash** | Free Redis tier |
| **Meilisearch Cloud** | Free trial |
| **Algolia** | Free tier (10k records) |
| **Sentry** | Free developer tier |
| **Grafana Cloud** | Generous free tier |
| **PostHog** | 1M events/mo free |
| **Twilio** | Trial credit |
| **Resend / Postmark / SES** | Free tiers / low intro volumes |
| **Clerk** | Free to 10k MAU |
| **WorkOS** | Free up to a few SSO connections |
| **OpenRouter** | Some free models |
| **Google Gemini** | Free API tier |
| **OpenAI / Anthropic / xAI / DeepSeek** | Trial/free credits vary; DeepSeek notably low-cost |
| **GitHub Actions** | Free minutes for public + allowance for private |
| **Sanity/PostHog/Snyk** | Free dev tiers |

**Recommended trial-stack to prototype at ~$0–$300/mo:** Neon (free) + Upstash (free) + Cloudflare (free/Pro) + R2 (free allowance) + Meilisearch self-host + Resend free + Sentry free + Grafana Cloud free + Gemini/OpenRouter free AI + AWS/GCP startup credits for compute.

---

## Budgeting recommendation

- **Build/Beta:** budget **~$1,000–$1,500/mo** infra; chase AWS/GCP/Azure startup credits to offset most of it.
- **Growth:** budget **~$8,000–$15,000/mo** infra + messaging; enforce AI/messaging quotas early.
- **Target scale:** model **$30k–$100k+/mo** infra; negotiate committed-use + reserved instances; keep BYO-key AI as the default to cap the biggest variable.

Next: the buildable spine — [`04-architecture.md`](04-architecture.md), [`05-database-design.md`](05-database-design.md), [`07-api-design.md`](07-api-design.md).
