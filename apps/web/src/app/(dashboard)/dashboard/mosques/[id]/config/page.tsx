"use client";
import { use, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { YesNoToggle, ToggleField } from "@/components/ui/toggle";
import { AccordionSection } from "@/components/ui/accordion";

type Props = { params: Promise<{ id: string }> };

// ── Constants ─────────────────────────────────────────────────────────────────

const TIMEZONES = [
  "Africa/Abidjan","Africa/Cairo","Africa/Casablanca","Africa/Nairobi","Africa/Tunis",
  "America/New_York","America/Chicago","America/Los_Angeles","America/Toronto","America/Sao_Paulo",
  "Asia/Colombo","Asia/Dhaka","Asia/Dubai","Asia/Jakarta","Asia/Karachi","Asia/Kolkata",
  "Asia/Kuala_Lumpur","Asia/Riyadh","Asia/Singapore","Asia/Tehran","Asia/Tokyo",
  "Europe/Amsterdam","Europe/Berlin","Europe/Istanbul","Europe/London","Europe/Madrid",
  "Europe/Paris","Europe/Rome","Pacific/Auckland","UTC",
];

const DST_OPTIONS = [
  { value: "auto", label: "Auto (Depends on timezone)" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const HIJRI_ADJUSTMENTS = Array.from({ length: 5 }, (_, i) => i - 2); // -2 to +2

const CALC_SOURCES = [
  "Calendar (prayer times filled in for the whole year)",
  "Calculation (automatic calculation)",
  "Fixed (same times every day)",
];

const ATHAN_SOURCES = [
  "Default",
  "Mecca — Sheikh Ali Ahmed Molla",
  "Medina — Sheikh Ali Nufais",
  "Al-Azhar — Sheikh Fares Abbad",
  "Tunis — National Radio",
  "Cairo — Sheikh Mahmoud Ali Al-Banna",
  "None (silent)",
];

const IQAMA_SOUNDS = ["Samover", "Takbir", "None (silent)"];

const PRAYERS_5 = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

const THEMES = [
  { id: "default", label: "Default" },
  { id: "dark", label: "Dark" },
  { id: "minimal", label: "Minimal" },
  { id: "classic", label: "Classic" },
];

const WALLPAPERS = [
  { id: "void", label: "Void", bg: "linear-gradient(135deg,#080808,#141414)" },
  { id: "dark-purple", label: "Deep Purple", bg: "linear-gradient(135deg,#1a0533,#3d0066)" },
  { id: "blue", label: "Night Blue", bg: "linear-gradient(135deg,#0a1628,#1a3a5c)" },
  { id: "green", label: "Forest", bg: "linear-gradient(135deg,#002200,#005500)" },
  { id: "cosmic", label: "Cosmic", bg: "linear-gradient(135deg,#050510,#1a0a3c)" },
  { id: "teal", label: "Teal", bg: "linear-gradient(135deg,#003333,#006666)" },
  { id: "charcoal", label: "Charcoal", bg: "linear-gradient(135deg,#1c1c1c,#2d2d2d)" },
  { id: "amber", label: "Amber Night", bg: "linear-gradient(135deg,#1a0a00,#3d1a00)" },
  { id: "dawn", label: "Dawn", bg: "linear-gradient(135deg,#0d0d1a,#2a1a2e)" },
  { id: "deep-sea", label: "Deep Sea", bg: "linear-gradient(135deg,#000033,#001a33)" },
  { id: "mosque", label: "Mosque", bg: "linear-gradient(135deg,#2c1810,#5c3a2a)" },
  { id: "night", label: "Night Sky", bg: "linear-gradient(135deg,#050510,#0a0a1a)" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MosqueConfigPage({ params }: Props) {
  const { id } = use(params);
  const { accessToken } = useAuthStore();

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  const { data: rawConfig, isLoading } = useQuery({
    queryKey: ["mosque-config", id],
    queryFn: async () => {
      const res = await api.get(`/mosques/${id}/config`, { headers: { Authorization: `Bearer ${accessToken}` } });
      return res.data.data as Record<string, any> | null;
    },
    enabled: !!accessToken,
  });

  const cfg = (section: string) => (rawConfig as any)?.[section] ?? {};

  // ── Section mutation helper ──────────────────────────────────────────────────
  const patchSection = async (section: string, body: Record<string, unknown>) => {
    await api.patch(`/mosques/${id}/config/${section}`, body, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  };

  // ── Regional ────────────────────────────────────────────────────────────────
  const [timezone, setTimezone] = useState("UTC");
  const [dst, setDst] = useState("auto");
  const [hijriAdjust, setHijriAdjust] = useState(0);
  const [timeFormat, setTimeFormat] = useState<"24" | "12">("12");
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");

  // ── Calculation ─────────────────────────────────────────────────────────────
  const [calcSource, setCalcSource] = useState(CALC_SOURCES[0]);

  // ── Athan ───────────────────────────────────────────────────────────────────
  const [athanSource, setAthanSource] = useState(ATHAN_SOURCES[0]);
  const [athanDuration, setAthanDuration] = useState(3);
  const [athanEnabled, setAthanEnabled] = useState<Record<string, boolean>>({
    fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true,
  });

  // ── Iqama ───────────────────────────────────────────────────────────────────
  const [iqamaEnabled, setIqamaEnabled] = useState(false);
  const [iqamaSound, setIqamaSound] = useState(IQAMA_SOUNDS[0]);
  const [iqamaCountdown, setIqamaCountdown] = useState(true);
  const [iqamaDisplaySecs, setIqamaDisplaySecs] = useState(15);
  const [iqamaAlways24h, setIqamaAlways24h] = useState(false);
  const [iqamaDelays, setIqamaDelays] = useState({ fajr: 30, dhuhr: 15, asr: 15, maghrib: 5, isha: 15 });
  const [iqamaLight, setIqamaLight] = useState<Record<string, number>>({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 });

  // ── Jumua ───────────────────────────────────────────────────────────────────
  const [jumuaEnabled, setJumuaEnabled] = useState(true);
  const [jumuaTime1, setJumuaTime1] = useState("12:30");
  const [jumuaTime2, setJumuaTime2] = useState("");
  const [jumuaTime3, setJumuaTime3] = useState("");
  const [jumuaSummerTime, setJumuaSummerTime] = useState(false);
  const [jumuaReminder, setJumuaReminder] = useState(false);
  const [jumuaBlockScreen, setJumuaBlockScreen] = useState(true);
  const [jumuaDuration, setJumuaDuration] = useState(30);

  // ── Estimated durations ─────────────────────────────────────────────────────
  const [durations, setDurations] = useState({ fajr: 10, dhuhr: 0, asr: 1, maghrib: 1, isha: 10 });

  // ── Content / Invocations ───────────────────────────────────────────────────
  const [closeAfterAthan, setCloseAfterAthan] = useState(true);
  const [invocationsAfterSunnah, setInvocationsAfterSunnah] = useState(true);
  const [randomHadith, setRandomHadith] = useState(false);

  // ── Display ─────────────────────────────────────────────────────────────────
  const [dispCityName, setDispCityName] = useState(true);
  const [dispLogo, setDispLogo] = useState(false);
  const [dispFooter, setDispFooter] = useState(false);
  const [dispPrayersOnScreen, setDispPrayersOnScreen] = useState(false);
  const [dispSallahInyabi, setDispSallahInyabi] = useState(false);
  const [dispBlackScreen, setDispBlackScreen] = useState(true);
  const [dispHijriDate, setDispHijriDate] = useState(false);
  const [dispTemperature, setDispTemperature] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [selectedWallpaper, setSelectedWallpaper] = useState("void");

  // ── Eid and Ramadan ─────────────────────────────────────────────────────────
  const [eidTime1, setEidTime1] = useState("");
  const [eidTime2, setEidTime2] = useState("");
  const [eidTime3, setEidTime3] = useState("");
  const [imsak, setImsak] = useState(0);

  // ── Populate from server ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!rawConfig) return;

    const r = cfg("regional");
    setTimezone(r.timezone ?? "UTC");
    setDst(r.dst ?? "auto");
    setHijriAdjust(r.hijriAdjust ?? 0);
    setTimeFormat(r.timeFormat ?? "12");
    setTempUnit(r.tempUnit ?? "C");

    const c = cfg("calculation");
    setCalcSource(c.source ?? CALC_SOURCES[0]);

    const a = cfg("athan");
    setAthanSource(a.source ?? ATHAN_SOURCES[0]);
    setAthanDuration(a.duration ?? 3);
    setAthanEnabled({
      fajr: a.fajrEnabled ?? true, dhuhr: a.dhuhrEnabled ?? true,
      asr: a.asrEnabled ?? true, maghrib: a.maghribEnabled ?? true, isha: a.ishaEnabled ?? true,
    });

    const iq = cfg("iqama");
    setIqamaEnabled(iq.enabled ?? false);
    setIqamaSound(iq.sound ?? IQAMA_SOUNDS[0]);
    setIqamaCountdown(iq.countdown ?? true);
    setIqamaDisplaySecs(iq.displaySecs ?? 15);
    setIqamaAlways24h(iq.always24h ?? false);
    setIqamaDelays({ fajr: iq.fajr ?? 30, dhuhr: iq.dhuhr ?? 15, asr: iq.asr ?? 15, maghrib: iq.maghrib ?? 5, isha: iq.isha ?? 15 });
    setIqamaLight({ fajr: iq.lightFajr ?? 0, dhuhr: iq.lightDhuhr ?? 0, asr: iq.lightAsr ?? 0, maghrib: iq.lightMaghrib ?? 0, isha: iq.lightIsha ?? 0 });

    const j = cfg("jumua");
    setJumuaEnabled(j.enabled ?? true);
    setJumuaTime1(j.time1 ?? "12:30");
    setJumuaTime2(j.time2 ?? "");
    setJumuaTime3(j.time3 ?? "");
    setJumuaSummerTime(j.summerTime ?? false);
    setJumuaReminder(j.reminder ?? false);
    setJumuaBlockScreen(j.blockScreen ?? true);
    setJumuaDuration(j.duration ?? 30);

    const d = cfg("durations");
    setDurations({ fajr: d.fajr ?? 10, dhuhr: d.dhuhr ?? 0, asr: d.asr ?? 1, maghrib: d.maghrib ?? 1, isha: d.isha ?? 10 });

    const ct = cfg("content");
    setCloseAfterAthan(ct.closeAfterAthan ?? true);
    setInvocationsAfterSunnah(ct.invocationsAfterSunnah ?? true);
    setRandomHadith(ct.randomHadith ?? false);

    const dp = cfg("display");
    setDispCityName(dp.cityName ?? true);
    setDispLogo(dp.logo ?? false);
    setDispFooter(dp.footer ?? false);
    setDispPrayersOnScreen(dp.prayersOnScreen ?? false);
    setDispSallahInyabi(dp.sallahInyabi ?? false);
    setDispBlackScreen(dp.blackScreen ?? true);
    setDispHijriDate(dp.hijriDate ?? false);
    setDispTemperature(dp.temperature ?? true);
    setSelectedTheme(dp.theme ?? "default");
    setSelectedWallpaper(dp.wallpaper ?? "void");

    const e = cfg("eid");
    setEidTime1(e.time1 ?? "");
    setEidTime2(e.time2 ?? "");
    setEidTime3(e.time3 ?? "");
    setImsak(e.imsak ?? 0);
  }, [rawConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Global save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveStatus("saving");
    setSaveError("");
    try {
      await Promise.all([
        patchSection("regional", { timezone, dst, hijriAdjust, timeFormat, tempUnit }),
        patchSection("calculation", { source: calcSource }),
        patchSection("athan", {
          source: athanSource, duration: athanDuration,
          fajrEnabled: athanEnabled.fajr, dhuhrEnabled: athanEnabled.dhuhr,
          asrEnabled: athanEnabled.asr, maghribEnabled: athanEnabled.maghrib, ishaEnabled: athanEnabled.isha,
        }),
        patchSection("iqama", {
          enabled: iqamaEnabled, sound: iqamaSound, countdown: iqamaCountdown,
          displaySecs: iqamaDisplaySecs, always24h: iqamaAlways24h,
          fajr: iqamaDelays.fajr, dhuhr: iqamaDelays.dhuhr, asr: iqamaDelays.asr,
          maghrib: iqamaDelays.maghrib, isha: iqamaDelays.isha,
          lightFajr: iqamaLight.fajr, lightDhuhr: iqamaLight.dhuhr, lightAsr: iqamaLight.asr,
          lightMaghrib: iqamaLight.maghrib, lightIsha: iqamaLight.isha,
        }),
        patchSection("jumua", {
          enabled: jumuaEnabled, time1: jumuaTime1, time2: jumuaTime2, time3: jumuaTime3,
          summerTime: jumuaSummerTime, reminder: jumuaReminder, blockScreen: jumuaBlockScreen,
          duration: jumuaDuration,
        }),
        patchSection("durations", durations),
        patchSection("content", { closeAfterAthan, invocationsAfterSunnah, randomHadith }),
        patchSection("display", {
          cityName: dispCityName, logo: dispLogo, footer: dispFooter,
          prayersOnScreen: dispPrayersOnScreen, sallahInyabi: dispSallahInyabi,
          blackScreen: dispBlackScreen, hijriDate: dispHijriDate, temperature: dispTemperature,
          theme: selectedTheme, wallpaper: selectedWallpaper,
        }),
        patchSection("eid", { time1: eidTime1, time2: eidTime2, time3: eidTime3, imsak }),
      ]);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (e: any) {
      setSaveStatus("error");
      setSaveError(e.response?.data?.error?.message ?? "Save failed. Please try again.");
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading configuration…</p>;

  return (
    <div className="space-y-3 max-w-4xl pb-8">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/mosques/${id}`} className="text-sm text-primary hover:underline">◀ Back</Link>
        <h2 className="text-xl font-semibold">Prayer times configuration</h2>
      </div>
      <p className="text-xs text-muted-foreground">* Required</p>

      {/* ── 1. Regional settings ─────────────────────────────────────────────── */}
      <AccordionSection title="Regional settings" defaultOpen>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Time zone *</label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
              className="mt-1 w-full h-10 rounded border border-border bg-white px-3 text-sm">
              {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Daylight saving time (DST) *</label>
            <select value={dst} onChange={(e) => setDst(e.target.value)}
              className="mt-1 w-full h-10 rounded border border-border bg-white px-3 text-sm">
              {DST_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Adjustment of the Hegira date *</label>
            <select value={hijriAdjust} onChange={(e) => setHijriAdjust(Number(e.target.value))}
              className="mt-1 w-full h-10 rounded border border-border bg-white px-3 text-sm">
              {HIJRI_ADJUSTMENTS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Time format *</p>
              <div className="flex gap-4 mt-1">
                {(["24", "12"] as const).map((f) => (
                  <label key={f} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" checked={timeFormat === f} onChange={() => setTimeFormat(f)} /> {f}h
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Temperature unit *</p>
              <div className="flex gap-4 mt-1">
                {(["C", "F"] as const).map((u) => (
                  <label key={u} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" checked={tempUnit === u} onChange={() => setTempUnit(u)} /> °{u}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* ── 2. Calculation of prayer times ───────────────────────────────────── */}
      <AccordionSection title="Calculation of prayer times">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Copy the schedule from another mosque</label>
            <input type="search" placeholder="Search by name, city, zipcode…"
              className="mt-1 w-full h-10 rounded border border-border bg-white px-3 text-sm" disabled
              title="Coming soon" />
            <p className="text-xs text-muted-foreground mt-1">Coming soon — search other mosques to copy their timetable.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Time calculation source *</label>
            <select value={calcSource} onChange={(e) => setCalcSource(e.target.value)}
              className="mt-1 w-full h-10 rounded border border-border bg-white px-3 text-sm">
              {CALC_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="p-3 bg-gray-50 rounded border border-border">
            <p className="text-sm font-medium mb-1">Timetable</p>
            <p className="text-xs text-muted-foreground mb-2">Manage monthly prayer times — upload CSV files or edit individual days.</p>
            <Link href={`/dashboard/mosques/${id}/prayer-times`}
              className="inline-block px-3 py-1.5 text-xs font-medium text-white rounded"
              style={{ background: "#6200ea" }}>
              Open Timetable →
            </Link>
          </div>
        </div>
      </AccordionSection>

      {/* ── 3. Al-Athan ──────────────────────────────────────────────────────── */}
      <AccordionSection title="Al-Athan">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Athan</label>
              <select value={athanSource} onChange={(e) => setAthanSource(e.target.value)}
                className="mt-1 w-full h-10 rounded border border-border bg-white px-3 text-sm">
                {ATHAN_SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Athan duration (minutes) *</label>
              <Input type="number" min={1} max={10} value={athanDuration}
                onChange={(e) => setAthanDuration(Number(e.target.value))}
                className="mt-1 bg-white w-28" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Enable/disable athan by prayer *</p>
            <div className="flex gap-2 flex-wrap">
              {PRAYERS_5.map((p) => (
                <button key={p} type="button"
                  onClick={() => setAthanEnabled((prev) => ({ ...prev, [p]: !prev[p] }))}
                  className={`px-3 py-1.5 rounded text-xs font-bold text-white transition-colors ${athanEnabled[p] ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}`}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* ── 4. Iqama ─────────────────────────────────────────────────────────── */}
      <AccordionSection title="Iqama">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <YesNoToggle value={iqamaEnabled} onChange={setIqamaEnabled} />
            <div>
              <p className="text-sm font-medium">Enabled</p>
              <p className="text-xs text-muted-foreground">Turn on the iqama feature to display iqama times on mosque screens.</p>
            </div>
          </div>

          {iqamaEnabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Iqama</label>
                  <select value={iqamaSound} onChange={(e) => setIqamaSound(e.target.value)}
                    className="mt-1 w-full h-10 rounded border border-border bg-white px-3 text-sm">
                    {IQAMA_SOUNDS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Iqama signal display time (secs) *</label>
                  <Input type="number" min={5} max={300} value={iqamaDisplaySecs}
                    onChange={(e) => setIqamaDisplaySecs(Number(e.target.value))}
                    className="mt-1 bg-white w-28" />
                </div>
              </div>

              <div className="flex gap-8">
                <div className="flex items-center gap-2">
                  <YesNoToggle value={iqamaCountdown} onChange={setIqamaCountdown} />
                  <span className="text-sm">Countdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <YesNoToggle value={iqamaAlways24h} onChange={setIqamaAlways24h} />
                  <span className="text-sm">Always display iqama times in 24-hour format</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Waiting time between athen and iqama *</p>
                <div className="grid grid-cols-5 gap-3">
                  {PRAYERS_5.map((p) => (
                    <div key={p}>
                      <label className="text-xs font-medium capitalize">{p} *</label>
                      <Input type="number" min={0} className="mt-1 bg-white h-8 text-sm"
                        value={iqamaDelays[p]}
                        onChange={(e) => setIqamaDelays((prev) => ({ ...prev, [p]: Number(e.target.value) }))} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Iqama light after athen for mins</p>
                <p className="text-xs text-muted-foreground mb-2">Number of minutes the iqama light stays on after the athen.</p>
                <div className="grid grid-cols-5 gap-3">
                  {PRAYERS_5.map((p) => (
                    <div key={p}>
                      <label className="text-xs font-medium capitalize">{p}</label>
                      <Input type="number" min={0} className="mt-1 bg-white h-8 text-sm"
                        value={iqamaLight[p]}
                        onChange={(e) => setIqamaLight((prev) => ({ ...prev, [p]: Number(e.target.value) }))} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </AccordionSection>

      {/* ── 5. Jumua ─────────────────────────────────────────────────────────── */}
      <AccordionSection title="Jumua">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <YesNoToggle value={jumuaEnabled} onChange={setJumuaEnabled} />
            <div>
              <p className="text-sm font-medium">The hour of Jumua lies in this life</p>
              <p className="text-xs text-muted-foreground">Enable Jumua display on the mosque screen.</p>
            </div>
          </div>

          {jumuaEnabled && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Jumua's time</label>
                  <Input type="time" className="mt-1 bg-white" value={jumuaTime1}
                    onChange={(e) => setJumuaTime1(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">2nd Jumua's time</label>
                  <Input type="time" className="mt-1 bg-white" value={jumuaTime2}
                    onChange={(e) => setJumuaTime2(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">3rd Jumua's time</label>
                  <Input type="time" className="mt-1 bg-white" value={jumuaTime3}
                    onChange={(e) => setJumuaTime3(e.target.value)} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <YesNoToggle value={jumuaSummerTime} onChange={setJumuaSummerTime} />
                  <div>
                    <p className="text-sm font-medium">Apply summer time</p>
                    <p className="text-xs text-muted-foreground">If noon time exceeds 12h5min, apply the summer prayer time.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <YesNoToggle value={jumuaReminder} onChange={setJumuaReminder} />
                  <div>
                    <p className="text-sm font-medium">Show a reminder during Jumua</p>
                    <p className="text-xs text-muted-foreground">A reminder message is displayed on screen when no image is shown.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <YesNoToggle value={jumuaBlockScreen} onChange={setJumuaBlockScreen} />
                  <div>
                    <p className="text-sm font-medium">Display a block screen during Jumua</p>
                    <p className="text-xs text-muted-foreground">A black block overlay is shown during the Jumua prayer.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Approximate duration of the Jumua (sermon + prayer, minutes)</label>
                <Input type="number" min={0} className="mt-1 bg-white w-28" value={jumuaDuration}
                  onChange={(e) => setJumuaDuration(Number(e.target.value))} />
              </div>
            </>
          )}
        </div>
      </AccordionSection>

      {/* ── 6. Estimated duration (REQUIRED) ────────────────────────────────── */}
      <AccordionSection title="Estimated duration of each prayer (in minutes) *" defaultOpen>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">How long each prayer takes. Used to calculate the black screen duration.</p>
          <div className="grid grid-cols-5 gap-3">
            {PRAYERS_5.map((p) => (
              <div key={p}>
                <label className="text-xs font-medium capitalize">{p} *</label>
                <Input type="number" min={0} className="mt-1 bg-white h-8 text-sm"
                  value={durations[p]}
                  onChange={(e) => setDurations((prev) => ({ ...prev, [p]: Number(e.target.value) }))} />
              </div>
            ))}
          </div>
        </div>
      </AccordionSection>

      {/* ── 7. Invocations and hadiths ───────────────────────────────────────── */}
      <AccordionSection title="Invocations and hadiths">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <YesNoToggle value={closeAfterAthan} onChange={setCloseAfterAthan} />
            <div>
              <p className="text-sm font-medium">Close after athen</p>
              <p className="text-xs text-muted-foreground">Announcements close automatically after the athen.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <YesNoToggle value={invocationsAfterSunnah} onChange={setInvocationsAfterSunnah} />
            <div>
              <p className="text-sm font-medium">Invocations after sunnah</p>
              <p className="text-xs text-muted-foreground">Display invocations after the sunnah prayer.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <YesNoToggle value={randomHadith} onChange={setRandomHadith} />
            <div>
              <p className="text-sm font-medium">Randomly display a hadith every 5 min</p>
              <p className="text-xs text-muted-foreground">Shows a random hadith or invocation on screen every 5 minutes.</p>
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* ── 8. Display ───────────────────────────────────────────────────────── */}
      <AccordionSection title="Display">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <ToggleField label="Display the city name"
              description="Used to display the geographical location of the mosque on screen."
              checked={dispCityName} onChange={setDispCityName} />
            <ToggleField label="Display the logo of the mosque"
              description="Used by prayer times in educational mosque screens."
              checked={dispLogo} onChange={setDispLogo} />
            <ToggleField label="Display the footer"
              description="A footer presents the mosque name and director on the screen."
              checked={dispFooter} onChange={setDispFooter} />
            <ToggleField label="Display prayers on mosque screen"
              checked={dispPrayersOnScreen} onChange={setDispPrayersOnScreen} />
            <ToggleField label="Display Sallah and Inyabi"
              checked={dispSallahInyabi} onChange={setDispSallahInyabi} />
            <ToggleField label="Black screen during prayer"
              description="Activates a black screen during prayer times."
              checked={dispBlackScreen} onChange={setDispBlackScreen} />
            <ToggleField label="Display the Hegira date"
              description="Shows the Hijri (Islamic) calendar date on screen."
              checked={dispHijriDate} onChange={setDispHijriDate} />
            <ToggleField label="Display the temperature"
              description="The temperature is shown using the unit set in Regional settings."
              checked={dispTemperature} onChange={setDispTemperature} />
          </div>

          {/* Theme */}
          <div>
            <label className="text-sm font-medium">Theme *</label>
            <div className="mt-2 flex gap-2 flex-wrap">
              {THEMES.map((t) => (
                <button key={t.id} type="button"
                  onClick={() => setSelectedTheme(t.id)}
                  className={`px-4 py-2 rounded border text-sm transition-all ${selectedTheme === t.id ? "border-purple-600 bg-purple-50 text-purple-700 font-semibold" : "border-border bg-white"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Wallpaper */}
          <div>
            <label className="text-sm font-medium">Wallpaper *</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {WALLPAPERS.map((w) => (
                <button key={w.id} type="button"
                  onClick={() => setSelectedWallpaper(w.id)}
                  className={`relative h-16 rounded overflow-hidden border-2 transition-all ${selectedWallpaper === w.id ? "border-purple-600 ring-2 ring-purple-300" : "border-border"}`}
                  style={{ background: w.bg }}>
                  <span className="absolute bottom-1 inset-x-0 text-center text-xs text-white/80 font-medium">{w.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* ── 9. Eid and Ramadan ───────────────────────────────────────────────── */}
      <AccordionSection title="Eid and Ramadan">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">1st Eid prayer time</label>
              <Input type="time" className="mt-1 bg-white" value={eidTime1}
                onChange={(e) => setEidTime1(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">2nd Eid prayer time</label>
              <Input type="time" className="mt-1 bg-white" value={eidTime2}
                onChange={(e) => setEidTime2(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">3rd Eid prayer time</label>
              <Input type="time" className="mt-1 bg-white" value={eidTime3}
                onChange={(e) => setEidTime3(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Show snack — number of minutes before Fajr *</label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1">
              Displays a countdown to Imsak. Set to 0 to disable. The screen shows "Imsak" the specified minutes before Fajr.
            </p>
            <Input type="number" min={0} max={60} className="bg-white w-28" value={imsak}
              onChange={(e) => setImsak(Number(e.target.value))} />
          </div>
        </div>
      </AccordionSection>

      {/* ── Global Save / Cancel ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Button
          type="button"
          style={{ background: "#6200ea" }}
          disabled={saveStatus === "saving"}
          onClick={handleSave}
        >
          {saveStatus === "saving" ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saveStatus === "saving"}
          onClick={() => window.location.reload()}
        >
          Cancel
        </Button>
        {saveStatus === "saved" && <span className="text-sm text-green-600 font-medium">Saved ✓</span>}
        {saveStatus === "error" && <span className="text-sm text-red-500">{saveError}</span>}
      </div>
    </div>
  );
}
