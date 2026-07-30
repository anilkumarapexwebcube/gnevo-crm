# 18 · Deployment Guide

> Deliverable 21. How to stand up and deploy the platform across environments, for the hybrid infra model (managed data + self-hosted app/API/workers behind Cloudflare).

---

## 1. Prerequisites

- Cloud account (AWS/GCP) with a managed **K8s** cluster (EKS/GKE) — or Fly.io/Railway for early stages.
- **Managed Postgres** (Neon/Supabase/RDS/Aurora) with `pgvector` enabled.
- **Managed Redis** (Upstash/ElastiCache).
- **Cloudflare** account (DNS, WAF, CDN, R2 bucket).
- **Meilisearch** (self-hosted on cluster or Meilisearch Cloud).
- Secrets manager (Vault / cloud secrets / sealed-secrets).
- Container registry (GHCR/ECR/GCR).
- Domain + TLS (Cloudflare / cert-manager + Let's Encrypt).
- GitHub repo with Actions enabled.

---

## 2. Local development

```bash
# 1. Clone + install
pnpm install

# 2. Start infra (Postgres, Redis, Meilisearch, MinIO, MailHog)
docker compose up -d

# 3. Configure env
cp .env.example .env   # fill DB/Redis/Meili/R2/AI keys (dev)

# 4. Migrate + seed
pnpm db:migrate
pnpm db:seed

# 5. Run everything (web + api + workers)
pnpm dev
```
- Env is validated at boot (Zod) — the app won't start with missing/invalid config.
- MailHog captures emails; MinIO emulates R2; seed provides a demo org + users.

---

## 3. Configuration & secrets

- **12-factor:** all config via env; no secrets in code/images.
- Per-env secret sets in the vault; injected into pods via CSI/sealed-secrets (never plain K8s Secrets in git).
- Required config groups: database URLs (primary + replica), Redis, Meili, R2/S3, auth (JWT/session secrets, OIDC client IDs/secrets), AI provider keys (platform default), comms (Resend/SES/Twilio/WhatsApp), observability (OTel/Sentry DSN), integrations (Google/MS/Stripe).
- **OIDC/cloud federation** for CI → no long-lived cloud keys.

---

## 4. Build & images

- Multi-stage Dockerfiles per app (`web`, `api`, `workers`) → small, non-root, distroless runtime.
- Images tagged by commit SHA; **signed with cosign**; scanned with Trivy in CI.
- Turborepo builds only changed packages (remote cache).

---

## 5. Kubernetes deployment

- **Helm chart per app** (Deployment, Service, HPA, PDB, probes, resource requests/limits).
- **Ingress** via Cloudflare → Nginx/Traefik ingress → services.
- **Workers** as separate Deployments scaled by queue depth (**KEDA**).
- **Realtime** gateway with sticky/Redis-adapter config.
- **Argo CD** (GitOps) reconciles manifests from git; **Argo Rollouts** for canary/blue-green.
- Namespaces per env; network policies restrict traffic.

```
apps → images → Helm values (per env) → Argo CD sync → Rollout (canary→blue-green)
managed: Postgres, Redis, R2, Meili (Cloud) — connected via secrets
edge: Cloudflare (DNS, WAF, CDN, R2)
```

---

## 6. Deploy pipeline (recap from DevOps doc)

1. Merge to `main` → CI builds/signs images.
2. Auto-deploy to **staging** → run migrations (expand) → smoke + E2E + k6 → gate.
3. Promote to **prod**: **canary** (5%) → automated SLO analysis → progressive shift → **blue-green** cutover.
4. Auto-rollback on metric breach; old ReplicaSet kept warm.
5. Post-deploy verification + release notes + status page update.

---

## 7. Database migration procedure (zero-downtime)

- **Expand → deploy dual-read/write → backfill job → contract** (see [`15-devops-strategy.md`](15-devops-strategy.md) §4).
- Migrations are a gated pipeline step, rehearsed on staging, with `CREATE INDEX CONCURRENTLY` and batched backfills.
- Rollback plan documented per migration (forward-fix preferred over destructive down-migrations in prod).

---

## 8. DNS, TLS, CDN

- Cloudflare DNS → proxied; **WAF + DDoS + bot rules** on.
- TLS via Cloudflare (edge) + cert-manager (in-cluster) for mTLS/internal.
- Cache rules: static/immutable long-cache + purge on deploy; API mostly no-cache except explicit cacheable GETs.
- R2 for assets/media (signed URLs), served via CDN.

---

## 9. First production launch checklist

- [ ] Infra provisioned via Terraform (cluster, DB+replica, Redis, R2, DNS, secrets, monitoring)
- [ ] Secrets loaded per env; config validated
- [ ] Migrations applied; seed of system roles/permissions
- [ ] Observability live (metrics/logs/traces/errors/uptime) + dashboards + alerts
- [ ] Backups + PITR enabled; restore tested
- [ ] WAF/rate limits/security headers verified
- [ ] Load test at expected launch concurrency passed
- [ ] E2E smoke green on prod; health checks green
- [ ] On-call rotation + runbooks in place; status page up
- [ ] Rollback rehearsed
- [ ] Security review / pen-test complete

---

## 10. Rollback & recovery

- **App:** instant rollback via blue-green (traffic back to old ReplicaSet) or Argo Rollouts abort.
- **Config:** GitOps revert.
- **Data:** PITR / snapshot restore (see [`21-maintenance-plan.md`](21-maintenance-plan.md) for RTO/RPO + DR).
- **Feature-level:** kill switch via feature flags without a deploy.

Next: [`19-scaling-strategy.md`](19-scaling-strategy.md).
