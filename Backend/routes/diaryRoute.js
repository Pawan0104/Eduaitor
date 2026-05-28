import express from "express";
import {
  createDiary,
  getDiary,
  updateDiary,
  deleteDiary,
  getPrincipalDiaryFilters,
  getPrincipalDiary,
  getStudentDiary
} from "../controllers/diaryController.js";

import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

router.post("/", authMiddleware, createDiary);
router.get("/", authMiddleware, getDiary);
router.get("/principal/filters", authMiddleware, getPrincipalDiaryFilters);
router.get("/principal", authMiddleware, getPrincipalDiary);
router.get("/parent/:studentId", authMiddleware, getStudentDiary);
router.put("/:id", authMiddleware, updateDiary);
router.delete("/:id", authMiddleware, deleteDiary);

export default router;