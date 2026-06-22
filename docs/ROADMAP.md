# Development Roadmap
## Islamic Prayer Time & Mosque Management Platform

**Version:** 1.1 · **Date:** 2026-06-22
**Deployment:** Vercel (web + Express serverless API) · Supabase (Postgres + Storage) · Upstash (Redis) · GitHub (source + Actions CI). **No Docker.**

Each phase produces working, testable software and is integrated via GitHub → Vercel preview/production. Phases 2–9 must each be expanded into a dedicated task-level plan (`docs/superpowers/plans/<date>-phaseN-*.md`) before execution.

---

## Phase 0 — Repo & Deployment Wiring  *(quick start)*
- GitHub repo created; `main` protected; PR previews on Vercel.
- Supabase project provisioned; `DATABASE_URL` (pooled) + `DIRECT_URL` set in Vercel/GitHub secrets.
- Upstash Redis + SMTP credentials configured as env vars.
- **Exit:** empty monorepo deploys a health check to Vercel from `main`.

## Phase 1 — Foundation & Tooling  *(detailed in 2026-06-22-mawaqit-platform.md)*
- pnpm monorepo, `@mawaqit/shared`, Prisma schema + first migration on Supabase, Express bootstrap with error envelope + health, serverless entry (`api/index.ts` + `vercel.json`), seed, planning docs.
- GitHub Actions: install → lint → typecheck → test → `prisma validate`.
- **Exit:** API deployed on Vercel, connected to Supabase, migrated, seeded; CI green.

## Phase 2 — Auth & RBAC
- Register, email verification, login, email 2FA (OTP in Upstash), refresh rotation + reuse detection, logout, forgot/reset, change password, profile, sessions.
- Middleware: authenticate, authorize (RBAC + tenant scope), CSRF, rate limiting (Upstash), audit.
- **Exit:** full secure auth lifecycle, tested (Supertest), Swagger-documented; passes a security review checklist.

## Phase 3 — Mosque Management
- Mosque CRUD + slug + status; MosqueUser access (grant/revoke STAFF, transfer); images/logo via Supabase Storage; facilities, capacity, history; QR.
- **Exit:** an admin can create/configure/own a mosque end-to-end via API.

## Phase 4 — Prayer Times Engine
- `@mawaqit/prayer-calc` (calculation methods, Hijri conversion + adjustment, DST, fixing/offset rules).
- Schedules CRUD, monthly grid, CSV import/export, copy-from-mosque, "empty month"; MosqueConfig sections (regional/athan/iqama/jumua/durations).
- **Exit:** correct, DST-safe daily times derivable for any mosque; config sections persisted.

## Phase 5 — Announcements, Flash & Events
- Announcement CRUD with ≤50/≤15-enabled rule, ordering (drag), scheduling/event windows, bulk toggle, image upload; flash message; events CRUD; Eid/Ramadan surfacing.
- **Exit:** content management complete and feeding display/public payloads.

## Phase 6 — Public API & Search
- Search (name/city/country), nearby, featured, facility filters; public mosque payload; display payload (cached + ETag); widget; favorites; notifications; subscribe.
- **Exit:** anonymous + mobile clients can find mosques and fetch display/public data fast.

## Phase 7 — Web: Public & Auth UI
- Next.js marketing/landing, pricing, mosque search, mosque page (SSR/ISR, SEO, OG, structured data); auth pages (login, register, verify, 2FA, forgot/reset); i18n (EN/AR/FR/DE/TR/TA, RTL); dark/light theming; design system (shadcn/ui + Framer Motion).
- **Exit:** polished public site + auth flows live on Vercel, Lighthouse ≥90.

## Phase 8 — Web: Dashboards
- Mosque list + cards (status, gallery, actions menu); create/edit forms (RHF+Zod); prayer-times accordion UI (regional/calculation grid/athan/iqama/jumua/display/eid); CSV tools; announcements manager (table, drag-reorder, bulk); events; users/access; analytics dashboard.
- **Exit:** Mosque Admin/Staff/Super Admin can run everything from the UI.

## Phase 9 — Digital Display + Hardening
- Fullscreen `display/:id` (clock + seconds, countdown, next-prayer highlight, athan/iqama rows, hijri/gregorian, temperature, announcements/flash/hadith rotation, black-screen-during-prayer, landscape/portrait, auto-refresh, themes/wallpapers).
- Caching/invalidation, SEO/sitemap, Swagger polish, e2e (Playwright), observability, account export/delete, performance pass.
- **Exit:** production-grade platform; all NFRs met; v1 release.

---

## Milestone Sequencing & Dependencies

```
P0 ─▶ P1 ─▶ P2 ─▶ P3 ─▶ P4 ─┬─▶ P5 ─▶ P6 ─▶ P9
                            └─────────────▶ P7 ─▶ P8 ─▶ P9
```
- P7 (public/auth UI) can start in parallel after P2 (auth) + P6 (public API) stubs.
- P8 (dashboards) depends on P3–P6 endpoints.
- P9 integrates everything for release.

## Definition of Done (every phase)
- Code typed end-to-end; Zod validation; tests (unit + integration) green in CI.
- New endpoints documented in Swagger; audit logging on mutations.
- Deployed to a Vercel preview and verified; migrations applied to Supabase via `DIRECT_URL`.
- Security & accessibility checks for any user-facing surface.

## Risk Register (top items)
| Risk | Mitigation |
|---|---|
| Serverless cold starts / DB connections | Supabase PgBouncer pooling, Prisma singleton, `connection_limit=1` |
| Prayer-time correctness across DST/Hijri | Dedicated `prayer-calc` package with exhaustive unit tests on boundaries |
| Express-on-Vercel limits (timeouts, body size) | Keep handlers fast; offload heavy jobs; cache public reads |
| Token/security regressions | Security-review checklist gate in P2 and P9 |
| i18n/RTL complexity | next-intl + RTL-aware components from P7 start |
