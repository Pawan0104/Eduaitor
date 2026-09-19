import express from "express";
import {
  createClassTest,
  getClassTests,
  updateClassTest,
  deleteClassTest,
  getClassTestStudents,
  submitClassTestMarks,
} from "../controllers/classTestController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

router.post("/create", authMiddleware, createClassTest);
router.get("/list", authMiddleware, getClassTests);
router.put("/edit/:id", authMiddleware, updateClassTest);
router.delete("/delete/:id", authMiddleware, deleteClassTest);

// static-before-param ordering (/:id routes must come last)
router.get("/:id/students", authMiddleware, getClassTestStudents);
router.post("/:id/submit", authMiddleware, submitClassTestMarks);

export default router;