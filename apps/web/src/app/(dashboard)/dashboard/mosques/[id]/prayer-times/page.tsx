"use client";
import { use, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

const timeSchema = z.object({
  fajr: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM"),
  shuruq: z.string().optional().or(z.literal("")),
  dhuhr: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM"),
  asr: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM"),
  maghrib: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM"),
  isha: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM"),
});

type TimeForm = z.infer<typeof timeSchema>;

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const PRAYERS = ["fajr","shuruq","dhuhr","asr","maghrib","isha"] as const;

// ── CSV parser ────────────────────────────────────────────────────────────────
function parsePrayerCsv(text: string): Array<{
  day: number; fajr: string; shuruq: string; dhuhr: string; asr: string; maghrib: string; isha: string;
}> {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) throw new Error("CSV file is empty.");

  const sep = lines[0].includes(";") ? ";" : ",";
  const firstCols = lines[0].split(sep).map((c) => c.trim().toLowerCase());
  const isHeader = isNaN(Number(firstCols[0]));
  const dataLines = isHeader ? lines.slice(1) : lines;

  if (!dataLines.length) throw new Error("No data rows found after header.");

  const days: ReturnType<typeof parsePrayerCsv> = [];
  const timeRe = /^\d{2}:\d{2}$/;

  for (let i = 0; i < dataLines.length; i++) {
    const cols = dataLines[i].split(sep).map((c) => c.trim());
    if (cols.every((c) => !c)) continue; // skip blank lines
    if (cols.length < 7) throw new Error(`Row ${i + (isHeader ? 2 : 1)}: expected 7 columns, got ${cols.length}.`);
    const day = parseInt(cols[0], 10);
    if (isNaN(day) || day < 1 || day > 31) throw new Error(`Row ${i + (isHeader ? 2 : 1)}: invalid day "${cols[0]}".`);
    const [fajr, shuruq, dhuhr, asr, maghrib, isha] = cols.slice(1, 7);
    for (const [field, val] of [["Fajr", fajr], ["Shuruk", shuruq], ["Duhr", dhuhr], ["Asr", asr], ["Maghrib", maghrib], ["Isha", isha]] as const) {
      if (!timeRe.test(val)) throw new Error(`Row ${i + (isHeader ? 2 : 1)}, ${field}: "${val}" is not HH:MM.`);
    }
    days.push({ day, fajr, shuruq, dhuhr, asr, maghrib, isha });
  }

  if (!days.length) throw new Error("No valid rows found.");
  return days;
}

