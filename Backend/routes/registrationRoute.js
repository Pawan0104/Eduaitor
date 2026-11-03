import express from "express";
import { authMiddleware, requireRoles } from "../auth/auth.js";
import {
  createRegistration,
  deleteRegistration,
  getRegistration,
  getRegistrationLink,
  getRegistrations,
  updateRegistration,
  updateRegistrationLink,
  updateRegistrationStatus,
  addRegistrationFollowUp,
  getRegistrationFollowUps,
} from "../controllers/registrationController.js";

const router = express.Router();

const adminOnly = [
  authMiddleware,
  requireRoles("school_admin", "staff_admin", "super_admin"),
];

router.get("/link", ...adminOnly, getRegistrationLink);
router.put("/link", ...adminOnly, updateRegistrationLink);

router.get("/", ...adminOnly, getRegistrations);
router.post("/", ...adminOnly, createRegistration);

router.get("/:id/followups", ...adminOnly, getRegistrationFollowUps);
router.post("/:id/followups", ...adminOnly, addRegistrationFollowUp);

router.get("/:id", ...adminOnly, getRegistration);
router.put("/:id", ...adminOnly, updateRegistration);
router.patch("/:id/status", ...adminOnly, updateRegistrationStatus);
router.delete("/:id", ...adminOnly, deleteRegistration);

export default router;
