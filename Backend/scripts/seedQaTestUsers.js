/**
 * Seed QA test users for Default School (all major portals).
 *
 *   cd Backend
 *   node scripts/seedQaTestUsers.js
 *
 * Prints a credential matrix when done.
 */
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import School from "../models/school.js";
import Subscription from "../models/subscription.js";
import Teacher from "../models/teacher.js";
import Staff from "../models/staff.js";
import Student from "../models/student.js";
import SchoolStaffRole from "../models/schoolStaffRole.js";
import { Driver } from "../models/transport.js";
import { MODULE_KEYS } from "../constants/module.js";

dotenv.config();

const STAFF_PASSWORD = "#staff@school123";
const TEACHER_PASSWORD = "#teacher@school123";
const SCHOOL_PASSWORD = "#admin@school123";
const STUDENT_PASSWORD = "#qa@student123";
const PARENT_PASSWORD = "#qa@parent123";

const hash = (p) => bcrypt.hash(p, 10);

const ensureSubscription = async () =>
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

const ensureSchool = async (subscriptionId) => {
  const passwordHash = await hash(SCHOOL_PASSWORD);
  let school = await School.findOne({ admin_email: "school@admin.com" });
  if (!school) {
    school = await School.create({
      school_name: "Default School",
      slug: "default-school",
      subscription_plan: subscriptionId,
      admin_name: "School Admin",
      admin_email: "school@admin.com",
      admin_password: passwordHash,
      temp_password: SCHOOL_PASSWORD,
      status: "Active",
      subscribed_modules: MODULE_KEYS,
    });
  } else {
    school.admin_password = passwordHash;
    school.temp_password = SCHOOL_PASSWORD;
    school.subscribed_modules = MODULE_KEYS;
    school.status = "Active";
    school.subscription_plan = subscriptionId;
    await school.save();
  }
  return school;
};

const ensureRole = async (schoolId, name, preferred) => {
  const nameKey = name.trim().toLowerCase();
  const permissions = preferred.filter((p) => MODULE_KEYS.includes(p));
  let role = await SchoolStaffRole.findOne({ schoolId, nameKey });
  if (!role) {
    role = await SchoolStaffRole.create({
      schoolId,
      name,
      nameKey,
      description: `QA role: ${name}`,
      permissions,
      isActive: true,
      isSystem: true,
    });
  } else {
    role.permissions = permissions;
    role.isActive = true;
    await role.save();
  }
  return role;
};

const generateStaffId = async (schoolId) => {
  const count = await Staff.countDocuments({ schoolId });
  return `STF${String(count + 1).padStart(4, "0")}`;
};

const upsertStaff = async (schoolId, cfg, roleDoc) => {
  const passwordHash = await hash(STAFF_PASSWORD);
  let staff = await Staff.findOne({ schoolId, email: cfg.email });
  if (!staff) {
    staff = new Staff({
      schoolId,
      staffId: await generateStaffId(schoolId),
    });
  }
  staff.fullName = cfg.fullName;
  staff.email = cfg.email;
  staff.username = cfg.email;
  staff.phone = cfg.phone || "9876500100";
  staff.password = passwordHash;
  staff.temp_password = STAFF_PASSWORD;
  staff.firstTimeLogin = false;
  staff.staffRole = cfg.staffRole;
  staff.staffRoleCustom = cfg.staffRoleCustom || null;
  staff.customRoleId = roleDoc?._id || null;
  staff.permissions = roleDoc?.permissions || MODULE_KEYS;
  staff.status = "Active";
  staff.isAdminGroup = Boolean(cfg.adminGroup);
  staff.employmentType = "Full-Time";
  await staff.save();
  return staff;
};

