import express from "express";

const router = express.Router();
import { authMiddleware } from "../auth/auth.js";
import {
  getMetaData,
  getStudentsByClassAndSection,
  getExistingAttendance,
  saveAttendance,
  updateAttendance,
  getStudentAttendanceReport,
  getParentAttendanceReport,
  getparentReport,
} from "../controllers/attendanceController.js";

router.get("/meta", authMiddleware, getMetaData);
router.get("/students/filter", authMiddleware, getStudentsByClassAndSection);
router.get("/existing", authMiddleware, getExistingAttendance);
router.post("/save", authMiddleware, saveAttendance);
router.put("/update", authMiddleware, updateAttendance);
router.get("/report", authMiddleware, getStudentAttendanceReport);

// parent attendance report
router.get("/parent/report", authMiddleware, getparentReport); // for /attendance/parent/report
router.get("/parent/student-meta", authMiddleware, getParentAttendanceReport);

export default router;
