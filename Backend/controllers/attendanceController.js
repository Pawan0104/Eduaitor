import mongoose from "mongoose";
import Attendance from "../models/attendance.js";
import Student from "../models/student.js";
import Teacher from "../models/teacher.js";
import Class from "../models/class.js";
import Subject from "../models/subject.js";
import { createNotificationHelper } from "./notificationController.js";

/* ─── Helper: derive month/year/academicYear from a date string ── */
function getDateMeta(dateStr) {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1; // 1–12
  const year = d.getFullYear();
  // Academic year: if month >= 4 (April), it's "YYYY-(YY+1)", else "(YYYY-1)-YY"
  const academicYear =
    month >= 4
      ? `${year}-${String(year + 1).slice(-2)}`
      : `${year - 1}-${String(year).slice(-2)}`;
  return { month, year, academicYear };
}

/* ══════════════════════════════════════════════════════════════
   GET  /attendance/meta
   Returns teacher's assigned classes (with sections) + subjects
   ══════════════════════════════════════════════════════════════ */
export const getMetaData = async (req, res) => {
  if(req.user.role =="teacher_admin"){
  try {
    const teacherId = req.user.teacher_id;
    const teacher = await Teacher.findById(teacherId)
      .populate({
        path: 'assignedClasses',
        select: 'name details',
        populate: { path: 'details.sectionId', model: 'Section', select: 'name' },
      })
      .populate('subjects', 'name');

    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    res.status(200).json({ success: true, teacher });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
  }
} 
else if (req.user.role == "school_admin") {
  try {
    const schoolId = req.user.school_id;

    // ✅ Added populate so sections come through (same as teacher branch)
    const classes = await Class.find({ schoolId }).populate({
      path: "details.sectionId",
      model: "Section",
      select: "name",
    });

    const subjects = await Subject.find({ schoolId });

    res.status(200).json({ success: true, classes, subjects });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
}
else{
  res.status(403).json({
    success: false,
    message: "Unauthorized role",
  });

}
};

/* ══════════════════════════════════════════════════════════════
   GET  /attendance/students/filter?classId=&sectionId=
   Returns students belonging to the given class + section
   ══════════════════════════════════════════════════════════════ */
export const getStudentsByClassAndSection = async (req, res) => {
  const { classId, sectionId } = req.query;
  const schoolId = req.user.school_id;

  try {
    if (
      !mongoose.Types.ObjectId.isValid(classId) ||
      !mongoose.Types.ObjectId.isValid(sectionId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid classId or sectionId" });
    }
    const students = await Student.find({ classId, sectionId, schoolId })
      .select("firstName lastName rollNo")
      .sort({ rollNo: 1 });

    res.status(200).json({ success: true, students });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error",
        error: err.message,
      });
  }
};

/* ══════════════════════════════════════════════════════════════
   GET  /attendance/existing?classId=&sectionId=&subjectId=&date=
   Returns existing attendance records for a given day.
   Frontend uses this to switch into "Edit Mode".
   ══════════════════════════════════════════════════════════════ */
export const getExistingAttendance = async (req, res) => {
  const { classId, sectionId, subjectId, date } = req.query;
  const schoolId = req.user.school_id;

  try {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const records = await Attendance.find({
      schoolId,
      classId,
      sectionId,
      subjectId,
      date: { $gte: dayStart, $lte: dayEnd },
    }).select("studentId status");

    if (!records.length) {
      return res
        .status(404)
        .json({
          success: false,
          message: "No attendance record found for this date",
        });
    }

    // Return { studentId (string), status, _id } so frontend can map them
    const formatted = records.map((r) => ({
      _id: r._id,
      studentId: r.studentId.toString(),
      status: r.status,
    }));

    res.status(200).json({ success: true, records: formatted });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error",
        error: err.message,
      });
  }
};

/* ══════════════════════════════════════════════════════════════
   POST  /attendance/save
   Creates new attendance records for all students in one shot.

   Body:
   {
     classId, sectionId, subjectId, date,
     records: [{ studentId, status }]
   }

   Returns the saved records so the frontend can store their _ids
   for future PUT (edit) calls.
   ══════════════════════════════════════════════════════════════ */
