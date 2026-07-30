# 13 · Performance Checklist

> Deliverable 14. Performance budgets and the concrete techniques to hit them at 100k customers / 1,000 concurrent employees. "Fast is a feature."

---

## 1. Performance budgets (targets)

| Metric | Target |
|---|---|
| **LCP** (dashboard, p75) | < 2.0s |
| **INP** (interaction, p75) | < 200ms |
| **CLS** | < 0.1 |
| **TTFB** (cached/RSC) | < 300ms |
| API read p95 | < 200ms |
| API write p95 | < 400ms |
| Search query p95 | < 150ms |
| Realtime event delivery p95 | < 500ms |
| Initial JS (route, gzipped) | < 200KB |
| DB query p95 (hot paths) | < 50ms |

Budgets are enforced in CI (Lighthouse CI, bundle-size checks, k6 thresholds).

---

## 2. Frontend performance

- **React Server Components** — render data on the server, ship minimal client JS; client components only where interactivity needed.
- **Streaming SSR + Suspense** — stream shell first, hydrate progressively; skeletons per view.
- **Code splitting** — route-level + dynamic `import()` for heavy widgets (charts, editors, automation canvas).
- **Partial Prerendering / edge caching** for static+dynamic hybrid dashboards.
- **TanStack Query** — cache, dedupe, background refetch, `staleTime` tuning, prefetch on hover/intent.
- **Virtualization** (TanStack Virtual) for large tables/lists → render only visible rows.
- **Optimistic updates** — instant feedback, rollback on error.
- **Image optimization** — `next/image`, AVIF/WebP, responsive sizes, Cloudflare Images CDN, lazy-load below fold.
- **Font optimization** — variable fonts, `font-display: swap`, subset, preload.
- **Bundle discipline** — analyze bundle, tree-shake, avoid heavy deps (moment→date-fns/Temporal, lodash→per-fn), no barrel-file bloat.
- **Prefetch** next likely routes; keep the app-shell instant.
- **Web Workers** for heavy client compute (CSV parse, big transforms).
- **Debounce/throttle** search + filters; cancel in-flight requests.

---

## 3. Backend / API performance

- **Fastify adapter** for NestJS (higher throughput than Express).
- **Cache-aside (Redis)** for hot reads (user, permissions, org settings, dashboards) with explicit invalidation on write.
- **DataLoader** batching to kill N+1 (GraphQL + service layer).
- **Keyset pagination** everywhere (no OFFSET on big tables).
- **Response compression** (brotli/gzip) at edge/reverse proxy.
- **HTTP caching** — `ETag`/`Cache-Control` on cacheable GETs; CDN caches public/read-heavy.
- **Async everything heavy** — push exports/reports/emails/AI to BullMQ; return job id + poll/websocket.
- **Connection pooling** via PgBouncer; separate pools for API vs workers.
- **Payload hygiene** — DTO projections, no over-fetching, field selection.
- **Timeouts + circuit breakers** on external calls (AI, integrations) so one slow provider can't cascade.
- **Concurrency limits** per queue and per external provider.

---

## 4. Database performance

- **Tenant-leading composite indexes** on all hot query paths; partial indexes excluding soft-deleted.
- **Read replicas** for reports/analytics/dashboards/exports/search-reindex.
- **Partitioning** (by month) on high-volume append tables (activities, audit, notifications, rank_snapshots).
- **Materialized views** for expensive aggregates (funnels, revenue) refreshed by jobs.
- **Denormalized counters** (maintained by triggers/jobs) for hot tallies.
- **`pg_stat_statements`** monitoring; kill slow queries; drop unused indexes.
- **`EXPLAIN ANALYZE`** on every new heavy query in review.
- **Batch writes** for bulk ops; `COPY` for imports.
- **HNSW** index for vector search; keep embedding dims sane.
- **VACUUM/autovacuum** tuned; avoid bloat; `CREATE INDEX CONCURRENTLY` in migrations.

---

## 5. Caching strategy (layered)

| Layer | What | TTL/Invalidation |
|---|---|---|
| CDN (Cloudflare) | static assets, public pages, cacheable GETs | long + purge on deploy |
| RSC/Next cache | server-rendered data | `revalidate` + tag-based purge |
| Redis app cache | hot entities, permissions, dashboards, computed | short TTL + write-through invalidation |
| Query cache (client) | TanStack Query | `staleTime`/`gcTime` per query |
| AI response cache | prompt→response (hash) | dedupe identical asks, cost saver |
| Search | Meilisearch is its own fast store | reindex debounced |

**Rule:** cache aggressively, invalidate precisely (tag/key-based), never serve stale tenant-sensitive data past its window.

---

## 6. Realtime performance

- Redis pub/sub adapter for Socket.IO fan-out; rooms scoped tightly (avoid broadcasting to whole org unnecessarily).
- Batch/coalesce high-frequency events (presence, typing) — send diffs, throttle.
- Backpressure handling; drop/coalesce non-critical events under load.
- Client dedupes by event id; reconciles with query cache.

---

## 7. Assets & delivery

- Everything static behind Cloudflare CDN; immutable hashed filenames; long cache + purge on deploy.
- **R2** for media with `$0` egress; on-the-fly image resize via Cloudflare.
- HTTP/2/3; preconnect to API/CDN; resource hints.

---

## 8. Load & capacity

- **k6 load tests** in CI + pre-release for hot flows (login, list, board, dashboard, search, create-deal) at target concurrency.
- **Autoscaling** (HPA) on CPU/RPS/queue-depth; workers scale by queue backlog.
- **Soak tests** for memory leaks; **spike tests** for surge resilience.
- Capacity model reviewed at each stage (A→C); headroom targets (e.g. scale before 70% util).

---

## 9. Monitoring performance (close the loop)

- **RUM** (real-user Web Vitals) via web-vitals → analytics/Sentry.
- **APM/traces** (OTel → Tempo) with slow-span alerts; DB query time dashboards.
- **SLOs** with error budgets (see DevOps doc); alert on budget burn.
- Perf regression gates in CI (Lighthouse CI, bundle size, k6 thresholds).

---

## 10. Performance acceptance checklist (per feature)

- [ ] No N+1 (verified via query log/traces)
- [ ] Lists use keyset pagination + virtualization
- [ ] Hot reads cached with correct invalidation
- [ ] Heavy work offloaded to queue
- [ ] Bundle delta within budget; heavy deps dynamically imported
- [ ] New queries `EXPLAIN`-reviewed + indexed
- [ ] External calls have timeout + fallback
- [ ] Meets Web Vitals + API p95 budgets under load test

Next: [`14-testing-strategy.md`](14-testing-strategy.md).
