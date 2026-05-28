import express from "express";
import {
  createExam,
  getExams,
  updateExam,
  deleteExam,
  getTeacherExams,

  getExamStudents,
  submitMarks,
  getExamResults,
  getStudentResults,
  getClassResults,
} from "../controllers/examController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

router.post("/create", authMiddleware, createExam);
router.get("/list", authMiddleware, getExams);

router.put("/edit/:id", authMiddleware, updateExam);
router.delete("/delete/:id", authMiddleware, deleteExam);
router.get("/teacher-exams", authMiddleware, getTeacherExams);





// =========================================================================================================================
// =========================================================================================================================
// ── Teacher Routes ──────────────────────────────────────────────────────────
 
// Get students for an exam (with existing results attached)
// Only the teacher assigned to that exam can access
router.get("/:examId/students", authMiddleware, getExamStudents);
 
// Submit / update marks (bulk)
router.post("/:examId/submit", authMiddleware, submitMarks);
 
// ── Teacher + Principal ──────────────────────────────────────────────────────
 
// Get all results for an exam (summary + per-student)
router.get("/:examId", authMiddleware, getExamResults);
 
// ── Parent + Principal ───────────────────────────────────────────────────────
 
// Get all results for a specific student (optionally filtered by term)
// GET /result/student/:studentId?termId=xxx
router.get("/result/student/:studentId", authMiddleware, getStudentResults);
 
// ── Principal ────────────────────────────────────────────────────────────────
 
// Get full class results for a term
// GET /result/class/:classId/term/:termId?sectionId=xxx
router.get("/result/class/:classId/term/:termId", authMiddleware, getClassResults);
 

export default router;
