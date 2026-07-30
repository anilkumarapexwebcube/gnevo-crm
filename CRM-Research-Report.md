# CRM System — Complete Research & Build Report
### For: Gnevotech (Marketing Company) | Prepared: 23 July 2026 | Senior Full-Stack Perspective

---

## 0. TL;DR (Ek Line Mein)

Ek **production-ready, AI-powered CRM** banayenge using **Next.js 15 + TypeScript + Supabase (Postgres) + Vercel**, integrated with **email/WhatsApp/SMS + payment + AI**. Sab kuch **free tier** pe start hoga, aur zarurat padne par har tool ko paise dekar scale kar sakte hain — bina code badle.

**Recommended Tool Name: `NexoCRM`** (alternatives niche diye hain).

---

## 1. Tool Naam Suggestions (Marketing Company ke liye)

| Name | Feel | Domain availability check karein |
|------|------|------|
| **NexoCRM** ⭐ (Recommended) | Modern, "connection/nexus" ka sense, easy to say | nexocrm.com / .io |
| **Gnevo CRM** | Aapki company brand ke saath align | gnevocrm.com |
| **Pulse** | Marketing "heartbeat", campaigns ka dhadkan | pulsecrm.io |
| **Orbit** | Clients aapke around ghoomte hain | orbitcrm.io |
| **Momentum** | Growth/sales momentum | momentumcrm.io |
| **Zenlead** | Zen + Leads, calm lead management | zenlead.io |

> **Recommendation:** **NexoCRM** — short, brandable, marketing-friendly, `.io`/`.com` milne ke chances acche. Final decision se pehle domain + trademark check kar lena.

---

## 2. Yeh CRM Kis Cheez Ka Hoga? (Marketing Company ki Requirements)

Ek marketing agency/company ke liye CRM sirf "contacts ki list" nahi hota. Yeh chahiye:

### Core Modules
1. **Lead Management** — website form, ads, WhatsApp, email se leads auto-capture
2. **Sales Pipeline (Kanban)** — drag-and-drop deal stages (New → Qualified → Proposal → Won/Lost)
3. **Contact & Company (360° view)** — har client ki poori history ek jagah
4. **Marketing Campaigns** — Email + WhatsApp + SMS bulk campaigns with templates
5. **Marketing Automation** — "agar lead 3 din reply na kare toh follow-up bhejo" jaise workflows
6. **Client Project/Account Management** — agency clients ke projects, deliverables track
7. **Task & Activity Management** — calls, meetings, reminders, calendar sync
8. **Invoicing & Payments** — proposals, invoices, online payment collection
9. **Analytics & Reporting Dashboard** — revenue, conversion rate, campaign ROI
10. **AI Assistant** — email drafting, lead scoring, chat summaries, next-best-action
11. **Team & Roles (RBAC)** — Admin / Manager / Sales Rep / Client permissions
12. **Multi-client Workspaces** — agency multiple brands ke liye alag workspace (optional)

### Non-Functional Requirements
- ⚡ **Fast** — page load < 1s, server actions optimized
- 🎨 **Best UI/UX** — clean, modern, responsive (mobile + desktop)
- 🔒 **Secure** — RBAC, row-level security, encrypted data
- 📈 **Scalable** — 10 users se 10,000+ tak bina rewrite
- 🌐 **Multi-channel** — Email, WhatsApp, SMS ek jagah

---

## 3. Technology Stack (Latest — 2026)

> **Yeh stack Stripe, Vercel, Linear, Supabase jaisi companies use karti hain. Battle-tested at scale.**

### 3.1 Frontend
| Layer | Technology | Kyun |
|-------|-----------|------|
| **Framework** | **Next.js 15** (App Router) + **React 19** | SSR + SEO + speed, largest ecosystem |
| **Language** | **TypeScript** | End-to-end type safety, kam bugs |
| **Styling** | **Tailwind CSS v4** | Fast, consistent design |
| **UI Components** | **shadcn/ui** + **Radix UI** | Beautiful, accessible, customizable — best UI/UX ka base |
| **Icons** | **Lucide** | Modern icon set |
| **Charts** | **Recharts / Tremor** | Dashboard analytics |
| **Tables** | **TanStack Table** | Powerful data grids |
| **Forms** | **React Hook Form + Zod** | Validation, type-safe |
| **State/Data** | **TanStack Query** + Server Actions | Fast data fetching, caching |
| **Animations** | **Framer Motion** | Smooth micro-interactions (premium feel) |
| **Drag & Drop** | **dnd-kit** | Kanban pipeline board |

