import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      <Link href="/" className="mb-8 flex items-center gap-2 font-bold text-2xl text-primary">
        <span>🕌</span> Mawaqit
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
