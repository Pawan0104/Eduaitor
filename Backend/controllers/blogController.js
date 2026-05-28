import Blog from "../models/blog.js";
import mongoose from "mongoose";
import cloudinary from "cloudinary";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import { deleteFromCloudinary } from "../utils/deleteFromCloudinary.js";

// ─── GET all blogs for this school ───────────────────────────────────────────
export const getBlogs = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const userId = (req.user._id || req.user.id)?.toString();

    // ✅ fetch likedBy in same query, no second query needed
    const blogs = await Blog.find({ schoolId }).sort({ createdAt: -1 }).lean();

    const blogsWithLike = blogs.map((blog) => {
      const { likedBy, ...rest } = blog; // strip likedBy before sending
      return {
        ...rest,
        hasLiked: userId
          ? (likedBy || [])
              .filter(Boolean)
              .some((id) => id.toString() === userId)
          : false,
      };
    });

    res.json({ success: true, data: blogsWithLike });
  } catch (err) {
    console.error("getBlogs error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET public blogs by schoolId (no auth) ───────────────────────────────────
export const getPublicBlogs = async (req, res) => {
  try {
    const schoolId = req.user.school_id || req.params.schoolId;

    // optional: pass userId via query ?userId=xxx so public users can also see hasLiked
    const userId = req.user._id || req.query.userId;

    const blogs = await Blog.find({ schoolId, isPublic: true })
      .select("-likedBy")
      .sort({ createdAt: -1 })
      .lean();

    let blogsWithLike = blogs;
    if (userId) {
      blogsWithLike = await Promise.all(
        blogs.map(async (blog) => {
          const full = await Blog.findById(blog._id).select("likedBy");
          return {
            ...blog,
            hasLiked: full.likedBy.some((id) => id.toString() === userId),
          };
        }),
      );
    }

    res.json({ success: true, data: blogsWithLike });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── CREATE blog ──────────────────────────────────────────────────────────────
export const createBlog = async (req, res) => {
  console.log("Creating blog with data:", req.body);
  try {
    const { title, content, category, isPublic } = req.body;
    const schoolId = req.user.school_id;

    // Upload images to Cloudinary
    let images = [];
    if (req.files && req.files.length > 0) {
      const uploads = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file, "blogs")),
      );
      images = uploads.map((u) => ({ url: u.url, public_id: u.public_id }));
    }

    const blog = await Blog.create({
      title,
      content,
      category: category || "General",
      isPublic: isPublic === "true" || isPublic === true,
      images,
      schoolId,
    });
    console.log("Created blog:", blog);
    res.status(201).json({ success: true, data: blog });
  } catch (err) {
    console.log("Error creating blog:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── UPDATE blog ──────────────────────────────────────────────────────────────
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, isPublic } = req.body;
    const schoolId = req.user.school_id;

    // Ensure blog belongs to this school
    const blog = await Blog.findOne({ _id: id, schoolId });
    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });

    // If new images uploaded → delete old ones from Cloudinary, upload new
    let images = blog.images;
    if (req.files && req.files.length > 0) {
      if (blog.images.length > 0) {
        await Promise.all(
          blog.images.map((img) => cloudinary.uploader.destroy(img.public_id)),
        );
      }
      const uploads = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file, "blogs")),
      );
      images = uploads.map((u) => ({ url: u.url, public_id: u.public_id }));
    }

    const updated = await Blog.findByIdAndUpdate(
      id,
      {
        title,
        content,
        category,
        isPublic: isPublic === "true" || isPublic === true,
        images,
      },
      { new: true },
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE blog ──────────────────────────────────────────────────────────────
export const deleteBlog = async (req, res) => {
  console.log("Deleting blog with id:", req.params.id);
  try {
    const { id } = req.params;
    const schoolId = req.user.school_id;

    const blog = await Blog.findOne({ _id: id, schoolId });
    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });

    // Delete images from Cloudinary
    if (blog.images.length > 0) {
      await Promise.all(
        blog.images.map((img) => cloudinary.uploader.destroy(img.public_id)),
      );
    }

    await blog.deleteOne();
    res.json({ success: true, message: "Blog deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── TOGGLE public / private ──────────────────────────────────────────────────
export const togglePublic = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.school_id;
    console.log(
      "Toggling public/private for blogId:",
      id,
      "schoolId:",
      schoolId,
    );

    const blog = await Blog.findOne({ _id: id, schoolId });
    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });

    blog.isPublic = !blog.isPublic;
    await blog.save();

    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── LIKE / UNLIKE toggle ─────────────────────────────────────────────────────
export const likeBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const blog = await Blog.findById(id);
    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });

    // ✅ treat null field as empty array
    const likedBy = blog.likedBy || [];
    const alreadyLiked = likedBy.some(
      (uid) => uid?.toString() === userId?.toString(),
    );

    const updated = await Blog.findByIdAndUpdate(
      id,
      alreadyLiked
        ? {
            $pull: { likedBy: userId },
            $inc: { likes: -1 },
          }
        : {
            $addToSet: { likedBy: userId }, // addToSet prevents duplicates
            $inc: { likes: 1 },
          },
      { new: true },
    );

    res.json({
      success: true,
      likes: Math.max(0, updated.likes),
      hasLiked: !alreadyLiked,
    });
  } catch (err) {
    console.error("likeBlog error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).lean();
    if (!blog)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
