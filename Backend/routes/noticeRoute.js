import express from "express";
import {
  getAllNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  getAllAdminNotices,
} from "../controllers/noticeController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

// SUPER ADMIN ROUTES
router.get("/all/admin", authMiddleware, getAllAdminNotices);

// NOTICE ROUTES
router.get("/", authMiddleware, getAllNotices);
router.post("/create", authMiddleware , createNotice);
router.get("/detail/:id", authMiddleware,getNoticeById);
router.put("/:id", authMiddleware,updateNotice);
router.delete("/:id", authMiddleware,deleteNotice);

export default router;
