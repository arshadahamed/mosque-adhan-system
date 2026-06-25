"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      const res = await api.post("/auth/login", data);
      const { accessToken, user } = res.data.data;
      setAuth(user, accessToken);
      const from = searchParams.get("from");
      const safeFrom = from && from.startsWith("/") && !from.startsWith("//") && !from.startsWith("/\\") ? from : null;
      router.push(safeFrom ?? (user.role === "SUPER_ADMIN" ? "/dashboard/mosques" : "/"));
    } catch (e: any) {
      setError(e.response?.data?.error?.message ?? "Login failed. Please try again.");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-border p-8">
      <h1 className="text-2xl font-semibold text-center text-foreground mb-6">Log in</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="Email"
            className="w-full bg-white border-border"
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>

        <div className="relative">
          <Input
            type={showPass ? "text" : "password"}
            placeholder="Password"
            className="w-full bg-white border-border pr-10"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"
            tabIndex={-1}
          >
            {showPass ? "🙈" : "👁"}
          </button>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded text-center">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
          style={{ background: "#6200ea" }}
        >
          {isSubmitting ? "Signing in…" : "Log In"}
        </Button>

        <p className="text-center text-sm text-primary hover:underline">
          <Link href="/forgot-password">Forgot your password ?</Link>
        </p>
      </form>
    </div>
  );
}
