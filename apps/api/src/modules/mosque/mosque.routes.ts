import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requireMinRole } from "../../middleware/rbac.js";
import * as ctrl from "./mosque.controller.js";

const router: IRouter = Router();

// Public
router.get("/", ctrl.list);
router.get("/:slug", ctrl.getBySlug);

// Authenticated (MOSQUE_ADMIN+)
router.use(authenticate);
router.get("/:id", requireMinRole("STAFF"), ctrl.getById);
router.post("/", requireMinRole("MOSQUE_ADMIN"), ctrl.create);
router.patch("/:id", requireMinRole("STAFF"), ctrl.update);
router.delete("/:id", requireMinRole("SUPER_ADMIN"), ctrl.remove);
router.get("/:id/config", requireMinRole("STAFF"), ctrl.getConfig);
router.patch("/:id/config/:section", requireMinRole("STAFF"), ctrl.updateConfig);

// User management
router.get("/:id/users", requireMinRole("MOSQUE_ADMIN"), ctrl.listUsers);
router.post("/:id/users", requireMinRole("MOSQUE_ADMIN"), ctrl.addUser);
router.delete("/:id/users/:userId", requireMinRole("MOSQUE_ADMIN"), ctrl.removeUser);

export default router;
