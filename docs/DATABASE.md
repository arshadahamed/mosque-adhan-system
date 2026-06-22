# Database Architecture
## Islamic Prayer Time & Mosque Management Platform

**Engine:** PostgreSQL 16 (Supabase) · **ORM:** Prisma · **Version:** 1.1 · **Date:** 2026-06-22

---

## 1. Connection strategy (Supabase + serverless)

Two connection strings are required because the API runs on Vercel serverless functions:

| Var | Port | Use |
|---|---|---|
| `DATABASE_URL` | 6543 (PgBouncer, `?pgbouncer=true&connection_limit=1`) | Runtime queries from serverless functions — pooled, transaction mode |
| `DIRECT_URL` | 5432 (direct) | `prisma migrate` / introspection only |

`schema.prisma` declares both:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```
A single `PrismaClient` instance is reused across invocations via a `globalThis` singleton to avoid exhausting connections under concurrency.

---

## 2. Entity-Relationship Overview

```
User ──< MosqueUser >── Mosque ──1:1── MosqueConfig
 │                         │
 │                         ├──< PrayerSchedule ──< PrayerDay
 │                         ├──< Announcement
 │                         ├──< FlashMessage
 │                         ├──< Event
 │                         ├──< MosqueImage
 │                         ├──1:1 Subscription
 │                         └──< Favorite >── User
 ├──< RefreshToken
 ├──< Session
 ├──< Notification
 └──< AuditLog (actor)

