import express from "express";
import upload, { handleUploadError } from "../middlewares/upload.js";import { authMiddleware } from "../auth/auth.js";
import {
  createStudent,
  getStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  getAllStudents,
  getStudentsByTeacher,
  getNextRollNo,
  getNextAdmissionNumber,
  getStudentDocuments,
} from "../controllers/studentController.js";
import uploadSpreadsheet from "../middlewares/uploadSpreadsheet.js";
import {
  bulkUploadStudents,
  downloadStudentTemplate,
  getStudentBulkUploadFields,
} from "../controllers/studentBulkController.js";

const router = express.Router();

const withUpload = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) return handleUploadError(err, req, res, next);
    next();
  });
};

/** Surface multer errors (size/type) as JSON instead of a generic 500. */
const withSpreadsheetUpload = (req, res, next) => {
  uploadSpreadsheet.single("file")(req, res, (err) => {
    if (err) return handleUploadError(err, req, res, next);
    next();
  });
};

/* SUPER ADMIN ROUTES */
router.get("/all/admin", authMiddleware, getAllStudents);

/* BULK UPLOAD ROUTES */
router.get(
  "/bulk-upload/fields",
  authMiddleware,
  getStudentBulkUploadFields,
);
router.get("/bulk-upload/template", authMiddleware, downloadStudentTemplate);
router.post(
  "/bulk-upload",
  authMiddleware,
  withSpreadsheetUpload,
  bulkUploadStudents,
);

/* STUDENT ROUTES */
router.post("/", authMiddleware, withUpload, createStudent);

router.get("/", authMiddleware, getStudents);

router.get("/teacher/my-students", authMiddleware, getStudentsByTeacher);

// Must stay above `/:id` so Express does not treat these as ids.
router.get("/documents", authMiddleware, getStudentDocuments);
router.get("/next-roll-no", authMiddleware, getNextRollNo);
router.get(
  "/next-admission-number",
  authMiddleware,
  getNextAdmissionNumber,
);

router.put("/:id", authMiddleware, withUpload, updateStudent);

router.get("/:id", authMiddleware, getStudent);

router.delete("/:id", authMiddleware, deleteStudent);

export default router;
