import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requireMinRole } from "../../middleware/rbac.js";
import * as ctrl from "./prayer.controller.js";

const router: IRouter = Router({ mergeParams: true });

// Public
router.get("/today", ctrl.getToday);
router.get("/years", ctrl.listYears);
router.get("/:year/:month", ctrl.getMonth);

// Authenticated (STAFF+)
router.post("/", authenticate, requireMinRole("STAFF"), ctrl.uploadSchedule);
router.patch("/:year/:month/:day", authenticate, requireMinRole("STAFF"), ctrl.updateDay);

export default router;
