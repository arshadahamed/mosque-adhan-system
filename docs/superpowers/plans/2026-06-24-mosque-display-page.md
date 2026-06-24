# Mosque Public Display Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/mosques/[slug]` with a fullscreen dark TV display showing live clock, Hijri date, prayer times with iqama offsets, next-prayer countdown, temperature, and a flash message ticker.

**Architecture:** Server component fetches mosque + widget data for fast first paint; a single `DisplayClient` client component takes over for live updates (clock, countdown, temperature polling, midnight data refresh). Pure utility functions handle time math and are unit-tested with vitest.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript 5, vitest (new), Open-Meteo API (free weather, no key)

## Global Constraints

- Next.js 16.2.9 — `params` is a `Promise<{...}>`, always `await params`
- Tailwind v4 — use `bg-[#hex]` for custom colours, `bg-linear-to-r` (not `bg-gradient-to-r`)
- API base: `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"` (already set in next.config.ts)
- No new npm packages except vitest + @vitest/ui for tests
- All files in `apps/web/src/` use `@/` alias

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| CREATE | `apps/web/src/lib/display-utils.ts` | Pure time math: addMinutes, formatCountdown, getNextPrayer |
| CREATE | `apps/web/src/lib/__tests__/display-utils.test.ts` | Unit tests for above |
| MODIFY | `apps/api/src/modules/prayer/prayer.repository.ts` | Add findFlashMessages query |
| MODIFY | `apps/api/src/modules/prayer/prayer.service.ts` | Include flash messages in getWidgetData |
| CREATE | `apps/web/src/app/(display)/layout.tsx` | Minimal dark layout, no navbar |
| MODIFY | `apps/web/src/app/globals.css` | Add @keyframes marquee + .starfield |
| CREATE | `apps/web/src/app/(display)/mosques/[slug]/page.tsx` | Server component: fetch + pass to client |
| CREATE | `apps/web/src/app/(display)/mosques/[slug]/display-client.tsx` | All live UI logic |
| DELETE | `apps/web/src/app/(public)/mosques/[slug]/page.tsx` | Replaced by (display) version |
| DELETE | `apps/web/src/components/mosque/prayer-times-widget.tsx` | Replaced by display-client |

---

### Task 1: Utility functions + vitest setup

**Files:**
- Create: `apps/web/src/lib/display-utils.ts`
- Create: `apps/web/src/lib/__tests__/display-utils.test.ts`
- Modify: `apps/web/package.json`
- Create: `apps/web/vitest.config.ts`

**Interfaces:**
- Produces:
  - `addMinutes(time: string, minutes: number): string` — `"05:30"` + 20 → `"05:50"`
  - `formatCountdown(totalSeconds: number): string` — 3661 → `"01:01:01"`
  - `getNextPrayer(prayers, now, tomorrow): NextPrayer | null`
  - `type NextPrayer = { key: string; label: string; secondsUntil: number }`

- [ ] **Step 1: Add vitest to package.json**

In `apps/web/package.json`, add to `"devDependencies"`:
```json
"vitest": "^2.0.0",
"@vitest/ui": "^2.0.0"
```
And add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

Run:
```bash
cd apps/web && pnpm install
```

- [ ] **Step 2: Create vitest config**

Create `apps/web/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Write the failing tests**

Create `apps/web/src/lib/__tests__/display-utils.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { addMinutes, formatCountdown, getNextPrayer } from "@/lib/display-utils";

describe("addMinutes", () => {
  it("adds minutes within the same hour", () => {
    expect(addMinutes("05:30", 20)).toBe("05:50");
  });

  it("rolls over to next hour", () => {
    expect(addMinutes("05:45", 20)).toBe("06:05");
  });

  it("wraps past midnight", () => {
    expect(addMinutes("23:50", 20)).toBe("00:10");
  });

  it("handles zero offset", () => {
    expect(addMinutes("12:30", 0)).toBe("12:30");
  });
});

