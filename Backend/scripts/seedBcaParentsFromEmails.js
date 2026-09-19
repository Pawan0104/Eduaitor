/**
 * Add parents (via dummy students) to school "BCA" and email login credentials.
 * Usage: node scripts/seedBcaParentsFromEmails.js
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
import { notifyCredentials } from "../services/credentials/notifyCredentials.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const SHARED_PASSWORD = "#Parent@2026";
const CLASS_NAME = "Class 1";

const PARENT_EMAILS = [
  "aryaeduhub@gmail.com",
  "basant181442@gmail.com",
  "coolpawant09@gmail.com",
  "kanta456sharma@gmail.com",
  "kgupta112511@gmail.com",
  "nexbigstep@gmail.com",
  "pawan.eduaitor@gmail.com",
  "rishitiwari1286@gmail.com",
  "shilpaverma1212@gmail.com",
  "sonusrivastava1512@gmail.com",
  "suveers6886@gmail.com",
  "suveersamsung@gmail.com",
];

const FIRST_NAMES = [
  "Aarav",
  "Anaya",
  "Vivaan",
  "Diya",
  "Kabir",
  "Myra",
  "Reyansh",
  "Ira",
  "Advait",
  "Kiara",
  "Shaurya",
  "Aanya",
];

const LAST_NAMES = [
  "Sharma",
  "Verma",
  "Gupta",
  "Singh",
  "Patel",
  "Mehta",
  "Joshi",
  "Tiwari",
  "Yadav",
  "Srivastava",
  "Khan",
  "Malhotra",
];

function titleFromEmail(email) {
  const local = String(email).split("@")[0] || "Parent";
  const cleaned = local
    .replace(/[._0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Parent Guardian";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function buildRows() {
  return PARENT_EMAILS.map((email, idx) => {
    const fatherName = titleFromEmail(email);
    const mobile = `98765${String(10000 + idx).slice(-5)}`;
    const firstName = FIRST_NAMES[idx % FIRST_NAMES.length];
    const lastName = LAST_NAMES[idx % LAST_NAMES.length];
    const gender = idx % 2 === 0 ? "Male" : "Female";
    const bloods = ["A+", "B+", "O+", "AB+", "A-", "B-"];
    const year = 2017 + (idx % 5);
    const month = String((idx % 12) + 1).padStart(2, "0");
    const day = String((idx % 27) + 1).padStart(2, "0");

    return {
      email,
      firstName,
      lastName,
      className: CLASS_NAME,
      gender,
      bloodGroup: bloods[idx % bloods.length],
      dob: `${year}-${month}-${day}`,
      fatherName,
      fatherMobile: mobile,
      fatherEmail: email,
      motherName: "Parent Guardian",
      motherMobile: mobile,
      motherEmail: email,
      address: `${120 + idx}, Demo Colony, Jaipur, Rajasthan 302017`,
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302017",
      aadhaarNumber: `9999${String(100000000 + idx).slice(-8)}`,
      rollNo: String(40 + idx),
      password: SHARED_PASSWORD,
    };
  });
}

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
  return `BCA${String(count + 1).padStart(4, "0")}`;
}

async function upsertOne(schoolId, data, classId, sectionId) {
  const existing = await Student.findOne({
    schoolId,
    fatherEmail: data.fatherEmail,
    firstName: data.firstName,
    lastName: data.lastName,
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
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    aadhaarNumber: data.aadhaarNumber,
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
    // Keep existing mobile if already created for this email+child, else use new
    if (existing.fatherMobile) {
      payload.fatherMobile = existing.fatherMobile;
      payload.motherMobile = existing.fatherMobile;
      payload.parentCredentials.username = existing.parentCredentials?.username || existing.fatherMobile;
    }
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
    (await School.findOne({ school_name: { $regex: /^BCA$/i } })) ||
    (await School.findOne({ school_name: { $regex: /Bright Children Academy/i } })) ||
    (await School.findOne({ school_name: { $regex: /\bBCA\b/i } })) ||
    (await School.findOne({ school_name: { $regex: /BCA/i } }));

  if (!school) {
    const names = await School.find({}).select("school_name").lean();
    console.error(
      "School BCA not found. Existing:",
      names.map((s) => s.school_name).join(", "),
    );
    process.exit(1);
  }

  console.log("School:", school.school_name, String(school._id));

  const section = await ensureSection(school._id, "A");
  const cls = await ensureClass(school._id, CLASS_NAME, section._id);
  const rows = buildRows();
  const results = [];

  for (const row of rows) {
    const { student, created } = await upsertOne(
      school._id,
      row,
      cls._id,
      section._id,
    );

    const parentUser = student.parentCredentials?.username || student.fatherMobile;
    const parentPass =
      student.parentCredentials?.temp_password || row.password;
    const studentUser = student.studentCredentials?.username || student.studentId;
    const studentPass =
      student.studentCredentials?.temp_password || row.password;

    const mail = await notifyCredentials({
      role: "parent",
      name: student.fatherName || "Parent",
      username: parentUser,
      password: parentPass,
      emails: [row.email],
      mobile: parentUser,
      schoolName: school.school_name,
      credentialBlocks: [
        { title: "Parent login", username: parentUser, password: parentPass },
        { title: "Student login", username: studentUser, password: studentPass },
      ],
      extraLines: [
        `Student: ${student.firstName} ${student.lastName}`,
        `Admission ID: ${student.studentId}`,
        `Class: ${cls.name} · Section A`,
        "Portal: Parent login → use mobile number as username",
      ],
    });

    results.push({
      created,
      email: row.email,
      name: `${student.firstName} ${student.lastName}`,
      studentId: student.studentId,
      parentUser,
      parentPass,
      studentUser,
      studentPass,
      mailSent: Boolean(mail?.email?.sent),
      mailSkip: Boolean(mail?.email?.skipped),
      mailError: mail?.email?.error || mail?.email?.reason || "",
    });

    console.log(
      `${created ? "CREATED" : "UPDATED"} ${row.email} → parent ${parentUser} / mail=${mail?.email?.sent ? "SENT" : mail?.email?.skipped ? "SKIPPED" : "FAIL"}`,
    );
  }

  console.log("\n=== Summary ===");
  for (const r of results) {
    console.log(
      `${r.email} | ${r.studentId} | parent=${r.parentUser} pass=${r.parentPass} | mail=${r.mailSent ? "SENT" : r.mailError || "no"}`,
    );
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
