# 20 · Risk Analysis

> Deliverable 23. Key risks across product, technical, security, operational, and business dimensions — with likelihood, impact, and mitigation. Reviewed each milestone.

**Scoring:** Likelihood (L) / Impact (I): Low / Med / High.

---

## 1. Technical risks

| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| T1 | **Tenant data leak** (cross-org access bug) | Med | High | Two-layer isolation (app filter + **Postgres RLS**); dedicated isolation test suite; deny-by-default; security review of every data path; pen-test. |
| T2 | **Scope creep on marketing/SEO suite** delays GA | High | High | Strict P0/P1/P2 tiering; GA = v1.0 with P0/P1 only; suite depth is post-GA; PM guards scope per sprint. |
| T3 | **DB becomes the bottleneck** at scale | Med | High | PgBouncer + replicas + partitioning early; `pg_stat_statements`; capacity triggers ([`19-scaling-strategy.md`](19-scaling-strategy.md)); load test each release. |
| T4 | **AI cost/latency runaway** | Med | High | BYO-key default; per-org quotas; response cache; cheap-first routing; cost dashboards + alerts. |
| T5 | **Third-party API limits/changes** (Google/Meta/Stripe) | Med | Med | Abstraction layer per integration; graceful degradation; monitor deprecations; sandbox contract tests nightly. |
| T6 | **Automation engine reliability** (stuck/duplicate runs) | Med | High | Idempotency, retries+DLQ, loop guards, run inspector, dry-run; graduate to Temporal for complex flows. |
| T7 | **Realtime scaling issues** (fan-out storms) | Med | Med | Redis adapter, tight room scoping, event coalescing/backpressure; consider managed realtime. |
| T8 | **Monorepo/build complexity** slows CI | Low | Med | Turborepo caching + sharding; keep CI < 10 min; remote cache. |
| T9 | **Prompt injection / unsafe AI actions** | Med | High | Untrusted-input handling, server-side authz on all AI/agent actions, human confirm for side effects, audit. |

---

## 2. Security & compliance risks

| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| S1 | Breach / credential compromise | Med | High | MFA/passkeys, secrets vault, least privilege, WAF, audit + alerting, IR runbook, pen-test/bug bounty. |
| S2 | GDPR/data-residency non-compliance | Med | High | DSAR tooling, retention/erasure, region-pinned option, DPA/sub-processor list, data catalog. |
| S3 | Supply-chain (dependency) compromise | Med | Med | Dependabot/Renovate, Trivy, SBOM, pinned deps, signed images, secret scanning. |
| S4 | Insider/over-privileged access | Low | High | RBAC least-privilege, break-glass logging, access reviews, immutable audit. |
| S5 | SOC2 readiness gaps at enterprise sales | Med | Med | Build evidence trail from day one (policies, access reviews, change mgmt, logging). |

---

## 3. Operational risks

| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| O1 | Deploy causes outage | Med | High | Canary + blue-green + auto-rollback; expand/contract migrations; smoke gates. |
| O2 | Data loss / bad migration | Low | High | PITR + tested restores, migration rehearsal on staging, forward-fix bias, backups cross-region. |
| O3 | Alert fatigue / missed incident | Med | Med | SLO burn-rate alerts (not spikes), actionable alerts + runbooks, on-call rotation, tabletop drills. |
| O4 | Observability blind spots | Med | Med | OTel end-to-end, correlation IDs, golden-signal dashboards, RUM. |
| O5 | Key-person dependency | Med | Med | CODEOWNERS shared, docs/runbooks, pairing, no single-owner critical path. |

---

## 4. Product & UX risks

| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| P1 | Building features nobody uses (over-engineering) | Med | Med | Private beta with real agencies from M2; usage analytics (PostHog); tier by validated demand. |
| P2 | UX not actually better than competitors | Med | High | Design system + Storybook + a11y + perf budgets; usability testing; benchmark against Linear/HubSpot; dogfood. |
| P3 | Onboarding/migration friction (leaving GHL/HubSpot) | Med | High | Import tooling, snapshots/templates, migration guides, white-glove for early enterprise. |
| P4 | Notification/automation overload annoys users | Med | Med | Granular prefs, digests, sensible defaults, kill switches. |

---

## 5. Business & schedule risks

| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| B1 | Integration approval lead times (Google/Meta app verification) | High | Med | Start verification **early** (Sprint 1–2); design for degraded/no-integration mode; sandbox first. |
| B2 | Cost overrun (infra/AI/messaging) | Med | Med | Stage-based budgets, quotas, BYO-key, FinOps dashboards, committed-use later. |
| B3 | Team ramp / hiring delays | Med | Med | Foundation-first so small core unblocks squads; clear onboarding docs; contractors for spikes. |
| B4 | Competitor moves (HubSpot/GHL add agency+AI) | Med | Med | Ship the wedge fast; depth in SEO ops + multi-provider AI is hard to copy quickly; keep velocity. |
| B5 | Vendor lock-in / pricing changes | Low | Med | Abstractions (storage/AI/search/auth) keep swaps cheap; prefer OSS/self-host options where ops allows. |

---

## 6. Top-5 risks to watch (heat-mapped)

1. **T1 — Tenant data leak** (High impact) → the #1 engineering guardrail.
2. **T2 — Scope creep** (High L×I) → the #1 schedule guardrail.
3. **T4/T9 — AI cost & safety** → the #1 differentiator-risk.
4. **B1 — Integration approvals** → the #1 external-dependency risk; start now.
5. **O1/O2 — Deploy/data safety** → the #1 operational risk.

Each is tracked with an owner + status in the milestone review. Next: [`21-maintenance-plan.md`](21-maintenance-plan.md).