### 3.2 Backend
| Layer | Technology | Kyun |
|-------|-----------|------|
| **API Layer** | **Next.js Server Actions + Route Handlers** | Ek hi codebase, fast |
| **Optional heavy API** | **NestJS / Node** (baad mein, agar chahiye) | Complex background logic |
| **ORM** | **Drizzle ORM** (ya Prisma) | Type-safe DB queries |
| **Validation** | **Zod** | Runtime + compile-time safety |
| **Background Jobs** | **Inngest** ya **Trigger.dev** | Automated follow-ups, campaigns, reminders |
| **Caching / Rate limit** | **Upstash Redis** | Fast, serverless |

### 3.3 Database & Backend-as-a-Service
| Layer | Technology | Kyun |
|-------|-----------|------|
| **Database** | **PostgreSQL** via **Supabase** ⭐ | Auth + DB + Storage + Realtime ek jagah |
| **Auth** | **Supabase Auth** (ya **Clerk**) | Email, Google login, MFA, RBAC |
| **File Storage** | **Supabase Storage** (ya Cloudflare R2) | Documents, images, attachments |
| **Realtime** | **Supabase Realtime** | Live pipeline updates, notifications |
| **Vector/AI Search** | **pgvector** (Postgres built-in) | AI features, semantic search |

> **Decision:** **Supabase** = best value. Ek platform mein Database + Auth + Storage + Realtime, generous free tier (50,000 monthly active users free!). Alternative: **Neon (DB) + Clerk (Auth)** agar zyada control chahiye.

### 3.4 Hosting & DevOps
| Layer | Technology | Free Tier |
|-------|-----------|-----------|
| **Hosting** | **Vercel** | Next.js ke liye #1, free hobby tier |
| **Database Host** | **Supabase Cloud** | Free tier |
| **Version Control** | **GitHub** | Free |
| **CI/CD** | **Vercel + GitHub Actions** | Free |
| **Error Monitoring** | **Sentry** | Free tier |
| **Analytics** | **Vercel Analytics / PostHog** | Free tier |
| **Domain + CDN** | **Cloudflare** | Free |

---

## 4. Third-Party APIs & Integrations

| Purpose | Recommended Tool | Free Tier | Paid (jab scale ho) |
|---------|-----------------|-----------|---------------------|
| **Transactional Email** | **Resend** ⭐ | 3,000 emails/mo, 100/day free | $20/mo → 50k emails |
| **Bulk Email Campaigns** | **Resend Broadcasts / Brevo** | Brevo: 300 emails/day free | Pay as grow |
| **WhatsApp Business API** | **Meta Cloud API** (direct) ya **Gupshup/360dialog** | 1,000 service convos/mo free | India: ~$0.0025–0.012/msg |
| **SMS** | **Twilio** ya **MSG91** (India) | Trial credits | India ~₹0.10–0.20/SMS |
| **Payments (India)** | **Razorpay** ⭐ | No setup fee | 2% + GST per txn, UPI support |
| **Payments (Global)** | **Stripe** | No monthly fee | 2.9% + $0.30 |
| **AI / LLM** | **Claude (Anthropic) API** ⭐ + **OpenAI** | Trial credits | Pay per token |
| **Email/Calendar Sync** | **Google Workspace API / Nylas** | Free quota | Usage-based |
| **Lead Enrichment** | **Apollo / Clearbit** | Limited free | Paid |
| **File/OCR/Docs** | **Cloudflare R2 / UploadThing** | Free tier | Cheap egress |
| **Notifications (Push)** | **Novu** ya **OneSignal** | Free tier | Paid |
| **Analytics/Product** | **PostHog** | 1M events/mo free | Usage-based |
| **Search** | **Postgres FTS / Typesense** | Free (self/cloud trial) | Paid cloud |

### AI Features (Claude / GPT se)
- ✍️ **Email/Message drafting** — "Is lead ko follow-up email likho"
- 🎯 **Lead scoring** — automatic hot/warm/cold rating
- 📝 **Call/chat summaries** — long conversations ka summary
- 🤖 **Next-best-action** — "in leads ko aaj call karo"
- 💬 **AI chatbot** — website + WhatsApp auto-reply
- 🔎 **Natural language search** — "show me all deals > ₹1 lakh closing this month"

> **Recommendation:** **Claude Opus/Sonnet API** primary (best writing + reasoning), OpenAI as fallback.

---

## 5. Free Trial / Free Tier Strategy (Zero se Start, Scale pe Pay)

> **Poori philosophy:** Sab kuch free tier pe launch hoga. Jaise-jaise business badhega, ek-ek tool ko upgrade karenge — bina code change kiye (sirf plan upgrade + env variable).

