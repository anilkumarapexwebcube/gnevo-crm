# Gnevo CRM — Build Progress Checklist

Single source of truth for what is **done** vs **pending**, tracked against the docs
(`11-feature-list.md`, `16-roadmap-sprints-milestones.md`). Update this file as work lands:
tick a box the moment a feature is built **and** verified.

**Legend**
- `[x]` — Done & verified (code + data + wired in UI)
- `[ ]` — Pending, buildable now with **no paid credentials**
- `[-]` — Skipped by decision: needs a **paid** service / API key (Razorpay, PayPal, QuickBooks, Xero, GA4, GBP, Ahrefs, Zoom/Meet/Teams, WorkOS, paid email/SMS/WhatsApp)

_Last updated: 2026-07-28_

---

## M0 — Foundation
- [x] Multi-tenant orgs / offices / departments / teams (RLS + `forTenant`)
- [x] RBAC + permission matrix (resource × action × scope)
- [x] Auth: email + password, JWT access/refresh, sessions
- [x] Auth: magic link (email sign-in link; SMTP optional, dev returns link)
- [x] 2FA (TOTP via authenticator app — setup/QR/enable/disable + enforced at login)
- [x] WebAuthn passkeys (register in settings + passwordless sign-in)
- [x] Session & device management (list active sessions by device/IP + revoke + sign-out-everywhere)
- [-] Enterprise SSO (SAML/SCIM via WorkOS) — paid

## M1 — CRM Core
- [x] Customers / companies / contacts 360
- [x] Deal pipeline: multi-pipeline, stages, Kanban, forecast
- [x] Leads: capture + CRUD + AI lead scoring
- [x] Leads: duplicate detection + field-level merge (pick per-field value, moves notes, /leads/duplicates)
- [x] Leads: convert-to-customer (creates customer + primary contact, marks converted)
- [x] Activity timeline (per-record + global; auto-logs create/status/stage events)
- [x] Notes & tags (+ @mentions) — notes/call/email/meeting logging on customer+lead, tags with chips, @mention notifications
- [x] Notifications (in-app; bell + unread badge + mark read) — _email digest later_
- [x] Import / export CSV (leads + customers)
- [x] Audit-log write path (auth events, deletes, portal-access, 2FA changes) + admin viewer at /audit
- [x] Global search (Prisma-based; ⌘K palette) — _Meilisearch upgrade optional_
- [x] Role dashboards (overview) + basic reports
- [x] Dark / light theme

