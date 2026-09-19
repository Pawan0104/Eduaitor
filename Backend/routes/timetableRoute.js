import express from "express";
import {
  saveTimetable,
  getTimetable,
  getClassTimetablePreview,
  markTeacherAbsent,
  getTeacherDaySchedule,
  assignProxyTeacher,
} from "../controllers/timetableController.js";
import {
  downloadTimetableTemplate,
  bulkUploadTimetable,
} from "../controllers/timetableBulkController.js";
import { authMiddleware } from "../auth/auth.js";
import uploadSpreadsheet from "../middlewares/uploadSpreadsheet.js";

const router = express.Router();

router.get(
  "/bulk-upload/template",
  authMiddleware,
  downloadTimetableTemplate,
);
router.post(
  "/bulk-upload",
  authMiddleware,
  uploadSpreadsheet.single("file"),
  bulkUploadTimetable,
);

router.post("/save", authMiddleware, saveTimetable);
router.get("/teacher-schedule", authMiddleware, getTeacherDaySchedule);
router.post("/proxy-assign", authMiddleware, assignProxyTeacher);
router.get("/preview/:classId", authMiddleware, getClassTimetablePreview);
router.get("/:classId", authMiddleware, getTimetable);
router.post("/teacher-absent", markTeacherAbsent);

export default router;
