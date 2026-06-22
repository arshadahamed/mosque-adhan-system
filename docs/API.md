# API Architecture & Reference
## Islamic Prayer Time & Mosque Management Platform

**Base URL:** `/api/v1` · **Style:** REST · **Docs:** Swagger UI at `/api/v1/docs` (OpenAPI 3) · **Version:** 1.1 · **Date:** 2026-06-22

---

## 1. Conventions

### 1.1 Response envelope
```jsonc
// success
{ "success": true, "data": { /* ... */ }, "meta": { "pagination": { "page": 1, "limit": 20, "total": 134, "totalPages": 7 } } }
// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Email is invalid", "details": [ /* zod issues */ ] } }
```

### 1.2 Error codes
`VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `INVALID_CREDENTIALS` (401), `TOKEN_EXPIRED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL` (500).

### 1.3 Auth
- **Web:** access JWT (15m) returned + refresh JWT (7d) set as HTTP-only `Secure` `SameSite=Lax` cookie. Send `Authorization: Bearer <access>` or rely on cookie; `POST /auth/refresh` rotates.
- **Mobile:** both tokens returned in JSON; client stores securely and sends Bearer.
- **CSRF:** state-changing cookie-auth requests require `X-CSRF-Token` (double-submit).

### 1.4 Collections
Query params: `?page=1&limit=20&sort=createdAt:desc&filter[city]=GALGAMUWA&q=azhar`. Bounded `limit` ≤ 100. Responses include `meta.pagination`. Public reads support `ETag`/`If-None-Match`.

### 1.5 Versioning
Path-based (`/api/v1`). Breaking changes → `/api/v2`; non-breaking additions are backward-compatible.

---

## 2. Endpoint Reference

### 2.1 Auth — `/auth`
| Method | Path | Auth | Body / Notes |
|---|---|---|---|
| POST | `/auth/register` | public | `{ email, password, locale, acceptTerms, recaptcha }` → creates unverified user, sends verify email |
| POST | `/auth/verify` | public | `{ token }` → marks `emailVerified` |
| POST | `/auth/resend-verification` | public | `{ email }` |
| POST | `/auth/login` | public | `{ email, password, recaptcha?, remember? }` → tokens, or `requires2fa` |
| POST | `/auth/2fa/verify` | public | `{ challengeId, code, trustDevice? }` → tokens |
| POST | `/auth/refresh` | refresh cookie/body | rotates refresh, returns new access |
| POST | `/auth/logout` | auth | revokes refresh, clears cookie |
| POST | `/auth/forgot-password` | public | `{ email }` → reset email |
| POST | `/auth/reset-password` | public | `{ token, password }` |
| POST | `/auth/change-password` | auth | `{ currentPassword, newPassword }` |

### 2.2 Users — `/users`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/users/me` | auth | current profile + roles + mosque links |
| PATCH | `/users/me` | auth | update profile/preferences |
| GET | `/users/me/sessions` | auth | list sessions |
| DELETE | `/users/me/sessions/:id` | auth | revoke a session |
| GET | `/users` | SUPER_ADMIN | list/filter users |
| PATCH | `/users/:id` | SUPER_ADMIN | role/status |
| DELETE | `/users/:id` | SUPER_ADMIN | delete/anonymise |

### 2.3 Mosques — `/mosques`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/mosques` | auth | mosques the caller can administer (SUPER_ADMIN: all) |
| GET | `/mosques/:id` | auth (scoped) | full admin view |
| POST | `/mosques` | auth | create (`type` + form); caller becomes MOSQUE_ADMIN |
| PUT | `/mosques/:id` | MOSQUE_ADMIN/STAFF | update |
| PATCH | `/mosques/:id/status` | MOSQUE_ADMIN | ONLINE/OFFLINE |
| DELETE | `/mosques/:id` | MOSQUE_ADMIN | delete |
| POST | `/mosques/:id/images` | MOSQUE_ADMIN/STAFF | multipart → Supabase Storage |
| DELETE | `/mosques/:id/images/:imageId` | MOSQUE_ADMIN/STAFF | remove image |
| GET | `/mosques/:id/users` | MOSQUE_ADMIN | list mosque users |
| POST | `/mosques/:id/users` | MOSQUE_ADMIN | grant STAFF by email |
| DELETE | `/mosques/:id/users/:userId` | MOSQUE_ADMIN | revoke |
| POST | `/mosques/:id/transfer` | MOSQUE_ADMIN | transfer access to another user |
| GET | `/mosques/:id/qr` | MOSQUE_ADMIN | QR for public page |

### 2.4 Mosque Config — `/mosques/:id/config`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/mosques/:id/config` | scoped | full config (regional/athan/iqama/jumua/display/eid/content/durations) |
| PATCH | `/mosques/:id/config/:section` | MOSQUE_ADMIN/STAFF | update one section (Zod-validated per section) |

