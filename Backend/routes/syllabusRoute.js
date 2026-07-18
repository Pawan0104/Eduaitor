// routes/syllabusRoutes.js
import express from "express";
import {
  // Chapter routes
  createChapter,
  getChapters,
  streamSchoolChapterPdf,
  updateChapter,
  deleteChapter,
  reorderChapters,
  // Topic routes
  createTopic,
  getTopics,
  updateTopic,
  deleteTopic,
  reorderTopics,
  // Bulk fetch
  getSyllabusStructure,
  getCompleteSyllabus,
  // PDF syllabus
  getSyllabusPdf,
  uploadSyllabusPdf,
  deleteSyllabusPdf,
} from "../controllers/syllabusController.js";
import { authMiddleware } from "../auth/auth.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

// ==================== SUPER ADMIN SYLLABUS ROUTES ====================
router.get("/complete/", authMiddleware, getCompleteSyllabus);

// ==================== SYLLABUS PDF (teacher / school / staff) ====================
router.get("/pdf", authMiddleware, getSyllabusPdf);
router.post(
  "/pdf",
  authMiddleware,
  upload.single("pdf"),
  uploadSyllabusPdf,
);
router.delete("/pdf", authMiddleware, deleteSyllabusPdf);

// ==================== CHAPTER ROUTES ====================
router.post("/chapters", authMiddleware, createChapter);
router.get("/chapters", authMiddleware, getChapters);
router.get(
  "/chapters/:chapterId/pdf-view",
  authMiddleware,
  streamSchoolChapterPdf,
);
router.put("/chapters/:chapterId", authMiddleware, updateChapter);
router.delete("/chapters/:chapterId", deleteChapter);
router.post("/chapters/reorder", reorderChapters);

// ==================== TOPIC ROUTES ====================
router.post("/topics", authMiddleware, createTopic);
router.get("/topics", authMiddleware, getTopics);
router.put("/topics/:topicId", authMiddleware, updateTopic);
router.delete("/topics/:topicId", deleteTopic);
router.post("/topics/reorder", reorderTopics);

// ==================== BULK ROUTES ====================
router.get("/structure", getSyllabusStructure);

export default router;
