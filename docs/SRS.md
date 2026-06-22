# Software Requirements Specification (SRS)
## Islamic Prayer Time & Mosque Management Platform ("Mawaqit-style")

**Version:** 1.0 · **Status:** Draft for build · **Date:** 2026-06-22

---

## 1. Introduction

### 1.1 Purpose
Define the functional and non-functional requirements for a production-ready, multi-tenant SaaS platform enabling mosques and Islamic centres to manage prayer schedules, digital TV displays, Ramadan timetables, events, and announcements, while offering the public a fast way to find mosques and view prayer times.

### 1.2 Scope
The platform consists of:
- **Public web experience** — landing/marketing, mosque search, individual mosque pages, fullscreen digital display.
- **Admin dashboards** — for Super Admins, Mosque Admins, and Staff.
- **REST API** (`/api/v1`) — powers the web app and future mobile apps (Flutter, React Native, native iOS/Android).

### 1.3 Definitions
| Term | Meaning |
|---|---|
| Adhan / Athan | Call to prayer |
| Iqama / Iqâmah | Call immediately preceding congregational prayer |
| Jumua | Friday congregational prayer |
| Shuruq | Sunrise |
| Imsak | End of pre-dawn eating in Ramadan |
| Sehri | Pre-dawn meal |
| Iftar | Meal breaking the fast (≈ Maghrib) |
| Hijri | Islamic lunar calendar |
| Mawaqit | "Times" — here, a mosque's prayer-times instance |

### 1.4 Source-Derived Requirements
Requirements were reverse-engineered from the reference product's screens: admin mosque list, mosque create/edit form, the prayer-times configuration accordion (Regional, Calculation, Al-Athan, Iqama, Jumua, Durations, Invocations, Display, Eid & Ramadan), announcement & flash-message manager, the mosque details panel (subscribers, widget, language links), the fullscreen TV display, and the auth flows (login, email 2FA, registration with password policy, email verification).

---

## 2. Overall Description

### 2.1 User Classes
1. **Super Admin** — full platform control: mosques, users, subscriptions, analytics, settings, audit logs, announcements.
2. **Mosque Admin** — manage owned mosque(s): profile, prayer schedules, config, events, Ramadan, announcements, TV display, users (grant Staff), transfer access.
3. **Staff** — update schedules, create announcements, manage events for assigned mosque(s).
4. **Public User** — search mosques, view prayer times, save favourites, subscribe to notifications.
5. **Anonymous Visitor** — search and view public prayer times and displays without an account.

### 2.2 Operating Environment
- Web: evergreen browsers, mobile-first responsive; dedicated landscape/portrait TV display mode.
- Hosting: **Vercel** — `web` (Next.js 15) and `api` (Express deployed as a serverless function). **No Docker.**
- Data: **Supabase** PostgreSQL 16 (via Prisma, pooled connection) + Supabase Storage for images; **Upstash** serverless Redis for rate-limiting, caching, and OTP.
- Source & CI: **GitHub** repo with GitHub Actions (lint/typecheck/test) and Vercel auto-deploy on push.
- i18n: English (default), Arabic, French, German, Turkish, Tamil; RTL support for Arabic.

### 2.3 Constraints
- All prayer-time logic is timezone- and DST-aware per mosque (IANA timezone).
- Password policy: ≥12 chars, upper, lower, digit, special.
- Access token 15m; refresh token 7d with rotation + reuse detection.
- Every mutation produces an audit-log entry.

### 2.4 Assumptions & Dependencies
- Email delivery via SMTP provider (verification, 2FA, password reset, notifications).
- Optional reCAPTCHA on login/registration.
- Weather data via third-party API for display temperature.
- Map/geocoding provider for GPS correction & nearby search.

---

## 3. Functional Requirements

### FR-1 Authentication & Account
- FR-1.1 Register with email, password (policy-enforced), language, terms acceptance, reCAPTCHA.
- FR-1.2 Email verification via one-time activation link.
- FR-1.3 Login with email + password + optional reCAPTCHA + "remember me".
- FR-1.4 Two-factor authentication via 6-digit email code; "trusted computer" option.
- FR-1.5 Logout (revokes refresh token + clears cookies).
- FR-1.6 Forgot password → emailed reset link; reset password.
- FR-1.7 Change password (authenticated).
- FR-1.8 Profile management & user preferences (locale, notification settings).
- FR-1.9 Session listing & revocation.

