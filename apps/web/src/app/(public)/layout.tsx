import { Navbar } from "@/components/layout/navbar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground bg-white">
        © {new Date().getFullYear()} Mawaqit — Islamic Prayer Times & Mosque Management Platform
      </footer>
    </div>
  );
}
