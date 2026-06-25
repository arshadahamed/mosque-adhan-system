"use client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { YesNoToggle } from "@/components/ui/toggle";
import { AccordionSection } from "@/components/ui/accordion";

const schema = z.object({
  name: z.string().min(2, "Name required"),
  slug: z.string().min(2, "Slug required").regex(/^[a-z0-9-]+$/, "Lowercase, numbers, hyphens only").optional().or(z.literal("")),
  type: z.enum(["MOSQUE", "MUSALLA", "HOME"]),
  address: z.string().min(1, "Address required"),
  city: z.string().min(1, "City required"),
  zipcode: z.string().optional().or(z.literal("")),
  countryCode: z.string().length(2, "2-letter country code"),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  timezone: z.string().min(1, "Timezone required"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  associationName: z.string().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

const FACILITIES = [
  { key: "hasParking", label: "Parking", desc: "Parking space available" },
  { key: "hasWomenSection", label: "Women section", desc: "Dedicated section for women" },
  { key: "hasWheelchairAccess", label: "Wheelchair access", desc: "Wheelchair-accessible entrance and facilities" },
  { key: "hasWuduFacilities", label: "Wudu facilities", desc: "Ablution facilities on-site" },
  { key: "hasQuranClasses", label: "Quranic classes", desc: "Quranic education programs" },
  { key: "hasFuneralServices", label: "Funeral services", desc: "Islamic funeral services" },
  { key: "hasFoodBank", label: "Food bank", desc: "Community food bank or charity" },
  { key: "hasCounsellingServices", label: "Counselling services", desc: "Islamic counselling available" },
];

export default function NewMosquePage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [error, setError] = useState("");
  const [facilities, setFacilities] = useState<Record<string, boolean>>({});

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "MOSQUE", countryCode: "LK", timezone: "Asia/Colombo" },
  });

  const nameValue = watch("name") ?? "";
  const autoSlug = nameValue.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      const body: any = { ...data, ...facilities };
      if (!body.slug) body.slug = autoSlug;
      if (!body.latitude) { body.latitude = 0; body.longitude = 0; }
      const res = await api.post("/mosques", body, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      router.push(`/dashboard/mosques/${res.data.data.id}`);
    } catch (e: any) {
      setError(e.response?.data?.error?.message ?? "Failed to create mosque.");
    }
  };

  const toggleFacility = (key: string) => setFacilities((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/mosques" className="text-sm text-primary hover:underline">◀ Back</Link>
        <h2 className="text-2xl font-bold">Add mosque</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* Main info */}
        <div className="bg-white border border-border rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">Mosque information</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium">Mosque Name <span className="text-red-500">*</span></label>
              <Input placeholder="Al Azhar Mosque" className="mt-1 bg-white" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Slug</label>
              <Input placeholder={autoSlug || "al-azhar-colombo"} className="mt-1 bg-white" {...register("slug")} />
              <p className="text-xs text-muted-foreground mt-0.5">Auto-generated from name if blank</p>
            </div>

            <div>
              <label className="text-sm font-medium">Type <span className="text-red-500">*</span></label>
              <select {...register("type")} className="mt-1 w-full h-10 rounded border border-border bg-white px-3 text-sm">
                <option value="MOSQUE">Mosque</option>
                <option value="MUSALLA">Musalla</option>
                <option value="HOME">Home</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium">Address <span className="text-red-500">*</span></label>
              <Input placeholder="123 Main Street" className="mt-1 bg-white" {...register("address")} />
              {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">City <span className="text-red-500">*</span></label>
              <Input placeholder="Colombo" className="mt-1 bg-white" {...register("city")} />
              {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Postal Code</label>
              <Input placeholder="00100" className="mt-1 bg-white" {...register("zipcode")} />
            </div>

            <div>
              <label className="text-sm font-medium">Country Code <span className="text-red-500">*</span></label>
              <Input placeholder="LK" maxLength={2} className="mt-1 bg-white uppercase" {...register("countryCode")} />
              {errors.countryCode && <p className="text-xs text-red-500">{errors.countryCode.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Timezone <span className="text-red-500">*</span></label>
              <Input placeholder="Asia/Colombo" className="mt-1 bg-white" {...register("timezone")} />
              {errors.timezone && <p className="text-xs text-red-500">{errors.timezone.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input placeholder="+94 11 000 0000" className="mt-1 bg-white" {...register("phone")} />
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="mosque@example.com" className="mt-1 bg-white" {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium">Website</label>
              <Input placeholder="https://mosque.example.com" className="mt-1 bg-white" {...register("website")} />
              {errors.website && <p className="text-xs text-red-500">{errors.website.message}</p>}
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium">Association / Organisation name</label>
              <Input placeholder="Islamic Society of…" className="mt-1 bg-white" {...register("associationName")} />
            </div>
          </div>
        </div>

        {/* Facilities */}
        <AccordionSection title="Mosque Facilities & Services">
          <div className="grid grid-cols-1 gap-4">
            {FACILITIES.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center gap-3">
                <YesNoToggle value={!!facilities[key]} onChange={() => toggleFacility(key)} />
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </AccordionSection>

        {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 p-3 rounded">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" style={{ background: "#6200ea" }} disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Add mosque"}
          </Button>
          <Link href="/dashboard/mosques">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
