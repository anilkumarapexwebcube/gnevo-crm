# 09 · UI Wireframes

> Deliverable 10. Low-fidelity layouts (ASCII wireframes) for the key screens, plus interaction notes. These define layout & flow; fidelity comes from the design system ([`10-design-system.md`](10-design-system.md)). Build these as clickable Figma frames before implementation.

---

## App shell

```
┌───────────────────────────────────────────────────────────────────────────┐
│ [≡] Gnevo   Office ▾   🔍 Search (⌘K)          + Create ▾   🔔3  🌙  👤 AI  │  ← Topbar
├──────────┬────────────────────────────────────────────────────────────────┤
│ SIDEBAR  │  BREADCRUMB > Section > Record                    [tabs] [⋯]   |
│          │ ┌────────────────────────────────────────────────────────────┐ |
│ ★ Pinned │ │                                                            │ |
│          │ │                    MAIN CONTENT AREA                       │ |
│ CRM      │ │              (list / board / detail / dashboard)           │ |
│  Leads   │ │                                                            │ │
│  Deals   │ │                                                            │ │
│ Delivery │ │                                                            │ │
│ Marketing│ │                                                            │ │
│ Finance  │ └────────────────────────────────────────────────────────────┘ │
│ Reports  │  [optional right panel / detail sheet slides in from right →]  │
│ Settings │                                                                │
│ ──────── │                                                                │
│ Presence │                                                                │
└──────────┴────────────────────────────────────────────────────────────────┘
```
- Sidebar collapsible to icons; sections expand/collapse; org/office switcher at top.
- Detail records open in a **right sheet** (keep list context) or full page (deep work).

---

## 1. Dashboard (role-aware)

```
┌─ Dashboard ───────────────────────────────  [This month ▾]  [Customize] ─┐
│ ┌KPI──────┐ ┌KPI──────┐ ┌KPI──────┐ ┌KPI──────┐                          │
│ │ Revenue │ │ New Lds │ │ Win %   │ │ Overdue │   each: value +Δ ↗ spark │
│ │ $128k▲12│ │  340 ▲8 │ │ 24% ▼2  │ │  7 tasks│                          │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘                          │
│ ┌ Pipeline funnel ──────────┐ ┌ Revenue trend (line) ─────────────────┐ │
│ │ ▓▓▓▓▓▓▓ New                │ │      ╱╲    ╱                          │ │
│ │ ▓▓▓▓▓ Qualified           │ │   ╱╲╱  ╲╱                             │ │
│ │ ▓▓▓ Proposal              │ │ ╱                                      │ │
│ └───────────────────────────┘ └───────────────────────────────────────┘ │
│ ┌ My tasks (today) ─────────┐ ┌ Recent activity (live) ───────────────┐ │
│ │ ☐ Call Acme  10:00        │ │ • Priya moved "Deal X" → Won  2m      │ │
│ │ ☐ SEO audit due           │ │ • New lead from Google Ads   5m       │ │
│ └───────────────────────────┘ └───────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```
- Widgets are drag-arrangeable; dashboards differ by role (Sales rep vs SEO lead vs Admin vs Finance). Realtime activity + KPIs update live.

## 2. Leads / Customers list (DataTable)

```
┌ Leads  (12,480)                    [＋ New] [Import] [Saved views ▾] [⋯] ┐
│ [Filter: Status ▾][Source ▾][Owner ▾][+Add]        🔍 in list   ⚙ density │
│ ┌──┬───────────┬─────────┬────────┬─────────┬────────┬─────────────────┐ │
│ │☐ │ Name      │ Company │ Status │ Source  │ Owner  │ Score  Created  │ │
│ ├──┼───────────┼─────────┼────────┼─────────┼────────┼─────────────────┤ │
│ │☐ │ R. Sharma │ Acme    │ ●New   │ GAds    │ Priya  │ 84 ▲   2h ago   │ │
│ │☐ │ ...       │         │ ●Qual  │ Organic │ Amit   │ 61     1d       │ │
│ └──┴───────────┴─────────┴────────┴─────────┴────────┴─────────────────┘ │
│ [◄ 50/page ►]                       (row click → detail sheet →)          │
└──────────────────────────────────────────────────────────────────────────┘
```
- Bulk select → bulk assign/tag/status/delete. Inline edit on click. Column config + saved views persist per user. Empty state with CTA when no leads.

## 3. Deal pipeline (Kanban)

```
┌ Pipeline: Sales ▾          [Board|List|Forecast]   ＋ Deal    Σ $312k   ┐
│ New (14)$40k │ Qualified(9)$88k │ Proposal(6)$120k │ Won(3)$64k │ Lost   │
│ ┌──────────┐ │ ┌──────────┐     │ ┌──────────┐     │ ┌────────┐ │        │
│ │ Acme     │ │ │ Globex   │     │ │ Initech  │     │ │ Umbrella│ │        │
│ │ $12k Priya│ │ │ $30k Amit│     │ │ $45k Sara│     │ │ $20k    │ │        │
│ │ ●●○ 60%  │ │ │ ●●● 75%  │     │ │ due 3d   │     │ └────────┘ │        │
│ └──────────┘ │ └──────────┘     │ └──────────┘     │            │        │
│  (drag card between columns → stage change + automation fires)           │
└──────────────────────────────────────────────────────────────────────────┘
```

## 4. Record detail (360° sheet / page)

