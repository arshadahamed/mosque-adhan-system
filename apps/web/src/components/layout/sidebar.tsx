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
