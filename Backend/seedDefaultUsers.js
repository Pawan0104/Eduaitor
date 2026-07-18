import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDB from "./config/db.js";
import School from "./models/school.js";
import Teacher from "./models/teacher.js";
import Student from "./models/student.js";
import Subscription from "./models/subscription.js";
import { MODULE_KEYS } from "./constants/module.js";

dotenv.config();

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const createOrUpdateSchool = async (subscriptionId) => {
  const defaultPassword = "#admin@school123";
  const existing = await School.findOne({ admin_email: "school@admin.com" });

  if (existing) {
    existing.admin_password = await hashPassword(defaultPassword);
    existing.temp_password = defaultPassword;
    existing.subscription_plan = subscriptionId;
    existing.subscribed_modules = MODULE_KEYS;
    existing.status = "Active";
    await existing.save();
    return existing;
  }

  const school = await School.create({
    school_name: "Default School",
    slug: "default-school",
    subscription_plan: subscriptionId,
    admin_name: "School Admin",
    admin_email: "school@admin.com",
    admin_password: await hashPassword(defaultPassword),
    temp_password: defaultPassword,
    status: "Active",
    subscribed_modules: MODULE_KEYS,
  });

  return school;
};

const createOrUpdateTeacher = async (schoolId) => {
  const defaultPassword = "#teacher@school123";
  const existing = await Teacher.findOne({
    $or: [{ email: "teacher@admin.com" }, { username: "teacher@admin.com" }],
  });

  if (existing) {
    existing.password = await hashPassword(defaultPassword);
    existing.temp_password = defaultPassword;
    existing.username = "teacher@admin.com";
    existing.email = "teacher@admin.com";
    existing.role = "teacher_admin";
    existing.schoolId = schoolId;
    existing.fullName = existing.fullName || "Teacher Admin";
    existing.teacherId = existing.teacherId || "TCH0001";
    existing.status = existing.status || "Present";
    await existing.save();
    return existing;
  }

  const teacher = await Teacher.create({
    fullName: "Teacher Admin",
    email: "teacher@admin.com",
    username: "teacher@admin.com",
    password: await hashPassword(defaultPassword),
    temp_password: defaultPassword,
    role: "teacher_admin",
    teacherId: "TCH0001",
    schoolId,
  });

  return teacher;
};

const createOrUpdateStudent = async (schoolId) => {
  const defaultPassword = "#disha@patni123";
  const existing = await Student.findOne({
    "studentCredentials.username": "student@admin.com",
  });

  if (existing) {
    existing.studentCredentials = {
      username: "student@admin.com",
      password: await hashPassword(defaultPassword),
      temp_password: defaultPassword,
      firstTimeLogin: true,
    };
    existing.schoolId = schoolId;
    existing.studentId = existing.studentId || "STU0001";
    existing.firstName = existing.firstName || "Disha";
    existing.lastName = existing.lastName || "Patni";
    await existing.save();
    return existing;
  }

  const student = await Student.create({
    firstName: "Disha",
    lastName: "Patni",
    studentId: "STU0001",
    schoolId,
    studentCredentials: {
      username: "student@admin.com",
      password: await hashPassword(defaultPassword),
      temp_password: defaultPassword,
      firstTimeLogin: true,
    },
  });

  return student;
};

const run = async () => {
  try {
    await connectDB();

    const subscription =
      (await Subscription.findOne({ slug: "default" })) ||
      (await Subscription.create({
        name: "Default",
        slug: "default",
        price: 0,
        currency: "USD",
        billing_cycle: "yearly",
        roles: [],
        status: "Active",
      }));

    const school = await createOrUpdateSchool(subscription._id);
    const teacher = await createOrUpdateTeacher(school._id);
    const student = await createOrUpdateStudent(school._id);

    console.log("Seed complete:");
    console.log("- School admin:", "school@admin.com", "#admin@school123");
    console.log("- Teacher admin:", "teacher@admin.com", "#teacher@school123");
    console.log("- Student:", "student@admin.com", "#disha@patni123");
    console.log("- Super admin env credentials remain in Backend/.env");

    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
};

run();
