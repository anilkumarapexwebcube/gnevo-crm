# 22 · Production Documentation & Runbook

> Deliverable 25. The operational "how to run it in prod" reference: doc map, runbooks, dashboards, escalation, and the go-live gate. This ties the whole package together for the people who operate the system.

---

## 1. Documentation map (what exists & who reads it)

| Audience | Docs |
|---|---|
| **Leadership / stakeholders** | [Research](01-research-report.md), [Cost](03-cost-estimation.md), [Roadmap](16-roadmap-sprints-milestones.md), [Risk](20-risk-analysis.md) |
| **Architects / tech leads** | [Architecture](04-architecture.md), [Database](05-database-design.md), [API](07-api-design.md), [Scaling](19-scaling-strategy.md), [Tech comparison](02-technology-comparison.md) |
| **Developers** | [Folder structure](08-folder-structure.md), [API](07-api-design.md), [Automation](06-workflow-automation.md), [Design system](10-design-system.md), [Testing](14-testing-strategy.md) — plus auto-generated **OpenAPI docs** + **Storybook** |
| **Designers** | [Design system](10-design-system.md), [Wireframes](09-ui-wireframes.md) |
| **DevOps / SRE** | [DevOps](15-devops-strategy.md), [Deployment](18-deployment-guide.md), [Maintenance](21-maintenance-plan.md), this runbook |
| **Security** | [Security checklist](12-security-checklist.md), [Risk](20-risk-analysis.md) |
| **Product / PM** | [Feature list](11-feature-list.md), [Roadmap](16-roadmap-sprints-milestones.md), [AI roadmap](17-ai-roadmap.md) |
| **End users / admins** | User Guide + Admin Guide (authored during M2–M3 alongside features) + KB |

Living docs (kept current in CI): OpenAPI reference, Storybook, ERD (from Prisma), changelog, ADRs.

---

## 2. Go-live gate (must all be ✅ before GA)

- [ ] All P0 + committed P1 features complete + tested
- [ ] Security review + pen-test passed; OWASP checklist clean
- [ ] Tenant-isolation test suite green (RLS + app layer)
- [ ] Performance budgets met under launch-concurrency load test
- [ ] Observability live (metrics/logs/traces/errors/uptime) + dashboards + alerts + runbooks
- [ ] Backups + PITR + **tested restore**; DR runbook rehearsed
- [ ] Blue-green/canary + rollback rehearsed
- [ ] On-call rotation + escalation + status page live
- [ ] Legal: ToS, privacy policy, DPA, sub-processor list; GDPR tooling
- [ ] Support: KB, ticketing, SLAs, onboarding/migration guides
- [ ] Billing/subscription flow verified end-to-end
- [ ] Feature flags + kill switches for risky features

---

## 3. Key dashboards (SRE golden view)

1. **Service health:** availability, error rate, latency (p50/p95/p99) per service.
2. **Saturation:** CPU/mem/pods, DB connections/replica lag, Redis mem/evictions.
3. **Queues:** depth, throughput, latency, DLQ size per family.
4. **Business:** signups, active users, deals created, revenue, AI/messaging usage.
5. **AI/cost:** tokens, cost per org, cache hit rate, provider latency/error.
6. **Security:** failed logins, privilege changes, WAF blocks, anomaly flags.
7. **RUM:** Web Vitals (LCP/INP/CLS) by route.

---

## 4. Core runbooks (index)

Each runbook: **symptoms → diagnosis → mitigation → verification → post-mortem trigger.**

| Runbook | Trigger |
|---|---|
| **Deploy rollback** | SLO breach post-deploy / canary analysis fail |
| **DB failover / restore** | Primary down / data corruption / bad migration |
| **Replica lag high** | Reports slow / stale reads |
| **Queue backlog / DLQ growth** | Job latency SLO breach |
| **Redis outage / eviction storm** | Cache miss spike / session failures |
| **Provider outage (AI/Twilio/Stripe/Google)** | Integration errors → degrade gracefully |
| **Realtime overload** | WS latency / connection storms |
| **Security incident** | Suspicious access / breach indicator → IR process |
| **Cert expiry** | TLS alerts |
| **Cost anomaly** | Budget alert / usage spike |
| **Tenant isolation alert** | Any cross-org access anomaly (SEV1) |

### Example runbook — Deploy rollback (SEV2)
1. **Symptoms:** error rate > SLO, latency spike, or canary analysis failed post-deploy.
2. **Diagnose:** check service-health + traces dashboards; identify offending release (Sentry release tag).
3. **Mitigate:** Argo Rollouts **abort** → traffic returns to previous ReplicaSet (blue-green warm); or feature-flag kill switch if isolated.
4. **Verify:** error rate/latency back within SLO; smoke test critical journeys.
5. **Post-mortem:** always for SEV1/2 — blameless, action items tracked.

---

## 5. Escalation & severity

| SEV | Definition | Response | Comms |
|---|---|---|---|
| **SEV1** | Outage / data-loss / breach | Immediate, all-hands | Status page + customer notice + leadership |
| **SEV2** | Major degradation, no workaround | < 30 min | Status page + internal |
| **SEV3** | Minor degradation / workaround exists | Next business day | Internal |
| **SEV4** | Cosmetic / low impact | Backlog | — |

On-call primary → secondary → engineering lead → CTO. Every alert links its runbook.

---

## 6. Operational contacts & ownership

- **On-call:** rotation in PagerDuty/Opsgenie (Infra/SRE + domain squads for domain incidents).
- **Domain owners:** per CODEOWNERS ([`08-folder-structure.md`](08-folder-structure.md) §11).
- **Security incident lead:** security champion + IR runbook ([`12-security-checklist.md`](12-security-checklist.md) §8).
- **Status page + customer comms:** support lead + PM.

---

## 7. Change management

- All prod changes via GitOps + CI/CD (no click-ops).
- Migrations gated + rehearsed; expand/contract.
- Feature flags decouple deploy from release.
- Change log + release notes per deploy; risky changes announced.

---

## 8. Package status — planning complete

**All 25 deliverables drafted.** This package is the approved-pending source of truth. Recommended next steps once **you approve**:

1. **Review & sign-off** on the 4 trunk decisions (tenancy model, modular-monolith, multi-provider AI/BYO-key, first-party auth + WorkOS).
2. **Scaffold the monorepo** per [`08-folder-structure.md`](08-folder-structure.md) (Sprint 1 of the roadmap).
3. **Stand up foundation** (CI/CD, design system v1, auth+tenancy+RBAC, DB core) — Milestone M0.
4. Begin **CRM Core** vertical toward M1 (Alpha).

> Per the engagement rule — *no implementation until docs are approved.* Give the word (or flag changes) and I'll start Sprint 1 scaffolding.

---

### Full document index
See [`00-README.md`](00-README.md) for the live deliverables tracker linking all 25 items.
