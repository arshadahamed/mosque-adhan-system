"use client";
import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { addMinutes, formatCountdown, getNextPrayer, applyHijriAdjust, type NextPrayer } from "@/lib/display-utils";

// ── interfaces ──────────────────────────────────────────────────────────────────
interface PrayerDay {
  year: number; month: number; day: number;
  fajr: string; shuruq: string; dhuhr: string; asr: string; maghrib: string; isha: string;
}
interface WidgetData {
  mosque: {
    id: string; slug: string; name: string; timezone: string;
    config?: {
      regional?: { timeFormat?: string; tempUnit?: string };
      iqama?: { fajr?: number; dhuhr?: number; asr?: number; maghrib?: number; isha?: number; enabled?: boolean };
      jumua?: { time1?: string; time2?: string; enabled?: boolean };
      display?: { wallpaper?: string; bgImageUrl?: string; bgColor?: string; theme?: string };
      content?: { messages?: { content: string }[] };
    };
  };
  today: PrayerDay | null;
  tomorrow: PrayerDay | null;
  flashMessages?: { content: string }[];
}
interface MosqueData {
  id: string; name: string; city?: string; latitude: number; longitude: number; status: string;
  logoUrl?: string; associationName?: string;
}
interface Props { mosque: MosqueData; widget: WidgetData | null }

// ── constants ───────────────────────────────────────────────────────────────────
const DARK      = "#06080a";
const GOLD      = "#c8a84a";
const GOLD_DIM  = "rgba(200,168,74,0.22)";
const GOLD_LINE = "rgba(200,168,74,0.45)";
const GREEN     = "#22c55e";
const GREEN_DIM = "rgba(34,197,94,0.15)";
const RED       = "#ef4444";
const WHITE     = "#f2f2f0";
const MUTED     = "rgba(242,242,240,0.5)";
const MONO      = "var(--font-orbitron), 'Courier New', monospace";
const CLOCK     = "var(--font-bebas), 'Bebas Neue', impact, sans-serif";
const API       = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const DEFAULT_QUOTE = "And establish prayer and give zakah and bow with those who bow.";
const DEFAULT_REF   = "— Al-Baqarah 2:43";

const WALLPAPER_BG: Record<string, string> = {
  "void":        "linear-gradient(135deg,#080808,#141414)",
  "dark-purple": "linear-gradient(135deg,#1a0533,#3d0066)",
  "blue":        "linear-gradient(135deg,#0a1628,#1a3a5c)",
  "green":       "linear-gradient(135deg,#002200,#005500)",
  "cosmic":      "linear-gradient(135deg,#050510,#1a0a3c)",
  "teal":        "linear-gradient(135deg,#003333,#006666)",
  "charcoal":    "linear-gradient(135deg,#1c1c1c,#2d2d2d)",
  "amber":       "linear-gradient(135deg,#1a0a00,#3d1a00)",
  "dawn":        "linear-gradient(135deg,#0d0d1a,#2a1a2e)",
  "deep-sea":    "linear-gradient(135deg,#000033,#001a33)",
  "mosque":      "linear-gradient(135deg,#2c1810,#5c3a2a)",
  "night":       "linear-gradient(135deg,#050510,#0a0a1a)",
};

const THEME_COLORS: Record<string, { gold: string; green: string; card: string }> = {
  default: { gold: "#c8a84a", green: "#22c55e", card: "rgba(9,18,13,0.97)"  },
  dark:    { gold: "#9ca3af", green: "#6b7280", card: "rgba(5,5,5,0.98)"    },
  minimal: { gold: "#94a3b8", green: "#38bdf8", card: "rgba(8,12,18,0.97)"  },
  classic: { gold: "#d4a017", green: "#16a34a", card: "rgba(10,15,8,0.97)"  },
};

const PRAYER_CFG = [
  { key: "fajr",    label: "FAJR",    arabic: "الفجر",  isDark: true,  color: "#818cf8" },
  { key: "dhuhr",   label: "DHUHR",   arabic: "الظهر",  isDark: false, color: "#fbbf24" },
  { key: "asr",     label: "ASR",     arabic: "العصر",  isDark: false, color: "#fb923c" },
  { key: "maghrib", label: "MAGHRIB", arabic: "المغرب", isDark: false, color: "#f87171" },
  { key: "isha",    label: "ISHA",    arabic: "العشاء", isDark: true,  color: "#a78bfa" },
] as const;

