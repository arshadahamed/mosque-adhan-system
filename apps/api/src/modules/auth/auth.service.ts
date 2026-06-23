import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { AppError } from "../../middleware/error.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken, signMfaChallengeToken, verifyMfaChallengeToken } from "../../lib/jwt.js";
import { sendMail, emailVerifyHtml, passwordResetHtml } from "../../lib/email.js";
import { generateTotpSecret, totpQrDataUrl, verifyTotp } from "../../lib/totp.js";
import * as repo from "./auth.repository.js";

const BCRYPT_ROUNDS = 12;
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Register ────────────────────────────────────────────────────────────────

export async function register(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}) {
  const existing = await repo.findUserByEmail(data.email);
  if (existing) throw new AppError(409, "EMAIL_TAKEN", "Email already in use");

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  const user = await repo.createUser({ ...data, passwordHash });

  const token = randomBytes(32).toString("hex");
  await repo.setTokenSetting(`email_verify:${token}`, {
    userId: user.id,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });

  await sendMail({
    to: user.email,
    subject: "Verify your Mawaqit account",
    html: emailVerifyHtml(token),
  }).catch(() => null);

  return { id: user.id, email: user.email };
}

// ─── Verify Email ─────────────────────────────────────────────────────────────

export async function verifyEmail(token: string) {
  const setting = await repo.getTokenSetting(`email_verify:${token}`);
  if (!setting) throw new AppError(400, "INVALID_TOKEN", "Token invalid or expired");

  const { userId, expiresAt } = setting.value as { userId: string; expiresAt: string };
  if (new Date() > new Date(expiresAt)) {
    await repo.deleteTokenSetting(`email_verify:${token}`);
    throw new AppError(400, "TOKEN_EXPIRED", "Verification link has expired");
  }

  await repo.updateUser(userId, { emailVerified: true });
  await repo.deleteTokenSetting(`email_verify:${token}`);
  return { verified: true };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(
  data: { email: string; password: string },
  meta: { ip?: string; userAgent?: string; sessionId?: string }
) {
  const user = await repo.findUserByEmail(data.email);
  if (!user) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  if (user.status !== "active") throw new AppError(403, "ACCOUNT_SUSPENDED", "Account is suspended");

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");

  if (user.twoFactorEnabled) {
    // Issue a short-lived MFA challenge token — never expose the raw userId
    const mfaToken = signMfaChallengeToken(user.id);
    return { requiresTwoFactor: true, mfaToken };
  }

  return issueTokens(user, meta);
}

// ─── 2FA verify ───────────────────────────────────────────────────────────────

export async function verifyTwoFactor(
  data: { mfaToken: string; code: string },
  meta: { ip?: string; userAgent?: string; sessionId?: string }
) {
  let payload;
  try {
    payload = verifyMfaChallengeToken(data.mfaToken);
  } catch {
    throw new AppError(401, "INVALID_TOKEN", "MFA challenge token invalid or expired");
  }

  const user = await repo.findUserById(payload.sub);
  if (!user?.twoFactorEnabled) throw new AppError(400, "INVALID_REQUEST", "2FA not enabled");

  if (!user.twoFactorSecret || !verifyTotp(user.twoFactorSecret, data.code)) {
    throw new AppError(401, "INVALID_TOTP", "Invalid 2FA code");
  }

  return issueTokens(user, meta);
}

// ─── Setup 2FA ────────────────────────────────────────────────────────────────

export async function setupTwoFactor(userId: string, currentCode?: string) {
  const user = await repo.findUserById(userId);
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found");

  // If 2FA is already active, require the current TOTP before re-enrollment
  if (user.twoFactorEnabled) {
    if (!currentCode) throw new AppError(400, "TOTP_REQUIRED", "Provide current 2FA code to re-enroll");
    if (!user.twoFactorSecret || !verifyTotp(user.twoFactorSecret, currentCode)) {
      throw new AppError(401, "INVALID_TOTP", "Current 2FA code is incorrect");
    }
  }

  const { base32, otpauthUrl } = generateTotpSecret(user.email);
  // Store pending secret in Setting — do NOT touch twoFactorEnabled or twoFactorSecret yet
  await repo.setTokenSetting(`totp_pending:${userId}`, {
    secret: base32,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  const qrDataUrl = await totpQrDataUrl(otpauthUrl);
  return { secret: base32, qrDataUrl };
}

export async function confirmTwoFactor(userId: string, code: string) {
  const setting = await repo.getTokenSetting(`totp_pending:${userId}`);
  if (!setting) throw new AppError(400, "SETUP_REQUIRED", "No pending 2FA setup found; call /2fa/setup first");

  const { secret, expiresAt } = setting.value as { secret: string; expiresAt: string };
  if (new Date() > new Date(expiresAt)) {
    await repo.deleteTokenSetting(`totp_pending:${userId}`);
    throw new AppError(400, "TOKEN_EXPIRED", "2FA setup window expired; restart setup");
  }

  if (!verifyTotp(secret, code)) {
    throw new AppError(401, "INVALID_TOTP", "Invalid 2FA code");
  }

  // Only now commit the new secret and enable 2FA
  await repo.updateUser(userId, { twoFactorEnabled: true, twoFactorSecret: secret });
  await repo.deleteTokenSetting(`totp_pending:${userId}`);
  return { enabled: true };
}

export async function disableTwoFactor(userId: string, code: string) {
  const user = await repo.findUserById(userId);
  if (!user?.twoFactorEnabled) throw new AppError(400, "INVALID_REQUEST", "2FA not enabled");

  if (!user.twoFactorSecret || !verifyTotp(user.twoFactorSecret, code)) {
    throw new AppError(401, "INVALID_TOTP", "Invalid 2FA code");
  }

  await repo.updateUser(userId, { twoFactorEnabled: false, twoFactorSecret: null });
  return { disabled: true };
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

export async function refreshTokens(
  incomingRefreshToken: string,
  meta: { ip?: string; userAgent?: string; sessionId?: string }
) {
  let payload;
  try {
    payload = verifyRefreshToken(incomingRefreshToken);
  } catch {
    throw new AppError(401, "INVALID_TOKEN", "Invalid refresh token");
  }

  const tokenHash = repo.hashToken(incomingRefreshToken);
  const stored = await repo.findRefreshToken(tokenHash);

  if (!stored || stored.revokedAt) {
    if (stored) await repo.revokeFamily(stored.family);
    throw new AppError(401, "TOKEN_REUSE", "Refresh token reuse detected");
  }
  if (stored.expiresAt < new Date()) {
    throw new AppError(401, "TOKEN_EXPIRED", "Refresh token expired");
  }

  await repo.revokeRefreshToken(stored.id);

  const user = await repo.findUserById(payload.sub);
  if (!user || user.status !== "active") {
    throw new AppError(401, "UNAUTHORIZED", "User not found or suspended");
  }

  return issueTokens(user, { ...meta, family: stored.family });
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(refreshToken: string, sessionId?: string) {
  try {
    const tokenHash = repo.hashToken(refreshToken);
    const stored = await repo.findRefreshToken(tokenHash);
    if (stored) await repo.revokeFamily(stored.family);
  } catch {
    // best-effort
  }
  if (sessionId) await repo.deleteSession(sessionId);
  return { loggedOut: true };
}

// ─── Forgot / Reset Password ──────────────────────────────────────────────────

export async function forgotPassword(email: string) {
  const user = await repo.findUserByEmail(email);
  if (!user) return { sent: true }; // no enumeration

  const token = randomBytes(32).toString("hex");
  await repo.setTokenSetting(`pwd_reset:${token}`, {
    userId: user.id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });

  await sendMail({
    to: user.email,
    subject: "Reset your Mawaqit password",
    html: passwordResetHtml(token),
  }).catch(() => null);

  return { sent: true };
}

export async function resetPassword(token: string, newPassword: string) {
  const setting = await repo.getTokenSetting(`pwd_reset:${token}`);
  if (!setting) throw new AppError(400, "INVALID_TOKEN", "Token invalid or expired");

  const { userId, expiresAt } = setting.value as { userId: string; expiresAt: string };
  if (new Date() > new Date(expiresAt)) {
    await repo.deleteTokenSetting(`pwd_reset:${token}`);
    throw new AppError(400, "TOKEN_EXPIRED", "Reset link has expired");
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await repo.updateUser(userId, { passwordHash });
  await repo.deleteTokenSetting(`pwd_reset:${token}`);
  return { reset: true };
}

// ─── Change Password ──────────────────────────────────────────────────────────

export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await repo.findUserById(userId);
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found");

  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) throw new AppError(401, "INVALID_CREDENTIALS", "Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await repo.updateUser(userId, { passwordHash });
  return { changed: true };
}

// ─── Me ───────────────────────────────────────────────────────────────────────

export async function getMe(userId: string) {
  const user = await repo.findUserById(userId);
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
  const { passwordHash, twoFactorSecret, ...safe } = user;
  return safe;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function issueTokens(
  user: { id: string; email: string; role: string },
  meta: { ip?: string; userAgent?: string; sessionId?: string; family?: string }
) {
  const family = meta.family ?? uuidv4();
  const rawRefresh = randomBytes(40).toString("hex");
  const tokenHash = repo.hashToken(rawRefresh);

  await repo.createRefreshToken({
    userId: user.id,
    tokenHash,
    family,
    expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS),
  });

  const sessionId = meta.sessionId ?? uuidv4();
  await repo.upsertSession({
    id: sessionId,
    userId: user.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, family });

  return { accessToken, refreshToken, sessionId, user: { id: user.id, email: user.email, role: user.role } };
}
