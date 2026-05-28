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
} from "../controllers/blogController.js";
import { authMiddleware } from "../auth/auth.js";

const router = express.Router();

// multer → memoryStorage so buffer is available for uploadToCloudinary
const upload = multer({ storage: multer.memoryStorage() });

// ── Public routes (no auth needed) ──────────────────────────────────────────
// PUBLIC
router.get("/:id", getBlogById);
router.patch("/:id/like", likeBlog); // anyone can like
router.get("/public/:schoolId", getPublicBlogs); // public feed by school

// ── Protected routes (school admin only) ────────────────────────────────────
router.use(authMiddleware);
router.get("/", getBlogs); // all blogs for school
router.post("/", upload.array("images", 10), createBlog); // create with images
router.put("/:id", upload.array("images", 10), updateBlog); // update (replaces images)
router.delete("/:id", deleteBlog); // delete + cloudinary cleanup
router.patch("/:id/toggle-public", togglePublic); // toggle visibility

export default router;
