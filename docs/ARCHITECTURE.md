# System Architecture
## Islamic Prayer Time & Mosque Management Platform

**Version:** 1.1 · **Date:** 2026-06-22
**Deployment targets:** Vercel (web + serverless API) · Supabase (Postgres + Storage) · Upstash (serverless Redis) · GitHub (source + CI). **No Docker.**

---

## 1. High-Level Architecture

```
                         ┌──────────────────────────────────────────────┐
                         │                   Clients                     │
                         │  Browser (web) · TV/Kiosk display · Mobile     │
                         │  apps (Flutter / React Native — future)        │
                         └───────────────┬──────────────────────────────┘
                                         │ HTTPS (cookies for web, Bearer for mobile)
              ┌──────────────────────────┴───────────────────────────┐
              │                        Vercel                          │
              │  ┌───────────────────────┐   ┌───────────────────────┐ │
              │  │  web (Next.js 15)      │   │  api (Express on       │ │
              │  │  App Router            │   │  serverless function)  │ │
              │  │  - marketing/public    │──▶│  /api/v1/*             │ │
              │  │  - auth pages          │   │  Controller→Service→   │ │
              │  │  - dashboards          │   │  Repository (Prisma)   │ │
              │  │  - display/:id (TV)    │   │  RBAC · Audit · Zod     │ │
              │  │  SSR/ISR + TanStack    │   └───────────┬───────────┘ │
              │  └───────────────────────┘               │             │
              └──────────────────────────────────────────┼─────────────┘
                                                          │
        ┌──────────────────────┬──────────────────────────┼───────────────────────┐
        │                      │                          │                       │
   ┌────▼─────┐         ┌──────▼───────┐          ┌────────▼────────┐     ┌────────▼────────┐
   │ Supabase │         │  Supabase    │          │  Upstash Redis  │     │  SMTP / Email   │
   │ Postgres │         │  Storage     │          │  (rate-limit,   │     │  (verify, 2FA,  │
   │ (Prisma) │         │  (images)    │          │   cache, OTP)   │     │  reset, notify) │
   └──────────┘         └──────────────┘          └─────────────────┘     └─────────────────┘
```

External services: Weather API (display temperature), Map/Geocoding (GPS correction, nearby), optional reCAPTCHA (login/register).

---

## 2. Why this shape

- **Single source of truth API** (`/api/v1`) keeps web and future mobile apps consistent. Express is retained per the mandated stack and deployed as a Vercel serverless function (catch-all), so there is no separate server to operate.
- **Supabase** gives managed Postgres (Prisma-compatible) plus object storage — removing the need for self-hosted DB or S3.
- **Upstash** replaces the Dockerised Redis with an HTTP/serverless-friendly Redis, suitable for Vercel's stateless functions (rate limiting, response cache, 2FA/OTP, refresh-token reuse detection helpers).
- **Stateless functions** scale horizontally automatically on Vercel; all state lives in Postgres/Redis.

