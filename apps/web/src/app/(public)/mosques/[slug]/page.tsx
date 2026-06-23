import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrayerTimesWidget } from "@/components/mosque/prayer-times-widget";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function getMosque(slug: string) {
  const res = await fetch(`${API}/mosques/${slug}`, { next: { revalidate: 300 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch mosque");
  const json = await res.json();
  return json.data;
}

async function getWidget(mosqueId: string) {
  const res = await fetch(`${API}/mosques/${mosqueId}/widget`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const mosque = await getMosque(slug);
  if (!mosque) return { title: "Mosque not found" };
  return {
    title: mosque.name,
    description: `Prayer times for ${mosque.name} in ${mosque.city}`,
  };
}

export default async function MosqueDetailPage({ params }: Props) {
  const { slug } = await params;
  const mosque = await getMosque(slug);
  if (!mosque) notFound();

  const widget = await getWidget(mosque.id);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        {mosque.logoUrl && (
          <img src={mosque.logoUrl} alt={mosque.name} className="w-16 h-16 rounded-full object-cover" />
        )}
        <div>
          <h1 className="text-3xl font-bold">{mosque.name}</h1>
          <p className="text-muted-foreground mt-1">{mosque.address}, {mosque.city} · {mosque.countryCode}</p>
          {mosque.phone && <p className="text-sm text-muted-foreground mt-0.5">{mosque.phone}</p>}
          <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
            mosque.status === "ONLINE" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
          }`}>
            {mosque.status}
          </span>
        </div>
      </div>

      {/* Prayer times widget */}
      {widget && <PrayerTimesWidget widget={widget} />}

      {/* Info */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        {mosque.website && (
          <a href={mosque.website} target="_blank" rel="noopener noreferrer"
            className="text-primary hover:underline">
            {mosque.website}
          </a>
        )}
        {mosque.capacityMen && (
          <p className="text-muted-foreground">Capacity: {mosque.capacityMen} brothers{mosque.capacityWomen ? ` · ${mosque.capacityWomen} sisters` : ""}</p>
        )}
      </div>
    </div>
  );
}
