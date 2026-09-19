import express from "express";
import { authMiddleware } from "../auth/auth.js";
import checkModuleAccess from "../middlewares/checkModuleAccess.js";
import {
  createLeaveRequest,
  getMyLeaveRequests,
  getManageLeaveRequests,
  actionLeaveRequest,
  cancelLeaveRequest,
} from "../controllers/leaveRequestController.js";

const router = express.Router();

// ── PARENT ROUTES ─────────────────────────────────
// parent creates a leave request
router.post(
  "/",
  authMiddleware,
  checkModuleAccess("leaveRequest"),
  createLeaveRequest
);

// parent sees their own leave requests
router.get(
  "/my",
  authMiddleware,
  checkModuleAccess("leaveRequest"),
  getMyLeaveRequests
);

// parent cancels a pending leave request
router.patch(
  "/:id/cancel",
  authMiddleware,
  checkModuleAccess("leaveRequest"),
  cancelLeaveRequest
);

// ── TEACHER / ADMIN / STAFF ROUTES ───────────────
// manage view — teacher sees their class, admin sees all
router.get(
  "/manage",
  authMiddleware,
  checkModuleAccess("leaveRequest"),
  getManageLeaveRequests
);

// approve or reject a leave request
router.patch(
  "/:id/action",
  authMiddleware,
  checkModuleAccess("leaveRequest"),
  actionLeaveRequest
);

export default router;