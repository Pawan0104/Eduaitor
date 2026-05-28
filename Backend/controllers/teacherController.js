import Teacher from "../models/teacher.js";
import Group from "../models/group.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import { deleteFromCloudinary } from "../utils/deleteFromCloudinary.js";
import bcrypt from "bcryptjs";
import {
  syncTeacherGroups,
  removeTeacherFromOldGroups,
} from "../utils/groupSync.js";

/* ================= GENERATE TEACHER ID ================= */

const generateTeacherId = async (schoolId) => {
  const count = await Teacher.countDocuments({ schoolId });

  const next = count + 1;

  return `TCH${String(next).padStart(4, "0")}`;
};

/* ================= CREATE TEACHER ================= */

export const createTeacher = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const files = req.files || {};

    let photo = null;

    if (files.photo) {
      const uploaded = await uploadToCloudinary(files.photo[0], "teachers");

      photo = {
        url: uploaded.url,
        public_id: uploaded.public_id,
        type: uploaded.type,
      };
    }

    // Auto-generate teacher ID based on school
    const teacherId = await generateTeacherId(schoolId);

    // Parse subjects if it's a JSON string
    let subjects = req.body.subjects;
    if (typeof subjects === "string") {
      try {
        subjects = JSON.parse(subjects);
      } catch (e) {
        subjects = [];
      }
    }

    // Parse assignedClasses if it's a JSON string
    let assignedClasses = req.body.assignedClasses;
    if (typeof assignedClasses === "string") {
      try {
        assignedClasses = JSON.parse(assignedClasses);
      } catch (e) {
        assignedClasses = [];
      }
    }

    req.body.temp_password = req.body.password;
    let hashedPassword = await bcrypt.hash(req.body.password, 10);
    req.body.password = hashedPassword;

    const teacher = await Teacher.create({
      ...req.body,
      teacherId,
      photo,
      assignedClasses,
      subjects,
      schoolId,
    });

    // Sync teacher groups based on assigned classes and subjects
    await syncTeacherGroups(teacher);

    res.status(201).json({
      success: true,
      message: "Teacher created successfully",
      data: teacher,
    });
  } catch (error) {
    console.error("Create teacher error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create teacher",
    });
  }
};

/* ================= GET ALL TEACHERS ================= */

export const getTeachers = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const teachers = await Teacher.find({ schoolId })
      .populate("assignedClasses", "name className section")
      .populate("subjects", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: teachers,
    });
  } catch (error) {
    console.error("Get teachers error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch teachers",
    });
  }
};

/* ================= GET SINGLE TEACHER ================= */

export const getTeacher = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const teacher = await Teacher.findOne({ _id: req.params.id, schoolId })
      .populate("assignedClasses", "name className section")
      .populate("subjects", "name");

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    res.json({
      success: true,
      data: teacher,
    });
  } catch (error) {
    console.error("Get teacher error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch teacher",
    });
  }
};

/* ================= UPDATE TEACHER ================= */

export const updateTeacher = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const safeSchoolId = Array.isArray(schoolId) ? schoolId[0] : schoolId;

    const { photo: _photoFromBody, ...safeBody } = req.body;

    const teacher = await Teacher.findOne({
      _id: req.params.id,
      schoolId: safeSchoolId,
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const oldTeacher = teacher.toObject(); // for group sync comparison

    const files = req.files || {};
    let photo = teacher.photo?.url ? teacher.photo : null;

    if (files.photo) {
      // Delete old photo if exists
      if (photo?.public_id) {
        await deleteFromCloudinary(photo.public_id);
      }

      const uploaded = await uploadToCloudinary(files.photo[0], "teachers");

      photo = {
        url: uploaded.url,
        public_id: uploaded.public_id,
        type: uploaded.type,
      };
    }

    // Parse subjects if it's a JSON string
    let subjects = req.body.subjects;

    if (typeof subjects === "string") {
      try {
        subjects = JSON.parse(subjects);
      } catch {
        subjects = [];
      }
    }

    // Parse assignedClasses if it's a JSON string
    let assignedClasses = req.body.assignedClasses;
    if (typeof assignedClasses === "string") {
      try {
        assignedClasses = JSON.parse(assignedClasses);
      } catch (e) {
        assignedClasses = teacher.assignedClasses;
      }
    }

    delete req.body.schoolId;

    // Only hash password if a new one was actually provided
    if (safeBody.password && safeBody.password.trim() !== "") {
      safeBody.temp_password = safeBody.password;
      safeBody.password = await bcrypt.hash(safeBody.password, 10);
    } else {
      delete safeBody.password;
      delete safeBody.temp_password;
    }

    // Prepare update data
    const updateData = {
      ...safeBody,
      subjects,
      schoolId: safeSchoolId,
      assignedClasses,
    };

    if (photo !== null && photo !== undefined) {
      updateData.photo = photo;
    }

    if (!photo) delete updateData.photo;

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { $set: updateData }, // ← keep $set
      { returnDocument: "after" }, // ← also fixes the deprecation warning
    ).populate("assignedClasses", "name className section");

    const classesChanged =
      JSON.stringify(oldTeacher.assignedClasses) !==
      JSON.stringify(updatedTeacher.assignedClasses);

    if (classesChanged) {
      await removeTeacherFromOldGroups(oldTeacher);
      await syncTeacherGroups(updatedTeacher);
    }

    res.json({
      success: true,
      message: "Teacher updated successfully",
      data: updatedTeacher,
    });
  } catch (error) {
    console.error("Update teacher error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update teacher",
    });
  }
};

/* ================= DELETE TEACHER ================= */

export const deleteTeacher = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const teacher = await Teacher.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Delete photo from cloudinary if exists
    if (teacher.photo?.public_id) {
      await deleteFromCloudinary(teacher.photo.public_id);
    }

    await Group.updateMany(
      {
        schoolId,
        "members.userId": teacher._id,
      },
      {
        $pull: {
          members: { userId: teacher._id },
        },
      },
    );

    await teacher.deleteOne();

    res.json({
      success: true,
      message: "Teacher deleted successfully",
    });
  } catch (error) {
    console.error("Delete teacher error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete teacher",
    });
  }
};

/* ================= GET ALL TEACHERS (SUPER ADMIN) ================= */
export const getAllTeachers = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const schoolId = req.query.schoolId;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const teachers = await Teacher.find({ schoolId })
      .populate("assignedClasses", "name className section")
      .populate("subjects", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: teachers,
    });
  } catch (error) {
    console.error("Get teachers error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch teachers",
    });
  }
};
