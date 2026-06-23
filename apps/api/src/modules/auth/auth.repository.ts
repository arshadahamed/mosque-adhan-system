import { prisma } from "../../config/db.js";
import type { User } from "@prisma/client";
import { createHash } from "crypto";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Users
export const findUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

export const findUserById = (id: string) =>
  prisma.user.findUnique({ where: { id } });

export const createUser = (data: {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
}) => prisma.user.create({ data });

export const updateUser = (id: string, data: Partial<User>) =>
  prisma.user.update({ where: { id }, data });

// Refresh tokens
export const createRefreshToken = (data: {
  userId: string;
  tokenHash: string;
  family: string;
  expiresAt: Date;
}) => prisma.refreshToken.create({ data });

export const findRefreshToken = (tokenHash: string) =>
  prisma.refreshToken.findUnique({ where: { tokenHash } });

export const revokeRefreshToken = (id: string) =>
  prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });

export const revokeFamily = (family: string) =>
  prisma.refreshToken.updateMany({ where: { family }, data: { revokedAt: new Date() } });

export const deleteExpiredTokens = (userId: string) =>
  prisma.refreshToken.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });

export const revokeAllUserTokens = (userId: string) =>
  prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

export const deleteAllUserSessions = (userId: string) =>
  prisma.session.deleteMany({ where: { userId } });

// Sessions
export const upsertSession = (data: {
  id: string;
  userId: string;
  ip?: string;
  userAgent?: string;
}) =>
  prisma.session.upsert({
    where: { id: data.id },
    create: { ...data, lastSeenAt: new Date() },
    update: { lastSeenAt: new Date() },
  });

export const deleteSession = (id: string) =>
  prisma.session.delete({ where: { id } }).catch(() => null);

// Settings used for email-verify & password-reset tokens (stored as Setting rows)
export const setTokenSetting = (key: string, value: object) =>
  prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });

export const getTokenSetting = (key: string) =>
  prisma.setting.findUnique({ where: { key } });

export const deleteTokenSetting = (key: string) =>
  prisma.setting.delete({ where: { key } }).catch(() => null);
