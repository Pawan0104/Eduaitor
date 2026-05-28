import Notice from "../models/notice.js";
import Student from "../models/student.js";
import Class from "../models/class.js";
import { createNotificationHelper } from "./notificationController.js";

const buildNoticeTargets = async (audience, assignedClass, schoolId) => {
  switch (audience) {
    case 'All':
      return [{ type: 'all' }];

    case 'Class': {
      if (!assignedClass) return [{ type: 'all' }];
      const classDoc = await Class.findOne({ name: assignedClass, schoolId })
        .select('_id').lean();
      return classDoc
        ? [{ type: 'class', classId: classDoc._id }]
        : [{ type: 'all' }];
    }

    case 'Staff':
      // teacher_admin = teachers in your system
      return [{ type: 'role', roles: ['teacher_admin'] }];

    case 'Parents':
      // Parents aren't a separate role in your system yet
      // Closest match = student_admin (who manage students)
      // ⚠️ Add a 'parent' role later when you build parent login
      return [{ type: 'role', roles: ['student_admin'] }];

    default:
      return [{ type: 'all' }];
  }
};

export const getAllNotices = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const role = req.user?.role;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID required",
      });
    }

    let query = { schoolId, isActive: true };

    // 🔹 STUDENT / PARENT
    if (role === "student_admin" || role === "parent_admin") {
      let className = null;

      const studentId = req.user?.student_id;

      if (studentId) {
        const student = await Student.findById(studentId).populate(
          "classId",
          "name",
        );

        className = student?.classId?.name || null;
      }

      query.$or = [
        { audience: "All" },
        { audience: "Parents" },
        ...(className ? [{ audience: "Class", assignedClass: className }] : []),
      ];
    }

    // 🔹 TEACHER
    else if (role === "teacher_admin") {
      query.$or = [{ audience: "All" }, { audience: "Staff" }];
    }

    // 🔹 ADMIN → no extra filter (sees all)

    const notices = await Notice.find(query).sort({ createdAt: -1 });

    // 🔹 Stats
    const total = notices.length;
    const active = notices.filter((n) => n.isActive).length;
    const highPriority = notices.filter((n) => n.priority === "High").length;
    const audiences = new Set(notices.map((n) => n.audience)).size;

    res.status(200).json({
      success: true,
      stats: { total, active, highPriority, audiences },
      notices,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getNoticeById = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice)
      return res
        .status(404)
        .json({ success: false, message: "Notice not found" });
    res.status(200).json({ success: true, notice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createNotice = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    if (req.body.audience !== "Class") req.body.assignedClass = "";
    const notice = await Notice.create({ ...req.body, schoolId });


    const targets = await buildNoticeTargets(notice.audience, notice?.assignedClass, schoolId);

    await createNotificationHelper({
      title: `Notice: ${notice.title}`,
      message: notice.content,
      notificationType: "general",
      targets,
      schoolId,
      createdBy: req.user._id,
    });
    res
      .status(201)
      .json({ success: true, message: "Notice created successfully", notice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateNotice = async (req, res) => {
  const schoolId = req.user?._id;
  try {
    if (req.body.audience !== "Class") req.body.assignedClass = "";
    const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!notice)
      return res
        .status(404)
        .json({ success: false, message: "Notice not found" });
  const targets = await buildNoticeTargets(notice.audience, notice.assignedClass, schoolId);

    await createNotificationHelper({
      title: `Notice Updated: ${notice.title}`,
      message: notice.content,
      notificationType: "general",
      targets,
      schoolId,
      createdBy: req.user.school_id,
    });

    res
      .status(200)
      .json({ success: true, message: "Notice updated successfully", notice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice)
      return res
        .status(404)
        .json({ success: false, message: "Notice not found" });
    res
      .status(200)
      .json({ success: true, message: "Notice deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllAdminNotices = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const schoolId = req.query.schoolId;
    const notices = await Notice.find({ schoolId }).sort({ createdAt: -1 });

    const total = notices.length;
    const active = notices.filter((n) => n.isActive).length;
    const highPriority = notices.filter((n) => n.priority === "High").length;
    const audiences = [...new Set(notices.map((n) => n.audience))].length;

    res.status(200).json({
      success: true,
      stats: { total, active, highPriority, audiences },
      notices,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
