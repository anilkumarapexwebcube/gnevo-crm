# 07 · API Design

> Deliverable 8. REST (primary), GraphQL (dashboard aggregation), webhooks, versioning, rate limits, auth, and documentation strategy.

---

## 1. API surfaces

| Surface | Use | Protocol |
|---|---|---|
| **REST v1** | Public, versioned, integrator-facing CRUD + actions | HTTP/JSON, OpenAPI 3.1 |
| **GraphQL** | Rich client dashboards needing aggregation & selective fields | POST `/graphql`, persisted queries |
| **tRPC (internal)** | Type-safe calls between our Next.js BFF and Nest | internal only, not public |
| **WebSocket** | Realtime: notifications, chat, presence, live metrics | Socket.IO |
| **Webhooks (out)** | Event delivery to customer/integration endpoints | signed HTTP POST |

**Principle:** REST is the stable contract for the outside world; GraphQL is a performance optimization for our own dashboards; tRPC is internal glue.

---

## 2. REST conventions

- **Base:** `https://api.gnevo.crm/v1`
- **Resources are plural nouns:** `/leads`, `/customers`, `/deals`, `/projects/{id}/tasks`.
- **Verbs via HTTP methods:** `GET` (list/read), `POST` (create), `PATCH` (partial update), `PUT` (replace, rare), `DELETE` (soft delete).
- **Actions that aren't CRUD:** `POST /deals/{id}/actions/win`, `POST /leads/{id}/actions/convert`.
- **Status codes:** 200/201/204 success; 400 validation; 401 unauth; 403 forbidden (RBAC); 404; 409 conflict/idempotency; 422 semantic; 429 rate limit; 5xx server.
- **Errors (RFC 9457 Problem Details):**
```json
{
  "type": "https://api.gnevo.crm/errors/validation",
  "title": "Validation failed",
  "status": 400,
  "detail": "value must be >= 0",
  "instance": "/v1/deals",
  "errors": [{ "field": "value", "message": "must be >= 0" }],
  "requestId": "req_01J..."
}
```

### Pagination, filtering, sorting
- **Keyset (cursor) pagination** for scale: `?limit=50&cursor=<opaque>`. Response includes `nextCursor`.
- **Filtering:** `?status=open&owner_id=...&created_after=...`; complex filters via a documented query grammar or `POST /resource/search` with a JSON filter body.
- **Sorting:** `?sort=-created_at,value`.
- **Field selection / expansion:** `?fields=id,title,value&expand=customer,owner`.

### Standard list response
```json
{
  "data": [ /* ... */ ],
  "pagination": { "nextCursor": "...", "hasMore": true, "limit": 50 },
  "meta": { "requestId": "req_...", "took_ms": 12 }
}
```

---

## 3. Versioning

- **URI versioning** for major breaking changes: `/v1`, `/v2`.
- **Additive changes are non-breaking** (new optional fields/endpoints) and ship without a version bump.
- **Deprecation policy:** `Deprecation` + `Sunset` headers, min 6-month window, changelog + email notice to API consumers.
- **OpenAPI spec is the contract**, auto-generated from NestJS decorators; SDKs generated from it.

---

## 4. Authentication & authorization

| Consumer | Mechanism |
|---|---|
| Web app (first-party) | Session cookie (httpOnly, SameSite) + short-lived JWT; CSRF token for unsafe methods |
| API integrators | **API keys** (scoped, per-org, hashed at rest) or **OAuth2** for third-party apps acting on behalf of users |
| Service-to-service | mTLS / signed internal tokens |

- **Scopes** on API keys mirror the permission matrix (`deals:read`, `deals:write`, `reports:read`…).
- **RBAC** enforced server-side on every endpoint via the `RbacGuard`; scope also constrains data (org/department/team/own).
- **Tenant** derived from the authenticated principal — **never** from a client-supplied `organization_id`.

---

## 5. Rate limiting & quotas

