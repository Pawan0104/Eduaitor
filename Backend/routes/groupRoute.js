import express from "express";
import {
  createGroup,
  getMyGroups,
  getAllSchoolGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMembers,
  removeMembers,
} from "../controllers/groupController.js";

import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// ─── Group routes ─────────────────────────────────────────────────────────────

// Create a new group (admin or teacher)
router.post("/", createGroup);

// My groups (all authenticated users)
router.get("/my-groups", getMyGroups);

// All school groups (admin only)
router.get("/school-groups", getAllSchoolGroups);

// Single group
router.get("/:id", getGroupById);

// Update group
router.put("/:id", updateGroup);

// Archive / delete group
router.delete("/:id", deleteGroup);

// ─── Member management ────────────────────────────────────────────────────────

// Add members
router.post("/:id/members", addMembers);

// Remove members
router.delete("/:id/members", removeMembers);

export default router;
