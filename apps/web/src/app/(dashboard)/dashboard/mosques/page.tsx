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
