import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as svc from "./prayer.service.js";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM");

const daySchema = z.object({
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  fajr: timeSchema,
  shuruq: timeSchema,
  dhuhr: timeSchema,
  asr: timeSchema,
  maghrib: timeSchema,
  isha: timeSchema,
});

// GET /mosques/:mosqueId/prayer-times/today
export async function getToday(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getToday(req.params.mosqueId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// GET /mosques/:mosqueId/prayer-times/:year/:month
export async function getMonth(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const data = await svc.getScheduleForMonth(req.params.mosqueId, year, month);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// GET /mosques/:mosqueId/prayer-times/years
export async function listYears(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.listYears(req.params.mosqueId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// POST /mosques/:mosqueId/prayer-times
export async function uploadSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.object({
      year: z.number().int().min(2000).max(2100),
      source: z.enum(["CALENDAR", "CALCULATION", "FIXED"]).optional(),
      method: z.string().optional(),
      days: z.array(daySchema).min(1),
    }).parse(req.body);

    const data = await svc.uploadSchedule(req.params.mosqueId, body, req.user!.sub, req.user!.role);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

// PATCH /mosques/:mosqueId/prayer-times/:year/:month/:day
export async function updateDay(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const day = parseInt(req.params.day, 10);
    const times = z.object({
      fajr: timeSchema, shuruq: timeSchema, dhuhr: timeSchema,
      asr: timeSchema, maghrib: timeSchema, isha: timeSchema,
    }).parse(req.body);

    const data = await svc.updateDay(req.params.mosqueId, year, month, day, times, req.user!.sub, req.user!.role);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// GET /mosques/:mosqueId/widget
export async function getWidget(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getWidgetData(req.params.mosqueId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}
