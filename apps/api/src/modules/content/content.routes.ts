import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { optionalAuth } from "../../middleware/authenticate.js";
import { requireMinRole } from "../../middleware/rbac.js";
import * as ctrl from "./content.controller.js";

const router: IRouter = Router({ mergeParams: true });

// Announcements
router.get("/announcements", optionalAuth, ctrl.listAnnouncements);
router.post("/announcements", authenticate, requireMinRole("STAFF"), ctrl.createAnnouncement);
router.patch("/announcements/:id", authenticate, requireMinRole("STAFF"), ctrl.updateAnnouncement);
router.delete("/announcements/:id", authenticate, requireMinRole("STAFF"), ctrl.deleteAnnouncement);

// Flash messages
router.get("/flash-messages", ctrl.listFlashMessages);
router.post("/flash-messages", authenticate, requireMinRole("STAFF"), ctrl.createFlashMessage);
router.patch("/flash-messages/:id", authenticate, requireMinRole("STAFF"), ctrl.updateFlashMessage);
router.delete("/flash-messages/:id", authenticate, requireMinRole("STAFF"), ctrl.deleteFlashMessage);

// Events
router.get("/events", ctrl.listEvents);
router.post("/events", authenticate, requireMinRole("STAFF"), ctrl.createEvent);
router.patch("/events/:id", authenticate, requireMinRole("STAFF"), ctrl.updateEvent);
router.delete("/events/:id", authenticate, requireMinRole("STAFF"), ctrl.deleteEvent);

export default router;
