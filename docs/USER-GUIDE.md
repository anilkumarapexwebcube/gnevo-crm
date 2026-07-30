# Gnevo CRM — Complete User Guide

A step-by-step guide to every tool in the CRM: what it does, when to use it, and how.
Read the **Setup order** first (once, as the owner/admin), then use the **Daily workflow**
and the per-feature sections as reference.

> **Access model:** Standard work pages (Leads, Customers, Deals, Projects, Tasks,
> Invoices, SEO, Content, Tickets, KB, Announcements, Chat, Calendar, AI, Search, Reports,
> Insights, Activity) are open to signed-in staff. Management areas (**HR admin, Team,
> Structure, Roles, Audit, Settings → Workspace**) are limited to **Owner / Admin / HR**
> as noted. Clients use a separate read-only **Portal**.

---

## Part 1 — First-time setup (do this once, as Owner/Admin)

Follow in this order so later steps have what they need.

1. **Register / sign in** → open the web app, **Register** to create your workspace (you
   become **Owner**), or sign in.
2. **Settings → Workspace → Branding** — set your workspace display name and brand color.
3. **Settings → Workspace → AI preferences** — pick your AI provider + model (needs an AI
   key configured). This powers every AI feature.
4. **Structure** — build your org: create **Offices** → **Departments** → **Teams**, and
   assign managers/leads. (Do this before inviting people so you can slot them in.)
5. **Roles** — review the built-in roles (Owner/Admin/HR/Manager/Employee/Viewer). Create
   custom roles if you need finer permissions.
6. **Team → Invite people** — invite staff (single or bulk CSV), assign each a role +
   department/team. They get an email invite to set their password.
7. **Settings → Workspace** — configure the extras you'll use:
   - **Custom fields** (extra fields on leads/customers/etc.)
   - **Macros** (canned ticket replies)
   - **Integrations** (Slack, Telegram, GitHub, Jira) — connect + **Test**
   - **API keys / Webhooks** (for external systems)
   - **Scheduled reports** (email digests — needs the Workers service running)
8. **Settings → Security** — set the **session timeout** policy; add a **passkey** for
   yourself; enable 2FA.

You're now ready to run day-to-day operations.

---

## Part 2 — The daily workflow (typical order)

1. **Dashboard** — see your forecast, tasks, and today's schedule.
2. **Leads** — add/triage new leads → qualify → **Convert to customer**.
3. **Deals** — track converted opportunities on the kanban; drag toward "Won".
4. **Customers** — manage accounts, contacts, notes, and give clients portal access.
5. **Projects / Tasks** — deliver the work; assign and move tasks to Done.
6. **Invoices** — bill customers; mark sent/paid or collect via Stripe.
7. **Tickets** — handle support requests.
8. **HR** — clock in/out, request leave.
9. **Reports / Insights** — review performance.

---

## Part 3 — Every feature, step by step

### Dashboard — `/dashboard`
**What:** Your personalized home. **When:** Start of day / quick status.
- 4 KPI cards (Open forecast, Open deals, Won value, My open tasks) — click any to jump in.
- **Pipeline by stage** chart, **Upcoming** events, and a task summary (Doing/Done/Overdue).
- **Jump back in** quick tiles to the main modules.

### Leads — `/leads`
**What:** Your sales lead pipeline. **When:** Any new prospect enters.
1. **New Lead** → fill company, contact, source.
2. Triage with the **status** and **source** filters; search by name.
3. Open a lead → add **notes**, **tags**, click **Score lead** (AI qualification score).
4. When qualified → **Convert to customer** (creates the customer record).
5. **Import / Export** CSV for bulk. **Views** → save your common filters as a named view.
6. **Duplicates** → find leads sharing an email and **Merge** them (pick the survivor +
   which field values to keep).

### Customers — `/customers`
**What:** Company/account records. **When:** After a lead converts, or add directly.
1. **New Customer** or open one from the list.
2. **Edit customer** (includes any custom fields you defined in Settings).
3. **Add contact** — people at that company (email/phone become click-to-contact).
4. **Assign account manager** — the staff owner for this client.
5. **AI insights** — Generate churn-risk & upsell suggestions.
6. Add **notes**, **attachments**, **tags**; view the **activity timeline**.
7. **Portal link** — generate client-portal access for this customer (see Part 5).

### Deals — `/deals`
**What:** Drag-and-drop sales pipeline (kanban). **When:** Track opportunities to close.
1. **New Deal** → title, value, starting stage.
2. **Drag cards** between stage columns as the deal progresses (saves instantly).
3. Column totals + **Open forecast** show pipeline value.
4. First time: seed the default Sales pipeline from the empty state.

