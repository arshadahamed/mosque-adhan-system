import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as svc from "./auth.service.js";
import { env } from "../../config/env.js";

const COOKIE_NAME = "refresh_token";
const cookieOpts = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

function meta(req: Request) {
  return {
    ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0] ?? req.ip,
    userAgent: req.headers["user-agent"],
    sessionId: req.cookies?.session_id as string | undefined,
  };
}

// POST /auth/register
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
    }).parse(req.body);

    const data = await svc.register(body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

// POST /auth/verify-email
export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = z.object({ token: z.string() }).parse(req.body);
    const data = await svc.verifyEmail(token);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// POST /auth/login
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.object({
      email: z.string().email(),
      password: z.string(),
    }).parse(req.body);

    const result = await svc.login(body, meta(req));

    if ("requiresTwoFactor" in result) {
      res.json({ success: true, data: result });
      return;
    }

    res.cookie(COOKIE_NAME, result.refreshToken, cookieOpts);
    res.cookie("session_id", result.sessionId, { ...cookieOpts, httpOnly: false });
    res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (e) { next(e); }
}

// POST /auth/2fa/verify
export async function verifyTwoFactor(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.object({
      userId: z.string(),
      code: z.string().length(6),
    }).parse(req.body);

    const result = await svc.verifyTwoFactor(body, meta(req));
    res.cookie(COOKIE_NAME, result.refreshToken, cookieOpts);
    res.cookie("session_id", result.sessionId, { ...cookieOpts, httpOnly: false });
    res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (e) { next(e); }
}

// POST /auth/2fa/setup
export async function setupTwoFactor(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.setupTwoFactor((req as any).user.sub);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// POST /auth/2fa/confirm
export async function confirmTwoFactor(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
    const data = await svc.confirmTwoFactor((req as any).user.sub, code);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// DELETE /auth/2fa
export async function disableTwoFactor(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
    const data = await svc.disableTwoFactor((req as any).user.sub, code);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// POST /auth/refresh
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE_NAME] as string | undefined;
    if (!token) throw Object.assign(new Error("No refresh token"), { statusCode: 401, code: "MISSING_TOKEN" });

    const result = await svc.refreshTokens(token, meta(req));
    res.cookie(COOKIE_NAME, result.refreshToken, cookieOpts);
    res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (e) { next(e); }
}

// POST /auth/logout
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE_NAME] as string | undefined;
    if (token) await svc.logout(token, req.cookies?.session_id);
    res.clearCookie(COOKIE_NAME);
    res.clearCookie("session_id");
    res.json({ success: true, data: { loggedOut: true } });
  } catch (e) { next(e); }
}

// POST /auth/forgot-password
export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const data = await svc.forgotPassword(email);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// POST /auth/reset-password
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.object({
      token: z.string(),
      password: z.string().min(8),
    }).parse(req.body);
    const data = await svc.resetPassword(body.token, body.password);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// POST /auth/change-password
export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.object({
      oldPassword: z.string(),
      newPassword: z.string().min(8),
    }).parse(req.body);
    const data = await svc.changePassword((req as any).user.sub, body.oldPassword, body.newPassword);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

// GET /auth/me
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getMe((req as any).user.sub);
    res.json({ success: true, data });
  } catch (e) { next(e); }
}