describe("formatCountdown", () => {
  it("formats seconds into HH:MM:SS", () => {
    expect(formatCountdown(3661)).toBe("01:01:01");
  });

  it("pads single digits", () => {
    expect(formatCountdown(65)).toBe("00:01:05");
  });

  it("handles zero", () => {
    expect(formatCountdown(0)).toBe("00:00:00");
  });
});

describe("getNextPrayer", () => {
  const prayers = [
    { key: "fajr",    label: "Fajr",    adhan: "04:29" },
    { key: "dhuhr",   label: "Dhuhr",   adhan: "12:12" },
    { key: "asr",     label: "Asr",     adhan: "15:40" },
    { key: "maghrib", label: "Maghrib", adhan: "18:29" },
    { key: "isha",    label: "Isha",    adhan: "19:45" },
  ];
  const tomorrow = { fajr: "04:30" };

  it("returns the first upcoming prayer", () => {
    const now = new Date(2026, 0, 1, 10, 0, 0); // 10:00:00 AM
    const result = getNextPrayer(prayers, now, tomorrow);
    expect(result?.key).toBe("dhuhr");
    // 12:12 = 12*3600+12*60 = 43920s, 10:00 = 36000s → diff = 7920
    expect(result?.secondsUntil).toBe(7920);
  });

  it("returns tomorrow fajr when all prayers have passed", () => {
    const now = new Date(2026, 0, 1, 22, 0, 0); // 10:00 PM
    const result = getNextPrayer(prayers, now, tomorrow);
    expect(result?.key).toBe("fajr");
    // now = 22*3600 = 79200s, midnight = 86400s, fajr = 4*3600+30*60 = 16200s
    // until midnight = 86400 - 79200 = 7200, + fajr = 23400
    expect(result?.secondsUntil).toBe(23400);
  });

  it("returns null when all prayers passed and no tomorrow", () => {
    const now = new Date(2026, 0, 1, 22, 0, 0);
    expect(getNextPrayer(prayers, now, null)).toBeNull();
  });
});
```

- [ ] **Step 4: Run tests — verify they fail**

```bash
cd apps/web && pnpm test
```

Expected: FAIL — `Cannot find module '@/lib/display-utils'`

- [ ] **Step 5: Create display-utils.ts**

Create `apps/web/src/lib/display-utils.ts`:
```ts
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export interface NextPrayer {
  key: string;
  label: string;
  secondsUntil: number;
}

export function getNextPrayer(
  prayers: Array<{ key: string; label: string; adhan: string }>,
  now: Date,
  tomorrow: { fajr: string } | null
): NextPrayer | null {
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  for (const prayer of prayers) {
    const [h, m] = prayer.adhan.split(":").map(Number);
    const prayerSeconds = h * 3600 + m * 60;
    if (prayerSeconds > nowSeconds) {
      return { key: prayer.key, label: prayer.label, secondsUntil: prayerSeconds - nowSeconds };
    }
  }

  if (tomorrow) {
    const [h, m] = tomorrow.fajr.split(":").map(Number);
    const fajrSeconds = h * 3600 + m * 60;
    const secondsUntilMidnight = 86400 - nowSeconds;
    return { key: "fajr", label: "Fajr", secondsUntil: secondsUntilMidnight + fajrSeconds };
  }

  return null;
}
```

- [ ] **Step 6: Run tests — verify they pass**

```bash
cd apps/web && pnpm test
```

Expected: PASS — all 8 tests green

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/vitest.config.ts apps/web/src/lib/display-utils.ts apps/web/src/lib/__tests__/display-utils.test.ts
git commit -m "feat(web): display utility functions + vitest setup"
```

---

### Task 2: Extend widget API with flash messages

**Files:**
- Modify: `apps/api/src/modules/prayer/prayer.repository.ts`
- Modify: `apps/api/src/modules/prayer/prayer.service.ts`

**Interfaces:**
- Consumes: Existing `getWidgetData(mosqueId)` in prayer.service.ts
- Produces: `getWidgetData` now returns `{ ..., flashMessages: { content: string }[] }`

- [ ] **Step 1: Add findFlashMessages to prayer.repository.ts**

