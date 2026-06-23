import { AppError } from "../../middleware/error.js";
import * as repo from "./mosque.repository.js";
import type { Prisma } from "@prisma/client";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function stripSensitive(mosque: any) {
  const { paymentUrl, history, ...safe } = mosque ?? {};
  return safe;
}

// ─── Public ───────────────────────────────────────────────────────────────────

export async function listMosques(opts: {
  page: number;
  limit: number;
  search?: string;
  city?: string;
  countryCode?: string;
}) {
  return repo.listMosques(opts);
}

export async function getMosqueBySlug(slug: string) {
  const mosque = await repo.findMosqueBySlug(slug);
  if (!mosque) throw new AppError(404, "NOT_FOUND", "Mosque not found");
  return mosque;
}

// ─── Admin: CRUD ──────────────────────────────────────────────────────────────

export async function createMosque(
  data: {
    name: string;
    address: string;
    city: string;
    zipcode: string;
    countryCode: string;
    latitude: number;
    longitude: number;
    timezone: string;
    type?: string;
    phone?: string;
    email?: string;
    website?: string;
    associationName?: string;
  },
  creatorUserId: string
) {
  const slug = slugify(data.name);

  const existing = await repo.findMosqueBySlug(slug);
  if (existing) throw new AppError(409, "SLUG_TAKEN", `A mosque with slug "${slug}" already exists`);

  const mosque = await repo.createMosque({
    ...data,
    slug,
    type: (data.type ?? "MOSQUE") as any,
    config: { create: {} },
    subscription: { create: { plan: "free", status: "active" } },
  });

  await repo.upsertMosqueUser(creatorUserId, mosque.id, "MOSQUE_ADMIN");

  return mosque;
}

export async function updateMosque(
  id: string,
  data: Prisma.MosqueUpdateInput,
  requesterId: string,
  requesterRole: string
) {
  const mosque = await repo.findMosqueById(id);
  if (!mosque) throw new AppError(404, "NOT_FOUND", "Mosque not found");

  await assertMosqueAccess(requesterId, id, requesterRole);

  return repo.updateMosque(id, data);
}

export async function deleteMosque(id: string, requesterId: string, requesterRole: string) {
  const mosque = await repo.findMosqueById(id);
  if (!mosque) throw new AppError(404, "NOT_FOUND", "Mosque not found");

  if (requesterRole !== "SUPER_ADMIN") throw new AppError(403, "FORBIDDEN", "Only SUPER_ADMIN can delete mosques");

  return repo.deleteMosque(id);
}

export async function updateConfig(
  mosqueId: string,
  section: string,
  value: Record<string, unknown>,
  requesterId: string,
  requesterRole: string
) {
  await assertMosqueAccess(requesterId, mosqueId, requesterRole);

  const ALLOWED = ["regional", "athan", "iqama", "jumua", "display", "eid", "content", "durations"];
  if (!ALLOWED.includes(section)) throw new AppError(400, "INVALID_SECTION", `Unknown config section: ${section}`);

  return repo.upsertMosqueConfig(mosqueId, { [section]: value });
}

// ─── Staff management ─────────────────────────────────────────────────────────

export async function getMosqueUsers(mosqueId: string, requesterId: string, requesterRole: string) {
  await assertMosqueAccess(requesterId, mosqueId, requesterRole);
  return repo.getMosqueUsers(mosqueId);
}

export async function addMosqueUser(
  mosqueId: string,
  targetUserId: string,
  role: string,
  requesterId: string,
  requesterRole: string
) {
  await assertMosqueAccess(requesterId, mosqueId, requesterRole);
  const ALLOWED_ROLES = ["MOSQUE_ADMIN", "STAFF"];
  if (!ALLOWED_ROLES.includes(role)) throw new AppError(400, "INVALID_ROLE", "Role must be MOSQUE_ADMIN or STAFF");
  return repo.upsertMosqueUser(targetUserId, mosqueId, role);
}

export async function removeMosqueUser(
  mosqueId: string,
  targetUserId: string,
  requesterId: string,
  requesterRole: string
) {
  await assertMosqueAccess(requesterId, mosqueId, requesterRole);
  return repo.removeMosqueUser(targetUserId, mosqueId);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function assertMosqueAccess(userId: string, mosqueId: string, role: string) {
  if (role === "SUPER_ADMIN") return;
  const link = await repo.findMosqueUser(userId, mosqueId);
  if (!link) throw new AppError(403, "FORBIDDEN", "You do not have access to this mosque");
}
