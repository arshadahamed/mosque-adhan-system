"use client";
import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { YesNoToggle } from "@/components/ui/toggle";

type Props = { params: Promise<{ id: string }> };

const annSchema = z.object({
  title: z.string().min(1, "Title required"),
  content: z.string().optional().or(z.literal("")),
  type: z.enum(["TEXT", "IMAGE"]),
  startsAt: z.string().optional().or(z.literal("")),
  endsAt: z.string().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().optional(),
});
type AnnForm = z.infer<typeof annSchema>;

const fmSchema = z.object({
  content: z.string().min(1, "Content required"),
  enabled: z.boolean(),
});
type FmForm = z.infer<typeof fmSchema>;

function AnnouncementsTab({ id }: { id: string }) {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [apiError, setApiError] = useState("");
  const [annEnabled, setAnnEnabled] = useState(true);
  const [annMain, setAnnMain] = useState(true);
  const [annMobile, setAnnMobile] = useState(true);
  const qKey = ["announcements", id];

  const { data, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: async () => {
      const res = await api.get(`/mosques/${id}/announcements`, { headers: { Authorization: `Bearer ${accessToken}` } });
      return res.data.data as any[];
    },
    enabled: !!accessToken,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AnnForm>({
    resolver: zodResolver(annSchema),
    defaultValues: { type: "TEXT" },
  });

  const createMutation = useMutation({
    mutationFn: async (body: any) => { await api.post(`/mosques/${id}/announcements`, body, { headers: { Authorization: `Bearer ${accessToken}` } }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qKey }); reset(); setShowForm(false); setApiError(""); },
    onError: (e: any) => setApiError(e.response?.data?.error?.message ?? "Failed."),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ annId, body }: { annId: string; body: any }) => { await api.patch(`/mosques/${id}/announcements/${annId}`, body, { headers: { Authorization: `Bearer ${accessToken}` } }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qKey }); reset(); setEditing(null); setShowForm(false); setApiError(""); },
    onError: (e: any) => setApiError(e.response?.data?.error?.message ?? "Failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (annId: string) => { await api.delete(`/mosques/${id}/announcements/${annId}`, { headers: { Authorization: `Bearer ${accessToken}` } }); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  const openCreate = () => {
    reset({ type: "TEXT" }); setEditing(null);
    setAnnEnabled(true); setAnnMain(true); setAnnMobile(true);
    setShowForm(true); setApiError("");
  };

  const openEdit = (ann: any) => {
    setEditing(ann);
    setAnnEnabled(ann.enabled ?? true); setAnnMain(ann.onMainScreen ?? true); setAnnMobile(ann.onMobile ?? true);
    reset({ title: ann.title, content: ann.content ?? "", type: ann.type ?? "TEXT", startsAt: ann.startsAt ? ann.startsAt.slice(0, 16) : "", endsAt: ann.endsAt ? ann.endsAt.slice(0, 16) : "", sortOrder: ann.sortOrder ?? 0 });
    setShowForm(true); setApiError("");
  };

  const onSubmit = (data: AnnForm) => {
    const body = { ...data, enabled: annEnabled, onMainScreen: annMain, onMobile: annMobile };
    if (editing) updateMutation.mutate({ annId: editing.id, body });
    else createMutation.mutate(body);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">You can have up to <strong>15 enabled</strong> announcements at a time.</p>
        <Button size="sm" onClick={openCreate} style={{ background: "#6200ea" }}>+ Add</Button>
      </div>

      {showForm && (
        <div className="bg-white border border-border rounded p-4 space-y-4">
          <h3 className="font-semibold">{editing ? "Edit Announcement" : "Add announcement"}</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
              <Input placeholder="Jumu'ah reminder" className="mt-1 bg-white" {...register("title")} />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <select {...register("type")} className="mt-1 w-full h-10 rounded border border-border bg-white px-3 text-sm">
                <option value="TEXT">Text</option>
                <option value="IMAGE">Image</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <textarea {...register("content")} rows={4} placeholder="Announcement text…" className="mt-1 w-full rounded border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Starts At</label>
                <Input type="datetime-local" className="mt-1 bg-white" {...register("startsAt")} />
              </div>
              <div>
                <label className="text-sm font-medium">Ends At</label>
                <Input type="datetime-local" className="mt-1 bg-white" {...register("endsAt")} />
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <YesNoToggle value={annEnabled} onChange={setAnnEnabled} />
                <span className="text-sm">Enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <YesNoToggle value={annMain} onChange={setAnnMain} />
                <span className="text-sm">Main screen</span>
              </div>
              <div className="flex items-center gap-2">
                <YesNoToggle value={annMobile} onChange={setAnnMobile} />
                <span className="text-sm">Mobile</span>
              </div>
            </div>
            {apiError && <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{apiError}</p>}
            <div className="flex gap-2">
              <Button type="submit" style={{ background: "#6200ea" }} disabled={isSubmitting}>Save</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No announcements yet. Click "+ Add" to create one.</p>
      ) : (
        <div className="bg-white border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Title</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Content</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Type</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Enabled</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Starts</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((ann: any) => (
                <tr key={ann.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{ann.title}</td>
                  <td className="px-3 py-2 text-muted-foreground max-w-xs truncate">{ann.content ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ann.type === "TEXT" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>{ann.type}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs font-medium ${ann.enabled ? "text-emerald-600" : "text-gray-400"}`}>{ann.enabled ? "Yes" : "No"}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{ann.startsAt ? new Date(ann.startsAt).toLocaleDateString() : "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(ann)} className="p-1.5 rounded text-white text-xs" style={{ background: "#6200ea" }}>✏️</button>
                      <button onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(ann.id); }} className="p-1.5 rounded bg-red-500 text-white text-xs">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FlashMessagesTab({ id }: { id: string }) {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [apiError, setApiError] = useState("");
  const [enabled, setEnabled] = useState(true);
  const qKey = ["flash-messages", id];

  const { data, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: async () => {
      const res = await api.get(`/mosques/${id}/flash-messages`, { headers: { Authorization: `Bearer ${accessToken}` } });
      return res.data.data as any[];
    },
    enabled: !!accessToken,
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FmForm>({
    resolver: zodResolver(fmSchema),
    defaultValues: { enabled: true },
  });

  const createMutation = useMutation({
    mutationFn: async (body: { content: string; enabled: boolean }) => { await api.post(`/mosques/${id}/flash-messages`, body, { headers: { Authorization: `Bearer ${accessToken}` } }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qKey }); reset(); setShowForm(false); setApiError(""); },
    onError: (e: any) => setApiError(e.response?.data?.error?.message ?? "Failed."),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ fmId, body }: { fmId: string; body: { content?: string; enabled?: boolean } }) => { await api.patch(`/mosques/${id}/flash-messages/${fmId}`, body, { headers: { Authorization: `Bearer ${accessToken}` } }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qKey }); reset(); setEditing(null); setShowForm(false); setApiError(""); },
    onError: (e: any) => setApiError(e.response?.data?.error?.message ?? "Failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (fmId: string) => { await api.delete(`/mosques/${id}/flash-messages/${fmId}`, { headers: { Authorization: `Bearer ${accessToken}` } }); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  const openCreate = () => { reset(); setEnabled(true); setEditing(null); setShowForm(true); setApiError(""); };
  const openEdit = (fm: any) => {
    setEditing(fm); setEnabled(fm.enabled ?? true);
    reset({ content: fm.content, enabled: fm.enabled });
    setShowForm(true); setApiError("");
  };

  const onSubmit = (data: FmForm) => {
    const body = { content: data.content, enabled };
    if (editing) updateMutation.mutate({ fmId: editing.id, body });
    else createMutation.mutate(body);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Flash messages appear as banners on mosque screens.</p>
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate} style={{ background: "#6200ea" }}>+ Add Flash Message</Button>
      </div>

      {showForm && (
        <div className="bg-white border border-border rounded p-4 space-y-4">
          <h3 className="font-semibold">{editing ? "Edit Flash Message" : "New Flash Message"}</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Content <span className="text-red-500">*</span></label>
              <textarea {...register("content")} rows={3} placeholder="Message text…" className="mt-1 w-full rounded border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex items-center gap-3">
              <YesNoToggle value={enabled} onChange={setEnabled} />
              <span className="text-sm font-medium">Enabled</span>
            </div>
            {apiError && <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{apiError}</p>}
            <div className="flex gap-2">
              <Button type="submit" style={{ background: "#6200ea" }} disabled={isSubmitting}>Save</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No flash messages yet.</p>
      ) : (
        <div className="space-y-3">
          {data.map((fm: any) => (
            <div key={fm.id} className={`rounded p-4 flex items-start justify-between gap-4 ${fm.enabled ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}>
              <div>
                <p className={`text-sm ${fm.enabled ? "text-green-800" : "text-gray-600"}`}>{fm.content}</p>
                <p className="text-xs mt-1 text-muted-foreground">{fm.enabled ? "● Active" : "○ Disabled"}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(fm)} className="p-1.5 rounded text-white text-xs" style={{ background: "#6200ea" }}>✏️</button>
                <button onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(fm.id); }} className="p-1.5 rounded bg-red-500 text-white text-xs">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnnouncementsPage({ params }: Props) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<"announcements" | "flash">("announcements");

  const { data: mosque } = useQuery({
    queryKey: ["mosque-name", id],
    queryFn: async () => { const res = await api.get(`/mosques/${id}`); return res.data.data; },
  });

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/mosques/${id}`} className="text-sm text-primary hover:underline">◀ Back</Link>
        <h2 className="text-xl font-semibold">{mosque?.name?.toUpperCase() ?? "…"} — Announcements</h2>
      </div>

      <div className="flex border-b border-border">
        {["announcements", "flash"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {tab === "flash" ? "Flash messages" : "Announcements"}
          </button>
        ))}
      </div>

      {activeTab === "announcements" ? <AnnouncementsTab id={id} /> : <FlashMessagesTab id={id} />}
    </div>
  );
}