In `apps/api/src/modules/prayer/prayer.repository.ts`, add at the end of the file:
```ts
export const findFlashMessages = (mosqueId: string) =>
  prisma.flashMessage.findMany({
    where: { mosqueId, enabled: true },
    select: { content: true },
    orderBy: { createdAt: "asc" },
  });
```

- [ ] **Step 2: Include flash messages in getWidgetData**

In `apps/api/src/modules/prayer/prayer.service.ts`, find the `getWidgetData` function (line 140). Change the imports line at the top — add `findFlashMessages` to the import from `./prayer.repository.js`:

The existing import is:
```ts
import * as repo from "./prayer.repository.js";
```
That's fine — `findFlashMessages` is already on `repo`. Now update the `getWidgetData` function body. After the `tomorrowResult` lines (around line 158), add:

```ts
  const flashMessages = await repo.findFlashMessages(mosqueId);
```

Then update the return object to include it:
```ts
  return {
    mosque: {
      id: mosque.id, slug: mosque.slug, name: mosque.name,
      timezone: mosque.timezone, config: mosque.config,
    },
    today: today ? { year, month, day, fajr: today.fajr, shuruq: today.shuruq, dhuhr: today.dhuhr, asr: today.asr, maghrib: today.maghrib, isha: today.isha } : null,
    tomorrow: tomorrow ? { year: tYear, month: tMonth, day: tDay, fajr: tomorrow.fajr, shuruq: tomorrow.shuruq, dhuhr: tomorrow.dhuhr, asr: tomorrow.asr, maghrib: tomorrow.maghrib, isha: tomorrow.isha } : null,
    flashMessages,
  };
```

- [ ] **Step 3: Verify API still starts**

```bash
cd apps/api && pnpm dev
```

Expected: Server starts with no TypeScript errors. Press Ctrl+C after confirming.

- [ ] **Step 4: Smoke test the widget endpoint**

With the API running:
```bash
curl http://localhost:4000/api/v1/mosques/al-azhar-galgamuwa/widget | jq '.data.flashMessages'
```

Expected: JSON array with 3 flash message objects (content strings).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/prayer/prayer.repository.ts apps/api/src/modules/prayer/prayer.service.ts
git commit -m "feat(api): include flash messages in widget response"
```

---

### Task 3: (display) layout + CSS animations

**Files:**
- Create: `apps/web/src/app/(display)/layout.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Produces: `(display)` route group with dark full-screen layout; `.marquee` and `.starfield` CSS classes available globally

- [ ] **Step 1: Create (display) layout**

Create `apps/web/src/app/(display)/layout.tsx`:
```tsx
export default function DisplayLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0f] text-white overflow-hidden antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Add marquee animation and starfield to globals.css**

In `apps/web/src/app/globals.css`, append at the end of the file:
```css
/* Display page: flash message ticker */
@keyframes marquee {
  0%   { transform: translateX(100vw); }
  100% { transform: translateX(-100%); }
}

.marquee {
  display: inline-block;
  animation: marquee 30s linear infinite;
}

/* Display page: starfield background */
.starfield {
  background-image:
    radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.6) 0%, transparent 100%),
    radial-gradient(1px 1px at 30% 70%, rgba(255,255,255,0.5) 0%, transparent 100%),
    radial-gradient(1px 1px at 50% 10%, rgba(255,255,255,0.7) 0%, transparent 100%),
    radial-gradient(1px 1px at 70% 50%, rgba(255,255,255,0.4) 0%, transparent 100%),
    radial-gradient(1px 1px at 85% 80%, rgba(255,255,255,0.6) 0%, transparent 100%),
    radial-gradient(1px 1px at 20% 90%, rgba(255,255,255,0.5) 0%, transparent 100%),
    radial-gradient(1px 1px at 60% 35%, rgba(255,255,255,0.3) 0%, transparent 100%),
    radial-gradient(1px 1px at 90% 15%, rgba(255,255,255,0.6) 0%, transparent 100%),
    radial-gradient(1px 1px at 45% 60%, rgba(255,255,255,0.4) 0%, transparent 100%),
    radial-gradient(1px 1px at 75% 25%, rgba(255,255,255,0.5) 0%, transparent 100%);
  background-color: #0a0a0f;
}
```

- [ ] **Step 3: Verify Next.js still compiles**

```bash
cd apps/web && pnpm build 2>&1 | tail -5
```

Expected: Build succeeds (or shows only pre-existing errors, not new ones).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(display)/layout.tsx apps/web/src/app/globals.css
git commit -m "feat(web): add (display) route group layout + marquee/starfield CSS"
```

