import { Router, type IRouter } from "express";
import * as ctrl from "./prayer.controller.js";

const router: IRouter = Router({ mergeParams: true });
router.get("/", ctrl.getWidget);
export default router;