### Projects — `/projects`
**What:** Client/delivery projects with task boards. **When:** After winning work.
1. **New Project** → open it.
2. **Task board** — 3-column kanban (To do / In progress / Done); drag or use each card's
   status select. **New Task** to add.
3. **Milestones** — add key dates/deliverables.
4. **Time log** — record time spent.
5. **AI project summary** — generate a status summary.
6. **Attachments** — upload project files.

### Tasks — `/tasks`
**What:** All your tasks across projects, 3 views. **When:** Manage your workload daily.
- **List / Calendar / Gantt** view toggle (Gantt shows dependencies + today marker).
- **New task** → project, title, priority, assignee, start/due, **blocked-by** dependencies.
- Add **subtasks**; **cycle status** by clicking the status dot; overdue + "Blocked by N"
  badges warn you.

### Invoices — `/invoices`
**What:** Billing. **When:** Bill a customer.
1. **New Invoice** → pick customer (add line items on the detail page).
2. On the invoice: **Mark sent**, **Mark paid**, **Share** (copy link), **Download/Print**.
3. **Pay with Stripe** — send the customer to Stripe checkout (needs Stripe keys set).

### SEO — `/seo`
**What:** SEO projects, keyword ranks, Google Search Console. **When:** Managing SEO clients.
1. **New SEO Project** → name + site URL.
2. Open it → **Connect Search Console** (Google OAuth) → then **Sync from GSC** to pull
   clicks/impressions/positions.
3. **Add keyword** → track position/clicks/impressions; open a keyword's **history**.
4. **On-page audit** — enter a URL → **Run audit** (status, title/meta length, H1s, word
   count, images missing alt…).
5. **Competitors** — add rival sites to watch.
6. **Snapshot** — capture a point-in-time ranking snapshot.

### Content — `/content`
**What:** Editorial planner. **When:** Planning blog/marketing content.
- Add an idea (title + optional due date); move it across **Ideas → Writing → Review →
  Published** with the chevron buttons.

### Tickets — `/tickets`
**What:** Customer support. **When:** A customer reports an issue.
1. **New Ticket** → subject, customer, priority.
2. Open it → **Reply** (rich text) → **Send**; **change status** as it progresses.
3. **Generate with AI** — draft a reply from the thread (review before sending).
4. **Macros** — insert canned replies (type `/`; supports `{{customer_name}}` etc.).
5. **Create issue** → push to **GitHub** or **Jira** (if integrated).
6. Watch the **SLA badge** (from priority + age).

### Knowledge Base — `/kb`
**What:** Internal help articles. **When:** Documenting processes/FAQs.
- **New article** → title, category, body, **Publish** toggle. Edit/delete later; browse by
  category with Published/Draft badges.

### Announcements — `/announcements`
**What:** Company-wide posts. **When:** Broadcasting news to staff.
- **New announcement** → title + body. Shows author + timestamp.

### Team Chat — `/chat`
**What:** Team messaging. **When:** Quick internal comms.
- **New channel** (public or **private/invite-only**, add members) or **New direct message**.
- Enter to send, Shift+Enter for a newline; unread badges show activity.

### Calendar — `/calendar`
**What:** Events & meetings. **When:** Scheduling.
- **New event** (or the per-day "+"); edit/delete; **RSVP Accept/Decline**; **AI summarize**
  an event; attendees come from your org members.

### HR — `/hr`
**What:** Attendance, leave, holidays (+ analytics for managers). **When:** Daily + approvals.
- **Employees:** **Clock in / Clock out**; **Request leave** (type, dates, reason); cancel a
  pending request; view holidays.
- **Managers (Owner/Admin/HR):** **Approve/Reject** leave; **add/delete holidays**;
  **Analytics** (headcount, attendance rate, present-today, working-hours this month);
  **Reports** (sign-ins + full attendance log).

### Automations — `/automations`
**What:** "When X happens, do Y" workflow builder. **When:** Automate repetitive steps.
> Requires the **Workers** service + Redis to actually run (new automations start paused).
1. **Templates** — one-click starters (Welcome new leads, Onboarding, Deal-stage alert,
   Task follow-up), or **New automation**.
2. **Trigger** — lead/customer/deal/task events or manual.
3. **Actions** (add several) — send email, notification, create task, assign owner, call
   webhook, AI generate.
4. Optional: **only-if condition**, **delay**, **wait-for-event**.
5. Activate it; watch the **Runs** log on the detail page.