---

### Task 4: Server component — /mosques/[slug] page

**Files:**
- Create: `apps/web/src/app/(display)/mosques/[slug]/page.tsx`

**Interfaces:**
- Consumes:
  - `GET /api/v1/mosques/:slug` → `{ id, slug, name, address, city, countryCode, latitude, longitude, timezone, status }`
  - `GET /api/v1/mosques/:id/widget` → `{ mosque: { id, slug, name, timezone, config }, today, tomorrow, flashMessages }`
- Produces: Renders `<DisplayClient mosque={...} widget={...} />`

- [ ] **Step 1: Create the server component**

Create `apps/web/src/app/(display)/mosques/[slug]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DisplayClient } from "./display-client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function getMosque(slug: string) {
  const res = await fetch(`${API}/mosques/${slug}`, { next: { revalidate: 300 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch mosque");
  const json = await res.json();
  return json.data;
}

async function getWidget(mosqueId: string) {
  const res = await fetch(`${API}/mosques/${mosqueId}/widget`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const mosque = await getMosque(slug);
  if (!mosque) return { title: "Mosque not found" };
  return { title: mosque.name };
}

export default async function MosqueDisplayPage({ params }: Props) {
  const { slug } = await params;
  const mosque = await getMosque(slug);
  if (!mosque) notFound();

  const widget = await getWidget(mosque.id);

  return <DisplayClient mosque={mosque} widget={widget} />;
}
```

- [ ] **Step 2: Verify TypeScript accepts the file**

```bash
cd apps/web && pnpm exec tsc --noEmit 2>&1 | grep "display"
```