```
┌ Acme Corp  ●Active   [Edit][＋][⋯]                              [× close] ┐
│ Owner: Priya   Value: $45k   Since: 2024   Health: ●Good                  │
│ ┌ Tabs: Overview | Activity | Deals | Projects | Notes | Files | AI ────┐ │
│ │ [Overview] Fields grid (editable)     │ Right rail:                   │ │
│ │  Industry, Website, Contacts...       │  • Next actions                │ │
│ │                                       │  • AI insights (churn risk,    │ │
│ │  Contacts (3)  Deals (2)  Invoices    │    upsell, summary)            │ │
│ │  linked records...                    │  • Recent activity             │ │
│ └───────────────────────────────────────┴───────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

## 5. SEO project workspace

```
┌ SEO · Acme.com   [Overview|Keywords|Rankings|Backlinks|Audit|Competitors]┐
│ ┌ Visibility ─────┐ ┌ Avg position ─┐ ┌ Traffic (GSC) ─┐ ┌ Issues ─────┐ │
│ │  ▲ 68 (+4)      │ │  12.3 (▲1.2)  │ │ 24.1k clicks   │ │  ● 3 critical│ │
│ └─────────────────┘ └───────────────┘ └────────────────┘ └─────────────┘ │
│ ┌ Keyword table ───────────────────────────────────────────────────────┐ │
│ │ Keyword      │ Vol │ Pos │ Δ7d │ URL          │ Intent │ Trend spark  │ │
│ │ seo agency   │ 8.1k│  4  │ ▲2  │ /services    │ comm   │ ╱╲╱          │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│  [Connect GSC][Connect GA4][Run audit]   AI: "3 quick wins ▸"            │
└──────────────────────────────────────────────────────────────────────────┘
```

## 6. Automation builder (canvas)

```
┌ Automation: New-Lead Nurture   [Draft ▾] [Test] [Publish]   [Runs: 1,204] ┐
│ Palette ▾ │  ┌ Trigger ─────┐                                             │
│ Triggers  │  │ Lead Created │                                             │
│ Actions   │  └──────┬───────┘                                             │
│ Logic     │      ┌──▼── Condition ──┐                                     │
│ Delay     │      │ Source = GAds?   │──no──┐                              │
│ Webhook   │      └──yes──┬───────────┘      ▼                             │
│ AI        │       ┌──────▼─────┐     ┌──────────────┐                     │
│           │       │Assign PPC  │     │Assign Sales  │                     │
│           │       └──────┬─────┘     └──────┬───────┘                     │
│           │          ┌───▼── Delay 1h ──┐   │                             │
│           │          └───────┬──────────┘   │                             │
│           │              ┌───▼── Send email ─┘                            │
│           │  (drag nodes, connect ports; click node → config panel →)     │
└───────────┴───────────────────────────────────────────────────────────────┘
```

## 7. AI assistant panel

```
┌ AI Assistant           Provider: [Claude ▾]  Model: [auto ▾]     [× ]    ┐
│  Context: Acme Corp                                                       │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ You: Summarize this account and suggest next steps                 │  │
│  │ AI: Acme is a $45k/yr SEO client, health good. 2 open deals...     │  │
│  │     Suggested: (1) upsell PPC — high intent keywords...            │  │
│  │     [Create task] [Draft email] [Add note]                        │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  [Ask anything about this workspace...]                    [RAG ●] [↑]   │
└──────────────────────────────────────────────────────────────────────────┘
```

## 8. Reports / Analytics

```
┌ Reports  [＋ New report]  [Templates ▾]  [Export: PDF|Excel|CSV]         ┐
│ [Segment: Dept ▾ | Date ▾ | Owner ▾]                                     │
│ ┌ Chart builder ────────────┐ ┌ Preview ──────────────────────────────┐ │
│ │ Metric: Revenue           │ │  (bar / line / funnel / table render)  │ │
│ │ Group by: Month           │ │                                        │ │
│ │ Filter: Won               │ │                                        │ │
│ └───────────────────────────┘ └────────────────────────────────────────┘ │
│  [Schedule email] [Save as view] [Add to dashboard]                      │
└──────────────────────────────────────────────────────────────────────────┘
```

## 9. Settings & permissions

```
┌ Settings                                                                  │
│ [Org|Offices|Departments|Teams|Members|Roles & Permissions|Billing|       │
│  Integrations|API Keys|Automations|Security|Audit Log|AI|Branding]        │
│ ┌ Roles & Permissions ─ matrix ──────────────────────────────────────┐   │
│ │ Resource   │ View │ Create │ Edit │ Delete │ Scope                  │   │
│ │ Deals      │  ☑   │   ☑    │  ☑   │   ☐    │ [Team ▾]               │   │
│ │ Invoices   │  ☑   │   ☐    │  ☐   │   ☐    │ [Own ▾]                │   │
│ └────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Interaction & state notes
- **Every list/board/detail** has: loading **skeleton**, **empty state** (illustration + CTA), **error state** (retry), and **realtime** update highlights.
- **Optimistic UI** on create/update/drag; rollback + toast on failure.
- **Right-sheet pattern** keeps list context; deep pages for focus work.
- **Mobile/responsive:** sidebar → bottom nav/drawer; tables → card list; boards → horizontal scroll.
- **Command palette** is the universal accelerator: navigate, create, search, run AI.

Next: [`11-feature-list.md`](11-feature-list.md).
