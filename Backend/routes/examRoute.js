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
  getReportCard,
} from "../controllers/examController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

router.post("/create", authMiddleware, createExam);
router.get("/list", authMiddleware, getExams);

router.put("/edit/:id", authMiddleware, updateExam);
router.delete("/delete/:id", authMiddleware, deleteExam);
router.get("/teacher-exams", authMiddleware, getTeacherExams);

// Static paths before /:examId
router.get("/report-card/:studentId", authMiddleware, getReportCard);
router.get("/result/student/:studentId", authMiddleware, getStudentResults);
router.get(
  "/result/class/:classId/term/:termId",
  authMiddleware,
  getClassResults,
);

// Marks entry (teacher / school admin / staff)
router.get("/:examId/students", authMiddleware, getExamStudents);
router.post("/:examId/submit", authMiddleware, submitMarks);
router.get("/:examId", authMiddleware, getExamResults);

export default router;
