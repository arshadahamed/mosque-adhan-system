"use client";
import { useState, useEffect, useCallback } from "react";
import { addMinutes, formatCountdown, getNextPrayer, type NextPrayer } from "@/lib/display-utils";

interface PrayerDay {
  year: number; month: number; day: number;
  fajr: string; shuruq: string; dhuhr: string; asr: string; maghrib: string; isha: string;
}

interface WidgetData {
  mosque: {
    id: string; slug: string; name: string; timezone: string;
    config?: {
      iqama?: { fajr?: number; dhuhr?: number; asr?: number; maghrib?: number; isha?: number };
      jumua?: { time1?: string; time2?: string; jumua2Enabled?: boolean };
    };
  };
  today: PrayerDay | null;
  tomorrow: PrayerDay | null;
  flashMessages?: { content: string }[];
}

interface MosqueData {
  id: string; name: string; latitude: number; longitude: number; status: string;
}

interface Props { mosque: MosqueData; widget: WidgetData | null }

const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const PRAYER_LABELS: Record<string, string> = {
  fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha",
};
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function DisplayClient({ mosque, widget: initialWidget }: Props) {
  const [widget, setWidget] = useState<WidgetData | null>(initialWidget);
  const [now, setNow] = useState(new Date());
  const [temperature, setTemperature] = useState<number | null>(null);

  // 1-second clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Temperature polling — every 5 minutes
  const fetchTemp = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${mosque.latitude}&longitude=${mosque.longitude}&current=temperature_2m&temperature_unit=celsius`
      );
      const json = await res.json();
      setTemperature(Math.round(json.current.temperature_2m));
    } catch {}
  }, [mosque.latitude, mosque.longitude]);

  useEffect(() => {
    fetchTemp();
    const id = setInterval(fetchTemp, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchTemp]);

  // Prayer data refresh — every 10 minutes (handles midnight rollover)
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`${API}/mosques/${mosque.id}/widget`);
        if (res.ok) {
          const json = await res.json();
          setWidget(json.data);
        }
      } catch {}
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [mosque.id]);

  // Derived values
  const today = widget?.today ?? null;
  const iqama = widget?.mosque.config?.iqama ?? {};
  const jumua = widget?.mosque.config?.jumua;
  const flashMessages = widget?.flashMessages ?? [];

  const hijriDate = new Intl.DateTimeFormat("en-TN-u-ca-islamic-umalqura", {
    day: "numeric", month: "long", year: "numeric",
  }).format(now);

  const clockHMS = now.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });

  const prayers = today
    ? PRAYER_KEYS.map((key) => ({
        key,
        label: PRAYER_LABELS[key],
        adhan: today[key],
        iqamaTime: addMinutes(today[key], (iqama as Record<string, number>)[key] ?? 0),
      }))
    : [];

  const tomorrowFajr = widget?.tomorrow ? { fajr: widget.tomorrow.fajr } : null;
  const nextPrayer: NextPrayer | null = today
    ? getNextPrayer(prayers.map((p) => ({ key: p.key, label: p.label, adhan: p.adhan })), now, tomorrowFajr)
    : null;

  const countdown = nextPrayer ? formatCountdown(nextPrayer.secondsUntil) : null;
  const flashText = flashMessages.length > 0
    ? flashMessages.map((m) => m.content).join("   ·   ")
    : null;

  return (
    <div className="starfield relative h-screen w-screen overflow-hidden text-white flex flex-col select-none">

      {/* ── Top bar: online · mosque name · temperature ── */}
      <div className="flex items-center justify-between px-6 pt-5 shrink-0">
        <div className="flex items-center gap-2 w-32">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 uppercase tracking-widest font-medium">Online</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-wider uppercase text-center flex-1 px-4 leading-tight">
          {mosque.name}
        </h1>
        <div className="text-orange-400 font-bold text-xl w-32 text-right">
          {temperature !== null ? `${temperature}°C` : "--°C"}
        </div>
      </div>

      {/* ── Middle row: Shuruq | Clock+Hijri | Jumua ── */}
      <div className="flex items-center justify-between px-8 flex-1 min-h-0">

        {/* Shuruq */}
        <div className="text-center w-44">
          <p className="text-base text-gray-400 mb-2 tracking-wide">Shurûq</p>
          <p className="text-4xl font-bold tabular-nums">{today?.shuruq ?? "--:--"}</p>
        </div>

        {/* Center: clock + Hijri + countdown */}
        <div className="flex flex-col items-center gap-4">
          <div className="bg-purple-900/80 border border-purple-700/50 rounded-2xl px-12 py-6 text-center shadow-2xl shadow-purple-900/60 backdrop-blur-sm">
            <div className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tight">{clockHMS}</div>
            <div className="text-purple-200 mt-3 text-base tracking-wide">{hijriDate}</div>
          </div>
          {nextPrayer && countdown && (
            <div className="text-center text-base text-gray-300 tracking-wide">
              <span className="mr-2">🕌</span>
              <span className="font-semibold text-white">{nextPrayer.label}</span>
              <span className="text-gray-400"> in </span>
              <span className="font-bold text-yellow-300 tabular-nums">{countdown}</span>
              <span className="ml-2">🕌</span>
            </div>
          )}
        </div>

        {/* Jumua */}
        <div className="text-center w-44">
          <p className="text-base text-gray-400 mb-2 tracking-wide">Jumua</p>
          <p className="text-4xl font-bold tabular-nums">{jumua?.time1 ?? "--:--"}</p>
          {jumua?.jumua2Enabled && jumua.time2 && (
            <p className="text-2xl font-semibold text-gray-300 tabular-nums mt-1">{jumua.time2}</p>
          )}
        </div>
      </div>

      {/* ── Prayer columns: Fajr Dhuhr Asr Maghrib Isha ── */}
      <div className="flex justify-around items-end px-6 pb-6 shrink-0">
        {prayers.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No prayer schedule available</p>
        ) : (
          prayers.map(({ key, label, adhan, iqamaTime }) => {
            const isNext = nextPrayer?.key === key;
            return (
              <div
                key={key}
                className={`flex flex-col items-center rounded-xl px-6 py-4 min-w-27.5 transition-all duration-500 ${
                  isNext
                    ? "bg-purple-900/90 border border-purple-600/60 shadow-lg shadow-purple-900/50"
                    : "bg-transparent"
                }`}
              >
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">{label}</p>
                <p className="text-2xl font-bold tabular-nums">{adhan}</p>
                <p className="text-base text-gray-300 tabular-nums mt-1">{iqamaTime}</p>
              </div>
            );
          })
        )}
      </div>

      {/* ── Flash message ticker ── */}
      {flashText && (
        <div className="bg-black/50 border-t border-white/10 h-9 overflow-hidden shrink-0 flex items-center">
          <span className="marquee text-sm text-gray-300 px-4 whitespace-nowrap">
            {flashText}
          </span>
        </div>
      )}
    </div>
  );
}
