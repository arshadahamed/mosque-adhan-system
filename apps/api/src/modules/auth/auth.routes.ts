import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import * as ctrl from "./auth.controller.js";

const router: IRouter = Router();

// Public
router.post("/register", ctrl.register);
router.post("/verify-email", ctrl.verifyEmail);
router.post("/login", ctrl.login);
router.post("/2fa/verify", ctrl.verifyTwoFactor);
router.post("/refresh", ctrl.refresh);
router.post("/logout", ctrl.logout);
router.post("/forgot-password", ctrl.forgotPassword);
router.post("/reset-password", ctrl.resetPassword);

// Authenticated
router.use(authenticate);
router.get("/me", ctrl.getMe);
router.post("/change-password", ctrl.changePassword);
router.post("/2fa/setup", ctrl.setupTwoFactor);
router.post("/2fa/confirm", ctrl.confirmTwoFactor);
router.delete("/2fa", ctrl.disableTwoFactor);

export default router;