Expected: No errors for the display files (DisplayClient import will error until Task 5 — that's expected).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(display)/mosques/[slug]/page.tsx
git commit -m "feat(web): display page server component"
```

---

### Task 5: DisplayClient — fullscreen live UI

**Files:**
- Create: `apps/web/src/app/(display)/mosques/[slug]/display-client.tsx`

**Interfaces:**
- Consumes:
  - `addMinutes(time, minutes)` from `@/lib/display-utils`
  - `formatCountdown(seconds)` from `@/lib/display-utils`
  - `getNextPrayer(prayers, now, tomorrow)` from `@/lib/display-utils`
  - `mosque` prop: `{ id, name, latitude, longitude, timezone, status }`
  - `widget` prop: `{ mosque: { config: { iqama, jumua } }, today, tomorrow, flashMessages }`
- Produces: Fullscreen dark display component

- [ ] **Step 1: Create display-client.tsx**

Create `apps/web/src/app/(display)/mosques/[slug]/display-client.tsx`:
```tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { addMinutes, formatCountdown, getNextPrayer, type NextPrayer } from "@/lib/display-utils";

interface PrayerDay {
  year: number; month: number; day: number;
  fajr: string; shuruq: string; dhuhr: string; asr: string; maghrib: string; isha: string;
}

interface WidgetData {
  mosque: {
    id: string; slug: string; name: string; timezone: string;
    config?: {
      iqama?: { fajr?: number; dhuhr?: number; asr?: number; maghrib?: number; isha?: number };
      jumua?: { time1?: string; time2?: string; jumua2Enabled?: boolean };
    };
  };
  today: PrayerDay | null;
  tomorrow: PrayerDay | null;
  flashMessages?: { content: string }[];
}

interface MosqueData {
  id: string; name: string; latitude: number; longitude: number; status: string;
}

interface Props { mosque: MosqueData; widget: WidgetData | null }

const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const PRAYER_LABELS: Record<string, string> = {
  fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha",
};
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function DisplayClient({ mosque, widget: initialWidget }: Props) {
  const [widget, setWidget] = useState<WidgetData | null>(initialWidget);
  const [now, setNow] = useState(new Date());
  const [temperature, setTemperature] = useState<number | null>(null);

  // 1-second clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Temperature polling — every 5 minutes
  const fetchTemp = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${mosque.latitude}&longitude=${mosque.longitude}&current=temperature_2m&temperature_unit=celsius`
      );
      const json = await res.json();
      setTemperature(Math.round(json.current.temperature_2m));
    } catch {}
  }, [mosque.latitude, mosque.longitude]);

  useEffect(() => {
    fetchTemp();
    const id = setInterval(fetchTemp, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchTemp]);

  // Prayer data refresh — every 10 minutes (handles midnight rollover)
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`${API}/mosques/${mosque.id}/widget`);
        if (res.ok) {
          const json = await res.json();
          setWidget(json.data);
        }
      } catch {}
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [mosque.id]);

  // Derived values
  const today = widget?.today ?? null;
  const iqama = widget?.mosque.config?.iqama ?? {};
  const jumua = widget?.mosque.config?.jumua;
  const flashMessages = widget?.flashMessages ?? [];

  const hijriDate = new Intl.DateTimeFormat("en-TN-u-ca-islamic-umalqura", {
    day: "numeric", month: "long", year: "numeric",
  }).format(now);

  const clockHMS = now.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });

  const prayers = today
    ? PRAYER_KEYS.map((key) => ({
        key,
        label: PRAYER_LABELS[key],
        adhan: today[key],
        iqamaTime: addMinutes(today[key], (iqama as Record<string, number>)[key] ?? 0),
      }))
    : [];

  const tomorrowFajr = widget?.tomorrow ? { fajr: widget.tomorrow.fajr } : null;
  const nextPrayer: NextPrayer | null = today
    ? getNextPrayer(prayers.map((p) => ({ key: p.key, label: p.label, adhan: p.adhan })), now, tomorrowFajr)
    : null;

  const countdown = nextPrayer ? formatCountdown(nextPrayer.secondsUntil) : null;
  const flashText = flashMessages.length > 0
    ? flashMessages.map((m) => m.content).join("   ·   ")
    : null;

  return (
    <div className="starfield relative h-screen w-screen overflow-hidden text-white flex flex-col select-none">

      {/* ── Top bar: online · mosque name · temperature ── */}
      <div className="flex items-center justify-between px-6 pt-5 shrink-0">
        <div className="flex items-center gap-2 w-32">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 uppercase tracking-widest font-medium">Online</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-wider uppercase text-center flex-1 px-4 leading-tight">
          {mosque.name}
        </h1>
        <div className="text-orange-400 font-bold text-xl w-32 text-right">
          {temperature !== null ? `${temperature}°C` : "--°C"}
        </div>
      </div>

      {/* ── Middle row: Shuruq | Clock+Hijri | Jumua ── */}
      <div className="flex items-center justify-between px-8 flex-1 min-h-0">

        {/* Shuruq */}
        <div className="text-center w-44">
          <p className="text-base text-gray-400 mb-2 tracking-wide">Shurûq</p>
          <p className="text-4xl font-bold tabular-nums">{today?.shuruq ?? "--:--"}</p>
        </div>

        {/* Center: clock + Hijri + countdown */}
        <div className="flex flex-col items-center gap-4">
          <div className="bg-purple-900/80 border border-purple-700/50 rounded-2xl px-12 py-6 text-center shadow-2xl shadow-purple-900/60 backdrop-blur-sm">
            <div className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tight">{clockHMS}</div>
            <div className="text-purple-200 mt-3 text-base tracking-wide">{hijriDate}</div>
          </div>
          {nextPrayer && countdown && (
            <div className="text-center text-base text-gray-300 tracking-wide">
              <span className="mr-2">🕌</span>
              <span className="font-semibold text-white">{nextPrayer.label}</span>
              <span className="text-gray-400"> in </span>
              <span className="font-bold text-yellow-300 tabular-nums">{countdown}</span>
              <span className="ml-2">🕌</span>
            </div>
          )}
        </div>

        {/* Jumua */}
        <div className="text-center w-44">
          <p className="text-base text-gray-400 mb-2 tracking-wide">Jumua</p>
          <p className="text-4xl font-bold tabular-nums">{jumua?.time1 ?? "--:--"}</p>
          {jumua?.jumua2Enabled && jumua.time2 && (
            <p className="text-2xl font-semibold text-gray-300 tabular-nums mt-1">{jumua.time2}</p>
          )}
        </div>
      </div>

      {/* ── Prayer columns: Fajr Dhuhr Asr Maghrib Isha ── */}
      <div className="flex justify-around items-end px-6 pb-6 shrink-0">
        {prayers.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No prayer schedule available</p>
        ) : (
          prayers.map(({ key, label, adhan, iqamaTime }) => {
            const isNext = nextPrayer?.key === key;
            return (
              <div
                key={key}
                className={`flex flex-col items-center rounded-xl px-6 py-4 min-w-[110px] transition-all duration-500 ${
                  isNext
                    ? "bg-purple-900/90 border border-purple-600/60 shadow-lg shadow-purple-900/50"
                    : "bg-transparent"
                }`}
              >
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">{label}</p>
                <p className="text-2xl font-bold tabular-nums">{adhan}</p>
                <p className="text-base text-gray-300 tabular-nums mt-1">{iqamaTime}</p>
              </div>
            );
          })
        )}
      </div>

      {/* ── Flash message ticker ── */}
      {flashText && (
        <div className="bg-black/50 border-t border-white/10 h-9 overflow-hidden shrink-0 flex items-center">
          <span className="marquee text-sm text-gray-300 px-4 whitespace-nowrap">
            {flashText}
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd apps/web && pnpm exec tsc --noEmit 2>&1
```

Expected: No errors for the new display files.

- [ ] **Step 3: Run tests to confirm nothing broken**

```bash
cd apps/web && pnpm test
```

Expected: All 8 tests still pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(display)/mosques/[slug]/display-client.tsx
git commit -m "feat(web): mosque fullscreen display client component"
```

---

### Task 6: Cleanup + final verification

**Files:**
- Delete: `apps/web/src/app/(public)/mosques/[slug]/page.tsx`
- Delete: `apps/web/src/components/mosque/prayer-times-widget.tsx`

- [ ] **Step 1: Delete old files**

```bash
rm apps/web/src/app/(public)/mosques/[slug]/page.tsx
rm apps/web/src/components/mosque/prayer-times-widget.tsx
```

- [ ] **Step 2: TypeScript check — confirm no dangling imports**

```bash
cd apps/web && pnpm exec tsc --noEmit 2>&1
```

Expected: No errors. If `prayer-times-widget` was imported anywhere else, fix those imports now (search with `grep -r "prayer-times-widget" apps/web/src`).

- [ ] **Step 3: Run full test suite**

```bash
cd apps/web && pnpm test
```

Expected: All 8 tests pass.

- [ ] **Step 4: Manual smoke test**

1. Ensure the API is running: `pnpm --filter @mawaqit/api dev`
2. Ensure the web is running: `pnpm --filter @mawaqit/web dev`
3. Open `http://localhost:3000/mosques/al-azhar-galgamuwa` in a browser
4. Confirm:
   - Page is fullscreen dark with no navbar
   - Mosque name shown at top
   - Live clock ticking (seconds updating)
   - Hijri date shown below clock
   - 5 prayer columns visible with adhan + iqama times
   - The current/next prayer column has a purple highlight box
   - Countdown text shows correctly (e.g. "Fajr in 06:11")
   - Temperature shown at top-right (may show `--°C` briefly then update)
   - Flash messages scrolling at the bottom
   - Shuruq time shown top-left
   - Jumua time shown top-right

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): mosque public display page — fullscreen TV adhan clock"
```
