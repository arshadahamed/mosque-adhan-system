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
});

export const env = schema.parse(process.env);
export type Env = typeof env;
