import type { Request, Response, NextFunction } from "express";
import { AppError } from "./error.js";

const ROLE_RANK: Record<string, number> = {
  PUBLIC: 0,
  STAFF: 1,
  MOSQUE_ADMIN: 2,
  SUPER_ADMIN: 3,
};

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, "UNAUTHENTICATED", "Authentication required"));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "FORBIDDEN", "Insufficient permissions"));
    }
    next();
  };
}

export function requireMinRole(minRole: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, "UNAUTHENTICATED", "Authentication required"));
    const userRank = ROLE_RANK[req.user.role] ?? -1;
    const minRank = ROLE_RANK[minRole] ?? 0;
    if (userRank < minRank) {
      return next(new AppError(403, "FORBIDDEN", "Insufficient permissions"));
    }
    next();
  };
}
