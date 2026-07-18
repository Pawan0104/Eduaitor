import express from "express";
import { authMiddleware } from "../auth/auth.js";
import {
  getStudentIdCard,
  getStaffIdCard,
  getMyIdCard,
} from "../controllers/idCardController.js";

const router = express.Router();

router.get("/me", authMiddleware, getMyIdCard);
router.get("/student/:id", authMiddleware, getStudentIdCard);
router.get("/student", authMiddleware, getStudentIdCard);
router.get("/staff/:id", authMiddleware, getStaffIdCard);
router.get("/staff", authMiddleware, getStaffIdCard);

export default router;
