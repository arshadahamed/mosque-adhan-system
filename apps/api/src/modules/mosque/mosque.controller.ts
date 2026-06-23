import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as svc from "./mosque.service.js";

const createSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(2),
  city: z.string().min(1),
  zipcode: z.string().min(1),
  countryCode: z.string().length(2),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1),
  type: z.enum(["MOSQUE", "MUSALLA", "HOME"]).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  associationName: z.string().optional(),
});

const updateSchema = createSchema.partial();

// GET /mosques
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const q = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().default(20).transform(n => Math.min(Math.max(n, 1), 100)),
      search: z.string().optional(),
      city: z.string().optional(),
      countryCode: z.string().optional(),
    }).parse(req.query);

    const { items, total } = await svc.listMosques(q);
    const totalPages = Math.ceil(total / q.limit);

    res.json({
      success: true,
      data: items,
      meta: { page: q.page, limit: q.limit, total, totalPages },
    });
  } catch (e) { next(e); }
}

// GET /mosques/:slug
export async function getBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getMosqueBySlug(req.params.slug);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// POST /mosques
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createSchema.parse(req.body);
    const data = await svc.createMosque(body, req.user!.sub);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

// PATCH /mosques/:id
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const body = updateSchema.parse(req.body);
    const data = await svc.updateMosque(req.params.id, body, req.user!.sub, req.user!.role);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// DELETE /mosques/:id
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteMosque(req.params.id, req.user!.sub, req.user!.role);
    res.json({ success: true, data: { deleted: true } });
  } catch (e) { next(e); }
}

// PATCH /mosques/:id/config/:section
export async function updateConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.record(z.unknown()).parse(req.body);
    const data = await svc.updateConfig(
      req.params.id,
      req.params.section,
      body,
      req.user!.sub,
      req.user!.role
    );
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// GET /mosques/:id/users
export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getMosqueUsers(req.params.id, req.user!.sub, req.user!.role);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// POST /mosques/:id/users
export async function addUser(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.object({ userId: z.string(), role: z.string() }).parse(req.body);
    const data = await svc.addMosqueUser(req.params.id, body.userId, body.role, req.user!.sub, req.user!.role);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

// DELETE /mosques/:id/users/:userId
export async function removeUser(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.removeMosqueUser(req.params.id, req.params.userId, req.user!.sub, req.user!.role);
    res.json({ success: true, data: { removed: true } });
  } catch (e) { next(e); }
}
