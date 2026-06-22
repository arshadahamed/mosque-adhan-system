import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { notFound, errorHandler } from "./middleware/error.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/v1/health", (_req, res) => {
    res.json({
      success: true,
      data: { status: "ok", uptime: process.uptime(), env: env.NODE_ENV },
    });
  });

  // Feature module routers mount here in later phases (auth, mosques, ...).

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
