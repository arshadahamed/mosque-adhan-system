"use client";
import { useState, useEffect, useCallback, useRef } from "react";
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
      iqama?: { fajr?: number; dhuhr?: number; asr?: number; maghrib?: number; isha?: number };
      jumua?: { time1?: string; time2?: string; time3?: string; enabled?: boolean; blockScreen?: boolean; duration?: number; reminder?: boolean };
      display?: { wallpaper?: string; bgImageUrl?: string; bgColor?: string };
      durations?: { fajr?: number; dhuhr?: number; asr?: number; maghrib?: number; isha?: number };
    };
  };
  today: PrayerDay | null;
  tomorrow: PrayerDay | null;
  flashMessages?: { content: string }[];
}
interface MosqueData {
  id: string; name: string; city?: string; latitude: number; longitude: number; status: string;
  logoUrl?: string; associationName?: string; paymentUrl?: string;
}
interface Props { mosque: MosqueData; widget: WidgetData | null }

// ── display state machine ───────────────────────────────────────────────────────
type DisplayMode = "NORMAL" | "PRE_ADHAN" | "IQAMAH_COUNTDOWN" | "SILENCE" | "PRAYER_DARK";

interface PrayerEntry {
  key: string; label: string; arabic: string; color: string;
  isDark: boolean; adhan: string; iqamaTime: string;
}
interface DisplayState {
  mode: DisplayMode;
  prayer?: PrayerEntry;
  secondsUntilIqamah?: number;
}

// Estimated prayer durations in minutes (after iqamah)
const PRAYER_DURATION: Record<string, number> = {
  fajr: 18, dhuhr: 12, asr: 12, maghrib: 8, isha: 15,
};
const SILENCE_SECS    = 8;
const PRE_ADHAN_SECS  = 10 * 60;
const PRE_JUMUA_SECS  = 20 * 60; // reminder screen 20 min before Jumu'ah

function timeToSec(hhmm: string | undefined): number {
  if (!hhmm?.includes(":")) return -1;
  const [h, m] = hhmm.split(":").map(Number);
  return isNaN(h) || isNaN(m) ? -1 : h * 3600 + m * 60;
}

// Returns undefined for blank, "00:00", or midnight — so callers can fall back to Dhuhr
function validJumuaTime(t: string | undefined): string | undefined {
  if (!t?.trim()) return undefined;
  const sec = timeToSec(t);
  return sec > 0 ? t : undefined;
}

function computeState(now: Date, prayers: PrayerEntry[], durations: Record<string, number>): DisplayState {
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  for (const prayer of prayers) {
    const adhanSec  = timeToSec(prayer.adhan);
    const iqamaSec  = timeToSec(prayer.iqamaTime);
    if (adhanSec < 0 || iqamaSec < 0) continue;
    const prayerEnd = iqamaSec + (durations[prayer.key] ?? PRAYER_DURATION[prayer.key] ?? 12) * 60;

    if (nowSec >= iqamaSec + SILENCE_SECS && nowSec < prayerEnd)
      return { mode: "PRAYER_DARK", prayer };
    if (nowSec >= iqamaSec && nowSec < iqamaSec + SILENCE_SECS)
      return { mode: "SILENCE", prayer };
    if (nowSec >= adhanSec && nowSec < iqamaSec && iqamaSec > adhanSec)
      return { mode: "IQAMAH_COUNTDOWN", prayer, secondsUntilIqamah: iqamaSec - nowSec };
    if (nowSec >= adhanSec - PRE_ADHAN_SECS && nowSec < adhanSec)
      return { mode: "PRE_ADHAN", prayer };
  }
  return { mode: "NORMAL" };
}

// ── constants ───────────────────────────────────────────────────────────────────
const DARK      = "#06080a";
const CARD      = "rgba(9,18,13,0.97)";
const GOLD      = "#c8a84a";
const GOLD_DIM  = "rgba(200,168,74,0.22)";
const GOLD_LINE = "rgba(200,168,74,0.45)";
const GREEN     = "#22c55e";
const GREEN_DIM = "rgba(34,197,94,0.15)";
const AMBER     = "#f59e0b";
const AMBER_DIM = "rgba(245,158,11,0.15)";
const RED        = "#ef4444";
const RED_DIM    = "rgba(239,68,68,0.15)";
const ORANGE     = "#f97316";
const TEAL       = "#2dd4bf";
const TEAL_DIM   = "rgba(45,212,191,0.12)";
const WHITE     = "#f2f2f0";
const MUTED     = "rgba(242,242,240,0.5)";
const MONO      = "var(--font-orbitron), 'Courier New', monospace";
const CLOCK     = "var(--font-bebas), 'Bebas Neue', impact, sans-serif";
const API       = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

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

const DEFAULT_QUOTE = "Indeed, prayer has been decreed upon the believers a decree of specified times.";
const DEFAULT_REF   = "— An-Nisa 4:103";

const PRAYER_CFG = [
  { key: "fajr",    label: "FAJR",    arabic: "الفجر",  isDark: true,  color: "#818cf8" },
  { key: "dhuhr",   label: "DHUHR",   arabic: "الظهر",  isDark: false, color: "#fbbf24" },
  { key: "asr",     label: "ASR",     arabic: "العصر",  isDark: false, color: "#fb923c" },
  { key: "maghrib", label: "MAGHRIB", arabic: "المغرب", isDark: false, color: "#f87171" },
  { key: "isha",    label: "ISHA",    arabic: "العشاء", isDark: true,  color: "#a78bfa" },
] as const;

