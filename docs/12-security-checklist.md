# 12 · Security Checklist

> Deliverable 13. OWASP-aligned controls, data protection, and compliance posture. Security is priority #1 in our principles. This is a checklist to implement + audit against, not aspirational text.

---

## 1. OWASP Top 10 (2021) — control mapping

| Risk | Controls |
|---|---|
| **A01 Broken Access Control** | Server-side RBAC on every endpoint; deny-by-default; **Postgres RLS** as second layer; tenant derived from token never client input; object-level checks (no IDOR); scope enforcement (org/dept/team/own); admin actions re-checked. |
| **A02 Cryptographic Failures** | TLS 1.2+ everywhere (HSTS); AES-256 at rest (managed DB + disk); column-level encryption (pgcrypto/app) for secrets/tokens/PII; secrets in a vault (see §4); no sensitive data in logs/URLs; bcrypt/argon2id for passwords. |
| **A03 Injection** | Parameterized queries (Prisma/prepared); input validation with Zod; output encoding; no string-built SQL; ORM-safe; command-injection avoided (no shelling with user input). |
| **A04 Insecure Design** | Threat modeling per module; abuse cases; rate limits/quotas; secure defaults; this doc + design reviews gate features. |
| **A05 Security Misconfiguration** | Hardened container images (distroless/minimal); no default creds; security headers (CSP, X-Frame-Options, etc.); disable stack traces in prod; least-privilege IAM; infra scanned (Trivy/tfsec). |
| **A06 Vulnerable Components** | Dependabot/Renovate; `pnpm audit`; Trivy image scan; SBOM; pin versions; remove unused deps; CI blocks criticals. |
| **A07 Auth Failures** | Strong password policy; passkeys/TOTP MFA; account lockout + backoff; secure session mgmt (Redis, rotation, revocation); short-lived JWT + rotating refresh; re-auth for sensitive actions; anti-enumeration on login/reset. |
| **A08 Software & Data Integrity** | Signed webhooks (HMAC); CI artifact signing; verify third-party integrity; protect CI/CD secrets; idempotency keys; no untrusted deserialization. |
| **A09 Logging & Monitoring Failures** | Central structured logs (Loki); audit log (immutable); security alerts (failed logins, privilege changes, anomalies); OTel traces; retention per policy; PII scrubbed from logs. |
| **A10 SSRF** | Allow-list outbound for integrations/webhooks; block internal IP ranges/metadata endpoints; validate & pin URLs; egress proxy; timeouts. |

---

## 2. Application-layer controls

- **CSRF:** SameSite cookies + anti-CSRF token on state-changing requests from the web app; API keys/bearer for programmatic (not cookie) → CSRF-immune.
- **XSS:** React auto-escaping; strict **CSP** (nonce-based, no inline unless nonce'd); sanitize any rich-text/HTML (DOMPurify) on render + store; no `dangerouslySetInnerHTML` without sanitization.
- **Clickjacking:** `X-Frame-Options: DENY` / CSP `frame-ancestors`.
- **Rate limiting & throttling:** Redis token-bucket per user/IP/key/route; stricter on auth, search, AI, exports; global DDoS at Cloudflare WAF.
- **Mass assignment:** DTO whitelisting; never bind request body straight to entities.
- **Idempotency:** keys on writes/webhooks to prevent duplicate side effects.
- **File upload security:** type/size validation, content-type sniffing, **ClamAV virus scan**, store outside webroot in R2, randomized keys, signed time-limited URLs, image re-encoding (strip EXIF/metadata), quarantine bucket for unscanned.
- **Prompt-injection (AI):** treat all retrieved/RAG content and tool outputs as untrusted; never let model output trigger privileged actions without server-side authz; PII redaction pre-send; per-workspace key isolation; output filtering; human confirm for side-effectful AI actions.

---

## 3. Authentication & authorization details

- OIDC social login (Google/Microsoft/GitHub) with state/nonce/PKCE.
- Magic links: single-use, short TTL, bound to device/IP hints.
- MFA: TOTP + WebAuthn passkeys; enforce for admins/sensitive roles.
- Sessions: Redis-backed, rotation on privilege change, global logout, device list + revoke, idle + absolute timeouts.
- JWT: short access TTL, rotating refresh with reuse-detection (revoke family on reuse).
- Permission matrix versioned; changes audited; "break-glass" admin access logged + alerted.

---

## 4. Secrets & key management

- Secrets in a **vault** (HashiCorp Vault / cloud secrets manager / sealed-secrets for K8s) — never in code or env files committed.
- Per-env isolation; least-privilege access; rotation policy; audit access.
- Customer-provided AI/integration keys encrypted at rest (envelope encryption), decrypted only in memory at call time.
- CI/CD secrets scoped per environment; OIDC federation to cloud (no long-lived cloud keys in CI).
- Secret scanning (gitleaks/trufflehog) in CI + pre-commit.

---

## 5. Data protection & privacy (GDPR / SOC2-ready)

- **Data classification & catalog:** tag PII/sensitive columns; document data flows.
- **DSAR tooling:** per-subject export + delete; consent tracking; data-processing records.
- **Right to erasure:** soft-delete → scheduled hard-purge; anonymization for analytics.
- **Encryption:** at rest, in transit, column-level for the most sensitive.
- **Data residency:** region-pinned storage option for enterprise (documented in scaling doc).
- **Retention policies** per data class; automated purges; audit-log retention.
- **DPA & sub-processor list** maintained; vendor security reviews.
- **SOC2 readiness:** documented policies, access reviews, change management, logging, incident response, vendor management, security training — build the evidence trail from day one.
- **Backups & DR:** encrypted, tested restores, PITR, cross-region (see [`21-maintenance-plan.md`](21-maintenance-plan.md)).

---

## 6. Infrastructure & network security

- Private networking (VPC), DB not publicly exposed, bastion/SSM only.
- WAF + DDoS (Cloudflare), bot management, geo/rate rules.
- Least-privilege IAM roles per service; no shared creds.
- Container hardening: non-root, read-only FS, dropped capabilities, distroless, image signing (cosign), admission control.
- Network policies (K8s) restricting pod-to-pod; egress allow-lists.
- IaC scanning (tfsec/checkov); drift detection.

---

## 7. SDLC & CI security gates

- SAST (**Semgrep**) + dependency scan + secret scan + container scan (**Trivy**) + DAST (**OWASP ZAP**) in CI; criticals block merge/deploy.
- Mandatory PR review (CODEOWNERS); protected branches; signed commits (optional).
- Pre-deploy: migration lock review, config diff review.
- Pen-test before GA + annually; bug bounty (post-launch).
- Security champions per squad; threat-model new modules.

---

## 8. Incident response

- Runbook: detect → triage → contain → eradicate → recover → post-mortem.
- On-call rotation, severity levels, comms plan, status page.
- Breach notification process (GDPR 72h).
- Immutable audit + centralized logs support forensics.
- Regular tabletop exercises.

---

## 9. Security acceptance checklist (per feature/PR)

- [ ] Authz enforced server-side (endpoint + object level) and tenant-scoped
- [ ] Inputs validated (Zod) & outputs encoded
- [ ] No secrets/PII in logs, URLs, or error messages
- [ ] Rate-limited if abusable
- [ ] Audit log emitted for mutations
- [ ] File/AI inputs treated as untrusted
- [ ] Tests cover authz-deny paths
- [ ] Dependencies clean (no new criticals)

Next: [`13-performance-checklist.md`](13-performance-checklist.md).
