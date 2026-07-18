import express from "express";
import { authMiddleware } from "../auth/auth.js";
import {
  addLeadFollowUp,
  createLead,
  deleteLead,
  getLeadAssignees,
  getLeadFollowUps,
  getLeads,
  updateLeadAssignee,
  updateLeadStatus,
} from "../controllers/leadController.js";

const router = express.Router();

router.get("/assignable-users", authMiddleware, getLeadAssignees);
router.get("/", authMiddleware, getLeads);
router.post("/", authMiddleware, createLead);
router.patch("/:id/status", authMiddleware, updateLeadStatus);
router.patch("/:id/assignee", authMiddleware, updateLeadAssignee);
router.get("/:id/followups", authMiddleware, getLeadFollowUps);
router.post("/:id/followups", authMiddleware, addLeadFollowUp);
router.delete("/:id", authMiddleware, deleteLead);

export default router;