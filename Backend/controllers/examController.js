import Exam from "../models/exam.js";
import Subject from "../models/subject.js";
import Teacher from "../models/teacher.js";
import Student from "../models/student.js";
import Result from "../models/result.js";
import Term from "../models/Term.js";
import ClassAttendance from "../models/classAttendance.js";
import School from "../models/school.js";
import { createNotificationHelper } from "./notificationController.js";
import { getDocumentDesign } from "./certificateController.js";

const formatExamDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const canEnterMarks = (req) => {
  const role = req.user?.role;
  return (
    role === "teacher_admin" ||
    role === "school_admin" ||
    role === "staff_admin"
  );
};

const findExamForMarks = async (examId, schoolId, req) => {
  const query = { _id: examId, schoolId };
  if (req.user?.role === "teacher_admin") {
    query.teacherId = req.user.teacher_id;
  }
  return Exam.findOne(query)
    .populate("className", "name")
    .populate("subject", "name")
    .populate("termId", "name academicYear termType startDate endDate")
    .populate("sectionId", "name")
    .populate("teacherId", "fullName");
};

const notifyExamScheduled = async ({
  subjectName,
  teacherName,
  examDate,
  startTime,
  endTime,
  classId,
  sectionId,
  teacherId,
  schoolId,
  createdBy,
  updated = false,
}) => {
  const dateLabel = formatExamDate(examDate);
  const timeLabel =
    startTime && endTime ? ` (${startTime} – ${endTime})` : "";
  return createNotificationHelper({
    title: updated
      ? `${subjectName} exam updated`
      : `${subjectName} exam scheduled`,
    message: updated
      ? `${subjectName} exam has been updated to ${dateLabel}${timeLabel} by ${teacherName}. Parents and students, please note the change.`
      : `${subjectName} exam is scheduled on ${dateLabel}${timeLabel} (Teacher: ${teacherName}). Parents and students, please prepare accordingly.`,
    notificationType: "exam",
    targets: [
      {
        type: "class",
        classId,
        sectionId: sectionId || null,
        classes: [{ classId, sectionId: sectionId || null }],
      },
      { type: "teacher", teacherId },
    ],
    schoolId,
    createdBy,
    startingDate: examDate ? new Date(examDate) : null,
  });
};

// Create Exam
export const createExam = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const {
      className,
      subject,
      examDate,
      startTime,
      endTime,
      totalMarks,
      passingMarks,
      termId,
      teacherId,
      sectionId,
    } = req.body;

    const dateObj = new Date(examDate);

    // 1. Sunday Validation
    if (dateObj.getDay() === 0) {
      return res
        .status(400)
        .json({ message: "Exams cannot be scheduled on Sundays!" });
    }

    // 2. Conflict Validation (SaaS Level)
    // Check if an exam already exists for this CLASS on this DATE that OVERLAPS the time
    const overlappingExam = await Exam.findOne({
      schoolId,
      className,
      examDate: new Date(examDate),
      $or: [
        {
          // New exam starts during an existing exam
          startTime: { $lte: startTime },
          endTime: { $gt: startTime },
        },
        {
          // New exam ends during an existing exam
          startTime: { $lt: endTime },
          endTime: { $gte: endTime },
        },
        {
          // New exam completely wraps around an existing exam
          startTime: { $gte: startTime },
          endTime: { $lte: endTime },
        },
      ],
    });

    if (overlappingExam) {
      return res.status(409).json({
        message: `Time Conflict! ${overlappingExam.subject} is already scheduled from ${overlappingExam.startTime} to ${overlappingExam.endTime}.`,
      });
    }

    // 3. Prepare Day Name
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayOfWeek = dayNames[dateObj.getDay()];

    // 4. Create Exam
    const newExam = new Exam({
      className,
      subject,
      examDate,
      startTime,
      endTime,
      totalMarks,
      passingMarks,
      schoolId,
      dayOfWeek,
      termId,
      teacherId,
      sectionId,
    });

    await newExam.save();

    const subjectDoc = await Subject.findOne({ _id: subject });
    const teacherDoc = await Teacher.findOne({ _id: teacherId });

    await notifyExamScheduled({
      subjectName: subjectDoc?.name || "Subject",
      teacherName: teacherDoc?.fullName || "Teacher",
      examDate,
      startTime,
      endTime,
      classId: className,
      sectionId,
      teacherId,
      schoolId,
      createdBy: req.user._id,
      updated: false,
    });

    // Return populated data so the frontend can show the Class Name immediately
    const populatedExam = await Exam.findById(newExam._id).populate(
      "className",
      "name",
    );
    res.status(201).json(populatedExam);
  } catch (err) {
    console.error("Create Exam Error:", err);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: err.message });
  }
};

