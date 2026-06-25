"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { accessToken } = useAuthStore();

  const { data: mosquesData } = useQuery({
    queryKey: ["dashboard-mosques"],
    queryFn: async () => {
      const res = await api.get("/mosques", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.data.data as any[];
    },
    enabled: !!accessToken,
  });

  const total = mosquesData?.length ?? "—";
  const online = mosquesData?.filter((m: any) => m.status === "ONLINE").length ?? "—";

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Mosques", value: total, icon: "🕌" },
          { label: "Online", value: online, icon: "🟢" },
          { label: "Prayer Schedules", value: total, icon: "🕐" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-background p-6">
            <div className="text-3xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Quick Actions</h3>
        <div className="flex gap-3 flex-wrap">
          <Link href="/dashboard/mosques/new" className={cn(buttonVariants())}>
            + Add Mosque
          </Link>
          <Link href="/dashboard/mosques" className={cn(buttonVariants({ variant: "outline" }))}>
            Manage Mosques
          </Link>
        </div>
      </div>

      {mosquesData && mosquesData.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Your Mosques</h3>
          <div className="space-y-2">
            {mosquesData.slice(0, 5).map((m: any) => (
              <div key={m.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-background">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-sm text-muted-foreground">{m.city}, {m.countryCode}</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/dashboard/mosques/${m.id}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                    Manage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
