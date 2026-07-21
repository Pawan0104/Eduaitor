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
import { authMiddleware, requireRoles } from "../auth/auth.js";

const router = express.Router();

const superAdminOnly = [authMiddleware, requireRoles("super_admin")];

/* ROUTES — platform school management is Super Admin only */

router.post(
  "/",
  ...superAdminOnly,
  upload.single("school_logo"),
  createSchool,
);

router.get("/", ...superAdminOnly, getSchools);

router.get("/me/razorpay", authMiddleware, getMySchoolRazorpay);
router.put("/me/razorpay", authMiddleware, updateMySchoolRazorpay);
router.post("/me/razorpay/test", authMiddleware, testMySchoolRazorpay);

router.get("/:id", ...superAdminOnly, getSchool);

router.put(
  "/:id",
  ...superAdminOnly,
  upload.single("school_logo"),
  updateSchool,
);

router.delete("/:id", ...superAdminOnly, deleteSchool);

export default router;
