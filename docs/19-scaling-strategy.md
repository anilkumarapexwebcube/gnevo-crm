# 19 · Scaling Strategy

> Deliverable 22. How each layer scales from Stage A (beta) → B (25k) → C (100k+ customers, 1,000+ concurrent employees), and the triggers for each step.

---

## 1. Scaling philosophy

- **Scale on evidence, not fear.** Instrument first; scale the proven bottleneck.
- **Stateless app tier** → horizontal scaling is trivial; keep state in Postgres/Redis/R2.
- **Vertical first for the DB**, then read replicas, then partitioning, then sharding — in that order.
- **Async by default** for anything heavy → the app tier stays responsive.

---

## 2. Layer-by-layer scaling path

### Application / API tier
| Stage | Approach |
|---|---|
| A | 2–3 pods, single AZ |
| B | HPA on CPU/RPS, 6–12 pods, multi-AZ, Fastify adapter |
| C | 20–60 pods autoscaled, multi-AZ; extract hot domains (search, automation, AI, realtime) into independent services; per-service autoscaling |
- **Trigger to extract a service:** a domain's scaling/latency profile diverges from the monolith or it becomes a deploy bottleneck.

### Realtime (Socket.IO)
| Stage | Approach |
|---|---|
| A | single gateway |
| B | multiple gateway pods + **Redis adapter** for fan-out |
| C | dedicated gateway service, sharded rooms, event coalescing/backpressure; consider managed (Ably/Pusher) if ops cost > value |

### Background workers
- Scale by **queue depth (KEDA)**, not CPU. Separate worker pools per queue family so a slow AI job can't starve email.
- **Trigger:** DLQ growth or queue latency SLO breach → add workers / shard queues.
- Graduate complex/long automations to **Temporal** at Stage B/C.

### PostgreSQL (the critical path)
| Stage | Approach |
|---|---|
| A | single managed instance + **PgBouncer** |
| B | vertical scale + **1–2 read replicas** (route reports/dashboards/exports to replicas); partition top high-volume tables |
| C | more replicas; **partitioning** on all append tables (pg_partman); **Citus/Aurora** or logical sharding by `organization_id` for the largest tenants; materialized views for heavy aggregates; move cold partitions to R2 |
- **Connection scaling:** PgBouncer transaction pooling is mandatory at 1,000 concurrent users; separate pools for API vs workers.
- **Read/write split:** replica lag monitored; critical-read-after-write goes to primary.
- **Whale tenants:** offer **dedicated DB/schema** for a few enterprise customers demanding isolation/residency (documented option).

### Redis
- A: single. B: cluster (separate instances for cache vs queue vs pub/sub to isolate blast radius). C: larger cluster + read replicas; eviction policy tuned; consider Dragonfly for throughput.

### Search (Meilisearch)
- A: single node. B: replica + more RAM. C: cluster / shard by tenant, or migrate heavy analytics-search to OpenSearch. Reindex via jobs off replicas.

### Vector / RAG
- A/B: `pgvector` (co-located). C: dedicated **Qdrant** cluster if embedding volume/latency demands; keep tenant isolation.

### Storage (R2)
- Scales effectively infinitely; **$0 egress** keeps media cost flat. Lifecycle rules move cold data to cheaper tiers; CDN in front.

### AI
- Stateless calls scale horizontally; the constraints are **provider rate limits + cost**.
- Levers: per-org quotas, response caching, cheap-model-first routing, batching, BYO-key (offloads cost), multi-provider failover.

---

## 3. Multi-tenancy at scale

- **Row-level + RLS** handles hundreds/thousands of agency tenants and 100k+ customer rows per tenant cleanly.
- **Noisy-neighbor control:** per-tenant rate limits/quotas (API, AI, messaging, exports); fair-scheduling on shared queues; per-tenant metrics to spot abusers.
- **Tenant sharding (C):** route the largest tenants to dedicated DB shards/instances by `organization_id`; a routing layer maps tenant → shard.
- **Data residency:** region-pinned deployment option for enterprise/EU customers.

---

## 4. Global / geographic scaling (future)

- Cloudflare edge already global for static/CDN.
- Multi-region app tier + regional read replicas for latency; primary write region with async replication (accept eventual consistency for cross-region reads).
- Region-pinned tenants for residency; avoid cross-region chatty paths.

---

## 5. Capacity planning & triggers

| Signal | Action |
|---|---|
| API CPU/RPS > 70% sustained | scale out pods / raise HPA ceiling |
| DB CPU > 70% or slow-query rise | add replica / optimize / partition |
| Replica lag > threshold | add replica capacity / reduce read load |
| Queue latency/DLQ growth | add workers / shard queues |
| Cache hit rate dropping | resize Redis / tune TTLs |
| Search latency > budget | scale Meili / shard |
| AI cost/latency spikes | tighten quotas, cache, route cheaper, BYO-key push |
| Storage growth | lifecycle/archival rules |

- **Headroom target:** scale before 70% utilization on any critical resource.
- Re-run the capacity model (from [`03-cost-estimation.md`](03-cost-estimation.md)) at each stage boundary.

---

## 6. Resilience while scaling

- Circuit breakers + timeouts on all external deps → one slow provider never cascades.
- Graceful degradation: non-core (AI/integrations) can fail without taking down core CRM.
- Multi-AZ everything at Stage B+; DR/cross-region at Stage C.
- Chaos testing (kill pods, drop deps) before relying on scale claims.

---

## 7. Cost-aware scaling (FinOps)

- Committed-use/reserved instances at B/C (−15–40%).
- Autoscale down aggressively off-peak; schedule non-urgent jobs to cheap windows.
- Log/metric retention tiers; sample high-volume telemetry.
- Per-tenant cost visibility → informs pricing tiers.

Next: [`20-risk-analysis.md`](20-risk-analysis.md).
