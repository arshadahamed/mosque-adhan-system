import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db.js";

export function auditLog(action: string, entity: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await prisma.auditLog.create({
        data: {
          actorUserId: req.user?.sub ?? null,
          action,
          entity,
          entityId: (req.params.id ?? req.params.mosqueId) || null,
          metadata: { body: req.body ?? {}, query: req.query ?? {} },
          ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0] ?? req.ip ?? null,
          userAgent: req.headers["user-agent"] ?? null,
        },
      });
    } catch {
      // audit failures must never block the request
    }
    next();
  };
}
