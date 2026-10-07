import bcrypt from "bcryptjs";
import School from "../models/school.js";
import Teacher from "../models/teacher.js";
import Staff from "../models/staff.js";
import Student from "../models/student.js";

/* Default passwords — stored as temp_password so they can be shown back
   to the super admin after import (same pattern as the seed scripts). */
const DEFAULT_TEACHER_PASSWORD =
  process.env.DEFAULT_TEACHER_PASSWORD || "School@123";
const DEFAULT_STAFF_PASSWORD =
  process.env.DEFAULT_STAFF_PASSWORD || "School@123";
const DEFAULT_PARENT_PASSWORD =
  process.env.DEFAULT_PARENT_PASSWORD || "Parent@1234";

/* Helpers ---------------------------------------------------------------- */
const str = (v) => {
  if (v === undefined || v === null) return "";
  return String(v).trim();
};

const slugify = (val) =>
  str(val)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20) || "user";

const uniqueSlug = (base, set) => {
  let u = base;
  let i = 2;
  while (set.has(u)) {
    u = `${base}${i}`;
    i += 1;
  }
  set.add(u);
  return u;
};

const toDate = (v) => {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  const s = str(v);
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/* Main importer ----------------------------------------------------------- */
export const importSchoolData = async (req, res) => {
  const { id } = req.params;
  const { teachers = [], staffList = [], students = [] } = req.body || {};

  const school = await School.findById(id);
  if (!school) {
    return res.status(404).json({
      success: false,
      message: "School not found",
    });
  }

  const summary = {
    teachers: { total: teachers.length, created: 0, failed: [] },
    staff: { total: staffList.length, created: 0, failed: [] },
    students: { total: students.length, created: 0, failed: [] },
  };
  const credentials = [];
  const usedUser = new Set();

  /* ── TEACHERS ── */
  const existingTeachers = await Teacher.countDocuments({ schoolId: school._id });
  for (let i = 0; i < teachers.length; i += 1) {
    const row = teachers[i] || {};
    const rowNo = i + 1;
    const fullName = str(row.fullName);
    if (!fullName) {
      summary.teachers.failed.push({ row: rowNo, reason: "Full Name is required" });
      continue;
    }
    try {
      const email = str(row.email).toLowerCase() || undefined;
      const username = str(row.username) || "",
        emailSlug = email ? str(email).replace(/@.+$/, "") : "";
      const loginName = uniqueSlug(
        username || str(row.username) || emailSlug || slugify(fullName),
        usedUser,
      );
      const rawPassword = str(row.password) || DEFAULT_TEACHER_PASSWORD;
      const teacherId = `TCH${String(existingTeachers + i + 1).padStart(4, "0")}`;

      const teacher = await Teacher.create({
        fullName,
        email,
        phone: str(row.phone) || undefined,
        gender: str(row.gender) || undefined,
        dob: toDate(row.dob),
        qualification: str(row.qualification) || undefined,
        designation: str(row.designation) || undefined,
        teacherId,
        schoolId: school._id,
        username: loginName,
        password: await bcrypt.hash(rawPassword, 10),
        temp_password: rawPassword,
        firstTimeLogin: true,
        role: "teacher_admin",
      });

      summary.teachers.created += 1;
      credentials.push({
        type: "Teacher",
        name: fullName,
        username: teacher.username || email,
        password: rawPassword,
      });
    } catch (err) {
      summary.teachers.failed.push({ row: rowNo, reason: err.message });
    }
  }

  /* ── STAFF ── */
  const existingStaff = await Staff.countDocuments({ schoolId: school._id });
  for (let i = 0; i < staffList.length; i += 1) {
    const row = staffList[i] || {};
    const rowNo = i + 1;
    const fullName = str(row.fullName);
    const email = str(row.email).toLowerCase();
    if (!fullName) {
      summary.staff.failed.push({ row: rowNo, reason: "Full Name is required" });
      continue;
    }
    if (!email) {
      summary.staff.failed.push({ row: rowNo, reason: "Email is required" });
      continue;
    }
    try {
      const loginName = uniqueSlug(
        str(row.username) || email.replace(/@.+$/, ""),
        usedUser,
      );
      const rawPassword = str(row.password) || DEFAULT_STAFF_PASSWORD;
      const staffId = `STF${String(existingStaff + i + 1).padStart(3, "0")}`;

      await Staff.create({
        fullName,
        email,
        phone: str(row.phone) || undefined,
        gender: str(row.gender) || undefined,
        staffRole: str(row.staffRole) || "other",
        staffId,
        schoolId: school._id,
        username: loginName,
        password: await bcrypt.hash(rawPassword, 10),
        temp_password: rawPassword,
        firstTimeLogin: true,
      });

      summary.staff.created += 1;
      credentials.push({
        type: "Staff",
        name: fullName,
        username: loginName,
        password: rawPassword,
      });
    } catch (err) {
      summary.staff.failed.push({ row: rowNo, reason: err.message });
    }
  }

  /* ── STUDENTS (parent login = father mobile) ── */
  const existingStudents = await Student.countDocuments({ schoolId: school._id });
  for (let i = 0; i < students.length; i += 1) {
    const row = students[i] || {};
    const rowNo = i + 1;
    const firstName = str(row.firstName);
    const lastName = str(row.lastName);
    if (!firstName || !lastName) {
      summary.students.failed.push({
        row: rowNo,
        reason: "First Name and Last Name are required",
      });
      continue;
    }
    const fatherMobile = str(row.fatherMobile);
    try {
      const rawPassword = str(row.parentPassword) || DEFAULT_PARENT_PASSWORD;
      const studentId = `STU${String(existingStudents + i + 1).padStart(4, "0")}`;
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      await Student.create({
        firstName,
        lastName,
        gender: str(row.gender) || undefined,
        dob: toDate(row.dob),
        fatherName: str(row.fatherName) || undefined,
        fatherMobile: fatherMobile || undefined,
        motherName: str(row.motherName) || undefined,
        address: str(row.address) || undefined,
        rollNo: str(row.rollNo) || undefined,
        studentId,
        schoolId: school._id,
        studentCredentials: {
          username: studentId,
          password: passwordHash,
          temp_password: rawPassword,
          firstTimeLogin: true,
        },
        parentCredentials: fatherMobile
          ? {
              username: fatherMobile,
              password: passwordHash,
              temp_password: rawPassword,
              firstTimeLogin: true,
            }
          : undefined,
      });

      summary.students.created += 1;
      credentials.push({
        type: "Parent",
        name: `${firstName} ${lastName}`.trim(),
        username: fatherMobile || studentId,
        password: rawPassword,
      });
    } catch (err) {
      summary.students.failed.push({ row: rowNo, reason: err.message });
    }
  }

  const totalCreated =
    summary.teachers.created +
    summary.staff.created +
    summary.students.created;

  return res.json({
    success: true,
    message: `Import completed — ${totalCreated} record(s) created`,
    summary,
    credentials,
  });
};