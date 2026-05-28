import express from "express";
import {
  createAssignment,
  getTeacherAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  togglePublishAssignment,
} from "../controllers/assignmentController.js";

import {
  getStudentAssignments,
  getAssignmentForStudent,
  submitAssignment,
  getMySubmission,
} from "../controllers/submissionController.js";

import {
  getAssignmentSubmissions,
  getStudentSubmissionDetail,
  getTeacherAssignmentResults,
  getMySubmissionHistory,
} from "../controllers/submissionController.js";

import { authMiddleware } from "../auth/auth.js";
import { generateAIQuestions } from "../controllers/aiController.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/create", createAssignment);
router.post("/generate-questions", generateAIQuestions);

router.get("/teacher/results", getTeacherAssignmentResults);
router.get("/teacher", getTeacherAssignments);

router.get("/student/history", getMySubmissionHistory);
router.get("/student/list", getStudentAssignments);
router.post("/student/:id/submit", submitAssignment);
router.get("/student/:id/report", getMySubmission);
router.get("/student/:id", getAssignmentForStudent);

router.patch("/publish/:id", togglePublishAssignment);

router.get(
  "/teacher/:assignmentId/student/:studentId",
  getStudentSubmissionDetail,
);
router.get("/teacher/:id/submissions", getAssignmentSubmissions);

router.get("/:id", getAssignmentById);
router.put("/:id", updateAssignment);
router.delete("/:id", deleteAssignment);

export default router;
