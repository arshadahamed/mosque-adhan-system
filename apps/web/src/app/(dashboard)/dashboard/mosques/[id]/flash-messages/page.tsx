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
  content: z.string().min(1, "Content required"),
  enabled: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  onMainScreen: z.boolean(),
  onMobile: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function FlashMessagesPage({ params }: Props) {
  const { id } = use(params);
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [apiError, setApiError] = useState("");

  const qKey = ["flash-messages", id];

  const { data, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: async () => {
      const res = await api.get(`/mosques/${id}/flash-messages`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.data.data as any[];
    },
    enabled: !!accessToken,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { enabled: true, onMainScreen: true, onMobile: true, sortOrder: 0 },
  });

  const createMutation = useMutation({
    mutationFn: async (body: FormData) => {
      await api.post(`/mosques/${id}/flash-messages`, body, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qKey }); reset({ enabled: true, onMainScreen: true, onMobile: true }); setShowForm(false); setApiError(""); },
    onError: (e: any) => setApiError(e.response?.data?.error?.message ?? "Failed."),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ fmId, body }: { fmId: string; body: FormData }) => {
      await api.patch(`/mosques/${id}/flash-messages/${fmId}`, body, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qKey }); reset(); setEditing(null); setShowForm(false); setApiError(""); },
    onError: (e: any) => setApiError(e.response?.data?.error?.message ?? "Failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (fmId: string) => {
      await api.delete(`/mosques/${id}/flash-messages/${fmId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  const openCreate = () => { reset({ enabled: true, onMainScreen: true, onMobile: true, sortOrder: 0 }); setEditing(null); setShowForm(true); setApiError(""); };
  const openEdit = (fm: any) => {
    setEditing(fm);
    setValue("content", fm.content);
    setValue("enabled", fm.enabled);
    setValue("sortOrder", fm.sortOrder ?? 0);
    setValue("onMainScreen", fm.onMainScreen);
    setValue("onMobile", fm.onMobile);
    setShowForm(true);
    setApiError("");
  };

  const onSubmit = (data: FormData) => {
    if (editing) updateMutation.mutate({ fmId: editing.id, body: data });
    else createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/mosques/${id}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ← Back
        </Link>
        <h2 className="text-2xl font-bold">Flash Messages</h2>
        <Button size="sm" className="ml-auto" onClick={openCreate}>+ New Message</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">{editing ? "Edit Flash Message" : "New Flash Message"}</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Content *</label>
                <textarea
                  {...register("content")}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {errors.content && <p className="text-xs text-red-500">{errors.content.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Sort Order</label>
                  <Input type="number" {...register("sortOrder")} />
                </div>
                <div className="space-y-3 pt-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" {...register("enabled")} className="rounded" />
                    Enabled
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" {...register("onMainScreen")} className="rounded" />
                    Show on Main Screen
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" {...register("onMobile")} className="rounded" />
                    Show on Mobile
                  </label>
                </div>
              </div>
              {apiError && <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{apiError}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                  {isSubmitting ? "Saving…" : editing ? "Save Changes" : "Create"}
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
          <div className="text-4xl mb-3">⚡</div>
          <p>No flash messages yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((fm: any) => (
            <Card key={fm.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <p className="text-sm">{fm.content}</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${fm.enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {fm.enabled ? "Enabled" : "Disabled"}
                      </span>
                      {fm.onMainScreen && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Main Screen</span>}
                      {fm.onMobile && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Mobile</span>}
                      <span className="text-xs text-muted-foreground">Order: {fm.sortOrder ?? 0}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEdit(fm)}>Edit</Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => { if (confirm("Delete this flash message?")) deleteMutation.mutate(fm.id); }}
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