// ── icons ────────────────────────────────────────────────────────────────────────
const IconMosque = ({ size = "1em", color = "currentColor" }) => (
  <svg viewBox="0 0 60 56" width={size} height={size} fill={color}>
    <ellipse cx="30" cy="22" rx="12" ry="9"/>
    <rect x="26" y="22" width="8" height="26" rx="1"/>
    <rect x="6" y="36" width="48" height="14" rx="3"/>
    <ellipse cx="30" cy="36" rx="13" ry="7"/>
    <rect x="12" y="40" width="5" height="8" rx="2" fill={DARK}/>
    <rect x="43" y="40" width="5" height="8" rx="2" fill={DARK}/>
    <rect x="27" y="10" width="6" height="12" rx="1"/>
    <circle cx="30" cy="8" r="4.5"/>
    <circle cx="32" cy="6.5" r="3.5" fill={DARK}/>
  </svg>
);
const IconClock = ({ size = "1em", color = "currentColor" }: { size?: string; color?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
  </svg>
);
const IconCrescent = ({ size = "1em", color = "currentColor" }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} fill={color}>
    <path d="M20 4 A16 16 0 1 0 36 20 A12 12 0 1 1 20 4 Z"/>
    <polygon points="27,6 29,12 35,12 30,16 32,22 27,18 22,22 24,16 19,12 25,12"/>
  </svg>
);
const IconSun = ({ size = "1em", color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" fill={color} stroke="none"/>
    {["12,2 12,5","19,12 22,12","12,19 12,22","4.22,4.22 6.34,6.34","17.66,17.66 19.78,19.78","4.22,19.78 6.34,17.66","17.66,6.34 19.78,4.22","2,12 5,12"].map((p, i) => <line key={i} x1={p.split(" ")[0].split(",")[0]} y1={p.split(" ")[0].split(",")[1]} x2={p.split(" ")[1].split(",")[0]} y2={p.split(" ")[1].split(",")[1]}/>)}
  </svg>
);
const IconMoon = ({ size = "1em", color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

// ── helpers ──────────────────────────────────────────────────────────────────────
function timeToSec(hhmm: string | undefined): number {
  if (!hhmm?.includes(":")) return -1;
  const [h, m] = hhmm.split(":").map(Number);
  return isNaN(h) || isNaN(m) ? -1 : h * 3600 + m * 60;
}

function fmtTime(time: string | undefined, is24h: boolean): { hm: string; ampm: string } {
  if (!time?.includes(":")) return { hm: "--:--", ampm: "" };
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return { hm: "--:--", ampm: "" };
  if (is24h) return { hm: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, ampm: "" };
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hm: `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")}`, ampm: h >= 12 ? "PM" : "AM" };
}

function validJumuaTime(t: string | undefined): string | undefined {
  if (!t?.trim()) return undefined;
  return timeToSec(t) > 0 ? t : undefined;
}

function getWeather(code: number | null): { label: string; icon: string } {
  if (code === null) return { label: "WEATHER",       icon: "—"  };
  if (code === 0)    return { label: "CLEAR SKY",     icon: "☀️" };
  if (code === 1)    return { label: "MAINLY CLEAR",  icon: "🌤️" };
  if (code === 2)    return { label: "PARTLY CLOUDY", icon: "⛅" };
  if (code === 3)    return { label: "OVERCAST",      icon: "☁️" };
  if (code <= 48)    return { label: "FOGGY",         icon: "🌫️" };
  if (code <= 55)    return { label: "DRIZZLE",       icon: "🌦️" };
  if (code <= 65)    return { label: "RAIN",          icon: "🌧️" };
  if (code <= 75)    return { label: "SNOW",          icon: "❄️" };
  if (code <= 82)    return { label: "SHOWERS",       icon: "🌦️" };
  return             { label: "THUNDERSTORM",         icon: "⛈️" };
}

// ── main component ───────────────────────────────────────────────────────────────
export function ClassicDisplayClient({ mosque, widget: initial }: Props) {
  const [widget, setWidget] = useState<WidgetData | null>(initial);
  const [now, setNow]       = useState<Date | null>(null);
  const [temp, setTemp]     = useState<number | null>(null);
  const [wCode, setWCode]   = useState<number | null>(null);
  const [displayUrl, setDisplayUrl] = useState("");
  const [flashIndex, setFlashIndex] = useState(0);

  useEffect(() => { setNow(new Date()); const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { setDisplayUrl(window.location.href); }, []);

  const fetchWeather = useCallback(async () => {
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${mosque.latitude}&longitude=${mosque.longitude}&current=temperature_2m,weather_code&temperature_unit=celsius`);
      const j = await r.json();
      setTemp(Math.round(j.current.temperature_2m));
      setWCode(j.current.weather_code ?? null);
    } catch {}
  }, [mosque.latitude, mosque.longitude]);

  useEffect(() => { fetchWeather(); const id = setInterval(fetchWeather, 5 * 60 * 1000); return () => clearInterval(id); }, [fetchWeather]);

  useEffect(() => {
    const id = setInterval(async () => {
      try { const r = await fetch(`${API}/mosques/${mosque.id}/widget`); if (r.ok) setWidget((await r.json()).data); } catch {}
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [mosque.id]);

  // ── config ───────────────────────────────────────────────────────────────────
  const today   = widget?.today ?? null;
  const iqamaCfg = widget?.mosque.config?.iqama ?? {};
  const iqamaEnabled = (iqamaCfg as { enabled?: boolean }).enabled !== false;
  const jumuaCfg = widget?.mosque.config?.jumua;
  const msgs = widget?.flashMessages ?? widget?.mosque.config?.content?.messages ?? [];

  // Cycle flash messages in ticker every 4 seconds
  useEffect(() => {
    if (msgs.length < 2) return;
    const id = setInterval(() => setFlashIndex(i => (i + 1) % msgs.length), 4_000);
    return () => clearInterval(id);
  }, [msgs.length]);

  const is24h = widget?.mosque.config?.regional?.timeFormat === "24";
  const tempUnit = widget?.mosque.config?.regional?.tempUnit === "F" ? "F" : "C";
  const hijriAdjustDays = (widget?.mosque.config?.regional as { hijriAdjust?: number } | undefined)?.hijriAdjust ?? 0;

  const dispCfg = widget?.mosque.config?.display as { wallpaper?: string; bgImageUrl?: string; bgColor?: string; theme?: string } | undefined;
  const bgImageUrl     = dispCfg?.bgImageUrl ?? "";
  const safeBgImageUrl = /^https?:\/\//.test(bgImageUrl) ? bgImageUrl : "";
  const containerBg: React.CSSProperties = safeBgImageUrl
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.65),rgba(0,0,0,0.65)), url(${safeBgImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : dispCfg?.bgColor
      ? { background: dispCfg.bgColor }
      : { background: WALLPAPER_BG[dispCfg?.wallpaper ?? "void"] ?? DARK };

  const activeTheme = THEME_COLORS[dispCfg?.theme ?? "default"] ?? THEME_COLORS.default;
  const tGOLD       = activeTheme.gold;
  const tGREEN      = activeTheme.green;
  const tCARD       = activeTheme.card;
  const tGOLD_DIM   = `rgba(${parseInt(tGOLD.slice(1,3),16)},${parseInt(tGOLD.slice(3,5),16)},${parseInt(tGOLD.slice(5,7),16)},0.22)`;
  const tGOLD_LINE  = `rgba(${parseInt(tGOLD.slice(1,3),16)},${parseInt(tGOLD.slice(3,5),16)},${parseInt(tGOLD.slice(5,7),16)},0.45)`;
  const tGREEN_DIM  = `rgba(${parseInt(tGREEN.slice(1,3),16)},${parseInt(tGREEN.slice(3,5),16)},${parseInt(tGREEN.slice(5,7),16)},0.15)`;

  const card: React.CSSProperties = { background: tCARD, border: `1px solid ${tGOLD_DIM}`, borderRadius: "14px", overflow: "hidden" };
  const pill = (bg: string, color: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", padding: "0.35vh 1.1vw",
    background: bg, color, borderRadius: "99px", fontSize: "0.95vw", fontWeight: 800, letterSpacing: "0.18em", whiteSpace: "nowrap",
  });

  // ── derived clock values ─────────────────────────────────────────────────────
  let clockHM = "--:--", ampm = "", secs = "--", hijriEn = "", hijriAr = "", dayLabel = "", gregDate = "";
  if (now) {
    if (is24h) {
      const t = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      const parts = t.split(":");
      clockHM = `${parts[0]}:${parts[1]}`; secs = parts[2]; ampm = "";
    } else {
      const t = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
      const sp = t.lastIndexOf(" "); ampm = t.slice(sp + 1);
      const p = t.slice(0, sp).split(":");
      clockHM = `${p[0]}:${p[1]}`; secs = p[2];
    }
    dayLabel = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    gregDate = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
    const hijriNow = applyHijriAdjust(now, hijriAdjustDays);
    hijriEn = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" })
                .format(hijriNow).replace(" AH", "").toUpperCase();
    try { hijriAr = new Intl.DateTimeFormat("ar-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" }).format(hijriNow); } catch {}
  }

  // ── prayers ──────────────────────────────────────────────────────────────────
  const prayers = today
    ? PRAYER_CFG.map((pc) => ({
        ...pc,
        adhan:     today[pc.key as keyof PrayerDay] as string,
        iqamaTime: iqamaEnabled
          ? addMinutes(today[pc.key as keyof PrayerDay] as string, (iqamaCfg as Record<string, number>)[pc.key] ?? 0)
          : today[pc.key as keyof PrayerDay] as string,
      }))
    : [];

  const tomorrowFajr = widget?.tomorrow ? { fajr: widget.tomorrow.fajr } : null;
  const nextPray: NextPrayer | null = (today && now)
    ? getNextPrayer(prayers.map(p => ({ key: p.key, label: p.label, adhan: p.adhan })), now, tomorrowFajr)
    : null;
  const nextData   = prayers.find(p => p.key === nextPray?.key);
  const countdown  = nextPray ? formatCountdown(nextPray.secondsUntil) : null;
  const [cH, cM, cS] = (countdown ?? "00:00:00").split(":");

  // ── Ramadan ───────────────────────────────────────────────────────────────────
  const isRamadan = (() => {
    if (!now) return false;
    try { return parseInt(new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { month: "numeric" }).format(now)) === 9; } catch { return false; }
  })();

  const weather   = getWeather(wCode);
  const cityLabel = mosque.city?.toUpperCase() ?? widget?.mosque.timezone?.split("/")[1]?.replace(/_/g, " ").toUpperCase() ?? "";

  const tickerText = msgs.length > 0
    ? msgs[flashIndex]?.content ?? ""
    : `${DEFAULT_QUOTE}   ${DEFAULT_REF}`;
  const tickerDuration = Math.max(30, Math.round(tickerText.length * 0.45) + 25);

  return (
    <>
      <style>{`
        @keyframes ticker-roll {
          from { transform: translateX(100vw); }
          to   { transform: translateX(-100%); }
        }
      `}</style>

      <div style={{ ...containerBg, color: WHITE, height: "100%", width: "100%", display: "flex", flexDirection: "column", overflow: "hidden", userSelect: "none" }}>

        {/* ═══ HEADER ══════════════════════════════════════════════════════════ */}
        <header style={{ display: "flex", alignItems: "center", gap: "1.2vw", padding: "1.1vh 1.8vw", borderBottom: `1px solid ${tGOLD_DIM}`, background: "rgba(0,0,0,0.5)", flexShrink: 0 }}>
          {/* Logo */}
          <div style={{ width: "5vw", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingRight: "1.2vw", borderRight: `1px solid ${tGOLD_DIM}` }}>
            {mosque.logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={mosque.logoUrl} alt={mosque.name} style={{ width: "4.5vh", height: "4.5vh", objectFit: "contain", borderRadius: "6px" }}/>
              : <IconMosque size="4.5vh" color={tGOLD}/>
            }
          </div>
          {/* Name + association */}
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.8vw", flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: "3vw", fontWeight: 900, letterSpacing: "0.04em", lineHeight: 1, whiteSpace: "nowrap" }}>
                {mosque.name.toUpperCase()}
              </h1>
              {cityLabel && <span style={{ color: tGOLD, fontSize: "1.8vw", fontWeight: 700, letterSpacing: "0.08em", flexShrink: 0 }}>· {cityLabel}</span>}
            </div>
            {mosque.associationName && (
              <div style={{ fontSize: "0.9vw", color: MUTED, letterSpacing: "0.1em", marginTop: "0.2vh", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {mosque.associationName}
              </div>
            )}
          </div>
          {/* Weather */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "0.8vw", background: "rgba(255,255,255,0.04)", border: `1px solid ${tGOLD_DIM}`, borderRadius: "12px", padding: "0.8vh 1.4vw" }}>
            <span style={{ fontSize: "3.5vw", lineHeight: 1 }}>{weather.icon}</span>
            <div>
              <div style={{ fontFamily: CLOCK, fontSize: "3vw", color: "#fbbf24", lineHeight: 1 }}>
                {temp !== null ? `${temp}°${tempUnit}` : "--°"}
              </div>
              <div style={{ fontSize: "0.8vw", color: tGOLD, letterSpacing: "0.12em", marginTop: "0.2vh" }}>{weather.label}</div>
            </div>
          </div>
        </header>

        {/* ═══ MIDDLE ══════════════════════════════════════════════════════════ */}
        <main style={{ display: "flex", flex: 1, minHeight: 0, gap: "1.2vw", padding: "1.2vh 1.5vw" }}>

          {/* ── LEFT CARD: next prayer + countdown ─────────────────────────── */}
          <div style={{ ...card, flex: "0 0 52vw", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Prayer name hero */}
            <div style={{ position: "relative", overflow: "hidden", flexShrink: 0, padding: "1vh 2vw 0.9vh", background: "linear-gradient(135deg,rgba(20,55,25,0.75) 0%,rgba(0,0,0,0) 65%)", borderBottom: `1px solid ${tGOLD_DIM}` }}>
              <div style={{ position: "absolute", right: "-1vw", top: "-1vh", opacity: 0.06, pointerEvents: "none" }}>
                <IconCrescent size="14vw" color={tGOLD}/>
              </div>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ marginBottom: "0.4vh" }}>
                  <span style={pill(`linear-gradient(90deg,${tGOLD},#e8c860)`, DARK)}>NEXT PRAYER</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
                  <div style={{ fontFamily: MONO, fontSize: "5.5vw", fontWeight: 900, lineHeight: 0.9, letterSpacing: "0.02em" }}>
                    {nextPray ? nextPray.label.toUpperCase() : "——"}
                  </div>
                  {nextData?.arabic && (
                    <div style={{ fontSize: "3vw", color: nextData.color, opacity: 0.85, fontFamily: "serif", lineHeight: 1 }}>
                      {nextData.arabic}
                    </div>
                  )}
                </div>
                <div style={{ height: "2px", width: "5vw", borderRadius: "2px", marginTop: "0.6vh", background: `linear-gradient(90deg,${nextData?.color ?? tGOLD},transparent)` }}/>
              </div>
            </div>

            {/* Adhan + Iqamah + Countdown */}
            {(() => {
              const af = fmtTime(nextData?.adhan, is24h);
              const qf = fmtTime(nextData?.iqamaTime, is24h);
              const pColor = nextData?.color ?? tGOLD;
              return (
                <>
                  {/* ADHAN + IQAMAH horizontal row */}
                  <div style={{ flexShrink: 0, padding: "0.8vh 1.2vw", display: "flex", gap: "0.8vw", borderBottom: `1px solid ${tGOLD_LINE}` }}>
                    {/* ADHAN */}
                    <div style={{ flex: 1, borderRadius: "10px", background: "rgba(234,179,8,0.11)", border: "1px solid rgba(234,179,8,0.42)", display: "flex", flexDirection: "column", alignItems: "center", padding: "0.7vh 0.8vw" }}>
                      <div style={{ fontSize: "1.2vw", letterSpacing: "0.3em", color: "#fbbf24", fontWeight: 800, marginBottom: "0.3vh" }}>ADHAN</div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "0.3vw" }}>
                        <div style={{ fontFamily: CLOCK, fontSize: "5.8vw", lineHeight: 1, color: "#fbbf24" }}>{af.hm}</div>
                        {af.ampm && <div style={{ fontSize: "1.5vw", color: "#fbbf24", fontWeight: 700, paddingBottom: "0.5vh" }}>{af.ampm}</div>}
                      </div>
                    </div>
                    {/* Arrow connector */}
                    <div style={{ display: "flex", alignItems: "center", flexShrink: 0, opacity: 0.35 }}>
                      <span style={{ fontSize: "1.2vw", color: tGOLD }}>→</span>
                    </div>
                    {/* IQAMAH */}
                    {iqamaEnabled && (
                      <div style={{ flex: 1, borderRadius: "10px", background: "rgba(34,197,94,0.11)", border: "1px solid rgba(34,197,94,0.42)", display: "flex", flexDirection: "column", alignItems: "center", padding: "0.7vh 0.8vw" }}>
                        <div style={{ fontSize: "1.2vw", letterSpacing: "0.3em", color: "#4ade80", fontWeight: 800, marginBottom: "0.3vh" }}>IQAMAH</div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.3vw" }}>
                          <div style={{ fontFamily: CLOCK, fontSize: "5.8vw", lineHeight: 1, color: "#4ade80" }}>{qf.hm}</div>
                          {qf.ampm && <div style={{ fontSize: "1.5vw", color: "#4ade80", fontWeight: 700, paddingBottom: "0.5vh" }}>{qf.ampm}</div>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Countdown */}
                  <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "0.8vh" }}>
                    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 55%, ${pColor}22 0%, transparent 70%)`, pointerEvents: "none" }}/>
                    <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8vh" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6vw" }}>
                        <IconClock size="1.4vw" color={RED}/>
                        <span style={{ fontSize: "1.1vw", letterSpacing: "0.38em", fontWeight: 800, color: RED }}>TIME TO ADHAN</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end" }}>
                        {[{ v: cH, l: "HRS" }, { v: cM, l: "MINS" }, { v: cS, l: "SECS" }].map(({ v, l }, i) => (
                          <div key={l} style={{ display: "flex", alignItems: "flex-end" }}>
                            {i > 0 && <span style={{ fontFamily: CLOCK, color: RED, fontSize: "8.5vw", lineHeight: 1, paddingBottom: "1.8vh", opacity: 0.5 }}>:</span>}
                            <div style={{ textAlign: "center", padding: "0 0.5vw" }}>
                              <div style={{ fontFamily: CLOCK, fontSize: "8.5vw", color: RED, lineHeight: 1 }}>{v}</div>
                              <div style={{ fontSize: "0.95vw", color: tGOLD, letterSpacing: "0.22em", marginTop: "0.5vh" }}>{l}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ width: "55%", height: "1px", background: `linear-gradient(90deg,transparent,${RED}55,transparent)` }}/>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* ── RIGHT PANEL: clock ───────────────────────────────────────────── */}
          <div style={{ ...card, flex: 1, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(150deg,#080a05 0%,#16200a 40%,#26300f 65%,#0c0a03 100%)" }}/>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 70% 40%,rgba(180,130,20,0.22) 0%,transparent 65%)" }}/>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "center", color: tGOLD, opacity: 0.08, pointerEvents: "none" }}>
              <IconMosque size="22vw" color={tGOLD}/>
            </div>
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "1.2vh 2.5vw", gap: "1.2vh" }}>
              {/* Day + date */}
              <div>
                <div style={{ fontSize: "0.75vw", fontWeight: 700, letterSpacing: "0.45em", color: tGOLD, opacity: 0.7 }}>TODAY</div>
                <div style={{ fontSize: "2.4vw", fontWeight: 900, letterSpacing: "0.06em", lineHeight: 1 }}>{dayLabel || "CURRENT TIME"}</div>
                <div style={{ fontSize: "1.05vw", color: MUTED, fontWeight: 600, letterSpacing: "0.12em", marginTop: "0.15vh" }}>{gregDate}</div>
              </div>
              {/* Big clock */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4vw" }}>
                <div style={{ fontFamily: CLOCK, fontSize: "12vw", lineHeight: 0.85, letterSpacing: "0.06em" }}>{clockHM}</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: "0.8vh", gap: "0.5vh" }}>
                  <div style={{ fontFamily: CLOCK, fontSize: "3.5vw", color: tGREEN, lineHeight: 1 }}>:{secs}</div>
                  {ampm && <div style={{ background: tGREEN_DIM, border: `1px solid ${tGOLD_DIM}`, borderRadius: "6px", color: tGREEN, fontSize: "1.2vw", fontWeight: 800, padding: "0.15vh 0.5vw", lineHeight: 1.3 }}>{ampm}</div>}
                </div>
              </div>
              <div style={{ height: "2px", background: `linear-gradient(90deg,${tGOLD_LINE},transparent)` }}/>
              {/* Hijri dates */}
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "1vw" }}>
                <div style={{ fontSize: "1.3vw", letterSpacing: "0.1em", color: MUTED, fontWeight: 600 }}>{hijriEn}</div>
                {hijriAr && <div style={{ fontSize: "1.6vw", direction: "rtl", color: WHITE, fontWeight: 600 }}>{hijriAr}</div>}
              </div>
              {/* Sunrise + Jumu'ah (or Ramadan times) */}
              <div style={{ display: "flex", gap: "0.8vw" }}>
                {isRamadan ? (
                  <>
                    {today?.fajr && (() => { const sf = fmtTime(today.fajr, is24h); return (
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.8vw", background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.33)", borderRadius: "8px", padding: "0.6vh 1vw" }}>
                        <IconMoon size="2vw" color="#2dd4bf"/>
                        <div>
                          <div style={{ fontSize: "0.9vw", fontWeight: 700, letterSpacing: "0.3em", color: "#2dd4bf" }}>SUHOOR ENDS</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "0.4vw" }}>
                            <span style={{ fontFamily: CLOCK, fontSize: "3vw", color: WHITE, lineHeight: 1 }}>{sf.hm}</span>
                            {sf.ampm && <span style={{ fontSize: "1.2vw", color: "#2dd4bf", fontWeight: 700 }}>{sf.ampm}</span>}
                          </div>
                        </div>
                      </div>
                    ); })()}
                    {today?.maghrib && (() => { const mf = fmtTime(today.maghrib, is24h); return (
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.8vw", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: "8px", padding: "0.6vh 1vw" }}>
                        <IconSun size="2vw" color="#f97316"/>
                        <div>
                          <div style={{ fontSize: "0.9vw", fontWeight: 700, letterSpacing: "0.3em", color: "#f97316" }}>IFTAR</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "0.4vw" }}>
                            <span style={{ fontFamily: CLOCK, fontSize: "3vw", color: WHITE, lineHeight: 1 }}>{mf.hm}</span>
                            {mf.ampm && <span style={{ fontSize: "1.2vw", color: "#f97316", fontWeight: 700 }}>{mf.ampm}</span>}
                          </div>
                        </div>
                      </div>
                    ); })()}
                  </>
                ) : (
                  <>
                    {today?.shuruq && (() => { const sf = fmtTime(today.shuruq, is24h); return (
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.8vw", background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: "8px", padding: "0.6vh 1vw" }}>
                        <IconSun size="2vw" color="#fbbf24"/>
                        <div>
                          <div style={{ fontSize: "0.9vw", fontWeight: 700, letterSpacing: "0.3em", color: "#fbbf24" }}>SUNRISE</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "0.4vw" }}>
                            <span style={{ fontFamily: CLOCK, fontSize: "3vw", color: WHITE, lineHeight: 1 }}>{sf.hm}</span>
                            {sf.ampm && <span style={{ fontSize: "1.2vw", color: "#fbbf24", fontWeight: 700 }}>{sf.ampm}</span>}
                          </div>
                        </div>
                      </div>
                    ); })()}
                    {jumuaCfg?.enabled && now?.getDay() === 5 && (() => {
                      const jt = validJumuaTime(jumuaCfg.time1) ?? today?.dhuhr;
                      if (!jt) return null;
                      const jf = fmtTime(jt, is24h);
                      return (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.8vw", background: tGREEN_DIM, border: `1px solid ${tGOLD_DIM}`, borderRadius: "8px", padding: "0.6vh 1vw" }}>
                          <IconCrescent size="2vw" color={tGREEN}/>
                          <div>
                            <div style={{ fontSize: "0.9vw", fontWeight: 700, letterSpacing: "0.3em", color: tGREEN }}>JUMU&apos;AH</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "0.4vw" }}>
                              <span style={{ fontFamily: CLOCK, fontSize: "3vw", color: WHITE, lineHeight: 1 }}>{jf.hm}</span>
                              {jf.ampm && <span style={{ fontSize: "1.2vw", color: tGREEN, fontWeight: 700 }}>{jf.ampm}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* ═══ PRAYER BAR ══════════════════════════════════════════════════════ */}
        <section style={{ display: "flex", gap: "1vw", padding: "0 1.5vw 1.1vh", flexShrink: 0 }}>
          {prayers.map((p) => {
            const isNext = nextPray?.key === p.key;
            const af = fmtTime(p.adhan, is24h);
            const qf = fmtTime(p.iqamaTime, is24h);
            const c = p.color;
            return (
              <div key={p.key} style={{
                ...card,
                flex: isNext ? 1.35 : 1,
                padding: isNext ? "1vh 0.9vw" : "0.8vh 0.7vw",
                position: "relative",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                border: isNext ? `1.5px solid ${c}90` : `1px solid ${c}35`,
                background: isNext
                  ? `linear-gradient(160deg,${c}22 0%,rgba(0,0,0,0) 55%),${tCARD}`
                  : `linear-gradient(160deg,${c}0a 0%,rgba(0,0,0,0) 55%),${tCARD}`,
                boxShadow: isNext ? `0 0 22px ${c}25` : `0 0 8px ${c}10`,
                transition: "flex 0.4s, border-color 0.4s",
              }}>
                {/* Top colour strip — full on NEXT, subtle on others */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: isNext ? "3px" : "2px", background: `linear-gradient(90deg,${c},${c}60,transparent)`, borderRadius: "14px 14px 0 0", opacity: isNext ? 1 : 0.55, pointerEvents: "none" }}/>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4vw" }}>
                    {p.isDark
                      ? <IconMoon size={isNext ? "2vw" : "1.6vw"} color={c}/>
                      : <IconSun  size={isNext ? "2vw" : "1.6vw"} color={c}/>
                    }
                    <div style={{ fontSize: isNext ? "1.8vw" : "1.3vw", fontWeight: 900, letterSpacing: "0.08em", color: isNext ? c : WHITE }}>{p.label}</div>
                  </div>
                  {isNext && (
                    <span style={{ ...pill(`linear-gradient(90deg,${c}40,${c}20)`, c), fontSize: "0.9vw", padding: "0.3vh 0.9vw", border: `1px solid ${c}55` }}>▶ NEXT</span>
                  )}
                </div>
                {/* Divider */}
                <div style={{ height: "1px", background: `linear-gradient(90deg,${c}${isNext ? "55" : "30"},transparent)`, margin: "0.3vh 0" }}/>
                {/* Times */}
                <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
                  <div style={{ flex: 1, textAlign: "center", borderRight: `1px solid ${c}25` }}>
                    <div style={{ fontSize: isNext ? "1.05vw" : "0.78vw", fontWeight: 800, letterSpacing: "0.12em", color: "#fbbf24", marginBottom: "0.15vh" }}>ADHAN</div>
                    <div style={{ fontFamily: CLOCK, fontSize: isNext ? "3.8vw" : "3.2vw", lineHeight: 1, color: "#fbbf24" }}>{af.hm}</div>
                    <div style={{ fontSize: isNext ? "1vw" : "0.88vw", color: "#fbbf24", fontWeight: 700, marginTop: "0.15vh" }}>{af.ampm}</div>
                  </div>
                  {iqamaEnabled && (
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: isNext ? "1.05vw" : "0.78vw", fontWeight: 800, letterSpacing: "0.12em", color: "#4ade80", marginBottom: "0.15vh" }}>IQAMAH</div>
                      <div style={{ fontFamily: CLOCK, fontSize: isNext ? "3.8vw" : "3.2vw", lineHeight: 1, color: "#4ade80" }}>{qf.hm}</div>
                      <div style={{ fontSize: isNext ? "1vw" : "0.88vw", color: "#4ade80", fontWeight: 700, marginTop: "0.15vh" }}>{qf.ampm}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* ═══ FOOTER ══════════════════════════════════════════════════════════ */}
        <footer style={{ display: "flex", alignItems: "stretch", height: "9vh", borderTop: `1px solid ${tGOLD_DIM}`, background: "rgba(0,0,0,0.65)", flexShrink: 0, overflow: "hidden" }}>
          {/* QR code */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "0.7vw", padding: "0 1.3vw", borderRight: `1px solid ${tGOLD_DIM}` }}>
            {displayUrl
              ? <QRCodeSVG value={displayUrl} size={52} bgColor="transparent" fgColor={tGOLD} level="M"/>
              : <div style={{ width: 52, height: 52, background: tGOLD_DIM, borderRadius: 4 }}/>
            }
            <div>
              <div style={{ fontSize: "0.65vw", fontWeight: 800, letterSpacing: "0.28em", color: tGOLD, lineHeight: 1.2 }}>SCAN</div>
              <div style={{ fontSize: "0.6vw", color: MUTED, letterSpacing: "0.14em", lineHeight: 1.2 }}>TO VIEW</div>
            </div>
          </div>
          {/* Flash message / ticker */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative", display: "flex", alignItems: "center" }}>
            <span
              key={tickerText}
              style={{ position: "absolute", whiteSpace: "nowrap", fontSize: "2.4vw", fontWeight: 800, color: WHITE, animation: `ticker-roll ${tickerDuration}s linear infinite` }}
            >
              {tickerText}
            </span>
          </div>
          {/* Mawaqit logo */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "0.7vw", padding: "0 1.3vw", borderLeft: `1px solid ${tGOLD_DIM}` }}>
            <IconCrescent size="4vh" color={tGOLD}/>
            <div>
              <div style={{ fontFamily: MONO, fontSize: "1.3vw", fontWeight: 900, color: tGOLD, letterSpacing: "0.06em", lineHeight: 1 }}>MAWAQIT</div>
              <div style={{ fontSize: "0.6vw", color: MUTED, letterSpacing: "0.2em", lineHeight: 1.4 }}>PRAYER DISPLAY</div>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
