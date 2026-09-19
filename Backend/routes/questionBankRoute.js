import { Router } from "express";
import { authMiddleware, requireRoles } from "../auth/auth.js";
import {
  createQuestions,
  listQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  importFromPaper,
  incrementUsage,
  fetchBankChapters,
} from "../controllers/questionBankController.js";

const router = Router();

router.get("/list", authMiddleware, listQuestions);
router.get("/chapters", authMiddleware, fetchBankChapters);
router.get("/:id", authMiddleware, getQuestion);
router.post("/create", authMiddleware, requireRoles("teacher_admin", "school_admin", "staff_admin"), createQuestions);
router.post("/increment-usage", authMiddleware, incrementUsage);
router.post("/import-paper/:paperId", authMiddleware, importFromPaper);
router.put("/:id", authMiddleware, requireRoles("teacher_admin", "school_admin", "staff_admin"), updateQuestion);
router.delete("/:id", authMiddleware, requireRoles("teacher_admin", "school_admin", "staff_admin"), deleteQuestion);

export default router;