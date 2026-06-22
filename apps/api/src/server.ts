import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

createApp().listen(env.PORT, () => logger.info(`API listening on :${env.PORT}`));
