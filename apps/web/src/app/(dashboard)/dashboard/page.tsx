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
