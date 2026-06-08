import express from "express";
import multer from "multer";
import {
  getBlogs,
  getPublicBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  togglePublic,
  likeBlog,
  getBlogById,
  submitBlogForApproval,
  getMySubmittedBlogs,
  getPendingBlogs,
  approveBlog,
  rejectBlog,
} from "../controllers/blogController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

// multer → memoryStorage so buffer is available for uploadToCloudinary
const upload = multer({ storage: multer.memoryStorage() });

// ── Protected routes ────────────────────────────────────
// ── For All Roles ────────────────────────────────────
router.get("/", authMiddleware, getBlogs); // all blogs for school
router.patch("/:id/like", authMiddleware, likeBlog); // anyone can like

// ── Student: submit for approval + view own submissions ───────────────────────
router.post(
  "/submit",
  upload.array("images", 10),
  authMiddleware,
  submitBlogForApproval,
);
router.get("/my-submissions", authMiddleware, getMySubmittedBlogs);

// ── Teacher: approval queue ───────────────────────────────────────────────────
router.get("/pending", authMiddleware, getPendingBlogs);
router.patch("/:id/approve", authMiddleware, approveBlog);
router.patch("/:id/reject", authMiddleware, rejectBlog);

// ── Admin: create, update, delete ─────────────────────────────────────────────
router.post("/", upload.array("images", 10), authMiddleware, createBlog); // create with images
router.put("/:id", upload.array("images", 10), authMiddleware, updateBlog); // update (replaces images)
router.delete("/:id", authMiddleware, deleteBlog); // delete + cloudinary cleanup
router.patch("/:id/toggle-public", authMiddleware, togglePublic); // toggle visibility

// ── Public routes (no auth needed) ──────────────────────────────────────────
// PUBLIC
// router.get("/public/:schoolId", getPublicBlogs); // public feed by school
router.get("/:id", getBlogById);
export default router;