# Mawaqit-Style Prayer Time & Mosque Management Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready, multi-tenant SaaS platform for mosques to manage prayer schedules, digital TV displays, Ramadan timetables, events, and announcements — with a public-facing search/display experience and mobile-ready REST API.

**Architecture:** pnpm monorepo deployed on **Vercel** — (1) Express+TypeScript REST API (`/api/v1`) running as a **Vercel serverless function**, backed by **Supabase** PostgreSQL via Prisma (pooled), (2) Next.js 15 App Router web app (public site + admin dashboards + fullscreen TV display), (3) shared TypeScript packages (types, Zod schemas, prayer-calc). Clean architecture in the API: Controller → Service → Repository, with RBAC, JWT access + rotating refresh tokens in HTTP-only cookies, audit logging, and **Upstash** serverless-Redis caching/rate-limiting. **No Docker.** Source on **GitHub** with GitHub Actions CI + Vercel auto-deploy.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui, Framer Motion, TanStack Query, Zustand, React Hook Form + Zod, Axios · Express + TypeScript + Node 20 (Vercel serverless) · Supabase PostgreSQL 16 + Prisma · Upstash Redis · Supabase Storage · JWT + bcrypt · Swagger/OpenAPI · GitHub Actions + Vercel · Vitest + Supertest + Playwright.

## Global Constraints

- Node.js >= 20 LTS; pnpm workspaces monorepo. **No Docker** — deploy on Vercel.
- Database is **Supabase** Postgres: `DATABASE_URL` (pooled, port 6543, `?pgbouncer=true&connection_limit=1`) for runtime, `DIRECT_URL` (port 5432) for migrations. `PrismaClient` reused via `globalThis` singleton.
- Caching / rate-limiting / OTP via **Upstash** Redis (serverless); in-memory fallback when env absent (dev/test).
- Images via **Supabase Storage** (buckets `mosque-images`, `logos`).
- Next.js >= 15 with App Router only (no Pages Router).
- All API routes versioned under `/api/v1`.
- All responses use the envelope `{ success: boolean, data?: T, error?: { code, message, details? }, meta?: { pagination } }`.
- Access token lifetime 15m (memory/Authorization header for mobile; cookie for web). Refresh token lifetime 7d, rotated on every refresh, stored hashed in DB.
- Passwords: bcrypt cost 12; min 12 chars, 1 upper, 1 lower, 1 digit, 1 special (matches source registration rules).
- Prayer times stored in UTC offset-aware; every mosque has an IANA timezone (e.g. `Asia/Colombo`).
- Time format & temperature unit are per-mosque display preferences (12h/24h, °C/°F).
- RBAC roles: `SUPER_ADMIN`, `MOSQUE_ADMIN`, `STAFF`, `PUBLIC`. Permissions checked via middleware, never in the UI alone.
- Every mutating endpoint writes an `AuditLog` row.
- All user-facing copy in English first, i18n-ready (next-intl) for AR/FR/DE/TR/TA per source.
- Dark + light mode mandatory; mobile-first; WCAG 2.1 AA.

---

## Source Analysis Summary (from screenshots)

Extracted screens/features driving the data model and routes:

