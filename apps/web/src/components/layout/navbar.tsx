"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";

export function Navbar() {
  const { user, accessToken, setAuth, clear } = useAuthStore();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Restore access token after page reload (refresh token lives in HTTP-only cookie)
  useEffect(() => {
    if (user && !accessToken) {
      api.post("/auth/refresh")
        .then(({ data }) => setAuth(user, data.data.accessToken))
        .catch(() => { clear(); window.location.href = "/login"; });
    }
  }, [user, accessToken, setAuth, clear]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } catch { /* best-effort */ }
    clear();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40" style={{ background: "var(--navbar-bg)" }}>
      <div className="px-4 sm:px-6">
        <div className="flex h-12 items-center gap-5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-base shadow">
              🕌
            </div>
            <span className="text-white font-bold text-xs tracking-widest uppercase">Mawaqit</span>
          </Link>

          {/* Admin link */}
          {user && (
            <Link
              href="/dashboard/mosques"
              className="flex items-center gap-1.5 text-white/90 text-sm hover:text-white transition-colors"
            >
              <span>🏠</span>
              <span>Admin</span>
            </Link>
          )}

          {/* Language dropdown */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1 text-white/90 text-sm hover:text-white transition-colors"
            >
              🌐 Language
              <span className="text-xs ml-0.5">▾</span>
            </button>
            {langOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded shadow-lg py-1 min-w-36 z-50 border border-border">
                {["English", "Arabic", "French", "German", "Turkish"].map((l) => (
                  <button
                    key={l}
                    className="block w-full text-left px-4 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
                    onClick={() => setLangOpen(false)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          <a href="#" className="flex items-center gap-1 text-white/90 text-sm hover:text-white transition-colors">
            ♥ Support Mawaqit
          </a>

          {/* Right */}
          <div className="ml-auto flex items-center gap-5">
            {user ? (
              <>
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-1 text-white/90 text-sm hover:text-white transition-colors"
                >
                  👤 My profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-white/90 text-sm hover:text-white transition-colors"
                >
                  ↩ Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/register" className="flex items-center gap-1 text-white/90 text-sm hover:text-white transition-colors">
                  👤 Register
                </Link>
                <Link href="/login" className="flex items-center gap-1 text-white/90 text-sm hover:text-white transition-colors">
                  ↩ Log in
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
