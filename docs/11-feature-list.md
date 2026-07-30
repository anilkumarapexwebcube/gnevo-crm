# 11 · Feature List (Complete Catalog)

> Deliverable 12. The full functional scope, organized by module, each with a one-line intent and priority tier. Tiers drive the roadmap ([`16-roadmap-sprints-milestones.md`](16-roadmap-sprints-milestones.md)).

**Priority tiers:** **P0** = core, must ship in v1 · **P1** = fast-follow · **P2** = differentiator/expansion · **P3** = future.

---

## Platform & foundation

| Feature | Intent | Tier |
|---|---|---|
| Multi-tenant orgs, offices, departments, teams | Org hierarchy & isolation | P0 |
| RBAC + permission matrix (resource×action×scope) | Fine-grained access | P0 |
| Auth: email, magic link, Google/Microsoft/GitHub SSO | Sign-in options | P0 |
| 2FA (TOTP), passkeys (WebAuthn), MFA | Account security | P0/P1 |
| Session & device management | See/revoke sessions | P1 |
| Enterprise SSO (SAML/SCIM via WorkOS) | Sell upmarket | P2 |
| Global search (Meilisearch) + AI search | Find anything fast | P0/P1 |
| Command palette (⌘K) + keyboard shortcuts | Speed | P0 |
| Notifications (in-app, email, push, digest, prefs) | Stay informed | P0 |
| Activity timeline (per record + global) | Audit of work | P0 |
| Audit logs (immutable) | Compliance/security | P0 |
| Files: upload, preview, versioning, virus scan | Document handling | P0/P1 |
| Saved views & custom fields | Personalization | P1 |
| Dark/light theme, i18n-ready, a11y AA | Inclusive UX | P0 |
| Settings & branding (white-label) | Agency resell | P2 |
| API management (keys, scopes, usage) | Integrator platform | P1 |
| Webhooks (in/out, signed, retried) | Extensibility | P1 |

## CRM Core

| Feature | Intent | Tier |
|---|---|---|
| Lead management (capture, dedupe, assign, convert) | Top of funnel | P0 |
| Lead scoring (rules + AI) | Prioritize | P1 |
| Lead forms + landing pages | Capture inbound | P1/P2 |
| Customer/Company/Contact management (360°) | Relationship record | P0 |
| Deal pipeline (multi-pipeline, stages, Kanban, forecast) | Sales tracking | P0 |
| Activities (calls, emails, meetings logged) | Interaction history | P0 |
| Notes, tags, mentions | Context | P0 |
| Duplicate detection & merge | Data hygiene | P1 |
| Import/export (CSV, mapping, resumable) | Onboarding data | P0/P1 |

## Delivery (agency work)

| Feature | Intent | Tier |
|---|---|---|
| Projects (per client, templates, statuses) | Deliver work | P0 |
| Tasks (assignees, subtasks, dependencies, priorities) | Execution | P0 |
| Multiple views: list/board/gantt/calendar | Flexibility | P1 |
| Milestones & timelines | Planning | P1 |
| Time tracking & attendance | Ops/HR | P1 |
| Employee directory & profiles | HR | P1 |
| Assets & inventory | Resource tracking | P2 |
| Goals & performance | Management | P2 |
| Commission tracking | Sales incentive | P2 |

## Marketing / SEO (the differentiator)

| Feature | Intent | Tier |
|---|---|---|
| SEO projects (per client site) | SEO workspace | P0 |
| Google Search Console integration | Search data | P0/P1 |
| Google Analytics (GA4) integration | Traffic data | P1 |
| Google Business Profile integration | Local SEO | P2 |
| Keyword tracking & rank tracking (daily snapshots) | Core SEO metric | P1 |
| Backlink monitoring | Off-page SEO | P2 |
| Website audit / technical audit (issues + fixes) | On-page health | P1/P2 |
| Competitor analysis | Benchmarking | P2 |
| Content planner & calendar | Editorial ops | P1 |
| AI content assistant | Faster content | P1 |
| Social media planner | Cross-channel | P2 |
| Campaign tracking | Attribution | P2 |
| Email marketing (campaigns, sequences) | Nurture | P1/P2 |
| WhatsApp marketing | Direct channel | P2 |

## Finance

