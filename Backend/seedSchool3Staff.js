import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import School from "./models/school.js";
import Staff from "./models/staff.js";
import Teacher from "./models/teacher.js";
import { MODULE_KEYS } from "./constants/module.js";

dotenv.config();

const URI = process.env.MONGO_URI;
const DEFAULT_PASSWORD = "#staff@school123";

const hashPassword = async (password) => bcrypt.hash(password, 10);

const normalizeId = (id) => id.toString();

const getSchool = async (identifier) => {
  if (!identifier) {
    const schools = await School.find().sort({ createdAt: 1 }).lean();
    if (schools.length >= 3) return schools[2];
    return schools[0];
  }

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    return School.findById(identifier);
  }

  return School.findOne({
    $or: [
      { slug: identifier },
      { school_name: identifier },
      { admin_email: identifier },
    ],
  });
};

const generateStaffId = async (schoolId) => {
  const last = await Staff.findOne({ schoolId }).sort({ createdAt: -1 }).select("staffId").lean();
  if (!last?.staffId) return "STF001";
  const num = parseInt(last.staffId.replace(/[^0-9]/g, ""), 10);
  return `STF${String(num + 1).padStart(3, "0")}`;
};

const generateTeacherId = async (schoolId) => {
  const last = await Teacher.findOne({ schoolId }).sort({ createdAt: -1 }).select("teacherId").lean();
  if (!last?.teacherId) return "TCH0001";
  const num = parseInt(last.teacherId.replace(/[^0-9]/g, ""), 10);
  return `TCH${String(num + 1).padStart(4, "0")}`;
};

const upsertStaff = async (schoolId, data) => {
  const existing = await Staff.findOne({ schoolId, email: data.email });
  if (existing) {
    await Staff.updateOne({ _id: existing._id }, { $set: data });
    return existing;
  }
  return Staff.create(data);
};

const upsertTeacher = async (schoolId, data) => {
  const existing = await Teacher.findOne({ schoolId, email: data.email });
  if (existing) {
    await Teacher.updateOne({ _id: existing._id }, { $set: data });
    return existing;
  }
  return Teacher.create(data);
};

const run = async () => {
  try {
    await mongoose.connect(URI, { dbName: "Eduaitor" });
    console.log("Connected to MongoDB");

    const schoolIdentifier = process.argv[2] || process.env.SCHOOL_IDENTIFIER;
    const school = await getSchool(schoolIdentifier);

    if (!school) {
      console.error("No school found. Provide a valid school slug, name, admin email, or ensure at least one school exists.");
      const schools = await School.find().select("school_name slug admin_email").lean();
      console.log("Available schools:", schools);
      process.exit(1);
    }

    console.log("Seeding staff for school:", school.school_name, normalizeId(school._id));

    const passwordHash = await hashPassword(DEFAULT_PASSWORD);
    const defaultPermissions = MODULE_KEYS;

    const teachers = [
      { fullName: "Teacher One", email: "teacher.one@school3.com" },
      { fullName: "Teacher Two", email: "teacher.two@school3.com" },
      { fullName: "Teacher Three", email: "teacher.three@school3.com" },
    ];

    const staffRoles = [
      { fullName: "Librarian One", email: "librarian.one@school3.com", staffRole: "librarian" },
      { fullName: "Librarian Two", email: "librarian.two@school3.com", staffRole: "librarian" },
      { fullName: "Driver One", email: "driver.one@school3.com", staffRole: "other", staffRoleCustom: "Driver" },
      { fullName: "Driver Two", email: "driver.two@school3.com", staffRole: "other", staffRoleCustom: "Driver" },
      { fullName: "Principal",    email: "principal@school3.com",   staffRole: "principal" },
      { fullName: "Accountant",   email: "accountant@school3.com",  staffRole: "accountant" },
      { fullName: "Counselor",   email: "counselor@school3.com",  staffRole: "counselor" },
      { fullName: "Receptionist", email: "receptionist@school3.com", staffRole: "receptionist" },
    ];

    for (const teacherItem of teachers) {
      const teacherId = await generateTeacherId(school._id);
      await upsertTeacher(school._id, {
        ...teacherItem,
        teacherId,
        username: teacherItem.email,
        password: passwordHash,
        temp_password: DEFAULT_PASSWORD,
        role: "teacher_admin",
        schoolId: school._id,
        status: "Present",
      });
      console.log(`Seeded teacher: ${teacherItem.email}`);
    }

    for (const staffItem of staffRoles) {
      const staffId = await generateStaffId(school._id);
      await upsertStaff(school._id, {
        fullName: staffItem.fullName,
        email: staffItem.email,
        staffRole: staffItem.staffRole,
        staffRoleCustom: staffItem.staffRoleCustom || null,
        staffId,
        username: staffItem.email,
        password: passwordHash,
        temp_password: DEFAULT_PASSWORD,
        permissions: defaultPermissions,
        status: "Active",
        schoolId: school._id,
      });
      console.log(`Seeded staff: ${staffItem.email}`);
    }

    console.log("Seed complete. All new staff use password:", DEFAULT_PASSWORD);
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
};

run();
