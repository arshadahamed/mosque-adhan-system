import { AppError } from "../../middleware/error.js";
import * as repo from "./content.repository.js";
import { findMosqueUser } from "../mosque/mosque.repository.js";

async function assertAccess(userId: string, role: string, mosqueId: string) {
  if (role === "SUPER_ADMIN") return;
  const link = await findMosqueUser(userId, mosqueId);
  if (!link) throw new AppError(403, "FORBIDDEN", "No access to this mosque");
}

// ─── Announcements ────────────────────────────────────────────────────────────

export const listAnnouncements = (mosqueId: string, publicOnly: boolean) =>
  repo.listAnnouncements(mosqueId, publicOnly);

export async function getAnnouncement(id: string) {
  const a = await repo.findAnnouncement(id);
  if (!a) throw new AppError(404, "NOT_FOUND", "Announcement not found");
  return a;
}

export async function createAnnouncement(
  mosqueId: string,
  data: {
    title: string;
    type?: string;
    content?: string;
    imageUrl?: string;
    orientation?: string;
    isEvent?: boolean;
    startsAt?: string;
    endsAt?: string;
    durationSec?: number;
    enabled?: boolean;
    onMainScreen?: boolean;
    onMobile?: boolean;
    sortOrder?: number;
  },
  userId: string,
  role: string
) {
  await assertAccess(userId, role, mosqueId);
  return repo.createAnnouncement({
    mosqueId,
    title: data.title,
    type: (data.type ?? "TEXT") as any,
    content: data.content,
    imageUrl: data.imageUrl,
    orientation: data.orientation ?? "landscape",
    isEvent: data.isEvent ?? false,
    startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
    endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
    durationSec: data.durationSec ?? 30,
    enabled: data.enabled ?? true,
    onMainScreen: data.onMainScreen ?? true,
    onMobile: data.onMobile ?? true,
    sortOrder: data.sortOrder ?? 0,
  });
}

export async function updateAnnouncement(
  id: string,
  data: Record<string, unknown>,
  userId: string,
  role: string
) {
  const existing = await repo.findAnnouncement(id);
  if (!existing) throw new AppError(404, "NOT_FOUND", "Announcement not found");
  await assertAccess(userId, role, existing.mosqueId);
  return repo.updateAnnouncement(id, data);
}

export async function deleteAnnouncement(id: string, userId: string, role: string) {
  const existing = await repo.findAnnouncement(id);
  if (!existing) throw new AppError(404, "NOT_FOUND", "Announcement not found");
  await assertAccess(userId, role, existing.mosqueId);
  return repo.deleteAnnouncement(id);
}

// ─── Flash Messages ───────────────────────────────────────────────────────────

export const listFlashMessages = (mosqueId: string) =>
  repo.listFlashMessages(mosqueId);

export async function createFlashMessage(
  mosqueId: string,
  content: string,
  enabled: boolean,
  userId: string,
  role: string
) {
  await assertAccess(userId, role, mosqueId);
  return repo.createFlashMessage({ mosqueId, content, enabled });
}

export async function updateFlashMessage(
  id: string,
  data: { content?: string; enabled?: boolean },
  userId: string,
  role: string
) {
  const existing = await repo.findFlashMessage(id);
  if (!existing) throw new AppError(404, "NOT_FOUND", "Flash message not found");
  await assertAccess(userId, role, existing.mosqueId);
  return repo.updateFlashMessage(id, data);
}

export async function deleteFlashMessage(id: string, userId: string, role: string) {
  const existing = await repo.findFlashMessage(id);
  if (!existing) throw new AppError(404, "NOT_FOUND", "Flash message not found");
  await assertAccess(userId, role, existing.mosqueId);
  return repo.deleteFlashMessage(id);
}

// ─── Events ───────────────────────────────────────────────────────────────────

export const listEvents = (mosqueId: string, upcoming: boolean) =>
  repo.listEvents(mosqueId, upcoming ? new Date() : undefined);

export async function getEvent(id: string) {
  const e = await repo.findEvent(id);
  if (!e) throw new AppError(404, "NOT_FOUND", "Event not found");
  return e;
}

export async function createEvent(
  mosqueId: string,
  data: {
    title: string;
    description?: string;
    category?: string;
    startsAt: string;
    endsAt?: string;
    location?: string;
    imageUrl?: string;
  },
  userId: string,
  role: string
) {
  await assertAccess(userId, role, mosqueId);
  return repo.createEvent({
    mosqueId,
    title: data.title,
    description: data.description,
    category: data.category,
    startsAt: new Date(data.startsAt),
    endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
    location: data.location,
    imageUrl: data.imageUrl,
  });
}

export async function updateEvent(
  id: string,
  data: Record<string, unknown>,
  userId: string,
  role: string
) {
  const existing = await repo.findEvent(id);
  if (!existing) throw new AppError(404, "NOT_FOUND", "Event not found");
  await assertAccess(userId, role, existing.mosqueId);
  return repo.updateEvent(id, data);
}

export async function deleteEvent(id: string, userId: string, role: string) {
  const existing = await repo.findEvent(id);
  if (!existing) throw new AppError(404, "NOT_FOUND", "Event not found");
  await assertAccess(userId, role, existing.mosqueId);
  return repo.deleteEvent(id);
}
