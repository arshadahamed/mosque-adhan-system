"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { YesNoToggle } from "@/components/ui/toggle";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "uppercase")
    .regex(/[a-z]/, "lowercase")
    .regex(/[0-9]/, "digit")
    .regex(/[^A-Za-z0-9]/, "special character"),
});

type FormData = z.infer<typeof schema>;

const REQUIREMENTS = [
  { label: "Password must be at least 8 characters.", test: (p: string) => p.length >= 8 },
  { label: "Password must contain an uppercase letter.", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Password must contain a lowercase letter.", test: (p: string) => /[a-z]/.test(p) },
  { label: "Password must contain a digit.", test: (p: string) => /[0-9]/.test(p) },
  { label: "Password must contain a special character.", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function RegisterPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [terms, setTerms] = useState(false);
  const [showReqs, setShowReqs] = useState(false);

  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const watchedPassword = watch("password", "");
  useEffect(() => setPassword(watchedPassword ?? ""), [watchedPassword]);

  const onSubmit = async (data: FormData) => {
    if (!terms) { setError("You must accept the terms of use."); return; }
    setError("");
    try {
      await api.post("/auth/register", data);
      setSuccess(true);
    } catch (e: any) {
      setError(e.response?.data?.error?.message ?? "Registration failed. Please try again.");
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-border p-8 text-center space-y-4">
        <div className="text-5xl">📧</div>
        <h2 className="font-semibold text-lg">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          A verification link has been sent. Please check your inbox to activate your account.
        </p>
        <Link href="/login" className="block text-sm text-primary hover:underline">Back to login</Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-border p-8">
      <h1 className="text-2xl font-semibold text-center text-foreground mb-6">Registration</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground">
            Email <span className="text-red-500">*</span>
          </label>
          <Input type="email" className="mt-1 w-full bg-white" {...register("email")} />
          <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 p-2 mt-1 rounded">
            ℹ Please enter an email address that you visit regularly
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-1">
            <Input
              type={showPass ? "text" : "password"}
              className="w-full bg-white pr-10"
              {...register("password")}
              onFocus={() => setShowReqs(true)}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              tabIndex={-1}
            >
              {showPass ? "🙈" : "👁"}
            </button>
          </div>
          {showReqs && (
            <div className="mt-2 space-y-0.5">
              {REQUIREMENTS.map((req) => (
                <p key={req.label} className={`text-xs flex items-center gap-1 ${req.test(password) ? "text-green-600" : "text-red-500"}`}>
                  <span>{req.test(password) ? "✓" : "✗"}</span>
                  {req.label}
                </p>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">Language <span className="text-red-500">*</span></label>
          <select className="mt-1 w-full h-10 rounded-md border border-border bg-white px-3 text-sm">
            <option value="en">English</option>
            <option value="ar">Arabic</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="tr">Turkish</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <YesNoToggle value={terms} onChange={setTerms} />
          <span className="text-sm">
            I accept and agree to respect the{" "}
            <Link href="#" className="text-primary hover:underline">terms of use</Link>
          </span>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            style={{ background: "#6200ea" }}
          >
            {isSubmitting ? "Registering…" : "Validate"}
          </Button>
          <Link href="/login">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
