import Assignment from "../models/assignment.js";
import Teacher from "../models/teacher.js";
import Class from "../models/class.js";
import { createNotificationHelper } from "./notificationController.js";
/* ================= CREATE ================= */

export const createAssignment = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const teacherId = req.user?.teacher_id;

    const {
      title,
      description,
      type,
      classId,
      subjectId,
      chapterId,
      topicId,
      questions,
      dueDate,
      duration,
      maxAttempts,
    } = req.body;

    if (!teacherId || !schoolId || !classId || !subjectId || !chapterId) {
      return res.status(400).json({
        success: false,
        message:
          "Required fields missing: teacherId, schoolId, classId, subjectId, chapterId",
      });
    }

    if (!dueDate) {
      return res.status(400).json({
        success: false,
        message: "dueDate is required",
      });
    }

    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found" });
    }

    // CLASS VALIDATION — teacher must be assigned to this class
    const isAllowed = teacher.assignedClasses.some(
      (c) => c.toString() === classId,
    );

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to create assignments for this class",
      });
    }

    // SUBJECT VALIDATION — teacher must be assigned to this subject in the class
    const cls = await Class.findById(classId);

    const isSubjectAllowed = cls.details.some((d) =>
      (d.subjectTeachers || []).some(
        (st) =>
          st.subjectId.toString() === subjectId &&
          st.teacherId &&
          st.teacherId.toString() === teacherId,
      ),
    );

    if (!isSubjectAllowed) {
      return res.status(403).json({
        success: false,
        message: "Not assigned to this subject",
      });
    }

    // CALCULATE MARKS
    const totalMarks = (questions || []).reduce(
      (sum, q) => sum + (Number(q.marks) || 0),
      0,
    );

    const assignment = await Assignment.create({
      title,
      description,
      type: type || "homework",
      classId,
      subjectId,
      chapterId,
      topicId: topicId || undefined,
      questions: questions || [],
      totalMarks,
      dueDate,
      duration: duration ? Number(duration) : undefined,
      maxAttempts: maxAttempts ? Number(maxAttempts) : 1,
      teacherId,
      schoolId,
    });

    await createNotificationHelper({
  title: "New Assignment 📚",
  message: `${title} has been assigned. Due date: ${new Date(dueDate).toLocaleDateString()}`,
  notificationType: "assignment", // ⚠️ add this in enum
  createdBy: req.user._id,
  schoolId,
  targets: [
    {
      type: "class",
      classId,
      sectionId: req.body.sectionId || null
    }
  ]
              });

    res.status(201).json({
      success: true,
      message: "Assignment created",
      data: assignment,
    });
  } 

  catch (err) {
    console.error("createAssignment:", err);
    res.status(500).json({ success: false, message: err.message });
  }

};

/* ================= GET TEACHER ASSIGNMENTS ================= */

export const getTeacherAssignments = async (req, res) => {
  try {
    const teacherId = req.user?.teacher_id;

    if (!teacherId) {
      return res.status(400).json({
        success: false,
        message: "teacherId is required",
      });
    }

    const assignments = await Assignment.find({ teacherId })
      .populate("classId", "name")
      .populate("subjectId", "name")
      .populate("chapterId", "name")
      .populate("topicId", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: assignments });
  } catch (err) {
    console.error("getTeacherAssignments:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= GET SINGLE ================= */

export const getAssignmentById = async (req, res) => {
  try {
    const teacherId = req.user?.teacher_id;

    if (!teacherId) {
      return res.status(400).json({
        success: false,
        message: "teacherId is required",
      });
    }

    const assignment = await Assignment.findById(req.params.id)
      .populate("classId", "name")
      .populate("subjectId", "name")
      .populate("chapterId", "name")
      .populate("topicId", "name");

    if (!assignment) {
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    }

    if (assignment.teacherId.toString() !== teacherId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    res.json({ success: true, data: assignment });
  } catch (err) {
    console.error("getAssignmentById:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= UPDATE ================= */

export const updateAssignment = async (req, res) => {
  try {
    const teacherId = req.user?.teacher_id;

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    if (assignment.teacherId.toString() !== teacherId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "type",
      "dueDate",
      "duration",
      "maxAttempts",
      "questions",
    ];

    const updateData = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updateData[f] = req.body[f];
    });

    if (updateData.questions) {
      updateData.totalMarks = updateData.questions.reduce(
        (sum, q) => sum + (Number(q.marks) || 0),
        0,
      );
    }

    // notification for updation on date + time + questions + title change
    let shouldNotify = false;
let message = "Assignment updated.";

if (req.body.dueDate && req.body.dueDate !== assignment.dueDate.toISOString()) {
  shouldNotify = true;
  message = `Due date updated to ${new Date(req.body.dueDate).toLocaleDateString()}`;
}

if (req.body.questions) {
  shouldNotify = true;
  message = "Assignment questions/marks updated.";
}

if (req.body.title && req.body.title !== assignment.title) {
  shouldNotify = true;
  message = `Assignment renamed to "${req.body.title}"`;
}

    const updated = await Assignment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    );
    if (shouldNotify) {
  await createNotificationHelper({
    title: "Assignment Updated ✏️",
    message,
    notificationType: "assignment",
    createdBy: req.user._id,
    schoolId: assignment.schoolId,
    targets: [
      {
        type: "class",
        classId: assignment.classId,
        sectionId: assignment.sectionId || null
      }
    ]
  });
}

    res.json({
      success: true,
      message: "Updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("updateAssignment:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= DELETE ================= */

export const deleteAssignment = async (req, res) => {
  try {
    const teacherId = req.user?.teacher_id;

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (assignment.teacherId.toString() !== teacherId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await assignment.deleteOne();

    res.json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (err) {
    console.error("deleteAssignment:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= TOGGLE PUBLISH ================= */

export const togglePublishAssignment = async (req, res) => {
  try {
    const teacherId = req.user?.teacher_id;
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (assignment.teacherId.toString() !== teacherId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    assignment.isPublished = !assignment.isPublished;

    // FIX: properly sync status in both directions
    assignment.status = assignment.isPublished ? "active" : "draft";

    await assignment.save();

    res.json({
      success: true,
      message: `Assignment ${assignment.isPublished ? "published" : "unpublished"}`,
      data: assignment,
    });
  } catch (err) {
    console.error("togglePublish:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
