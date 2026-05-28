import express from "express";
const router = express.Router();

import { authMiddleware } from "../auth/auth.js";
import {
  createNotification,
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
} from "../controllers/notificationController.js";

router.post("/", authMiddleware, createNotification);
router.get("/", authMiddleware, getAllNotifications);
router.patch("/read-all", authMiddleware, markAllAsRead);
router.patch("/clear-all", authMiddleware, clearAllNotifications);
router.patch("/:id/read", authMiddleware, markAsRead);

export default router;