### 2.5 Prayer Times — `/mosques/:id/prayer-times`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/mosques/:id/prayer-times?year=2026&month=1` | scoped | schedule/month grid |
| PUT | `/mosques/:id/prayer-times/:year/:month/:day` | MOSQUE_ADMIN/STAFF | edit one day |
| PUT | `/mosques/:id/prayer-times/:year/:month` | MOSQUE_ADMIN/STAFF | bulk month |
| POST | `/mosques/:id/prayer-times/import` | MOSQUE_ADMIN/STAFF | CSV (`Day,Fajr,Shuruq,Dhuhr,Asr,Maghrib,Isha`) |
| GET | `/mosques/:id/prayer-times/export?year=2026` | scoped | CSV download |
| POST | `/mosques/:id/prayer-times/copy` | MOSQUE_ADMIN | `{ sourceMosqueId }` |
| PATCH | `/mosques/:id/prayer-times/fixing` | MOSQUE_ADMIN/STAFF | floor/offset rules |
| DELETE | `/mosques/:id/prayer-times/:year/:month` | MOSQUE_ADMIN/STAFF | empty month |

### 2.6 Announcements & Flash — `/mosques/:id/announcements`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/mosques/:id/announcements` | scoped | list |
| POST | `/mosques/:id/announcements` | MOSQUE_ADMIN/STAFF | create (enforces ≤50 / ≤15 enabled) |
| PUT | `/mosques/:id/announcements/:annId` | MOSQUE_ADMIN/STAFF | update |
| PATCH | `/mosques/:id/announcements/reorder` | MOSQUE_ADMIN/STAFF | `{ orderedIds[] }` |
| PATCH | `/mosques/:id/announcements/bulk` | MOSQUE_ADMIN/STAFF | bulk enable/disable |
| DELETE | `/mosques/:id/announcements/:annId` | MOSQUE_ADMIN/STAFF | delete |
| GET/PUT | `/mosques/:id/flash-message` | scoped / admin | get/set flash message |

### 2.7 Events — `/mosques/:id/events`
| Method | Path | Auth |
|---|---|---|
| GET | `/mosques/:id/events` | scoped |
| POST | `/mosques/:id/events` | MOSQUE_ADMIN/STAFF |
| PUT | `/mosques/:id/events/:eventId` | MOSQUE_ADMIN/STAFF |
| DELETE | `/mosques/:id/events/:eventId` | MOSQUE_ADMIN/STAFF |

### 2.8 Public — `/public` (no auth, cached, ETag)
| Method | Path | Notes |
|---|---|---|
| GET | `/public/mosques?q=&city=&country=&page=` | search |
| GET | `/public/mosques/nearby?lat=&lng=&radiusKm=` | nearby |
| GET | `/public/mosques/featured` | featured |
| GET | `/public/mosques/:slug` | public mosque page payload |
| GET | `/public/mosques/:slug/prayer-times?date=` | day/upcoming times |
| GET | `/public/display/:mosqueId` | full TV display payload (times, config, announcements, hijri, weather) |
| GET | `/public/widget/:mosqueId` | embeddable widget data |

### 2.9 Favorites & Notifications
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/favorites` | auth | list |
| POST | `/favorites` | auth | `{ mosqueId }` |
| DELETE | `/favorites/:mosqueId` | auth | remove |
| POST | `/mosques/:id/subscribe` | auth | mobile notification subscribe |
| GET | `/notifications` | auth | list |
| PATCH | `/notifications/:id/read` | auth | mark read |

### 2.10 Analytics, Audit, Settings (SUPER_ADMIN)
| Method | Path | Notes |
|---|---|---|
| GET | `/analytics/overview` | active mosques/users, visitors, API usage, popular mosques, system metrics |
| GET | `/audit-logs?entity=&actorUserId=&from=&to=` | filtered audit trail |
| GET/PATCH | `/settings` | global platform settings |

---

## 3. Cross-cutting middleware (every endpoint)

`requestId` → `helmet` → `cors(credentials)` → `rateLimit (Upstash)` → `cookieParser` → `csrf` (state-changing) → `authenticate` → `authorize (RBAC + tenant scope)` → `validate (Zod body/query/params)` → controller → `audit` (mutations) → `errorHandler`.

---

## 4. Mobile-readiness

- Stateless Bearer auth path mirrors cookie path; tokens returned in JSON for `register/login/refresh/2fa`.
- Lean DTOs; no HTML; consistent envelope; ISO-8601 timestamps; explicit `timezone` on time payloads.
- ETag on public reads to minimise mobile data.
- Versioned paths guarantee app compatibility across releases.

---

## 5. OpenAPI / Swagger

- Generated from Zod schemas (`@asteasolutions/zod-to-openapi`) so docs never drift from validation.
- Served at `/api/v1/docs`; JSON spec at `/api/v1/openapi.json` for client codegen (Flutter/RN).