### FR-2 Mosque Management
- FR-2.1 Create mosque via type selection (Mosque / Musalla / Home) then full form.
- FR-2.2 Fields: name, address, city, zipcode, country, GPS lat/lng (with map correction), association name, phone, email, website, online-payment URL, "add to homepage map" toggle.
- FR-2.3 Images: exterior, interior, logo, gallery.
- FR-2.4 Facilities & services toggles (women space, ablutions, courses, accessibility, library, Janaza, Eid, iftar, parking, bike parking, EV charging, Quran for blind, etc.), capacity (men/women), construction year, history, other info.
- FR-2.5 Edit / delete mosque; online/offline status; unique SEO slug.
- FR-2.6 Multi-language public links per mosque; embeddable website widget; mobile subscriber count.
- FR-2.7 Transfer access to another user; manage mosque users (grant/revoke Staff).
- FR-2.8 QR code generation for the mosque's public page.

### FR-3 Prayer Times
- FR-3.1 Six daily times: Fajr, Shuruq (sunrise), Dhuhr, Asr, Maghrib, Isha.
- FR-3.2 Source modes: **Calendar** (full-year manual grid), **Calculation** (method-based), **Fixed**.
- FR-3.3 Monthly timetable grid editor (per-day editing).
- FR-3.4 CSV import (`Day,Fajr,Shuruq,Dhuhr,Asr,Maghrib,Isha`) and export; "empty current month".
- FR-3.5 Copy schedule from another mosque (search by name/city/zip).
- FR-3.6 "Fixing times" — clamp a prayer to a floor value; offset rules (e.g. Fajr X min before Shuruq, Dhuhr X before Asr, Isha X after Maghrib).
- FR-3.7 Daily / weekly / monthly / yearly views.

### FR-4 Mosque Configuration
- FR-4.1 **Regional:** timezone, DST mode, Hijri date adjustment, 12h/24h time format, °C/°F.
- FR-4.2 **Al-Athan:** athan source, adhan duration (sec), enable/disable per prayer.
- FR-4.3 **Iqama:** enabled, qad-qamati sound, countdown, signal display time, waiting time per prayer, "iqama right after adhan for Isha", fixed iqama (simple per-prayer or by-calendar).
- FR-4.4 **Jumua:** time-like-Dhuhr toggle, 1st/2nd/3rd jumua times, summer-time, reminder hadith, black screen, approximate duration.
- FR-4.5 **Estimated durations** per prayer (minutes).
- FR-4.6 **Invocations & hadiths:** duaa after athan, invocations after salat, random hadith every 5 min.
- FR-4.7 **Display:** show city, logo, footer, message screen, highlight iqama, sabah/imsak, black screen during prayer, hijri date, temperature; theme; wallpaper picker.
- FR-4.8 **Eid & Ramadan:** Eid time x3, imsak minutes before Fajr.

### FR-5 Digital Display Mode
- FR-5.1 Fullscreen view: mosque name, temperature, big clock + seconds, Hijri + Gregorian date.
- FR-5.2 Shuruq and Jumua highlight tiles; five prayer columns each showing athan + iqama times.
- FR-5.3 "Next prayer in HH:MM" countdown; next-prayer highlight.
- FR-5.4 Rotating announcements, flash message, hadiths, black screen during prayer.
- FR-5.5 Auto-refresh (polls for changes ~every 5 min) without reload; online indicator.
- FR-5.6 Landscape & portrait orientations; theme + wallpaper applied.

### FR-6 Ramadan Module
- FR-6.1 Ramadan calendar with Sehri (imsak) & Iftar (Maghrib) times.
- FR-6.2 Taraweeh schedule; Ramadan-specific announcements; Eid prayer times surfaced one week prior.

