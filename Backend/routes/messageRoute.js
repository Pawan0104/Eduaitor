import express from "express";
import {
  sendMessage,
  getGroupMessages,
  updateMessage,
  deleteMessage,
  markAsSeen,
  togglePin,
} from "../controllers/messageController.js";

import upload from "../middlewares/upload.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

router.use(authMiddleware);

// ─── Message routes ─────────────────────────────────────────────

// Send message (text/file)
router.post("/", upload.single("file"), sendMessage);

// Get messages of a group
router.get("/group/:groupId", getGroupMessages);

// Update message (text only)
router.put("/:id", updateMessage);

// Delete message
router.delete("/:id", deleteMessage);

// Mark message as seen
router.patch("/:id/seen", markAsSeen);

// Pin / unpin (admin)
router.patch("/:id/pin", togglePin);

export default router;