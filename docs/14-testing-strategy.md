# 14 · Testing Strategy

> Deliverable 15. The full quality strategy: test pyramid, tooling, coverage targets, and CI gating.

---

## 1. Test pyramid & philosophy

```
        ▲  E2E (Playwright) — few, critical user journeys
       ███ Integration (Vitest + Testcontainers) — real DB/Redis, API contracts
      █████ Component (Vitest + Testing Library) — UI behavior
     ███████ Unit (Vitest) — pure logic, services, utils
```

- **Most tests are fast & low-level** (unit/integration); E2E reserved for critical journeys (expensive, flaky if overused).
- **Test behavior, not implementation.** Query by role/label (a11y-aligned).
- **Deterministic** — no real network/time randomness; freeze time, seed data, mock external providers.
- **Every bug fix ships with a regression test.**

---

## 2. Tooling by layer

| Layer | Tool | Scope |
|---|---|---|
| Unit | **Vitest** | Services, domain logic, utils, Zod schemas, reducers |
| Component | **Vitest + React Testing Library** | UI components, hooks, forms, states |
| Integration | **Vitest + Testcontainers** (real Postgres/Redis/Meili) | Repositories, API endpoints, RBAC, RLS, queue jobs |
| Contract | **OpenAPI + schema tests** (Zod), Pact (optional) | API ↔ client contract, webhook payloads |
| E2E | **Playwright** | Cross-browser critical journeys |
| Load/perf | **k6** | Throughput, latency budgets, soak/spike |
| Security | **Semgrep, Trivy, OWASP ZAP, gitleaks** | SAST/deps/container/DAST/secrets |
| Accessibility | **axe-core** (in Playwright + Storybook) | WCAG AA checks |
| Visual regression | **Playwright screenshots / Chromatic** | Design-system + key screens |

*(NestJS default templates use Jest; we standardize on Vitest across the monorepo for speed/consistency, keeping Jest only where a Nest tool hard-requires it.)*

---

## 3. What to test where

### Unit
- Business rules (lead scoring, commission calc, invoice totals, permission resolution).
- Zod schemas (valid/invalid inputs).
- Pure utils (money, dates/timezone, id gen, formatters).
- Automation condition evaluator, template rendering.

### Integration (the highest-value layer for this app)
- **Tenant isolation** — verify RLS + app filter block cross-org access (critical, dedicated suite).
- **RBAC** — every role×resource×action×scope allow/deny matrix.
- Repository queries against real Postgres (indexes, constraints, cascades).
- API endpoints (auth, validation, pagination, idempotency, error shapes).
- Queue jobs (enqueue → process → side-effect), retries, DLQ.
- Webhook signing/delivery.
- Search indexing correctness.

### Component
- Forms (validation, error display, dirty-guard, submit).
- Tables (sort/filter/select/bulk, virtualization).
- Empty/loading/error states.
- Theme (light/dark) + a11y (axe).

### E2E (critical journeys only)
- Sign up / log in (incl. MFA, passkey, SSO happy path).
- Create lead → convert → deal → win.
- Create project → tasks → complete.
- Build & run an automation.
- Invoice → send → pay.
- SEO project → connect GSC → view rankings.
- Global search + command palette.
- Permission denial (non-admin blocked from admin action).

---

## 4. Test data & environment

- **Factories/fixtures** (`packages/testing`) generate valid domain objects; per-test tenant isolation.
- **Testcontainers** spin real Postgres/Redis/Meilisearch per suite → prod-parity, no shared-state flake.
- **Seed scripts** for local + demo; anonymized/synthetic data in staging.
- **External providers mocked** at the boundary (AI, Twilio, Stripe, Google) via recorded fixtures / MSW / provider sandboxes; contract tests against real sandboxes nightly.
- **Time control** — inject clock; never `Date.now()` in logic under test.

---

## 5. Coverage & quality gates

- **Coverage targets:** ≥ 80% overall lines/branches; **≥ 90% on critical domains** (auth, RBAC, tenancy, billing, automation). Coverage is a floor, not the goal — meaningful assertions matter more.
- **CI gates (block merge):** typecheck, lint, unit+component+integration green, coverage threshold, bundle-size budget, SAST/secret/dep scans clean, a11y checks pass.
- **CI gates (block deploy):** E2E smoke suite green on preview/staging, k6 thresholds met, DAST clean, migration lock review.
- **Flaky-test policy:** quarantine + fix within SLA; no merging on flakes.

---

## 6. CI test pipeline (GitHub Actions)

```
PR opened →
  1. install (pnpm, cached)   2. typecheck   3. lint
  4. unit + component (Vitest, sharded/parallel)
  5. integration (Testcontainers: PG/Redis/Meili)
  6. build (Turborepo cached)  7. bundle-size + Lighthouse CI (preview)
  8. security: Semgrep + gitleaks + Trivy + pnpm audit
  9. E2E smoke (Playwright) on ephemeral preview
→ all green + review → merge
Nightly: full E2E matrix, k6 load, DAST (ZAP), contract tests vs sandboxes
```

- **Sharding & parallelism** (Playwright + Vitest) keep PR feedback < ~10 min.
- **Turborepo remote cache** skips unchanged package tests.

---

## 7. Non-functional testing

- **Load/soak/spike** (k6) per release against budgets in [`13-performance-checklist.md`](13-performance-checklist.md).
- **Chaos/resilience** (later): kill a pod, drop a provider, saturate a queue → verify graceful degradation.
- **DR drills:** restore from backup to a scratch env quarterly; measure RTO/RPO.
- **Security testing:** SAST/DAST/deps in CI; annual pen-test; bug bounty post-GA.

---

## 8. Ownership & culture

- Squads own tests for their modules; a shared QA/SDET owns the E2E harness, load framework, and flake budget.
- Test plans authored alongside specs (definition-of-done includes tests).
- Bug → failing test first (red), then fix (green).

Next: [`15-devops-strategy.md`](15-devops-strategy.md).
