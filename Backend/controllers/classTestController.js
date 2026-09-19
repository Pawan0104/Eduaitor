import mongoose from "mongoose";
import ClassTest from "../models/classTest.js";
import Class from "../models/class.js";
import Subject from "../models/subject.js";
import Teacher from "../models/teacher.js";
import Student from "../models/student.js";
import { resolveTeacherAccessibleClassIds } from "./classController.js";
import { createNotificationHelper } from "./notificationController.js";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const toTimeMin = (t) => {
  if (typeof t !== "string" || !t) return -1;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
};

const isExamPast = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today >= d;
};

const getEditDeadline = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() + 2);
  d.setHours(23, 59, 59, 999);
  return d;
};

const isEditAllowed = (date) => new Date() <= getEditDeadline(date);

const GRADE_SCALE = [
  { min: 90, grade: "A+" },
  { min: 80, grade: "A" },
  { min: 70, grade: "B+" },
  { min: 60, grade: "B" },
  { min: 50, grade: "C" },
  { min: 40, grade: "D" },
  { min: 0, grade: "F" },
];

const calculateGrade = (percentage) => {
  for (const { min, grade } of GRADE_SCALE) {
    if (percentage >= min) return grade;
  }
  return "F";
};

const formatTestDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const notifyClassTestScheduled = async ({
  subjectName,
  teacherName,
  testDate,
  startTime,
  endTime,
  classId,
  sectionId,
  teacherId,
  schoolId,
  createdBy,
  updated = false,
}) => {
  const dateLabel = formatTestDate(testDate);
  const timeLabel = startTime && endTime ? ` (${startTime} – ${endTime})` : "";
  return createNotificationHelper({
    title: updated
      ? `${subjectName} class test updated`
      : `${subjectName} class test scheduled`,
    message: updated
      ? `${subjectName} class test has been updated to ${dateLabel}${timeLabel} by ${teacherName}.`
      : `${subjectName} class test is scheduled on ${dateLabel}${timeLabel} (Teacher: ${teacherName}).`,
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
    startingDate: testDate ? new Date(testDate) : null,
  });
};

/* ── CREATE ── */
export const createClassTest = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const {
      className,
      sectionId,
      subject,
      teacherId,
      title,
      testDate,
      startTime,
      endTime,
      totalMarks,
      passingMarks,
    } = req.body;

    if (!schoolId)
      return res.status(400).json({ message: "School not identified" });
    if (!className || !subject || !testDate || !startTime || !endTime || totalMarks == null || passingMarks == null)
      return res.status(400).json({ message: "All required fields must be filled" });

    const dateObj = new Date(testDate);
    if (dateObj.getDay() === 0)
      return res.status(400).json({ message: "Class tests cannot be scheduled on Sundays" });

    const dayOfWeek = DAY_NAMES[dateObj.getDay()];

    // Teacher: restrict to accessible classes
    const isTeacherRole = req.user?.role === "teacher_admin";
    const assignedTeacherId = isTeacherRole ? req.user.teacher_id : (teacherId || req.user.teacher_id);

    if (!assignedTeacherId)
      return res.status(400).json({ message: "Teacher is required" });

    if (isTeacherRole) {
      const accessible = await resolveTeacherAccessibleClassIds(schoolId, assignedTeacherId);
      if (!accessible.includes(String(className)))
        return res.status(403).json({ message: "You do not have access to this class" });
    }

    // Teacher cannot double-book at same time
    const teacherOverlap = await ClassTest.findOne({
      schoolId,
      teacherId: assignedTeacherId,
      testDate: new Date(testDate),
      _id: { $ne: req.params?.id },
      $or: [
        { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
        { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
        { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
      ],
    });
    if (teacherOverlap)
      return res.status(409).json({ message: `This teacher already has a class test scheduled at ${teacherOverlap.startTime}–${teacherOverlap.endTime} on ${formatTestDate(testDate)}.` });

    const newTest = await ClassTest.create({
      schoolId,
      className,
      sectionId: sectionId || null,
      subject,
      teacherId: assignedTeacherId,
      title: title || "",
      testDate,
      dayOfWeek,
      startTime,
      endTime,
      totalMarks: Number(totalMarks),
      passingMarks: Number(passingMarks),
      createdBy: req.user._id,
    });

    const [subjectDoc, teacherDoc] = await Promise.all([
      Subject.findById(subject).select("name"),
      Teacher.findById(assignedTeacherId).select("fullName"),
    ]);

    await notifyClassTestScheduled({
      subjectName: subjectDoc?.name || "Subject",
      teacherName: teacherDoc?.fullName || "Teacher",
      testDate,
      startTime,
      endTime,
      classId: className,
      sectionId: sectionId || null,
      teacherId: assignedTeacherId,
      schoolId,
      createdBy: req.user._id,
      updated: false,
    });

    res.status(201).json(newTest);
  } catch (err) {
    console.error("Create ClassTest Error:", err);
    res.status(500).json({ message: "Internal Server Error", details: err.message });
  }
};

/* ── LIST ── */
export const getClassTests = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { classId } = req.query;
    if (!schoolId) return res.status(400).json({ message: "School not identified" });

    const filter = { schoolId };
    if (classId) filter.className = classId;

    const isTeacherRole = req.user?.role === "teacher_admin";
    if (isTeacherRole) {
      filter.teacherId = req.user.teacher_id;
    }

    const tests = await ClassTest.find(filter)
      .populate("className", "name")
      .populate("sectionId", "name")
      .populate("subject", "name")
      .populate("teacherId", "fullName")
      .sort({ testDate: -1, startTime: -1 });

    res.json(tests);
  } catch (err) {
    console.error("List ClassTests Error:", err);
    res.status(500).json({ message: "Failed to fetch class tests" });
  }
};

