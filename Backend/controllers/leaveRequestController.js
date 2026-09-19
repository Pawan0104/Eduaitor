import LeaveRequest from "../models/leaveRequest.js";
import Student from "../models/student.js";
import Class from "../models/class.js";
import { createNotificationHelper } from "./notificationController.js";

/* ═══════════════════════════════════════════════════
   HELPER — get class teacher IDs for a student
   Used to notify class teacher when leave request created
═══════════════════════════════════════════════════ */
const getClassTeacherIds = async (schoolId, sectionId) => {
  if (!sectionId) return [];

  const classDoc = await Class.findOne({
    schoolId,
    "details.sectionId": sectionId,
  }).select("details");

  if (!classDoc) return [];

  const section = classDoc.details.find(
    (d) => d.sectionId?.toString() === sectionId?.toString()
  );

  return section?.teacherId ? [section.teacherId] : [];
};

/* ═══════════════════════════════════════════════════
   1. CREATE LEAVE REQUEST — parent only
═══════════════════════════════════════════════════ */
export const createLeaveRequest = async (req, res, next) => {
  try {
    const studentId = req.user.student_id;
    const schoolId  = req.user.school_id;

    const { leaveType, reason, fromDate, toDate } = req.body;

    // ── 1. VALIDATE ───────────────────────────────
    if (!leaveType?.trim()) {
      return res.status(400).json({ success: false, message: "Leave type is required" });
    }
    if (!reason?.trim()) {
      return res.status(400).json({ success: false, message: "Reason is required" });
    }
    if (!fromDate) {
      return res.status(400).json({ success: false, message: "From date is required" });
    }
    if (!toDate) {
      return res.status(400).json({ success: false, message: "To date is required" });
    }

    if (new Date(fromDate) > new Date(toDate)) {
      return res.status(400).json({
        success: false,
        message: "From date cannot be after To date",
      });
    }

    // ── 2. FETCH STUDENT ──────────────────────────
    const student = await Student
      .findOne({ _id: studentId, schoolId })
      .select("firstName lastName sectionId classId");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // ── 3. CREATE LEAVE REQUEST ───────────────────
    const leaveRequest = await LeaveRequest.create({
      schoolId,
      studentId,
      requestedBy:      req.user._id || req.user.id,
      requestedByName:  req.user.name || "",
      requestedByRole:  req.user.role || "parent",
      leaveType,
      reason,
      fromDate,
      toDate,
      status: "pending",
    });

    // ── 4. NOTIFY CLASS TEACHER + SCHOOL ADMIN ────
    try {
      const teacherIds = await getClassTeacherIds(schoolId, student.sectionId);

      const targets = [
        {
          type:  "role",
          roles: ["school_admin"],
          schoolId,
        },
        ...teacherIds.map((tid) => ({
          type:      "teacher",
          teacherId: tid,
          schoolId,
        })),
      ];

      await createNotificationHelper({
        title:            "New Leave Request",
        message:          `A leave request has been submitted for ${student.firstName} ${student.lastName}.`,
        notificationType: "general",
        schoolId,
        targets,
      });
    } catch (notifErr) {
      // notification failure should not break leave request creation
      console.error("Notification error:", notifErr);
    }

    return res.status(201).json({
      success: true,
      message: "Leave request submitted successfully",
      data: leaveRequest,
    });

  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════════════
   2. GET MY LEAVE REQUESTS — parent sees own
═══════════════════════════════════════════════════ */
export const getMyLeaveRequests = async (req, res, next) => {
  try {
    const studentId = req.user.student_id;

    const { status } = req.query;

    const filter = { studentId };

    if (status && status !== "all") {
      filter.status = status;
    }

    const requests = await LeaveRequest
      .find(filter)
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: requests,
    });

  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════════════
   3. GET MANAGE LEAVE REQUESTS — teacher / admin / staff
═══════════════════════════════════════════════════ */
export const getManageLeaveRequests = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const role     = req.user.role;

    const { status, classId, sectionId, search } = req.query;

    // ── TEACHER — scope to their class only ───────
    let allowedStudentIds = null;

    if (role === "teacher_admin") {
      const teacherId = req.user.teacher_id;

      const classes = await Class.find({
        schoolId,
        "details.teacherId": teacherId,
      }).select("details");

      if (!classes.length) {
        return res.json({
          success: true,
          data: [],
          message: "You are not assigned as class teacher of any class",
          notClassTeacher: true,
        });
      }

      const sectionIds = classes.flatMap((c) =>
        c.details
          .filter((d) => d.teacherId?.toString() === teacherId?.toString())
          .map((d) => d.sectionId)
          .filter(Boolean)
      );

      const students = await Student
        .find({ schoolId, sectionId: { $in: sectionIds } })
        .select("_id");

      allowedStudentIds = students.map((s) => s._id);

      if (!allowedStudentIds.length) {
        return res.json({
          success: true,
          data: [],
          message: "No students found in your class",
        });
      }
    }

    // ── BUILD FILTER ──────────────────────────────
    const filter = { schoolId };

    if (allowedStudentIds) {
      filter.studentId = { $in: allowedStudentIds };
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (classId && role !== "teacher_admin") {
      const students = await Student
        .find({ schoolId, classId })
        .select("_id");
      filter.studentId = { $in: students.map((s) => s._id) };
    }

    if (sectionId && role !== "teacher_admin") {
      const students = await Student
        .find({ schoolId, sectionId })
        .select("_id");
      filter.studentId = { $in: students.map((s) => s._id) };
    }

    let requests = await LeaveRequest
      .find(filter)
      .populate("studentId", "firstName lastName studentId classId sectionId")
      .sort({ createdAt: -1 });

    if (search?.trim()) {
      const q = search.toLowerCase();
      requests = requests.filter((r) => {
        const name = `${r.studentId?.firstName} ${r.studentId?.lastName}`.toLowerCase();
        return name.includes(q);
      });
    }

    return res.json({
      success: true,
      data: requests,
    });

  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════════════
   4. ACTION — approve or reject
   teacher_admin | school_admin | staff_admin
═══════════════════════════════════════════════════ */
export const actionLeaveRequest = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { action, note } = req.body;

    // ── 1. VALIDATE ACTION ────────────────────────
    if (!["approved", "rejected"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'approved' or 'rejected'",
      });
    }

    if (action === "rejected" && !note?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a reason for rejection",
      });
    }

    // ── 2. FIND LEAVE REQUEST ─────────────────────
    const leaveRequest = await LeaveRequest.findOne({
      _id:      req.params.id,
      schoolId,
    }).populate("studentId", "firstName lastName sectionId");

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    // ── 3. ONLY PENDING CAN BE ACTIONED ──────────
    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Leave request is already ${leaveRequest.status}`,
      });
    }

    // ── 4. TEACHER SCOPE CHECK ────────────────────
    if (req.user.role === "teacher_admin") {
      const teacherId = req.user.teacher_id;
      const student   = leaveRequest.studentId;

      const classes = await Class.find({
        schoolId,
        "details.teacherId": teacherId,
        "details.sectionId": student?.sectionId,
      });

      if (!classes.length) {
        return res.status(403).json({
          success: false,
          message: "You are not the class teacher of this student",
        });
      }
    }

    // ── 5. UPDATE LEAVE REQUEST ───────────────────
    leaveRequest.status       = action;
    leaveRequest.actionBy     = req.user._id || req.user.id;
    leaveRequest.actionByName = req.user.name;
    leaveRequest.actionByRole = req.user.role;
    leaveRequest.actionNote   = note || null;
    leaveRequest.actionAt     = new Date();

    await leaveRequest.save();

    // ── 6. NOTIFY PARENT ──────────────────────────
    try {
      const studentName = `${leaveRequest.studentId?.firstName} ${leaveRequest.studentId?.lastName}`;
      const actionWord  = action === "approved" ? "Approved" : "Rejected";

      await createNotificationHelper({
        title:            `Leave Request ${actionWord}`,
        message:          `Leave request for ${studentName} has been ${action}${action === "rejected" ? `. Reason: ${note}` : "."}`,
        notificationType: "general",
        schoolId,
        targets: [
          {
            type:      "student",
            studentId: leaveRequest.studentId._id,
            schoolId,
          },
        ],
      });
    } catch (notifErr) {
      console.error("Notification error:", notifErr);
    }

    return res.json({
      success: true,
      message: `Leave request ${action} successfully`,
      data: leaveRequest,
    });

  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════════════
   5. CANCEL — parent cancels pending leave request
═══════════════════════════════════════════════════ */
export const cancelLeaveRequest = async (req, res, next) => {
  try {
    const studentId = req.user.student_id;
    const schoolId  = req.user.school_id;

    // ── 1. FIND LEAVE REQUEST ─────────────────────
    const leaveRequest = await LeaveRequest.findOne({
      _id:      req.params.id,
      studentId,
      schoolId,
    }).populate("studentId", "firstName lastName sectionId");

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    // ── 2. ONLY PENDING CAN BE CANCELLED ─────────
    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a leave request that is already ${leaveRequest.status}`,
      });
    }

    // ── 3. CANCEL ─────────────────────────────────
    leaveRequest.status      = "cancelled";
    leaveRequest.cancelledAt = new Date();
    await leaveRequest.save();

    // ── 4. NOTIFY CLASS TEACHER + SCHOOL ADMIN ────
    try {
      const student     = leaveRequest.studentId;
      const studentName = `${student?.firstName} ${student?.lastName}`;
      const teacherIds  = await getClassTeacherIds(schoolId, student?.sectionId);

      const targets = [
        {
          type:  "role",
          roles: ["school_admin"],
          schoolId,
        },
        ...teacherIds.map((tid) => ({
          type:      "teacher",
          teacherId: tid,
          schoolId,
        })),
      ];

      await createNotificationHelper({
        title:            "Leave Request Cancelled",
        message:          `Leave request for ${studentName} has been cancelled by parent.`,
        notificationType: "general",
        schoolId,
        targets,
      });
    } catch (notifErr) {
      console.error("Notification error:", notifErr);
    }

    return res.json({
      success: true,
      message: "Leave request cancelled successfully",
      data: leaveRequest,
    });

  } catch (error) {
    next(error);
  }
};