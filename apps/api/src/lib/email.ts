import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  secure: env.SMTP_PORT === 465,
});

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(opts: MailOptions): Promise<void> {
  await transporter.sendMail({ from: env.EMAIL_FROM, ...opts });
}

export function emailVerifyHtml(token: string): string {
  const url = `${env.APP_URL}/auth/verify-email?token=${token}`;
  return `<p>Verify your email: <a href="${url}">${url}</a></p><p>Expires in 24 hours.</p>`;
}

export function passwordResetHtml(token: string): string {
  const url = `${env.APP_URL}/auth/reset-password?token=${token}`;
  return `<p>Reset your password: <a href="${url}">${url}</a></p><p>Expires in 1 hour.</p>`;
}
