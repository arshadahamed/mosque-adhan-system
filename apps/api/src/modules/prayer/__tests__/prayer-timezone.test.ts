import { describe, it, expect, vi, afterEach } from "vitest";

import { getMosqueLocalDate } from "../prayer.service.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("getMosqueLocalDate", () => {
  it("returns the mosque-local date when UTC is behind local date", () => {
    // UTC 22:00 on Jan 15 → Asia/Kolkata (UTC+5:30) is 03:30 on Jan 16
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T22:00:00.000Z"));
    expect(getMosqueLocalDate("Asia/Kolkata")).toEqual({ year: 2026, month: 1, day: 16 });
  });

  it("returns the mosque-local date when UTC is ahead of local date", () => {
    // UTC 01:00 on Jan 16 → America/New_York (UTC-5) is 20:00 on Jan 15
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-16T01:00:00.000Z"));
    expect(getMosqueLocalDate("America/New_York")).toEqual({ year: 2026, month: 1, day: 15 });
  });

  it("returns next mosque-local day with offsetDays=1", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T22:00:00.000Z")); // Kolkata → Jan 16
    expect(getMosqueLocalDate("Asia/Kolkata", 1)).toEqual({ year: 2026, month: 1, day: 17 });
    // NOTE: Jan 16 + 1 = Jan 17 in Kolkata
    // We pass the UTC date +1 day then re-format in mosque tz:
    // new Date("2026-01-16T22:00:00.000Z") in Kolkata = 2026-01-17 03:30
  });

  it("handles UTC timezone without offset", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T14:30:00.000Z"));
    expect(getMosqueLocalDate("UTC")).toEqual({ year: 2026, month: 3, day: 15 });
  });
});
