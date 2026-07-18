/**
 * Comprehensive demo data for Default School.
 * Seeds: modules, sections, classes, subjects, teachers, staff, students,
 * houses, terms, syllabus (chapters/topics), exams, marks, attendance.
 *
 * Usage (from Backend folder):
 *   node scripts/seedDemoDefaultSchool.js
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import School from "../models/school.js";
import Section from "../models/section.js";
import Class from "../models/class.js";
import Subject from "../models/subject.js";
import Teacher from "../models/teacher.js";
import Staff from "../models/staff.js";
import Student from "../models/student.js";
import Term from "../models/Term.js";
import Chapter from "../models/chapter.js";
import Topic from "../models/topic.js";
import Exam from "../models/exam.js";
import Result from "../models/result.js";
import ClassAttendance from "../models/classAttendance.js";
import { ensureDefaultHouses } from "../utils/ensureDefaultHouses.js";
import { MODULE_KEYS } from "../constants/module.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const ACADEMIC_YEAR = "2025-26";
const PASSWORD = "#demo@12345";

const log = (...args) => console.log("•", ...args);

const connectMongo = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI missing in Backend/.env");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 25000 });
  log("MongoDB connected");
};

const upsertSubject = async (schoolId, name) => {
  let sub = await Subject.findOne({ schoolId, name });
  if (sub) return sub;
  // Global unique on name — fall back to school-suffixed name
  try {
    sub = await Subject.create({ schoolId, name, status: "Active" });
  } catch {
    const alt = `${name} - Default School`;
    sub = await Subject.findOneAndUpdate(
      { schoolId, name: alt },
      { $set: { status: "Active" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  return sub;
};

const gradePct = (marks, total) => {
  const pct = (marks / total) * 100;
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
};

const run = async () => {
  await connectMongo();

  const school = await School.findOne({
    $or: [
      { school_name: "Default School" },
      { admin_email: "school@admin.com" },
    ],
  });
  if (!school) {
    throw new Error(
      "Default School not found. Run seedDefaultUsers.js first (school@admin.com).",
    );
  }
  const schoolId = school._id;
  log(`School: ${school.school_name} (${schoolId})`);

  // ── Modules ──────────────────────────────────────────────────────────────
  await School.updateOne(
    { _id: schoolId },
    { $set: { subscribed_modules: MODULE_KEYS } },
  );
  log(`Enabled ${MODULE_KEYS.length} modules`);

  // ── Sections ─────────────────────────────────────────────────────────────
  const sectionA = await Section.findOneAndUpdate(
    { schoolId, name: "A" },
    { $set: { status: "Active" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const sectionB = await Section.findOneAndUpdate(
    { schoolId, name: "B" },
    { $set: { status: "Active" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  log("Sections A, B ready");

  // ── Subjects ─────────────────────────────────────────────────────────────
  const subjectNames = [
    "Mathematics",
    "English",
    "Science",
    "Hindi",
    "Social Studies",
  ];
  const subjects = {};
  for (const name of subjectNames) {
    subjects[name] = await upsertSubject(schoolId, name);
  }
  log(`Subjects: ${Object.keys(subjects).join(", ")}`);

  // ── Teachers ─────────────────────────────────────────────────────────────
  const hashed = await bcrypt.hash(PASSWORD, 10);
  const teacherDefs = [
    {
      fullName: "Priya Malhotra",
      email: "priya.malhotra@default.com",
      phone: "9800010001",
      teacherId: "TCH-DEMO-01",
      username: "priya.malhotra@default.com",
      subjects: ["Mathematics", "Science"],
      designation: "Senior Teacher",
    },
    {
      fullName: "Rahul Desai",
      email: "rahul.desai@default.com",
      phone: "9800010002",
      teacherId: "TCH-DEMO-02",
      username: "rahul.desai@default.com",
      subjects: ["English", "Hindi"],
      designation: "Teacher",
    },
    {
      fullName: "Meera Joshi",
      email: "meera.joshi@default.com",
      phone: "9800010003",
      teacherId: "TCH-DEMO-03",
      username: "meera.joshi@default.com",
      subjects: ["Social Studies", "English"],
      designation: "Teacher",
    },
  ];

  const teachers = [];
  for (const t of teacherDefs) {
    const doc = await Teacher.findOneAndUpdate(
      { schoolId, email: t.email },
      {
        $set: {
          fullName: t.fullName,
          email: t.email,
          phone: t.phone,
          teacherId: t.teacherId,
          username: t.username,
          password: hashed,
          temp_password: PASSWORD,
          designation: t.designation,
          gender: "Female",
          qualification: "M.Ed",
          experience: 5,
          employmentType: "Full-Time",
          joiningDate: new Date("2022-06-01"),
          schoolId,
          status: "Present",
          role: "teacher_admin",
          subjects: t.subjects.map((n) => subjects[n]._id),
          firstTimeLogin: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    teachers.push(doc);
  }
  // Also ensure primary teacher@admin.com exists
  let primaryTeacher = await Teacher.findOne({
    schoolId,
    email: "teacher@admin.com",
  });
  if (!primaryTeacher) {
    primaryTeacher = await Teacher.findOne({ schoolId });
  }
  if (primaryTeacher && !teachers.find((t) => String(t._id) === String(primaryTeacher._id))) {
    teachers.unshift(primaryTeacher);
  }
  log(`Teachers: ${teachers.length}`);

  // ── Staff ────────────────────────────────────────────────────────────────
  const staffDefs = [
    {
      fullName: "Anita Kapoor",
      email: "anita.kapoor@default.com",
      phone: "9800020001",
      staffId: "STF-DEMO-01",
      staffRole: "administrator",
      username: "anita.kapoor@default.com",
    },
    {
      fullName: "Suresh Pillai",
      email: "suresh.pillai@default.com",
      phone: "9800020002",
      staffId: "STF-DEMO-02",
      staffRole: "librarian",
      username: "suresh.pillai@default.com",
    },
    {
      fullName: "Farah Khan",
      email: "farah.khan@default.com",
      phone: "9800020003",
      staffId: "STF-DEMO-03",
      staffRole: "accountant",
      username: "farah.khan@default.com",
    },
  ];

  for (const s of staffDefs) {
    await Staff.findOneAndUpdate(
      { schoolId, email: s.email },
      {
        $set: {
          ...s,
          schoolId,
          password: hashed,
          temp_password: PASSWORD,
          gender: "Female",
          joiningDate: new Date("2023-04-01"),
          employmentType: "Full-Time",
          permissions: MODULE_KEYS,
          status: "Active",
          firstTimeLogin: false,
          isAdminGroup: s.staffRole === "administrator",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  log(`Staff: ${staffDefs.length}`);

  // ── Classes ──────────────────────────────────────────────────────────────
  const classTeacher = teachers[0];
  const grade5 = await Class.findOneAndUpdate(
    { schoolId, name: "Grade 5" },
    {
      $set: {
        status: "Active",
        details: [
          {
            sectionId: sectionA._id,
            roomNumber: "501",
            teacherId: classTeacher._id,
            capacity: 40,
            studentCount: 0,
            subjectTeachers: Object.values(subjects).map((sub, i) => ({
              subjectId: sub._id,
              teacherId: teachers[i % teachers.length]._id,
            })),
          },
        ],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const grade1 = await Class.findOneAndUpdate(
    { schoolId, name: "Grade 1" },
    {
      $set: {
        status: "Active",
        details: [
          {
            sectionId: sectionB._id,
            roomNumber: "101",
            teacherId: teachers[1]?._id || classTeacher._id,
            capacity: 35,
            studentCount: 0,
            subjectTeachers: Object.values(subjects)
              .slice(0, 3)
              .map((sub, i) => ({
                subjectId: sub._id,
                teacherId: teachers[i % teachers.length]._id,
              })),
          },
        ],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await Teacher.updateMany(
    { _id: { $in: teachers.map((t) => t._id) } },
    { $addToSet: { assignedClasses: { $each: [grade5._id, grade1._id] } } },
  );
  log("Classes: Grade 5 (A), Grade 1 (B)");

  // ── Students ─────────────────────────────────────────────────────────────
  const studentDefs = [
    {
      firstName: "Aarav",
      lastName: "Sharma",
      gender: "Male",
      fatherMobile: "9876543210",
      rollNo: "1",
      classId: grade5._id,
      sectionId: sectionA._id,
      username: "STU-DEMO-01",
    },
    {
      firstName: "Ananya",
      lastName: "Verma",
      gender: "Female",
      fatherMobile: "9876543212",
      rollNo: "2",
      classId: grade5._id,
      sectionId: sectionA._id,
      username: "STU-DEMO-02",
    },
    {
      firstName: "Kabir",
      lastName: "Mehta",
      gender: "Male",
      fatherMobile: "9876543214",
      rollNo: "3",
      classId: grade5._id,
      sectionId: sectionA._id,
      username: "STU-DEMO-03",
    },
    {
      firstName: "Myra",
      lastName: "Singh",
      gender: "Female",
      fatherMobile: "9876543216",
      rollNo: "4",
      classId: grade5._id,
      sectionId: sectionA._id,
      username: "STU-DEMO-04",
    },
    {
      firstName: "Disha",
      lastName: "Patni",
      gender: "Female",
      fatherMobile: "9876543200",
      rollNo: "5",
      classId: grade5._id,
      sectionId: sectionA._id,
      username: "student@admin.com",
      keepExisting: true,
    },
    {
      firstName: "Vihaan",
      lastName: "Gupta",
      gender: "Male",
      fatherMobile: "9876543220",
      rollNo: "1",
      classId: grade1._id,
      sectionId: sectionB._id,
      username: "STU-DEMO-06",
    },
    {
      firstName: "Sara",
      lastName: "Ali",
      gender: "Female",
      fatherMobile: "9876543222",
      rollNo: "2",
      classId: grade1._id,
      sectionId: sectionB._id,
      username: "STU-DEMO-07",
    },
  ];

  const students = [];
  for (const s of studentDefs) {
    let existing = await Student.findOne({
      schoolId,
      "studentCredentials.username": s.username,
    });
    if (!existing) {
      existing = await Student.findOne({
        schoolId,
        firstName: s.firstName,
        lastName: s.lastName,
      });
    }

    const studentId =
      existing?.studentId ||
      `STU${String((await Student.countDocuments({ schoolId })) + 1).padStart(4, "0")}`;

    const payload = {
      firstName: s.firstName,
      lastName: s.lastName,
      gender: s.gender,
      dob: new Date("2014-06-15"),
      admissionDate: new Date("2024-04-01"),
      fatherName: `Mr ${s.lastName}`,
      fatherMobile: s.fatherMobile,
      motherName: `Mrs ${s.lastName}`,
      motherMobile: s.fatherMobile.replace(/0$/, "1"),
      address: "Demo Colony, Indore",
      classId: s.classId,
      sectionId: s.sectionId,
      rollNo: s.rollNo,
      studentType: "Day Scholar",
      schoolId,
      studentId,
      totalFee: 30000,
      finalFee: 30000,
      totalPaid: 10000,
      totalDue: 20000,
      feeFrequency: "annually",
      studentCredentials: {
        username: s.username,
        password: hashed,
        temp_password: PASSWORD,
        firstTimeLogin: false,
      },
      parentCredentials: {
        username: s.fatherMobile,
        password: hashed,
        temp_password: PASSWORD,
        firstTimeLogin: false,
      },
    };

    if (existing) {
      existing.set(payload);
      await existing.save();
      students.push(existing);
    } else {
      students.push(await Student.create(payload));
    }
  }
  log(`Students: ${students.length}`);

  // ── Houses ───────────────────────────────────────────────────────────────
  const houses = await ensureDefaultHouses(schoolId);
  for (let i = 0; i < students.length; i++) {
    const house = houses[i % houses.length];
    await Student.updateOne(
      { _id: students[i]._id },
      { $set: { houseId: house._id } },
    );
  }
  log(`Houses: ${houses.map((h) => h.name).join(", ")} (students assigned)`);

  // ── Terms ────────────────────────────────────────────────────────────────
  const term1 = await Term.findOneAndUpdate(
    { schoolId, academicYear: ACADEMIC_YEAR, name: "Term 1" },
    {
      $set: {
        termType: "other",
        order: 1,
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-09-30"),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const term2 = await Term.findOneAndUpdate(
    { schoolId, academicYear: ACADEMIC_YEAR, name: "Term 2" },
    {
      $set: {
        termType: "other",
        order: 2,
        startDate: new Date("2025-10-01"),
        endDate: new Date("2026-03-31"),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  log(`Terms: ${term1.name}, ${term2.name} (${ACADEMIC_YEAR})`);

  // ── Syllabus (chapters + topics) ─────────────────────────────────────────
  let chapterCount = 0;
  let topicCount = 0;
  const syllabusPlan = [
    { subject: "Mathematics", chapters: ["Numbers", "Fractions", "Geometry"] },
    { subject: "English", chapters: ["Grammar", "Comprehension"] },
    { subject: "Science", chapters: ["Living World", "Matter"] },
  ];

  for (const plan of syllabusPlan) {
    const subject = subjects[plan.subject];
    for (let ci = 0; ci < plan.chapters.length; ci++) {
      const chapterName = plan.chapters[ci];
      const termId = ci === 0 ? term1._id : term2._id;
      const chapter = await Chapter.findOneAndUpdate(
        {
          schoolId,
          classId: grade5._id,
          subjectId: subject._id,
          name: chapterName,
        },
        {
          $set: {
            termId,
            description: `Demo chapter: ${chapterName}`,
            learningOutcomes: [`Understand ${chapterName}`],
            order: ci + 1,
            status: "active",
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      chapterCount += 1;

      for (let ti = 1; ti <= 2; ti++) {
        await Topic.findOneAndUpdate(
          {
            schoolId,
            chapterId: chapter._id,
            name: `${chapterName} — Topic ${ti}`,
          },
          {
            $set: {
              subjectId: subject._id,
              classId: grade5._id,
              content: `Demo topic content for ${chapterName} topic ${ti}.`,
              order: ti,
              difficultyLevel: ti === 1 ? "easy" : "medium",
              status: "active",
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        topicCount += 1;
      }
    }
  }
  log(`Syllabus: ${chapterCount} chapters, ${topicCount} topics`);

  // ── Exams + Marks (Grade 5, Term 1 & Term 2) ─────────────────────────────
  const grade5Students = students.filter(
    (s) => String(s.classId) === String(grade5._id),
  );

  const examPlan = [
    {
      term: term1,
      date: "2025-08-12",
      subject: "Mathematics",
      teacher: teachers[0],
      start: "09:00",
      end: "11:00",
    },
    {
      term: term1,
      date: "2025-08-14",
      subject: "English",
      teacher: teachers[1] || teachers[0],
      start: "09:00",
      end: "11:00",
    },
    {
      term: term1,
      date: "2025-08-16",
      subject: "Science",
      teacher: teachers[0],
      start: "09:00",
      end: "11:00",
    },
    {
      term: term2,
      date: "2026-02-10",
      subject: "Mathematics",
      teacher: teachers[0],
      start: "09:00",
      end: "11:00",
    },
    {
      term: term2,
      date: "2026-02-12",
      subject: "English",
      teacher: teachers[1] || teachers[0],
      start: "09:00",
      end: "11:00",
    },
    {
      term: term2,
      date: "2026-02-14",
      subject: "Science",
      teacher: teachers[0],
      start: "09:00",
      end: "11:00",
    },
  ];

  let examCount = 0;
  let resultCount = 0;

  for (const ep of examPlan) {
    const subject = subjects[ep.subject];
    const examDate = new Date(ep.date);
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const exam = await Exam.findOneAndUpdate(
      {
        schoolId,
        termId: ep.term._id,
        className: grade5._id,
        subject: subject._id,
        examDate,
      },
      {
        $set: {
          teacherId: ep.teacher._id,
          sectionId: sectionA._id,
          startTime: ep.start,
          endTime: ep.end,
          totalMarks: 100,
          passingMarks: 33,
          dayOfWeek: dayNames[examDate.getDay()],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    examCount += 1;

    for (let i = 0; i < grade5Students.length; i++) {
      const stu = grade5Students[i];
      // Deterministic-ish marks 55–95
      const marks = 55 + ((i * 7 + ep.subject.length * 3 + ep.term.order * 5) % 41);
      const percentage = parseFloat(((marks / 100) * 100).toFixed(2));
      const grade = gradePct(marks, 100);

      await Result.findOneAndUpdate(
        { examId: exam._id, studentId: stu._id, schoolId },
        {
          $set: {
            classId: grade5._id,
            sectionId: sectionA._id,
            termId: ep.term._id,
            subjectId: subject._id,
            teacherId: ep.teacher._id,
            attendanceStatus: "Present",
            marksObtained: marks,
            totalMarks: 100,
            passingMarks: 33,
            percentage,
            grade,
            isPassed: marks >= 33,
            remarks: "Demo result",
            isLocked: false,
            enteredBy: ep.teacher._id,
            enteredAt: new Date(),
            lastEditedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      resultCount += 1;
    }
  }
  log(`Exams: ${examCount}, Results: ${resultCount}`);

  // ── Class attendance (last 20 school days) ───────────────────────────────
  let attCount = 0;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  let daysAdded = 0;
  const cursor = new Date(today);
  cursor.setDate(cursor.getDate() - 35);

  while (daysAdded < 20 && cursor <= today) {
    if (cursor.getDay() !== 0) {
      const month = cursor.getMonth() + 1;
      const year = cursor.getFullYear();
      for (let i = 0; i < grade5Students.length; i++) {
        const stu = grade5Students[i];
        const status =
          i === 2 && daysAdded % 5 === 0
            ? "Absent"
            : i === 3 && daysAdded % 7 === 0
              ? "Late"
              : "Present";
        try {
          await ClassAttendance.findOneAndUpdate(
            {
              studentId: stu._id,
              classId: grade5._id,
              sectionId: sectionA._id,
              date: new Date(cursor),
            },
            {
              $set: {
                schoolId,
                markedBy: classTeacher._id,
                month,
                year,
                academicYear: ACADEMIC_YEAR,
                status,
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );
          attCount += 1;
        } catch {
          /* ignore duplicate race */
        }
      }
      daysAdded += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  log(`Attendance records: ${attCount}`);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n========== Default School demo seed complete ==========");
  console.log("Login (school):  school@admin.com / #admin@school123");
  console.log(`Teachers/Staff password (demo): ${PASSWORD}`);
  console.log("Demo teachers:");
  teacherDefs.forEach((t) => console.log(`  ${t.email} / ${PASSWORD}`));
  console.log("Demo staff:");
  staffDefs.forEach((s) => console.log(`  ${s.email} / ${PASSWORD}`));
  console.log("Demo student: student@admin.com / #demo@12345 (or prior password)");
  console.log("Parent login: use father mobile as username, password #demo@12345");
  console.log("Test: Exam Structure, Marks Entry, Report Card (Term 1 / Term 2),");
  console.log("      House Allocation, Syllabus, Staff, Teachers, Attendance");
  console.log("=======================================================\n");

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
