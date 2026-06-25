"use client";
import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().min(2, "Name required"),
  type: z.enum(["MOSQUE", "ISLAMIC_CENTER", "SCHOOL", "OTHER"]),
  address: z.string().min(1, "Address required"),
  city: z.string().min(1, "City required"),
  zipcode: z.string().optional(),
  countryCode: z.string().length(2, "2-letter code"),
  timezone: z.string().min(1, "Timezone required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  capacityMen: z.coerce.number().int().min(0).optional(),
  capacityWomen: z.coerce.number().int().min(0).optional(),
  status: z.enum(["ONLINE", "OFFLINE", "MAINTENANCE"]),
});

type FormData = z.infer<typeof schema>;

export default function EditMosquePage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { data: mosque, isLoading } = useQuery({
    queryKey: ["mosque", id],
    queryFn: async () => {
      const res = await api.get(`/mosques/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.data.data;
    },
    enabled: !!accessToken,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (mosque) {
      reset({
        name: mosque.name,
        type: mosque.type,
        address: mosque.address,
        city: mosque.city,
        zipcode: mosque.zipcode ?? "",
        countryCode: mosque.countryCode,
        timezone: mosque.timezone,
        phone: mosque.phone ?? "",
        email: mosque.email ?? "",
        website: mosque.website ?? "",
        capacityMen: mosque.capacityMen ?? 0,
        capacityWomen: mosque.capacityWomen ?? 0,
        status: mosque.status,
      });
    }
  }, [mosque, reset]);

  const onSubmit = async (data: FormData) => {
    setError("");
    setSuccess(false);
    try {
      await api.patch(`/mosques/${id}`, data, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e.response?.data?.error?.message ?? "Update failed.");
    }
  };

  if (isLoading) return <p className="text-muted-foreground p-6">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/mosques/${id}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ← Back
        </Link>
        <h2 className="text-2xl font-bold">Edit Mosque</h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Mosque Name *</label>
                <Input {...register("name")} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Type *</label>
                <select {...register("type")} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="MOSQUE">Mosque</option>
                  <option value="ISLAMIC_CENTER">Islamic Center</option>
                  <option value="SCHOOL">School</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Status *</label>
                <select {...register("status")} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="ONLINE">Online</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Address *</label>
                <Input {...register("address")} />
                {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">City *</label>
                <Input {...register("city")} />
                {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Postal Code</label>
                <Input {...register("zipcode")} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Country Code *</label>
                <Input maxLength={2} {...register("countryCode")} />
                {errors.countryCode && <p className="text-xs text-red-500">{errors.countryCode.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Timezone *</label>
                <Input {...register("timezone")} />
                {errors.timezone && <p className="text-xs text-red-500">{errors.timezone.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Phone</label>
                <Input {...register("phone")} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" {...register("email")} />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Website</label>
                <Input {...register("website")} />
                {errors.website && <p className="text-xs text-red-500">{errors.website.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Capacity (Men)</label>
                <Input type="number" {...register("capacityMen")} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Capacity (Women)</label>
                <Input type="number" {...register("capacityWomen")} />
              </div>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded">{error}</p>}
            {success && <p className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded">Mosque updated successfully.</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save Changes"}
              </Button>
              <Link href={`/dashboard/mosques/${id}`} className={cn(buttonVariants({ variant: "outline" }))}>
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
