# 16 · Development Roadmap, Sprints & Milestones

> Deliverables 17 (roadmap) + 18 (sprint planning) + 19 (milestones). Assumes a **funded 7+ team in 4 squads** running **2-week sprints**, working from the feature tiers in [`11-feature-list.md`](11-feature-list.md).

---

## 1. Squad structure

| Squad | Owns | Members (indicative) |
|---|---|---|
| **CRM Core** | Auth-consuming CRM features: leads, customers, deals, projects, tasks, activities, dashboards | 2 FS |
| **Marketing** | SEO projects, GSC/GA4, rank/keyword, audits, campaigns, content, marketing comms | 2 FS |
| **AI / Platform** | AI gateway + RAG, automation engine, search, notifications, integrations, API | 2 FS + 1 |
| **Infra / SRE + Design-Eng** | K8s/Terraform/CI-CD/observability + design system, shared UI | 1 SRE + 1 Design-Eng |
| **Cross-cutting** | Principal (arch/standards), PM (specs/roadmap), QA/SDET (harness), Security (fractional) | shared |

Shared foundations (design system, `packages/types`, auth, tenancy) are built **first and jointly** so squads don't block each other.

---

## 2. Milestones (quarterly outcomes)

| Milestone | Target | Outcome |
|---|---|---|
| **M0 — Foundation** | End of Month 1 | Monorepo, CI/CD, design system v1, auth+tenancy+RBAC, DB schema core, observability skeleton. *Nothing user-facing yet, but everything builds on it.* |
| **M1 — CRM Core (Alpha)** | End of Month 3 | Leads → customers → deals pipeline, activities, notifications, global search, role dashboards, audit. Internal dogfooding starts. |
| **M2 — Delivery + Automation + AI (Beta)** | End of Month 5 | Projects/tasks, automation engine, AI assistant + content, SEO project + GSC/rank tracking, invoices. **Private beta with real agency users.** |
| **M3 — Marketing Suite + Finance + GA (v1.0)** | End of Month 7 | Full SEO/marketing suite (audits, backlinks, competitors, campaigns), payments/subscriptions, calendar/meetings, chat, tickets, API/webhooks, enterprise SSO. **General Availability.** |
| **M4 — Scale + Differentiators (v1.x)** | Months 8–10 | Client portal, KB, custom report builder, automation templates/snapshots, AI insights, accounting sync, hardening to Stage-C scale. |
| **M5 — Expansion** | Months 10–12+ | Deeper integrations, mobile/PWA, marketplace, advanced BI, AI roadmap phase 2 (see [`17-ai-roadmap.md`](17-ai-roadmap.md)). |

---

## 3. Sprint-by-sprint plan (first two quarters)

> 2-week sprints. Each sprint lists the **primary deliverable per squad**. Definition-of-Done for every item: spec + tests (unit/integration) + a11y + docs + observability + security checklist passed.

### Quarter 1 — Foundation → CRM Alpha

**Sprint 1 — Bootstrap**
- Infra: monorepo (pnpm/Turbo), CI (lint/test/build), Docker Compose, base K8s + Terraform skeleton, Sentry/OTel wiring.
- Design-Eng: design tokens + core primitives (Button/Input/Table/Dialog/Toast), Storybook.
- Platform: Prisma schema (orgs/users/roles/permissions), RLS policies, tenant middleware.
- CRM: auth service (email + session + JWT), login/signup UI.

**Sprint 2 — Identity & shell**
- Auth: OIDC social (Google/MS/GitHub), TOTP, passkeys, sessions/devices.
- RBAC: permission matrix + guards + settings UI (roles).
- App shell: sidebar/topbar/command palette, theme, notifications scaffold.
- Platform: audit log + activity timeline infra; global search (Meili) index pipeline.

**Sprint 3 — Leads & customers**
- CRM: leads CRUD, list (DataTable), detail sheet, import/export, assignment, dedupe.
- CRM: customers/contacts/companies 360°.
- Platform: notifications (in-app + email) + realtime gateway (presence, live updates).
- Design-Eng: patterns (EmptyState, FilterBar, PageHeader, StatCard, skeletons).

