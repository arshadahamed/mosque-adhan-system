# Dashboard Redesign — Design Spec
**Date:** 2026-06-26  
**Status:** Approved  

---

## Overview

Full visual redesign of the Mawaqit admin dashboard. All five page types are in scope. No API, schema, or data-fetching logic changes — this is a pure UI/UX overhaul.

**Design direction:** Clean SaaS (Linear / Vercel aesthetic). Light sidebar, restrained purple accent, zinc neutrals, white cards on a zinc-50 background.

---

## Decisions Made

| Decision | Choice |
|---|---|
| Navigation structure | Sidebar only — no topbar |
| Sidebar style | Light (white, `border-r border-zinc-200`) |
| Icon library | Lucide React (`pnpm add lucide-react` in `apps/web`) |
| Scope | All pages: Overview, Mosques list, Mosque hub, Config, Profile |

---

## Color Tokens

| Token | Value | Usage |
|---|---|---|
| Primary | `#6200ea` / `violet-700` | Buttons, active nav border, links |
| Active nav bg | `violet-50` | Active sidebar item background |
| Active nav text | `violet-700` | Active sidebar item text |
| Background | `zinc-50` | Content area |
| Surface | `white` | Cards, sidebar |
| Border | `zinc-200` | Card and sidebar borders |
| Text primary | `zinc-900` | Headings, strong values |
| Text secondary | `zinc-500` | Labels, descriptions, muted |
| Text tertiary | `zinc-400` | Icons, uppercase section labels |
| Online badge | `emerald-50` bg / `emerald-700` text | Status pill |
| Offline badge | `zinc-100` bg / `zinc-500` text | Status pill |
| Error | `red-50` bg / `red-700` text | Validation, delete |
| Success | `emerald-50` bg / `emerald-700` text | Save confirmation |

---

## Shell & Layout

### Sidebar (240px fixed, light)

```
┌─────────────────────┐
│  [■] MAWAQIT        │  ← Logo zone (h-16, border-b border-zinc-100)
├─────────────────────┤
│  MAIN               │  ← Section label (text-xs uppercase zinc-400)
│  ⊞ Overview         │  ← Nav item (active: violet-50 bg, 3px violet left border)
│  🏛 Mosques          │
├─────────────────────┤
│  ACCOUNT            │
│  👤 Profile          │
│                     │
│  (flex-1 spacer)    │
├─────────────────────┤
│  [AA] user@email    │  ← User row (border-t zinc-100, LogOut icon button)
└─────────────────────┘
```

- **Logo:** `Building2` icon in a `w-7 h-7 rounded bg-violet-600 text-white` square, "MAWAQIT" in `text-xs font-bold tracking-widest text-zinc-900`
- **Nav items:** `flex items-center gap-3 px-3 py-2 rounded-lg mx-2 text-sm text-zinc-600 hover:bg-zinc-100 transition-colors`
- **Active nav item:** adds `bg-violet-50 text-violet-700 font-semibold border-l-[3px] border-violet-600 rounded-l-none pl-[calc(0.75rem-3px)]`
- **Section labels:** `text-xs font-semibold uppercase tracking-wider text-zinc-400 px-5 py-2 mt-3`
- **User row:** avatar circle `w-8 h-8 rounded-full bg-violet-100 text-violet-700 text-xs font-bold`, email truncated `text-xs text-zinc-500 max-w-[120px] truncate`, `LogOut` icon button `text-zinc-400 hover:text-red-500`

### Responsive Sidebar Behavior

- **≥ lg (1024px):** Full sidebar, 240px, always visible
- **md–lg (768–1023px):** Collapsed to 56px icon-only rail; nav labels hidden, icons centered with tooltips
- **< md (768px):** Sidebar hidden; slim 48px topbar shows `Building2` logo and `Menu` button; tap opens full-width slide-over drawer overlay

### Content Area

- `flex-1 overflow-y-auto bg-zinc-50`
- Inner padding: `px-6 py-6 lg:px-8`
- Max content width: `max-w-[1280px] mx-auto`
- Each page starts with a **page header block**: title (`text-2xl font-semibold text-zinc-900`) + optional subtitle (`text-sm text-zinc-500 mt-0.5`) + optional right-side actions — all in one `flex items-start justify-between mb-6`

### File Changes to Shell

- `apps/web/src/app/(dashboard)/layout.tsx` — replace `<AuthGuard><Navbar/>...` with `<AuthGuard><DashboardShell>...</DashboardShell></AuthGuard>`
- `apps/web/src/components/layout/sidebar.tsx` — **new file**, full sidebar implementation
- `apps/web/src/components/layout/navbar.tsx` — **deleted** (fully replaced by sidebar)

---

## Page Designs

### 1. Overview (`/dashboard`)

**Page header:** "Overview" + current date (`text-sm text-zinc-400`, e.g. "Thursday, 26 June 2026")

**Stats row:** `grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6`

