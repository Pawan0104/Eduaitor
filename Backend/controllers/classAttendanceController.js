import mongoose from "mongoose";
import ClassAttendance from "../models/classAttendance.js";
import Student from "../models/student.js";
import Class from "../models/class.js";
import { createNotificationHelper } from "./notificationController.js";

/* ─── Shared helper: derive month / year / academicYear ─────────────────── */
function getDateMeta(dateStr) {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const year  = d.getFullYear();
  const academicYear =
    month >= 4
      ? `${year}-${String(year + 1).slice(-2)}`
      : `${year - 1}-${String(year).slice(-2)}`;
  return { month, year, academicYear };
}

/* ─── Shared helper: build day-boundary dates ───────────────────────────── */
function dayBounds(dateStr) {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);
  return { dayStart: start, dayEnd: end };
}

/* ─── Auth helper: verify the requesting teacher is the class teacher
       for the given classId + sectionId.
       Returns { ok: true } or { ok: false, message } ─────────────────────── */
async function verifyClassTeacher(classId, sectionId, teacherId) {
  const cls = await Class.findById(classId).select("details").lean();
  if (!cls) return { ok: false, message: "Class not found" };

  const section = cls.details.find(
    (d) => d.sectionId?.toString() === sectionId.toString()
  );
  if (!section) return { ok: false, message: "Section not found in class" };

  if (!section.teacherId)
    return { ok: false, message: "No class teacher assigned to this section" };

  if (section.teacherId.toString() !== teacherId.toString())
    return {
      ok: false,
      message: "Only the assigned class teacher can mark attendance for this section",
    };

  return { ok: true };
}

/* ══════════════════════════════════════════════════════════════════════════
   GET  /class-attendance/meta
   Returns:
     - teacher_admin: their assigned class+section where they are class teacher
     - school_admin : all classes with sections
   ══════════════════════════════════════════════════════════════════════════ */