/* ── UPDATE ── */
export const updateClassTest = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.school_id;
    const updates = req.body;

    if (!schoolId) return res.status(400).json({ message: "School not identified" });

    const existing = await ClassTest.findOne({ _id: id, schoolId });
    if (!existing) return res.status(404).json({ message: "Class test not found" });
    if (isExamPast(existing.testDate))
      return res.status(400).json({ message: "Past class tests cannot be edited" });

    if (updates.testDate && new Date(updates.testDate).getDay() === 0)
      return res.status(400).json({ message: "Class tests cannot be on Sundays" });

    if (updates.startTime && updates.endTime && updates.testDate) {
      const overlap = await ClassTest.findOne({
        schoolId,
        teacherId: existing.teacherId,
        testDate: new Date(updates.testDate),
        _id: { $ne: id },
        $or: [
          { startTime: { $lte: updates.startTime }, endTime: { $gt: updates.startTime } },
          { startTime: { $lt: updates.endTime }, endTime: { $gte: updates.endTime } },
          { startTime: { $gte: updates.startTime }, endTime: { $lte: updates.endTime } },
        ],
      });
      if (overlap)
        return res.status(409).json({ message: `Teacher already has a class test at ${overlap.startTime}–${overlap.endTime} on ${formatTestDate(updates.testDate)}.` });
    }

    const dayOfWeek = updates.testDate
      ? DAY_NAMES[new Date(updates.testDate).getDay()]
      : existing.dayOfWeek;

    const updated = await ClassTest.findByIdAndUpdate(
      id,
      { ...updates, dayOfWeek },
      { new: true, runValidators: true },
    ).populate("className", "name").populate("sectionId", "name").populate("subject", "name").populate("teacherId", "fullName");

    if (updates.testDate || updates.startTime || updates.endTime || updates.subject) {
      const [subjectDoc, teacherDoc] = await Promise.all([
        Subject.findById(updated.subject?._id || updated.subject).select("name"),
        Teacher.findById(updated.teacherId?._id || updated.teacherId).select("fullName"),
      ]);
      await notifyClassTestScheduled({
        subjectName: subjectDoc?.name || "Subject",
        teacherName: teacherDoc?.fullName || "Teacher",
        testDate: updated.testDate,
        startTime: updated.startTime,
        endTime: updated.endTime,
        classId: updated.className?._id || updated.className,
        sectionId: updated.sectionId?._id || updated.sectionId || null,
        teacherId: updated.teacherId?._id || updated.teacherId,
        schoolId,
        createdBy: req.user._id,
        updated: true,
      });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update ClassTest Error:", err);
    res.status(500).json({ message: "Update failed", details: err.message });
  }
};

/* ── DELETE ── */
export const deleteClassTest = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.school_id;
    const existing = await ClassTest.findOne({ _id: id, schoolId });
    if (!existing) return res.status(404).json({ message: "Class test not found" });
    if (isExamPast(existing.testDate))
      return res.status(400).json({ message: "Past class tests cannot be deleted" });

    await ClassTest.findByIdAndDelete(id);
    res.json({ message: "Class test deleted" });
  } catch (err) {
    console.error("Delete ClassTest Error:", err);
    res.status(500).json({ message: "Delete failed" });
  }
};

