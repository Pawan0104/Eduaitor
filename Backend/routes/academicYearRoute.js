import express from "express";
import { authMiddleware, requireRoles } from "../auth/auth.js";
import {
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  activateAcademicYear,
  getAcademicYearUsage,
  deleteAcademicYear,
  assignExistingToSession,
} from "../controllers/academicYearController.js";

const router = express.Router();

const admins = requireRoles("school_admin", "staff_admin", "super_admin");

router.get("/", authMiddleware, getAcademicYears);

router.post("/", authMiddleware, admins, createAcademicYear);

router.put("/:id", authMiddleware, admins, updateAcademicYear);

router.post("/:id/activate", authMiddleware, admins, activateAcademicYear);

router.get("/:id/usage", authMiddleware, admins, getAcademicYearUsage);

router.post(
  "/:id/assign-existing",
  authMiddleware,
  admins,
  assignExistingToSession
);

router.delete("/:id", authMiddleware, admins, deleteAcademicYear);

export default router;