Each stat card: `bg-white rounded-xl border border-zinc-200 shadow-sm p-5 flex items-center gap-4`
- Left: `w-11 h-11 rounded-xl flex items-center justify-center` tinted square — `bg-violet-50 text-violet-600` (Mosques), `bg-emerald-50 text-emerald-600` (Online), `bg-blue-50 text-blue-600` (Schedules). Lucide icon `size={22}`.
- Right: `text-2xl font-bold text-zinc-900` number, `text-sm text-zinc-500` label.

**Quick Actions:** `flex gap-3 mb-6`. "+ Add Mosque" filled violet button with `Plus` icon. "Manage Mosques" outline button.

**Recent Mosques card:** `bg-white rounded-xl border border-zinc-200`
- Header: `px-5 py-4 border-b border-zinc-100 flex justify-between` — `text-sm font-semibold text-zinc-700` "Recent Mosques" + "View all →" link
- Rows: `divide-y divide-zinc-100`. Each row `px-5 py-3 flex items-center gap-3 hover:bg-zinc-50`
  - `Building2` icon `text-zinc-400 shrink-0`
  - Name `text-sm font-medium text-zinc-900` + city/country `text-xs text-zinc-500`
  - Status pill (push right with `ml-auto`)
  - "Manage →" `text-xs font-medium text-violet-600 hover:underline ml-3`
- Shows up to 5 mosques; empty state hidden if no mosques

---

### 2. Mosques List (`/dashboard/mosques`)

**Page header:** "Mosques" + count badge `bg-zinc-100 text-zinc-600 text-xs font-medium px-2 py-0.5 rounded-full` + right side: "Add Mosque" violet button (`Plus` icon) + "Retrieve Access" ghost button (`KeyRound` icon)

**Grid:** `grid grid-cols-1 lg:grid-cols-2 gap-4`

**Mosque card:** `bg-white rounded-xl border border-zinc-200 shadow-sm p-5 hover:shadow-md transition-shadow`

Card layout — two rows:
- **Top row:** Status pill `inline-flex` + `text-base font-semibold text-zinc-900` name
- **Meta rows:** `space-y-1 mt-2 mb-4`
  - Address: `MapPin size={14} text-zinc-400` + `text-sm text-zinc-500`
  - Email: `Mail size={14} text-zinc-400` + `text-sm text-violet-600 hover:underline`
  - ID: `Hash size={14} text-zinc-400` + `text-xs text-zinc-400 font-mono`
  - Dates: `Clock size={14} text-zinc-400` + `text-xs text-zinc-400` (created / updated)
- **Bottom row (actions):** `flex items-center gap-1 pt-3 border-t border-zinc-100`
  - "Details" outline button `text-xs` — links to mosque hub
  - Separator `w-px h-4 bg-zinc-200`
  - Icon buttons (each `p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors`): `Pencil` (edit), `Settings` (config), `Clock` (prayer times), `Megaphone` (announcements), `Users` (staff)
  - `Trash2` icon button pushed right with `ml-auto text-zinc-400 hover:text-red-500 hover:bg-red-50`

**Empty state:** `flex flex-col items-center justify-center py-16 text-center`. `Building2` `size={40}` in `w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 mx-auto mb-4`. "No mosques yet" `text-base font-semibold text-zinc-900`. Sub-text. "+ Add your first mosque" violet button.

**Skeleton loading:** 4 skeleton cards (`bg-zinc-200 animate-pulse rounded-xl h-40`) in the same 2-column grid.

---

### 3. Mosque Hub (`/dashboard/mosques/[id]`)

**Breadcrumb:** `text-sm flex items-center gap-1.5 text-zinc-400 mb-3`. `Mosques` link + `ChevronRight size={14}` + mosque name `text-zinc-700 font-medium`

**Page header:** `Building2` in violet square + name `text-2xl font-semibold` + status pill. Right side: "View Display" `ExternalLink` outline button + "Edit" ghost button.

**Info strip:** `bg-white rounded-xl border border-zinc-200 p-4 mb-6 grid grid-cols-3 gap-4`. Each column: `text-xs uppercase tracking-wide text-zinc-400 font-semibold mb-0.5` label + `text-sm text-zinc-700` value. Hidden when field is null.

**Action grid:** `grid grid-cols-2 lg:grid-cols-3 gap-4`

Each action card: `bg-white rounded-xl border border-zinc-200 p-5 hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer group`
- Icon container: `w-10 h-10 rounded-xl flex items-center justify-center mb-3` with unique tint per action
- Name: `text-sm font-semibold text-zinc-900 group-hover:text-violet-700 transition-colors`
- Description: `text-xs text-zinc-500 mt-1 leading-relaxed`
- "Open →": `text-xs font-medium mt-3` in action's accent color

Action icon/color mapping:
| Action | Icon | Container bg |
|---|---|---|
| Announcements & Flash | `Megaphone` | `bg-violet-50 text-violet-600` |
| Events | `Calendar` | `bg-teal-50 text-teal-600` |
| Timetable | `Clock` | `bg-blue-50 text-blue-600` |
| Configure | `Settings` | `bg-amber-50 text-amber-600` |
| Edit Details | `Pencil` | `bg-emerald-50 text-emerald-600` |
| Public Display | `Monitor` | `bg-violet-50 text-violet-600` |

