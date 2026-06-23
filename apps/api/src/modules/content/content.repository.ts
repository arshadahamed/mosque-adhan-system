import { prisma } from "../../config/db.js";
import type { Prisma } from "@prisma/client";

// ─── Announcements ────────────────────────────────────────────────────────────

export const listAnnouncements = (mosqueId: string, enabledOnly = false) =>
  prisma.announcement.findMany({
    where: { mosqueId, ...(enabledOnly ? { enabled: true } : {}) },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

export const findAnnouncement = (id: string) =>
  prisma.announcement.findUnique({ where: { id } });

export const createAnnouncement = (data: Prisma.AnnouncementUncheckedCreateInput) =>
  prisma.announcement.create({ data });

export const updateAnnouncement = (id: string, data: Prisma.AnnouncementUpdateInput) =>
  prisma.announcement.update({ where: { id }, data });

export const deleteAnnouncement = (id: string) =>
  prisma.announcement.delete({ where: { id } });

// ─── Flash Messages ───────────────────────────────────────────────────────────

export const listFlashMessages = (mosqueId: string) =>
  prisma.flashMessage.findMany({ where: { mosqueId } });

export const findFlashMessage = (id: string) =>
  prisma.flashMessage.findUnique({ where: { id } });

export const upsertFlashMessage = (mosqueId: string, content: string, enabled: boolean) =>
  prisma.flashMessage.upsert({
    where: { id: mosqueId }, // one flash per mosque (reuse mosqueId as id for upsert key)
    create: { id: mosqueId, mosqueId, content, enabled },
    update: { content, enabled },
  });

export const createFlashMessage = (data: Prisma.FlashMessageUncheckedCreateInput) =>
  prisma.flashMessage.create({ data });

export const updateFlashMessage = (id: string, data: Prisma.FlashMessageUpdateInput) =>
  prisma.flashMessage.update({ where: { id }, data });

export const deleteFlashMessage = (id: string) =>
  prisma.flashMessage.delete({ where: { id } });

// ─── Events ───────────────────────────────────────────────────────────────────

export const listEvents = (mosqueId: string, fromDate?: Date) =>
  prisma.event.findMany({
    where: { mosqueId, ...(fromDate ? { startsAt: { gte: fromDate } } : {}) },
    orderBy: { startsAt: "asc" },
  });

export const findEvent = (id: string) =>
  prisma.event.findUnique({ where: { id } });

export const createEvent = (data: Prisma.EventUncheckedCreateInput) =>
  prisma.event.create({ data });

export const updateEvent = (id: string, data: Prisma.EventUpdateInput) =>
  prisma.event.update({ where: { id }, data });

export const deleteEvent = (id: string) =>
  prisma.event.delete({ where: { id } });
