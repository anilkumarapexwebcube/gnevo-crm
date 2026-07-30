# Gnevo CRM — Enterprise Planning & Architecture Package

**Product:** A production-grade, multi-tenant SaaS CRM purpose-built for Digital Marketing & SEO agencies.
**Scale target:** 100,000+ customers · 1,000+ employees · multi-department, multi-office, multi-admin.
**Owner:** Gnevo Tech (support@gnevotech.org)
**Doc version:** v0.1 — draft for review
**Last updated:** 2026-07-23

---

## Confirmed engagement decisions

| Decision | Choice | Impact |
|---|---|---|
| **Infrastructure model** | **Hybrid** — managed data layer (Postgres, Redis, S3, Search) + self-hosted app/API containers behind Cloudflare | Cost, DevOps & scaling docs written against this model |
| **Team & timeline** | **Funded team (7+)**, full scope, concurrent squads | Roadmap assumes 4 parallel squads (CRM Core, Marketing, AI/Platform, Infra/DevOps) |
| **Delivery** | **Docs-first** in `/docs`, reviewed before code | No implementation until Phase 1 & 2 docs are approved |

---

## How to read this package

Documents are numbered by dependency order. The **trunk** (01–08) is the architectural spine; everything downstream references it. Read top-to-bottom for the first pass.

> ⚠️ **Pricing note:** All vendor prices in this package are indicative, based on publicly listed 2025–2026 pricing at time of writing. Treat them as planning estimates and re-confirm on vendor pricing pages before contracting. Enterprise/committed-use discounts (typically 15–40%) are not modeled unless stated.

---

## Deliverables tracker

| # | Deliverable | Document | Status |
|---|---|---|---|
| 1 | Complete Research Report | [`01-research-report.md`](01-research-report.md) | ✅ Draft |
| 2 | Technology Comparison | [`02-technology-comparison.md`](02-technology-comparison.md) | ✅ Draft |
| 3 | Cost Estimation | [`03-cost-estimation.md`](03-cost-estimation.md) | ✅ Draft |
| 4 | Free Trial Options | [`03-cost-estimation.md`](03-cost-estimation.md#free-trials--credits) | ✅ Draft (in cost doc) |
| 5 | Architecture Diagram | [`04-architecture.md`](04-architecture.md) | ✅ Draft |
| 6 | Database Diagram (ERD) | [`05-database-design.md`](05-database-design.md) | ✅ Draft |
| 7 | Workflow Diagram | [`06-workflow-automation.md`](06-workflow-automation.md) | ✅ Draft |
| 8 | API Design | [`07-api-design.md`](07-api-design.md) | ✅ Draft |
| 9 | Folder Structure | [`08-folder-structure.md`](08-folder-structure.md) | ✅ Draft |
| 10 | UI Wireframes | [`09-ui-wireframes.md`](09-ui-wireframes.md) | ✅ Draft |
| 11 | Design System | [`10-design-system.md`](10-design-system.md) | ✅ Draft |
| 12 | Feature List | [`11-feature-list.md`](11-feature-list.md) | ✅ Draft |
| 13 | Security Checklist | [`12-security-checklist.md`](12-security-checklist.md) | ✅ Draft |
| 14 | Performance Checklist | [`13-performance-checklist.md`](13-performance-checklist.md) | ✅ Draft |
| 15 | Testing Strategy | [`14-testing-strategy.md`](14-testing-strategy.md) | ✅ Draft |
| 16 | DevOps Strategy | [`15-devops-strategy.md`](15-devops-strategy.md) | ✅ Draft |
| 17 | Development Roadmap | [`16-roadmap-sprints-milestones.md`](16-roadmap-sprints-milestones.md) | ✅ Draft |
| 18 | Sprint Planning | [`16-roadmap-sprints-milestones.md`](16-roadmap-sprints-milestones.md) | ✅ Draft |
| 19 | Milestones | [`16-roadmap-sprints-milestones.md`](16-roadmap-sprints-milestones.md) | ✅ Draft |
| 20 | Future AI Roadmap | [`17-ai-roadmap.md`](17-ai-roadmap.md) | ✅ Draft |
| 21 | Deployment Guide | [`18-deployment-guide.md`](18-deployment-guide.md) | ✅ Draft |
| 22 | Scaling Strategy | [`19-scaling-strategy.md`](19-scaling-strategy.md) | ✅ Draft |
| 23 | Risk Analysis | [`20-risk-analysis.md`](20-risk-analysis.md) | ✅ Draft |
| 24 | Maintenance Plan | [`21-maintenance-plan.md`](21-maintenance-plan.md) | ✅ Draft |
| 25 | Production Documentation | [`22-production-runbook.md`](22-production-runbook.md) | ✅ Draft |

**Legend:** ✅ Draft delivered · 🔄 In progress · ⏳ Planned

> **Status: all 25 deliverables drafted (Phase 1 + Phase 2 complete).** Awaiting review/sign-off before implementation (Sprint 1 scaffolding).

---

## Delivery waves

- **Wave 1 (this batch):** Research, tech comparison, cost model. *The "why".*
- **Wave 2:** Architecture, database, automation engine, API, folder structure. *The "how" — the buildable spine.*
- **Wave 3:** Design system, wireframes, full feature catalog. *The "what it looks like".*
- **Wave 4:** Security, performance, testing, DevOps. *The "non-negotiables".*
- **Wave 5:** Roadmap, sprints, milestones, AI roadmap. *The "plan of record".*
- **Wave 6:** Deployment, scaling, risk, maintenance, production runbook. *The "run it in prod".*

---

## Product north star

> Build the CRM that a 1,000-person digital marketing agency actually wants to live in all day — as fast as Linear, as flexible as Notion, as deep as HubSpot, with SEO/PPC/content operations and AI woven into the core instead of bolted on.

Guiding principles, in priority order: **Security → Performance → UX → Clean Architecture → Scalability → AI-native → Maintainability.** No MVP shortcuts, no demo code.
