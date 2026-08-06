/**
 * Seed a parent mobile linked to children in TWO schools
 * so the Parent login school-picker can be tested.
 *
 *   cd Backend
 *   node scripts/seedMultiSchoolParent.js
 *
 * Login:
 *   Parent tab → mobile 9000003001 → choose school → password #multischool@parent123
 */
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import School from "../models/school.js";
import Subscription from "../models/subscription.js";
import Class from "../models/class.js";
import Section from "../models/section.js";
import Student from "../models/student.js";
import { MODULE_KEYS } from "../constants/module.js";

dotenv.config();

const PARENT_MOBILE = "9000003001";
const PARENT_PASSWORD = "#multischool@parent123";
const STUDENT_PASSWORD = "#multischool@student123";
const SCHOOL_ADMIN_PASSWORD = "#admin@school123";

const hash = (p) => bcrypt.hash(p, 10);

async function ensureSubscription() {
  return (
    (await Subscription.findOne({ slug: "default" })) ||
    (await Subscription.create({
      name: "Default",
      slug: "default",
      price: 0,
      currency: "USD",
      billing_cycle: "yearly",
      roles: [],
      status: "Active",
    }))
  );
}

async function ensureDefaultSchool(subscriptionId) {
  const passwordHash = await hash(SCHOOL_ADMIN_PASSWORD);
  let school =
    (await School.findOne({ admin_email: "school@admin.com" })) ||
    (await School.findOne({ slug: "default-school" }));

  if (!school) {
    school = await School.create({
      school_name: "Default School",
      slug: "default-school",
      subscription_plan: subscriptionId,
      admin_name: "School Admin",
      admin_email: "school@admin.com",
      admin_password: passwordHash,
      temp_password: SCHOOL_ADMIN_PASSWORD,
      status: "Active",
      subscribed_modules: MODULE_KEYS,
    });
  } else {
    school.status = "Active";
    school.subscribed_modules = MODULE_KEYS;
    school.subscription_plan = subscriptionId;
    await school.save();
  }
  return school;
}

async function ensureSecondSchool(subscriptionId) {
  const passwordHash = await hash(SCHOOL_ADMIN_PASSWORD);
  let school =
    (await School.findOne({ admin_email: "second.campus@admin.com" })) ||
    (await School.findOne({ slug: "second-campus-school" }));

  if (!school) {
    school = await School.create({
      school_name: "Second Campus School",
      slug: "second-campus-school",
      subscription_plan: subscriptionId,
      admin_name: "Second Campus Admin",
      admin_email: "second.campus@admin.com",
      admin_password: passwordHash,
      temp_password: SCHOOL_ADMIN_PASSWORD,
      status: "Active",
      subscribed_modules: MODULE_KEYS,
      address: "22 River Road, Indore",
    });
  } else {
    school.school_name = "Second Campus School";
    school.status = "Active";
    school.subscribed_modules = MODULE_KEYS;
    school.subscription_plan = subscriptionId;
    await school.save();
  }
  return school;
}

async function ensureClassSection(schoolId, className = "Class 5") {
  let klass =
    (await Class.findOne({ schoolId, name: className })) ||
    (await Class.findOne({ schoolId, className })) ||
    (await Class.findOne({ schoolId }).sort({ createdAt: 1 }));

  if (!klass) {
    klass = await Class.create({
      schoolId,
      name: className,
      className,
    });
  }

  let section =
    (await Section.findOne({ schoolId, classId: klass._id })) ||
    (await Section.findOne({ schoolId }));

  if (!section) {
    section = await Section.create({
      schoolId,
      classId: klass._id,
      name: "A",
      sectionName: "A",
    });
  }

  return { klass, section };
}