/* ── GET STUDENTS FOR MARKS ENTRY ── */
export const getClassTestStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.school_id;
    const role = req.user?.role;

    if (!schoolId) return res.status(400).json({ message: "School not identified" });

    const test = await ClassTest.findOne({ _id: id, schoolId })
      .populate("className", "name")
      .populate("sectionId", "name")
      .populate("subject", "name")
      .populate("teacherId", "fullName");

    if (!test) return res.status(404).json({ message: "Class test not found" });

    if (role === "teacher_admin" && String(test.teacherId?._id) !== String(req.user.teacher_id))
      return res.status(403).json({ message: "Not authorized" });

    const studentQuery = { schoolId, classId: test.className?._id || test.className };
    if (test.sectionId) studentQuery.sectionId = test.sectionId._id || test.sectionId;

    const students = await Student.find(studentQuery)
      .select("firstName lastName rollNo studentId sectionId gender")
      .sort({ rollNo: 1 });

    const resultMap = {};
    (test.results || []).forEach((r) => {
      resultMap[r.studentId.toString()] = r;
    });

    const studentsWithResults = students.map((s) => ({
      ...s.toObject(),
      result: resultMap[s._id.toString()] || null,
    }));

    const testDatePast = isExamPast(test.testDate);
    const editAllowed = isEditAllowed(test.testDate);

    res.json({
      test,
      students: studentsWithResults,
      canEdit: testDatePast && editAllowed,
      testDatePast,
      editDeadline: getEditDeadline(test.testDate),
      totalStudents: students.length,
      marksEntered: (test.results || []).length,
    });
  } catch (err) {
    console.error("getClassTestStudents Error:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
};

/* ── SUBMIT MARKS ── */
export const submitClassTestMarks = async (req, res) => {
  try {
    const { id } = req.params;
    const { results } = req.body;
    const schoolId = req.user?.school_id;
    const teacherId = req.user?.teacher_id;

    if (!schoolId) return res.status(400).json({ message: "School not identified" });
    if (!Array.isArray(results) || results.length === 0)
      return res.status(400).json({ message: "No results data" });

    const test = await ClassTest.findOne({ _id: id, schoolId });
    if (!test) return res.status(404).json({ message: "Class test not found" });

    if (req.user?.role === "teacher_admin" && String(test.teacherId) !== String(teacherId))
      return res.status(403).json({ message: "Not authorized" });

    if (!isExamPast(test.testDate))
      return res.status(400).json({ message: "Cannot enter marks before the test date" });

    const isAdminEntry = ["school_admin", "staff_admin"].includes(req.user?.role);
    if (!isAdminEntry && !isEditAllowed(test.testDate))
      return res.status(400).json({ message: "Edit window has closed" });

    const processedResults = results.map((r) => {
      const isPresent = r.attendanceStatus === "Present";
      let percentage = null;
      let grade = null;

      if (isPresent && r.marksObtained != null && r.marksObtained !== undefined) {
        percentage = parseFloat(((r.marksObtained / test.totalMarks) * 100).toFixed(2));
        grade = calculateGrade(percentage);
      }

      return {
        studentId: r.studentId,
        attendanceStatus: r.attendanceStatus || "Present",
        marksObtained: isPresent ? (r.marksObtained ?? null) : null,
        percentage,
        grade,
      };
    });

    await ClassTest.findByIdAndUpdate(id, { results: processedResults });

    const subjectDoc = await Subject.findById(test.subject).select("name");

    await createNotificationHelper({
      title: "Class test results published",
      message: `${subjectDoc?.name || "Subject"} class test results are now available.`,
      notificationType: "result",
      createdBy: req.user._id,
      schoolId,
      targets: [
        {
          type: "class",
          classId: test.className,
          sectionId: test.sectionId || null,
          classes: [{ classId: test.className, sectionId: test.sectionId || null }],
        },
      ],
    });

    res.json({ message: "Marks saved successfully", saved: results.length });
  } catch (err) {
    console.error("submitClassTestMarks Error:", err);
    res.status(500).json({ message: "Failed to save marks" });
  }
};

/* ── UPCOMING TESTS FOR A CLASS (used by timetable integration) ── */
export const getUpcomingClassTests = async (schoolId, classId) => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfWindow = new Date(startOfToday);
  endOfWindow.setDate(endOfWindow.getDate() + 7);

  return ClassTest.find({
    schoolId,
    className: classId,
    testDate: { $gte: startOfToday, $lt: endOfWindow },
  })
    .populate("subject", "name")
    .populate("teacherId", "fullName")
    .sort({ testDate: 1, startTime: 1 });
};