### AI Assistant — `/ai`
**What:** Chat co-pilot. **When:** Draft copy, brainstorm, ask questions.
- Type a prompt (or use a starter suggestion); multi-turn chat. Uses your configured AI key.

### AI Search — `/search`
**What:** Semantic search across leads, customers, deals, tickets, notes, articles.
**When:** "Find that thing" across everything.
- Ask in plain language → ranked results with match %. **Reindex** after big data changes.
  (Needs an embedding provider key — OpenAI or Google AI.)

### BI Dashboard — `/insights`
**What:** Executive analytics (pipeline, conversion, revenue). **When:** Leadership review.
- Read-only KPI charts.

### Reports — `/reports`
**What:** Cross-entity analytics + export. **When:** Reporting/period reviews.
- **AR report** (invoice aging).
- **Custom report builder** — Source (Leads/Customers/Deals/Invoices) → Group by → Metric
  (Count / Sum) → **Run** → export.
- **Overview** charts (leads, deals, revenue, tasks) — **Export any chart to CSV**.

### Activity — `/activity`
**What:** Workspace-wide activity feed. **When:** Audit recent changes at a glance.

### Team (Directory) — `/directory` *(Owner/Admin/HR)*
**What:** People + invitations. **When:** Onboarding/offboarding, role changes.
- **Invite people** (single or bulk CSV; role + department/team). **Resend/Cancel** pending.
- Per member: **change role**, **Manage profile** (designation, employee ID, joining date,
  reporting manager), **Suspend/Reactivate**, **Delete/Restore**.
- **Transfer ownership** (Owner only). **Export** the roster (CSV/Excel/PDF).
- Managers see **Team performance** + activity panels.

### Structure — `/structure` *(Owner/Admin/HR to edit)*
**What:** Offices, departments, teams + org chart. **When:** Setup + reorganizations.
- **Org chart** view (reporting hierarchy) or **Manage** (Offices / Departments / Teams tabs).
- Create/edit/delete each; add/remove **team members**; open a **department dashboard**
  (members, teams, task completion, overdue).

### Roles — `/roles` *(Owner/Admin)*
**What:** Permissions (RBAC). **When:** Defining who can do what.
- **New role** → permission matrix (resource × action; "Manage" = all) + **data scope**
  (org / department / own).
- **Clone**, **Delete** (custom only), **Export** to JSON, **Import** from JSON. System
  roles are view-only.

### Audit Log — `/audit` *(Owner/Admin)*
**What:** Immutable security trail (who did what, when, from which IP). **When:** Security review.

### Settings — `/settings`
- **Account:** name, email.
- **Security:** password, 2FA, **passkeys**, **active sessions**, **login history**, and
  (admin) **session timeout** policy.
- **Workspace (Owner/Admin):** Branding, AI preferences, Scheduled reports, API keys,
  Webhooks, Integrations (Slack/Telegram/GitHub/Jira + Test), Macros, Custom fields.

### Profile — `/profile`
**What:** Your own employee profile. **When:** Update your photo / see your stats.
- **Avatar** upload; productivity stats; read-only employment/org info; shortcuts to
  Change Password / 2FA / My Tasks.

---

## Part 4 — Where AI shows up
Set the provider once in **Settings → Workspace → AI preferences**, then AI helps in:
- **AI Assistant** (/ai) and **AI Search** (/search)
- **Lead scoring** (Leads detail) and **Customer churn/upsell insights**
- **Ticket reply drafting** (Tickets)
- **Project summaries** and **Calendar event summaries**
- The **AI-generate action** inside Automations

---

## Part 5 — Client Portal (`/portal`)
A separate, **read-only** site for your customers (their own login — not the staff app).
1. In **Customers → [customer] → Portal link**, enable access and set which sections the
   client can see: **Projects / Invoices / Tickets**.
2. The client signs in at **`/portal/login`** and sees only their own company's data plus
   their **account manager**. They can **Edit profile** and **Change password** — but cannot
   create or edit business records.

---

## Part 6 — Role quick-reference
| Role | Can do |
|------|--------|
| **Owner** | Everything, incl. transfer ownership, billing, delete workspace data |
| **Admin** | Everything except owner-only actions; Workspace settings, Roles, Audit |
| **HR** | HR admin (leave approvals, holidays, analytics), Team & Structure management |
| **Manager** | Team performance views; standard CRM work; no workspace admin |
| **Employee** *(member)* | All standard CRM work pages; own HR (clock/leave); own profile |
| **Viewer** | Read-only access to standard pages |

---

*Deployment & environment setup: see `docs/DEPLOYMENT.md`. Local dev: `docs/SETUP-GUIDE.md`.*
