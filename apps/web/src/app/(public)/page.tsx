import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-36 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Prayer Times for Every Mosque
          </h1>
          <p className="text-lg md:text-xl text-emerald-100 max-w-2xl mx-auto mb-10">
            Find accurate prayer times, Jumu'ah schedules, and announcements for
            mosques near you — on any screen, in any language.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/mosques" className={cn(buttonVariants({ size: "lg" }), "bg-white text-emerald-900 hover:bg-emerald-50")}>
              Find a Mosque
            </Link>
            <Link href="/register" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-white text-white hover:bg-white/10")}>
              Add Your Mosque
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Everything Your Mosque Needs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 rounded-xl border border-border bg-background">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const FEATURES = [
  {
    icon: "🕐",
    title: "Accurate Prayer Times",
    description:
      "Upload your full-year prayer calendar or use automatic calculation. Daily Fajr, Shuruq, Dhuhr, Asr, Maghrib, and Isha.",
  },
  {
    icon: "📺",
    title: "Digital Display",
    description:
      "Real-time prayer time display optimized for TV screens and projectors inside the mosque. Announcements and flash messages included.",
  },
  {
    icon: "📱",
    title: "Mobile Ready",
    description:
      "Full REST API for mobile apps. Push notifications for prayer times and events.",
  },
  {
    icon: "📢",
    title: "Announcements & Events",
    description:
      "Share news, classes, and community events with your congregation through the app and digital displays.",
  },
  {
    icon: "🌍",
    title: "Multi-language",
    description:
      "Support for Arabic, English, French, Turkish, Urdu, and more. Your community, your language.",
  },
  {
    icon: "🔐",
    title: "Secure & Private",
    description:
      "Role-based access control for mosque admins and staff. Your data stays yours.",
  },
];