| Source screen | Platform feature |
|---|---|
| Admin list (mosque cards: ID, online status, address, email, created/updated, gallery, Actions menu) | Mosque dashboard list + status |
| Actions menu (Edit, Configure, Manage messages, Jumua live, Timetable, Transfer access, Manage Users, QR Code, Support) | Mosque action surface |
| "Adding a new mawaqit" (Type select → full mosque form: name, address, city, zip, country, GPS lat/lng, association, phone, email, website, payment link, homepage-map toggle, facilities toggles, capacity, history) | Mosque create/edit |
| Prayer times config accordion (Regional settings, Calculation, Al-Athan, Iqama, Jumua, Estimated durations, Invocations & hadiths, Display, Eid & Ramadan) | Prayer config module |
| Calculation: copy schedule from another mosque, source = Calendar, monthly timetable grid, CSV pre-populate, fixing times | Timetable engine |
| Regional: timezone, DST, Hegira adjustment, time format, temp unit | Mosque display prefs |
| Al-Athan: athan source, adhan duration, enable/disable per prayer | Adhan config |
| Iqama: enabled, qad-qamati sound, countdown, signal display time, waiting times per prayer, fixed iqama (simple/by-calendar) | Iqama config |
| Jumua: like-dhuhr toggle, 1st/2nd/3rd jumua time, summer time, reminder, black screen, duration | Jumua config |
| Display: city name, logo, footer, message screen, highlight iqama, sabah/imsak, black screen, hijri date, temperature, theme, wallpaper picker | Display config |
| Eid & Ramadan: eid times x3, imsak minutes before fajr | Ramadan/Eid module |
| Invocations: duaa after athan, invocations after salat, random hadith | Content toggles |
| Manage messages → Announcements (table: enabled, title, content image, orientation, dates, duration, main-screen, mobile) + Flash message tab | Announcements module |
| Add a message form (title, type image/text, TV orientation, image, event toggle + start/end, duration, enabled, main screen, mobile) | Announcement editor |
| Details panel (mobile subscribers count, widget embed, mawaqit links per language) | Public widget + subscribers |
| Fullscreen TV display (mosque name, temp, shuruq, jumua, big clock, hijri date, next-prayer countdown, 5 prayers with athan+iqama rows, footer) | Digital display mode |
| Login (email, password, recaptcha, remember me) + 2FA email code + Register (email, password rules, language, terms) + email verification | Auth system |
| Language switcher (AR/DE/EN/FR/TR) | i18n |

---

## File Structure (monorepo)

```
mawaqit-platform/
├─ pnpm-workspace.yaml
├─ docker-compose.yml                 # postgres, redis, api, web
├─ .env.example
├─ packages/
│  ├─ shared/                         # @mawaqit/shared
│  │  └─ src/{types,schemas,constants,utils}/  # Zod schemas + TS types shared web↔api
│  └─ prayer-calc/                    # @mawaqit/prayer-calc — calculation methods, hijri, DST
├─ apps/
│  ├─ api/                            # Express REST API
│  │  ├─ prisma/{schema.prisma,migrations,seed.ts}
│  │  └─ src/
│  │     ├─ config/                   # env, db, redis, swagger
│  │     ├─ middleware/               # auth, rbac, error, rateLimit, csrf, audit, validate
│  │     ├─ modules/                  # feature-sliced: each has controller/service/repository/routes/schema
│  │     │  ├─ auth/  mosques/  prayer-times/  events/  announcements/
│  │     │  ├─ users/ favorites/ notifications/ analytics/ public/
│  │     ├─ lib/                      # jwt, mailer, logger, cache
│  │     ├─ app.ts  server.ts
│  │     └─ types/
│  └─ web/                            # Next.js 15
│     └─ src/
│        ├─ app/
│        │  ├─ (marketing)/           # landing, pricing, about — SEO
│        │  ├─ (public)/              # search, mosque/[slug], display/[id]
│        │  ├─ (auth)/                # login, register, verify, reset
│        │  ├─ (dashboard)/           # admin: mosques, prayer-times, events, announcements, users, analytics
│        │  └─ api/                   # BFF route handlers (cookie proxy) if needed
│        ├─ components/{ui,layout,dashboard,public,display,forms}/
│        ├─ lib/{api-client,query,auth,utils}/
│        ├─ stores/                   # zustand
│        ├─ hooks/
│        └─ styles/
└─ docs/
   ├─ SRS.md  ARCHITECTURE.md  DATABASE.md  API.md  ROADMAP.md
   └─ superpowers/plans/
```

---

## Database Architecture (Prisma — core entities)

Full schema lives in `docs/DATABASE.md` and `apps/api/prisma/schema.prisma`. Key models & relationships:

