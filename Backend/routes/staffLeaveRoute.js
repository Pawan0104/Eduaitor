import express from "express";
import { authMiddleware, requireRoles } from "../auth/auth.js";
import {
  listLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  getLeavePolicy,
  saveLeavePolicy,
  runLeaveCredits,
  listStaffLeaveBalances,
  listManageStaffLeaves,
  actionStaffLeave,
  getMyStaffLeave,
  applyStaffLeave,
  cancelStaffLeave,
} from "../controllers/staffLeaveController.js";

const router = express.Router();

// Leave types — Super Admin (global) + School Admin (school-scoped)
router.get("/types", authMiddleware, listLeaveTypes);
router.post(
  "/types",
  authMiddleware,
  requireRoles("super_admin", "school_admin"),
  createLeaveType,
);
router.put(
  "/types/:id",
  authMiddleware,
  requireRoles("super_admin", "school_admin"),
  updateLeaveType,
);
router.delete(
  "/types/:id",
  authMiddleware,
  requireRoles("super_admin", "school_admin"),
  deleteLeaveType,
);

// School admin policy + balances + manage
router.get(
  "/policy",
  authMiddleware,
  requireRoles("school_admin", "staff_admin"),
  getLeavePolicy,
);
router.put(
  "/policy",
  authMiddleware,
  requireRoles("school_admin"),
  saveLeavePolicy,
);
router.post(
  "/credits/run",
  authMiddleware,
  requireRoles("school_admin"),
  runLeaveCredits,
);
router.get(
  "/balances",
  authMiddleware,
  requireRoles("school_admin", "staff_admin"),
  listStaffLeaveBalances,
);
router.get(
  "/manage",
  authMiddleware,
  requireRoles("school_admin", "staff_admin"),
  listManageStaffLeaves,
);
router.patch(
  "/manage/:id/action",
  authMiddleware,
  requireRoles("school_admin", "staff_admin"),
  actionStaffLeave,
);

// Teacher / staff self-service
router.get(
  "/me",
  authMiddleware,
  requireRoles("teacher_admin", "staff_admin"),
  getMyStaffLeave,
);
router.post(
  "/me/apply",
  authMiddleware,
  requireRoles("teacher_admin", "staff_admin"),
  applyStaffLeave,
);
router.patch(
  "/me/:id/cancel",
  authMiddleware,
  requireRoles("teacher_admin", "staff_admin"),
  cancelStaffLeave,
);

export default router;
