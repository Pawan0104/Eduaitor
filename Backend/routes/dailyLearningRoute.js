import express from "express";
import multer from "multer";
import { authMiddleware } from "../auth/auth.js";
import {
  createAssignment,
  listAssignments,
  getAssignment,
  submitMcq,
  submitHandwritten,
} from "../controllers/dailyLearningController.js";

const router = express.Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
});

router.use(authMiddleware);

router.get("/assignments", listAssignments);
router.post("/assignments", createAssignment);
router.get("/assignments/:id", getAssignment);
router.post("/assignments/:id/submit-mcq", submitMcq);
router.post(
  "/assignments/:id/submit-handwritten",
  imageUpload.single("image"),
  submitHandwritten,
);

export default router;
