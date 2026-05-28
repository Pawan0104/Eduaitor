import Exam from "../models/exam.js";
import Subject from "../models/subject.js";
import Teacher from "../models/teacher.js";
import Student from "../models/student.js";
import Result from "../models/result.js";
import { createNotificationHelper } from "./notificationController.js";
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

    const subjectName = await Subject.findOne({ _id: subject });
    const teacherName = await Teacher.findOne({ _id: teacherId });

    console.log(
      `Created exam for ${subjectName} on ${examDate} assigned to ${teacherName.fullName}`,
    );


  const studentnotification = await  createNotificationHelper({
      title: `${subjectName.name} exam`,
      message: `${subjectName.name} exam on ${examDate} by ${teacherName.fullName}`,
      notificationType: "exam",
      targets: [
    { type: 'class',   classId: className },
    { type: 'teacher', teacherId: teacherId },
  ],
      schoolId,
      createdBy: req.user._id,
    });
   console.log("Notification created for new exam:", studentnotification);
   

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

      
  const classTeachernotification = await  createNotificationHelper({
      title: `${updatedExam.subject.name} exam updated`,
      message: `${updatedExam.subject.name} exam on ${examDate} by ${updatedExam.teacherId.fullName}`,
      notificationType: "exam",
        targets: [
    { type: 'class',   classId: className },
    { type: 'teacher', teacherId: updatedExam.teacherId._id },
  ],
      schoolId,
      createdBy: req.user._id,
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
    const teacherId = req.user?.teacher_id; // logged-in teacher
    const schoolId = req.user?.school_id;

    if (!teacherId) {
      return res.status(400).json({ message: "Teacher not found" });
    }

    const exams = await Exam.find({
      schoolId,
      teacherId, // ✅ filter by teacher
    })
      .populate("className", "name")
      .populate("subject", "name")
      .populate("termId", "name academicYear")
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
    const teacherId = req.user?.teacher_id;
    const schoolId = req.user?.school_id;
 
    // Verify teacher is assigned to this exam
    const exam = await Exam.findOne({ _id: examId, schoolId, teacherId })
      .populate("className", "name")
      .populate("subject", "name")
      .populate("termId", "name academicYear")
      .populate("sectionId", "name");
 
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
 
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ message: "No results data provided" });
    }
 
    // Verify ownership
    const exam = await Exam.findOne({ _id: examId, schoolId, teacherId }).populate("className", "name").populate("subject", "name");
    if (!exam) {
      return res.status(403).json({ message: "Not authorized for this exam" });
    }
 
    // Must be on or after exam date
    if (!isExamPast(exam.examDate)) {
      return res
        .status(400)
        .json({ message: "Cannot enter marks before the exam date" });
    }
 
    // Must be within edit window
    if (!isEditAllowed(exam.examDate)) {
      return res
        .status(400)
        .json({ message: "Edit window has closed. Results are locked." });
    }
 
    const now = new Date();
 
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
            ((r.marksObtained / exam.totalMarks) * 100).toFixed(2)
          );
          grade = calculateGrade(percentage);
          isPassed = r.marksObtained >= exam.passingMarks;
        }
 
        // Get previous result for edit history
        const prev = await Result.findOne({
          examId,
          studentId: r.studentId,
          schoolId,
        });
 
        const historyEntry =
          prev
            ? {
                editedBy: teacherId,
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
                classId: exam.className,
                sectionId: exam.sectionId || null,
                termId: exam.termId,
                subjectId: exam.subject,
                teacherId: exam.teacherId,
                attendanceStatus: r.attendanceStatus || "Present",
                marksObtained: isPresent ? (r.marksObtained ?? null) : null,
                totalMarks: exam.totalMarks,
                passingMarks: exam.passingMarks,
                percentage,
                grade,
                isPassed,
                remarks: r.remarks || "",
                isLocked: false,
                enteredBy: teacherId,
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
      })
    );

    await createNotificationHelper({
  title: "Results Published 📊",
  message: `${exam.subject.name} results are now available. Check your performance.`,
  notificationType: "result",
  createdBy: req.user._id,
  schoolId,
  targets: [
    {
      type: "class",
      classId: exam.className,
      sectionId: exam.sectionId || null
    }
  ]
});
 
    await Result.bulkWrite(bulkOps);
 
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