- **User** (id, email unique, passwordHash, firstName, lastName, locale, role enum, emailVerified, twoFactorEnabled, status) → has many `Mosque` (via `MosqueUser`), `RefreshToken`, `Session`, `AuditLog`, `Favorite`, `Notification`.
- **MosqueUser** (join: userId, mosqueId, role `MOSQUE_ADMIN|STAFF`) — multi-tenant access; supports "Transfer access" + "Manage Users".
- **Mosque** (id, slug unique, name, type enum `MOSQUE|MUSALLA|HOME`, address, city, zipcode, countryCode, latitude, longitude, timezone IANA, phone, email, website, paymentUrl, associationName, logoUrl, showOnMap, status `ONLINE|OFFLINE`, facilities Json, capacityMen, capacityWomen, constructionYear, history) → has one `MosqueConfig`, many `PrayerSchedule`, `Announcement`, `Event`, `MosqueImage`, `Favorite`.
- **MosqueConfig** (1:1 Mosque) — embeds Regional (dstMode, hijriAdjustment, timeFormat, tempUnit), Athan (source, durationSec, enabledPerPrayer Json), Iqama (enabled, qadQamati, countdown, signalSec, waitingTimes Json, fixedIqama Json), Jumua (likeDhuhr, times[3], summerTime, reminder, blackScreen, durationMin), Display (showCity, showLogo, showFooter, messageScreen, highlightIqama, sabahImsak, blackScreenDuringPrayer, hijriDate, temperature, theme, wallpaper), Eid (times[3], imsakMinutes), Content (duaaAfterAthan, invocationsAfterSalat, randomHadith), durations Json.
- **PrayerSchedule** (mosqueId, source enum `CALENDAR|CALCULATION|FIXED`, calculationMethod, year) → many `PrayerDay`.
- **PrayerDay** (scheduleId, month, day, fajr, shuruq, dhuhr, asr, maghrib, isha — stored as "HH:mm" local). Unique (scheduleId, month, day). Indexed for fast range queries.
- **Announcement** (mosqueId, title, type `IMAGE|TEXT`, content, imageUrl, orientation, isEvent, startsAt, endsAt, durationSec, enabled, onMainScreen, onMobile, sortOrder). Plus **FlashMessage** (mosqueId, content, enabled).
- **Event** (mosqueId, title, description, category, startsAt, endsAt, location, imageUrl).
- **Favorite** (userId, mosqueId) unique.
- **Notification** (userId?, mosqueId?, type, channel `EMAIL|PUSH`, payload, readAt, sentAt).
- **AuditLog** (actorUserId?, action, entity, entityId, metadata Json, ip, userAgent, createdAt) — indexed (entity, entityId), (actorUserId).
- **RefreshToken** (userId, tokenHash, family, expiresAt, revokedAt) — rotation + reuse detection.
- **Session** (userId, ip, userAgent, lastSeenAt).
- **Setting** (key unique, value Json) — global platform settings.
- **Subscription** (mosqueId, plan, status, currentPeriodEnd) — SaaS tier (future billing).

**Indexing strategy:** unique slug/email; composite (scheduleId, month, day); GIN on Mosque facilities; (latitude, longitude) for nearby (PostGIS optional, else bounding-box); (mosqueId, enabled) on announcements; partial indexes on active rows.

---

## API Architecture

REST, versioned `/api/v1`, OpenAPI documented at `/api/v1/docs`. Standard envelope, cursor+offset pagination, `?page&limit&sort&filter[...]`. Middleware order: requestId → helmet/cors → rateLimit → cookieParser → csrf(state-changing) → auth(optional/required) → rbac → validate(Zod) → controller → audit → errorHandler.

Endpoint groups (full table in `docs/API.md`): auth, users, mosques, mosque-config, prayer-times/schedules, announcements, flash-messages, events, favorites, notifications, public (search/nearby/display payload/widget), analytics, audit-logs, settings.

Mobile-ready: stateless bearer auth supported in parallel with cookies; lean DTOs; ETag on public reads; consistent error codes.

---

## Development Roadmap (phases → expandable plans)

Each phase below is a milestone producing working, testable software. **Phase 1 is detailed at task granularity in this document.** Phases 2–9 are scoped here and must each be expanded into their own `docs/superpowers/plans/<date>-phaseN-*.md` via the writing-plans skill before execution.

