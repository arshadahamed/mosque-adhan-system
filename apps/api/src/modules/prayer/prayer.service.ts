import { AppError } from "../../middleware/error.js";
import * as repo from "./prayer.repository.js";
import { findMosqueById, findMosqueUser } from "../mosque/mosque.repository.js";

async function assertMosqueAccess(userId: string, mosqueId: string, role: string) {
  if (role === "SUPER_ADMIN") return;
  const link = await findMosqueUser(userId, mosqueId);
  if (!link) throw new AppError(403, "FORBIDDEN", "You do not have access to this mosque");
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateTime(t: string, field: string) {
  if (!TIME_RE.test(t)) throw new AppError(400, "INVALID_TIME", `Invalid time "${t}" for field ${field} (expected HH:MM)`);
}

export async function getToday(mosqueId: string) {
  const mosque = await findMosqueById(mosqueId);
  if (!mosque) throw new AppError(404, "NOT_FOUND", "Mosque not found");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const result = await repo.findDay(mosqueId, year, month, day);
  if (!result?.days[0]) throw new AppError(404, "NO_SCHEDULE", "No prayer schedule available for today");

  return { date: { year, month, day }, ...result.days[0], scheduleSource: result.source };
}

export async function getScheduleForMonth(mosqueId: string, year: number, month: number) {
  if (month < 1 || month > 12) throw new AppError(400, "INVALID_MONTH", "Month must be 1–12");

  const schedule = await repo.findScheduleWithDays(mosqueId, year);
  if (!schedule) return { year, month, source: "CALENDAR", method: null, days: [] };

  const days = schedule.days.filter(d => d.month === month);
  return { year, month, source: schedule.source, method: schedule.method, days };
}

export async function listYears(mosqueId: string) {
  return repo.listScheduleYears(mosqueId);
}

export async function uploadSchedule(
  mosqueId: string,
  data: {
    year: number;
    source?: string;
    method?: string;
    days: Array<{
      month: number;
      day: number;
      fajr: string;
      shuruq: string;
      dhuhr: string;
      asr: string;
      maghrib: string;
      isha: string;
    }>;
  },
  requesterId: string,
  requesterRole: string
) {
  const mosque = await findMosqueById(mosqueId);
  if (!mosque) throw new AppError(404, "NOT_FOUND", "Mosque not found");
  await assertMosqueAccess(requesterId, mosqueId, requesterRole);

  const FIELDS = ["fajr", "shuruq", "dhuhr", "asr", "maghrib", "isha"] as const;

  for (const d of data.days) {
    if (d.month < 1 || d.month > 12) throw new AppError(400, "INVALID_MONTH", `Invalid month ${d.month}`);
    if (d.day < 1 || d.day > 31) throw new AppError(400, "INVALID_DAY", `Invalid day ${d.day}`);
    for (const f of FIELDS) validateTime(d[f], f);
  }

  const schedule = await repo.upsertSchedule(
    mosqueId,
    data.year,
    data.source ?? "CALENDAR",
    data.method,
    data.days
  );

  return { id: schedule.id, year: schedule.year, source: schedule.source, dayCount: data.days.length };
}

export async function updateDay(
  mosqueId: string,
  year: number,
  month: number,
  day: number,
  times: { fajr: string; shuruq: string; dhuhr: string; asr: string; maghrib: string; isha: string },
  requesterId: string,
  requesterRole: string
) {
  await assertMosqueAccess(requesterId, mosqueId, requesterRole);
  const FIELDS = ["fajr", "shuruq", "dhuhr", "asr", "maghrib", "isha"] as const;
  for (const f of FIELDS) validateTime(times[f], f);

  const schedule = await repo.findSchedule(mosqueId, year);
  if (!schedule) throw new AppError(404, "NO_SCHEDULE", "No schedule exists for this year; upload full schedule first");

  return repo.upsertDay(schedule.id, month, day, times);
}

export async function bulkUpdateMonth(
  mosqueId: string,
  year: number,
  month: number,
  days: Array<{ day: number; fajr: string; shuruq: string; dhuhr: string; asr: string; maghrib: string; isha: string }>,
  requesterId: string,
  requesterRole: string
) {
  if (month < 1 || month > 12) throw new AppError(400, "INVALID_MONTH", "Month must be 1–12");
  await assertMosqueAccess(requesterId, mosqueId, requesterRole);

  const FIELDS = ["fajr", "shuruq", "dhuhr", "asr", "maghrib", "isha"] as const;
  for (const d of days) {
    if (d.day < 1 || d.day > 31) throw new AppError(400, "INVALID_DAY", `Invalid day ${d.day}`);
    for (const f of FIELDS) validateTime(d[f], f);
  }

  return repo.upsertMonthDays(mosqueId, year, month, days);
}

export async function clearMonth(
  mosqueId: string,
  year: number,
  month: number,
  requesterId: string,
  requesterRole: string
) {
  if (month < 1 || month > 12) throw new AppError(400, "INVALID_MONTH", "Month must be 1–12");
  await assertMosqueAccess(requesterId, mosqueId, requesterRole);
  return repo.deleteMonthDays(mosqueId, year, month);
}

export async function getWidgetData(mosqueId: string) {
  const mosque = await findMosqueById(mosqueId);
  if (!mosque) throw new AppError(404, "NOT_FOUND", "Mosque not found");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const todayResult = await repo.findDay(mosqueId, year, month, day);
  const today = todayResult?.days[0] ?? null;

  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tYear = tomorrowDate.getFullYear();
  const tMonth = tomorrowDate.getMonth() + 1;
  const tDay = tomorrowDate.getDate();

  const tomorrowResult = await repo.findDay(mosqueId, tYear, tMonth, tDay);
  const tomorrow = tomorrowResult?.days[0] ?? null;

  const flashMessages = await repo.findFlashMessages(mosqueId);

  return {
    mosque: {
      id: mosque.id, slug: mosque.slug, name: mosque.name,
      timezone: mosque.timezone, config: mosque.config,
    },
    today: today ? { year, month, day, fajr: today.fajr, shuruq: today.shuruq, dhuhr: today.dhuhr, asr: today.asr, maghrib: today.maghrib, isha: today.isha } : null,
    tomorrow: tomorrow ? { year: tYear, month: tMonth, day: tDay, fajr: tomorrow.fajr, shuruq: tomorrow.shuruq, dhuhr: tomorrow.dhuhr, asr: tomorrow.asr, maghrib: tomorrow.maghrib, isha: tomorrow.isha } : null,
    flashMessages,
  };
}
