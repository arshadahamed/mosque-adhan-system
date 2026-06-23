"use client";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export function Navbar() {
  const { user, clear } = useAuthStore();

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } catch { /* */ }
    clear();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <span className="text-2xl">🕌</span>
            Mawaqit
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/mosques" className="text-muted-foreground hover:text-foreground transition-colors">
              Mosques
            </Link>
            {user?.role === "SUPER_ADMIN" && (
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden sm:block text-sm text-muted-foreground">{user.email}</span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                  Sign in
                </Link>
                <Link href="/register" className={cn(buttonVariants({ size: "sm" }))}>
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
