"use client";
import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
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
      content?: { messages?: { content: string }[] };
    };
  };
  today: PrayerDay | null;
  tomorrow: PrayerDay | null;
  flashMessages?: { content: string }[];
}

interface MosqueData {
  id: string; name: string; city?: string;
  latitude: number; longitude: number; status: string;
  logoUrl?: string;
}

interface Props { mosque: MosqueData; widget: WidgetData | null }

const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const PRAYER_LABELS: Record<string, string> = {
  fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha",
};
const PRAYER_LABELS_AR: Record<string, string> = {
  fajr: "الفجر", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء",
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function ClassicDisplayClient({ mosque, widget: initialWidget }: Props) {
  const [widget, setWidget] = useState<WidgetData | null>(initialWidget);
  const [now, setNow]       = useState(new Date());
  const [temperature, setTemperature] = useState<number | null>(null);
  const [displayUrl, setDisplayUrl]   = useState("");
  const [flashIndex, setFlashIndex]   = useState(0);

  useEffect(() => { setDisplayUrl(window.location.origin + window.location.pathname.replace("/classic", "")); }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

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

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`${API}/mosques/${mosque.id}/widget`);
        if (res.ok) { const json = await res.json(); setWidget(json.data); }
      } catch {}
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [mosque.id]);

  const today  = widget?.today ?? null;
  const iqama  = widget?.mosque.config?.iqama ?? {};
  const jumua  = widget?.mosque.config?.jumua;
  const msgs   = widget?.flashMessages ?? widget?.mosque.config?.content?.messages ?? [];

  // Cycle flash messages every 4 seconds
  useEffect(() => {
    if (msgs.length < 2) return;
    const id = setInterval(() => setFlashIndex(i => (i + 1) % msgs.length), 4000);
    return () => clearInterval(id);
  }, [msgs.length]);

  const hijriDateEn = new Intl.DateTimeFormat("en-TN-u-ca-islamic-umalqura", {
    day: "numeric", month: "long", year: "numeric",
  }).format(now);

  const hijriDateAr = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
    day: "numeric", month: "long", year: "numeric",
  }).format(now);

  const clockHMS = now.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });

  const prayers = today
    ? PRAYER_KEYS.map((key) => ({
        key,
        label:     PRAYER_LABELS[key],
        labelAr:   PRAYER_LABELS_AR[key],
        adhan:     today[key],
        iqamaTime: addMinutes(today[key], (iqama as Record<string, number>)[key] ?? 0),
      }))
    : [];

  const tomorrowFajr = widget?.tomorrow ? { fajr: widget.tomorrow.fajr } : null;
  const nextPrayer: NextPrayer | null = today
    ? getNextPrayer(prayers.map((p) => ({ key: p.key, label: p.label, adhan: p.adhan })), now, tomorrowFajr)
    : null;

  const countdown = nextPrayer ? formatCountdown(nextPrayer.secondsUntil) : null;
  const flashText = msgs.length > 0 ? msgs[flashIndex]?.content : null;

  return (
    <div className="starfield relative h-screen w-screen overflow-hidden text-white flex flex-col select-none">

      {/* ── Top bar: logo · mosque name · arabic hijri · temp ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-2 shrink-0 gap-4">
        {/* Logo */}
        <div className="w-14 h-14 flex items-center justify-center shrink-0">
          {mosque.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mosque.logoUrl} alt={mosque.name} className="w-14 h-14 object-contain rounded-lg" />
          ) : (
            <div className="w-10 h-10 rounded-full border-2 border-yellow-500/60 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-yellow-500" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C10.34 2 9 3.34 9 5c0 1.1.6 2.05 1.5 2.58V9H7V7H5v2H2v2h1v9h18v-9h1V9h-3V7h-2v2h-3V7.58C14.4 7.05 15 6.1 15 5c0-1.66-1.34-3-3-3zm0 13a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
              </svg>
            </div>
          )}
        </div>

        {/* Mosque name */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-wider uppercase text-center flex-1 leading-tight">
          {mosque.name}
        </h1>

        {/* Arabic Hijri date */}
        <div className="text-right shrink-0 min-w-[200px]">
          <p className="text-yellow-400 font-semibold text-lg leading-tight" dir="rtl">{hijriDateAr}</p>
          <p className="text-gray-400 text-xs mt-0.5">{hijriDateEn}</p>
        </div>

        {/* Temperature */}
        <div className="text-orange-400 font-bold text-xl shrink-0 w-16 text-right">
          {temperature !== null ? `${temperature}°C` : "--°C"}
        </div>
      </div>

      {/* ── Middle row: Shuruq | Clock | Jumua ── */}
      <div className="flex items-center justify-between px-8 flex-1 min-h-0">

        {/* Shuruq */}
        <div className="text-center w-44">
          <p className="text-base text-gray-400 mb-1 tracking-wide">Shurûq</p>
          <p className="text-sm text-gray-500 mb-2" dir="rtl">الشروق</p>
          <p className="text-4xl font-bold tabular-nums">{today?.shuruq ?? "--:--"}</p>
        </div>

        {/* Center: clock + countdown */}
        <div className="flex flex-col items-center gap-4">
          <div className="bg-purple-900/80 border border-purple-700/50 rounded-2xl px-12 py-6 text-center shadow-2xl shadow-purple-900/60 backdrop-blur-sm">
            <div className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tight">{clockHMS}</div>
            <div className="text-purple-200 mt-2 text-base tracking-wide">{hijriDateEn}</div>
          </div>
          {nextPrayer && countdown && (
            <div className="text-center text-base text-gray-300 tracking-wide">
              <span className="font-semibold text-white">{nextPrayer.label}</span>
              <span className="text-gray-400"> in </span>
              <span className="font-bold text-yellow-300 tabular-nums">{countdown}</span>
            </div>
          )}
        </div>

        {/* Jumua */}
        <div className="text-center w-44">
          <p className="text-base text-gray-400 mb-1 tracking-wide">Jumua</p>
          <p className="text-sm text-gray-500 mb-2" dir="rtl">الجمعة</p>
          <p className="text-4xl font-bold tabular-nums">{jumua?.time1 ?? "--:--"}</p>
          {jumua?.jumua2Enabled && jumua.time2 && (
            <p className="text-2xl font-semibold text-gray-300 tabular-nums mt-1">{jumua.time2}</p>
          )}
        </div>
      </div>

      {/* ── Prayer columns ── */}
      <div className="flex justify-around items-end px-6 pb-4 shrink-0">
        {prayers.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No prayer schedule available</p>
        ) : (
          prayers.map(({ key, label, labelAr, adhan, iqamaTime }) => {
            const isNext = nextPrayer?.key === key;
            return (
              <div
                key={key}
                className={`flex flex-col items-center rounded-xl px-6 py-4 min-w-[110px] transition-all duration-500 ${
                  isNext
                    ? "bg-purple-900/90 border border-purple-600/60 shadow-lg shadow-purple-900/50"
                    : "bg-white/5 border border-white/10"
                }`}
              >
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-xs text-yellow-500/70 mb-2" dir="rtl">{labelAr}</p>
                <p className="text-2xl font-bold tabular-nums">{adhan}</p>
                <p className="text-sm text-gray-300 tabular-nums mt-1">{iqamaTime}</p>
              </div>
            );
          })
        )}
      </div>

      {/* ── Bottom: flash ticker + QR ── */}
      <div className="flex items-center shrink-0 border-t border-white/10 bg-black/40">
        {/* Flash message */}
        <div className="flex-1 h-10 overflow-hidden flex items-center">
          {flashText ? (
            <span className="marquee text-sm text-gray-300 px-4 whitespace-nowrap">{flashText}</span>
          ) : (
            <span className="text-xs text-gray-600 px-4">mawaqit.net</span>
          )}
        </div>

        {/* QR code */}
        {displayUrl && (
          <div className="px-3 py-1.5 flex items-center gap-2 border-l border-white/10">
            <QRCodeSVG value={displayUrl} size={36} bgColor="transparent" fgColor="#eab308" level="M" />
            <span className="text-xs text-gray-500">Scan</span>
          </div>
        )}
      </div>
    </div>
  );
}
