// routes/syllabusRoutes.js
import express from "express";
import {
  // Chapter routes
  createChapter,
  getChapters,
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
} from "../controllers/syllabusController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

// ==================== SUPER ADMIN SYLLABUS ROUTES ====================
router.get("/complete/",authMiddleware, getCompleteSyllabus);

// ==================== CHAPTER ROUTES ====================
router.post("/chapters", authMiddleware, createChapter);
router.get("/chapters", authMiddleware, getChapters);
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
