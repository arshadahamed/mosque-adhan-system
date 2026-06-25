"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

type Props = { params: Promise<{ id: string }> };

const HUB_ACTIONS = [
  { icon: "📢", label: "Announcements & Flash Messages", desc: "Manage mosque announcements and flash messages", href: "announcements", color: "#7c3aed" },
  { icon: "📅", label: "Events", desc: "Schedule and manage mosque events", href: "events", color: "#0f766e" },
  { icon: "🕐", label: "Timetable", desc: "Configure prayer timetable for all months", href: "prayer-times", color: "#1d4ed8" },
  { icon: "⚙️", label: "Configure", desc: "Prayer calculation, iqama, display settings", href: "config", color: "#b45309" },
  { icon: "✏️", label: "Edit Details", desc: "Update mosque name, address, contact info", href: "edit", color: "#065f46" },
  { icon: "🌐", label: "Public Page", desc: "View the public mosque display page", href: "public", color: "#7c3aed" },
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

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/mosques" className="text-sm text-primary hover:underline">◀ All mosques</Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🕌</span>
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wide">{data?.name ?? "…"}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span>ID {data?.id?.slice(-8)}</span>
                <span>|</span>
                <span className={`flex items-center gap-1 ${data?.status === "ONLINE" ? "text-emerald-600" : "text-gray-500"}`}>
                  <span className={`w-2 h-2 rounded-full ${data?.status === "ONLINE" ? "bg-emerald-500" : "bg-gray-400"}`} />
                  {data?.status ?? "OFFLINE"}
                </span>
              </p>
            </div>
          </div>
        </div>
        <Link
          href={`/dashboard/mosques/${id}/edit`}
          className="px-4 py-2 text-sm font-medium text-white rounded"
          style={{ background: "#6200ea" }}
        >
          Edit
        </Link>
      </div>

      {/* Info row */}
      {data && (
        <div className="grid grid-cols-3 gap-4 text-sm bg-white border border-border rounded-lg p-4">
          {data.address && (
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-0.5">Address</p>
              <p>{data.address}, {data.zipcode} {data.city?.toUpperCase()}</p>
            </div>
          )}
          {data.email && (
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-0.5">Email</p>
              <p>{data.email}</p>
            </div>
          )}
          {data.phone && (
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-0.5">Phone</p>
              <p>{data.phone}</p>
            </div>
          )}
        </div>
      )}

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {HUB_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={`/dashboard/mosques/${id}/${action.href}`}
            className="bg-white border border-border rounded-lg p-5 hover:shadow-md transition-shadow group flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: `${action.color}15` }}>
                {action.icon}
              </div>
              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{action.label}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{action.desc}</p>
            <div className="mt-auto text-xs font-medium" style={{ color: action.color }}>
              Open →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
