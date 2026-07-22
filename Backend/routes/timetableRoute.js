import express from "express";
import {
  saveTimetable,
  getTimetable,
  markTeacherAbsent,
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
router.get("/:classId", authMiddleware, getTimetable);
router.post("/teacher-absent", markTeacherAbsent);

export default router;
