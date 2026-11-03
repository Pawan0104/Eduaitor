import express from "express";
import { authMiddleware, requireRoles } from "../auth/auth.js";
import { getAdmissionReport } from "../controllers/admissionReportController.js";

const router = express.Router();

const adminOnly = [
  authMiddleware,
  requireRoles("school_admin", "staff_admin", "super_admin"),
];

router.get("/", ...adminOnly, getAdmissionReport);

export default router;
