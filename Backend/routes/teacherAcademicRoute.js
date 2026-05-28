import express from "express";
import {
  getTeacherClasses,
  getSubjectsByClass,
  getChaptersBySubject,
  getTopicsByChapter,
} from "../controllers/teacherAcademicController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

router.get("/classes", authMiddleware, getTeacherClasses);
router.get("/subjects", authMiddleware, getSubjectsByClass);
router.get("/chapters", authMiddleware, getChaptersBySubject);
router.get("/topics", authMiddleware, getTopicsByChapter);

export default router;
