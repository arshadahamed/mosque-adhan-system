import { describe, it, expect } from "vitest";
import { addMinutes, formatCountdown, getNextPrayer, applyHijriAdjust } from "@/lib/display-utils";

describe("addMinutes", () => {
  it("adds minutes within the same hour", () => {
    expect(addMinutes("05:30", 20)).toBe("05:50");
  });

  it("rolls over to next hour", () => {
    expect(addMinutes("05:45", 20)).toBe("06:05");
  });

  it("wraps past midnight", () => {
    expect(addMinutes("23:50", 20)).toBe("00:10");
  });

  it("handles zero offset", () => {
    expect(addMinutes("12:30", 0)).toBe("12:30");
  });
});

describe("formatCountdown", () => {
  it("formats seconds into HH:MM:SS", () => {
    expect(formatCountdown(3661)).toBe("01:01:01");
  });

  it("pads single digits", () => {
    expect(formatCountdown(65)).toBe("00:01:05");
  });

  it("handles zero", () => {
    expect(formatCountdown(0)).toBe("00:00:00");
  });
});

describe("getNextPrayer", () => {
  const prayers = [
    { key: "fajr",    label: "Fajr",    adhan: "04:29" },
    { key: "dhuhr",   label: "Dhuhr",   adhan: "12:12" },
    { key: "asr",     label: "Asr",     adhan: "15:40" },
    { key: "maghrib", label: "Maghrib", adhan: "18:29" },
    { key: "isha",    label: "Isha",    adhan: "19:45" },
  ];
  const tomorrow = { fajr: "04:30" };

  it("returns the first upcoming prayer", () => {
    const now = new Date(2026, 0, 1, 10, 0, 0); // 10:00:00 AM
    const result = getNextPrayer(prayers, now, tomorrow);
    expect(result?.key).toBe("dhuhr");
    // 12:12 = 12*3600+12*60 = 43920s, 10:00 = 36000s → diff = 7920
    expect(result?.secondsUntil).toBe(7920);
  });

  it("returns tomorrow fajr when all prayers have passed", () => {
    const now = new Date(2026, 0, 1, 22, 0, 0); // 10:00 PM
    const result = getNextPrayer(prayers, now, tomorrow);
    expect(result?.key).toBe("fajr");
    // now = 22*3600 = 79200s, midnight = 86400s, fajr = 4*3600+30*60 = 16200s
    // until midnight = 86400 - 79200 = 7200, + fajr = 23400
    expect(result?.secondsUntil).toBe(23400);
  });

  it("returns null when all prayers passed and no tomorrow", () => {
    const now = new Date(2026, 0, 1, 22, 0, 0);
    expect(getNextPrayer(prayers, now, null)).toBeNull();
  });
});

describe("applyHijriAdjust", () => {
  it("returns the same date for adjustment 0", () => {
    const d = new Date("2026-01-15T12:00:00Z");
    expect(applyHijriAdjust(d, 0).getTime()).toBe(d.getTime());
  });

  it("adds +1 day for adjustment +1", () => {
    const d = new Date("2026-01-15T12:00:00Z");
    const result = applyHijriAdjust(d, 1);
    expect(result.getTime()).toBe(d.getTime() + 86_400_000);
  });

  it("subtracts 2 days for adjustment -2", () => {
    const d = new Date("2026-01-15T12:00:00Z");
    const result = applyHijriAdjust(d, -2);
    expect(result.getTime()).toBe(d.getTime() - 2 * 86_400_000);
  });
});