| Feature | Intent | Tier |
|---|---|---|
| Invoices (create, send, PDF, statuses) | Billing | P0/P1 |
| Payments (Stripe/Razorpay/PayPal) + reconciliation | Get paid | P1 |
| Subscriptions & recurring billing | Retainers | P1 |
| Contracts (e-sign, renewals) | Agreements | P2 |
| Revenue & AR reporting | Finance visibility | P1 |
| QuickBooks/Xero sync | Accounting | P2 |

## Collaboration & support

| Feature | Intent | Tier |
|---|---|---|
| Internal chat (channels, DMs) | Team comms | P1 |
| Client chat / shared portal | Client comms | P2 |
| Meetings + Zoom/Meet/Teams links | Scheduling | P1 |
| Calendar (2-way Google/Outlook sync) | Time management | P1 |
| Announcements | Org broadcast | P1 |
| Knowledge base (internal + client-facing) | Self-serve docs | P1/P2 |
| Support tickets (SLA, queues, macros) | Client support | P1 |
| Presence, typing, live cursors | Realtime collab | P1 |

## Automation

| Feature | Intent | Tier |
|---|---|---|
| Visual workflow builder (drag-drop) | No-code automation | P1 |
| Triggers / conditions (IF/ELSE) / actions | Logic | P1 |
| Delays, schedulers, wait-for-event | Timing | P1 |
| Webhooks & HTTP actions | Integrate anything | P1 |
| Run inspector, retries, DLQ, dry-run | Reliability | P1 |
| Automation templates & client snapshots | Fast client setup | P2 |

## AI (multi-provider, core)

| Feature | Intent | Tier |
|---|---|---|
| Provider selection (OpenAI/Claude/Gemini/DeepSeek/Grok/Perplexity/OpenRouter) + BYO-key | No lock-in | P0/P1 |
| AI chat assistant (workspace-aware, RAG) | Ask anything | P1 |
| Content writing (blogs, emails, ads, meta) | Marketing output | P1 |
| SEO suggestions (on-page, keywords, audits) | SEO value | P1/P2 |
| Email & message drafting | Comms speed | P1 |
| Task & meeting summaries | Save time | P1 |
| Customer insights (health, churn, upsell) | Revenue | P2 |
| Lead scoring (AI) | Prioritization | P1 |
| AI search across workspace (RAG over KB/records) | Instant answers | P1 |
| AI in automations (generate/classify/extract) | Smart flows | P2 |

## Reports & analytics

| Feature | Intent | Tier |
|---|---|---|
| Prebuilt dashboards (role-aware) | At-a-glance | P0 |
| Custom report builder | Self-serve BI | P1/P2 |
| Funnels, revenue, conversion, SEO, projects, employees, customers, tasks, marketing | Coverage | P1/P2 |
| Scheduled reports (email) | Push insights | P2 |
| Export: Excel/CSV/PDF | Share out | P1 |

## Integrations

| Category | Integrations | Tier |
|---|---|---|
| Google Workspace | Calendar, Drive, GSC, GA4, GBP, Meet | P1/P2 |
| Microsoft 365 | Outlook, Calendar, OneDrive, Teams | P1/P2 |
| Payments | Stripe, Razorpay, PayPal | P1 |
| Accounting | QuickBooks, Xero | P2 |
| Storage | Google Drive, Dropbox, OneDrive | P2 |
| Dev/PM | GitHub, GitLab, Jira, Trello, Asana, ClickUp, Notion | P2/P3 |
| Comms | Slack, Teams, Telegram, Google Chat | P1/P2 |
| Video | Zoom, Google Meet | P1 |

---

## Scope summary by tier

- **P0 (v1 core):** foundation (tenancy, RBAC, auth, search, notifications, audit, files), CRM core (leads, customers, deals, activities), role dashboards, basic reports, AI provider foundation.
- **P1 (fast-follow):** projects/tasks, automation engine, AI assistant + content, SEO project + GSC/GA4 + rank tracking, invoices/payments, calendar/meetings, internal chat, tickets, custom fields/views, webhooks/API, passkeys.
- **P2 (differentiators):** full marketing suite (audits, backlinks, competitors, campaigns, social, email/WhatsApp marketing), subscriptions/contracts, commission/goals, client portal, KB, automation templates/snapshots, enterprise SSO, accounting sync, custom report builder, AI insights.
- **P3 (future):** deeper PM integrations, marketplace, mobile apps, advanced BI — see [`17-ai-roadmap.md`](17-ai-roadmap.md) and roadmap.

This catalog is the master checklist; the roadmap sequences it into sprints and milestones.
