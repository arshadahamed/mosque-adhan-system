"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function ActionsDropdown({ mosque }: { mosque: any }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/mosques/${mosque.id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-mosques"] }); setOpen(false); },
  });

  const ACTIONS = [
    { icon: "✏️", label: "Edit", href: `/dashboard/mosques/${mosque.id}/edit` },
    { icon: "⚙️", label: "Configure", href: `/dashboard/mosques/${mosque.id}/config` },
    { icon: "📢", label: "Manage messages", href: `/dashboard/mosques/${mosque.id}/announcements` },
    { icon: "🕐", label: "Timetable", href: `/dashboard/mosques/${mosque.id}/prayer-times` },
    { icon: "👥", label: "Manage Users", href: `/dashboard/mosques/${mosque.id}/staff` },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded"
        style={{ background: "#1e0a3c" }}
      >
        Actions ☰
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white rounded shadow-xl border border-border z-20 min-w-48 py-1">
          {ACTIONS.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <span>{a.icon}</span> {a.label}
            </Link>
          ))}
          <hr className="my-1 border-border" />
          <button
            onClick={() => { if (confirm(`Delete "${mosque.name}"? This cannot be undone.`)) deleteMutation.mutate(); }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors"
          >
            🗑️ Delete mosque
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminMosquesPage() {
  const { accessToken } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-mosques"],
    queryFn: async () => {
      const res = await api.get("/mosques", { headers: { Authorization: `Bearer ${accessToken}` } });
      return res.data;
    },
    enabled: !!accessToken,
  });

  const mosques = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Admin ({isLoading ? "…" : mosques.length})</h2>
        <div className="flex gap-2">
          <Link
            href="/dashboard/mosques/new"
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white rounded"
            style={{ background: "#6200ea" }}
          >
            + Add
          </Link>
          <button className="flex items-center gap-1 px-3 py-2 text-sm border border-border rounded bg-white hover:bg-muted transition-colors">
            ↩ Retrieve the access to a mosque
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : mosques.length === 0 ? (
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="text-sm">No result</span>
          <Link
            href="/dashboard/mosques/new"
            className="w-7 h-7 rounded flex items-center justify-center text-white text-lg font-bold"
            style={{ background: "#6200ea" }}
          >
            +
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {mosques.map((m: any) => (
            <div key={m.id} className="bg-white rounded-lg shadow-sm border border-border p-4 max-w-lg">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🕌</span>
                <h3 className="font-bold text-base uppercase tracking-wide">{m.name}</h3>
              </div>

              {/* Meta */}
              <div className="space-y-0.5 text-sm mb-3">
                <p className="text-muted-foreground">
                  ID {m.id.slice(-5)} |{" "}
                  <span className={`inline-flex items-center gap-1 ${m.status === "ONLINE" ? "text-emerald-600" : "text-gray-500"}`}>
                    <span className={`w-2 h-2 rounded-full ${m.status === "ONLINE" ? "bg-emerald-500" : "bg-gray-400"}`} />
                    {m.status === "ONLINE" ? "Online" : m.status}
                  </span>
                </p>
                {m.address && (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <span>📍</span> {m.address}, {m.zipcode} {m.city?.toUpperCase()} {m.countryCode}
                  </p>
                )}
                {m.email && (
                  <p className="flex items-center gap-1.5">
                    <span>✉️</span>
                    <a href={`mailto:${m.email}`} className="text-primary hover:underline">{m.email}</a>
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <span>👤</span> {new Date(m.createdAt).toLocaleString()}
                </p>
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <span>👤</span> {new Date(m.updatedAt).toLocaleString()}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                <ActionsDropdown mosque={m} />
                <Link
                  href={`/dashboard/mosques/${m.id}`}
                  className="px-3 py-1.5 text-sm border border-border rounded bg-white hover:bg-muted transition-colors"
                >
                  + Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