- **Phase 1 — Foundation & Tooling:** monorepo, Docker, Prisma schema + migrations, shared package, env config, CI, health check. *(detailed below)*
- **Phase 2 — Auth & RBAC:** register, email verify, login, 2FA email, refresh rotation, logout, forgot/reset, change password, profile, middleware (auth/rbac/audit), rate limiting, sessions.
- **Phase 3 — Mosque Management:** CRUD, MosqueUser access (transfer/manage users), images/gallery upload, slug generation, status, facilities.
- **Phase 4 — Prayer Times Engine:** prayer-calc package (methods + hijri + DST), schedules CRUD, monthly grid, CSV import/export, copy-from-mosque, fixing times, MosqueConfig regional/athan/iqama/jumua.
- **Phase 5 — Announcements, Flash, Events:** CRUD, ordering, scheduling, image upload, enable/disable bulk, event calendar, Ramadan/Eid.
- **Phase 6 — Public API & Search:** search by name/city/country, nearby, featured, mosque public page payload, display payload, widget embed, subscribers, favorites, notifications.
- **Phase 7 — Web: Public + Auth UI:** landing/marketing, search, mosque page, login/register/verify/reset flows, i18n, theming.
- **Phase 8 — Web: Dashboards:** mosque list, create/edit forms, prayer-times accordion UI, announcements manager, events, users, analytics dashboard.
- **Phase 9 — Digital Display + Hardening:** fullscreen TV display with countdown/auto-refresh, weather widget, caching, SEO, Swagger polish, e2e tests, production Docker, observability.

---

# Phase 1 — Foundation & Tooling (detailed)

**Architecture:** Establish the pnpm monorepo, dockerized Postgres+Redis, the full Prisma schema with first migration, the shared types/schemas package, API bootstrap with health endpoint and error envelope, and a passing test harness. Output: `docker compose up` brings up a healthy API that connects to a migrated database.