// ── SVG icons ───────────────────────────────────────────────────────────────────
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
const IconBook = ({ size = "1em" }: { size?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    <line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/>
  </svg>
);
const IconPhoneOff = ({ size = "1em" }: { size?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2"/>
    <line x1="5" y1="2" x2="19" y2="22" strokeWidth="2.5"/>
    <circle cx="12" cy="17" r="1" fill="currentColor"/>
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

// ── weather ──────────────────────────────────────────────────────────────────────
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

function fmtTime(time: string | undefined, is24h: boolean): { hm: string; ampm: string } {
  if (!time?.includes(":")) return { hm: "--:--", ampm: "" };
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return { hm: "--:--", ampm: "" };
  if (is24h) return { hm: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, ampm: "" };
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hm: `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")}`, ampm: h >= 12 ? "PM" : "AM" };
}

// ── countdown display helper ──────────────────────────────────────────────────────
function CountdownDigits({ seconds, color, fontSize = "10vw" }: { seconds: number; color: string; fontSize?: string }) {
  const [cH, cM, cS] = formatCountdown(seconds).split(":");
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5vw" }}>
      {[{ v: cH, l: "HRS" }, { v: cM, l: "MINS" }, { v: cS, l: "SECS" }].map(({ v, l }, i) => (
        <div key={l} style={{ display: "flex", alignItems: "flex-end", gap: "0.5vw" }}>
          {i > 0 && <span style={{ fontFamily: CLOCK, color, fontSize, lineHeight: 0.85, paddingBottom: "1.8vh" }}>:</span>}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: CLOCK, fontSize, color, lineHeight: 0.85 }}>{v}</div>
            <div style={{ fontSize: "0.9vw", color: GOLD, letterSpacing: "0.15em", marginTop: "0.4vh" }}>{l}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── progress ring SVG ─────────────────────────────────────────────────────────────
function ProgressRing({ totalSecs, remainingSecs, color, size = "38vw" }: { totalSecs: number; remainingSecs: number; color: string; size?: string }) {
  const progress = Math.max(0, Math.min(1, (totalSecs - remainingSecs) / Math.max(1, totalSecs)));
  const r = 88; const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <svg viewBox="0 0 200 200" style={{ width: size, height: size }}>
        <circle cx="100" cy="100" r={r} fill="none" stroke={`${color}18`} strokeWidth="7"/>
        <circle cx="100" cy="100" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${progress * circ} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 100 100)" style={{ transition: "stroke-dasharray 1s linear" }}/>
        {/* Small tick at full position */}
        <circle cx="100" cy="12" r="5" fill={`${color}55`}/>
      </svg>
    </div>
  );
}

// ── fullscreen overlay screens ───────────────────────────────────────────────────
function IqamahScreen({ state, is24h }: { state: DisplayState; is24h: boolean }) {
  const p        = state.prayer!;
  const secs     = state.secondsUntilIqamah ?? 0;
  const totalSecs = Math.max(60, timeToSec(p.iqamaTime) - timeToSec(p.adhan));
  const progress = Math.max(0, Math.min(1, (totalSecs - secs) / Math.max(1, totalSecs)));
  const af       = fmtTime(p.adhan, is24h);
  const qf       = fmtTime(p.iqamaTime, is24h);
  const mm       = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss       = String(secs % 60).padStart(2, "0");
  const isUrgent = secs <= 30;
  const ac       = p.color; // prayer accent colour

  // SVG ring math (300×300 viewBox)
  const RR = 128; const CCX = 150; const CCY = 150;
  const CCIRC = 2 * Math.PI * RR;
  const remaining = (1 - progress) * CCIRC;

  return (
    <>
      <style>{`
        @keyframes iq-ring-glow  { 0%,100%{opacity:0.7} 50%{opacity:1} }
        @keyframes iq-urgent     { 0%,100%{opacity:1}   50%{opacity:0.55} }
        @keyframes iq-float      { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-6px)} }
        @keyframes iq-spin-slow  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes iq-tick-in    { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
      `}</style>

      <div style={{ position: "fixed", inset: 0, zIndex: 200, color: WHITE, overflow: "hidden",
        background: `linear-gradient(145deg,#020407 0%,${ac}1a 45%,#020407 100%)` }}>

        {/* ── Islamic geometric star tile — background texture ── */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.045, pointerEvents: "none" }}>
          <defs>
            <pattern id="iq-stars" x="0" y="0" width="90" height="90" patternUnits="userSpaceOnUse">
              <polygon points="45,4 52,22 71,15 62,32 80,38 62,44 71,61 52,54 45,72 38,54 19,61 28,44 10,38 28,32 19,15 38,22"
                fill={ac} opacity="0.9"/>
              <rect x="18" y="18" width="54" height="54" fill="none" stroke={ac} strokeWidth="0.6" opacity="0.5" transform="rotate(45 45 45)"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#iq-stars)"/>
        </svg>

        {/* ── Radial glow behind countdown ── */}
        <div style={{ position: "absolute", right: "8vw", top: "50%", transform: "translateY(-50%)",
          width: "46vw", height: "46vw", borderRadius: "50%",
          background: `radial-gradient(circle, ${ac}18 0%, transparent 70%)`,
          pointerEvents: "none" }}/>

        {/* ══════════ LEFT PANEL — identity ══════════ */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "40vw",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "4vh 3vw", gap: "3vh",
          borderRight: `1px solid ${ac}28`,
          background: `linear-gradient(160deg, ${ac}12 0%, transparent 60%)` }}>

          {/* Crescent + stars accent top */}
          <div style={{ position: "absolute", top: "2.5vh", display: "flex", alignItems: "center", gap: "1vw", opacity: 0.5 }}>
            <span style={{ fontSize: "1.1vw", color: ac }}>✦</span>
            <IconCrescent size="3.5vw" color={ac}/>
            <span style={{ fontSize: "1.1vw", color: ac }}>✦</span>
          </div>

          {/* Arabic prayer name — large, prayer colour */}
          <div style={{ textAlign: "center", animation: "iq-float 4s ease-in-out infinite" }}>
            <div style={{ fontSize: "11vw", direction: "rtl", color: ac, fontWeight: 900,
              lineHeight: 1, letterSpacing: "-0.01em",
              textShadow: `0 0 60px ${ac}55, 0 0 20px ${ac}33` }}>
              {p.arabic}
            </div>
            {/* divider */}
            <div style={{ height: "2px", background: `linear-gradient(90deg,transparent,${ac},transparent)`, margin: "1.5vh 0" }}/>
            {/* English name spaced */}
            <div style={{ fontFamily: MONO, fontSize: "3vw", fontWeight: 900,
              letterSpacing: "0.55em", color: WHITE, opacity: 0.9 }}>
              {p.label.split("").join(" ")}
            </div>
          </div>

          {/* ADHAN + IQAMAH time cards */}
          <div style={{ display: "flex", gap: "1.2vw", width: "100%" }}>
            {([
              { lbl: "ADHAN",  t: af, clr: GREEN },
              { lbl: "IQAMAH", t: qf, clr: GOLD  },
            ] as { lbl: string; t: { hm: string; ampm: string }; clr: string }[]).map(({ lbl, t, clr }) => (
              <div key={lbl} style={{ flex: 1, textAlign: "center", borderRadius: "12px",
                background: `${clr}0d`, border: `1px solid ${clr}35`, padding: "1.4vh 0.5vw" }}>
                <div style={{ fontSize: "0.78vw", fontWeight: 900, letterSpacing: "0.32em", color: clr, marginBottom: "0.5vh" }}>{lbl}</div>
                <div style={{ fontFamily: CLOCK, fontSize: "3.8vw", color: WHITE, lineHeight: 1 }}>{t.hm}</div>
                {t.ampm && <div style={{ fontSize: "1.1vw", color: clr, fontWeight: 700, marginTop: "0.3vh" }}>{t.ampm}</div>}
              </div>
            ))}
          </div>

          {/* Verse */}
          <div style={{ textAlign: "center", maxWidth: "30vw" }}>
            <div style={{ fontSize: "0.9vw", fontStyle: "italic", color: MUTED, lineHeight: 2 }}>
              ❝ Hasten to prayer,<br/>hasten to success. ❞
            </div>
            <div style={{ fontSize: "0.85vw", color: GOLD, fontWeight: 700, letterSpacing: "0.14em", marginTop: "0.6vh" }}>
              — الأَذَان
            </div>
          </div>

          {/* Mosque silhouette watermark bottom */}
          <div style={{ position: "absolute", bottom: "-1vh", opacity: 0.07, pointerEvents: "none" }}>
            <IconMosque size="22vw" color={ac}/>
          </div>
        </div>

        {/* ══════════ RIGHT PANEL — countdown ══════════ */}
        <div style={{ position: "absolute", left: "40vw", right: 0, top: 0, bottom: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2.5vh" }}>

          {/* IQAMAH IN badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.8vw",
            background: `${ac}15`, border: `1px solid ${ac}40`,
            borderRadius: "99px", padding: "0.6vh 2.4vw" }}>
            <IconClock size="1.3vw" color={ac}/>
            <span style={{ fontSize: "1.05vw", fontWeight: 900, letterSpacing: "0.38em", color: ac }}>
              IQAMAH IN
            </span>
          </div>

          {/* The big countdown ring */}
          <div style={{ position: "relative", width: "44vw", height: "44vw",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: isUrgent ? "iq-urgent 0.7s ease-in-out infinite" : undefined }}>

            <svg viewBox="0 0 300 300" style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
              animation: "iq-ring-glow 3s ease-in-out infinite" }}>
              {/* Outer tick ring — 60 second marks */}
              {Array.from({ length: 60 }).map((_, i) => {
                const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
                const major = i % 5 === 0;
                const r1 = major ? 140 : 143;
                return (
                  <line key={i}
                    x1={CCX + r1 * Math.cos(angle)} y1={CCY + r1 * Math.sin(angle)}
                    x2={CCX + 148 * Math.cos(angle)} y2={CCY + 148 * Math.sin(angle)}
                    stroke={`${ac}${major ? "70" : "28"}`} strokeWidth={major ? "2.5" : "1"}/>
                );
              })}
              {/* Decorative outer circle */}
              <circle cx={CCX} cy={CCY} r="148" fill="none" stroke={`${ac}18`} strokeWidth="1"/>
              {/* Background track */}
              <circle cx={CCX} cy={CCY} r={RR} fill="none" stroke={`${ac}14`} strokeWidth="12"/>
              {/* Countdown progress arc */}
              <circle cx={CCX} cy={CCY} r={RR} fill="none" stroke={ac} strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${remaining} ${CCIRC}`}
                transform={`rotate(-90 ${CCX} ${CCY})`}
                style={{ transition: "stroke-dasharray 1s linear",
                  filter: `drop-shadow(0 0 10px ${ac}aa)` }}/>
              {/* Inner accent ring */}
              <circle cx={CCX} cy={CCY} r="100" fill="none" stroke={`${ac}18`} strokeWidth="1"
                strokeDasharray="4 6"/>
              {/* Centre fill */}
              <circle cx={CCX} cy={CCY} r="96" fill={`${ac}07`}/>
              {/* Spinning decorative ring (very slow) */}
              <g style={{ transformOrigin: "150px 150px", animation: "iq-spin-slow 60s linear infinite" }}>
                {Array.from({ length: 8 }).map((_, i) => {
                  const a = (i / 8) * 2 * Math.PI;
                  return <circle key={i} cx={CCX + 108 * Math.cos(a)} cy={CCY + 108 * Math.sin(a)} r="3" fill={`${ac}44`}/>;
                })}
              </g>
            </svg>

            {/* Countdown digits overlay */}
            <div style={{ position: "relative", zIndex: 1, textAlign: "center",
              animation: "iq-tick-in 0.3s ease-out" }}>
              <div style={{ fontFamily: CLOCK, lineHeight: 1, letterSpacing: "0.04em",
                fontSize: isUrgent ? "14vw" : "12vw",
                color: isUrgent ? RED : WHITE,
                textShadow: `0 0 50px ${isUrgent ? "#ef444466" : `${ac}44`}` }}>
                {mm}:{ss}
              </div>
              <div style={{ display: "flex", justifyContent: "space-evenly", marginTop: "0.8vh", paddingInline: "4vw" }}>
                <span style={{ fontSize: "1.1vw", fontWeight: 800, letterSpacing: "0.28em", color: ac, opacity: 0.8 }}>MINS</span>
                <span style={{ color: `${ac}50`, fontSize: "1.1vw" }}>·</span>
                <span style={{ fontSize: "1.1vw", fontWeight: 800, letterSpacing: "0.28em", color: ac, opacity: 0.8 }}>SECS</span>
              </div>
            </div>
          </div>

          {/* Prepare badge */}
          <div style={{ background: `${ac}0e`, border: `1px solid ${ac}28`, borderRadius: "10px",
            padding: "1.2vh 3vw", textAlign: "center" }}>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, color: WHITE, letterSpacing: "0.2em" }}>
              PLEASE PREPARE FOR PRAYER
            </div>
            {isUrgent && (
              <div style={{ fontSize: "0.85vw", color: RED, letterSpacing: "0.18em", marginTop: "0.3vh",
                fontWeight: 800, animation: "iq-urgent 0.7s ease-in-out infinite" }}>
                ● IQAMAH IMMINENT
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function SilenceScreen({ prayer }: { prayer?: PrayerEntry }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3.5vh" }}>
      <div style={{ color: WHITE, opacity: 0.9 }}><IconPhoneOff size="14vw"/></div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "6.5vw", fontWeight: 900, letterSpacing: "0.08em", lineHeight: 1.15, color: WHITE }}>
          PUT YOUR PHONE<br/>ON SILENCE
        </div>
        {prayer && (
          <div style={{ fontSize: "2.5vw", color: GOLD, marginTop: "2vh", letterSpacing: "0.18em", fontWeight: 700 }}>
            {prayer.label.toUpperCase()} PRAYER IS ABOUT TO BEGIN
          </div>
        )}
      </div>
      <div style={{ fontSize: "1.3vw", color: MUTED, letterSpacing: "0.2em", marginTop: "1vh" }}>
        جَعَلَ اللَّهُ أَذَانَكَ نُوراً
      </div>
    </div>
  );
}

function PrayerDarkScreen({ prayer }: { prayer?: PrayerEntry }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#020304", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2vh" }}>
      <div style={{ color: GOLD, opacity: 0.12 }}><IconMosque size="24vw" color={GOLD}/></div>
      <div style={{ textAlign: "center", marginTop: "-8vw" }}>
        {prayer && (
          <div style={{ fontFamily: MONO, fontSize: "5vw", fontWeight: 900, color: "rgba(242,242,240,0.6)", letterSpacing: "0.1em" }}>
            {prayer.label.toUpperCase()}
          </div>
        )}
        <div style={{ fontSize: "2vw", color: GOLD, letterSpacing: "0.25em", fontWeight: 700, marginTop: "1vh" }}>
          PRAYER IN PROGRESS
        </div>
        <div style={{ fontSize: "1.1vw", color: MUTED, marginTop: "1.5vh", fontStyle: "italic" }}>
          ❝ Indeed, prayer prohibits immorality and wrongdoing. ❞
        </div>
      </div>
    </div>
  );
}

// ── Jumu'ah block screen ─────────────────────────────────────────────────────────
function JumuaScreen() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3vh" }}>
      <div style={{ color: GOLD, opacity: 0.1 }}><IconMosque size="28vw" color={GOLD}/></div>
      <div style={{ textAlign: "center", marginTop: "-10vw" }}>
        <div style={{ fontFamily: MONO, fontSize: "6vw", fontWeight: 900, color: GOLD, letterSpacing: "0.08em", lineHeight: 1.1 }}>
          JUMU&apos;AH
        </div>
        <div style={{ fontSize: "2.2vw", color: WHITE, letterSpacing: "0.3em", fontWeight: 700, marginTop: "1vh", opacity: 0.85 }}>
          FRIDAY PRAYER IN PROGRESS
        </div>
        <div style={{ fontSize: "1.2vw", color: MUTED, marginTop: "2vh", fontStyle: "italic", letterSpacing: "0.05em" }}>
          ❝ O you who believe! When the call is made for prayer on Friday, hasten to the remembrance of Allah. ❞
        </div>
        <div style={{ fontSize: "1vw", color: GOLD, marginTop: "0.5vh" }}>— Al-Jumu&apos;ah 62:9</div>
      </div>
    </div>
  );
}

// ── Pre-Jumu'ah reminder screen ──────────────────────────────────────────────────
function PreJumuahScreen({ jumuaTime, is24h, mosqueName }: { jumuaTime: string; is24h: boolean; mosqueName: string }) {
  const jf = fmtTime(jumuaTime, is24h);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 195, background: "linear-gradient(135deg,#030a04,#071408)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2.5vh" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.05, pointerEvents: "none" }}>
        <IconCrescent size="65vw" color={GOLD}/>
      </div>
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.8vh" }}>
        <div style={{ fontSize: "0.9vw", fontWeight: 700, letterSpacing: "0.5em", color: GOLD, opacity: 0.8 }}>FRIDAY · {mosqueName.toUpperCase()}</div>
        <div style={{ fontFamily: MONO, fontSize: "7vw", fontWeight: 900, color: GOLD, letterSpacing: "0.06em", lineHeight: 1.05 }}>
          JUMU&apos;AH
        </div>
        <div style={{ fontSize: "2vw", color: WHITE, letterSpacing: "0.25em", fontWeight: 700 }}>PRAYER BEGINS AT</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "1vw" }}>
          <span style={{ fontFamily: CLOCK, fontSize: "12vw", color: GREEN, lineHeight: 1 }}>{jf.hm}</span>
          {jf.ampm && <span style={{ fontSize: "3vw", color: GREEN, fontWeight: 700 }}>{jf.ampm}</span>}
        </div>
        <div style={{ width: "45vw", height: "2px", background: `linear-gradient(90deg,transparent,${GOLD_LINE},transparent)` }}/>
        <div style={{ fontSize: "1.2vw", color: MUTED, fontStyle: "italic", maxWidth: "55vw", lineHeight: 1.75 }}>
          ❝ O you who believe! When the call is made for prayer on Friday, hasten to the remembrance of Allah and leave off business. ❞
          <span style={{ display: "block", color: GOLD, fontStyle: "normal", marginTop: "0.4vh", fontSize: "1vw" }}>— Al-Jumu&apos;ah 62:9</span>
        </div>
        <div style={{ fontSize: "1.4vw", fontWeight: 800, letterSpacing: "0.2em", color: WHITE, background: `rgba(34,197,94,0.12)`, border: `1px solid ${GREEN}55`, borderRadius: "12px", padding: "0.8vh 2.5vw" }}>
          PLEASE PREPARE FOR PRAYER
        </div>
      </div>
    </div>
  );
}

// ── flash message fullscreen ─────────────────────────────────────────────────────
function FlashMessageScreen({ message, total, current }: { message: string; total: number; current: number }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "linear-gradient(135deg,#020d06,#041a0a)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6vh 10vw", textAlign: "center", gap: "4vh" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.07, pointerEvents: "none" }}>
        <IconCrescent size="55vw" color={GOLD}/>
      </div>
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3vh" }}>
        <div style={{ fontSize: "0.9vw", fontWeight: 700, letterSpacing: "0.45em", color: GOLD, opacity: 0.85 }}>ANNOUNCEMENT</div>
        <div style={{ fontSize: "5.5vw", fontWeight: 900, color: WHITE, lineHeight: 1.35, maxWidth: "80vw" }}>
          {message}
        </div>
        {total > 1 && (
          <div style={{ display: "flex", gap: "0.7vw", marginTop: "1vh" }}>
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", background: i === current - 1 ? GOLD : "rgba(200,168,74,0.25)", transition: "background 0.4s" }}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────────
export function DisplayClient({ mosque, widget: initial }: Props) {
  const [widget, setWidget]   = useState<WidgetData | null>(initial);
  const [now, setNow]         = useState<Date | null>(null);
  const [temp, setTemp]       = useState<number | null>(null);
  const [wCode, setWCode]     = useState<number | null>(null);
  const [displayUrl, setDisplayUrl] = useState("");
  const [coords, setCoords]   = useState({ lat: mosque.latitude, lon: mosque.longitude });
  const [showFlash, setShowFlash] = useState(false);
  const [flashIndex, setFlashIndex] = useState(0);
  const refreshRef            = useRef<() => void>(() => {});
  const pendingFlashRef       = useRef(false); // set by SSE, consumed on next widget update

  // Tick every second
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Widget refresh — every 60 seconds for live config sync
  const refreshWidget = useCallback(async () => {
    try {
      const r = await fetch(`${API}/mosques/${mosque.id}/widget`);
      if (r.ok) setWidget((await r.json()).data);
    } catch {}
  }, [mosque.id]);

  useEffect(() => {
    refreshRef.current = refreshWidget;
  }, [refreshWidget]);

  // Capture display URL for QR code (needs window, so runs after mount)
  useEffect(() => {
    setDisplayUrl(window.location.href);
  }, []);

  // Use device geolocation for weather accuracy; fall back to mosque coords
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {} // keep mosque coords silently on denial or error
    );
  }, []);

  // Real-time config updates via SSE
  useEffect(() => {
    const source = new EventSource(`${API}/mosques/${mosque.id}/events`);
    source.onmessage = (e) => {
      try {
        const { type } = JSON.parse(e.data);
        if (type === "config-updated") {
          pendingFlashRef.current = true;
          refreshRef.current();
        }
      } catch {}
    };
    return () => source.close();
  }, [mosque.id]);

  // Fallback polling every 30 seconds
  useEffect(() => {
    const id = setInterval(() => refreshRef.current(), 30_000);
    return () => clearInterval(id);
  }, []);

  // Also refresh immediately when the display tab becomes visible (e.g. after admin changes config)
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") refreshRef.current(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Derived early so fetchWeather callback can close over the current unit
  const tempUnit = (widget?.mosque.config?.regional?.tempUnit ?? "C") as "C" | "F";

  // Weather every 5 minutes — re-fetches immediately when unit or coords change
  const fetchWeather = useCallback(async () => {
    const unit = tempUnit === "F" ? "fahrenheit" : "celsius";
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code&temperature_unit=${unit}`);
      const j = await r.json();
      if (j.current?.temperature_2m != null) setTemp(Math.round(j.current.temperature_2m));
      if (j.current?.weather_code    != null) setWCode(j.current.weather_code);
    } catch {}
  }, [coords.lat, coords.lon, tempUnit]);

  useEffect(() => { fetchWeather(); const id = setInterval(fetchWeather, 5 * 60_000); return () => clearInterval(id); }, [fetchWeather]);

  // Refresh widget when prayer transitions happen
  const prevMode = useRef<DisplayMode>("NORMAL");

  // ── derived ──────────────────────────────────────────────────────────────────
  const today     = widget?.today ?? null;
  const iqamaCfg  = widget?.mosque.config?.iqama ?? {};
  const iqamaEnabled = (iqamaCfg as { enabled?: boolean }).enabled !== false;
  const jumua     = widget?.mosque.config?.jumua;
  const msgs      = widget?.flashMessages ?? [];

  // Prayer durations: admin config overrides hardcoded fallbacks
  const durCfg = widget?.mosque.config?.durations ?? {};
  const prayerDurations: Record<string, number> = {
    fajr:    durCfg.fajr    ?? PRAYER_DURATION.fajr,
    dhuhr:   durCfg.dhuhr   ?? PRAYER_DURATION.dhuhr,
    asr:     durCfg.asr     ?? PRAYER_DURATION.asr,
    maghrib: durCfg.maghrib ?? PRAYER_DURATION.maghrib,
    isha:    durCfg.isha    ?? PRAYER_DURATION.isha,
  };

  const prayers: PrayerEntry[] = today
    ? PRAYER_CFG.map(pc => ({
        ...pc,
        adhan: today[pc.key as keyof PrayerDay] as string,
        iqamaTime: iqamaEnabled
          ? addMinutes(today[pc.key as keyof PrayerDay] as string, (iqamaCfg as Record<string, number>)[pc.key] ?? 0)
          : today[pc.key as keyof PrayerDay] as string,
      }))
    : [];

  const displayState: DisplayState = (now && prayers.length)
    ? computeState(now, prayers, prayerDurations)
    : { mode: "NORMAL" };

  // Refresh data at mode transitions (prayer just ended → get fresh data)
  useEffect(() => {
    if (displayState.mode !== prevMode.current) {
      if (displayState.mode === "NORMAL" && prevMode.current === "PRAYER_DARK") {
        refreshRef.current();
      }
      prevMode.current = displayState.mode;
    }
  }, [displayState.mode]);

  // Show flash screen only when a config-updated SSE event triggers a widget refresh
  useEffect(() => {
    if (!pendingFlashRef.current) return;
    pendingFlashRef.current = false;
    const flashMsgs = widget?.flashMessages ?? [];
    if (!flashMsgs.length) return;
    setFlashIndex(0);
    setShowFlash(true);
    const t = setTimeout(() => setShowFlash(false), 12_000);
    return () => clearTimeout(t);
  }, [widget]);

  // Cycle through multiple flash messages every 4 seconds
  useEffect(() => {
    if (!showFlash || msgs.length <= 1) return;
    const id = setInterval(() => {
      setFlashIndex(i => (i + 1) % msgs.length);
    }, 4_000);
    return () => clearInterval(id);
  }, [showFlash, msgs.length]);

  const is24h = widget?.mosque.config?.regional?.timeFormat === "24";
  const hijriAdjustDays = (widget?.mosque.config?.regional as { hijriAdjust?: number } | undefined)?.hijriAdjust ?? 0;

  let clockHM = "--:--", ampm = "", secs = "--", hijriEn = "", hijriAr = "", dayLabel = "", gregDate = "";
  if (now) {
    if (is24h) {
      const t  = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      const parts = t.split(":");
      clockHM = `${parts[0]}:${parts[1]}`;
      secs    = parts[2];
      ampm    = "";
    } else {
      const t  = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
      const sp = t.lastIndexOf(" ");
      ampm     = t.slice(sp + 1);
      const p  = t.slice(0, sp).split(":");
      clockHM  = `${p[0]}:${p[1]}`;
      secs     = p[2];
    }
    dayLabel = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    gregDate = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
    const hijriNow = applyHijriAdjust(now, hijriAdjustDays);
    hijriEn  = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" })
                   .format(hijriNow).replace(" AH", "").toUpperCase();
    try { hijriAr = new Intl.DateTimeFormat("ar-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" }).format(hijriNow); } catch {}
  }

  const tFajr    = widget?.tomorrow ? { fajr: widget.tomorrow.fajr } : null;
  const nextPray: NextPrayer | null = (today && now)
    ? getNextPrayer(prayers.map(p => ({ key: p.key, label: p.label, adhan: p.adhan })), now, tFajr)
    : null;
  const nextData  = prayers.find(p => p.key === nextPray?.key);
  const countdown = nextPray ? formatCountdown(nextPray.secondsUntil) : null;
  const [cH, cM, cS] = (countdown ?? "00:00:00").split(":");

  // ── Ramadan detection ────────────────────────────────────────────────────────
  const isRamadan = (() => {
    if (!now) return false;
    try {
      const m = parseInt(new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { month: "numeric" }).format(now));
      return m === 9;
    } catch { return false; }
  })();
  const isIftarNext = isRamadan && nextPray?.key === "maghrib";


  // Detect: past Isha iqamah + duration → day's prayers are done
  const isPastLastPrayer = (() => {
    if (!now || displayState.mode !== "NORMAL") return false;
    const isha = prayers.find(p => p.key === "isha");
    if (!isha) return false;
    const ishaEnd = timeToSec(isha.iqamaTime) + (prayerDurations.isha ?? 15) * 60;
    const nowSec  = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    return ishaEnd > 0 && nowSec >= ishaEnd;
  })();
  const weather   = getWeather(wCode);
  const cityLabel = mosque.city?.toUpperCase()
    ?? widget?.mosque.timezone?.split("/")[1]?.replace(/_/g, " ").toUpperCase() ?? "";
  const quoteText = msgs.length > 0 ? msgs.map(m => m.content).join("  ·  ") : DEFAULT_QUOTE;
  const quoteRef  = msgs.length > 0 ? "" : DEFAULT_REF;
  const tickerContent  = quoteRef ? `${quoteText}   ${quoteRef}` : quoteText;
  // single copy enters from right (100vw) and exits left (-100%); duration covers ~100vw + text width
  const tickerDuration = Math.max(40, Math.round(tickerContent.length * 0.4) + 35);

  // Background from admin config
  const dispCfg = widget?.mosque.config?.display as {
    wallpaper?: string; bgImageUrl?: string; bgColor?: string;
    cityName?: boolean; logo?: boolean; footer?: boolean;
    prayersOnScreen?: boolean; blackScreen?: boolean;
    hijriDate?: boolean; temperature?: boolean; theme?: string;
  } | undefined;

  const bgImageUrl       = dispCfg?.bgImageUrl ?? "";
  const safeBgImageUrl   = /^https?:\/\//.test(bgImageUrl) ? bgImageUrl : "";
  const bgColorCfg       = dispCfg?.bgColor ?? "";
  const wallpaper        = dispCfg?.wallpaper ?? "void";

  // Display toggles — default true when not set (backwards-compatible)
  const showCityName     = dispCfg?.cityName     !== false;
  const showLogo         = dispCfg?.logo         !== false;
  const showFooter       = dispCfg?.footer       !== false;
  const showPrayerBar    = dispCfg?.prayersOnScreen !== false;
  const showBlackScreen  = dispCfg?.blackScreen  !== false;
  const showHijriDate    = dispCfg?.hijriDate    !== false;
  const showTemperature  = dispCfg?.temperature  !== false;
  const containerBg: React.CSSProperties = safeBgImageUrl
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.65),rgba(0,0,0,0.65)), url(${safeBgImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : bgColorCfg
      ? { background: bgColorCfg }
      : { background: WALLPAPER_BG[wallpaper] ?? DARK };

  const activeTheme  = THEME_COLORS[dispCfg?.theme ?? "default"] ?? THEME_COLORS.default;
  const tGOLD        = activeTheme.gold;
  const tGREEN       = activeTheme.green;
  const tCARD        = activeTheme.card;
  const tGOLD_DIM  = `rgba(${parseInt(tGOLD.slice(1,3),16)},${parseInt(tGOLD.slice(3,5),16)},${parseInt(tGOLD.slice(5,7),16)},0.22)`;
  const tGOLD_LINE = `rgba(${parseInt(tGOLD.slice(1,3),16)},${parseInt(tGOLD.slice(3,5),16)},${parseInt(tGOLD.slice(5,7),16)},0.45)`;
  const tGREEN_DIM = `rgba(${parseInt(tGREEN.slice(1,3),16)},${parseInt(tGREEN.slice(3,5),16)},${parseInt(tGREEN.slice(5,7),16)},0.15)`;

  const isPreAdhan = displayState.mode === "PRE_ADHAN";
  const accentColor  = isPreAdhan ? AMBER : tGREEN;
  const accentDim    = isPreAdhan ? AMBER_DIM : tGREEN_DIM;
  const preLabelSm: React.CSSProperties = {
    fontSize: "0.85vw", fontWeight: 700, letterSpacing: "0.22em", color: accentColor,
  };

  // ── shared styles ─────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: tCARD, border: `1px solid ${tGOLD_DIM}`, borderRadius: "14px", overflow: "hidden",
  };
  const labelSm: React.CSSProperties = { ...preLabelSm };
  const pill = (bg: string, color: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", padding: "0.35vh 1.1vw",
    background: bg, color, borderRadius: "99px", fontSize: "0.95vw", fontWeight: 800,
    letterSpacing: "0.18em", whiteSpace: "nowrap",
  });

  // ── Jumu'ah block screen ─────────────────────────────────────────────────────
  const jumuaCfg = widget?.mosque.config?.jumua;

  // ── Pre-Jumu'ah detection ────────────────────────────────────────────────────
  const preJumuaTime = (() => {
    if (!now || now.getDay() !== 5) return null;
    if (!jumuaCfg?.enabled || !jumuaCfg?.reminder) return null;
    return validJumuaTime(jumuaCfg.time1) ?? today?.dhuhr ?? null;
  })();
  const isPreJumua = (() => {
    if (!now || !preJumuaTime) return false;
    const jSec  = timeToSec(preJumuaTime);
    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    return jSec > 0 && nowSec >= jSec - PRE_JUMUA_SECS && nowSec < jSec;
  })();
  const isJumuahBlocked = (() => {
    if (!now || !jumuaCfg?.enabled || !jumuaCfg?.blockScreen) return false;
    if (now.getDay() !== 5) return false; // only Friday (5)
    const duration = jumuaCfg.duration ?? 45;
    const nowSec   = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    // blank / "00:00" / midnight all fall back to Dhuhr adhan time
    const time1 = validJumuaTime(jumuaCfg.time1) ?? today?.dhuhr;
    return [time1, validJumuaTime(jumuaCfg.time2), validJumuaTime(jumuaCfg.time3)].some(t => {
      if (!t) return false;
      const start = timeToSec(t);
      return start >= 0 && nowSec >= start && nowSec < start + duration * 60;
    });
  })();

  // ── fullscreen overlays ───────────────────────────────────────────────────────
  if (isJumuahBlocked) return <JumuaScreen/>;
  if (isPreJumua && preJumuaTime) return <PreJumuahScreen jumuaTime={preJumuaTime} is24h={is24h} mosqueName={mosque.name}/>;
  if (showFlash && msgs.length > 0 && displayState.mode === "NORMAL")
    return <FlashMessageScreen message={msgs[flashIndex]?.content ?? ""} total={msgs.length} current={flashIndex + 1}/>;
  if (displayState.mode === "IQAMAH_COUNTDOWN") return <IqamahScreen state={displayState} is24h={is24h}/>;
  if (displayState.mode === "SILENCE")    return <SilenceScreen  prayer={displayState.prayer}/>;
  if (displayState.mode === "PRAYER_DARK" && showBlackScreen) return <PrayerDarkScreen prayer={displayState.prayer}/>;

  // ── normal / pre-adhan display ───────────────────────────────────────────────
  return (
    <>
      {/* CSS animations */}
      <style>{`
        @keyframes pulse-border {
          0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.0)}
          50%{box-shadow:0 0 0 4px rgba(245,158,11,0.6)}
        }
        @keyframes blink-badge {
          0%,100%{opacity:1} 50%{opacity:0.4}
        }
        @keyframes ticker-roll {
          from { transform: translateX(100vw); }
          to   { transform: translateX(-100%); }
        }
        .pre-adhan-card {
          border: 1px solid ${AMBER} !important;
          animation: pulse-border 1.8s ease-in-out infinite;
        }
        .pre-adhan-badge { animation: blink-badge 1.2s ease-in-out infinite; }
      `}</style>

      <div style={{ ...containerBg, color: WHITE, height: "100%", width: "100%", display: "flex", flexDirection: "column", overflow: "hidden", userSelect: "none" }}>

        {/* ═══ HEADER ═══════════════════════════════════════════════════════════ */}
        <header style={{
          display: "flex", alignItems: "center", gap: "1.2vw", padding: "1.1vh 1.8vw",
          borderBottom: `1px solid ${isPreAdhan ? AMBER : tGOLD_DIM}`,
          background: isPreAdhan ? "rgba(245,158,11,0.05)" : "rgba(0,0,0,0.5)",
          flexShrink: 0, transition: "border-color 0.5s, background 0.5s"
        }}>
          <div style={{ width: "5vw", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingRight: "1.2vw", borderRight: `1px solid ${tGOLD_DIM}` }}>
            {showLogo && mosque.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mosque.logoUrl} alt={mosque.name} style={{ width: "4.5vh", height: "4.5vh", objectFit: "contain", borderRadius: "6px" }}/>
            ) : (
              <IconMosque size="4.5vh" color={tGOLD}/>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.8vw", flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: "3vw", fontWeight: 900, letterSpacing: "0.04em", lineHeight: 1, whiteSpace: "nowrap" }}>
                {mosque.name.toUpperCase()}
              </h1>
              {showCityName && cityLabel && <span style={{ color: tGOLD, fontSize: "1.8vw", fontWeight: 700, letterSpacing: "0.08em", flexShrink: 0 }}>· {cityLabel}</span>}
            </div>
            {mosque.associationName && (
              <div style={{ fontSize: "0.9vw", color: MUTED, letterSpacing: "0.1em", marginTop: "0.2vh", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {mosque.associationName}
              </div>
            )}
          </div>
          {isPreAdhan && (
            <div className="pre-adhan-badge" style={{ flexShrink: 0, background: "rgba(245,158,11,0.15)", border: `1px solid ${AMBER}`, borderRadius: "8px", padding: "0.5vh 1.2vw", textAlign: "center" }}>
              <div style={{ fontSize: "0.8vw", color: AMBER, letterSpacing: "0.15em", fontWeight: 700 }}>ADHAN SOON</div>
              <div style={{ fontFamily: MONO, fontSize: "1.5vw", color: WHITE, fontWeight: 900 }}>
                {displayState.prayer?.label.toUpperCase()}
              </div>
            </div>
          )}
          {showTemperature && (
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "0.8vw", background: "rgba(255,255,255,0.04)", border: `1px solid ${tGOLD_DIM}`, borderRadius: "12px", padding: "0.8vh 1.4vw" }}>
              <span style={{ fontSize: "3.5vw", lineHeight: 1 }}>{weather.icon}</span>
              <div>
                <div style={{ fontFamily: CLOCK, fontSize: "3vw", color: "#fbbf24", lineHeight: 1 }}>
                  {temp !== null ? `${temp}°${tempUnit}` : "--°"}
                </div>
                <div style={{ fontSize: "0.8vw", color: tGOLD, letterSpacing: "0.12em", marginTop: "0.2vh" }}>{weather.label}</div>
              </div>
            </div>
          )}
        </header>

        {/* ═══ MIDDLE ═══════════════════════════════════════════════════════════ */}
        <main style={{ display: "flex", flex: 1, minHeight: 0, gap: "1.2vw", padding: "1.2vh 1.5vw" }}>

          {/* ── LEFT CARD ────────────────────────────────────────────────────── */}
          <div className={isPreAdhan ? "pre-adhan-card" : ""} style={{
            ...card, flex: "0 0 52vw", display: "flex", flexDirection: "column",
            overflow: "hidden", transition: "border-color 0.5s",
          }}>

            {/* ── Prayer Name Hero ──────────────────────────────────────────── */}
            <div style={{
              position: "relative", overflow: "hidden", flexShrink: 0,
              padding: "1vh 2vw 0.9vh",
              background: isPreAdhan
                ? "linear-gradient(135deg,rgba(120,60,0,0.45) 0%,rgba(0,0,0,0) 65%)"
                : "linear-gradient(135deg,rgba(20,55,25,0.75) 0%,rgba(0,0,0,0) 65%)",
              borderBottom: `1px solid ${tGOLD_DIM}`,
            }}>
              <div style={{ position: "absolute", right: "-1vw", top: "-1vh", opacity: 0.06, pointerEvents: "none" }}>
                <IconCrescent size="14vw" color={tGOLD}/>
              </div>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ marginBottom: "0.4vh" }}>
                  <span style={pill(
                    isPastLastPrayer
                      ? `linear-gradient(90deg,#4b5563,#6b7280)`
                      : isPreAdhan ? `linear-gradient(90deg,${AMBER},#fbbf24)` : `linear-gradient(90deg,${tGOLD},#e8c860)`,
                    isPastLastPrayer ? WHITE : DARK
                  )}>
                    {isPastLastPrayer ? "DAY PRAYER TIMES" : isPreAdhan ? "⚡ ADHAN APPROACHING" : "NEXT PRAYER"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5vw" }}>
                  <div style={{ fontFamily: MONO, fontSize: "5.5vw", fontWeight: 900, lineHeight: 0.9, letterSpacing: "0.02em", color: isPastLastPrayer ? MUTED : WHITE }}>
                    {isPastLastPrayer ? "ISHA" : nextPray ? nextPray.label.toUpperCase() : "——"}
                  </div>
                  {nextData?.arabic && !isPastLastPrayer && (
                    <div style={{ fontSize: "3vw", color: nextData.color, opacity: 0.85, fontFamily: "serif", lineHeight: 1 }}>
                      {nextData.arabic}
                    </div>
                  )}
                </div>
                <div style={{
                  height: "2px", width: "5vw", borderRadius: "2px", marginTop: "0.6vh",
                  background: `linear-gradient(90deg,${isPreAdhan ? AMBER : (nextData?.color ?? tGOLD)},transparent)`,
                }}/>
              </div>
            </div>

            {/* ── Times + Countdown ─────────────────────────────────────────── */}
            {(() => {
              const af = fmtTime(nextData?.adhan, is24h);
              const qf = fmtTime(nextData?.iqamaTime, is24h);
              const cntColor = isIftarNext ? ORANGE : RED;
              const pColor   = nextData?.color ?? tGOLD;
              return (
                <>
                  {/* ADHAN + IQAMAH — clean flush two-column, no card-within-card */}
                  <div style={{ flexShrink: 0, display: "flex", borderTop: `1px solid ${tGOLD_LINE}`, borderBottom: `1px solid ${tGOLD_LINE}` }}>
                    {/* ADHAN column */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.1vh 1.5vw", background: "rgba(234,179,8,0.05)", borderRight: "1px solid rgba(234,179,8,0.28)" }}>
                      <div style={{ fontSize: "1vw", letterSpacing: "0.4em", color: "#fbbf24", fontWeight: 800, marginBottom: "0.4vh" }}>ADHAN</div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "0.3vw" }}>
                        <div style={{ fontFamily: CLOCK, fontSize: "5.5vw", lineHeight: 1, color: "#fbbf24" }}>{af.hm}</div>
                        {af.ampm && <div style={{ fontSize: "1.4vw", color: "#fbbf24", fontWeight: 700, paddingBottom: "0.4vh" }}>{af.ampm}</div>}
                      </div>
                    </div>
                    {/* IQAMAH column */}
                    {iqamaEnabled && (
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.1vh 1.5vw", background: "rgba(34,197,94,0.05)", borderLeft: "1px solid rgba(34,197,94,0.28)" }}>
                        <div style={{ fontSize: "1vw", letterSpacing: "0.4em", color: "#4ade80", fontWeight: 800, marginBottom: "0.4vh" }}>IQAMAH</div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.3vw" }}>
                          <div style={{ fontFamily: CLOCK, fontSize: "5.5vw", lineHeight: 1, color: "#4ade80" }}>{qf.hm}</div>
                          {qf.ampm && <div style={{ fontSize: "1.4vw", color: "#4ade80", fontWeight: 700, paddingBottom: "0.4vh" }}>{qf.ampm}</div>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Countdown */}
                  <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "0.6vh" }}>
                    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 55%, ${pColor}18 0%, transparent 70%)`, pointerEvents: "none" }}/>
                    <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6vh" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5vw" }}>
                        <IconClock size="1.3vw" color={cntColor}/>
                        <span style={{ fontSize: "1vw", letterSpacing: "0.35em", fontWeight: 800, color: cntColor }}>
                          {isIftarNext ? "TIME TO IFTAR" : "TIME TO ADHAN"}
                        </span>
                      </div>
                      {isIftarNext && (
                        <div style={{ fontSize: "0.75vw", color: TEAL, letterSpacing: "0.3em", fontWeight: 700, opacity: 0.9 }}>RAMADAN MUBARAK</div>
                      )}
                      <div style={{ display: "flex", alignItems: "flex-end" }}>
                        {[{ v: cH, l: "HRS" }, { v: cM, l: "MINS" }, { v: cS, l: "SECS" }].map(({ v, l }, i) => (
                          <div key={l} style={{ display: "flex", alignItems: "flex-end" }}>
                            {i > 0 && <span style={{ fontFamily: CLOCK, color: cntColor, fontSize: "7.5vw", lineHeight: 1, paddingBottom: "1.5vh", opacity: 0.45 }}>:</span>}
                            <div style={{ textAlign: "center", padding: "0 0.5vw" }}>
                              <div style={{ fontFamily: CLOCK, fontSize: "7.5vw", color: cntColor, lineHeight: 1 }}>{v}</div>
                              <div style={{ fontSize: "0.85vw", color: tGOLD, letterSpacing: "0.2em", marginTop: "0.3vh" }}>{l}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ width: "50%", height: "1px", background: `linear-gradient(90deg,transparent,${cntColor}44,transparent)` }}/>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* ── RIGHT PANEL: live clock ─────────────────────────────────────── */}
          <div style={{ ...card, flex: 1, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(150deg,#080a05 0%,#16200a 40%,#26300f 65%,#0c0a03 100%)" }}/>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 70% 40%,rgba(180,130,20,0.22) 0%,transparent 65%)" }}/>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "center", color: tGOLD, opacity: 0.08, pointerEvents: "none" }}>
              <IconMosque size="22vw" color={tGOLD}/>
            </div>
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "1.2vh 2.5vw", gap: "1.2vh" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.1vh" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
                  <div style={{ fontSize: "0.75vw", fontWeight: 700, letterSpacing: "0.45em", color: tGOLD, opacity: 0.7 }}>TODAY</div>
                  {isRamadan && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3vw", background: TEAL_DIM, border: `1px solid ${TEAL}44`, borderRadius: "99px", padding: "0.1vh 0.6vw" }}>
                      <IconCrescent size="0.8vw" color={TEAL}/>
                      <span style={{ fontSize: "0.65vw", fontWeight: 800, letterSpacing: "0.2em", color: TEAL }}>RAMADAN</span>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: "2.4vw", fontWeight: 900, letterSpacing: "0.06em", lineHeight: 1 }}>{dayLabel || "CURRENT TIME"}</div>
                <div style={{ fontSize: "1.05vw", color: MUTED, fontWeight: 600, letterSpacing: "0.12em", marginTop: "0.15vh" }}>{gregDate}</div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4vw" }}>
                <div style={{ fontFamily: CLOCK, fontSize: "12vw", lineHeight: 0.85, letterSpacing: "0.06em" }}>{clockHM}</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: "0.8vh", gap: "0.5vh" }}>
                  <div style={{ fontFamily: CLOCK, fontSize: "3.5vw", color: tGREEN, letterSpacing: "0.04em", lineHeight: 1 }}>:{secs}</div>
                  {ampm && <div style={{ background: tGREEN_DIM, border: `1px solid ${tGOLD_DIM}`, borderRadius: "6px", color: tGREEN, fontSize: "1.2vw", fontWeight: 800, padding: "0.15vh 0.5vw", textAlign: "center", lineHeight: 1.3 }}>{ampm}</div>}
                </div>
              </div>
              <div style={{ height: "2px", background: `linear-gradient(90deg,${tGOLD_LINE},transparent)` }}/>
              {/* Hijri dates on same row */}
              {showHijriDate && (
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "1vw" }}>
                  <div style={{ fontSize: "1.3vw", letterSpacing: "0.1em", color: MUTED, fontWeight: 600 }}>{hijriEn}</div>
                  {hijriAr && <div style={{ fontSize: "1.6vw", direction: "rtl", color: WHITE, fontWeight: 600 }}>{hijriAr}</div>}
                </div>
              )}
              {/* Bottom info row — Ramadan: Suhoor + Iftar; Friday: Sunrise + Jumu'ah; else: Sunrise */}
              <div style={{ display: "flex", gap: "0.8vw" }}>
                {isRamadan ? (
                  /* ── Ramadan row: SUHOOR (left) + IFTAR (right) ── */
                  <>
                    {today?.fajr && (() => {
                      const sf = fmtTime(today.fajr, is24h);
                      return (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.8vw", background: TEAL_DIM, border: `1px solid ${TEAL}33`, borderRadius: "8px", padding: "0.6vh 1vw" }}>
                          <IconMoon size="2vw" color={TEAL}/>
                          <div>
                            <div style={{ fontSize: "0.9vw", fontWeight: 700, letterSpacing: "0.3em", color: TEAL }}>SUHOOR ENDS</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "0.4vw" }}>
                              <span style={{ fontFamily: CLOCK, fontSize: "3vw", color: WHITE, lineHeight: 1 }}>{sf.hm}</span>
                              {sf.ampm && <span style={{ fontSize: "1.2vw", color: TEAL, fontWeight: 700 }}>{sf.ampm}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {today?.maghrib && (() => {
                      const mf = fmtTime(today.maghrib, is24h);
                      return (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.8vw", background: "rgba(249,115,22,0.08)", border: `1px solid rgba(249,115,22,0.25)`, borderRadius: "8px", padding: "0.6vh 1vw" }}>
                          <IconSun size="2vw" color={ORANGE}/>
                          <div>
                            <div style={{ fontSize: "0.9vw", fontWeight: 700, letterSpacing: "0.3em", color: ORANGE }}>IFTAR</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "0.4vw" }}>
                              <span style={{ fontFamily: CLOCK, fontSize: "3vw", color: WHITE, lineHeight: 1 }}>{mf.hm}</span>
                              {mf.ampm && <span style={{ fontSize: "1.2vw", color: ORANGE, fontWeight: 700 }}>{mf.ampm}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  /* ── Normal row: Sunrise (left) + Jumu'ah on Fridays (right) ── */
                  <>
                    {today?.shuruq && (() => {
                      const sf = fmtTime(today.shuruq, is24h);
                      return (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.8vw", background: "rgba(251,191,36,0.07)", border: `1px solid rgba(251,191,36,0.18)`, borderRadius: "8px", padding: "0.6vh 1vw" }}>
                          <IconSun size="2vw" color="#fbbf24"/>
                          <div>
                            <div style={{ fontSize: "0.9vw", fontWeight: 700, letterSpacing: "0.3em", color: "#fbbf24" }}>SUNRISE</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "0.4vw" }}>
                              <span style={{ fontFamily: CLOCK, fontSize: "3vw", color: WHITE, lineHeight: 1 }}>{sf.hm}</span>
                              {sf.ampm && <span style={{ fontSize: "1.2vw", color: "#fbbf24", fontWeight: 700 }}>{sf.ampm}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {jumuaCfg?.enabled && now?.getDay() === 5 && (() => {
                      const jumuaTime = validJumuaTime(jumuaCfg.time1) ?? today?.dhuhr;
                      if (!jumuaTime) return null;
                      const jf = fmtTime(jumuaTime, is24h);
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

        {/* ═══ PRAYER BAR ═══════════════════════════════════════════════════════ */}
        {showPrayerBar && <section style={{ display: "flex", gap: "1vw", padding: "0 1.5vw 1.1vh", flexShrink: 0 }}>
          {prayers.map((p) => {
            const isNext = nextPray?.key === p.key;
            const af = fmtTime(p.adhan, is24h);
            const qf = fmtTime(p.iqamaTime, is24h);
            const c = isPreAdhan && isNext ? AMBER : p.color;
            return (
              <div key={p.key} className={isPreAdhan && isNext ? "pre-adhan-card" : ""} style={{
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
                transition: "flex 0.4s, border-color 0.5s, background 0.5s",
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
                    <span style={{ ...pill(`linear-gradient(90deg,${c}40,${c}20)`, c), fontSize: "0.9vw", padding: "0.3vh 0.9vw", border: `1px solid ${c}55` }}>
                      {isPreAdhan ? "⚡ SOON" : "▶ NEXT"}
                    </span>
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
        </section>}

        {/* ═══ FOOTER ═══════════════════════════════════════════════════════════ */}
        {showFooter && <footer style={{ display: "flex", alignItems: "stretch", height: "9vh", borderTop: `1px solid ${tGOLD_DIM}`, background: "rgba(0,0,0,0.65)", flexShrink: 0, overflow: "hidden" }}>

          {/* LEFT — QR code */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "0.7vw", padding: "0 1.3vw", borderRight: `1px solid ${tGOLD_DIM}` }}>
            {displayUrl
              ? <QRCodeSVG value={displayUrl} size={52} bgColor="transparent" fgColor={tGOLD} level="M"/>
              : <div style={{ width: 52, height: 52, background: tGOLD_DIM, borderRadius: 4 }}/>
            }
            <div style={{ display: "flex", flexDirection: "column", gap: "0.1vh" }}>
              <div style={{ fontSize: "0.65vw", fontWeight: 800, letterSpacing: "0.28em", color: tGOLD, lineHeight: 1.2 }}>SCAN</div>
              <div style={{ fontSize: "0.6vw", color: MUTED, letterSpacing: "0.14em", lineHeight: 1.2 }}>TO VIEW</div>
            </div>
          </div>

          {/* CENTER — scrolling ticker: enters from right (logo side), exits left (QR side) */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative", display: "flex", alignItems: "center" }}>
            <span style={{ position: "absolute", whiteSpace: "nowrap", fontSize: "2.4vw", fontWeight: 800, color: WHITE, animation: `ticker-roll ${tickerDuration}s linear infinite` }}>
              {tickerContent}
            </span>
          </div>

          {/* RIGHT — app logo */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "0.7vw", padding: "0 1.3vw", borderLeft: `1px solid ${tGOLD_DIM}` }}>
            <IconCrescent size="4vh" color={tGOLD}/>
            <div>
              <div style={{ fontFamily: MONO, fontSize: "1.3vw", fontWeight: 900, color: tGOLD, letterSpacing: "0.06em", lineHeight: 1 }}>MAWAQIT</div>
              <div style={{ fontSize: "0.6vw", color: MUTED, letterSpacing: "0.2em", lineHeight: 1.4 }}>PRAYER DISPLAY</div>
            </div>
          </div>

        </footer>}

      </div>
    </>
  );
}
