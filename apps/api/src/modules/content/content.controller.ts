import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as svc from "./content.service.js";

const announcementSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["TEXT", "IMAGE"]).optional(),
  content: z.string().optional(),
  imageUrl: z.string().url().optional(),
  orientation: z.enum(["landscape", "portrait"]).optional(),
  isEvent: z.boolean().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  durationSec: z.number().int().min(5).max(300).optional(),
  enabled: z.boolean().optional(),
  onMainScreen: z.boolean().optional(),
  onMobile: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  location: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

// ─── Announcements ────────────────────────────────────────────────────────────

export async function listAnnouncements(req: Request, res: Response, next: NextFunction) {
  try {
    const publicOnly = !req.user;
    const data = await svc.listAnnouncements(req.params.mosqueId, publicOnly);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function createAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const body = announcementSchema.parse(req.body);
    const data = await svc.createAnnouncement(req.params.mosqueId, body, req.user!.sub, req.user!.role);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

export async function updateAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const body = announcementSchema.partial().parse(req.body);
    const data = await svc.updateAnnouncement(req.params.id, body, req.user!.sub, req.user!.role);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function deleteAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteAnnouncement(req.params.id, req.user!.sub, req.user!.role);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) { next(e); }
}

// ─── Flash Messages ───────────────────────────────────────────────────────────

export async function listFlashMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.listFlashMessages(req.params.mosqueId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function createFlashMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { content, enabled } = z.object({ content: z.string().min(1), enabled: z.boolean().default(true) }).parse(req.body);
    const data = await svc.createFlashMessage(req.params.mosqueId, content, enabled, req.user!.sub, req.user!.role);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

export async function updateFlashMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.object({ content: z.string().optional(), enabled: z.boolean().optional() }).parse(req.body);
    const data = await svc.updateFlashMessage(req.params.id, body, req.user!.sub, req.user!.role);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function deleteFlashMessage(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteFlashMessage(req.params.id, req.user!.sub, req.user!.role);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) { next(e); }
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function listEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const { upcoming } = z.object({ upcoming: z.coerce.boolean().default(true) }).parse(req.query);
    const data = await svc.listEvents(req.params.mosqueId, upcoming);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function createEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const body = eventSchema.parse(req.body);
    const data = await svc.createEvent(req.params.mosqueId, body, req.user!.sub, req.user!.role);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

export async function updateEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const body = eventSchema.partial().parse(req.body);
    const data = await svc.updateEvent(req.params.id, body, req.user!.sub, req.user!.role);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function deleteEvent(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteEvent(req.params.id, req.user!.sub, req.user!.role);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) { next(e); }
}
