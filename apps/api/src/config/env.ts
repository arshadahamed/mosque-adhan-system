import { z } from "zod";
import dotenv from "dotenv";

// Load from repo-root .env (monorepo) and local .env if present.
dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/postgres"),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),

  // JWT
  JWT_SECRET: z.string().default("dev-jwt-secret-change-in-production"),
  JWT_REFRESH_SECRET: z.string().default("dev-refresh-secret-change-in-production"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // Email (nodemailer)
  SMTP_HOST: z.string().default("smtp.ethereal.email"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  EMAIL_FROM: z.string().default("no-reply@mawaqit.local"),

  // App
  APP_URL: z.string().default("http://localhost:3000"),
});

export const env = schema.parse(process.env);
export type Env = typeof env;