const upsertTeacher = async (schoolId) => {
  const passwordHash = await hash(TEACHER_PASSWORD);
  let teacher = await Teacher.findOne({ email: "teacher@admin.com" });
  if (!teacher) {
    teacher = new Teacher({
      schoolId,
      teacherId: "TCH0001",
      fullName: "Teacher Admin",
      email: "teacher@admin.com",
    });
  }
  teacher.schoolId = schoolId;
  teacher.fullName = "Teacher Admin";
  teacher.email = "teacher@admin.com";
  teacher.username = "teacher@admin.com";
  teacher.password = passwordHash;
  teacher.temp_password = TEACHER_PASSWORD;
  teacher.firstTimeLogin = false;
  teacher.role = "teacher_admin";
  teacher.status = "Present";
  teacher.permissions = teacher.permissions?.length
    ? teacher.permissions
    : MODULE_KEYS.filter((k) =>
        [
          "students",
          "classes",
          "attendance",
          "exams",
          "syllabus",
          "timetable",
          "diary",
          "homework",
          "assignments",
          "daily_learning",
          "notices",
          "events",
          "groups",
          "message",
          "gatepass",
          "teachers",
        ].includes(k),
      );
  await teacher.save();
  return teacher;
};

const upsertStudentAndParent = async (schoolId) => {
  const studentHash = await hash(STUDENT_PASSWORD);
  const parentHash = await hash(PARENT_PASSWORD);
  const parentUsername = "9876543299";

  let student = await Student.findOne({
    schoolId,
    "studentCredentials.username": "qa.student@default.com",
  });

  if (!student) {
    const count = await Student.countDocuments({ schoolId });
    student = new Student({
      schoolId,
      studentId: `STU${String(count + 1).padStart(4, "0")}`,
      firstName: "QA",
      lastName: "Student",
    });
  }

  student.firstName = "QA";
  student.lastName = "Student";
  student.fatherName = "QA Parent";
  student.fatherMobile = parentUsername;
  student.fatherEmail = "qa.parent@default.com";
  student.schoolId = schoolId;
  student.studentCredentials = {
    username: "qa.student@default.com",
    password: studentHash,
    temp_password: STUDENT_PASSWORD,
    firstTimeLogin: false,
  };
  student.parentCredentials = {
    username: parentUsername,
    password: parentHash,
    temp_password: PARENT_PASSWORD,
    firstTimeLogin: false,
  };
  await student.save();
  return student;
};

const upsertDriver = async (schoolId) => {
  let driver = await Driver.findOne({ schoolId, phone: "9876500999" });
  if (!driver) {
    driver = new Driver({
      schoolId,
      name: "QA Transport Driver",
      phone: "9876500999",
      license: "QA-DL-0001",
      experience: "5 years",
      status: "Active",
    });
  } else {
    driver.name = "QA Transport Driver";
    driver.license = driver.license || "QA-DL-0001";
    driver.status = "Active";
  }
  await driver.save();
  return driver;
};

const ROLE_DEFS = [
  {
    name: "Accountant",
    preferred: ["fees", "students", "notices", "message", "financial"],
    staff: {
      fullName: "QA Accountant",
      email: "qa.accountant@default.com",
      staffRole: "accountant",
      phone: "9876500101",
      adminGroup: false,
    },
  },
  {
    name: "Security Guard",
    preferred: ["hostel", "gatepass", "students", "notices", "message"],
    staff: {
      fullName: "QA Security Guard",
      email: "qa.guard@default.com",
      staffRole: "security_guard",
      phone: "9876500102",
      adminGroup: false,
    },
  },
  {
    name: "Hostel Warden",
    preferred: ["hostel", "students", "notices", "message", "attendance"],
    staff: {
      fullName: "QA Hostel Warden",
      email: "qa.warden@default.com",
      staffRole: "hostel_warden",
      phone: "9876500103",
      adminGroup: true,
    },
  },
  {
    name: "Reception",
    preferred: [
      "students",
      "gatepass",
      "hostel",
      "notices",
      "message",
      "attendance",
      "leads",
    ],
    staff: {
      fullName: "QA Reception",
      email: "qa.reception@default.com",
      staffRole: "receptionist",
      phone: "9876500104",
      adminGroup: true,
    },
  },
  {
    name: "Librarian",
    preferred: ["library", "students", "notices", "message"],
    staff: {
      fullName: "QA Librarian",
      email: "qa.library@default.com",
      staffRole: "librarian",
      phone: "9876500105",
      adminGroup: false,
    },
  },
];

