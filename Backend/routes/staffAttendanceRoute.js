import express from "express";
import { authMiddleware } from "../auth/auth.js";
import checkModuleAccess from "../middlewares/checkModuleAccess.js";
import {
  getStaffAttendanceMeta,
  getStaffAttendanceRecords,
  biometricSyncStaffAttendance,
  saveStaffAttendance,
  updateStaffAttendance,
  getStaffAttendanceSummary,
} from "../controllers/staffAttendanceController.js";

const router = express.Router();

router.get(
  "/meta",
  authMiddleware,
  checkModuleAccess("attendance"),
  getStaffAttendanceMeta,
);
router.get(
  "/records",
  authMiddleware,
  checkModuleAccess("attendance"),
  getStaffAttendanceRecords,
);
router.get(
  "/summary",
  authMiddleware,
  checkModuleAccess("attendance"),
  getStaffAttendanceSummary,
);
router.post(
  "/save",
  authMiddleware,
  checkModuleAccess("attendance"),
  saveStaffAttendance,
);
router.put(
  "/update",
  authMiddleware,
  checkModuleAccess("attendance"),
  updateStaffAttendance,
);
router.post(
  "/biometric-sync",
  authMiddleware,
  checkModuleAccess("attendance"),
  biometricSyncStaffAttendance,
);

export default router;
