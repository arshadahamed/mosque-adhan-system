"use client";
import { motion } from "framer-motion";

interface PrayerDay {
  fajr: string;
  shuruq: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

interface WidgetData {
  mosque: { name: string; timezone: string };
  today: (PrayerDay & { year: number; month: number; day: number }) | null;
  tomorrow: (PrayerDay & { year: number; month: number; day: number }) | null;
}

const PRAYERS = [
  { key: "fajr", label: "Fajr" },
  { key: "shuruq", label: "Shuruq" },
  { key: "dhuhr", label: "Dhuhr" },
  { key: "asr", label: "Asr" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isha", label: "Isha" },
] as const;

export function PrayerTimesWidget({ widget }: { widget: WidgetData }) {
  const today = widget.today;
  if (!today) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-6 text-center text-muted-foreground">
        No prayer schedule available for today.
      </div>
    );
  }

  const dateStr = new Date(today.year, today.month - 1, today.day).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="bg-linear-to-r from-emerald-700 to-teal-700 text-white px-6 py-4">
        <h2 className="font-semibold text-lg">Prayer Times</h2>
        <p className="text-emerald-100 text-sm">{dateStr}</p>
      </div>
      <div className="divide-y divide-border">
        {PRAYERS.map((p, i) => (
          <motion.div
            key={p.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
          >
            <span className="font-medium">{p.label}</span>
            <span className="text-xl font-bold tabular-nums">{today[p.key]}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
