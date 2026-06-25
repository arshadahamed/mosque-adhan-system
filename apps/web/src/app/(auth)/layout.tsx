import { Suspense } from "react";
import { Navbar } from "@/components/layout/navbar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Suspense>{children}</Suspense>
        </div>
      </div>
    </div>
  );
}