export const getClassMeta = async (req, res) => {
  try {
    const { role, school_id: schoolId, teacher_id: teacherId } = req.user;

    if (role === "teacher_admin") {
      // Find classes where this teacher is the class teacher of at least one section
      const classes = await Class.find({ schoolId })
        .populate({ path: "details.sectionId", model: "Section", select: "name" })
        .lean();

      // Filter to only sections where teacherId matches
      const filtered = classes
        .map((cls) => ({
          ...cls,
          details: cls.details.filter(
            (d) => d.teacherId?.toString() === teacherId.toString()
          ),
        }))
        .filter((cls) => cls.details.length > 0);

      if (!filtered.length) {
        return res.status(200).json({
          success: true,
          isClassTeacher: false,
          message: "You are not assigned as a class teacher for any section",
          classes: [],
        });
      }

      return res.status(200).json({
        success: true,
        isClassTeacher: true,
        classes: filtered,
      });
    }

    if (role === "school_admin") {
      const classes = await Class.find({ schoolId })
        .populate({ path: "details.sectionId", model: "Section", select: "name" })
        .populate({ path: "details.teacherId", model: "Teacher", select: "firstName lastName" })
        .lean();

      return res.status(200).json({ success: true, classes });
    }

    return res.status(403).json({ success: false, message: "Unauthorized role" });
  } catch (err) {
    console.error("getClassMeta error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   GET  /class-attendance/existing?classId=&sectionId=&date=
   Check if attendance already saved for this class+section+date.
   Returns records so the frontend can enter edit mode.
   ══════════════════════════════════════════════════════════════════════════ */
export const getExistingClassAttendance = async (req, res) => {
  try {
    const { classId, sectionId, date } = req.query;
    const schoolId = req.user.school_id;

    // Validation
    if (!classId || !sectionId || !date) {
      return res.status(400).json({
        success: false,
        message: "classId, sectionId, and date are required",
      });
    }
    if (
      !mongoose.Types.ObjectId.isValid(classId) ||
      !mongoose.Types.ObjectId.isValid(sectionId)
    ) {
      return res.status(400).json({ success: false, message: "Invalid classId or sectionId" });
    }

    const { dayStart, dayEnd } = dayBounds(date);

    const records = await ClassAttendance.find({
      schoolId,
      classId,
      sectionId,
      date: { $gte: dayStart, $lte: dayEnd },
    }).select("studentId status _id");

    if (!records.length) {
      return res.status(404).json({
        success: false,
        message: "No class attendance found for this date",
      });
    }

    const formatted = records.map((r) => ({
      _id: r._id,
      studentId: r.studentId.toString(),
      status: r.status,
    }));

    return res.status(200).json({ success: true, records: formatted });
  } catch (err) {
    console.error("getExistingClassAttendance error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   POST  /class-attendance/save
   Class teacher marks attendance for all students in their section.
   Body: { classId, sectionId, date, records: [{ studentId, status }] }
   ══════════════════════════════════════════════════════════════════════════ */
export const saveClassAttendance = async (req, res) => {
  try {
    const { classId, sectionId, date, records } = req.body;
    const { school_id: schoolId, teacher_id: teacherId, role } = req.user;

    // ── Validation ───────────────────────────────────────────────────────
    if (!classId || !sectionId || !date || !Array.isArray(records) || !records.length) {
      return res.status(400).json({ success: false, message: "classId, sectionId, date, and records[] are required" });
    }
    if (!mongoose.Types.ObjectId.isValid(classId) || !mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({ success: false, message: "Invalid classId or sectionId" });
    }

    // ── Authorization: only class teacher (or school_admin) ──────────────
    if (role === "teacher_admin") {
      const auth = await verifyClassTeacher(classId, sectionId, teacherId);
      if (!auth.ok) return res.status(403).json({ success: false, message: auth.message });
    } else if (role !== "school_admin") {
      return res.status(403).json({ success: false, message: "Unauthorized role" });
    }

    // ── Duplicate guard ──────────────────────────────────────────────────
    const { dayStart, dayEnd } = dayBounds(date);
    const alreadyExists = await ClassAttendance.exists({
      schoolId,
      classId,
      sectionId,
      date: { $gte: dayStart, $lte: dayEnd },
    });
    if (alreadyExists) {
      return res.status(409).json({
        success: false,
        message: "Class attendance already recorded for this date. Use the update endpoint.",
      });
    }

    const { month, year, academicYear } = getDateMeta(date);
    const parsedDate = new Date(date);

    // ── Validate each record's studentId ─────────────────────────────────
    const invalidIds = records.filter((r) => !mongoose.Types.ObjectId.isValid(r.studentId));
    if (invalidIds.length) {
      return res.status(400).json({ success: false, message: "One or more studentIds are invalid" });
    }

    const docs = records.map((r) => ({
      studentId: r.studentId,
      classId,
      sectionId,
      schoolId,
      markedBy: teacherId || req.user._id,
      date: parsedDate,
      month,
      year,
      academicYear,
      status: ["Present", "Absent", "Late"].includes(r.status) ? r.status : "Present",
    }));

    const saved = await ClassAttendance.insertMany(docs, { ordered: false });

    // ── Grouped Notifications (Absent, Late, Present) ─────────────────────
    const notificationConfig = {
      Absent: {
        title: "Absent Alert 🚫",
        message: "You were marked absent today in class attendance. Please check with your class teacher."
      },
      Late: {
        title: "Late Arrival Notice ⏰",
        message: "You were marked late for class today. Please ensure timely arrival."
      },
      Present: {
        title: "Attendance Marked ✅",
        message: "You were marked present for class today."
      }
    };

    for (const status of ["Absent", "Late", "Present"]) {
      const studentsWithStatus = saved.filter((s) => s.status === status);
      
      if (studentsWithStatus.length > 0) {
        const targets = studentsWithStatus.map((s) => ({
          type: "student",
          studentId: s.studentId,
          classId,
          sectionId,
        }));

        await createNotificationHelper({
          title: notificationConfig[status].title,
          message: notificationConfig[status].message,
          notificationType: "attendance",
          createdBy: req.user._id,
          schoolId,
          targets,
        });
      }
    }

    const savedRecords = saved.map((s) => ({
      _id: s._id,
      studentId: s.studentId.toString(),
      status: s.status,
    }));

    return res.status(201).json({
      success: true,
      message: "Class attendance saved successfully",
      savedRecords,
    });
  } catch (err) {
    console.error("saveClassAttendance error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   PUT  /class-attendance/update
   Update existing class attendance records.
   Body: { classId, sectionId, date, records: [{ studentId, status, attendanceId? }] }
   ══════════════════════════════════════════════════════════════════════════ */
export const updateClassAttendance = async (req, res) => {
  try {
    const { classId, sectionId, date, records } = req.body;
    const { school_id: schoolId, teacher_id: teacherId, role } = req.user;

    // ── Validation ───────────────────────────────────────────────────────
    if (!classId || !sectionId || !date || !Array.isArray(records) || !records.length) {
      return res.status(400).json({ success: false, message: "classId, sectionId, date, and records[] are required" });
    }

    // ── Authorization ────────────────────────────────────────────────────
    if (role === "teacher_admin") {
      const auth = await verifyClassTeacher(classId, sectionId, teacherId);
      if (!auth.ok) return res.status(403).json({ success: false, message: auth.message });
    } else if (role !== "school_admin") {
      return res.status(403).json({ success: false, message: "Unauthorized role" });
    }

    const { dayStart, dayEnd } = dayBounds(date);
    const { month, year, academicYear } = getDateMeta(date);
    const parsedDate = new Date(date);

    const bulkOps = records.map((r) => {
      const validStatus = ["Present", "Absent", "Late"].includes(r.status) ? r.status : "Present";

      if (r.attendanceId && mongoose.Types.ObjectId.isValid(r.attendanceId)) {
        return {
          updateOne: {
            filter: { _id: r.attendanceId },
            update: { $set: { status: validStatus } },
          },
        };
      }
      // Upsert by natural key (handles newly enrolled students)
      return {
        updateOne: {
          filter: {
            studentId: r.studentId,
            classId,
            sectionId,
            schoolId,
            date: { $gte: dayStart, $lte: dayEnd },
          },
          update: {
            $set: { status: validStatus },
            $setOnInsert: {
              date: parsedDate,
              month,
              year,
              academicYear,
              markedBy: teacherId || req.user._id,
            },
          },
          upsert: true,
        },
      };
    });

    const result = await ClassAttendance.bulkWrite(bulkOps);

    // ── Grouped Notifications for Updates ─────────────────────────────────
    // We categorize incoming status payloads so updated notifications are triggered
    const notificationConfig = {
      Absent: {
        title: "Attendance Updated: Absent 🚫",
        message: "Your attendance status has been updated to Absent. Please check with your class teacher if this is an error."
      },
      Late: {
        title: "Attendance Updated: Late ⏰",
        message: "Your attendance status has been updated to Late."
      },
      Present: {
        title: "Attendance Updated: Present ✅",
        message: "Your attendance status has been updated to Present."
      }
    };

    for (const status of ["Absent", "Late", "Present"]) {
      const studentsWithStatus = records.filter((r) => r.status === status);

      if (studentsWithStatus.length > 0) {
        const targets = studentsWithStatus.map((s) => ({
          type: "student",
          studentId: s.studentId,
          classId,
          sectionId,
        }));

        await createNotificationHelper({
          title: notificationConfig[status].title,
          message: notificationConfig[status].message,
          notificationType: "attendance",
          createdBy: req.user._id,
          schoolId,
          targets,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Class attendance updated successfully",
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
    });
  } catch (err) {
    console.error("updateClassAttendance error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   GET  /class-attendance/report
   Query: classId, sectionId, date | (month + year)
   Teacher: own class sections only.
   Principal: any class.
   Also supports student name search via ?search=
   ══════════════════════════════════════════════════════════════════════════ */
export const getClassAttendanceReport = async (req, res) => {
  try {
    const { classId, sectionId, date, month, year, search } = req.query;
    const { school_id: schoolId, teacher_id: teacherId, role } = req.user;

    // ── Validation ───────────────────────────────────────────────────────
    if (!classId || !sectionId) {
      return res.status(400).json({ success: false, message: "classId and sectionId are required" });
    }
    if (!date && (!month || !year)) {
      return res.status(400).json({ success: false, message: "Provide date OR month + year" });
    }

    // ── Authorization: teacher can only view their own section ────────────
    if (role === "teacher_admin") {
      const auth = await verifyClassTeacher(classId, sectionId, teacherId);
      if (!auth.ok) return res.status(403).json({ success: false, message: auth.message });
    } else if (role !== "school_admin") {
      return res.status(403).json({ success: false, message: "Unauthorized role" });
    }

    const baseMatch = {
      schoolId: new mongoose.Types.ObjectId(schoolId),
      classId:  new mongoose.Types.ObjectId(classId),
      sectionId: new mongoose.Types.ObjectId(sectionId),
    };

    /* ── DAILY ── */
    if (date) {
      const { dayStart, dayEnd } = dayBounds(date);
      let data = await ClassAttendance.find({
        ...baseMatch,
        date: { $gte: dayStart, $lte: dayEnd },
      })
        .populate("studentId", "firstName lastName rollNo")
        .lean();

      // Name search filter (post-populate)
      if (search?.trim()) {
        const q = search.trim().toLowerCase();
        data = data.filter((r) => {
          const name = `${r.studentId?.firstName ?? ""} ${r.studentId?.lastName ?? ""}`.toLowerCase();
          return name.includes(q) || String(r.studentId?.rollNo ?? "").includes(q);
        });
      }

      return res.status(200).json({ success: true, type: "daily", data });
    }

    /* ── MONTHLY ── */
    const pipeline = [
      {
        $match: {
          ...baseMatch,
          month: Number(month),
          year: Number(year),
        },
      },
      {
        $group: {
          _id: "$studentId",
          present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          absent:  { $sum: { $cond: [{ $eq: ["$status", "Absent"] },  1, 0] } },
          late:    { $sum: { $cond: [{ $eq: ["$status", "Late"] },    1, 0] } },
          total:   { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      {
        $project: {
          name:        { $concat: ["$student.firstName", " ", { $ifNull: ["$student.lastName", ""] }] },
          rollNumber:  "$student.rollNo",
          present:     1,
          absent:      1,
          late:        1,
          total:       1,
          percentage:  {
            $round: [
              { $multiply: [{ $divide: ["$present", "$total"] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { rollNumber: 1 } },
    ];

    let summary = await ClassAttendance.aggregate(pipeline);

    // Name search on monthly
    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      summary = summary.filter((r) =>
        (r.name ?? "").toLowerCase().includes(q) ||
        String(r.rollNumber ?? "").includes(q)
      );
    }

    return res.status(200).json({ success: true, type: "monthly", data: summary });
  } catch (err) {
    console.error("getClassAttendanceReport error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   GET  /class-attendance/student/:studentId
   Full attendance detail for one student.
   Query: month, year  (required)
   Accessible by: teacher (own class) + principal
   ══════════════════════════════════════════════════════════════════════════ */
export const getStudentClassAttendanceDetail = async (req, res) => {
  console.log("api hit")
  try {
    const { studentId } = req.params;
    const { month, year } = req.query;
    const { school_id: schoolId, teacher_id: teacherId, role } = req.user;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }
    if (!month || !year) {
      return res.status(400).json({ success: false, message: "month and year are required" });
    }

    // Fetch the student to get classId + sectionId for auth check
    const student = await Student.findById(studentId)
      .select("firstName lastName rollNo classId sectionId")
      .populate("classId", "name")
      .populate("sectionId", "name")
      .lean();

    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    // Teacher can only view students from their own class teacher section
    if (role === "teacher_admin") {
      const auth = await verifyClassTeacher(
        student.classId._id,
        student.sectionId._id,
        teacherId
      );
      if (!auth.ok) return res.status(403).json({ success: false, message: auth.message });
    } else if (role !== "school_admin") {
      return res.status(403).json({ success: false, message: "Unauthorized role" });
    }

    const records = await ClassAttendance.find({
      studentId,
      month: Number(month),
      year: Number(year),
      schoolId,
    })
      .sort({ date: 1 })
      .lean();

    // Summary
    const present    = records.filter((r) => r.status === "Present").length;
    const absent     = records.filter((r) => r.status === "Absent").length;
    const late       = records.filter((r) => r.status === "Late").length;
    const total      = records.length;
    const percentage = total ? Math.round((present / total) * 100) : 0;

    return res.status(200).json({
      success: true,
      student: {
        _id:         student._id,
        name:        `${student.firstName} ${student.lastName ?? ""}`.trim(),
        rollNumber:  student.rollNo,
        className:   student.classId?.name   ?? "—",
        sectionName: student.sectionId?.name ?? "—",
      },
      summary: { present, absent, late, total, percentage },
      records,
    });
  } catch (err) {
    console.error("getStudentClassAttendanceDetail error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   GET  /class-attendance/parent/report
   Student / parent sees their own class attendance.
   Query: studentId, month, year
   ══════════════════════════════════════════════════════════════════════════ */
export const getStudentClassAttendanceForParent = async (req, res) => {
  try {
    const { studentId, month, year } = req.query;
    const schoolId = req.user.school_id;

    if (!studentId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "studentId, month, and year are required",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }

    const records = await ClassAttendance.find({
      studentId,
      month: Number(month),
      year:  Number(year),
      schoolId,
    })
      .sort({ date: 1 })
      .lean();

    const present    = records.filter((r) => r.status === "Present").length;
    const absent     = records.filter((r) => r.status === "Absent").length;
    const late       = records.filter((r) => r.status === "Late").length;
    const total      = records.length;
    const percentage = total ? Math.round(((present + late) / total) * 100) : 0;

    return res.status(200).json({
      success: true,
      summary: { present, absent, late, total, percentage },
      records,
    });
  } catch (err) {
    console.error("getStudentClassAttendanceForParent error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   GET  /class-attendance/today-snapshot
   Returns today's student list for the teacher's own class+section,
   with attendance status if already marked, or null if not yet.
   Teacher only.
   ══════════════════════════════════════════════════════════════════════════ */
export const getTodaySnapshot = async (req, res) => {
  try {
    const { school_id: schoolId, teacher_id: teacherId, role } = req.user;

    if (role !== "teacher_admin") {
      return res.status(403).json({ success: false, message: "Teacher access only" });
    }

    // Find teacher's class teacher section
    const classes = await Class.find({ schoolId })
      .populate({ path: "details.sectionId", model: "Section", select: "name" })
      .lean();

    let assignedClassId   = null;
    let assignedSectionId = null;

    for (const cls of classes) {
      const section = cls.details.find(
        (d) => d.teacherId?.toString() === teacherId.toString()
      );
      if (section) {
        assignedClassId   = cls._id;
        assignedSectionId = section.sectionId?._id;
        break;
      }
    }

    if (!assignedClassId || !assignedSectionId) {
      return res.status(200).json({
        success: true,
        isClassTeacher: false,
        message: "You are not assigned as a class teacher",
        students: [],
        isMarked: false,
      });
    }

    // Get students
    const students = await Student.find({
      classId: assignedClassId,
      sectionId: assignedSectionId,
      schoolId,
    })
      .select("firstName lastName rollNo")
      .sort({ rollNo: 1 })
      .lean();

    // Get today's attendance if marked
    const today = new Date();
    const { dayStart, dayEnd } = dayBounds(today.toISOString().split("T")[0]);

    const todayRecords = await ClassAttendance.find({
      schoolId,
      classId: assignedClassId,
      sectionId: assignedSectionId,
      date: { $gte: dayStart, $lte: dayEnd },
    }).lean();

    const statusMap = {};
    todayRecords.forEach((r) => {
      statusMap[r.studentId.toString()] = r.status;
    });

    const enriched = students.map((s) => ({
      ...s,
      todayStatus: statusMap[s._id.toString()] ?? null,
    }));

    return res.status(200).json({
      success: true,
      isClassTeacher: true,
      isMarked: todayRecords.length > 0,
      classId:   assignedClassId,
      sectionId: assignedSectionId,
      students:  enriched,
    });
  } catch (err) {
    console.error("getTodaySnapshot error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};