- **Redis token-bucket** per API key / user / IP, with tiered limits:
  - Default: e.g. 600 req/min/key, burst 100.
  - Heavy endpoints (search, reports, exports, AI): lower dedicated buckets.
- **Headers:** `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, plus `Retry-After` on 429.
- **Per-org monthly quotas** on AI tokens, messaging, exports — enforced + surfaced in the API dashboard.
- **Concurrency limits** on long-running jobs.

---

## 6. Idempotency & concurrency

- **Idempotency-Key** header on POST/action endpoints; server stores key→result for 24h so retries don't double-execute.
- **Optimistic concurrency:** `ETag` / `If-Match` (or a `version` field) on updates → 409 on stale writes.

---

## 7. Webhooks (outbound)

- Customers register endpoints with an event subscription list (`deal.won`, `invoice.paid`, `lead.created`, …).
- **Delivery:** signed (`X-Gnevo-Signature`, HMAC-SHA256 of body + timestamp), JSON payload, at-least-once.
- **Reliability:** retries with backoff, DLQ, delivery log + manual replay in the UI, auto-disable after sustained failures.
- **Security:** signature verification docs, timestamp tolerance to prevent replay, secret rotation.

```json
// Example webhook payload
{
  "id": "evt_01J...",
  "type": "deal.won",
  "created_at": "2026-07-23T10:00:00Z",
  "organization_id": "org_...",
  "data": { "deal": { "id": "...", "value": 4500, "currency": "USD" } }
}
```

---

## 8. GraphQL (dashboards)

- Single `/graphql` endpoint; **schema-first** or code-first (NestJS) — code-first to reuse DTOs.
- **Guardrails at scale:** persisted/allow-listed queries in production, **query depth + complexity limits**, `dataloader` batching to kill N+1, field-level auth, per-query cost budget.
- Scope: read-heavy dashboard aggregations (funnels, revenue, SEO metrics). Mutations stay primarily on REST for a stable contract.

---

## 9. Realtime (WebSocket) contract

- Auth on connect (token); join tenant/user/resource rooms server-side.
- Event envelope: `{ id, type, resource, data, ts }`; client dedupes by `id`.
- Documented event catalog (notifications, chat, presence, activity, dashboard metrics).

---

## 10. Documentation & DX

- **OpenAPI 3.1** auto-generated → served via **Scalar** or Swagger UI at `/docs`.
- **Interactive reference** + **guides** (auth, pagination, webhooks, rate limits, errors).
- **SDKs** generated (TypeScript first) from OpenAPI.
- **Postman/Bruno collection** exported.
- **Changelog** + **status page**.
- **Sandbox environment** with test data + test API keys.

---

## 11. Example endpoint catalog (excerpt)

```
# Auth
POST   /v1/auth/login            POST /v1/auth/logout
POST   /v1/auth/refresh          POST /v1/auth/passkey/*
POST   /v1/auth/mfa/verify       POST /v1/auth/magic-link

# CRM
GET    /v1/leads                 POST /v1/leads
GET    /v1/leads/{id}            PATCH /v1/leads/{id}
POST   /v1/leads/{id}/actions/convert
GET    /v1/customers             POST /v1/customers
GET    /v1/deals                 POST /v1/deals
POST   /v1/deals/{id}/actions/win
GET    /v1/pipelines/{id}

# Delivery
GET    /v1/projects              GET /v1/projects/{id}/tasks
POST   /v1/tasks                 PATCH /v1/tasks/{id}

# Marketing/SEO
GET    /v1/seo-projects/{id}/keywords
GET    /v1/seo-projects/{id}/rankings
POST   /v1/seo-projects/{id}/audits

# Finance
GET    /v1/invoices              POST /v1/invoices
POST   /v1/invoices/{id}/actions/send

# Platform
GET    /v1/search?q=...
POST   /v1/ai/complete           POST /v1/ai/summarize
GET    /v1/notifications         POST /v1/automations
GET    /v1/audit-logs            POST /v1/webhooks
GET    /v1/reports/{key}
```

Next: [`08-folder-structure.md`](08-folder-structure.md).