### Task 1: Monorepo skeleton & workspace config

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.npmrc`, `tsconfig.base.json`, `README.md`

**Interfaces:**
- Produces: workspace globs `apps/*`, `packages/*`; root scripts `dev`, `build`, `lint`, `test`.

- [ ] **Step 1: Initialize git and root files**

```bash
cd mawaqit-platform
git init
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`package.json` (root):
```json
{
  "name": "mawaqit-platform",
  "private": true,
  "engines": { "node": ">=20" },
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "db:migrate": "pnpm --filter @mawaqit/api db:migrate",
    "db:seed": "pnpm --filter @mawaqit/api db:seed"
  }
}
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "composite": true,
    "baseUrl": "."
  }
}
```

`.gitignore`:
```
node_modules
dist
.next
.env
.env.local
*.log
coverage
```

- [ ] **Step 2: Verify workspace resolves**

Run: `pnpm install`
Expected: completes, creates `pnpm-lock.yaml`, no package errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: initialize pnpm monorepo skeleton"
```

### Task 2: Shared package (@mawaqit/shared)

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`, `packages/shared/src/constants/roles.ts`, `packages/shared/src/schemas/common.ts`, `packages/shared/src/types/api.ts`
- Test: `packages/shared/src/schemas/common.test.ts`

**Interfaces:**
- Produces: `Role` enum-like const, `ApiResponse<T>` type, `paginationQuerySchema` (Zod), `Pagination` type.

- [ ] **Step 1: Write the failing test**

`packages/shared/src/schemas/common.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { paginationQuerySchema } from "./common";

describe("paginationQuerySchema", () => {
  it("applies defaults", () => {
    const r = paginationQuerySchema.parse({});
    expect(r).toEqual({ page: 1, limit: 20, sort: undefined });
  });
  it("coerces and clamps limit", () => {
    const r = paginationQuerySchema.parse({ page: "2", limit: "500" });
    expect(r.page).toBe(2);
    expect(r.limit).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @mawaqit/shared test`
Expected: FAIL — cannot resolve `./common`.

- [ ] **Step 3: Write package files & implementation**

`packages/shared/package.json`:
```json
{
  "name": "@mawaqit/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "src/index.ts",
  "scripts": { "test": "vitest run", "lint": "echo ok", "build": "tsc -b" },
  "dependencies": { "zod": "^3.23.8" },
  "devDependencies": { "vitest": "^2.1.0", "typescript": "^5.6.0" }
}
```

`packages/shared/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src" }, "include": ["src"] }
```

`packages/shared/src/constants/roles.ts`:
```ts
export const ROLES = ["SUPER_ADMIN", "MOSQUE_ADMIN", "STAFF", "PUBLIC"] as const;
export type Role = (typeof ROLES)[number];
```

`packages/shared/src/types/api.ts`:
```ts
export interface ApiError { code: string; message: string; details?: unknown; }
export interface Pagination { page: number; limit: number; total: number; totalPages: number; }
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: { pagination?: Pagination };
}
```

`packages/shared/src/schemas/common.ts`:
```ts
import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
```

`packages/shared/src/index.ts`:
```ts
export * from "./constants/roles";
export * from "./types/api";
export * from "./schemas/common";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @mawaqit/shared test`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add common schemas, roles, api types"
```

### Task 3: Environment config & Supabase/Upstash wiring (no Docker)

**Files:**
- Create: `.env.example`, `apps/api/vercel.json`, `apps/api/api/index.ts`

**Interfaces:**
- Produces: documented env contract (`DATABASE_URL` pooled, `DIRECT_URL`, Upstash, SMTP, JWT, storage); the Vercel serverless entry that wraps `createApp()` (built in Task 4) and the catch-all rewrite.

> **Prerequisite (manual, one-time):** create a Supabase project and an Upstash Redis database in their dashboards; copy connection strings into `.env` (local) and Vercel project env vars (preview/prod). No local Postgres/Redis containers are used.

- [ ] **Step 1: Write `.env.example`**

```
NODE_ENV=development
PORT=4000

# Supabase Postgres — pooled (PgBouncer) for runtime
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
# Direct connection — migrations only
DIRECT_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres

# Supabase Storage
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=change-me

# Upstash serverless Redis (rate-limit, cache, OTP). Omit locally to use in-memory fallback.
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Auth
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
COOKIE_DOMAIN=localhost
WEB_ORIGIN=http://localhost:3000

# Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Mawaqit <no-reply@mawaqit.app>"

# Optional
RECAPTCHA_SECRET=
WEATHER_API_KEY=
```

- [ ] **Step 2: Write the Vercel serverless entry + rewrite**

`apps/api/vercel.json`:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/api/index" }] }
```

`apps/api/api/index.ts` (consumes `createApp` from Task 4):
```ts
import { createApp } from "../src/app.js";
// Express app is a valid (req,res) handler — Vercel invokes it directly.
export default createApp();
```

- [ ] **Step 3: Verify Supabase connectivity (after Task 5 generates the client)**

Run (once `DATABASE_URL`/`DIRECT_URL` are set): `pnpm --filter @mawaqit/api exec prisma db pull --print`
Expected: prints the remote schema without connection errors. (If run before Task 5, defer to Task 5 Step 3.)

- [ ] **Step 4: Commit**

```bash
git add .env.example apps/api/vercel.json apps/api/api/index.ts
git commit -m "chore: add env contract and vercel serverless entry (supabase + upstash)"
```

### Task 4: API bootstrap (Express + config + error envelope)

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/config/env.ts`, `apps/api/src/lib/logger.ts`, `apps/api/src/middleware/error.ts`, `apps/api/src/app.ts`, `apps/api/src/server.ts`
- Test: `apps/api/src/middleware/error.test.ts`

**Interfaces:**
- Consumes: `@mawaqit/shared` `ApiResponse`.
- Produces: `createApp(): Express` app factory; `AppError` class with `statusCode`, `code`; `env` validated config object.

- [ ] **Step 1: Write the failing test**

`apps/api/src/middleware/error.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app";

describe("error envelope", () => {
  it("returns standardized 404 for unknown route", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
  it("health check returns ok", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @mawaqit/api test`
Expected: FAIL — `../app` not found.

- [ ] **Step 3: Write package, config, and app**

`apps/api/package.json`:
```json
{
  "name": "@mawaqit/api",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -b",
    "start": "node dist/server.js",
    "test": "vitest run",
    "lint": "echo ok",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "@mawaqit/shared": "workspace:*",
    "express": "^4.21.0",
    "helmet": "^8.0.0",
    "cors": "^2.8.5",
    "cookie-parser": "^1.4.7",
    "zod": "^3.23.8",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/supertest": "^6.0.2",
    "supertest": "^7.0.0",
    "tsx": "^4.19.0",
    "vitest": "^2.1.0",
    "typescript": "^5.6.0"
  }
}
```

`apps/api/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src", "module": "ESNext", "moduleResolution": "Bundler" }, "include": ["src"] }
```

`apps/api/src/config/env.ts`:
```ts
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default("postgresql://mawaqit:mawaqit@localhost:5432/mawaqit"),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
});
export const env = schema.parse(process.env);
```

`apps/api/src/lib/logger.ts`:
```ts
export const logger = {
  info: (...a: unknown[]) => console.log("[info]", ...a),
  error: (...a: unknown[]) => console.error("[error]", ...a),
};
```

`apps/api/src/middleware/error.ts`:
```ts
import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

export class AppError extends Error {
  constructor(public statusCode: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Resource not found" } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message, details: err.details } });
  }
  logger.error(err);
  res.status(500).json({ success: false, error: { code: "INTERNAL", message: "Internal server error" } });
}
```

`apps/api/src/app.ts`:
```ts
import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { notFound, errorHandler } from "./middleware/error.js";

export function createApp(): Express {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/v1/health", (_req, res) => {
    res.json({ success: true, data: { status: "ok", uptime: process.uptime() } });
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
```

`apps/api/src/server.ts`:
```ts
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

createApp().listen(env.PORT, () => logger.info(`API on :${env.PORT}`));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @mawaqit/api test`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): bootstrap express app with error envelope and health check"
```

### Task 5: Prisma schema & first migration (core models)

**Files:**
- Create: `apps/api/prisma/schema.prisma`, `apps/api/src/config/db.ts`
- Modify: `apps/api/package.json` (add `@prisma/client`, `prisma`)
- Test: `apps/api/src/config/db.test.ts`

**Interfaces:**
- Produces: `prisma` client singleton; tables for all core models (User, MosqueUser, Mosque, MosqueConfig, PrayerSchedule, PrayerDay, Announcement, FlashMessage, Event, Favorite, Notification, AuditLog, RefreshToken, Session, Setting, MosqueImage, Subscription).

- [ ] **Step 1: Write the schema**

`apps/api/prisma/schema.prisma` (abridged core — full version mirrors DATABASE.md):
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role { SUPER_ADMIN MOSQUE_ADMIN STAFF PUBLIC }
enum MosqueType { MOSQUE MUSALLA HOME }
enum MosqueStatus { ONLINE OFFLINE }
enum ScheduleSource { CALENDAR CALCULATION FIXED }
enum AnnouncementType { IMAGE TEXT }

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  firstName     String?
  lastName      String?
  locale        String    @default("en")
  role          Role      @default(PUBLIC)
  emailVerified Boolean   @default(false)
  twoFactorEnabled Boolean @default(false)
  status        String    @default("active")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  mosqueLinks   MosqueUser[]
  refreshTokens RefreshToken[]
  sessions      Session[]
  favorites     Favorite[]
  notifications Notification[]
  auditLogs     AuditLog[]
}

model MosqueUser {
  id       String @id @default(cuid())
  userId   String
  mosqueId String
  role     Role
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  mosque   Mosque @relation(fields: [mosqueId], references: [id], onDelete: Cascade)
  @@unique([userId, mosqueId])
}

model Mosque {
  id              String        @id @default(cuid())
  slug            String        @unique
  name            String
  type            MosqueType    @default(MOSQUE)
  address         String
  city            String
  zipcode         String
  countryCode     String
  latitude        Float
  longitude       Float
  timezone        String
  phone           String?
  email           String?
  website         String?
  paymentUrl      String?
  associationName String?
  logoUrl         String?
  showOnMap       Boolean       @default(false)
  status          MosqueStatus  @default(OFFLINE)
  facilities      Json          @default("{}")
  capacityMen     Int?
  capacityWomen   Int?
  constructionYear Int?
  history         String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  config          MosqueConfig?
  schedules       PrayerSchedule[]
  announcements   Announcement[]
  flashMessages   FlashMessage[]
  events          Event[]
  images          MosqueImage[]
  favorites       Favorite[]
  users           MosqueUser[]
  @@index([city])
  @@index([countryCode])
  @@index([latitude, longitude])
}

model MosqueConfig {
  id        String @id @default(cuid())
  mosqueId  String @unique
  regional  Json   @default("{}")
  athan     Json   @default("{}")
  iqama     Json   @default("{}")
  jumua     Json   @default("{}")
  display   Json   @default("{}")
  eid       Json   @default("{}")
  content   Json   @default("{}")
  durations Json   @default("{}")
  mosque    Mosque @relation(fields: [mosqueId], references: [id], onDelete: Cascade)
}

model PrayerSchedule {
  id        String         @id @default(cuid())
  mosqueId  String
  source    ScheduleSource @default(CALENDAR)
  method    String?
  year      Int
  mosque    Mosque         @relation(fields: [mosqueId], references: [id], onDelete: Cascade)
  days      PrayerDay[]
  @@unique([mosqueId, year])
}

model PrayerDay {
  id         String         @id @default(cuid())
  scheduleId String
  month      Int
  day        Int
  fajr       String
  shuruq     String
  dhuhr      String
  asr        String
  maghrib    String
  isha       String
  schedule   PrayerSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  @@unique([scheduleId, month, day])
  @@index([scheduleId, month])
}

model Announcement {
  id          String           @id @default(cuid())
  mosqueId    String
  title       String
  type        AnnouncementType @default(TEXT)
  content     String?
  imageUrl    String?
  orientation String           @default("landscape")
  isEvent     Boolean          @default(false)
  startsAt    DateTime?
  endsAt      DateTime?
  durationSec Int              @default(30)
  enabled     Boolean          @default(true)
  onMainScreen Boolean         @default(true)
  onMobile    Boolean          @default(true)
  sortOrder   Int              @default(0)
  createdAt   DateTime         @default(now())
  mosque      Mosque           @relation(fields: [mosqueId], references: [id], onDelete: Cascade)
  @@index([mosqueId, enabled])
}

model FlashMessage {
  id       String  @id @default(cuid())
  mosqueId String
  content  String
  enabled  Boolean @default(true)
  mosque   Mosque  @relation(fields: [mosqueId], references: [id], onDelete: Cascade)
}

model Event {
  id          String    @id @default(cuid())
  mosqueId    String
  title       String
  description String?
  category    String?
  startsAt    DateTime
  endsAt      DateTime?
  location    String?
  imageUrl    String?
  mosque      Mosque    @relation(fields: [mosqueId], references: [id], onDelete: Cascade)
  @@index([mosqueId, startsAt])
}

model MosqueImage {
  id       String @id @default(cuid())
  mosqueId String
  url      String
  kind     String @default("gallery")
  mosque   Mosque @relation(fields: [mosqueId], references: [id], onDelete: Cascade)
}

model Favorite {
  id       String @id @default(cuid())
  userId   String
  mosqueId String
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  mosque   Mosque @relation(fields: [mosqueId], references: [id], onDelete: Cascade)
  @@unique([userId, mosqueId])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String?
  type      String
  channel   String   @default("EMAIL")
  payload   Json     @default("{}")
  readAt    DateTime?
  sentAt    DateTime?
  createdAt DateTime @default(now())
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model AuditLog {
  id          String   @id @default(cuid())
  actorUserId String?
  action      String
  entity      String
  entityId    String?
  metadata    Json     @default("{}")
  ip          String?
  userAgent   String?
  createdAt   DateTime @default(now())
  actor       User?    @relation(fields: [actorUserId], references: [id], onDelete: SetNull)
  @@index([entity, entityId])
  @@index([actorUserId])
}

model RefreshToken {
  id        String    @id @default(cuid())
  userId    String
  tokenHash String    @unique
  family    String
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model Session {
  id         String   @id @default(cuid())
  userId     String
  ip         String?
  userAgent  String?
  lastSeenAt DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Setting {
  id    String @id @default(cuid())
  key   String @unique
  value Json   @default("{}")
}

model Subscription {
  id              String   @id @default(cuid())
  mosqueId        String   @unique
  plan            String   @default("free")
  status          String   @default("active")
  currentPeriodEnd DateTime?
}
```

- [ ] **Step 2: Add deps and db client**

Append to `apps/api/package.json` dependencies: `"@prisma/client": "^5.20.0"`; devDependencies: `"prisma": "^5.20.0"`.

`apps/api/src/config/db.ts`:
```ts
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();
```

- [ ] **Step 3: Generate client and run migration**

Run:
```bash
pnpm install
pnpm --filter @mawaqit/api db:generate
pnpm --filter @mawaqit/api exec prisma migrate dev --name init
```
Expected: migration `init` created and applied; `prisma generate` succeeds.

- [ ] **Step 4: Write connectivity test**

`apps/api/src/config/db.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { prisma } from "./db";

describe("db", () => {
  it("connects and counts users", async () => {
    const count = await prisma.user.count();
    expect(typeof count).toBe("number");
    await prisma.$disconnect();
  });
});
```

Run: `pnpm --filter @mawaqit/api test src/config/db.test.ts`
Expected: PASS (requires `docker compose up -d postgres` first).

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma apps/api/src/config/db.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat(api): add prisma schema, init migration, db client"
```

### Task 6: Seed script & documentation artifacts

**Files:**
- Create: `apps/api/prisma/seed.ts`, `docs/SRS.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API.md`, `docs/ROADMAP.md`

**Interfaces:**
- Consumes: `prisma` client.
- Produces: seeded `SUPER_ADMIN` user + one demo mosque with config and a sample prayer schedule; published planning docs.

- [ ] **Step 1: Write the seed**

`apps/api/prisma/seed.ts`:
```ts
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
const prisma = new PrismaClient();

function hash(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@mawaqit.local" },
    update: {},
    create: { email: "admin@mawaqit.local", passwordHash: hash("ChangeMe!2026"), role: "SUPER_ADMIN", emailVerified: true, firstName: "Super", lastName: "Admin" },
  });
  const mosque = await prisma.mosque.upsert({
    where: { slug: "al-azhar-jumma-galgamuwa" },
    update: {},
    create: {
      slug: "al-azhar-jumma-galgamuwa", name: "Al Azhar Jumma Masjid", type: "MOSQUE",
      address: "Kurunegala Road, Galgamuwa", city: "GALGAMUWA", zipcode: "60700", countryCode: "LK",
      latitude: 7.991, longitude: 80.268, timezone: "Asia/Colombo", status: "ONLINE",
      config: { create: {} },
    },
  });
  console.log({ admin: admin.email, mosque: mosque.slug });
}
main().finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run the seed**

Run: `pnpm --filter @mawaqit/api db:seed`
Expected: logs `{ admin: 'admin@mawaqit.local', mosque: 'al-azhar-jumma-galgamuwa' }`.

- [ ] **Step 3: Write planning docs**

Create `docs/SRS.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API.md`, `docs/ROADMAP.md` capturing the sections of this plan (source analysis, architecture, DB models, API table, roadmap). (Content mirrors this plan; these are the standalone deliverables.)

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/seed.ts docs
git commit -m "feat(api): add seed; docs: add SRS, architecture, database, api, roadmap"
```

---

## Self-Review

**Spec coverage (Phase 1 scope):** monorepo ✓ (T1), shared types/schemas ✓ (T2), Docker Postgres+Redis ✓ (T3), API bootstrap + error envelope + health ✓ (T4), full Prisma schema covering every required model (Users, Roles via enum+MosqueUser, Mosques, PrayerTimes/Schedules, Announcements, Events, Favorites, Notifications, AuditLogs, Settings, RefreshTokens, Sessions) ✓ (T5), seed + planning deliverables (SRS/Architecture/DB/API/Roadmap) ✓ (T6). Phases 2–9 scoped with explicit milestone boundaries; each must be expanded into its own plan before execution.

**Placeholder scan:** Phase 1 tasks contain concrete file paths, full code, exact commands, and expected outputs. The only intentional deferral is "full schema mirrors DATABASE.md" — the schema shown is the authoritative core and is complete enough to migrate. Phases 2–9 are deliberately scoped (not task-detailed) and flagged as requiring their own writing-plans pass.

**Type consistency:** `ApiResponse<T>` envelope used in T2 and T4 error middleware match. `prisma` singleton name consistent T5→T6. Role values consistent between `packages/shared` `ROLES` and Prisma `Role` enum.

**Note:** This is a master/Phase-1 plan. Phases 2–9 are each large enough to warrant a dedicated plan document and should not be executed from prose scope alone.