const run = async () => {
  await connectDB();
  const sub = await ensureSubscription();
  const school = await ensureSchool(sub._id);
  const teacher = await upsertTeacher(school._id);
  const student = await upsertStudentAndParent(school._id);
  const driver = await upsertDriver(school._id);

  const staffRows = [];
  for (const def of ROLE_DEFS) {
    const role = await ensureRole(school._id, def.name, def.preferred);
    const staff = await upsertStaff(school._id, def.staff, role);
    staffRows.push({
      role: def.name,
      email: staff.email,
      password: STAFF_PASSWORD,
      jobTitle: staff.staffRole,
    });
  }

  // Also refresh classic sample staff emails if present
  const classic = [
    {
      email: "accounts@default.com",
      fullName: "Accounts Staff",
      staffRole: "accountant",
      roleName: "Accountant",
    },
    {
      email: "reception@default.com",
      fullName: "Reception Desk",
      staffRole: "receptionist",
      roleName: "Reception",
    },
  ];
  for (const c of classic) {
    const role = await SchoolStaffRole.findOne({
      schoolId: school._id,
      nameKey: c.roleName.toLowerCase(),
    });
    if (role) {
      await upsertStaff(
        school._id,
        {
          fullName: c.fullName,
          email: c.email,
          staffRole: c.staffRole,
          adminGroup: c.staffRole === "receptionist",
          phone: "9876500110",
        },
        role,
      );
    }
  }

  console.log("\n========== QA TEST LOGINS (Default School) ==========\n");
  console.log("App (local):  http://localhost:5173");
  console.log("App (live):   https://admineduaitor.netlify.app");
  console.log("API:          from VITE_API_URL / Render\n");

  console.log("Super Admin");
  console.log("  email:    ", process.env.SUPER_ADMIN_EMAIL || "(set SUPER_ADMIN_EMAIL in Backend/.env)");
  console.log("  password: ", process.env.SUPER_ADMIN_PASSWORD ? "(from Backend/.env SUPER_ADMIN_PASSWORD)" : "(missing)");
  console.log("");

  console.log("School Admin");
  console.log("  email:    school@admin.com");
  console.log("  password:", SCHOOL_PASSWORD);
  console.log("");

  console.log("Teacher");
  console.log("  email:    teacher@admin.com");
  console.log("  password:", TEACHER_PASSWORD);
  console.log("");

  console.log("Student");
  console.log("  username: qa.student@default.com");
  console.log("  password:", STUDENT_PASSWORD);
  console.log("");

  console.log("Parent");
  console.log("  username: 9876543299  (father mobile)");
  console.log("  password:", PARENT_PASSWORD);
  console.log("");

  console.log("Staff portals (all use password:", STAFF_PASSWORD + ")");
  for (const row of staffRows) {
    console.log(`  ${row.role.padEnd(16)} ${row.email}`);
  }
  console.log("");

  console.log("Driver (NO login portal — manage from Staff / Transport)");
  console.log("  name: ", driver.name);
  console.log("  phone:", driver.phone);
  console.log("  id:   ", driver.driverId || driver._id.toString());
  console.log("");

  console.log("School id:", school._id.toString());
  console.log("Teacher id:", teacher._id.toString());
  console.log("Student id:", student._id.toString());
  console.log("\nSeed complete.\n");
  process.exit(0);
};

run().catch((err) => {
  console.error("QA seed failed:", err);
  process.exit(1);
});
