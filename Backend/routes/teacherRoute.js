import express from "express";
import upload from "../middlewares/upload.js";

import {
  createTeacher,
  getTeachers,
  getTeacher,
  updateTeacher,
  deleteTeacher,
  getAllTeachers,
} from "../controllers/teacherController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

/* SUPER ADMIN TEACHER ROUTES */
router.get("/all/admin", authMiddleware, getAllTeachers);

/* TEACHER ROUTES */
router.post(
  "/",
  authMiddleware,
  upload.fields([{ name: "photo", maxCount: 1 }]),
  createTeacher,
);

router.put(
  "/:id",
  authMiddleware,
  upload.fields([{ name: "photo", maxCount: 1 }]),
  updateTeacher,
);

router.get("/", authMiddleware, getTeachers);

router.get("/:id", authMiddleware, getTeacher);

router.delete("/:id", authMiddleware, deleteTeacher);

export default router;