export const saveAttendance = async (req, res) => {
  const { classId, sectionId, subjectId, date, records } = req.body;
  const schoolId = req.user.school_id;

  if (
    !classId ||
    !sectionId ||
    !subjectId ||
    !date ||
    !Array.isArray(records) ||
    !records.length
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    const { month, year, academicYear } = getDateMeta(date);
    const parsedDate = new Date(date);

    // Guard: prevent duplicate saves for the same day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const alreadyExists = await Attendance.exists({
      schoolId,
      classId,
      sectionId,
      subjectId,
      date: { $gte: dayStart, $lte: dayEnd },
    });

    if (alreadyExists) {
      return res.status(409).json({
        success: false,
        message:
          "Attendance already recorded for this date. Use the update endpoint.",
      });
    }

    // Bulk insert
    const docs = records.map((r) => ({
      studentId: r.studentId,
      classId,
      sectionId,
      subjectId,
      schoolId,
      date: parsedDate,
      month,
      year,
      academicYear,
      status: r.status ?? "Present",
    }));

    const saved = await Attendance.insertMany(docs, { ordered: false });
    
    // notification logic for all absent student   
    const absentStudents = saved.filter(s => s.status === "Absent");
    const targets = absentStudents.map(s => ({
  type: "student",
  studentId: s.studentId,
  classId,
  sectionId
}));
  if (absentStudents.length > 0) {
  await createNotificationHelper({
    title: "Absent Alert 🚫",
    message: "You were marked absent today. Please check with your school if this is incorrect.",
    notificationType: "attendance",
    createdBy: req.user._id,
    schoolId,
    targets
  });
}

    // Return saved docs with studentId + _id so frontend stores them
    const savedRecords = saved.map((s) => ({
      _id: s._id,
      studentId: s.studentId.toString(),
      status: s.status,
    }));

    res
      .status(201)
      .json({ success: true, message: "Attendance saved", savedRecords });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error",
        error: err.message,
      });
  }
};

/* ══════════════════════════════════════════════════════════════
   PUT  /attendance/update
   Updates existing attendance records (edit mode).

   Body:
   {
     classId, sectionId, subjectId, date,
     records: [{ studentId, status, attendanceId? }]
   }

   Strategy:
   - If attendanceId is provided → update that specific doc
   - If not (new student added after initial save) → upsert by studentId+date+subjectId
   ══════════════════════════════════════════════════════════════ */
export const updateAttendance = async (req, res) => {
  const { classId, sectionId, subjectId, date, records } = req.body;
  const schoolId = req.user.school_id;

  if (
    !classId ||
    !sectionId ||
    !subjectId ||
    !date ||
    !Array.isArray(records) ||
    !records.length
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    const { month, year, academicYear } = getDateMeta(date);
    const parsedDate = new Date(date);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const bulkOps = records.map((r) => {
      if (r.attendanceId && mongoose.Types.ObjectId.isValid(r.attendanceId)) {
        // Update by doc _id (fast path)
        return {
          updateOne: {
            filter: { _id: r.attendanceId },
            update: { $set: { status: r.status } },
          },
        };
      }
      // Upsert by natural key (handles newly added students)
      return {
        updateOne: {
          filter: {
            studentId: r.studentId,
            classId,
            sectionId,
            subjectId,
            schoolId,
            date: { $gte: dayStart, $lte: dayEnd },
          },
          update: {
            $set: { status: r.status },
            $setOnInsert: { date: parsedDate, month, year, academicYear },
          },
          upsert: true,
        },
      };
    });

    const result = await Attendance.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      message: "Attendance updated",
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
    });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error",
        error: err.message,
      });
  }
};

// teacher attendance report
// controllers/attendance.controller.js
// adjust path as needed