### Phase 1 — MVP (₹0 / month, fully free)
| Tool | Free Tier | Kaafi hai for |
|------|-----------|---------------|
| Vercel | Hobby free | ~First 100s of users |
| Supabase | 500MB DB, 50k MAU, 1GB storage | Early stage |
| Resend | 3,000 emails/mo | Early campaigns |
| GitHub | Free | Always |
| Cloudflare | Free CDN + domain DNS | Always |
| Sentry / PostHog | Free tier | Monitoring |
| Claude API | Trial credits, then ~₹ per use | AI features |

**Total Phase 1 cost: ₹0** (sirf domain ~₹800–1,000/year).

### Phase 2 — Growth (jab clients aayein, ~$50–80/mo)
- Supabase Pro **$25/mo** (always-on DB, 8GB, backups)
- Resend **$20/mo** (50k emails)
- Vercel Pro **$20/mo** (better limits, team)
- WhatsApp/SMS — pay-as-you-go (usage-based)

### Phase 3 — Scale (big business, $200–500+/mo)
- Supabase Team/Enterprise ya dedicated Postgres
- Dedicated email IP, higher WhatsApp volume
- Add background job infra (Inngest paid), Redis (Upstash paid)

> **Key point:** Architecture aisi banayenge ki tool switching easy ho (e.g. email provider badalna = 1 file change). Vendor lock-in minimize.

---

## 6. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USERS (Browser / Mobile)              │
│              Admin · Manager · Sales Rep · Client            │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────┐
│                  FRONTEND — Next.js 15 (Vercel)              │
│   React 19 · Tailwind · shadcn/ui · TanStack · Framer Motion │
└───────────────────────────┬─────────────────────────────────┘
                            │ Server Actions / API Routes
┌───────────────────────────▼─────────────────────────────────┐
│                    APPLICATION / API LAYER                   │
│   Auth (RBAC) · Business Logic · Zod Validation · Drizzle    │
└───┬────────────┬────────────┬───────────┬───────────┬────────┘
    │            │            │           │           │
┌───▼───┐  ┌─────▼─────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼──────┐
│Postgres│  │  Storage  │ │ Realtime│ │  Redis  │ │Background │
│Supabase│  │ (files)   │ │(live UI)│ │(Upstash)│ │Jobs       │
│+pgvector│ │           │ │         │ │         │ │(Inngest)  │
└────────┘  └───────────┘ └─────────┘ └─────────┘ └───────────┘
    │
┌───▼──────────────────────────────────────────────────────────┐
│                 EXTERNAL INTEGRATIONS                         │
│  Resend(Email) · WhatsApp API · Twilio/MSG91(SMS)            │
│  Razorpay/Stripe(Pay) · Claude/OpenAI(AI) · Google Cal       │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. CRM Workflow (Kaise Kaam Karega)

### A. Lead Journey
```
1. Lead aata hai  →  Website form / WhatsApp / Ad / Manual entry
2. Auto-capture   →  CRM mein lead ban jaata hai (source tag ke saath)
3. AI Scoring     →  Hot / Warm / Cold rating auto-assign
4. Auto-assign    →  Sales rep ko assign (round-robin ya rule-based)
5. Nurture        →  Automated email/WhatsApp sequence start
6. Pipeline       →  Deal Kanban board mein move (New → Qualified → ...)
7. Follow-ups     →  Tasks + reminders auto-create
8. Proposal       →  Quote/proposal send, e-sign
9. Payment        →  Razorpay/Stripe se invoice + collect
10. Won/Lost      →  Deal close, analytics update
11. Retention     →  Client account ban jaata hai, upsell campaigns
```

### B. Marketing Campaign Workflow
```
Segment audience → Choose channel (Email/WhatsApp/SMS)
  → Design template (AI-assisted) → Schedule/Send
  → Track (open/click/reply) → Auto follow-up → Report ROI
```

### C. Automation Example
```
IF lead source = "Facebook Ad" AND no reply in 2 days
THEN send WhatsApp template + create task for sales rep
```

---

## 8. Database Schema (Core Tables — High Level)

- `organizations` (multi-tenant agency workspaces)
- `users` + `roles` (RBAC)
- `contacts` (people)
- `companies` (client businesses)
- `leads`
- `deals` / `pipelines` / `stages`
- `activities` (calls, meetings, notes, emails)
- `tasks`
- `campaigns` + `campaign_recipients`
- `email_templates` / `message_templates`
- `automations` (workflow rules)
- `invoices` + `payments`
- `projects` (agency client work) — optional
- `attachments`
- `audit_logs`

> **Security:** Supabase **Row-Level Security (RLS)** — har user sirf apne org ka data dekhega.

---

