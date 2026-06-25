# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current emoji-heavy, top-nav-only dashboard with a clean SaaS-style layout using a fixed light sidebar, Lucide icons, and fully redesigned page content across all five dashboard pages.

**Architecture:** A new `DashboardShell` client component in `sidebar.tsx` replaces the `Navbar` and wraps all dashboard content. The `(dashboard)/layout.tsx` remains a server component that imports `DashboardShell`. Each dashboard page is rewritten in full — no logic changes, visuals only.

**Tech Stack:** Next.js 16 App Router, Tailwind v4, Lucide React (already installed `^1.21.0`), Zustand, TanStack Query v5, TypeScript.

## Global Constraints

- Tailwind v4 syntax: `bg-linear-to-*` not `bg-gradient-to-*`; arbitrary values are valid; no `asChild`
- `lucide-react` is already in `package.json` — do NOT run install
- Next.js 16: `params` is a Promise — always `use(params)` or `await params`
- All dashboard pages are `"use client"` — `DashboardShell` and `AuthGuard` are client components
- `buttonVariants` in `apps/web/src/components/ui/button.tsx` uses `bg-primary` (CSS var `#6200ea`) — use it for default buttons; use explicit `bg-violet-600` for new button markup that bypasses the component
- No API changes, no schema changes, no auth logic changes
- TypeScript check command: `pnpm --filter @mawaqit/web exec tsc --noEmit`
- Dev server: `pnpm --filter @mawaqit/web dev` (runs on `http://localhost:3000`)

---

## File Map

| Action | File |
|---|---|
| **NEW** | `apps/web/src/components/ui/skeleton.tsx` |
| **MODIFY** | `apps/web/src/components/ui/toggle.tsx` |
| **MODIFY** | `apps/web/src/components/ui/accordion.tsx` |
| **NEW** | `apps/web/src/components/layout/sidebar.tsx` |
| **MODIFY** | `apps/web/src/app/(dashboard)/layout.tsx` |
| **DELETE** | `apps/web/src/components/layout/navbar.tsx` |
| **MODIFY** | `apps/web/src/app/(dashboard)/dashboard/page.tsx` |
| **MODIFY** | `apps/web/src/app/(dashboard)/dashboard/mosques/page.tsx` |
| **MODIFY** | `apps/web/src/app/(dashboard)/dashboard/mosques/[id]/page.tsx` |
| **MODIFY** | `apps/web/src/app/(dashboard)/dashboard/mosques/[id]/config/page.tsx` |
| **MODIFY** | `apps/web/src/app/(dashboard)/dashboard/profile/page.tsx` |

---

### Task 1: Shared UI components — Skeleton, Toggle (pill switch), Accordion

**Files:**
- Create: `apps/web/src/components/ui/skeleton.tsx`
- Modify: `apps/web/src/components/ui/toggle.tsx`
- Modify: `apps/web/src/components/ui/accordion.tsx`

**Interfaces:**
- Produces: `Skeleton` (`className` prop), `YesNoToggle` (same API: `value`, `onChange`, `readOnly`), `ToggleField` (same API), `AccordionSection` (same API: `title`, `defaultOpen`, `children`, `required`)

- [ ] **Step 1: Create Skeleton component**

Write `apps/web/src/components/ui/skeleton.tsx`:

```tsx
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-zinc-200", className)}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Replace toggle.tsx with pill switch design**

Write the entire file `apps/web/src/components/ui/toggle.tsx`:

```tsx
"use client";

interface YesNoToggleProps {
  value: boolean;
  onChange?: (v: boolean) => void;
  readOnly?: boolean;
}