**Sprint 4 — Deals & dashboards**
- CRM: pipelines, stages, deal Kanban (drag-drop), forecast, activities.
- CRM: role-aware dashboards + KPI tiles + charts (Recharts).
- Platform: reports foundation (read replica, materialized views), export (CSV/Excel/PDF).
- SRE: staging env, canary/blue-green pipeline, k6 baseline, load test login/list/board.

**→ M1 (CRM Alpha)** — internal dogfooding.

### Quarter 2 — Delivery + Automation + AI → Beta

**Sprint 5 — Projects & tasks**
- CRM: projects (templates, statuses), tasks (assignees, subtasks, dependencies), views (list/board/calendar).
- Platform: files (upload, preview, versioning, ClamAV), storage abstraction (R2).

**Sprint 6 — Automation engine v1**
- AI/Platform: workflow builder canvas, triggers/conditions/actions/delay, BullMQ executor, run inspector, retries/DLQ, dry-run.
- Platform: webhooks (in/out, signed, retried) + API keys/scopes + OpenAPI docs.

**Sprint 7 — AI foundation**
- AI: provider abstraction (OpenAI/Claude/Gemini/DeepSeek/Grok/Perplexity/OpenRouter) + BYO-key, model router, quota/cost tracking, prompt-injection guards.
- AI: assistant panel (RAG over workspace via pgvector), content writing, summaries, lead scoring.

**Sprint 8 — SEO core + Finance start**
- Marketing: SEO projects, GSC integration, keyword + rank tracking (daily snapshot jobs), basic audit.
- Finance: invoices (create/send/PDF), payment gateway (Stripe) start.
- SRE: scale test to Stage-B load; partitioning on high-volume tables.

**→ M2 (Beta)** — private beta with real agency users.

### Quarter 3 — Marketing Suite + Finance + GA (summary)
- Marketing: GA4, GBP, backlinks, technical audit depth, competitor analysis, content planner/calendar, campaign tracking, email/WhatsApp marketing, social planner, landing pages/lead forms.
- Finance: payments (Razorpay/PayPal), subscriptions/recurring, contracts/e-sign, commission, AR reporting.
- Collaboration: calendar 2-way sync, meetings (Zoom/Meet/Teams), internal chat, announcements, tickets, KB.
- Platform: enterprise SSO (WorkOS SAML/SCIM), custom report builder, integrations (Drive/Outlook/etc.), API hardening + rate-limit tiers.
- SRE: full observability/SLOs, DR drill, security pen-test, GA readiness review.

**→ M3 (v1.0 GA).**

### Quarter 4+ — Scale & differentiators
- Client portal, automation templates/snapshots, AI insights (churn/upsell), accounting sync (QuickBooks/Xero), deeper PM integrations, mobile/PWA, marketplace, advanced BI, Stage-C hardening.

**→ M4 / M5.**

---

## 4. Cross-cutting workstreams (continuous)

- **Security:** checklist gating every PR; quarterly pen-test; SOC2 evidence trail from day one.
- **Performance:** budgets enforced in CI; load test each release.
- **QA:** E2E harness grows with features; flake budget maintained.
- **Docs:** API docs auto-generated; user/admin/dev guides written alongside features.
- **Design:** Storybook + visual regression; a11y audits.

---

## 5. Ceremonies & cadence

- 2-week sprints: planning (Mon), daily async standup, mid-sprint sync, demo + retro (Fri wk2).
- Per-squad backlog groomed weekly; cross-squad dependency board.
- Monthly milestone review vs the plan; adjust scope, not quality.
- Quarterly roadmap re-plan with beta feedback.

---

## 6. Definition of Done (every story)

- [ ] Spec + acceptance criteria met
- [ ] Unit + integration tests (critical paths E2E)
- [ ] Tenant-scoped + RBAC-enforced + audited
- [ ] a11y (axe) + dark/light + responsive
- [ ] Perf budget met (no N+1, cached, paginated)
- [ ] Observability (logs/metrics/traces) added
- [ ] Security checklist passed
- [ ] Docs/Storybook updated
- [ ] Reviewed (CODEOWNERS) + CI green

---

## 7. Risks to the schedule
See [`20-risk-analysis.md`](20-risk-analysis.md). Top schedule risks: integration API approvals (Google/Meta verification lead times), scope creep on the marketing suite, and AI cost/latency tuning. Mitigations tracked there.

Next: [`17-ai-roadmap.md`](17-ai-roadmap.md).
