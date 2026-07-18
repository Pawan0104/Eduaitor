import express from "express";
import { authMiddleware } from "../auth/auth.js";
import upload from "../middlewares/upload.js";
import {
  startOrGetThread,
  startHelpThread,
  getMyThreads,
  getThreadMessages,
  sendMessage,
  markThreadAsRead,
  getUsersForNewMessage,
} from "../controllers/messagesingalController.js";

const router = express.Router();

// All message routes are protected
router.use(authMiddleware);

// ── THREADS ──────────────────────────────────────────
// POST /api/messages/thread/start
// Start or fetch existing thread with another user
router.post("/thread/start", startOrGetThread);

// POST /api/message-signal/help/start
// Open help chat with platform Super Admin
router.post("/help/start", startHelpThread);

// GET /api/messages/threads
// Get all threads for logged-in user (inbox)
router.get("/threads", getMyThreads);

// PUT /api/messages/thread/:threadId/read
// Mark all messages in thread as seen
router.put("/thread/:threadId/read", markThreadAsRead);

// ── MESSAGES ─────────────────────────────────────────
// GET /api/messages/thread/:threadId
// Get all messages in a thread
router.get("/thread/:threadId", getThreadMessages);

// POST /api/messages/thread/:threadId/send
// Send a message — optional image/file attachment
router.post(
  "/thread/:threadId/send",
  upload.single("attachment"), // field name = "attachment"
  sendMessage
);

// ── NEW MESSAGE PAGE (+ button) ───────────────────────
// GET /api/messages/users
// Get list of teachers + school admin for new message page
router.get("/users", getUsersForNewMessage);

export default router;