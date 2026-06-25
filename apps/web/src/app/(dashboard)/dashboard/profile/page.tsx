"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const schema = z.object({
  oldPassword: z.string().min(1, "Current password required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirm: z.string().min(1, "Confirm new password"),
}).refine(d => d.newPassword === d.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const { user, accessToken } = useAuthStore();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError("");
    setSuccess(false);
    try {
      await api.post("/auth/change-password", {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      }, { headers: { Authorization: `Bearer ${accessToken}` } });
      setSuccess(true);
      reset();
    } catch (e: any) {
      setError(e.response?.data?.error?.message ?? "Failed to change password.");
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-2xl font-bold">Profile</h2>

      <Card>
        <CardHeader>
          <CardTitle>Account Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium">{user?.role}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Current Password</label>
              <Input type="password" {...register("oldPassword")} />
              {errors.oldPassword && <p className="text-xs text-red-500">{errors.oldPassword.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">New Password</label>
              <Input type="password" {...register("newPassword")} />
              {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input type="password" {...register("confirm")} />
              {errors.confirm && <p className="text-xs text-red-500">{errors.confirm.message}</p>}
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded">{error}</p>}
            {success && <p className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded">Password changed successfully.</p>}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
