"use client";
import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

const schema = z.object({
  title: z.string().min(1, "Title required"),
  description: z.string().optional(),
  category: z.string().optional(),
  startsAt: z.string().min(1, "Start date required"),
  endsAt: z.string().optional(),
  location: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EventsPage({ params }: Props) {
  const { id } = use(params);
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [apiError, setApiError] = useState("");

  const qKey = ["events", id];

  const { data, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: async () => {
      const res = await api.get(`/mosques/${id}/events`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.data.data as any[];
    },
    enabled: !!accessToken,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: async (body: FormData) => {
      await api.post(`/mosques/${id}/events`, body, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qKey }); reset(); setShowForm(false); setApiError(""); },
    onError: (e: any) => setApiError(e.response?.data?.error?.message ?? "Failed."),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ evtId, body }: { evtId: string; body: FormData }) => {
      await api.patch(`/mosques/${id}/events/${evtId}`, body, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qKey }); reset(); setEditing(null); setShowForm(false); setApiError(""); },
    onError: (e: any) => setApiError(e.response?.data?.error?.message ?? "Failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (evtId: string) => {
      await api.delete(`/mosques/${id}/events/${evtId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  const openCreate = () => { reset(); setEditing(null); setShowForm(true); setApiError(""); };
  const openEdit = (evt: any) => {
    setEditing(evt);
    setValue("title", evt.title);
    setValue("description", evt.description ?? "");
    setValue("category", evt.category ?? "");
    setValue("startsAt", evt.startsAt?.slice(0, 16) ?? "");
    setValue("endsAt", evt.endsAt?.slice(0, 16) ?? "");
    setValue("location", evt.location ?? "");
    setShowForm(true);
    setApiError("");
  };

  const onSubmit = (data: FormData) => {
    if (editing) updateMutation.mutate({ evtId: editing.id, body: data });
    else createMutation.mutate(data);
  };

  const fmt = (d: string) => d ? new Date(d).toLocaleString() : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/mosques/${id}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ← Back
        </Link>
        <h2 className="text-2xl font-bold">Events</h2>
        <Button size="sm" className="ml-auto" onClick={openCreate}>+ New Event</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">{editing ? "Edit Event" : "New Event"}</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-sm font-medium">Title *</label>
                  <Input {...register("title")} />
                  {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    {...register("description")}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Category</label>
                  <Input placeholder="e.g. Lecture, Charity" {...register("category")} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Location</label>
                  <Input placeholder="Main Hall" {...register("location")} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Starts At *</label>
                  <Input type="datetime-local" {...register("startsAt")} />
                  {errors.startsAt && <p className="text-xs text-red-500">{errors.startsAt.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Ends At</label>
                  <Input type="datetime-local" {...register("endsAt")} />
                </div>
              </div>
              {apiError && <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{apiError}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                  {isSubmitting ? "Saving…" : editing ? "Save Changes" : "Create Event"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !data?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">📅</div>
          <p>No events yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((evt: any) => (
            <Card key={evt.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{evt.title}</span>
                      {evt.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{evt.category}</span>
                      )}
                    </div>
                    {evt.description && <p className="text-sm text-muted-foreground line-clamp-2">{evt.description}</p>}
                    <p className="text-xs text-muted-foreground">
                      {fmt(evt.startsAt)}{evt.endsAt ? ` → ${fmt(evt.endsAt)}` : ""}
                      {evt.location && ` · ${evt.location}`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEdit(evt)}>Edit</Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => { if (confirm("Delete this event?")) deleteMutation.mutate(evt.id); }}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
