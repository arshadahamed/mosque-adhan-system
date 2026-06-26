"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, accessToken, setAuth, clear } = useAuthStore();
  const router   = useRouter();
  const pathname = usePathname();

  const [hydrated,      setHydrated]      = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const attempted = useRef(false);

  // Step 1: mark hydrated after first render so we can read sessionStorage state
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Step 2: if user is present but token is gone (page reload), silently refresh once
  useEffect(() => {
    if (!hydrated || attempted.current) return;
    if (user && !accessToken) {
      attempted.current = true;
      setRefreshing(true);
      api
        .post<{ data: { accessToken: string; user: { id: string; email: string; role: string } } }>("/auth/refresh")
        .then(res => {
          setAuth(res.data.data.user, res.data.data.accessToken);
        })
        .catch(() => {
          clear();
          setRefreshFailed(true);
        })
        .finally(() => {
          setRefreshing(false);
        });
    }
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 3: redirect to login once we know there's no valid session.
  // Guard: only redirect if no refresh was ever attempted OR the refresh definitively failed.
  // This prevents a React 18 batch-update race where setRefreshing(false) fires before
  // setAuth has settled, causing a spurious redirect despite a successful token refresh.
  useEffect(() => {
    if (hydrated && !refreshing && !user && (!attempted.current || refreshFailed)) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, refreshing, user, refreshFailed, router, pathname]);

  // Show nothing while hydrating or refreshing to avoid flash of empty content
  if (!hydrated || refreshing || !user || !accessToken) return null;

  return <>{children}</>;
}