---

### 4. Config Page (`/dashboard/mosques/[id]/config`)

**Breadcrumb:** `Mosques / [name] / Configuration`

**Sticky save bar:** `sticky top-0 z-20 bg-white border-b border-zinc-200 px-0 py-3 mb-4 flex items-center justify-between`
- Left: `text-base font-semibold text-zinc-900` "Prayer Times Configuration" + `text-xs text-zinc-400 ml-3` "* Required"
- Right: Save/Cancel buttons + status indicator (`CheckCircle size={16} text-emerald-600` "Saved" / `AlertCircle size={16} text-red-500` message)

**Accordion sections:** Each `bg-white rounded-xl border border-zinc-200 mb-3 overflow-hidden`
- Header: `flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-zinc-50 transition-colors`. Title `text-sm font-semibold text-zinc-800`. Indicator `ChevronDown`/`ChevronUp size={16} text-zinc-400`
- Body: `px-5 pb-5 border-t border-zinc-100`

**Form element restyling:**
- Labels: `text-sm font-medium text-zinc-700 mb-1 block`
- Selects + inputs: `rounded-lg border-zinc-200 bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm h-10`
- `YesNoToggle` → pill switch: `w-10 h-6 rounded-full transition-colors` (`bg-violet-600` when on, `bg-zinc-200` when off) with `w-5 h-5 bg-white rounded-full shadow-sm translate-x-0/translate-x-4` thumb
- Radio inputs → styled radio pills: `flex gap-2`. Each option `px-3 py-1.5 rounded-lg border text-sm cursor-pointer` (selected: `border-violet-500 bg-violet-50 text-violet-700`)
- Wallpaper grid: `grid-cols-4 lg:grid-cols-6 gap-2`

**Save/Cancel:** Now in sticky bar at top. Bottom save bar removed.

---

### 5. Profile (`/dashboard/profile`)

**Page header:** "Profile" + subtitle "Manage your account details and security."

**Account card:** `bg-white rounded-xl border border-zinc-200 p-6 mb-4`
- Top: avatar circle `w-16 h-16 rounded-full bg-violet-100 text-violet-700 text-xl font-bold` (initials from email), right of it: email `text-base font-semibold text-zinc-900`, role badge `text-xs font-medium px-2 py-0.5 rounded-full` (`SUPER_ADMIN` → `bg-violet-100 text-violet-700`)
- Below (separated by `mt-4 pt-4 border-t border-zinc-100`): two rows `flex justify-between py-2` — "Email" / "Role" labels `text-sm text-zinc-500` + values `text-sm font-medium text-zinc-900`

**Change Password card:** `bg-white rounded-xl border border-zinc-200 p-6 max-w-lg`
- Header: `flex items-center gap-2 mb-4` — `Lock size={16} text-zinc-500` + `text-base font-semibold text-zinc-900` "Change Password"
- Form fields with restyled inputs (same as config)
- Success/Error: `flex items-center gap-2 p-3 rounded-lg border text-sm` — emerald tones for success, red for error, with `CheckCircle`/`AlertCircle` icon
- "Update Password" violet button

---

## New & Deleted Files

| Action | Path |
|---|---|
| NEW | `apps/web/src/components/layout/sidebar.tsx` |
| NEW | `apps/web/src/components/ui/skeleton.tsx` |
| MODIFY | `apps/web/src/app/(dashboard)/layout.tsx` |
| MODIFY | `apps/web/src/app/(dashboard)/dashboard/page.tsx` |
| MODIFY | `apps/web/src/app/(dashboard)/dashboard/mosques/page.tsx` |
| MODIFY | `apps/web/src/app/(dashboard)/dashboard/mosques/[id]/page.tsx` |
| MODIFY | `apps/web/src/app/(dashboard)/dashboard/mosques/[id]/config/page.tsx` |
| MODIFY | `apps/web/src/app/(dashboard)/dashboard/profile/page.tsx` |
| MODIFY | `apps/web/src/components/ui/toggle.tsx` |
| MODIFY | `apps/web/src/components/ui/accordion.tsx` |
| DELETE | `apps/web/src/components/layout/navbar.tsx` |

---

## Dependencies

```bash
pnpm --filter apps/web add lucide-react
```

No other new dependencies. Framer Motion is already in `package.json` but is NOT used — CSS transitions are sufficient.

---

## Out of Scope

- Announcements, Events, Prayer Times, Flash Messages, Staff pages — these inherit the new shell automatically but their inner content is not restyled in this spec
- Any API, auth, or data-fetching changes
- Dark mode
- i18n / RTL layout

---

## Accessibility

- All icon-only buttons have `aria-label`
- Sidebar nav uses `<nav aria-label="Main navigation">` with `aria-current="page"` on active item
- Color is never the sole indicator of state (status pill has text label, not just color)
- Focus rings preserved on all interactive elements (`focus-visible:ring-2 focus-visible:ring-violet-500`)
