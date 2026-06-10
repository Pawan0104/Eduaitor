import express from "express";
import { authMiddleware } from "../auth/auth.js";
import checkModuleAccess from "../middlewares/checkModuleAccess.js";
import upload from "../middlewares/upload.js";
import {
  createGatePass,
  getMyGatePasses,
  getManageGatePasses,
  actionGatePass,
  cancelGatePass,
} from "../controllers/gatepassController.js";

const router = express.Router();

// ── PARENT ROUTES ─────────────────────────────────
// parent creates a gatepass request
router.post(
  "/",
  authMiddleware,
  upload.single("photo"),
  createGatePass
);

// parent sees their own gatepasses
router.get(
  "/my",
  authMiddleware,

  getMyGatePasses
);

// parent cancels a pending gatepass
router.patch(
  "/:id/cancel",
  authMiddleware,
  cancelGatePass
);

// ── TEACHER / ADMIN / STAFF ROUTES ───────────────
// manage view — teacher sees their class, admin sees all
router.get(
  "/manage",
  authMiddleware,
 
  getManageGatePasses
);

// approve or reject a gatepass
router.patch(
  "/:id/action",
  authMiddleware,
  actionGatePass
);

export default router;