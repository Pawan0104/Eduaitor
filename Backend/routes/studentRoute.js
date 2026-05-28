import express from "express";
import upload from "../middlewares/upload.js";
import { authMiddleware } from "../auth/auth.js";
import {
  createStudent,
  getStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  getAllStudents,
  getStudentsByTeacher,
} from "../controllers/studentController.js";

const router = express.Router();

/* SUPER ADMIN ROUTES */
router.get("/all/admin", authMiddleware, getAllStudents);

/* STUDENT ROUTES */
router.post(
  "/",
  authMiddleware,
  upload.fields([
    { name: "studentPhoto", maxCount: 1 },
    { name: "fatherPhoto", maxCount: 1 },
    { name: "motherPhoto", maxCount: 1 },
    { name: "guardianPhoto", maxCount: 1 },

    { name: "birthCertificate", maxCount: 1 },
    { name: "transferCertificate", maxCount: 1 },

    { name: "studentAadhar", maxCount: 1 },
    { name: "fatherAadhar", maxCount: 1 },
    { name: "motherAadhar", maxCount: 1 },
  ]),
  createStudent,
);

router.put(
  "/:id",
  authMiddleware,
  upload.fields([
    { name: "studentPhoto", maxCount: 1 },
    { name: "fatherPhoto", maxCount: 1 },
    { name: "motherPhoto", maxCount: 1 },
    { name: "guardianPhoto", maxCount: 1 },

    { name: "birthCertificate", maxCount: 1 },
    { name: "transferCertificate", maxCount: 1 },

    { name: "studentAadhar", maxCount: 1 },
    { name: "fatherAadhar", maxCount: 1 },
    { name: "motherAadhar", maxCount: 1 },
  ]),

  updateStudent,
);

router.get("/", authMiddleware, getStudents);

router.get("/teacher/my-students", authMiddleware, getStudentsByTeacher);

router.get("/:id", authMiddleware, getStudent);

router.delete("/:id", authMiddleware, deleteStudent);

export default router;