export function YesNoToggle({ value, onChange, readOnly = false }: YesNoToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={readOnly}
      onClick={() => !readOnly && onChange?.(!value)}
      className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-default ${
        value ? "bg-violet-600" : "bg-zinc-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          value ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

interface ToggleFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function ToggleField({ label, description, checked, onChange }: ToggleFieldProps) {
  return (
    <div className="flex items-start gap-3">
      <YesNoToggle value={checked} onChange={onChange} />
      <div>
        <p className="text-sm font-medium text-zinc-700">{label}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace accordion.tsx with card-style design**

Write the entire file `apps/web/src/components/ui/accordion.tsx`:

```tsx
"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionSectionProps {
  title: string;
  required?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function AccordionSection({ title, required, defaultOpen = false, children }: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
      >
        <span className="text-sm font-semibold text-zinc-800">
          {title}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
        <ChevronDown
          size={16}
          className={cn("text-zinc-400 transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-zinc-100">
          {children}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: TypeScript check**

```bash
pnpm --filter @mawaqit/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/skeleton.tsx apps/web/src/components/ui/toggle.tsx apps/web/src/components/ui/accordion.tsx
git commit -m "feat(web): redesign skeleton, toggle pill switch, accordion card style"
```

---

### Task 2: DashboardShell — fixed light sidebar

**Files:**
- Create: `apps/web/src/components/layout/sidebar.tsx`

**Interfaces:**
- Consumes: `useAuthStore` (fields: `user`, `clear`), `api` from `@/lib/api`, `cn` from `@/lib/utils`
- Produces: `DashboardShell({ children: React.ReactNode })` — renders full sidebar + content layout

- [ ] **Step 1: Create sidebar.tsx**

Write `apps/web/src/components/layout/sidebar.tsx`:

```tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2, LayoutDashboard, User, LogOut, Menu, X, ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV_MAIN = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Mosques", href: "/dashboard/mosques", icon: Building2 },
];

const NAV_ACCOUNT = [
  { label: "Profile", href: "/dashboard/profile", icon: User },
];

function NavItem({
  href, icon: Icon, label, collapsed,
}: {
  href: string; icon: React.ElementType; label: string; collapsed?: boolean;
}) {
  const pathname = usePathname();
  const isActive = href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(href);

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 py-2 rounded-lg mx-2 text-sm transition-colors",
        collapsed ? "justify-center px-2 mx-1" : "px-3",
        isActive
          ? "bg-violet-50 text-violet-700 font-semibold border-l-[3px] border-violet-600 rounded-l-none"
          : "text-zinc-600 hover:bg-zinc-100"
      )}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function SidebarContent({
  collapsed, onClose,
}: {
  collapsed?: boolean; onClose?: () => void;
}) {
  const { user, accessToken, setAuth, clear } = useAuthStore();
  const router = useRouter();

  // Silently refresh the access token on mount when user is present but token is gone (page reload)
  useEffect(() => {
    if (user && !accessToken) {
      api.post("/auth/refresh")
        .then(({ data }) => setAuth(user, data.data.accessToken))
        .catch(() => { clear(); router.push("/login"); });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "??";

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } catch { /* best-effort */ }
    clear();
    router.push("/login");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo zone */}
      <div
        className={cn(
          "flex items-center gap-2.5 h-16 px-4 border-b border-zinc-100 shrink-0",
          collapsed && "justify-center px-2"
        )}
      >
        {onClose && (
          <button
            onClick={onClose}
            className="mr-1 p-1 rounded hover:bg-zinc-100 text-zinc-500"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        )}
        <div className="w-7 h-7 rounded bg-violet-600 flex items-center justify-center shrink-0">
          <Building2 size={14} className="text-white" />
        </div>
        {!collapsed && (
          <span className="text-xs font-bold tracking-widest text-zinc-900 uppercase">
            Mawaqit
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex-1 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-5 pb-1">
            Main
          </p>
        )}
        {NAV_MAIN.map((item) => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}

        <div className="mt-4">
          {!collapsed && (
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-5 pb-1 pt-2">
              Account
            </p>
          )}
          {NAV_ACCOUNT.map((item) => (
            <NavItem key={item.href} {...item} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      {/* User row */}
      <div
        className={cn(
          "border-t border-zinc-100 p-3 flex items-center gap-2 shrink-0",
          collapsed && "justify-center"
        )}
      >
        <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0">
          {initials}
        </div>
        {!collapsed && (
          <span className="text-xs text-zinc-500 flex-1 truncate max-w-[120px]">
            {user?.email}
          </span>
        )}
        <button
          onClick={handleLogout}
          aria-label="Log out"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-zinc-50">
      {/* Full sidebar — lg+ */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-zinc-200 shrink-0">
        <SidebarContent />
      </aside>

      {/* Icon-only rail — md to lg */}
      <aside className="hidden md:flex lg:hidden flex-col w-14 bg-white border-r border-zinc-200 shrink-0">
        <SidebarContent collapsed />
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Content column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 h-12 px-4 bg-white border-b border-zinc-200 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100"
          >
            <Menu size={20} />
          </button>
          <div className="w-6 h-6 rounded bg-violet-600 flex items-center justify-center">
            <Building2 size={12} className="text-white" />
          </div>
          <span className="text-xs font-bold tracking-widest text-zinc-900 uppercase">
            Mawaqit
          </span>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 lg:px-8 max-w-[1280px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
pnpm --filter @mawaqit/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/sidebar.tsx
git commit -m "feat(web): DashboardShell — fixed light sidebar with responsive rail and mobile drawer"
```

---

### Task 3: Wire layout — replace Navbar with DashboardShell

**Files:**
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`
- Delete: `apps/web/src/components/layout/navbar.tsx`

**Interfaces:**
- Consumes: `DashboardShell` from `@/components/layout/sidebar`, `AuthGuard` from `@/components/auth/auth-guard`

- [ ] **Step 1: Rewrite layout.tsx**

Write the entire file `apps/web/src/app/(dashboard)/layout.tsx`:

```tsx
import { DashboardShell } from "@/components/layout/sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
```

- [ ] **Step 2: Delete navbar.tsx**

```bash
git rm apps/web/src/components/layout/navbar.tsx
```

- [ ] **Step 3: TypeScript check**

```bash
pnpm --filter @mawaqit/web exec tsc --noEmit
```

Expected: no errors. If you see "Cannot find module navbar", the `git rm` worked correctly and there are no remaining imports.

- [ ] **Step 4: Start dev server and verify**

```bash
pnpm --filter @mawaqit/web dev
```

Open `http://localhost:3000/dashboard`. Expected:
- Light sidebar visible on left with "MAWAQIT" wordmark
- "Overview" and "Mosques" nav items in sidebar
- No top navbar visible
- Content area has `bg-zinc-50` background
- Clicking "Log out" in sidebar bottom row redirects to `/login`
- Unauthenticated visit to `/dashboard` redirects to `/login`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(dashboard)/layout.tsx
git commit -m "feat(web): wire DashboardShell into layout, remove old Navbar"
```

---

### Task 4: Overview page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `Skeleton` from `@/components/ui/skeleton`
- Produces: redesigned overview with stat cards, quick actions, recent mosques list

- [ ] **Step 1: Rewrite dashboard/page.tsx**

Write the entire file `apps/web/src/app/(dashboard)/dashboard/page.tsx`:

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Building2, Wifi, Clock, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function StatusPill({ status }: { status: string }) {
  const online = status === "ONLINE";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full",
        online ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", online ? "bg-emerald-500" : "bg-zinc-400")} />
      {online ? "Online" : "Offline"}
    </span>
  );
}

export default function DashboardPage() {
  const { accessToken } = useAuthStore();

  const { data: mosquesData, isLoading } = useQuery({
    queryKey: ["dashboard-mosques"],
    queryFn: async () => {
      const res = await api.get("/mosques", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.data.data as any[];
    },
    enabled: !!accessToken,
  });

  const total = mosquesData?.length ?? 0;
  const online = mosquesData?.filter((m: any) => m.status === "ONLINE").length ?? 0;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const STATS = [
    { label: "Total Mosques", value: total, icon: Building2, iconBg: "bg-violet-50 text-violet-600" },
    { label: "Online", value: online, icon: Wifi, iconBg: "bg-emerald-50 text-emerald-600" },
    { label: "Prayer Schedules", value: total, icon: Clock, iconBg: "bg-blue-50 text-blue-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Overview</h1>
        <p className="text-sm text-zinc-400 mt-0.5">{today}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 flex items-center gap-4"
          >
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", stat.iconBg)}>
              <stat.icon size={22} />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-8 w-10 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-zinc-900">{stat.value}</p>
              )}
              <p className="text-sm text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link href="/dashboard/mosques/new" className={cn(buttonVariants(), "gap-1.5")}>
          <Plus size={16} /> Add Mosque
        </Link>
        <Link href="/dashboard/mosques" className={cn(buttonVariants({ variant: "outline" }))}>
          Manage Mosques
        </Link>
      </div>

      {/* Recent mosques */}
      {(isLoading || (mosquesData && mosquesData.length > 0)) && (
        <div className="bg-white rounded-xl border border-zinc-200">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-700">Recent Mosques</span>
            <Link href="/dashboard/mosques" className="text-xs font-medium text-violet-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-16 ml-auto rounded-full" />
                </div>
              ))
            ) : (
              mosquesData!.slice(0, 5).map((m: any) => (
                <div
                  key={m.id}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-zinc-50 transition-colors"
                >
                  <Building2 size={16} className="text-zinc-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 truncate">{m.name}</p>
                    <p className="text-xs text-zinc-500">{m.city}, {m.countryCode}</p>
                  </div>
                  <StatusPill status={m.status} />
                  <Link
                    href={`/dashboard/mosques/${m.id}`}
                    className="text-xs font-medium text-violet-600 hover:underline ml-1 shrink-0"
                  >
                    Manage →
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
pnpm --filter @mawaqit/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000/dashboard`. Expected:
- Page title "Overview" with today's date below
- Three stat cards with coloured icon squares (violet/emerald/blue)
- Skeleton pulses during load, replaced by numbers once data loads
- "+ Add Mosque" and "Manage Mosques" buttons
- "Recent Mosques" card with mosque rows, status pills, "Manage →" links

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat(web): redesign overview page — stat cards, skeleton loading, recent mosques"
```

---

### Task 5: Mosques list page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/mosques/page.tsx`

**Interfaces:**
- Consumes: `Skeleton` from `@/components/ui/skeleton`
- Produces: 2-column mosque grid with icon-button action row, empty state, skeleton loading

- [ ] **Step 1: Rewrite mosques/page.tsx**

Write the entire file `apps/web/src/app/(dashboard)/dashboard/mosques/page.tsx`:

```tsx
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Building2, MapPin, Mail, Hash, Clock, Plus, KeyRound,
  Pencil, Settings, AlarmClock, Megaphone, Users, Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

function StatusPill({ status }: { status: string }) {
  const online = status === "ONLINE";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full",
        online ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", online ? "bg-emerald-500" : "bg-zinc-400")} />
      {online ? "Online" : "Offline"}
    </span>
  );
}

function IconBtn({
  icon: Icon, label, href, onClick, danger,
}: {
  icon: React.ElementType; label: string;
  href?: string; onClick?: () => void; danger?: boolean;
}) {
  const cls = cn(
    "p-1.5 rounded-lg transition-colors",
    danger
      ? "text-zinc-400 hover:text-red-500 hover:bg-red-50"
      : "text-zinc-500 hover:bg-zinc-100"
  );
  if (href) {
    return (
      <Link href={href} title={label} aria-label={label} className={cls}>
        <Icon size={15} />
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={cls}>
      <Icon size={15} />
    </button>
  );
}

function MosqueCard({ mosque }: { mosque: any }) {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/mosques/${mosque.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-mosques"] }),
  });

  const handleDelete = () => {
    if (confirm(`Delete "${mosque.name}"? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-base font-semibold text-zinc-900 leading-snug">{mosque.name}</h3>
        <StatusPill status={mosque.status} />
      </div>

      {/* Meta */}
      <div className="space-y-1.5 mb-4">
        {mosque.address && (
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-zinc-400 shrink-0" />
            <span className="text-sm text-zinc-500 truncate">
              {mosque.address}, {mosque.zipcode} {mosque.city?.toUpperCase()} {mosque.countryCode}
            </span>
          </div>
        )}
        {mosque.email && (
          <div className="flex items-center gap-2">
            <Mail size={13} className="text-zinc-400 shrink-0" />
            <a
              href={`mailto:${mosque.email}`}
              className="text-sm text-violet-600 hover:underline truncate"
            >
              {mosque.email}
            </a>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Hash size={13} className="text-zinc-400 shrink-0" />
          <span className="text-xs text-zinc-400 font-mono">{mosque.id.slice(-8)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-zinc-400 shrink-0" />
          <span className="text-xs text-zinc-400">
            Created {new Date(mosque.createdAt).toLocaleDateString()}
            {" · "}
            Updated {new Date(mosque.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-3 border-t border-zinc-100">
        <Link
          href={`/dashboard/mosques/${mosque.id}`}
          className="px-3 py-1.5 text-xs font-medium border border-zinc-200 rounded-lg bg-white hover:bg-zinc-50 text-zinc-700 transition-colors mr-1"
        >
          Details
        </Link>
        <div className="w-px h-4 bg-zinc-200" />
        <IconBtn icon={Pencil} label="Edit" href={`/dashboard/mosques/${mosque.id}/edit`} />
        <IconBtn icon={Settings} label="Configure" href={`/dashboard/mosques/${mosque.id}/config`} />
        <IconBtn icon={AlarmClock} label="Prayer Times" href={`/dashboard/mosques/${mosque.id}/prayer-times`} />
        <IconBtn icon={Megaphone} label="Announcements" href={`/dashboard/mosques/${mosque.id}/announcements`} />
        <IconBtn icon={Users} label="Staff" href={`/dashboard/mosques/${mosque.id}/staff`} />
        <div className="ml-auto">
          <IconBtn icon={Trash2} label="Delete mosque" onClick={handleDelete} danger />
        </div>
      </div>
    </div>
  );
}

export default function AdminMosquesPage() {
  const { accessToken } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-mosques"],
    queryFn: async () => {
      const res = await api.get("/mosques", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.data;
    },
    enabled: !!accessToken,
  });

  const mosques = data?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">Mosques</h1>
          {!isLoading && (
            <span className="bg-zinc-100 text-zinc-600 text-xs font-medium px-2 py-0.5 rounded-full">
              {mosques.length}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/mosques/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
          >
            <Plus size={15} /> Add Mosque
          </Link>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white hover:bg-zinc-50 text-zinc-700 transition-colors">
            <KeyRound size={15} /> Retrieve Access
          </button>
        </div>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && mosques.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 mx-auto mb-4">
            <Building2 size={28} />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 mb-1">No mosques yet</h3>
          <p className="text-sm text-zinc-500 mb-4">Add your first mosque to get started.</p>
          <Link
            href="/dashboard/mosques/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
          >
            <Plus size={15} /> Add your first mosque
          </Link>
        </div>
      )}

      {/* Mosque grid */}
      {!isLoading && mosques.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mosques.map((m: any) => (
            <MosqueCard key={m.id} mosque={m} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
pnpm --filter @mawaqit/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000/dashboard/mosques`. Expected:
- Page header "Mosques" with count badge, "+ Add Mosque" and "Retrieve Access" buttons
- 2-column card grid on large screens, 1-column on mobile
- Each card: name + status pill on top, icon+text meta rows, icon action buttons at bottom
- "Details" link + separator + 5 icon buttons (Pencil, Settings, AlarmClock, Megaphone, Users) + Trash2 pushed right
- Trash2 turns red on hover
- Skeleton cards shown during load; empty state shown if no mosques

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(dashboard)/dashboard/mosques/page.tsx
git commit -m "feat(web): redesign mosques list — 2-col grid, icon action buttons, skeleton loading, empty state"
```

---

### Task 6: Mosque hub page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/mosques/[id]/page.tsx`

**Interfaces:**
- Produces: breadcrumb, hub header with status pill, info strip, 6-card action grid

- [ ] **Step 1: Rewrite mosques/[id]/page.tsx**

Write the entire file `apps/web/src/app/(dashboard)/dashboard/mosques/[id]/page.tsx`:

```tsx
"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Building2, ChevronRight, MapPin, Mail, Phone, ExternalLink,
  Megaphone, Calendar, Clock, Settings, Pencil, Monitor,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

const HUB_ACTIONS = [
  {
    icon: Megaphone, label: "Announcements & Flash Messages",
    desc: "Manage mosque announcements and flash messages",
    href: "announcements", iconBg: "bg-violet-50 text-violet-600", accent: "text-violet-600",
  },
  {
    icon: Calendar, label: "Events",
    desc: "Schedule and manage mosque events",
    href: "events", iconBg: "bg-teal-50 text-teal-600", accent: "text-teal-600",
  },
  {
    icon: Clock, label: "Timetable",
    desc: "Configure prayer timetable for all months",
    href: "prayer-times", iconBg: "bg-blue-50 text-blue-600", accent: "text-blue-600",
  },
  {
    icon: Settings, label: "Configure",
    desc: "Prayer calculation, iqama, display settings",
    href: "config", iconBg: "bg-amber-50 text-amber-600", accent: "text-amber-600",
  },
  {
    icon: Pencil, label: "Edit Details",
    desc: "Update mosque name, address, contact info",
    href: "edit", iconBg: "bg-emerald-50 text-emerald-600", accent: "text-emerald-600",
  },
];

export default function MosqueHubPage({ params }: Props) {
  const { id } = use(params);
  const { accessToken } = useAuthStore();

  const { data } = useQuery({
    queryKey: ["mosque", id],
    queryFn: async () => {
      const res = await api.get(`/mosques/${id}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      return res.data.data;
    },
  });

  const online = data?.status === "ONLINE";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-zinc-400">
        <Link href="/dashboard/mosques" className="hover:text-zinc-600 transition-colors">
          Mosques
        </Link>
        <ChevronRight size={14} />
        <span className="text-zinc-700 font-medium">{data?.name ?? "Loading…"}</span>
      </nav>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <Building2 size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{data?.name ?? "…"}</h1>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full mt-1",
                online ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", online ? "bg-emerald-500" : "bg-zinc-400")} />
              {online ? "Online" : "Offline"}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {data?.slug && (
            <a
              href={`/mosques/${data.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white hover:bg-zinc-50 text-zinc-700 transition-colors"
            >
              <Monitor size={14} /> View Display <ExternalLink size={12} className="text-zinc-400" />
            </a>
          )}
          <Link
            href={`/dashboard/mosques/${id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white hover:bg-zinc-50 text-zinc-700 transition-colors"
          >
            <Pencil size={14} /> Edit
          </Link>
        </div>
      </div>

      {/* Info strip */}
      {data && (data.address || data.email || data.phone) && (
        <div className="bg-white rounded-xl border border-zinc-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {data.address && (
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400 font-semibold mb-0.5">Address</p>
                <p className="text-sm text-zinc-700">
                  {data.address}, {data.zipcode} {data.city?.toUpperCase()}
                </p>
              </div>
            </div>
          )}
          {data.email && (
            <div className="flex items-start gap-2">
              <Mail size={14} className="text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400 font-semibold mb-0.5">Email</p>
                <p className="text-sm text-zinc-700">{data.email}</p>
              </div>
            </div>
          )}
          {data.phone && (
            <div className="flex items-start gap-2">
              <Phone size={14} className="text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400 font-semibold mb-0.5">Phone</p>
                <p className="text-sm text-zinc-700">{data.phone}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {HUB_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={`/dashboard/mosques/${id}/${action.href}`}
            className="bg-white border border-zinc-200 rounded-xl p-5 hover:shadow-md hover:border-zinc-300 transition-all group flex flex-col"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", action.iconBg)}>
              <action.icon size={18} />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-violet-700 transition-colors">
              {action.label}
            </h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed flex-1">{action.desc}</p>
            <p className={cn("text-xs font-medium mt-3", action.accent)}>Open →</p>
          </Link>
        ))}

        {/* Public display card */}
        {data?.slug && (
          <a
            href={`/mosques/${data.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-zinc-200 rounded-xl p-5 hover:shadow-md hover:border-zinc-300 transition-all group flex flex-col"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
              <Monitor size={18} className="text-violet-600" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-violet-700 transition-colors">
              Public Display
            </h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed flex-1">
              Open the fullscreen TV adhan clock display
            </p>
            <p className="text-xs font-medium mt-3 text-violet-600">Open ↗</p>
          </a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
pnpm --filter @mawaqit/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000/dashboard/mosques/<any-id>`. Expected:
- Breadcrumb "Mosques / [mosque name]" at top
- Page header with purple Building2 icon, mosque name, status pill
- "View Display" and "Edit" buttons right-aligned
- Info strip with Address/Email/Phone columns (hidden if null)
- 2–3 column action card grid with tinted icons, hover shadow lift, "Open →" text

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/(dashboard)/dashboard/mosques/[id]/page.tsx"
git commit -m "feat(web): redesign mosque hub — breadcrumb, info strip, action card grid"
```

---

### Task 7: Config page — breadcrumb, sticky save bar, restyled form elements

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/mosques/[id]/config/page.tsx`

**Interfaces:**
- All 9 accordion sections and all `YesNoToggle`/`ToggleField` calls are unchanged in behaviour; they inherit new visuals from Task 1
- The save bar moves from the bottom of the JSX to a sticky top bar

- [ ] **Step 1: Add breadcrumb + sticky save bar, remove bottom save bar**

The config page file is large (743 lines). Make these targeted changes:

**1a. Add `ChevronRight, AlertCircle, CheckCircle` to the existing Lucide import** — find this line near the top of the file:

```tsx
import Link from "next/link";
```

Replace with:

```tsx
import Link from "next/link";
import { ChevronRight, AlertCircle, CheckCircle } from "lucide-react";
```

**1b. Replace the opening of the `return` block.**

Find (the current opening of the return, starting at `<div className="space-y-3 max-w-4xl pb-8">`):

```tsx
  return (
    <div className="space-y-3 max-w-4xl pb-8">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/mosques/${id}`} className="text-sm text-primary hover:underline">◀ Back</Link>
        <h2 className="text-xl font-semibold">Prayer times configuration</h2>
      </div>
      <p className="text-xs text-muted-foreground">* Required</p>
```

Replace with:

```tsx
  return (
    <div className="space-y-3 max-w-4xl pb-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-zinc-400 mb-1">
        <Link href="/dashboard/mosques" className="hover:text-zinc-600 transition-colors">Mosques</Link>
        <ChevronRight size={14} />
        <Link href={`/dashboard/mosques/${id}`} className="hover:text-zinc-600 transition-colors">
          Configuration
        </Link>
      </nav>

      {/* Sticky save bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-zinc-200 -mx-6 lg:-mx-8 px-6 lg:px-8 py-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-zinc-900">Prayer Times Configuration</h1>
          <span className="text-xs text-zinc-400">* Required</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            style={{ background: "#6200ea" }}
            disabled={saveStatus === "saving"}
            onClick={handleSave}
          >
            {saveStatus === "saving" ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saveStatus === "saving"}
            onClick={() => window.location.reload()}
          >
            Cancel
          </Button>
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle size={15} /> Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1.5 text-sm text-red-500">
              <AlertCircle size={15} /> {saveError}
            </span>
          )}
        </div>
      </div>
```

**1c. Remove the bottom save bar block.** Find and delete this entire block at the end of the JSX (just before the closing `</div>`):

```tsx
      {/* ── Global Save / Cancel ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Button
          type="button"
          style={{ background: "#6200ea" }}
          disabled={saveStatus === "saving"}
          onClick={handleSave}
        >
          {saveStatus === "saving" ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saveStatus === "saving"}
          onClick={() => window.location.reload()}
        >
          Cancel
        </Button>
        {saveStatus === "saved" && <span className="text-sm text-green-600 font-medium">Saved ✓</span>}
        {saveStatus === "error" && <span className="text-sm text-red-500">{saveError}</span>}
      </div>
```

**1d. Update all `<select>` class strings in the config file.** Every `<select>` currently uses this class:
```
"mt-1 w-full h-10 rounded border border-border bg-white px-3 text-sm"
```
Replace every occurrence with:
```
"mt-1 w-full h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
```

There are 6 selects in the file (timezone, dst, hijriAdjust, calcSource, athanSource, iqamaSound). Use find-replace in your editor.

- [ ] **Step 2: TypeScript check**

```bash
pnpm --filter @mawaqit/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000/dashboard/mosques/<any-id>/config`. Expected:
- Breadcrumb "Mosques / Configuration" at top
- Sticky white bar with "Prayer Times Configuration" title and Save/Cancel buttons — stays visible when scrolling
- No save bar at the bottom of the page
- All accordion sections use the new card-style design (white card, chevron icon)
- All `YesNoToggle` controls show as purple pill switches
- Selects have rounded-lg border and violet focus ring

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/(dashboard)/dashboard/mosques/[id]/config/page.tsx"
git commit -m "feat(web): redesign config page — breadcrumb, sticky save bar, restyled selects"
```

---

### Task 8: Profile page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/profile/page.tsx`

**Interfaces:**
- Produces: avatar initials circle, account info card, change-password card with icon feedback states

- [ ] **Step 1: Rewrite profile/page.tsx**

Write the entire file `apps/web/src/app/(dashboard)/dashboard/profile/page.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const schema = z.object({
  oldPassword: z.string().min(1, "Current password required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirm: z.string().min(1, "Confirm new password"),
}).refine(d => d.newPassword === d.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

type FormData = z.infer<typeof schema>;

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        "text-xs font-medium px-2 py-0.5 rounded-full",
        role === "SUPER_ADMIN" ? "bg-violet-100 text-violet-700" : "bg-zinc-100 text-zinc-600"
      )}
    >
      {role}
    </span>
  );
}

export default function ProfilePage() {
  const { user, accessToken } = useAuthStore();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "??";

  const onSubmit = async (data: FormData) => {
    setError("");
    setSuccess(false);
    try {
      await api.post(
        "/auth/change-password",
        { oldPassword: data.oldPassword, newPassword: data.newPassword },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setSuccess(true);
      reset();
    } catch (e: any) {
      setError(e.response?.data?.error?.message ?? "Failed to change password.");
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Profile</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage your account details and security.</p>
      </div>

      {/* Account info card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-violet-100 text-violet-700 text-xl font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-base font-semibold text-zinc-900 mb-1">{user?.email}</p>
            {user?.role && <RoleBadge role={user.role} />}
          </div>
        </div>
        <div className="border-t border-zinc-100 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Email</span>
            <span className="text-sm font-medium text-zinc-900">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Role</span>
            {user?.role && <RoleBadge role={user.role} />}
          </div>
        </div>
      </div>

      {/* Change password card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={16} className="text-zinc-500" />
          <h2 className="text-base font-semibold text-zinc-900">Change Password</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">Current Password</label>
            <Input type="password" className="bg-white" {...register("oldPassword")} />
            {errors.oldPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.oldPassword.message}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">New Password</label>
            <Input type="password" className="bg-white" {...register("newPassword")} />
            {errors.newPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">Confirm New Password</label>
            <Input type="password" className="bg-white" {...register("confirm")} />
            {errors.confirm && (
              <p className="text-xs text-red-500 mt-1">{errors.confirm.message}</p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-700">
              <CheckCircle size={15} className="shrink-0" />
              Password changed successfully.
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} style={{ background: "#6200ea" }}>
            {isSubmitting ? "Updating…" : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
pnpm --filter @mawaqit/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000/dashboard/profile`. Expected:
- "Profile" heading + subtitle
- Account card: large initials avatar circle in violet, email + role badge, divider, email/role rows below
- Change Password card: lock icon + title, three password inputs with zinc labels, success = green bordered box with CheckCircle, error = red bordered box with AlertCircle
- "Update Password" purple button

- [ ] **Step 4: Final TypeScript check across entire web app**

```bash
pnpm --filter @mawaqit/web exec tsc --noEmit
```

Expected: zero errors across all files.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(dashboard)/dashboard/profile/page.tsx
git commit -m "feat(web): redesign profile page — avatar initials, account card, styled password form"
```