/* ═══════════════════════════════════════════════════════════════
   GET /attendance/my-report
   Query : subjectId  +  ( date  |  month + year )
   Auth  : student role  ─  req.user._id is the student's userId

   The student's classId + sectionId are pulled from their
   Student document, so the frontend doesn't need to send them.
═══════════════════════════════════════════════════════════════ */
export const getStudentAttendanceReport = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { classId, sectionId, subjectId, date, month, year } = req.query;

    if (!classId || !sectionId || !subjectId) {
      return res.status(400).json({
        success: false,
        message: "Class, Section and Subject are required",
      });
    }

    if (!date && (!month || !year)) {
      return res.status(400).json({
        success: false,
        message: "Provide date OR month + year",
      });
    }

    // Filter attendance by the logged-in student's own ID
    const baseMatch = {
      schoolId: new mongoose.Types.ObjectId(schoolId),
      classId: new mongoose.Types.ObjectId(classId),
      sectionId: new mongoose.Types.ObjectId(sectionId),
      subjectId: new mongoose.Types.ObjectId(subjectId),
    };

    /* ───── DAILY ───── */
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const data = await Attendance.find({
        ...baseMatch,
        date: { $gte: start, $lte: end },
      })
        .populate("studentId", "firstName lastName rollNo")
        .lean();

      console.log("DAILY RESULT:", data.length);

      return res.json({
        success: true,
        type: "daily",
        data,
      });
    }

    /* ───── MONTHLY ───── */
    const summary = await Attendance.aggregate([
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
          absent: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "Late"] }, 1, 0] } },
          total: { $sum: 1 },
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
          name: "$student.firstName",
          rollNumber: "$student.rollNo",
          present: 1,
          absent: 1,
          late: 1,
          total: 1,
          percentage: {
            $round: [
              { $multiply: [{ $divide: ["$present", "$total"] }, 100] },
              0,
            ],
          },
        },
      },
    ]);

    console.log("MONTHLY RESULT:", summary.length);

    return res.json({
      success: true,
      type: "monthly",
      data: summary,
    });
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


/* ═══════════════════════════════════════════════════════════════
parent attendace report 
==================================================================*/
export const getParentAttendanceReport = async (req, res) => {
   try {
      // Example: parent doc has `children: [ObjectId]`
      const parentDoc = req.user; // already populated by auth middleware
 
      const studentId = parentDoc.children?.[0]; // single child; loop if multi-child
 
      const student = await Student.findById(req.user.student_id)
        .populate("classId",   "name")
        .populate("sectionId", "name")
        .lean();
 
      if (!student) return res.status(404).json({ message: "Student not found" });
 
      // Gather distinct subjects from this student's class assignments
      // Adjust: you may store subjects directly on the class or on the student
      const subjects = await Attendance.distinct("subjectId", {
        studentId: student._id,
      });
 
      // Populate subject names
      const populatedSubjects = await Subject.find({ _id: { $in: subjects } })
        .select("name code")
        .lean();
 
      return res.status(200).json({
        success: true,
        student: {
          _id:         student._id,
          name:        `${student.firstName} ${student.lastName ?? ""}`.trim(),
          rollNumber:  student.rollNo,
          className:   student.classId?.name   ?? "—",
          sectionName: student.sectionId?.name ?? "—",
        },
        subjects: populatedSubjects,
      });
    } catch (err) {
      console.error("student-meta error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }


  export const getparentReport = async (req, res) => {
     try {
      const { studentId, month, year, subjectId } = req.query;
 
      if (!studentId || !month || !year) {
        return res.status(400).json({ message: "studentId, month, and year are required" });
      }
 
      /* ── Optional: verify the logged-in parent owns this student ── */
      // const parent = req.user;            // set by protect middleware
      // if (!parent.children.includes(studentId)) {
      //   return res.status(403).json({ message: "Access denied" });
      // }
 
      const filter = {
        studentId,
        month:  Number(month),
        year:   Number(year),
      };
 
      if (subjectId) filter.subjectId = subjectId;
 
      const records = await Attendance.find(filter)
        .populate("subjectId", "name code")   // name + code for display
        .sort({ date: -1 })                   // newest first
        .lean();
 
      return res.status(200).json({
        success: true,
        data: records,
      });
    } catch (err) {
      console.error("parent/report error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }