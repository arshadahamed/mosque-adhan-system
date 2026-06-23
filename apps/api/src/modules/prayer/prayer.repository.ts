import { prisma } from "../../config/db.js";
import type { Prisma } from "@prisma/client";

export const findSchedule = (mosqueId: string, year: number) =>
  prisma.prayerSchedule.findUnique({ where: { mosqueId_year: { mosqueId, year } } });

export const findScheduleWithDays = (mosqueId: string, year: number) =>
  prisma.prayerSchedule.findUnique({
    where: { mosqueId_year: { mosqueId, year } },
    include: { days: { orderBy: [{ month: "asc" }, { day: "asc" }] } },
  });

export const findDay = (mosqueId: string, year: number, month: number, day: number) =>
  prisma.prayerSchedule.findUnique({
    where: { mosqueId_year: { mosqueId, year } },
    select: {
      id: true, source: true, method: true, year: true,
      days: { where: { month, day } },
    },
  });

export const upsertSchedule = async (
  mosqueId: string,
  year: number,
  source: string,
  method: string | undefined,
  days: Omit<Prisma.PrayerDayCreateManyScheduleInput, "scheduleId">[]
) => {
  // Delete existing schedule for the year (cascade deletes days)
  await prisma.prayerSchedule.deleteMany({ where: { mosqueId, year } });

  return prisma.prayerSchedule.create({
    data: {
      mosqueId,
      year,
      source: source as any,
      method: method ?? null,
      days: { createMany: { data: days } },
    },
    include: { days: false },
  });
};

export const upsertDay = (
  scheduleId: string,
  month: number,
  day: number,
  times: { fajr: string; shuruq: string; dhuhr: string; asr: string; maghrib: string; isha: string }
) =>
  prisma.prayerDay.upsert({
    where: { scheduleId_month_day: { scheduleId, month, day } },
    create: { scheduleId, month, day, ...times },
    update: times,
  });

export const listScheduleYears = (mosqueId: string) =>
  prisma.prayerSchedule.findMany({
    where: { mosqueId },
    select: { year: true, source: true, method: true },
    orderBy: { year: "desc" },
  });