## 9. Development Roadmap (Phase-wise)

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 0 — Setup** | 3–5 days | Repo, Next.js + Supabase + Vercel setup, design system, auth |
| **Phase 1 — Core CRM (MVP)** | 3–4 weeks | Contacts, Companies, Leads, Deal Pipeline (Kanban), Tasks, Dashboard |
| **Phase 2 — Communication** | 2–3 weeks | Email (Resend), WhatsApp, SMS, templates, activity timeline |
| **Phase 3 — Marketing & Automation** | 2–3 weeks | Campaigns, segments, automation workflows, background jobs |
| **Phase 4 — AI Layer** | 1–2 weeks | Lead scoring, email drafting, summaries, AI search, chatbot |
| **Phase 5 — Payments & Reports** | 1–2 weeks | Invoicing, Razorpay/Stripe, analytics, ROI reports |
| **Phase 6 — Polish & Launch** | 1–2 weeks | RBAC, security audit, performance, mobile, onboarding |

**Total realistic timeline: ~10–14 weeks** for a solid production v1 (solo/small team).

---

## 10. Best UI/UX Plan (Fast + Beautiful)

- **Design language:** Clean, spacious, Linear/Notion-inspired (marketing companies isse pasand karti hain)
- **Component base:** shadcn/ui (fully customizable, accessible)
- **Speed:** Server Components + streaming + optimistic UI updates → instant feel
- **Dark + Light mode** (default)
- **Command palette (⌘K)** — power users ke liye fast navigation
- **Micro-animations:** Framer Motion — premium feel, but performance-safe
- **Mobile-responsive** — sales reps mobile pe use karenge
- **Empty states + onboarding** — naye users ke liye guided setup
- **Accessibility** — WCAG friendly (Radix base)

---

## 11. Security & Compliance

- 🔐 **RBAC** — role-based permissions (Admin/Manager/Rep/Client)
- 🛡️ **Row-Level Security** — data isolation per org
- 🔑 **Auth** — MFA, secure sessions, OAuth (Google)
- 🔒 **Encryption** — at rest + in transit (Supabase/Vercel default)
- 📜 **Audit logs** — kisne kya change kiya
- 🇮🇳 **DPDP Act (India) / GDPR** ready — consent, data export/delete
- 💳 **PCI** — payments Razorpay/Stripe handle karte hain (hum card data store nahi karte)
- 🚫 **Rate limiting** — Upstash Redis se abuse prevention

---

## 12. Cost Summary (Realistic)

| Stage | Users | Monthly Cost (approx) |
|-------|-------|----------------------|
| **MVP / Launch** | 1–50 | **₹0** (+ domain ~₹1,000/yr) |
| **Early Growth** | 50–500 | **$50–80** (~₹4,500–7,000) |
| **Scaling** | 500–5,000 | **$200–500** (~₹18k–45k) |
| **Big Business** | 5,000+ | **$500+** (usage-based, revenue se cover) |

> Plus variable: WhatsApp/SMS/AI usage (pay-per-use). Email/AI costs revenue ke saath scale karte hain — problem nahi.

---

## 13. Final Recommended Stack (Ek Nazar Mein)

```
Name:        NexoCRM
Frontend:    Next.js 15 + React 19 + TypeScript + Tailwind + shadcn/ui
Backend:     Next.js Server Actions + Drizzle ORM + Zod
Database:    Supabase (PostgreSQL + pgvector)
Auth:        Supabase Auth (RBAC + RLS)
Storage:     Supabase Storage / Cloudflare R2
Jobs:        Inngest (automations, campaigns)
Cache:       Upstash Redis
Hosting:     Vercel + Cloudflare + GitHub
Email:       Resend
WhatsApp:    Meta Cloud API / Gupshup
SMS:         MSG91 (India) / Twilio
Payments:    Razorpay (India) + Stripe (global)
AI:          Claude API (primary) + OpenAI (fallback)
Monitoring:  Sentry + PostHog
```

**Sab free tier pe start → scale pe pay. Zero vendor lock-in philosophy.**

---

## 14. Next Steps (Aage Kya Karein)

1. ✅ **Tool name + domain** finalize karein (NexoCRM recommend kiya)
2. ✅ **Feature priority** confirm karein — kaunse modules pehle chahiye
3. ✅ **Accounts banayein** — Supabase, Vercel, GitHub, Resend (sab free)
4. ✅ **Phase 0 setup** shuru karein — main scaffold + design system bana doonga
5. ✅ **Phase 1 MVP** build — Contacts + Pipeline + Dashboard

> **Bolo toh main abhi Phase 0 (project scaffold + Supabase schema + auth + design system) code karna shuru kar doon.**

---

*Report prepared as Senior Full-Stack Developer. Pricing/free-tier data verified via web research (July 2026) — exact limits vendor pages pe confirm kar lena kyunki yeh change hote rehte hain.*
