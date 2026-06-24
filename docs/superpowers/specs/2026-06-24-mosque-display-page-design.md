# Mosque Public Display Page — Design Spec

**Date:** 2026-06-24  
**Status:** Approved  
**Route:** `/mosques/[slug]`

---

## Overview

A fullscreen digital adhan clock/timetable display for mosque public screens (TVs, kiosks). Replaces the existing simple info page at `/mosques/[slug]`. Modelled after the mawaqit.net display. No navbar — pure dark fullscreen canvas designed to run 24/7 on a mosque wall screen.

---

## Route Structure

Move `/mosques/[slug]` from the `(public)` layout group (which includes a navbar) into a new `(display)` layout group with no navbar.

```
app/
  (public)/
    layout.tsx              ← keeps Navbar — unchanged
    mosques/
      page.tsx              ← mosque listing — unchanged
    (other public pages)
  (display)/                ← NEW route group
    layout.tsx              ← <html><body> with dark bg, overflow-hidden, no navbar
    mosques/
      [slug]/
        page.tsx            ← server component: fetches mosque + widget data
        display-client.tsx  ← "use client": clock, countdown, temperature, ticker
```

Delete: `apps/web/src/app/(public)/mosques/[slug]/page.tsx`  
Delete: `apps/web/src/components/mosque/prayer-times-widget.tsx` (replaced by display-client)

---

## Data Layer

### Server Component (page.tsx)

Fetches on every request (ISR revalidate: 60s):

1. `GET /api/v1/mosques/:slug` — mosque name, address, lat, lng, timezone, status, slug
2. `GET /api/v1/mosques/:id/widget` — today's prayer times, tomorrow's times, iqama config, Jumua config

Both results are passed as props to `<DisplayClient>`. Zero loading flash on first render.

If mosque not found → `notFound()`.

### Client Component (display-client.tsx)

| Data | Source | Refresh interval |
|------|--------|-----------------|
| Live clock (HH:MM:SS) | `setInterval` | 1 second |
| Hijri date | `Intl.DateTimeFormat` islamic-umalqura | Recomputed each second |
| Next prayer + countdown | Computed from clock vs prayer times | 1 second |
| Temperature (°C) | Open-Meteo API (lat/lng from mosque) | 5 minutes |
| Prayer data (midnight rollover) | Re-fetch widget API | 10 minutes |

**Open-Meteo endpoint:**
```
https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m&temperature_unit=celsius
```
Free, no API key. Displays `--°C` while loading or on error.

**Hijri date:**
```ts
new Intl.DateTimeFormat("en-TN-u-ca-islamic-umalqura", {
  day: "numeric", month: "long", year: "numeric"
}).format(new Date())
```
No third-party library needed.

---

## UI Layout

Fullscreen dark canvas (`h-screen w-screen overflow-hidden bg-[#0a0a0f] text-white`).

```
┌─────────────────────────────────────────────────────────────┐
│ 🟢 Online              MOSQUE NAME                    26°C  │
├──────────────┬──────────────────────────────┬───────────────┤
│   Shurûq     │   ┌──────────────────────┐   │    Jumua      │
│   5:55 AM    │   │   10:17:14 PM        │   │   12:13 PM    │
│              │   │   09 Muharram 1448   │   │               │
│              │   └──────────────────────┘   │               │
│              │    🕌 Fajr in 06:11 🕌        │               │
├──────────────┴──────────────────────────────┴───────────────┤
│  ┌─Fajr──┐    Dhuhr       Asr       Maghrib      Isha       │
│  │ 4:29  │   12:12       3:40       6:29        7:45        │
│  │ 4:49  │   12:27       3:50       6:39        7:55        │
│  └───────┘                                                   │
├─────────────────────────────────────────────────────────────┤
│  ◀ Please silence your mobile phones during prayer... ▶     │
└─────────────────────────────────────────────────────────────┘
```

### Visual Rules

- **Background:** `#0a0a0f` with subtle starfield via CSS `radial-gradient` box-shadows (static, no JS animation)
- **Center clock box:** Purple (`bg-purple-900` / `#5b21b6`) rounded-2xl card
  - Large tabular font for hours:minutes, smaller for seconds and AM/PM
  - Hijri date below in smaller white text
- **Active/next prayer column:** Purple box (`bg-purple-900 rounded-xl`) around the whole column; others are plain white text
- **Shuruq:** Displayed top-left area (middle row), NOT in the 5-prayer bottom row
- **Jumua time:** Displayed top-right area (middle row); always shown if config has a `jumua.time1`
- **Temperature:** Orange text (`text-orange-400`) next to mosque name, top right
- **Online indicator:** Green dot top-left corner, always visible (page only loads when online)
- **Flash messages:** CSS `@keyframes marquee` horizontal scroll at bottom, enabled messages joined with ` · `. No JS scroll logic.
- **Iqama times:** Shown below adhan time in each prayer column, slightly smaller font. Computed from `config.iqama[prayer]` (minute offset added to adhan time).

---

## Component Logic

### Next Prayer Calculation

```
prayers = [fajr, dhuhr, asr, maghrib, isha]  (shuruq excluded)
for each prayer in order:
  if adhanTime > now → this is next prayer, compute countdown
if all passed → next = tomorrow.fajr
```

Countdown format: `HH:MM:SS` remaining until adhan.

### Iqama Time Calculation

```ts
// config.iqama.fajr = 20 (minutes offset)
const iqamaTime = addMinutes(parseTime(adhanTime), iqamaOffset)
```

### Flash Message Ticker

All enabled flash messages for the mosque joined: `"Message 1 · Message 2 · Message 3"`.  
Animated with a single CSS `@keyframes marquee` on the container — no JS.  
If no flash messages, the ticker row is hidden.

### Midnight Rollover

The 10-minute prayer data re-fetch naturally picks up the next day's schedule after midnight since the widget API always returns today+tomorrow relative to server time.

---

## Files to Create / Modify

| Action | File |
|--------|------|
| CREATE | `apps/web/src/app/(display)/layout.tsx` |
| CREATE | `apps/web/src/app/(display)/mosques/[slug]/page.tsx` |
| CREATE | `apps/web/src/app/(display)/mosques/[slug]/display-client.tsx` |
| DELETE | `apps/web/src/app/(public)/mosques/[slug]/page.tsx` |
| DELETE | `apps/web/src/components/mosque/prayer-times-widget.tsx` |

The `(public)/mosques/page.tsx` (mosque listing) is unchanged.

---

## Out of Scope

- Iqama countdown (separate timer counting down from adhan to iqama) — can be added later
- Multi-language / RTL support — future
- Temperature unit toggle (C/F) — future
- Custom mosque logo/background — future
