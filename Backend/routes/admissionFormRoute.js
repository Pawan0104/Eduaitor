import express from "express";
import { authMiddleware, requireRoles } from "../auth/auth.js";
import {
  getAdmissionForm,
  saveAdmissionForm,
  resetAdmissionForm,
} from "../controllers/admissionFormController.js";

const router = express.Router();

const adminOnly = [
  authMiddleware,
  requireRoles("school_admin", "staff_admin", "super_admin"),
];

router.get("/", authMiddleware, getAdmissionForm);
router.put("/", ...adminOnly, saveAdmissionForm);
router.delete("/", ...adminOnly, resetAdmissionForm);

export default router;
