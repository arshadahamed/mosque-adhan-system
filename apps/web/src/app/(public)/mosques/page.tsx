import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getMosques(search?: string) {
  const params = new URLSearchParams({ limit: "24" });
  if (search) params.set("search", search);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/mosques?${params}`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) return { data: [], meta: { total: 0 } };
  return res.json();
}

export default async function MosquesPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search } = await searchParams;
  const { data: mosques, meta } = await getMosques(search);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Mosques</h1>
          <p className="text-muted-foreground mt-1">{meta?.total ?? 0} registered mosques</p>
        </div>
        <form className="flex gap-2">
          <input
            name="search"
            defaultValue={search ?? ""}
            placeholder="Search by name or city…"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-64"
          />
          <button type="submit" className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            Search
          </button>
        </form>
      </div>

      {mosques.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No mosques found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mosques.map((m: any) => (
            <Link key={m.id} href={`/mosques/${m.slug}`}>
              <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base line-clamp-2">{m.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-1">{m.city}, {m.countryCode}</p>
                  <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                    m.status === "ONLINE" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {m.status}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
