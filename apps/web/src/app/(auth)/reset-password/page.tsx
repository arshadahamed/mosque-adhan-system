"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string().min(1, "Please confirm your password"),
}).refine(d => d.password === d.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) { setError("Reset token missing. Please use the link from your email."); return; }
    setError("");
    try {
      await api.post("/auth/reset-password", { token, password: data.password });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (e: any) {
      setError(e.response?.data?.error?.message ?? "Failed to reset password. The link may have expired.");
    }
  };

  if (!token) {
    return (
      <Card>
        <CardContent className="pt-8 text-center space-y-3">
          <div className="text-4xl">❌</div>
          <p className="text-muted-foreground">Invalid reset link. Please request a new one.</p>
          <Link href="/forgot-password" className={cn(buttonVariants(), "inline-block")}>
            Forgot Password
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-8 text-center space-y-3">
          <div className="text-4xl">✅</div>
          <h2 className="font-semibold text-lg">Password reset!</h2>
          <p className="text-sm text-muted-foreground">Redirecting you to sign in…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set New Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">New Password</label>
            <Input type="password" placeholder="Min. 8 characters" {...register("password")} />
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Confirm Password</label>
            <Input type="password" placeholder="Repeat new password" {...register("confirm")} />
            {errors.confirm && <p className="text-xs text-red-500">{errors.confirm.message}</p>}
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded">{error}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Resetting…" : "Reset Password"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}
