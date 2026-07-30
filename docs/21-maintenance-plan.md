# 21 · Maintenance Plan

> Deliverable 24. Keeping the platform healthy, secure, and current post-launch: routine ops, backups/DR, patching, dependency upkeep, on-call, and lifecycle.

---

## 1. Backups & disaster recovery

| Aspect | Policy |
|---|---|
| **DB backups** | Automated managed snapshots (daily) + **PITR** (continuous WAL); cross-region copies. |
| **RPO** (max data loss) | ≤ 5 min (PITR). |
| **RTO** (max downtime) | ≤ 1 hour (restore + failover). |
| **Restore testing** | **Quarterly** restore-to-scratch drills; verify integrity + measure RTO/RPO. |
| **Object storage (R2)** | Versioning + lifecycle; cross-region replication for critical buckets. |
| **Config/IaC** | In git (GitOps); reproducible from Terraform. |
| **Secrets** | Vault backup + rotation records. |
| **DR runbook** | Documented failover steps; region-loss scenario rehearsed. |

---

## 2. Routine operational cadence

| Cadence | Tasks |
|---|---|
| **Daily** | Review dashboards (golden signals), error budget, DLQ, failed jobs, security alerts, cost anomalies. |
| **Weekly** | Dependency updates (Renovate PRs), backlog of flaky tests, capacity check, backup verification, review new Sentry issues. |
| **Monthly** | Patch base images/OS, access review, restore drill (rotating), SLO report, cost review, partition maintenance. |
| **Quarterly** | DR drill, pen-test/security review, dependency major-version upgrades, architecture review, chaos test. |
| **Annually** | Full pen-test, SOC2 audit cycle, disaster simulation, tech-debt roadmap review. |

---

## 3. Patching & updates

- **Dependencies:** Renovate/Dependabot auto-PRs; CI gates (tests + security scan) must pass; security patches expedited (SLA by severity: critical ≤ 48h).
- **Base images/OS:** rebuilt monthly + on CVE; Trivy-scanned; rolling redeploy.
- **Framework majors** (Next/Nest/Prisma/etc.): planned per quarter, rehearsed on staging, changelog reviewed, feature-flagged if risky.
- **Database version upgrades:** rehearsed on staging replica; blue-green or logical-replication cutover; scheduled in low-traffic window.
- **Certificate rotation:** automated (cert-manager/Cloudflare) + expiry alerts.
- **Secret rotation:** scheduled; customer keys re-encrypted on rotation.

---

## 4. Data lifecycle

- **Retention policies** per data class (audit longest, activity/logs tiered); automated purge jobs.
- **Partition management** (pg_partman): create ahead, detach + archive to R2 cold storage, drop past retention.
- **GDPR erasure:** soft-delete → scheduled hard-purge + analytics anonymization; DSAR export/delete tooling.
- **Archival:** cold data to cheaper storage tiers; retrievable on demand.

---

## 5. Monitoring & health (ongoing)

- SLOs with error budgets; burn-rate alerts; monthly SLO report to stakeholders.
- Synthetic uptime checks + status page; RUM Web Vitals trend.
- Cost/FinOps dashboards + budget alerts per env/service.
- Capacity triggers monitored (see [`19-scaling-strategy.md`](19-scaling-strategy.md)).
- Quarterly review of noisy/low-value alerts (alert hygiene).

---

## 6. On-call & incident management

- **Rotation** (PagerDuty/Opsgenie/Better Stack); primary + secondary; humane schedule.
- **Severity matrix** (SEV1–4) with response/escalation times.
- **Incident lifecycle:** detect → declare → triage → mitigate → resolve → **blameless post-mortem** with action items tracked to closure.
- **Runbooks** for common failures (DB failover, queue backlog, provider outage, deploy rollback, cert expiry) — linked from alerts.
- **Comms:** internal channel + external status page + customer notice for SEV1/2.
- Tabletop exercises quarterly.

---

## 7. Technical debt & code health

- **Debt register** with owner + priority; ~15–20% of each sprint reserved for debt/reliability.
- Boy-scout rule; refactors gated by tests.
- Architecture reviews quarterly; deprecate/remove dead code + unused flags/indexes.
- Storybook + docs kept current (CI-enforced for design-system changes).

---

## 8. Support & customer-facing maintenance

- Tiered support (email/chat/tickets) with SLAs; KB self-serve.
- **Changelog** + in-app release notes; **status page**; deprecation notices (API 6-month window).
- Feedback loop (PostHog + support themes) → backlog.
- Scheduled-maintenance policy: announced windows, zero-downtime preferred, off-peak.

---

## 9. Ownership

| Area | Owner |
|---|---|
| Infra/backups/DR/on-call | Infra/SRE squad |
| Dependency/security upkeep | Security champion + squads |
| Data lifecycle/migrations | Platform squad |
| Design-system/docs health | Design-Eng |
| SLO/cost reporting | SRE + PM |

Next: [`22-production-runbook.md`](22-production-runbook.md).
