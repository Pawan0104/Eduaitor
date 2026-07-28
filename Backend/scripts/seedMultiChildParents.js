/**
 * Seed two multi-child parent accounts on Default School for testing child switcher.
 *
 *   cd Backend
 *   node scripts/seedMultiChildParents.js
 */
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import School from "../models/school.js";
import Class from "../models/class.js";
import Section from "../models/section.js";
import Student from "../models/student.js";
import { ensureParentUsernameIndex } from "../config/db.js";

dotenv.config();

const PARENT_PASSWORD = "#multi@parent123";
const STUDENT_PASSWORD = "#multi@student123";

const PARENTS = [
  {
    fatherName: "Ramesh Gupta",
    fatherMobile: "9000001001",
    fatherEmail: "ramesh.gupta@example.com",
    motherName: "Sunita Gupta",
    motherMobile: "9000001002",
    address: "14 Lake View Colony, Indore",
    children: [
      {
        firstName: "Arjun",
        lastName: "Gupta",
        gender: "Male",
        rollNo: "MC11",
        studentUsername: "arjun.gupta@multi.test",
        studentIdHint: "MULTI1001",
      },
      {
        firstName: "Anvi",
        lastName: "Gupta",
        gender: "Female",
        rollNo: "MC12",
        studentUsername: "anvi.gupta@multi.test",
        studentIdHint: "MULTI1002",
      },
      {
        firstName: "Kabir",
        lastName: "Gupta",
        gender: "Male",
        rollNo: "MC13",
        studentUsername: "kabir.gupta@multi.test",
        studentIdHint: "MULTI1003",
      },
    ],
  },
  {
    fatherName: "Suresh Patel",
    fatherMobile: "9000002001",
    fatherEmail: "suresh.patel@example.com",
    motherName: "Meena Patel",
    motherMobile: "9000002002",
    address: "88 Ring Road, Indore",
    children: [
      {
        firstName: "Ishaan",
        lastName: "Patel",
        gender: "Male",
        rollNo: "MC21",
        studentUsername: "ishaan.patel@multi.test",
        studentIdHint: "MULTI2001",
      },
      {
        firstName: "Diya",
        lastName: "Patel",
        gender: "Female",
        rollNo: "MC22",
        studentUsername: "diya.patel@multi.test",
        studentIdHint: "MULTI2002",
      },
    ],
  },
];

const hash = (p) => bcrypt.hash(p, 10);

async function resolveClassSection(schoolId) {
  let klass =
    (await Class.findOne({ schoolId, name: /test class/i })) ||
    (await Class.findOne({ schoolId }).sort({ createdAt: 1 }));

  if (!klass) {
    klass = await Class.create({
      schoolId,
      name: "Test Class",
      className: "Test Class",
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
  parent,
  child,
  parentHash,
}) {
  const studentHash = await hash(STUDENT_PASSWORD);

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
  student.fatherName = parent.fatherName;
  student.fatherMobile = parent.fatherMobile;
  student.fatherEmail = parent.fatherEmail;
  student.motherName = parent.motherName;
  student.motherMobile = parent.motherMobile;
  student.address = parent.address;
  student.studentType = "Day Scholar";
  student.admissionDate = student.admissionDate || new Date("2024-04-01");
  student.dob = student.dob || new Date("2015-06-15");
  student.bloodGroup = student.bloodGroup || "B+";
  student.studentCredentials = {
    username: child.studentUsername,
    password: studentHash,
    temp_password: STUDENT_PASSWORD,
    firstTimeLogin: false,
  };
  student.parentCredentials = {
    username: parent.fatherMobile,
    password: parentHash,
    temp_password: PARENT_PASSWORD,
    firstTimeLogin: false,
  };

  await student.save();
  return student;
}

const run = async () => {
  await connectDB();
  await ensureParentUsernameIndex();

  const school =
    (await School.findOne({ admin_email: "school@admin.com" })) ||
    (await School.findOne({ slug: "default-school" }));

  if (!school) {
    throw new Error(
      "Default School not found. Run seedQaTestUsers.js or start the server once first.",
    );
  }

  const { klass, section } = await resolveClassSection(school._id);
  const results = [];

  for (const parent of PARENTS) {
    const parentHash = await hash(PARENT_PASSWORD);
    const kids = [];
    for (const child of parent.children) {
      const doc = await upsertChild({
        schoolId: school._id,
        klass,
        section,
        parent,
        child,
        parentHash,
      });
      kids.push({
        name: `${doc.firstName} ${doc.lastName}`,
        studentId: doc.studentId,
        studentLogin: child.studentUsername,
        _id: doc._id.toString(),
      });
    }
    results.push({
      fatherName: parent.fatherName,
      mobile: parent.fatherMobile,
      password: PARENT_PASSWORD,
      children: kids,
    });
  }

  console.log("\n========== MULTI-CHILD PARENT TEST LOGINS ==========\n");
  console.log("School:", school.school_name, `(${school._id})`);
  console.log("Class:", klass.name || klass.className, "/ Section:", section.name || section.sectionName);
  console.log("");

  for (const [i, row] of results.entries()) {
    console.log(`Parent ${i + 1}: ${row.fatherName}`);
    console.log(`  Login (father mobile): ${row.mobile}`);
    console.log(`  Password:              ${row.password}`);
    console.log(`  Children (${row.children.length}):`);
    for (const c of row.children) {
      console.log(`    - ${c.name}  [${c.studentId}]  id=${c._id}`);
      console.log(`      student login: ${c.studentLogin} / ${STUDENT_PASSWORD}`);
    }
    console.log("");
  }

  console.log("How to test:");
  console.log("  1. Open parent login");
  console.log("  2. Use either mobile + password above");
  console.log("  3. On Parent Menu, switch Active child and check fees/attendance\n");

  process.exit(0);
};

run().catch((err) => {
  console.error("Multi-child seed failed:", err);
  process.exit(1);
});
