import express from "express";
import { authMiddleware, requireRoles } from "../auth/auth.js";
import {
  getAdmissionForm,
  saveAdmissionForm,
  saveAdmissionFormLayout,
  resetAdmissionForm,
  withFormType,
} from "../controllers/admissionFormController.js";

const router = express.Router();

const adminOnly = [
  authMiddleware,
  requireRoles("school_admin", "staff_admin", "super_admin"),
];

const layoutAdminOnly = [
  authMiddleware,
  requireRoles("school_admin", "super_admin"),
];

const bindFormRoutes = (formType) => {
  const formRouter = express.Router();
  formRouter.use(withFormType(formType));
  formRouter.get("/", authMiddleware, getAdmissionForm);
  formRouter.put("/", ...adminOnly, saveAdmissionForm);
  formRouter.delete("/", ...adminOnly, resetAdmissionForm);
  return formRouter;
};

// Default mount (/api/admission-form) stays admission-specific.
router.use(withFormType("admission"));
router.get("/", authMiddleware, getAdmissionForm);
router.put("/", ...adminOnly, saveAdmissionForm);
router.patch("/layout", ...layoutAdminOnly, saveAdmissionFormLayout);
router.delete("/", ...adminOnly, resetAdmissionForm);

export const leadFormRoute = bindFormRoutes("lead");
export const registrationFormRoute = bindFormRoutes("registration");
export default router;
