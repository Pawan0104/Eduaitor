import Blog from "../models/blog.js";
import Class from "../models/class.js";
import Student from "../models/student.js";
import mongoose from "mongoose";
import cloudinary from "cloudinary";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

// ─── GET all blogs for this school ───────────────────────────────────────────
export const getBlogs = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const userId = (req.user._id || req.user.id)?.toString();
    const role = req.user.role;

    let query = { schoolId };

    if (role === "student_admin") {
      // students: only public + published (or legacy no-status) blogs
      query = {
        schoolId,
        isPublic: true,
        $or: [
          { status: "published" },
          { status: { $exists: false } },
          { status: null },
        ],
      };
    } else if (role === "teacher_admin") {
      // teachers: all published/legacy public blogs + their own private ones
      // but NOT pending/rejected student submissions (those go in /pending)
      query = {
        schoolId,
        $or: [
          // published public blogs everyone sees
          {
            isPublic: true,
            $or: [
              { status: "published" },
              { status: { $exists: false } },
              { status: null },
            ],
          },
          // their own private published blogs
          {
            createdBy: userId,
            isPublic: false,
            $or: [
              { status: "published" },
              { status: { $exists: false } },
              { status: null },
            ],
          },
        ],
      };
    } else {
      // school_admin: all published/legacy blogs (public + private), no pending
      query = {
        schoolId,
        $or: [
          { status: "published" },
          { status: { $exists: false } },
          { status: null },
        ],
      };
    }

    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "fullName firstName lastName")
      .populate({
        path: "studentAuthor",
        select: "firstName lastName classId sectionId",
        populate: [
          { path: "classId", select: "name" },
          { path: "sectionId", select: "name" },
        ],
      })
      .lean();

    const blogsWithMeta = blogs.map((blog) => {
      const { likedBy, ...rest } = blog;

      const hasLiked = userId
        ? (likedBy || []).filter(Boolean).some((id) => id.toString() === userId)
        : false;

      const canEdit =
        role === "school_admin" ||
        (role === "teacher_admin" &&
          blog.createdBy?._id?.toString() === userId);

      // replace the createdByName + studentName block inside blogsWithMeta.map
      const isStudentBlog = !!blog.studentAuthor;

      // for student-authored blogs: show student name instead of teacher name
      const createdByName = isStudentBlog
        ? blog.studentAuthor
          ? `${blog.studentAuthor.firstName} ${blog.studentAuthor.lastName}`
          : "Student"
        : blog.createdBy
          ? blog.createdBy.fullName ||
            `${blog.createdBy.firstName ?? ""} ${blog.createdBy.lastName ?? ""}`.trim() ||
            "School Admin"
          : blog.creatorRole === "school_admin"
            ? "School Admin"
            : "School Administration";

      const studentName = isStudentBlog
        ? `${blog.studentAuthor?.firstName ?? ""} ${blog.studentAuthor?.lastName ?? ""}`.trim()
        : null;

      const studentClass =
        isStudentBlog && blog.studentAuthor?.classId
          ? blog.studentAuthor.sectionId?.name
            ? `${blog.studentAuthor.classId.name} - ${blog.studentAuthor.sectionId.name}`
            : blog.studentAuthor.classId.name
          : null;

      return { ...rest, hasLiked, canEdit, createdByName, studentName, studentClass  };
    });

    res.json({ success: true, data: blogsWithMeta });
  } catch (err) {
    console.error("getBlogs error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET public blogs by schoolId (no auth) ──────────────────────────────────
export const getPublicBlogs = async (req, res) => {
  try {
    const schoolId = req.params.schoolId;
    const blogs = await Blog.find({ schoolId, isPublic: true })
      .sort({ createdAt: -1 })
      .lean();

    // strip likedBy before sending
    const data = blogs.map(({ likedBy, ...rest }) => rest);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── CREATE blog ──────────────────────────────────────────────────────────────
export const createBlog = async (req, res) => {
  try {
    const { title, content, category, isPublic } = req.body;
    const schoolId = req.user.school_id;
    const createdBy = req.user._id || req.user.id;
    const role = req.user.role;

    let images = [];
    if (req.files?.length > 0) {
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
      createdBy,
      creatorModel: role === "teacher_admin" ? "Teacher" : "School",
      creatorRole: role,
    });

    res.status(201).json({ success: true, data: blog });
  } catch (err) {
    console.error("createBlog error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── UPDATE blog ──────────────────────────────────────────────────────────────
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, isPublic } = req.body;
    const schoolId = req.user.school_id;
    const userId = (req.user._id || req.user.id)?.toString();
    const role = req.user.role;

    const blog = await Blog.findOne({ _id: id, schoolId });
    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });

    // ownership check
    if (role !== "school_admin" && blog.createdBy?.toString() !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to edit this blog" });
    }

    let images = blog.images;
    if (req.files?.length > 0) {
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
  try {
    const { id } = req.params;
    const schoolId = req.user.school_id;
    const userId = (req.user._id || req.user.id)?.toString();
    const role = req.user.role;

    const blog = await Blog.findOne({ _id: id, schoolId });
    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });

    if (role !== "school_admin" && blog.createdBy?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this blog",
      });
    }

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
    const userId = (req.user._id || req.user.id)?.toString();
    const role = req.user.role;

    const blog = await Blog.findOne({ _id: id, schoolId });
    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });

    if (role !== "school_admin" && blog.createdBy?.toString() !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

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
    const userId = req.user?._id || req.user?.id;

    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Login required to like" });

    const blog = await Blog.findById(id);
    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });

    const alreadyLiked = (blog.likedBy || []).some(
      (uid) => uid?.toString() === userId?.toString(),
    );

    const updated = await Blog.findByIdAndUpdate(
      id,
      alreadyLiked
        ? { $pull: { likedBy: userId }, $inc: { likes: -1 } }
        : { $addToSet: { likedBy: userId }, $inc: { likes: 1 } },
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

// ─── GET single blog ──────────────────────────────────────────────────────────
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

// ─── STUDENT: Submit blog for approval ───────────────────────────────────────
export const submitBlogForApproval = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const schoolId = req.user.school_id;
    const studentId = req.user._id || req.user.id;

    // find the student to get their classId + sectionId
    const student = await Student.findById(studentId).lean();
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    if (!student.classId)
      return res
        .status(400)
        .json({ success: false, message: "You are not assigned to a class" });

    // find class teacher — match classId + sectionId to get the right detail row
    const cls = await Class.findById(student.classId).lean();
    if (!cls)
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });

    // find the detail row matching student's sectionId (or first detail if no section)
    const detail = student.sectionId
      ? cls.details.find(
          (d) => d.sectionId?.toString() === student.sectionId.toString(),
        )
      : cls.details[0];

    const classTeacherId = detail?.teacherId || null;

    let images = [];
    if (req.files?.length > 0) {
      const uploads = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file, "blogs")),
      );
      images = uploads.map((u) => ({ url: u.url, public_id: u.public_id }));
    }

    const blog = await Blog.create({
      title,
      content,
      category: category || "General",
      isPublic: false, // not public until approved
      status: "pending",
      images,
      schoolId,
      studentAuthor: studentId,
      createdBy: classTeacherId, // assigned teacher will be the approver
      creatorModel: "Teacher",
      creatorRole: "teacher_admin",
    });

    res.status(201).json({ success: true, data: blog });
  } catch (err) {
    console.error("submitBlogForApproval error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── TEACHER: Get pending blogs for approval ──────────────────────────────────
export const getPendingBlogs = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const userId = (req.user._id || req.user.id)?.toString();
    const role = req.user.role;

    let query = { schoolId, status: "pending" };

    if (role === "school_admin") {
      // principal sees ALL pending blogs for the school
      // no extra filter needed
    } else if (role === "teacher_admin") {
      // teacher only sees pending blogs where they are the assigned class teacher
      query.createdBy = userId;
    } else {
      // students/others should not access this
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const blogs = await Blog.find(query)
      .populate("studentAuthor", "firstName lastName studentId")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: blogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── TEACHER/SCHOOL_ADMIN: Approve blog ──────────────────────────────────────────────
export const approveBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.school_id;
    const userId = (req.user._id || req.user.id)?.toString();
    const role = req.user.role;

    const blog = await Blog.findOne({ _id: id, schoolId, status: "pending" });
    if (!blog)
      return res.status(404).json({
        success: false,
        message: "Blog not found or already reviewed",
      });

    // school_admin can approve any; teacher only if they are the assigned class teacher
    if (role !== "school_admin" && blog.createdBy?.toString() !== userId)
      return res.status(403).json({
        success: false,
        message: "Not authorized to approve this blog",
      });

    blog.status = "published";
    blog.isPublic = true;
    blog.rejectionReason = "";
    await blog.save();

    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── TEACHER/SCHOOL_ADMIN: Reject blog ──────────────────────────────────────────────
export const rejectBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const schoolId = req.user.school_id;
    const userId = (req.user._id || req.user.id)?.toString();
    const role = req.user.role;

    const blog = await Blog.findOne({ _id: id, schoolId, status: "pending" });
    if (!blog)
      return res.status(404).json({
        success: false,
        message: "Blog not found or already reviewed",
      });

    if (role !== "school_admin" && blog.createdBy?.toString() !== userId)
      return res.status(403).json({
        success: false,
        message: "Not authorized to reject this blog",
      });

    blog.status = "rejected";
    blog.isPublic = false;
    blog.rejectionReason = reason || "";
    await blog.save();

    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── STUDENT: Get their own submitted blogs ───────────────────────────────────
export const getMySubmittedBlogs = async (req, res) => {
  try {
    const studentId = req.user._id || req.user.id;
    const schoolId = req.user.school_id;

    const blogs = await Blog.find({ schoolId, studentAuthor: studentId })
      .sort({ createdAt: -1 })
      .lean();

    const data = blogs.map(({ likedBy, ...rest }) => rest);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};