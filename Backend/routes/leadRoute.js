import express from "express";
import { authMiddleware } from "../auth/auth.js";
import {
  addLeadFollowUp,
  createLead,
  getLeadAssignees,
  getLeadById,
  getLeadFollowUps,
  getLeads,
  updateLead,
  updateLeadAssignee,
  updateLeadStatus,
} from "../controllers/leadController.js";

const router = express.Router();

router.get("/assignable-users", authMiddleware, getLeadAssignees);
router.get("/", authMiddleware, getLeads);
router.post("/", authMiddleware, createLead);
router.get("/:id", authMiddleware, getLeadById);
router.put("/:id", authMiddleware, updateLead);
router.patch("/:id/status", authMiddleware, updateLeadStatus);
router.patch("/:id/assignee", authMiddleware, updateLeadAssignee);
router.get("/:id/followups", authMiddleware, getLeadFollowUps);
router.post("/:id/followups", authMiddleware, addLeadFollowUp);

export default router;