### 2.1 Express-on-Vercel pattern
`apps/api/api/index.ts` exports the Express `app` wrapped for serverless; `apps/api/vercel.json` rewrites all paths to that function:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/api/index" }] }
```
The same `createApp()` factory is used for local `tsx watch` dev and for serverless production — one codebase, two runtimes.

> **Alternative considered:** collapsing the API into Next.js Route Handlers (`app/api/v1/*`). Rejected for v1 to honour the Express mandate and keep the API independently versioned/deployable and mobile-first. The Repository/Service layers are framework-agnostic, so a future migration is low-cost.

---

## 3. Layered (Clean) Architecture — API

```
HTTP Request
   │
   ▼
Middleware pipeline
   requestId → helmet → cors → rateLimit(Upstash) → cookieParser
   → csrf(state-changing) → authenticate(optional/required)
   → authorize(RBAC) → validate(Zod) 
   │
   ▼
Controller            (parse req → call service → shape response envelope)
   │
   ▼
Service               (business rules, transactions, orchestration, caching)
   │
   ▼
Repository            (Prisma data access only — no business logic)
   │
   ▼
Prisma → Supabase Postgres
   │
   ▼
Audit middleware (post-handler) → AuditLog
Error handler (terminal) → standard error envelope
```

**Principles:** SOLID, dependency inversion (services depend on repository interfaces), DRY, YAGNI. Each feature is a vertical slice: `modules/<feature>/{routes,controller,service,repository,schema}.ts`.

---

## 4. Module Map (API)

| Module | Responsibility |
|---|---|
| `auth` | register, verify, login, 2FA, refresh rotation, logout, forgot/reset, change password |
| `users` | profile, preferences, sessions, admin user management |
| `mosques` | CRUD, slug, status, images (Supabase Storage), access transfer, mosque-user management |
| `mosque-config` | regional/athan/iqama/jumua/display/eid/content/durations |
| `prayer-times` | schedules, monthly grid, CSV import/export, copy-from-mosque, fixing rules |
| `announcements` | CRUD, ordering, scheduling, bulk enable/disable; flash messages |
| `events` | CRUD events; Ramadan/Eid surfacing |
| `favorites` | user ↔ mosque favourites |
| `notifications` | email + push-ready records |
| `public` | search, nearby, featured, mosque public payload, display payload, widget |
| `analytics` | super-admin metrics |
| `audit` | audit log query |
| `settings` | global platform settings |

---

## 5. Frontend Architecture (Next.js 15)

- **Route groups:** `(marketing)`, `(public)`, `(auth)`, `(dashboard)`. SSR/ISR for SEO on public pages; client components for interactive dashboards and the display.
- **Data:** TanStack Query for server state (caching, mutations, optimistic updates) over an Axios client that attaches credentials/Bearer and transparently refreshes tokens.
- **Client state:** Zustand for ephemeral UI/session state (theme, sidebar, current-mosque selector).
- **Forms:** React Hook Form + Zod (schemas imported from `@mawaqit/shared`, so client and server validate identically).
- **UI:** Tailwind + shadcn/ui + Framer Motion; dark/light via `next-themes`; i18n via `next-intl` (EN/AR/FR/DE/TR/TA, RTL for AR).
- **Display mode:** dedicated fullscreen route `display/:id`, polls the cached display payload (~5 min), renders countdown client-side via `requestAnimationFrame`, supports black-screen-during-prayer and landscape/portrait.

---

## 6. Security Architecture

| Concern | Mechanism |
|---|---|
| Password storage | bcrypt cost 12 |
| Session auth (web) | JWT access (15m) in memory + refresh (7d) in HTTP-only, Secure, SameSite=Lax cookie |
| Session auth (mobile) | Bearer access + refresh via JSON body; same rotation |
| Refresh rotation | New token per refresh; old hashed token revoked; **reuse detection** revokes the whole token family |
| 2FA | 6-digit email OTP stored hashed in Redis with TTL; "trusted computer" sets a longer-lived device token |
| CSRF | Double-submit token on state-changing cookie-auth requests |
| Rate limiting | Upstash sliding-window per IP+route (login, register, reset, OTP especially) |
| Authorization | RBAC middleware; `MosqueUser` scoping for tenant isolation |
| Input validation | Zod on every request (body/query/params) |
| Transport | HTTPS only (Vercel), HSTS, helmet headers |
| Secrets | Vercel/Supabase env vars; never committed |
| Audit | Every mutation → `AuditLog` (actor, entity, ip, UA) |
| Data privacy | Account export/delete endpoints |

---

## 7. Caching & Performance

- **Public reads** (mosque page, display payload, search) cached in Upstash with short TTL + ETag; invalidated on relevant mutation.
- **Next.js ISR** for marketing/public mosque pages; on-demand revalidation webhook when a mosque updates.
- **DB indexing** per `DATABASE.md`; pooled connections via Supabase PgBouncer to survive serverless concurrency.
- **Edge-friendly** static assets via Vercel CDN; images via Supabase Storage + Next/Image.

---

## 8. Environments & Config

| Env | DB | Notes |
|---|---|---|
| Local dev | Supabase project (dev) or local Postgres | `tsx watch`; in-memory rate-limit fallback if Upstash absent |
| Preview | Supabase (preview/branch) | Vercel preview deploys per PR |
| Production | Supabase (prod) | Vercel production; Upstash prod; SMTP prod |

Config via env vars only (validated with Zod at boot). Key vars: `DATABASE_URL` (pooled), `DIRECT_URL` (migrations), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (storage), `UPSTASH_REDIS_REST_URL/TOKEN`, JWT secrets, `WEB_ORIGIN`, SMTP, reCAPTCHA, weather/map keys.

---

## 9. CI/CD

```
GitHub push / PR
   │
   ├─▶ GitHub Actions: install → lint → typecheck → unit/integration tests → prisma validate
   │
   └─▶ Vercel: build preview (PR) / production (main)
              ├─ web project  (Next.js)
              └─ api project  (Express serverless)  — runs `prisma generate`; migrations via `prisma migrate deploy` step
```

Database migrations run against Supabase using `DIRECT_URL` in a deploy step (GitHub Action or Vercel build command), never against the pooled URL.

---

## 10. User Flow Diagrams

### 10.1 Registration & Verification
```
Visitor → Register form (email, password policy, language, terms, reCAPTCHA)
   → POST /auth/register → create User(emailVerified=false) → send verify email
   → User clicks link → GET/POST /auth/verify?token → emailVerified=true → redirect login
```

### 10.2 Login with 2FA
```
Login form → POST /auth/login → valid? 
   ├─ 2FA off → issue access+refresh → dashboard
   └─ 2FA on  → generate OTP → email → "enter code" screen
                 → POST /auth/2fa/verify (code, trustDevice?) 
                 → issue access+refresh (+ device token if trusted) → dashboard
```

### 10.3 Mosque Onboarding
```
Dashboard → "Add" → choose Type → mosque form (details, GPS, images, facilities)
   → POST /mosques → MosqueUser(role=MOSQUE_ADMIN) link → mosque OFFLINE
   → Configure prayer-times (source: Calendar/Calculation/Fixed) + config accordion
   → schedule complete → set ONLINE → share display URL + QR
```

### 10.4 Display Device
```
TV opens display/:id (fullscreen)
   → fetch cached display payload (times, config, announcements, hijri, weather)
   → render clock + countdown (client tick)
   → poll every ~5 min for changes; black-screen during prayer windows
```

### 10.5 Announcement Lifecycle
```
Admin → Manage messages → Add (text/image, orientation, event dates, duration, targets)
   → POST /announcements (≤50 total, ≤15 enabled) → reorder (drag) / bulk toggle
   → public messages screen + display rotate enabled, in-window announcements
```

---

## 11. Folder Structure (monorepo, no Docker)

```
mawaqit-platform/
├─ pnpm-workspace.yaml · package.json · tsconfig.base.json
├─ .github/workflows/ci.yml
├─ .env.example                          # Supabase + Upstash + SMTP + JWT vars
├─ packages/
│  ├─ shared/        # @mawaqit/shared — Zod schemas, TS types, constants
│  └─ prayer-calc/   # methods, hijri, DST, fixing rules
├─ apps/
│  ├─ api/
│  │  ├─ api/index.ts        # Vercel serverless entry (wraps createApp)
│  │  ├─ vercel.json         # rewrite all → /api/index
│  │  ├─ prisma/{schema.prisma,migrations,seed.ts}
│  │  └─ src/{config,middleware,modules,lib,app.ts,server.ts}
│  └─ web/
│     ├─ vercel.json (optional)
│     └─ src/{app,components,lib,stores,hooks,styles}
└─ docs/  # SRS, ARCHITECTURE, DATABASE, API, ROADMAP, plans/
```