### FR-7 Events
- FR-7.1 CRUD Islamic events, lectures, classes, community programs, Eid events with date/time, location, image, category.
- FR-7.2 Events feed on mosque page; optional display on TV.

### FR-8 Announcements
- FR-8.1 Up to 50 messages, max 15 enabled at once.
- FR-8.2 Text or image announcements; TV orientation; event flag with start/end; duration; targeting (main screen, mobile); enable/disable; drag-reorder; bulk enable/disable.
- FR-8.3 Flash message (single ephemeral banner).
- FR-8.4 Dedicated public messages screen URL.

### FR-9 Search
- FR-9.1 Search mosques by name, city, country.
- FR-9.2 Nearby mosques (geolocation / radius).
- FR-9.3 Featured mosques; filter by facilities.

### FR-10 Notifications
- FR-10.1 Email notifications (account, subscriptions).
- FR-10.2 Push-notification-ready data model & endpoints (mobile).

### FR-11 Analytics
- FR-11.1 Super-admin dashboard: active mosques, active users, visitor statistics, API usage, popular mosques, system metrics.

### FR-12 Administration
- FR-12.1 Manage users, roles, subscriptions, global settings.
- FR-12.2 View audit logs with filtering by entity/actor/date.

---

## 4. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Performance | Public prayer-times read p95 < 150 ms (cached); display payload cacheable with ETag. |
| NFR-2 | Scalability | Stateless API horizontally scalable; supports thousands of mosques, hundreds of thousands of users, multi-country/timezone. |
| NFR-3 | Security | OWASP Top-10 hardening: bcrypt(12), JWT rotation + reuse detection, HTTP-only/SameSite cookies, CSRF, rate limiting, input validation (Zod), RBAC, audit logging, secrets via env. |
| NFR-4 | Availability | Health checks, graceful shutdown, Docker restart policies; target 99.9%. |
| NFR-5 | Usability | Mobile-first, WCAG 2.1 AA, dark/light mode, keyboard navigable, RTL for Arabic. |
| NFR-6 | i18n | EN/AR/FR/DE/TR/TA; per-mosque + per-user locale. |
| NFR-7 | SEO | SSR/ISR public pages, semantic markup, sitemap, OpenGraph, structured data for mosques. |
| NFR-8 | Maintainability | Clean Architecture, SOLID, Repository + Service layers, typed end-to-end, ≥80% coverage on core domain. |
| NFR-9 | Observability | Structured logs, request IDs, error tracking hooks, metrics endpoint. |
| NFR-10 | Portability | Dockerised; environment-based config; reproducible via docker-compose. |
| NFR-11 | API | Versioned, OpenAPI-documented, consistent JSON envelope, pagination/filtering/sorting on collections. |
| NFR-12 | Compliance | Audit trail retention; GDPR-style data export/delete for user accounts. |

---

## 5. User Flows (summary)

- **Onboarding:** Register → verify email → login (→ 2FA) → create first mosque (type → form) → configure prayer times → publish → mosque ONLINE → display URL/QR shared.
- **Daily admin:** Login → dashboard → edit timetable / post announcement / add event → changes propagate to display within polling window.
- **Public:** Visit → search city → open mosque page → view times → favourite / subscribe / open fullscreen display.
- **Display device:** Open `display/:id` fullscreen on TV/kiosk → auto-refresh, countdown, black-screen during prayer.

Detailed flow diagrams: see `docs/ARCHITECTURE.md` §User Flows.

---

## 6. Acceptance Criteria (high level)
- All FRs above implemented behind RBAC with audit logging.
- Auth flows pass security review (rotation, CSRF, rate limit, password policy).
- Prayer-time computations correct across DST boundaries and Hijri adjustment.
- Display renders correctly in landscape/portrait and auto-refreshes.
- API documented in Swagger and consumable by a mobile client with bearer tokens.
- Lighthouse: public pages ≥90 performance/SEO/accessibility.

---

## 7. Out of Scope (v1)
- Payment/billing processing (subscription model stubbed).
- Native mobile apps (API is mobile-ready; apps are a separate track).
- Live video streaming for "Jumua live" (link-out only in v1).
