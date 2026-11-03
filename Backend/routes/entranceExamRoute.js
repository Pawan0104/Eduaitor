import express from "express";
import { authMiddleware, requireRoles } from "../auth/auth.js";
import {
  createEntranceExam,
  deleteEntranceExam,
  getEntranceExam,
  getEntranceExams,
  saveEntranceMarks,
  updateEntranceExam,
  updateEntranceStatus,
} from "../controllers/entranceExamController.js";

const router = express.Router();

const adminOnly = [
  authMiddleware,
  requireRoles("school_admin", "staff_admin", "super_admin"),
];

router.get("/", ...adminOnly, getEntranceExams);
router.post("/", ...adminOnly, createEntranceExam);

router.get("/:id", ...adminOnly, getEntranceExam);
router.put("/:id", ...adminOnly, updateEntranceExam);
router.patch("/:id/status", ...adminOnly, updateEntranceStatus);
router.post("/:id/marks", ...adminOnly, saveEntranceMarks);
router.delete("/:id", ...adminOnly, deleteEntranceExam);

export default router;
