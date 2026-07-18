import express from "express";

import {
  createSchool,
  getSchools,
  getSchool,
  updateSchool,
  deleteSchool,
  getMySchoolRazorpay,
  updateMySchoolRazorpay,
  testMySchoolRazorpay,
} from "../controllers/schoolController.js";
import upload from "../middlewares/upload.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

/* ROUTES */

router.post("/", upload.single("school_logo"), createSchool);

router.get("/", getSchools);

router.get("/me/razorpay", authMiddleware, getMySchoolRazorpay);
router.put("/me/razorpay", authMiddleware, updateMySchoolRazorpay);
router.post("/me/razorpay/test", authMiddleware, testMySchoolRazorpay);

router.get("/:id", getSchool);

router.put("/:id", upload.single("school_logo"), updateSchool);

router.delete("/:id", deleteSchool);

export default router;