/**
 * Seed dummy Smart Exam Scheduler data for Bright Children Academy (BCA).
 *
 * Creates:
 *  1. "Final Examination 2026"  (PUBLISHED, full generated timetable + version history)
 *  2. "Half Yearly Examination 2026" (DRAFT with classes/subjects/pool pre-picked, no schedule yet)
 *
 * Usage (from Backend folder):
 *   node scripts/seedExamSchedule.js
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import School from "../models/school.js";
import Class from "../models/class.js";
import Subject from "../models/subject.js";
import Teacher from "../models/teacher.js";
import ExamSchedule from "../models/examSchedule.js";
import { scheduleExams } from "../utils/examScheduling.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const BCA_SCHOOL_ID = "6a742c2140b550d8e314021e"; // Bright Children Academy

const SCHOOL_MARKERS = ["Nursery", "LKG", "UKG"];
const NORMAL_MARKERS = ["Class 1", "Class 2", "Class 3", "Class 4"];

const isSchoolLevel = (name) => SCHOOL_MARKERS.some((m) => name.includes(m));
const isNormal = (name) => NORMAL_MARKERS.some((m) => name.includes(m));

const log = (...a) => console.log("•", ...a);

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI missing in Backend/.env");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 25000 });
  log("MongoDB connected");

  const school = await School.findById(BCA_SCHOOL_ID);
  if (!school) throw new Error(`BCA school not found for id ${BCA_SCHOOL_ID}`);
  log("School:", school.school_name, "->", BCA_SCHOOL_ID);

  const classes = await Class.find({ schoolId: school._id, status: "Active" }).lean();
  log(`Found ${classes.length} classes`);

  const subjects = await Subject.find({ schoolId: school._id }).lean();
  const subjectName = new Map(subjects.map((s) => [String(s._id), s.name]));

  /* per-class subjects from section detail subjectTeachers (union) */
  const classSubjects = classes
    .map((c) => {
      const seen = new Map();
      (c.details || []).forEach((d) =>
        (d.subjectTeachers || []).forEach((st) => {
          if (st.subjectId) seen.set(String(st.subjectId), subjectName.get(String(st.subjectId)) || "");
        }),
      );
      const subs = [...seen.entries()].map(([id, name]) => ({ subjectId: id, subjectName: name })).filter((s) => s.subjectName);
      return {
        classId: c._id,
        className: c.name,
        subjects: subs,
        orderKey: isSchoolLevel(c.name) ? 0 : isNormal(c.name) ? 1 : 2,
      };
    })
    .filter((c) => c.subjects.length > 0)
    .sort((a, b) => a.orderKey - b.orderKey || a.className.localeCompare(b.className));

  log("Classes with subjects:", classSubjects.map((c) => `${c.className}(${c.subjects.length} subs)`).join(", "));

  /* pick up to 3 classes for the demo; mix 1 normal + 2 school-level */
  const picked = classSubjects.slice(0, 3);
  log("Selected for demo:", picked.map((c) => c.className).join(", "));

  const teachers = await Teacher.find({ schoolId: school._id }).select("fullName subjects").lean();
  const teacherPool = teachers.map((t) => ({
    teacherId: t._id,
    teacherName: t.fullName,
    subjects: t.subjects || [],
  }));
  log(`Teacher pool: ${teacherPool.length} teachers`);

  const holidays = ["2026-11-24", "2026-12-01"];
  const startDate = "2026-11-16";
  const endDate = "2026-12-12";
  const gapRule = 1;

  /* per-class exam duration demo: Class 1 = 1 hr, Class 4 = 2 hrs, LKG = 45 min */
  const durationFor = (name) =>
    name.includes("Class 4") ? 120 : name.includes("Class 1") ? 60 : name.includes("Class 3") ? 90 : 45;

  const teacherUnavailable = teacherPool.length
    ? [
        { teacherId: teacherPool[0].teacherId, dates: ["2026-11-25"] },
        { teacherId: teacherPool.length > 1 ? teacherPool[1].teacherId : teacherPool[0].teacherId, dates: ["2026-11-28"] },
      ]
    : [];

  const result = scheduleExams({
    startDate,
    endDate,
    holidays,
    autoSundays: true,
    gapRule,
    classes: picked.map((c) => ({
      classId: c.classId,
      className: c.className,
      durationMinutes: durationFor(c.className),
      subjects: c.subjects,
    })),
    teachers: teacherPool,
    teacherUnavailable,
    startTime: "09:00",
    endTime: "15:00",
  });

  log("Quality score:", result.score);
  log("Warnings:", result.warnings.length ? result.warnings : "none");
  log("Conflicts:", result.conflicts.length ? result.conflicts : "none");

  await ExamSchedule.deleteMany({ schoolId: school._id, examName: { $in: ["Final Examination 2026", "Half Yearly Examination 2026"] } });

  /* v1 snapshot — a partial earlier draft, for the version-history demo */
  const rowsV1 = result.schedule
    .filter((r) => !["English", "Hindi"].includes(r.subjectName))
    .map((r) => ({
      date: r.date,
      classId: r.classId,
      className: r.className,
      subjectId: r.subjectId,
      subjectName: r.subjectName,
      teacherId: r.teacherId,
      teacherName: r.teacherName,
      startTime: r.startTime,
      endTime: r.endTime,
    }));

  const published = await ExamSchedule.create({
    schoolId: school._id,
    examName: "Final Examination 2026",
    paperSubmissionDeadline: new Date("2026-11-10"),
    paperTotalMarks: 80,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    holidays,
    autoSundays: true,
classes: picked.map((c) => c.classId),
    subjects: picked.flatMap((c) =>
      c.subjects.map((s) => ({
        classId: c.classId,
        className: c.className,
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        durationMinutes: durationFor(c.className),
      })),
    ),
    teachers: teacherPool.map((t) => t.teacherId),
    teacherUnavailable,
    gapRule,
    startTime: "09:00",
    endTime: "15:00",
    schedule: result.schedule,
    conflicts: result.conflicts,
    suggestions: result.suggestions,
    score: result.score,
    status: "published",
    version: 2,
    publishedAt: new Date(),
    versions: [
      { version: 1, status: "draft", score: result.score - 6, schedule: rowsV1, createdAt: new Date(Date.now() - 86400000 * 2) },
    ],
  });
  log("Published:", published.examName, `(v${published.version})`, "rows:", published.schedule.length);

  const draft = await ExamSchedule.create({
    schoolId: school._id,
    examName: "Half Yearly Examination 2026",
    startDate: new Date("2026-11-23"),
    endDate: new Date("2026-12-05"),
    holidays,
    autoSundays: true,
    classes: picked.map((c) => c.classId),
    subjects: picked.flatMap((c) =>
      c.subjects.map((s) => ({
        classId: c.classId,
        className: c.className,
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        durationMinutes: durationFor(c.className),
      })),
    ),
    teachers: teacherPool.map((t) => t.teacherId),
    teacherUnavailable,
    gapRule,
    startTime: "10:00",
    endTime: "15:00",
    schedule: [],
    conflicts: [],
    suggestions: [],
    score: 0,
    status: "draft",
    version: 1,
    versions: [],
  });
  log("Draft:", draft.examName, "(hit Generate Schedule to fill it)");

  await mongoose.disconnect();
  log("Done. Log in as school admin → Exam Management → Smart Exam Scheduler.");
}

main().catch((e) => {
  console.error("SEED FAILED:", e);
  process.exit(1);
});