// ── Template download ─────────────────────────────────────────────────────────
function downloadTemplate(month: number, year: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const rows = ["Day,Fajr,Shuruk,Duhr,Asr,Maghrib,Isha"];
  for (let d = 1; d <= daysInMonth; d++) {
    rows.push(`${String(d).padStart(2, "0")},,,,,,`);
  }
  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${String(month).padStart(2, "0")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Month table ───────────────────────────────────────────────────────────────

function MonthTable({ mosqueId, year, month, accessToken }: {
  mosqueId: string; year: number; month: number; accessToken: string | null;
}) {
  const [open, setOpen] = useState(month === new Date().getMonth() + 1);
  const [editingDay, setEditingDay] = useState<any | null>(null);
  const [apiError, setApiError] = useState("");
  const [csvInfo, setCsvInfo] = useState(false);
  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const qKey = ["prayer-times", mosqueId, year, month];

  const { data, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: async () => {
      const res = await api.get(`/mosques/${mosqueId}/prayer-times/${year}/${month}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return (res.data.data?.days ?? []) as any[];
    },
    enabled: !!accessToken && open,
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<TimeForm>({
    resolver: zodResolver(timeSchema),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ day, body }: { day: number; body: TimeForm }) => {
      await api.patch(`/mosques/${mosqueId}/prayer-times/${year}/${month}/${day}`, body, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qKey }); setEditingDay(null); setApiError(""); },
    onError: (e: any) => setApiError(e.response?.data?.error?.message ?? "Failed."),
  });

  const csvMutation = useMutation({
    mutationFn: async (days: any[]) => {
      await api.patch(`/mosques/${mosqueId}/prayer-times/${year}/${month}`, { days }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qKey });
      setCsvError("");
      setCsvSuccess(`${MONTHS[month - 1]} imported successfully.`);
      setCsvInfo(false);
      setTimeout(() => setCsvSuccess(""), 4000);
    },
    onError: (e: any) => setCsvError(e.response?.data?.error?.message ?? "Upload failed."),
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/mosques/${mosqueId}/prayer-times/${year}/${month}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qKey }); setConfirmClear(false); },
    onError: (e: any) => setApiError(e.response?.data?.error?.message ?? "Failed to clear."),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const days = parsePrayerCsv(ev.target?.result as string);
        csvMutation.mutate(days);
      } catch (err: any) {
        setCsvError(err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const openEdit = (day: any) => {
    setEditingDay(day);
    reset({ fajr: day.fajr ?? "", shuruq: day.shuruq ?? "", dhuhr: day.dhuhr ?? "", asr: day.asr ?? "", maghrib: day.maghrib ?? "", isha: day.isha ?? "" });
  };

  const today = new Date().getDate();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return (
    <div className="border border-border rounded overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium bg-[#ddd6f8] hover:bg-[#ccc4f0] transition-colors"
      >
        <span>{MONTHS[month - 1]}</span>
        <span className="text-muted-foreground text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="bg-white border-t border-border">
          {/* Action buttons */}
          <div className="p-3 flex flex-wrap gap-2 border-b border-border items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              type="button"
              disabled={csvMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium text-white rounded"
              style={{ background: csvMutation.isPending ? "#a0c4cc" : "#29b6d0", cursor: csvMutation.isPending ? "not-allowed" : "pointer" }}
            >
              {csvMutation.isPending ? "Importing…" : "Pre-populate from a csv file"}
            </button>
            <button
              type="button"
              className="px-2 py-1.5 text-xs font-medium text-blue-700 border border-blue-300 rounded hover:bg-blue-50"
              onClick={() => { setCsvInfo(!csvInfo); setCsvError(""); }}
              title="Show CSV format info"
            >
              ℹ️ Format
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium text-white rounded bg-gray-500 hover:bg-gray-600"
              onClick={() => setConfirmClear(true)}
            >
              Empty current month
            </button>
            {csvSuccess && <span className="text-xs text-green-600 font-medium">{csvSuccess}</span>}
            {csvError && <span className="text-xs text-red-500">{csvError}</span>}
          </div>

          {/* CSV info panel */}
          {csvInfo && (
            <div className="m-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 space-y-2">
              <p className="font-semibold">Info! A CSV file is a text file with values separated by a comma or semicolon.</p>
              <p className="font-medium">The CSV file must respect the following format:</p>
              <pre className="bg-white border border-blue-200 rounded p-2 text-xs leading-relaxed whitespace-pre-wrap">
{`Day,Fajr,Shuruk,Duhr,Asr,Maghrib,Isha
01,06:49,08:44,12:55,14:47,17:08,18:47
02,06:49,08:44,12:56,14:48,17:09,18:48
03,06:49,08:44,12:56,14:49,17:10,18:49
04,06:49,08:44,12:57,14:50,17:11,18:50
05,06:49,08:44,12:57,14:51,17:12,18:51
...`}
              </pre>
              <p>Header row is optional. Times must be in HH:MM format. Commas and semicolons both accepted.</p>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => downloadTemplate(month, year)}
                  className="text-blue-700 underline font-medium hover:text-blue-900 text-left"
                >
                  Download blank CSV template for {MONTHS[month - 1]}
                </button>
                <a
                  href="/csv-prayer-times-template.zip"
                  download="csv-prayer-times-template.zip"
                  className="text-blue-700 underline font-medium hover:text-blue-900"
                >
                  Download all 12 months templates (ZIP)
                </a>
              </div>
            </div>
          )}

          {/* Clear confirmation */}
          {confirmClear && (
            <div className="mx-3 my-2 p-3 bg-red-50 border border-red-200 rounded text-sm flex items-center gap-3">
              <span>Delete all prayer times for {MONTHS[month - 1]}?</span>
              <Button size="sm" variant="destructive" onClick={() => clearMutation.mutate()} disabled={clearMutation.isPending}>
                {clearMutation.isPending ? "Clearing…" : "Yes, empty"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmClear(false)}>Cancel</Button>
            </div>
          )}

          {/* Inline edit form */}
          {editingDay && (
            <div className="p-4 bg-blue-50 border-b border-border">
              <p className="text-sm font-medium mb-3">Editing Day {editingDay.day}</p>
              <form onSubmit={handleSubmit((d) => updateMutation.mutate({ day: editingDay.day, body: d }))} className="space-y-3">
                <div className="grid grid-cols-6 gap-2">
                  {PRAYERS.map((p) => (
                    <div key={p} className="space-y-1">
                      <label className="text-xs font-medium capitalize">{p}</label>
                      <Input placeholder="HH:MM" className="text-xs h-8 bg-white" {...register(p as any)} />
                    </div>
                  ))}
                </div>
                {apiError && <p className="text-xs text-red-500">{apiError}</p>}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" style={{ background: "#6200ea" }} disabled={isSubmitting}>Save</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingDay(null)}>Cancel</Button>
                </div>
              </form>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : !data?.length ? (
            <p className="p-4 text-sm text-muted-foreground">No prayer schedule for this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">Day</th>
                    {PRAYERS.map((p) => (
                      <th key={p} className="px-3 py-2 text-xs font-semibold text-muted-foreground capitalize">{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((day: any) => {
                    const isToday = year === currentYear && month === currentMonth && day.day === today;
                    return (
                      <tr
                        key={day.day}
                        className={`border-t border-border hover:bg-muted/30 cursor-pointer transition-colors ${isToday ? "font-semibold text-primary" : ""} ${editingDay?.day === day.day ? "bg-blue-50" : ""}`}
                        onClick={() => openEdit(day)}
                      >
                        <td className={`px-3 py-1.5 ${isToday ? "text-orange-500 font-bold" : ""}`}>{day.day}</td>
                        {PRAYERS.map((p) => (
                          <td key={p} className={`px-3 py-1.5 font-mono text-xs ${isToday ? "text-orange-500" : "text-muted-foreground"}`}>
                            {day[p] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PrayerTimesPage({ params }: Props) {
  const { id } = use(params);
  const { accessToken } = useAuthStore();
  const now = new Date();
  const year = now.getFullYear();

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/mosques/${id}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ← Back
        </Link>
        <h2 className="text-xl font-semibold">Timetable — {year}</h2>
      </div>

      <div className="space-y-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
          <MonthTable key={month} mosqueId={id} year={year} month={month} accessToken={accessToken} />
        ))}
      </div>
    </div>
  );
}
