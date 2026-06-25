"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setMessage("Verification token missing."); return; }
    api.post("/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch((e: any) => {
        setStatus("error");
        setMessage(e.response?.data?.error?.message ?? "Verification failed. The link may have expired.");
      });
  }, [token]);

  return (
    <Card>
      <CardContent className="pt-8 pb-8 text-center space-y-4">
        {status === "loading" && (
          <>
            <div className="text-4xl animate-pulse">📧</div>
            <p className="text-muted-foreground">Verifying your email…</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-4xl">✅</div>
            <h2 className="font-semibold text-lg">Email verified!</h2>
            <p className="text-sm text-muted-foreground">Your account is now active. You can sign in.</p>
            <Link href="/login" className={cn(buttonVariants(), "mt-2 inline-block")}>
              Sign in
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-4xl">❌</div>
            <h2 className="font-semibold text-lg">Verification failed</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Link href="/register" className={cn(buttonVariants({ variant: "outline" }), "mt-2 inline-block")}>
              Register again
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