Setting (standalone, global key/value)
```

Legend: `──<` one-to-many, `>──` many-to-one, `1:1` one-to-one, `──< X >──` join table.

---

## 3. Tables & Key Fields

### 3.1 Identity & Access
- **User** — `id`, `email` (unique), `passwordHash`, `firstName?`, `lastName?`, `locale`, `role` (`SUPER_ADMIN|MOSQUE_ADMIN|STAFF|PUBLIC`), `emailVerified`, `twoFactorEnabled`, `status`, timestamps.
- **MosqueUser** — join `userId`+`mosqueId`+`role` (`MOSQUE_ADMIN|STAFF`); `@@unique([userId, mosqueId])`. Enables multi-tenant scoping, "Transfer access", "Manage Users".
- **RefreshToken** — `userId`, `tokenHash` (unique), `family`, `expiresAt`, `revokedAt?`. Rotation + family-revocation on reuse.
- **Session** — `userId`, `ip?`, `userAgent?`, `lastSeenAt`. For session listing/revocation.

### 3.2 Mosque Domain
- **Mosque** — `id`, `slug` (unique), `name`, `type` (`MOSQUE|MUSALLA|HOME`), `address`, `city`, `zipcode`, `countryCode`, `latitude`, `longitude`, `timezone` (IANA), `phone?`, `email?`, `website?`, `paymentUrl?`, `associationName?`, `logoUrl?`, `showOnMap`, `status` (`ONLINE|OFFLINE`), `facilities` (Json), `capacityMen?`, `capacityWomen?`, `constructionYear?`, `history?`, timestamps.
- **MosqueConfig** (1:1) — Json columns grouping the config accordion: `regional`, `athan`, `iqama`, `jumua`, `display`, `eid`, `content`, `durations`. (Json chosen for flexible, versionable settings without wide-table churn; validated by Zod at the API boundary.)
- **MosqueImage** — `mosqueId`, `url`, `kind` (`exterior|interior|logo|gallery`).
- **Subscription** — `mosqueId` (unique), `plan`, `status`, `currentPeriodEnd?` (billing stub).

### 3.3 Prayer Times
- **PrayerSchedule** — `mosqueId`, `source` (`CALENDAR|CALCULATION|FIXED`), `method?`, `year`; `@@unique([mosqueId, year])`.
- **PrayerDay** — `scheduleId`, `month` (1–12), `day` (1–31), `fajr`, `shuruq`, `dhuhr`, `asr`, `maghrib`, `isha` (each `"HH:mm"` local); `@@unique([scheduleId, month, day])`.

### 3.4 Content
- **Announcement** — `mosqueId`, `title`, `type` (`IMAGE|TEXT`), `content?`, `imageUrl?`, `orientation`, `isEvent`, `startsAt?`, `endsAt?`, `durationSec`, `enabled`, `onMainScreen`, `onMobile`, `sortOrder`. Business rule (service layer): ≤50 per mosque, ≤15 `enabled`.
- **FlashMessage** — `mosqueId`, `content`, `enabled`.
- **Event** — `mosqueId`, `title`, `description?`, `category?`, `startsAt`, `endsAt?`, `location?`, `imageUrl?`.

### 3.5 Engagement & System
- **Favorite** — `userId`+`mosqueId`; `@@unique([userId, mosqueId])`.
- **Notification** — `userId?`, `type`, `channel` (`EMAIL|PUSH`), `payload` (Json), `readAt?`, `sentAt?`.
- **AuditLog** — `actorUserId?`, `action`, `entity`, `entityId?`, `metadata` (Json), `ip?`, `userAgent?`, `createdAt`.
- **Setting** — `key` (unique), `value` (Json).

---

## 4. Indexing Strategy

| Table | Index | Rationale |
|---|---|---|
| User | unique(`email`) | login / lookup |
| Mosque | unique(`slug`) | public URL routing |
| Mosque | (`city`), (`countryCode`) | search/filter |
| Mosque | (`latitude`,`longitude`) | nearby (bounding-box; PostGIS `earthdistance` optional upgrade) |
| MosqueUser | unique(`userId`,`mosqueId`) | tenant scoping |
| PrayerSchedule | unique(`mosqueId`,`year`) | one schedule/year |
| PrayerDay | unique(`scheduleId`,`month`,`day`), (`scheduleId`,`month`) | fast day/month reads for display |
| Announcement | (`mosqueId`,`enabled`) | display & manager queries |
| Event | (`mosqueId`,`startsAt`) | upcoming events |
| Favorite | unique(`userId`,`mosqueId`) | toggle/idempotency |
| RefreshToken | unique(`tokenHash`), (`userId`) | rotation + revoke-all |
| AuditLog | (`entity`,`entityId`), (`actorUserId`) | audit queries |
| Mosque.facilities | GIN (optional) | facility filtering on Json |

---

## 5. Performance & Integrity

- **Connection pooling** via Supabase PgBouncer (transaction mode) — mandatory for serverless; `connection_limit=1` per function instance.
- **Cascade deletes** from Mosque → config/schedules/days/announcements/events/images/favorites; from User → tokens/sessions/links/favorites/notifications. AuditLog actor uses `SetNull` to preserve history.
- **Read caching**: hot public payloads cached in Upstash; cache key includes `mosqueId` + date; invalidated on schedule/config/announcement mutation.
- **Time storage**: prayer times as local `"HH:mm"` strings + mosque `timezone`; computation/DST handled by `@mawaqit/prayer-calc`, keeping the DB simple and timezone-portable.
- **Migrations**: forward-only via `prisma migrate deploy` against `DIRECT_URL` in CI/deploy; never against the pooled URL.
- **Seed**: one `SUPER_ADMIN` + demo mosque (Al Azhar Jumma, Galgamuwa) with config and sample schedule.

---

## 6. Storage (Supabase Storage)

Buckets: `mosque-images` (public read), `logos` (public read). API uploads via service-role key; stores returned public URL in `MosqueImage.url` / `Mosque.logoUrl`. Image constraints enforced server-side (type, size, dimensions per SRS FR-2.3).

---

## 7. Future / Optional

- PostGIS for accurate radius search (`ST_DWithin`).
- Partitioning `AuditLog` by month at scale.
- Read replica (Supabase) for analytics-heavy queries.
- `PrayerScheduleVersion` history if audit of timetable edits is required.