async function upsertChild({
  schoolId,
  klass,
  section,
  child,
  parentHash,
  studentHash,
}) {
  let student = await Student.findOne({
    schoolId,
    "studentCredentials.username": child.studentUsername,
  });

  if (!student) {
    student = await Student.findOne({
      schoolId,
      studentId: child.studentIdHint,
    });
  }

  if (!student) {
    student = new Student({
      schoolId,
      studentId: child.studentIdHint,
    });
  }

  student.schoolId = schoolId;
  student.studentId = child.studentIdHint;
  student.firstName = child.firstName;
  student.lastName = child.lastName;
  student.gender = child.gender;
  student.rollNo = child.rollNo;
  student.classId = klass._id;
  student.sectionId = section._id;
  student.fatherName = "Vikram Mehta";
  student.fatherMobile = PARENT_MOBILE;
  student.fatherEmail = "vikram.mehta@example.com";
  student.motherName = "Kavita Mehta";
  student.motherMobile = "9000003002";
  student.address = "9 Cross Street, Indore";
  student.studentType = "Day Scholar";
  student.admissionDate = student.admissionDate || new Date("2024-04-01");
  student.dob = student.dob || new Date("2014-08-20");
  student.bloodGroup = student.bloodGroup || "O+";
  student.studentCredentials = {
    username: child.studentUsername,
    password: studentHash,
    temp_password: STUDENT_PASSWORD,
    firstTimeLogin: false,
  };
  student.parentCredentials = {
    username: PARENT_MOBILE,
    password: parentHash,
    temp_password: PARENT_PASSWORD,
    firstTimeLogin: false,
  };

  await student.save();
  return student;
}

const SCHOOL_CHILDREN = {
  default: [
    {
      firstName: "Riya",
      lastName: "Mehta",
      gender: "Female",
      rollNo: "MS11",
      studentUsername: "riya.mehta@multischool.test",
      studentIdHint: "MSCH1001",
    },
  ],
  second: [
    {
      firstName: "Rohan",
      lastName: "Mehta",
      gender: "Male",
      rollNo: "MS21",
      studentUsername: "rohan.mehta@multischool.test",
      studentIdHint: "MSCH2001",
    },
    {
      firstName: "Neha",
      lastName: "Mehta",
      gender: "Female",
      rollNo: "MS22",
      studentUsername: "neha.mehta@multischool.test",
      studentIdHint: "MSCH2002",
    },
  ],
};

const run = async () => {
  await connectDB();
  const sub = await ensureSubscription();
  const defaultSchool = await ensureDefaultSchool(sub._id);
  const secondSchool = await ensureSecondSchool(sub._id);

  const parentHash = await hash(PARENT_PASSWORD);
  const studentHash = await hash(STUDENT_PASSWORD);

  const defaultCs = await ensureClassSection(defaultSchool._id);
  const secondCs = await ensureClassSection(secondSchool._id);

  const defaultKids = [];
  for (const child of SCHOOL_CHILDREN.default) {
    const doc = await upsertChild({
      schoolId: defaultSchool._id,
      klass: defaultCs.klass,
      section: defaultCs.section,
      child,
      parentHash,
      studentHash,
    });
    defaultKids.push(doc);
  }

  const secondKids = [];
  for (const child of SCHOOL_CHILDREN.second) {
    const doc = await upsertChild({
      schoolId: secondSchool._id,
      klass: secondCs.klass,
      section: secondCs.section,
      child,
      parentHash,
      studentHash,
    });
    secondKids.push(doc);
  }

  console.log("\n========== MULTI-SCHOOL PARENT LOGIN (QA) ==========\n");
  console.log("Use Parent tab on /admin/login\n");
  console.log(`Mobile:   ${PARENT_MOBILE}`);
  console.log(`Password: ${PARENT_PASSWORD}`);
  console.log("");
  console.log("Expected flow:");
  console.log("  1. Enter mobile → Continue");
  console.log("  2. School picker shows BOTH schools");
  console.log("  3. Pick a school → enter password → parent menu\n");
  console.log(
    `School A: ${defaultSchool.school_name} (${defaultKids.length} child)`,
  );
  for (const k of defaultKids) {
    console.log(`  - ${k.firstName} ${k.lastName} [${k.studentId}]`);
  }
  console.log(
    `School B: ${secondSchool.school_name} (${secondKids.length} children)`,
  );
  for (const k of secondKids) {
    console.log(`  - ${k.firstName} ${k.lastName} [${k.studentId}]`);
  }
  console.log("");
  console.log("Second school admin (optional):");
  console.log("  email:    second.campus@admin.com");
  console.log(`  password: ${SCHOOL_ADMIN_PASSWORD}`);
  console.log("\nSeed complete.\n");
  process.exit(0);
};

run().catch((err) => {
  console.error("Multi-school parent seed failed:", err);
  process.exit(1);
});
