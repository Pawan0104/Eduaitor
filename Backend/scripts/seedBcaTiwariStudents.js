/**
 * One-off: add 3 Tiwari students to school "BCA".
 * Usage: node scripts/seedBcaTiwariStudents.js
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { resolveSrv, resolveTxt } from "dns/promises";
import { URL } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import School from "../models/school.js";
import Class from "../models/class.js";
import Section from "../models/section.js";
import Student from "../models/student.js";
import { resolveParentCredentialsForCreate } from "../utils/parentChildren.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const expandSrvUri = async (uri) => {
  const parsed = new URL(uri);
  const srvRecords = await resolveSrv(`_mongodb._tcp.${parsed.hostname}`);
  const txtRecords = await resolveTxt(parsed.hostname);
  const hosts = srvRecords.map((r) => `${r.name}:${r.port}`).join(",");
  const params = new URLSearchParams(parsed.search);
  for (const txtEntry of txtRecords.flat()) {
    for (const pair of txtEntry.split("&")) {
      const i = pair.indexOf("=");
      if (i > 0 && !params.has(pair.slice(0, i))) {
        params.set(pair.slice(0, i), pair.slice(i + 1));
      }
    }
  }
  const auth = `${encodeURIComponent(parsed.username)}:${encodeURIComponent(parsed.password)}@`;
  const db = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
  const query = params.toString();
  return `mongodb://${auth}${hosts}${db}${query ? `?${query}` : ""}`;
};

const connectMongo = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI missing");
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 25000,
      tlsAllowInvalidHostnames: true,
    });
  } catch (err) {
    const expanded = await expandSrvUri(uri);
    await mongoose.connect(expanded, {
      serverSelectionTimeoutMS: 25000,
      tlsAllowInvalidHostnames: true,
    });
    console.warn("Connected via expanded SRV after:", err.message);
  }
  console.log("MongoDB connected");
};

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

async function ensureSection(schoolId, name = "A") {
  return Section.findOneAndUpdate(
    { schoolId, name },
    { $set: { status: "Active" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function ensureClass(schoolId, className, sectionId) {
  let cls = await Class.findOne({ schoolId, name: className });
  if (!cls) {
    // fuzzy match existing
    const all = await Class.find({ schoolId }).lean();
    const want = norm(className);
    cls = all.find((c) => {
      const n = norm(c.name);
      return n === want || n.includes(want) || want.includes(n);
    });
    if (cls) cls = await Class.findById(cls._id);
  }
  if (!cls) {
    cls = await Class.create({
      schoolId,
      name: className,
      status: "Active",
      details: [
        {
          sectionId,
          roomNumber: "101",
          capacity: 40,
          studentCount: 0,
          subjectTeachers: [],
        },
      ],
    });
    console.log("Created class:", className);
  } else {
    const hasSection = (cls.details || []).some(
      (d) => String(d.sectionId) === String(sectionId),
    );
    if (!hasSection) {
      cls.details = cls.details || [];
      cls.details.push({
        sectionId,
        roomNumber: "101",
        capacity: 40,
        studentCount: 0,
        subjectTeachers: [],
      });
      await cls.save();
    }
    console.log("Using class:", cls.name);
  }
  return cls;
}

async function nextStudentId(schoolId) {
  const count = await Student.countDocuments({ schoolId });
  const prefix = "BCA";
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

const STUDENTS = [
  {
    firstName: "Yuvraj",
    lastName: "Tiwari",
    className: "4",
    gender: "Male",
    bloodGroup: "B+",
    dob: "2016-05-10",
    fatherName: "Rajesh Tiwari",
    fatherMobile: "9001327232",
    fatherEmail: "kgupta112511@gmail.com",
    motherName: "Monya Devi",
    motherMobile: "9001327232",
    motherEmail: "kgupta112511@gmail.com",
    address: "Rampura Aguncha, Bhilwara",
    rollNo: "1",
    password: "#Yuvraj@2026",
  },
  {
    firstName: "Avni",
    lastName: "Tiwari",
    className: "LKG",
    gender: "Female",
    bloodGroup: "A+",
    dob: "2021-08-15",
    fatherName: "Rajesh Tiwari",
    fatherMobile: "9001327232",
    fatherEmail: "kgupta112511@gmail.com",
    motherName: "Monya Devi",
    motherMobile: "9001327232",
    motherEmail: "kgupta112511@gmail.com",
    address: "Rampura Aguncha, Bhilwara",
    rollNo: "1",
    password: "#Avni@2026",
  },
  {
    firstName: "Bhawin",
    lastName: "Tiwari",
    className: "1", // class not specified — default Class 1
    gender: "Male",
    bloodGroup: "O+",
    dob: "2018-03-20",
    fatherName: "Pawan Tiwari",
    fatherMobile: "9784840104",
    fatherEmail: "kgupta112511@gmail.com",
    motherName: "Laxmi Sharma",
    motherMobile: "9784840104",
    motherEmail: "kgupta112511@gmail.com",
    address: "Rampura Aguncha, Bhilwara",
    rollNo: "1",
    password: "#Bhawin@2026",
  },
];

async function upsertOne(schoolId, data, classId, sectionId) {
  const existing = await Student.findOne({
    schoolId,
    firstName: data.firstName,
    lastName: data.lastName,
    fatherMobile: data.fatherMobile,
  });

  const hashedStudent = await bcrypt.hash(data.password, 10);
  const parentCreds = await resolveParentCredentialsForCreate({
    schoolId,
    fatherMobile: data.fatherMobile,
    hashedPassword: hashedStudent,
    rawPassword: data.password,
  });

  const studentId = existing?.studentId || (await nextStudentId(schoolId));

  const payload = {
    firstName: data.firstName,
    lastName: data.lastName,
    gender: data.gender,
    bloodGroup: data.bloodGroup,
    dob: new Date(data.dob),
    admissionDate: new Date("2025-04-01"),
    fatherName: data.fatherName,
    fatherMobile: data.fatherMobile,
    fatherEmail: data.fatherEmail,
    motherName: data.motherName,
    motherMobile: data.motherMobile,
    motherEmail: data.motherEmail,
    address: data.address,
    classId,
    sectionId,
    rollNo: data.rollNo,
    studentType: "Day Scholar",
    previousSchoolName: "N/A",
    previousSchoolClass: "N/A",
    previousSchoolResult: "Pass",
    selectedOptionalFees: [],
    busFeeFrequency: "annually",
    busFeeQuarter: "",
    totalFee: 12000,
    discountType: "",
    discountValue: 0,
    finalFee: 12000,
    totalPaid: 0,
    totalDue: 12000,
    feeFrequency: "annually",
    schoolId,
    studentId,
    idCardIssuedAt: new Date(),
    studentCredentials: {
      username: studentId,
      password: hashedStudent,
      temp_password: data.password,
      firstTimeLogin: true,
    },
    parentCredentials: {
      username: parentCreds.username || data.fatherMobile,
      password: parentCreds.password,
      temp_password: parentCreds.temp_password || data.password,
      firstTimeLogin: parentCreds.firstTimeLogin ?? true,
    },
  };

  if (existing) {
    existing.set(payload);
    await existing.save();
    return { student: existing, created: false };
  }

  const student = await Student.create(payload);
  return { student, created: true };
}

const run = async () => {
  await connectMongo();

  const school =
    (await School.findOne({
      school_name: { $regex: /^BCA$/i },
    })) ||
    (await School.findOne({
      school_name: { $regex: /Bright Children Academy/i },
    })) ||
    (await School.findOne({
      school_name: { $regex: /\bBCA\b/i },
    })) ||
    (await School.findOne({
      school_name: { $regex: /BCA/i },
    }));

  if (!school) {
    const names = await School.find({}).select("school_name admin_email").lean();
    console.error(
      "School BCA not found. Existing:",
      names.map((s) => s.school_name).join(", "),
    );
    process.exit(1);
  }

  console.log("School:", school.school_name, String(school._id));

  const section = await ensureSection(school._id, "A");
  const classMap = {};
  for (const name of ["4", "LKG", "1"]) {
    classMap[name] = await ensureClass(school._id, name === "4" || name === "1" ? `Class ${name}` : name, section._id);
  }

  // Also try matching bare "4" / "1" if Class N was created as just the number
  for (const name of ["4", "1", "LKG"]) {
    if (!classMap[name]) {
      classMap[name] = await ensureClass(school._id, name, section._id);
    }
  }

  const results = [];
  for (const row of STUDENTS) {
    let cls = classMap[row.className];
    if (!cls) {
      const label =
        row.className === "LKG" ? "LKG" : `Class ${row.className}`;
      cls = await ensureClass(school._id, label, section._id);
    }
    const { student, created } = await upsertOne(
      school._id,
      row,
      cls._id,
      section._id,
    );
    results.push({
      created,
      name: `${student.firstName} ${student.lastName}`,
      studentId: student.studentId,
      class: cls.name,
      parentUser: student.parentCredentials?.username,
      parentPass: student.parentCredentials?.temp_password,
      studentUser: student.studentCredentials?.username,
      studentPass: student.studentCredentials?.temp_password,
    });
  }

  console.log("\nDone:");
  for (const r of results) {
    console.log(
      `${r.created ? "CREATED" : "UPDATED"} ${r.name} (${r.studentId}) class=${r.class} parent=${r.parentUser}/${r.parentPass} student=${r.studentUser}/${r.studentPass}`,
    );
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
