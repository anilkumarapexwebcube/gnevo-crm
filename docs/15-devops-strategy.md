# 15 · DevOps Strategy

> Deliverable 16. CI/CD, environments, blue-green/canary, zero-downtime, rollback, monitoring, alerting, logging, and health checks — for the hybrid infra model.

---

## 1. Environments

| Env | Infra | Purpose |
|---|---|---|
| **local** | Docker Compose | Dev parity: PG, Redis, Meili, MinIO (R2), MailHog |
| **preview** | Ephemeral per-PR namespace (K8s) or Fly/Railway | Review apps, E2E, Lighthouse |
| **staging** | Prod-like, managed data (smaller) | Integration, load, UAT, migration rehearsal |
| **production** | Multi-AZ managed K8s + managed data | Live |

Config via env + secrets vault; **12-factor**; env schema validated (Zod) at boot — app refuses to start on missing/invalid config.

---

## 2. CI/CD pipeline (GitHub Actions)

```
┌ CI (on PR) ──────────────────────────────────────────────┐
│ install → typecheck → lint → test (unit/comp/integration)│
│ → build (Turborepo cache) → security scans → E2E smoke   │
│ → deploy preview → Lighthouse/bundle budget              │
└──────────────────────────────────────────────────────────┘
┌ CD (on merge to main) ───────────────────────────────────┐
│ build & push signed images (cosign) → deploy STAGING     │
│ → run migrations (expand) → smoke + E2E + k6 → gate      │
│ → promote to PROD (canary → blue-green) → verify → done  │
└──────────────────────────────────────────────────────────┘
```

- **Trunk-based** development; short-lived branches; protected `main`; required checks + CODEOWNERS review.
- **Immutable, signed container images** per app (web/api/workers), tagged by commit SHA.
- **Cloud auth via OIDC** (no long-lived cloud keys in CI).
- **Turborepo remote cache** → only changed packages rebuild/test.
- **Preview environments** per PR with seeded data for reviewers + automated E2E.

---

## 3. Deploy strategy — zero downtime

**Canary → Blue-Green via Argo Rollouts** (or Flagger):

1. Deploy new version to a **canary** (e.g. 5% traffic).
2. **Automated analysis** on SLO metrics (error rate, latency, saturation) for N minutes.
3. Progressive shift (5%→25%→50%→100%) if healthy; **auto-rollback** on metric breach.
4. Blue-green swap for the final cutover → instant rollback path (keep old ReplicaSet warm).

- **Readiness/liveness/startup probes** gate traffic; no traffic to unready pods.
- **PodDisruptionBudgets** + **graceful shutdown** (drain in-flight, finish jobs) → rolling updates never drop requests.
- **Feature flags** (e.g. OpenFeature/Unleash) decouple deploy from release; dark-launch + gradual rollout + kill switch.

---

## 4. Database migrations (zero-downtime)

**Expand → migrate → contract** pattern:
1. **Expand:** additive, backward-compatible schema change (new nullable col/table/index `CONCURRENTLY`).
2. Deploy code that writes both / reads new-or-old.
3. **Backfill** via job.
4. **Contract:** remove old column/constraint in a later release once nothing uses it.

- Migrations reviewed for **lock impact**; long operations done concurrently/in batches.
- Migrations run as a **gated pipeline step** with rehearsal on staging + a tested rollback/`down` (or forward-fix) plan.
- Never a breaking migration coupled to the same deploy that needs it.

---

## 5. Infrastructure as Code

- **Terraform** (modular: network, cluster, db, cache, storage, dns, secrets, monitoring) with per-env workspaces; state in remote backend + locking.
- **Helm charts** per app; **Argo CD** for GitOps (declarative, auditable, drift-corrected) — optional but recommended.
- **tfsec/checkov** scan IaC in CI; plan posted to PR; apply gated.
- Everything reproducible; no click-ops in prod.

---

## 6. Observability (OpenTelemetry-first)

| Signal | Stack | Use |
|---|---|---|
| **Metrics** | Prometheus → Grafana | RPS, latency, error rate, saturation, queue depth, DB pool, cache hit, business KPIs |
| **Logs** | Loki (structured JSON) | Correlated by `requestId`/`orgId`/`traceId`; PII-scrubbed; sampled/retained by tier |
| **Traces** | Tempo (OTel) | Distributed request → DB/queue/external spans; slow-span alerts |
| **Errors** | Sentry | Grouped exceptions, release tracking, source maps |
| **Uptime** | Better Stack | External synthetic checks + status page |
| **Product** | PostHog | Funnels, feature adoption, session insights |

- **Correlation IDs** propagated across web→api→workers→db.
- **RUM** Web Vitals from real users.
- Dashboards per service + per business domain; on-call has a golden-signals view.

---

## 7. Alerting & on-call

- **SLOs with error budgets** (see §8); alert on **burn rate**, not raw spikes (reduce noise).
- **Severity levels** (SEV1–4) with defined response times + escalation.
- On-call rotation (PagerDuty/Opsgenie/Better Stack), runbooks linked from alerts.
- Alert on: error-budget burn, latency SLO breach, queue backlog, DLQ growth, DB replica lag, cache eviction storms, failed migrations, security events, cert expiry, cost anomalies.
- **Alert hygiene:** every alert is actionable + has a runbook; auto-resolve; suppress during deploys.

---

## 8. SLOs (starting targets)

| Service | SLO |
|---|---|
| API availability | 99.9% monthly |
| API read latency | p95 < 200ms |
| API write latency | p95 < 400ms |
| Realtime delivery | p95 < 500ms |
| Job success (non-DLQ) | > 99.5% |
| Error budget | 0.1%/month; freeze risky changes when burning |

---

## 9. Health checks & resilience

- `/health/live` (process up), `/health/ready` (deps reachable: DB/Redis/Meili) → K8s probes + LB.
- **Graceful degradation:** AI/integration outage → feature disabled with clear UX, core CRM unaffected; circuit breakers + timeouts + retries with backoff.
- **Autoscaling:** HPA (API by RPS/CPU), worker scale by queue depth (KEDA), DB replicas as needed.
- **Backups & DR:** automated encrypted backups + PITR, cross-region, quarterly restore drills, documented RTO/RPO (see [`21-maintenance-plan.md`](21-maintenance-plan.md)).

---

## 10. Cost & FinOps

- Cost dashboards + budget alerts (per env/service).
- Right-size + autoscale; committed-use/reserved at Stage B/C.
- Log/metric retention tiers (logs are a top hidden cost).
- Per-tenant AI/messaging quotas surfaced to product for pricing.

---

## 11. DevEx

- One-command local up (`docker compose up` + `pnpm dev`); seeded data.
- Fast CI (<10 min PR feedback) via caching + sharding.
- Preview envs for every PR; Storybook deployed; auto-generated API docs.
- Standardized scripts (`pnpm test/lint/build/e2e`); pre-commit hooks (lint, typecheck, secret-scan).

Next wave: [`16-roadmap-sprints-milestones.md`](16-roadmap-sprints-milestones.md) and [`17-ai-roadmap.md`](17-ai-roadmap.md).