## M2 — Delivery + Automation + AI
- [x] Projects (per client, statuses)
- [x] Tasks (board + list)
- [x] Task subtasks / dependencies — nested subtasks (parentId) + blocked-by dependencies with live "Blocked by N" indicators; global create/edit dialog with project/assignee/dates/deps
- [x] Task views: gantt / calendar — /tasks workspace has List (subtask tree + status cycle) / Calendar (month grid by due date) / Gantt (start→due timeline bars, today marker, dependency ring); framer-motion view transitions
- [x] Milestones & timelines (per-project, due dates, progress bar, overdue flag)
- [x] Time tracking (log time on projects + totals) — _attendance later_
- [x] Employee directory (team list with roles + status at /directory)
- [x] **Team & user management (Phase 1+2)** — email invite (signed token, `/invite/accept` page, welcome email, bulk/CSV, resend/cancel/expiry) + auto account creation & sign-in; `/directory` people admin: change role, owner-only promote/demote admin, suspend/reactivate (session revoke), delete/restore, transfer ownership, last-admin/owner guards; audit + notifications. Roles: Owner/Admin/**HR**/Manager/Employee/Viewer + Client portal.
- [x] **Org structure (Phase 3)** — `/structure`: Offices / Departments / Teams full CRUD; department office+manager, team lead + add/remove members; invite dialog department+team pickers (auto-assigned on accept).
- [x] **Custom roles + permission matrix (Phase 4)** — `/roles`: resource×action grid editor, per-role scope (org/dept/own), create/edit/clone/delete custom roles, assign any role to members. Auth fix: JwtAuthGuard loads live roles/status per request (role change/suspend/delete instant, no re-login).
- [x] **Employee profile + productivity (Phase 5)** — Manage-profile dialog (designation/employee-ID/joining-date/reporting-manager + productivity stats), team CSV export; rebuilt `/profile` with dynamic employment details + productivity.
- [x] **HR module (Phase 6)** — `/hr`: attendance (clock in/out + history), leave requests (submit + HR approve/reject + cancel + notifications), holiday calendar (HR-managed). Role page UI fixed.
- [x] **User-mgmt polish** — avatar upload (1 MB limit, topbar/team/profile), CSV/Excel/PDF team export, HR people-analytics tab (headcount by role/dept, attendance rate, leave stats), configurable session idle-timeout (Settings → Security), org-chart tree view for /structure. _Workspace User Management M1–M13 complete; see docs/USER-MANAGEMENT.md._
- [x] Files: upload / download / delete + **inline preview** (images/PDF/**DOCX** via server-side mammoth→HTML) + **versioning** (upload new version, version history, latest-collapsed list); large preview modal (max-w-6xl) (customer + project; 8 MB, DB-stored) — _prod object-store (S3/R2) still a documented swap; needs paid creds_
- [x] Automation engine (triggers → actions, BullMQ worker, run inspector)
- [x] Automation templates
- [x] Automation conditions (IF/ELSE) + delays + wait-for-event
- [x] Automation client snapshots (per-customer health snapshots + trend, manual + weekly auto-capture)
- [x] AI provider layer (multi-provider, Groq-first) + BYO via env
- [x] AI chat assistant
- [x] AI content generation (via chat + automation `ai_generate`)
- [x] AI insights (churn / upsell) on customer
- [x] AI RAG search across workspace (embeddings) — /search, OpenAI→Gemini fallback embeddings + JS cosine
- [x] Task & meeting summaries (AI project-task summary + meeting brief)
- [x] SEO projects
- [x] Google Search Console integration (OAuth + sync)
- [x] Keyword rank tracking: daily snapshot history + scheduled worker + trend chart
- [x] Invoices: create / statuses / PDF / Stripe test checkout
- [-] GA4 analytics — paid/creds
- [-] Google Business Profile — paid/creds

## M3 — Marketing Suite + Finance + GA
- [x] Announcements (org broadcast)
- [x] Knowledge base (internal + client-facing articles, rich text)
- [x] Support tickets (threads) — _SLA / queues / macros pending_
- [x] Support: SLA timers (priority-based, on ticket) + canned macros (reply picker) — _queues filter later_
- [x] Canned replies (production) — dedicated Macro table; categories (Support/Sales/Billing/Technical/Custom); search/filter; template variables ({{customer_name}}/{{company_name}}/{{ticket_id}}/{{order_id}}); rich-text body + AI Generate; usage counter + last-used; duplicate/edit/delete/reorder; one-click insert + "/" macro picker in ticket reply editor
- [x] Internal chat (channels / DMs) — public/private channels + 1:1 DMs; member picker; per-channel unread badges; in-app notifications on new message; polling-based live refresh (4s); optimistic send; premium two-pane UI (framer-motion)
- [x] Calendar (in-app) + meeting scheduling (non-paid) — month grid, events + meetings, all-day, meeting URL/location/notes, attendee invites with in-app notifications + accept/decline RSVP, upcoming panel, organizer edit/delete; /calendar + Team section
- [x] Website / technical SEO audit (in-app crawler: title/meta/H1/canonical/word-count/alt/issues)
- [x] Competitor tracking (per SEO project — name/url/notes)
- [x] Content planner (idea → writing → review → published board at /content)
- [x] API keys management (create/revoke + key-based auth via X-API-Key / Bearer) — _fine-grained scopes later_
- [x] Platform webhooks (production) — managed registry + outbound HMAC-signed dispatch via BullMQ `webhooks` queue; edit/enable-disable/delete; Test button; delivery history (status code / response time / body / attempt); auto-retry w/ exponential backoff (5 attempts); last delivery status + failed count; regenerate signing secret; per-event payload preview; Copy CURL; URL validation — _inbound later_
- [x] Revenue / AR reporting — AR aging buckets (not-due/1-30/31-60/61-90/90+), outstanding/overdue/collected KPIs, 6-month billed-vs-collected trend; on /reports (`/v1/reports/ar`)
- [x] AI RAG search across workspace (embeddings) — `/search` semantic search over leads/customers/deals/tickets/notes/articles via OpenAI/Gemini embeddings (Float[]+JS cosine, no pgvector); reindex + relevance %; degrades gracefully w/o embedding key
- [x] Automation client snapshots — per-customer health snapshots (deals/revenue/outstanding/tickets/projects + health score) w/ trend chart on customer detail; manual capture + weekly auto-capture (BullMQ scheduled)
- [x] Task & meeting summaries — AI summary of a project's task board (progress/risks/next) on project detail; AI meeting brief (agenda/action items) on calendar event detail
- [-] Payments: Razorpay / PayPal — paid
- [-] Subscriptions & recurring billing — paid gateway
- [-] Backlink monitoring (Ahrefs) — paid
- [-] Social media planner — paid APIs
- [-] Email marketing — paid ESP
- [-] WhatsApp marketing — paid
- [-] Meetings: Zoom / Meet / Teams links — paid
- [-] Calendar 2-way Google/Outlook sync — creds
- [-] Contracts (e-sign) — paid
- [-] Enterprise SSO — paid

## M4 — Scale + Differentiators
- [x] Client portal — **proper login** (contact-based, own session, read-only invoices/projects/tickets)
- [x] Knowledge base (client-facing)
- [x] Automation templates
- [x] AI insights (churn / upsell)
- [x] Profile: view account
- [x] Settings page — categorized tabs (Account / Security / Workspace); 2FA (TOTP + passkeys), sessions, AI preferences all live
- [x] Custom report builder (source × dimension × metric → chart + table + CSV export)
- [x] Saved views (leads) & custom fields (customers, admin-defined)
- [x] Settings / branding (white-label: workspace name + brand color)
- [x] Scheduled reports (weekly email to owners/admins via SMTP; toggle in Settings → Workspace)
- [x] Generic export: Excel / CSV / PDF (leads + customers; invoice PDF too)
- [x] AI preferences (per-workspace default provider + model; wired into chat/insights/scoring)
- [-] Accounting sync (QuickBooks / Xero) — paid
- [x] PWA manifest (installable)

## M5 — Expansion
- [x] Advanced BI dashboards — /insights executive dashboard: KPI row (leads/customers/conversion/pipeline/won/revenue/avg-deal), conversion funnel, 6-mo leads-vs-revenue combo chart, top customers by revenue, deals-by-stage value (`/v1/reports/bi`)
- [x] Deeper integrations (Slack/Telegram + GitHub/Jira) — Settings→Workspace→Integrations: Slack/Telegram outbound event notifications (webhook/bot-token, no OAuth) w/ per-event toggles + Send-test; GitHub/Jira "Create issue" from a ticket (PAT / API-token). _Drive/Dropbox deferred — need OAuth app creds_
- [-] Marketplace — future
- [-] Native mobile apps — future (PWA covers mobile web)

---

## Suggested next order (free-buildable, highest impact first)
1. [x] Notifications (in-app)
2. [x] Activity timeline + notes/tags + @mentions
3. [x] Import / export CSV
4. [x] Files / attachments upload
5. [x] Audit-log write path
6. [x] 2FA (TOTP) + session/device management
7. [x] Lead dedupe + convert-to-customer
8. [x] Custom report builder + saved views + custom fields
9. [x] Settings / branding (white-label)
10. [x] Automation conditions + delays
11. [x] Rank-tracking snapshot history + scheduled worker
