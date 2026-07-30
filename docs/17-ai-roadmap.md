# 17 · Future AI Roadmap

> Deliverable 20. How AI evolves from an assistant into an agentic layer woven through the CRM — sequenced in phases, each with capabilities, data/infra needs, and guardrails.

---

## Vision

> AI is not a feature tab — it is an ambient layer. Over time the CRM moves from *"ask the assistant"* → *"the CRM does the work and asks you to approve"*. Multi-provider by design, workspace-aware via RAG, cost-controlled, and safe by construction.

---

## Phase 1 — Assistive AI (v1, Months 4–7)

**Capabilities**
- Multi-provider gateway (OpenAI/Claude/Gemini/DeepSeek/Grok/Perplexity/OpenRouter), user/workspace-selectable, BYO-key.
- Workspace-aware **chat assistant** (RAG over records, notes, KB, docs via pgvector).
- **Content generation:** blogs, ad copy, meta titles/descriptions, emails, social posts.
- **Summaries:** account/deal/meeting/thread summaries; daily digest.
- **Lead scoring** (AI-augmented rules).
- **AI search:** natural-language query across the workspace.

**Infra/data**
- Embedding pipeline (chunk → embed → `pgvector` HNSW), incremental reindex via jobs.
- Model router (cheap-first, escalate), response cache, per-org token/cost accounting + quotas.

**Guardrails**
- Treat RAG content as untrusted (prompt-injection defense), PII redaction, tenant-isolated keys/data, human confirm for any side-effect, full audit of AI actions.

---

## Phase 2 — Proactive AI (v1.x, Months 8–12)

**Capabilities**
- **Customer insights:** churn risk, upsell/cross-sell suggestions, health scoring with explanations.
- **Next-best-action** recommendations on records (who to call, what to send).
- **AI in automations:** classify/extract/generate steps; smart routing (e.g. sentiment → priority).
- **Smart compose** everywhere (replies, notes) with tone/brand controls.
- **Anomaly detection:** rank drops, revenue dips, SLA risks → proactive alerts.
- **SEO intelligence:** audit-issue prioritization, content-gap and keyword-opportunity suggestions from GSC/rank data.

**Infra/data**
- Feature store for scoring signals; scheduled inference jobs; feedback capture (accept/reject) to improve prompts/models.
- Evaluation harness (golden sets, LLM-as-judge) to track quality/regressions per provider.

**Guardrails**
- Confidence thresholds; explainability (why this suggestion); user feedback loop; bias/quality monitoring.

---

## Phase 3 — Agentic AI (v2, Year 2)

**Capabilities**
- **Task agents** that execute multi-step work with approval gates: "onboard this client" → creates project, tasks, SEO setup, welcome sequence — presented for one-click approval.
- **Autonomous workflows** where trusted: draft-and-schedule content calendars, auto-triage tickets, auto-follow-up sequences.
- **Meeting agent:** join/transcribe/summarize, extract action items → tasks.
- **Reporting agent:** natural-language → generated report/dashboard.
- **Voice/omnichannel assistant** across email/chat/WhatsApp.

**Infra/data**
- Durable agent orchestration (**Temporal**), tool-use framework with **server-side authorization on every tool** (agent can only do what the acting user may do), sandboxed execution, step-level audit.
- Long-term memory per workspace; retrieval + tool registry; guarded action catalog.

**Guardrails (critical at this phase)**
- **Least privilege:** agent actions gated by the user's RBAC scope, server-enforced — model output never bypasses authz.
- **Human-in-the-loop** for irreversible/external actions (send, pay, publish, delete) by default; configurable autonomy per action with org policy.
- **Rate/cost budgets**, kill switch, full replayable audit of every agent decision + action.
- **Injection resistance:** untrusted content can never escalate privilege or trigger unapproved tools.

---

## Phase 4 — Platform intelligence (Year 2+)

- **Fine-tuned/distilled small models** for cheap high-volume tasks (classification, scoring) to cut cost/latency.
- **Cross-tenant benchmarks** (privacy-preserving, aggregated/anonymized, opt-in): "your win rate vs similar agencies".
- **Predictive forecasting** (revenue, capacity, churn) with confidence intervals.
- **Custom AI apps/marketplace:** let power users build workspace-specific assistants on our gateway.
- **Model routing optimization:** auto-pick provider/model per task by measured quality/cost/latency.

---

## Cross-phase principles

1. **Multi-provider always** — no lock-in; route by task/cost/quality; BYO-key default.
2. **RAG over the workspace** — answers grounded in tenant data, tenant-isolated.
3. **Cost-controlled** — cache, route cheap-first, quota per org, meter everything.
4. **Safe by construction** — untrusted inputs, server-side authz on actions, human approval for side effects, full audit.
5. **Measured** — eval harness + user feedback; ship quality regressions never.
6. **Explainable** — every score/suggestion shows its reasoning/sources.

---

## Dependencies & enablers

- pgvector (P1) → Qdrant at scale (P3).
- Temporal for durable agents (P3).
- Eval/observability for AI (P2) — token/cost/quality dashboards, prompt versioning.
- Policy engine for per-action autonomy (P3).
- Feedback capture UX from P1 onward (thumbs up/down, accept/edit/reject) to compound quality.

Next wave: [`18-deployment-guide.md`](18-deployment-guide.md), [`19-scaling-strategy.md`](19-scaling-strategy.md), [`20-risk-analysis.md`](20-risk-analysis.md), [`21-maintenance-plan.md`](21-maintenance-plan.md), [`22-production-runbook.md`](22-production-runbook.md).
