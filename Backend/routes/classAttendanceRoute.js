import express from "express";
import { authMiddleware } from "../auth/auth.js";
import {
  getClassMeta,
  getExistingClassAttendance,
  saveClassAttendance,
  updateClassAttendance,
  getClassAttendanceReport,
  getStudentClassAttendanceDetail,
  getStudentClassAttendanceForParent,
  getTodaySnapshot,
} from "../controllers/classAttendanceController.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/* ── Meta ─────────────────────────────────────────────────────────────── */
// GET /api/class-attendance/meta
// Returns class+section list. Teacher gets only their class-teacher sections.
router.get("/meta", getClassMeta);

/* ── Today's snapshot (teacher only) ─────────────────────────────────── */
// GET /api/class-attendance/today-snapshot
router.get("/today-snapshot", getTodaySnapshot);

/* ── Check existing record ────────────────────────────────────────────── */
// GET /api/class-attendance/existing?classId=&sectionId=&date=
router.get("/existing", getExistingClassAttendance);

/* ── Mark attendance ──────────────────────────────────────────────────── */
// POST /api/class-attendance/save
router.post("/save", saveClassAttendance);

// PUT /api/class-attendance/update
router.put("/update", updateClassAttendance);

/* ── Reports ──────────────────────────────────────────────────────────── */
// GET /api/class-attendance/report?classId=&sectionId=&date= OR &month=&year=&search=
router.get("/report", getClassAttendanceReport);

// GET /api/class-attendance/student/:studentId?month=&year=
router.get("/student/:studentId", getStudentClassAttendanceDetail);

/* ── Parent / Student view ────────────────────────────────────────────── */
// GET /api/class-attendance/parent/report?studentId=&month=&year=
router.get("/parent/report", getStudentClassAttendanceForParent);

export default router;

/*
 * Mount in your main app.js / server.js like:
 *
 *   import classAttendanceRoute from "./routes/classAttendanceRoutes.js";
 *   app.use("/api/class-attendance", classAttendanceRoute);
 */