import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ClassicDisplayClient } from "./classic-client";

const API = process.env.API_INTERNAL_URL
  ? `${process.env.API_INTERNAL_URL}/api/v1`
  : "http://localhost:4000/api/v1";

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
  return { title: mosque.name };
}

export default async function MosqueClassicDisplayPage({ params }: Props) {
  const { slug } = await params;
  const mosque = await getMosque(slug);
  if (!mosque) notFound();

  const widget = await getWidget(mosque.id);

  return <ClassicDisplayClient mosque={mosque} widget={widget} />;
}
