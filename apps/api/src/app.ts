import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { notFound, errorHandler } from "./middleware/error.js";
import authRoutes from "./modules/auth/auth.routes.js";
import mosqueRoutes from "./modules/mosque/mosque.routes.js";
import prayerRoutes from "./modules/prayer/prayer.routes.js";
import widgetRoutes from "./modules/prayer/widget.routes.js";
import contentRoutes from "./modules/content/content.routes.js";

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

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/mosques", mosqueRoutes);
  app.use("/api/v1/mosques/:mosqueId/prayer-times", prayerRoutes);
  app.use("/api/v1/mosques/:mosqueId/widget", widgetRoutes);
  app.use("/api/v1/mosques/:mosqueId", contentRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
