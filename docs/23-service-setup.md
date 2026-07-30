# 23 · Service Setup Guide (Redis, AI, Stripe, Google GSC)

Step-by-step to get the credentials M2 needs. All free / test-tier, no Docker required. Put every value in your root `.env`, then restart (`pnpm dev:core`).

***

## 1\. Upstash Redis \(for Sprint 6 — Automation / BullMQ\)

Docker ke bina, cloud Redis:

1. [console.upstash.com](https://console.upstash.com) → sign up (free).
2. **Create Database** → type **Redis** → naam do → region apne paas ka → **Free** plan.
3. Database khulne par → **REST / Redis** connect section → **Redis** tab → copy the **`rediss://…` connection string** (TLS wala, port 6379/6380).
4. `.env` me:

    ```
    REDIS_URL=rediss://default:<password>@<host>.upstash.io:6379
    ```

> Note: BullMQ Upstash ke saath chalta hai. Free tier me daily command limit hai — dev ke liye kaafi.

***

## 2\. AI provider key \(for Sprint 7 — AI\)

Koi **ek** chuno. **Groq recommended — free + fast**, router ise pehle try karta hai:

* **Groq (free, recommended):** [console.groq.com/keys](https://console.groq.com/keys) → sign up → Create API Key → copy.

    ```
    GROQ_API_KEY=gsk_...
    ```
* **OpenRouter (ek key = kai models; free models limited, paid ke liye credits chahiye):** [openrouter.ai/keys](https://openrouter.ai/keys) → Create Key → copy.

    ```
    OPENROUTER_API_KEY=sk-or-...
    ```
* **Google Gemini (free tier):** [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → Create API key.

    ```
    GOOGLE_AI_API_KEY=...
    ```
* **OpenAI:** [platform.openai.com/api-keys](https://platform.openai.com/api-keys) (paid).

    ```
    OPENAI_API_KEY=sk-...
    ```

> Multi-provider design hai — jo key doge wahi provider chalega; workspace me BYO-key bhi support hoga.

***

## 3\. Stripe \(for Sprint 8 — Payments\, TEST mode\)

1. [dashboard.stripe.com](https://dashboard.stripe.com) → sign up.
2. Top-right **Test mode** ON.
3. **Developers → API keys** → copy **Secret key** (`sk_test_…`) and **Publishable key** (`pk_test_…`).

    ```
    STRIPE_SECRET_KEY=sk_test_...
    STRIPE_PUBLISHABLE_KEY=pk_test_...
    ```
4. Webhooks baad me (payment confirmation ke liye) — us waqt guide dunga.

> Test mode me real paisa nahi katta; test card `4242 4242 4242 4242` use hota hai.

***

## 4\. Google Search Console OAuth \(for Sprint 8 — SEO\)

1. [console.cloud.google.com](https://console.cloud.google.com) → new project banao.
2. **APIs & Services → Library** → **Search Console API** enable karo.
3. **OAuth consent screen** → External → app naam + support email (aapka `support@gnevotech.org`) → save. Test user me apna Google account add karo.
4. **Credentials → Create Credentials → OAuth client ID** → type **Web application** → Authorized redirect URI:

    ```
    http://localhost:4000/v1/integrations/google/callback
    ```
5. Client ID + secret copy karke `.env`:

    ```
    GOOGLE_CLIENT_ID=...apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=...
    ```

> Verification/publishing baad me; test-user mode me aap khud connect kar sakte ho.

***

## 5. Optional — production hardening

Zaroori nahi, par production-ready ke liye recommended.

### 5a. Microsoft social login

1. [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID → App registrations → New registration**.
2. Redirect URI (Web): `http://localhost:4000/v1/auth/microsoft/callback`.
3. **Certificates & secrets → New client secret** → copy value.

```
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
```

### 5b. GitHub social login

1. [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps → New OAuth App**.
2. Authorization callback URL: `http://localhost:4000/v1/auth/github/callback`.
3. Generate a client secret.

```
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### 5c. Extra AI providers (multi-provider routing)

Jo chahiye wahi bharo — engine BYO/available key pick karega.

- **Anthropic Claude:** [console.anthropic.com](https://console.anthropic.com) → API Keys.
  ```
  ANTHROPIC_API_KEY=sk-ant-...
  ```
- **DeepSeek:** [platform.deepseek.com](https://platform.deepseek.com) → API Keys (very low cost).
  ```
  DEEPSEEK_API_KEY=...
  ```
- **xAI Grok:** [console.x.ai](https://console.x.ai) → API Keys.
  ```
  XAI_API_KEY=...
  ```
- **Perplexity:** [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) → generate key.
  ```
  PERPLEXITY_API_KEY=...
  ```

### 5d. Sentry (error tracking)

1. [sentry.io](https://sentry.io) → new project (Next.js / Node).
2. Project settings → **Client keys (DSN)** → copy.

```
SENTRY_DSN=https://...@o0.ingest.sentry.io/0
```

### 5e. OpenTelemetry (traces/metrics)

Grafana Cloud / any OTLP endpoint. Grafana Cloud → **Connections → OTLP** → endpoint + token.

```
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-<region>.grafana.net/otlp
```

### 5f. Read replica (DB scale)

Neon → same project → a **read replica** endpoint. Reports/dashboards isko use karenge (writes primary pe rahenge).

```
DATABASE_REPLICA_URL=postgresql://...neon.tech/neondb?sslmode=require
```

---

## After adding any of these

```bash
# stop dev (Ctrl+C), then:
pnpm dev:core
```

Batao kaunsa set up ho gaya — us sprint ka execution/integration wire kar dunga.