import { Router } from "express";
import { authMiddleware, requireRoles } from "../auth/auth.js";
import {
  createPaper,
  listPapers,
  getPaper,
  updatePaper,
  submitPaper,
  approvePaper,
  rejectPaper,
  requestRevision,
  deletePaper,
  fetchChapters,
  generateAIQuestions,
  getAnalytics,
  createPapersFromSchedule,
  getScheduleOptions,
} from "../controllers/examPaperController.js";

const router = Router();

router.get("/list", authMiddleware, listPapers);
router.get("/schedule-options", authMiddleware, getScheduleOptions);
router.get("/analytics", authMiddleware, requireRoles("school_admin", "staff_admin", "super_admin"), getAnalytics);
router.get("/chapters", authMiddleware, fetchChapters);
router.post("/create", authMiddleware, requireRoles("teacher_admin", "school_admin", "staff_admin"), createPaper);
router.post("/generate-ai", authMiddleware, requireRoles("teacher_admin"), generateAIQuestions);
router.post("/from-schedule/:id", authMiddleware, requireRoles("school_admin", "staff_admin"), createPapersFromSchedule);

router.get("/:id", authMiddleware, getPaper);
router.put("/:id", authMiddleware, requireRoles("teacher_admin", "school_admin", "staff_admin"), updatePaper);
router.post("/:id/submit", authMiddleware, requireRoles("teacher_admin"), submitPaper);
router.post("/:id/approve", authMiddleware, requireRoles("school_admin", "staff_admin", "super_admin"), approvePaper);
router.post("/:id/reject", authMiddleware, requireRoles("school_admin", "staff_admin", "super_admin"), rejectPaper);
router.post("/:id/revision", authMiddleware, requireRoles("school_admin", "staff_admin", "super_admin"), requestRevision);
router.delete("/:id", authMiddleware, requireRoles("teacher_admin", "school_admin", "staff_admin"), deletePaper);

export default router;
