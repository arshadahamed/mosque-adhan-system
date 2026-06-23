import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt.js";
import { AppError } from "./error.js";

declare global {
  namespace Express {
    interface Request {
      user?: { sub: string; email: string; role: string };
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const cookieToken = req.cookies?.access_token as string | undefined;
  const raw = header?.startsWith("Bearer ") ? header.slice(7) : cookieToken;

  if (!raw) return next(new AppError(401, "MISSING_TOKEN", "Authentication required"));

  try {
    req.user = verifyAccessToken(raw);
    next();
  } catch {
    next(new AppError(401, "INVALID_TOKEN", "Token invalid or expired"));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const raw = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (raw) {
    try { req.user = verifyAccessToken(raw); } catch { /* ignored */ }
  }
  next();
}