// Get Exams (Filtered by School and optionally Class)
export const getExams = async (req, res) => {
  const schoolId = req.user?.school_id;
  const { classId } = req.query;

  if (!schoolId) {
    return res.status(400).json({
      success: false,
      message: "School ID is required",
    });
  }

  const query = { schoolId };

  if (classId) query.className = classId;

  try {
    const exams = await Exam.find(query)
      .populate("className")
      .populate("subject", "name") 
      .populate("termId", "name academicYear")   
.populate("teacherId", "fullName") 
      .sort({ examDate: 1, startTime: 1 })
      .lean();
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// update exams -
export const updateExam = async (req, res) => {
  console.log("Update Exam Request Body:");
  try {
    const schoolId = req.user?.school_id;
    const { id } = req.params;
    const {
      className,
      subject,
      examDate,
      startTime,
      endTime,
      totalMarks,
      passingMarks,
      sectionId,
    } = req.body;

    const dateObj = new Date(examDate);

    // 1. Sunday Validation
    if (dateObj.getDay() === 0) {
      return res
        .status(400)
        .json({ message: "Exams cannot be updated to a Sunday!" });
    }

    // 2. Conflict Validation (SaaS Level)
    // We check for overlaps but EXCLUDE the current exam ID ($ne: id)
    const overlappingExam = await Exam.findOne({
      _id: { $ne: id }, // Very important: Don't conflict with yourself
      schoolId,
      className,
      examDate: new Date(examDate),
      $or: [
        { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
        { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
        { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
      ],
    });

    if (overlappingExam) {
      return res.status(409).json({
        message: `Conflict! ${overlappingExam.subject} is already scheduled for this time.`,
      });
    }

    // 3. Prepare Day Name
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayOfWeek = dayNames[dateObj.getDay()];

    // 4. Find and Update
    const updatedExam = await Exam.findByIdAndUpdate(
      id,
      { ...req.body, dayOfWeek },
      { new: true, runValidators: true },
    ).populate("className", "name")
.populate("subject", "name")
.populate("termId", "name academicYear")
.populate("teacherId", "fullName");

    if (!updatedExam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    await notifyExamScheduled({
      subjectName: updatedExam.subject?.name || "Subject",
      teacherName: updatedExam.teacherId?.fullName || "Teacher",
      examDate: examDate || updatedExam.examDate,
      startTime: updatedExam.startTime,
      endTime: updatedExam.endTime,
      classId: className || updatedExam.className?._id || updatedExam.className,
      sectionId: updatedExam.sectionId || sectionId,
      teacherId: updatedExam.teacherId?._id || updatedExam.teacherId,
      schoolId,
      createdBy: req.user._id,
      updated: true,
    });

    res.status(200).json(updatedExam);
  } catch (err) {
    console.error("Update Exam Error:", err);
    res.status(500).json({ error: "Update failed", details: err.message });
  }
};

// delete exams -
export const deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.school_id;

    const deletedExam = await Exam.findOneAndDelete({ _id: id, schoolId });

    if (!deletedExam) {
      return res
        .status(404)
        .json({ message: "Exam already deleted or not found" });
    }

    res.status(200).json({ message: "Exam deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed", details: err.message });
  }
};


export const getTeacherExams = async (req, res) => {
  try {
    const teacherId = req.user?.teacher_id;
    const schoolId = req.user?.school_id;
    const role = req.user?.role;

    if (!schoolId) {
      return res.status(400).json({ message: "School not identified" });
    }

    // Teachers see only their exams; school admin / staff see all school exams
    const filter = { schoolId };
    if (role === "teacher_admin") {
      if (!teacherId) {
        return res.status(400).json({ message: "Teacher not found" });
      }
      filter.teacherId = teacherId;
    } else if (!["school_admin", "staff_admin"].includes(role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const exams = await Exam.find(filter)
      .populate("className", "name")
      .populate("subject", "name")
      .populate("termId", "name academicYear termType")
      .populate("teacherId", "fullName")
      .populate("sectionId", "name")
      .sort({ examDate: 1, startTime: 1 });

    res.status(200).json(exams);
  } catch (err) {
    console.error("Teacher Exam Fetch Error:", err);
    res.status(500).json({ message: "Failed to fetch exams" });
  }
};



const GRADE_SCALE = [
  { min: 90, grade: "A+" },
  { min: 80, grade: "A" },
  { min: 70, grade: "B+" },
  { min: 60, grade: "B" },
  { min: 50, grade: "C" },
  { min: 40, grade: "D" },
  { min: 0,  grade: "F" },
];
 
const calculateGrade = (percentage) => {
  for (const { min, grade } of GRADE_SCALE) {
    if (percentage >= min) return grade;
  }
  return "F";
};
 
/**
 * Edit window: teacher can enter/edit marks from exam date
 * up to end-of-day 2 days after exam. (e.g. exam on Mon → deadline Wed 23:59)
 */
const getEditDeadline = (examDate) => {
  const d = new Date(examDate);
  d.setDate(d.getDate() + 2);
  d.setHours(23, 59, 59, 999);
  return d;
};
 
const isEditAllowed = (examDate) => new Date() <= getEditDeadline(examDate);
 
const isExamPast = (examDate) => {
  const exam = new Date(examDate);
  exam.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today >= exam;
};
 
// ─── Controllers ────────────────────────────────────────────────────────────
 
/**
 * GET /result/exam/:examId/students
 * Teacher: fetch students for a specific exam (class + section filtered)
 * Returns students with their existing result (if any)
 */
export const getExamStudents = async (req, res) => {
  try {
    const { examId } = req.params;
    const schoolId = req.user?.school_id;

    if (!canEnterMarks(req)) {
      return res.status(403).json({ message: "Not authorized for marks entry" });
    }

    const exam = await findExamForMarks(examId, schoolId, req);

    if (!exam) {
      return res.status(403).json({ message: "Not authorized for this exam" });
    }
 
    // Build student query: same class, same section (if section exists)
    const studentQuery = { schoolId, classId: exam.className._id };
    if (exam.sectionId) studentQuery.sectionId = exam.sectionId._id;
 
    const students = await Student.find(studentQuery)
      .select("firstName lastName rollNo studentId sectionId gender")
      .sort({ rollNo: 1 });
 
    // Attach existing results
    const existingResults = await Result.find({ examId, schoolId });
    const resultMap = {};
    existingResults.forEach((r) => {
      resultMap[r.studentId.toString()] = r;
    });
 
    const studentsWithResults = students.map((s) => ({
      ...s.toObject(),
      result: resultMap[s._id.toString()] || null,
    }));
 
    const examDatePast = isExamPast(exam.examDate);
    const editAllowed = isEditAllowed(exam.examDate);
    const editDeadline = getEditDeadline(exam.examDate);
 
    res.status(200).json({
      exam,
      students: studentsWithResults,
      canEdit: examDatePast && editAllowed,
      examDatePast,
      editDeadline,
      totalStudents: students.length,
      marksEntered: existingResults.length,
    });
  } catch (err) {
    console.error("getExamStudents Error:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
};
 
/**
 * POST /result/exam/:examId/submit
 * Teacher: bulk submit/update marks
 * Body: { results: [{ studentId, attendanceStatus, marksObtained, remarks }] }
 */
export const submitMarks = async (req, res) => {
  try {
    const { examId } = req.params;
    const teacherId = req.user?.teacher_id;
    const schoolId = req.user?.school_id;
    const { results } = req.body;

    if (!canEnterMarks(req)) {
      return res.status(403).json({ message: "Not authorized for marks entry" });
    }

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ message: "No results data provided" });
    }

    const exam = await findExamForMarks(examId, schoolId, req);
    if (!exam) {
      return res.status(403).json({ message: "Not authorized for this exam" });
    }

    // Must be on or after exam date
    if (!isExamPast(exam.examDate)) {
      return res
        .status(400)
        .json({ message: "Cannot enter marks before the exam date" });
    }

    // Teachers have 2-day edit window; school/staff can override
    const isAdminEntry =
      req.user?.role === "school_admin" || req.user?.role === "staff_admin";
    if (!isAdminEntry && !isEditAllowed(exam.examDate)) {
      return res
        .status(400)
        .json({ message: "Edit window has closed. Results are locked." });
    }

    const now = new Date();
    const enteredBy = teacherId || exam.teacherId?._id || exam.teacherId;

    const bulkOps = await Promise.all(
      results.map(async (r) => {
        const isPresent = r.attendanceStatus === "Present";
        let percentage = null;
        let grade = null;
        let isPassed = null;

        if (
          isPresent &&
          r.marksObtained !== null &&
          r.marksObtained !== undefined
        ) {
          percentage = parseFloat(
            ((r.marksObtained / exam.totalMarks) * 100).toFixed(2),
          );
          grade = calculateGrade(percentage);
          isPassed = r.marksObtained >= exam.passingMarks;
        }

        const prev = await Result.findOne({
          examId,
          studentId: r.studentId,
          schoolId,
        });

        const historyEntry = prev
          ? {
              editedBy: enteredBy,
              editedAt: now,
              previousMarks: prev.marksObtained,
              previousStatus: prev.attendanceStatus,
            }
          : null;

        return {
          updateOne: {
            filter: { examId, studentId: r.studentId, schoolId },
            update: {
              $set: {
                schoolId,
                examId,
                studentId: r.studentId,
                classId: exam.className?._id || exam.className,
                sectionId: exam.sectionId?._id || exam.sectionId || null,
                termId: exam.termId?._id || exam.termId,
                subjectId: exam.subject?._id || exam.subject,
                teacherId: exam.teacherId?._id || exam.teacherId,
                attendanceStatus: r.attendanceStatus || "Present",
                marksObtained: isPresent ? (r.marksObtained ?? null) : null,
                totalMarks: exam.totalMarks,
                passingMarks: exam.passingMarks,
                percentage,
                grade,
                isPassed,
                remarks: r.remarks || "",
                isLocked: false,
                enteredBy,
                enteredAt: prev ? prev.enteredAt : now,
                lastEditedAt: now,
              },
              ...(historyEntry && {
                $push: { editHistory: historyEntry },
              }),
            },
            upsert: true,
          },
        };
      }),
    );

    await Result.bulkWrite(bulkOps);

    const classId = exam.className?._id || exam.className;
    const sectionId = exam.sectionId?._id || exam.sectionId || null;
    const subjectName = exam.subject?.name || "Subject";

    await createNotificationHelper({
      title: "Exam results published",
      message: `${subjectName} results are now available. Parents and students can view marks and report card.`,
      notificationType: "result",
      createdBy: req.user._id,
      schoolId,
      targets: [
        {
          type: "class",
          classId,
          sectionId,
          classes: [{ classId, sectionId }],
        },
      ],
    });

    res.status(200).json({
      message: "Marks saved successfully",
      saved: results.length,
    });
  } catch (err) {
    console.error("submitMarks Error:", err);
    res.status(500).json({ message: "Failed to save marks" });
  }
};
 
/**
 * GET /result/exam/:examId
 * Teacher / Principal: view all results for an exam
 */
export const getExamResults = async (req, res) => {
  try {
    const { examId } = req.params;
    const schoolId = req.user?.school_id;
 
    const results = await Result.find({ examId, schoolId })
      .populate("studentId", "firstName lastName rollNo studentId gender")
      .populate("subjectId", "name")
      .populate("classId", "name")
      .populate("sectionId", "name")
      .populate("termId", "name")
      .sort({ createdAt: 1 });
 
    // Summary stats
    const present = results.filter((r) => r.attendanceStatus === "Present");
    const passed = present.filter((r) => r.isPassed === true);
    const highest = present.reduce(
      (max, r) => (r.marksObtained > max ? r.marksObtained : max),
      0
    );
    const avgMarks =
      present.length > 0
        ? (
            present.reduce((s, r) => s + (r.marksObtained || 0), 0) /
            present.length
          ).toFixed(1)
        : 0;
 
    res.status(200).json({
      results,
      stats: {
        total: results.length,
        present: present.length,
        absent: results.filter((r) => r.attendanceStatus === "Absent").length,
        leave: results.filter((r) =>
          ["Leave", "MedicalLeave"].includes(r.attendanceStatus)
        ).length,
        exempted: results.filter((r) => r.attendanceStatus === "Exempted")
          .length,
        passed: passed.length,
        failed: present.length - passed.length,
        passPercentage:
          present.length > 0
            ? ((passed.length / present.length) * 100).toFixed(1)
            : 0,
        highestMarks: highest,
        averageMarks: avgMarks,
      },
    });
  } catch (err) {
    console.error("getExamResults Error:", err);
    res.status(500).json({ message: "Failed to fetch results" });
  }
};
 
/**
 * GET /result/student/:studentId
 * Parent / Principal: view all results for a student
 * Query: ?termId=xxx
 */
export const getStudentResults = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.user?.school_id;
    const { termId } = req.query;

    const query = { studentId, schoolId };
    if (termId) query.termId = termId;
 
    const results = await Result.find(query)
      .populate({
        path: "examId",
        select: "examDate subject totalMarks passingMarks startTime endTime",
        populate: { path: "subject", select: "name" },
      })
      .populate("subjectId", "name")
      .populate("termId", "name academicYear")
      .populate("classId", "name")
      .sort({ "examId.examDate": -1 });
 
    res.status(200).json(results);
  } catch (err) {
    console.error("getStudentResults Error:", err);
    res.status(500).json({ message: "Failed to fetch student results" });
  }
};
 
/**
 * GET /result/class/:classId/term/:termId
 * Principal: full class report card
 */
export const getClassResults = async (req, res) => {
  try {
    const { classId, termId } = req.params;
    const schoolId = req.user?.school_id;
    const { sectionId } = req.query;
 
    const query = { schoolId, classId, termId };
    if (sectionId) query.sectionId = sectionId;
 
    const results = await Result.find(query)
      .populate("studentId", "firstName lastName rollNo studentId")
      .populate("subjectId", "name")
      .populate("examId", "examDate")
      .sort({ "studentId.rollNo": 1 });
 
    res.status(200).json(results);
  } catch (err) {
    console.error("getClassResults Error:", err);
    res.status(500).json({ message: "Failed to fetch class results" });
  }
};

/**
 * GET /exam/report-card/:studentId?termId=xxx
 *
 * Term-wise cumulative report card:
 * - Selecting Term 1 → marks for Term 1 only
 * - Selecting Term 2 → marks for Term 1 + Term 2
 * - Selecting Term N → marks for Term 1 … Term N (same academic year)
 * Attendance is always "till date" (from academic year / earliest term start → today).
 * Parents can generate after any exam once marks exist.
 */
export const getReportCard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.user?.school_id;
    const role = req.user?.role;
    const { termId, academicYear } = req.query;

    if (!schoolId) {
      return res.status(400).json({ message: "School not identified" });
    }

    if (
      role === "student_admin" &&
      String(req.user.student_id) !== String(studentId)
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!termId) {
      return res.status(400).json({
        message: "termId is required. Select a term to generate the report card.",
      });
    }

    const student = await Student.findOne({ _id: studentId, schoolId })
      .select("firstName lastName studentId rollNo gender dob classId sectionId")
      .populate("classId", "name")
      .populate("sectionId", "name")
      .lean();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const selectedTerm = await Term.findOne({ _id: termId, schoolId }).lean();
    if (!selectedTerm) {
      return res.status(404).json({ message: "Term not found" });
    }

    const yearLabel = selectedTerm.academicYear || academicYear || null;

    // All terms in same academic year, ordered
    const yearTerms = await Term.find({
      schoolId,
      academicYear: selectedTerm.academicYear,
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const selectedOrder =
      selectedTerm.order ??
      yearTerms.findIndex((t) => String(t._id) === String(selectedTerm._id));

    // Cumulative: this term + all earlier terms in the year
    const includedTerms = yearTerms.filter((t, idx) => {
      const ord = t.order ?? idx;
      return ord <= selectedOrder;
    });

    // Fallback if order missing / mismatch — include selected + anything created before it
    const terms =
      includedTerms.length > 0
        ? includedTerms
        : yearTerms.filter(
            (t) =>
              String(t._id) === String(selectedTerm._id) ||
              new Date(t.createdAt) <= new Date(selectedTerm.createdAt),
          );

    const termIds = terms.map((t) => t._id);

    const results = await Result.find({
      schoolId,
      studentId,
      termId: { $in: termIds },
    })
      .populate("subjectId", "name")
      .populate("termId", "name termType academicYear order")
      .populate("examId", "examDate totalMarks passingMarks")
      .sort({ createdAt: 1 })
      .lean();

    // Per-exam rows (full detail) + subject totals across included terms
    const examRows = results.map((r) => ({
      resultId: r._id,
      termId: r.termId?._id || r.termId,
      termName: r.termId?.name || "—",
      subjectId: r.subjectId?._id || r.subjectId,
      subjectName: r.subjectId?.name || "—",
      examDate: r.examId?.examDate || null,
      marksObtained:
        r.attendanceStatus === "Present" ? r.marksObtained : null,
      totalMarks: r.totalMarks,
      percentage: r.percentage,
      grade: r.grade,
      isPassed: r.isPassed,
      attendanceStatus: r.attendanceStatus,
    }));

    const subjectMap = {};
    for (const r of results) {
      const key = String(r.subjectId?._id || r.subjectId);
      if (!subjectMap[key]) {
        subjectMap[key] = {
          subjectId: key,
          subjectName: r.subjectId?.name || "—",
          marksObtained: 0,
          totalMarks: 0,
          exams: 0,
          isPassed: true,
          attendanceStatus: r.attendanceStatus,
          byTerm: {},
        };
      }
      const row = subjectMap[key];
      const tKey = String(r.termId?._id || r.termId);
      const tName = r.termId?.name || "Term";
      if (!row.byTerm[tKey]) {
        row.byTerm[tKey] = {
          termId: tKey,
          termName: tName,
          marksObtained: 0,
          totalMarks: 0,
        };
      }
      if (r.attendanceStatus === "Present" && r.marksObtained != null) {
        row.marksObtained += r.marksObtained;
        row.totalMarks += r.totalMarks || 0;
        row.exams += 1;
        row.byTerm[tKey].marksObtained += r.marksObtained;
        row.byTerm[tKey].totalMarks += r.totalMarks || 0;
        if (r.isPassed === false) row.isPassed = false;
      } else if (r.attendanceStatus !== "Present") {
        row.attendanceStatus = r.attendanceStatus;
      }
    }

    const subjects = Object.values(subjectMap).map((s) => {
      const percentage =
        s.totalMarks > 0
          ? parseFloat(((s.marksObtained / s.totalMarks) * 100).toFixed(2))
          : null;
      return {
        ...s,
        byTerm: Object.values(s.byTerm),
        percentage,
        grade: percentage != null ? calculateGrade(percentage) : "—",
      };
    });

    const scored = subjects.filter((s) => s.totalMarks > 0);
    const totalObtained = scored.reduce((a, s) => a + s.marksObtained, 0);
    const totalMax = scored.reduce((a, s) => a + s.totalMarks, 0);
    const overallPercentage =
      totalMax > 0
        ? parseFloat(((totalObtained / totalMax) * 100).toFixed(2))
        : null;

    // Attendance till date (year start → today)
    let startDate = terms
      .map((t) => t.startDate)
      .filter(Boolean)
      .sort((a, b) => new Date(a) - new Date(b))[0];

    if (!startDate && yearLabel) {
      const y = parseInt(String(yearLabel).slice(0, 4), 10);
      if (!Number.isNaN(y)) startDate = new Date(y, 3, 1); // 1 Apr
    }

    const endDate = new Date(); // till date
    endDate.setHours(23, 59, 59, 999);

    const attFilter = { studentId, schoolId, date: { $lte: endDate } };
    if (startDate) attFilter.date.$gte = new Date(startDate);

    const attRecords = await ClassAttendance.find(attFilter).lean();
    const present = attRecords.filter((r) => r.status === "Present").length;
    const late = attRecords.filter((r) => r.status === "Late").length;
    const absent = attRecords.filter((r) => r.status === "Absent").length;
    const totalDays = attRecords.length;
    const attendancePercentage = totalDays
      ? Math.round(((present + late) / totalDays) * 100)
      : 0;

    const school = await School.findById(schoolId)
      .select("school_name school_logo address")
      .lean();

    // Group exam rows by term for UI sections
    const termSections = terms.map((t) => ({
      termId: t._id,
      termName: t.name,
      order: t.order,
      exams: examRows.filter(
        (e) => String(e.termId) === String(t._id),
      ),
    }));

    const design = await getDocumentDesign(schoolId, "report_card");

    return res.status(200).json({
      success: true,
      cumulative: true,
      selectedTerm: {
        _id: selectedTerm._id,
        name: selectedTerm.name,
        termType: selectedTerm.termType,
        academicYear: selectedTerm.academicYear,
        order: selectedTerm.order,
      },
      academicYear: yearLabel,
      terms: terms.map((t) => ({
        _id: t._id,
        name: t.name,
        termType: t.termType,
        academicYear: t.academicYear,
        order: t.order,
        startDate: t.startDate,
        endDate: t.endDate,
      })),
      design,
      school: {
        name: school?.school_name || "",
        logo: design?.logoUrl || school?.school_logo || "",
        address: school?.address || "",
      },
      student: {
        _id: student._id,
        name: `${student.firstName} ${student.lastName || ""}`.trim(),
        studentId: student.studentId,
        rollNo: student.rollNo,
        gender: student.gender,
        dob: student.dob,
        className: student.classId?.name || "—",
        sectionName: student.sectionId?.name || "—",
      },
      termSections,
      examRows,
      subjects,
      summary: {
        totalObtained,
        totalMax,
        overallPercentage,
        overallGrade:
          overallPercentage != null ? calculateGrade(overallPercentage) : "—",
        subjectsCount: subjects.length,
        examsCount: examRows.length,
        passedCount: subjects.filter(
          (s) => s.isPassed !== false && s.totalMarks > 0,
        ).length,
      },
      attendance: {
        present,
        late,
        absent,
        totalDays,
        percentage: attendancePercentage,
        from: startDate || null,
        to: endDate,
        tillDate: true,
      },
      generatedAt: new Date(),
    });
  } catch (err) {
    console.error("getReportCard Error:", err);
    res.status(500).json({ message: "Failed to generate report card" });
  }
};