/**
 * Import Desktop/Student Report.xlsx into school smtsanskritcollege@gmail.com.
 * Creates missing classes/sections and related lookup data as needed.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import connectDB from "../config/db.js";
import School from "../models/school.js";
import Class from "../models/class.js";
import Section from "../models/section.js";
import Student from "../models/student.js";
import { syncStudentGroups } from "../utils/groupSync.js";

const FILE = "C:/Users/pawan/OneDrive/Desktop/Student Report.xlsx";
const SCHOOL_EMAIL = "smtsanskritcollege@gmail.com";
const TARGET_CLASSES = ["6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const DEFAULT_SECTION = "A";
const ACADEMIC_YEAR = "2026-27";

const HEADER_ALIASES = {
  sr: "sr",
  "student name": "studentName",
  "student first name": "firstName",
  "student middle name": "middleName",
  "student last name": "lastName",
  admissionnumber: "admissionNumber",
  "admission number": "admissionNumber",
  "admission date": "admissionDate",
  class: "className",
  "current status": "currentStatus",
  section: "sectionName",
  "tc number": "tcNumber",
  gender: "gender",
  "date of birth": "dob",
  city: "city",
  state: "state",
  address: "address",
  pin: "pin",
  email: "email",
  "house name": "houseName",
  "student type": "studentType",
  category: "category",
  religion: "religion",
  "student adharcard no.": "aadhaar",
  "student adharcard no": "aadhaar",
  "srn no.": "srn",
  "srn no": "srn",
  "admission class": "admissionClass",
  "medical condition": "medicalCondition",
  notes: "notes",
  "father name": "fatherName",
  "father first name": "fatherFirstName",
  "father middle name": "fatherMiddleName",
  "father last name": "fatherLastName",
  "father phone": "fatherMobile",
  "mother name": "motherName",
  "mother phone": "motherMobile",
  "previous school name": "previousSchoolName",
  "previous school class": "previousSchoolClass",
  "previous school year": "previousSchoolYear",
  "new/promoted students": "newOrPromoted",
  "previous tc no.": "previousTcNo",
  "previous tc no": "previousTcNo",
  "user name": "userName",
  "user password": "userPassword",
  route: "route",
  "upgraded/nonupgraded students": "upgraded",
  "is medical history": "isMedicalHistory",
  "medical history details": "medicalHistoryDetails",
  "student apaar id": "apaarId",
  stream: "stream",
  "submitted documents": "submittedDocuments",
  "not submitted documents": "notSubmittedDocuments",
};

function excelDate(value) {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel serial date
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + value * 86400000);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const s = String(value).trim();
  if (!s) return undefined;
  // dd-mm-yyyy / dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    let yyyy = Number(m[3]);
    if (yyyy < 100) yyyy += 2000;
    const d = new Date(yyyy, mm - 1, dd);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function clean(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function splitName(full, first, middle, last) {
  const f = clean(first);
  const m = clean(middle);
  const l = clean(last);
  if (f || l || m) {
    return {
      firstName: f || clean(full).split(/\s+/)[0] || "Student",
      lastName: [m, l].filter(Boolean).join(" ") || clean(full).split(/\s+/).slice(1).join(" ") || ".",
    };
  }
  const parts = clean(full).split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "Student", lastName: "." };
  if (parts.length === 1) return { firstName: parts[0], lastName: "." };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function mapCategory(raw) {
  const v = clean(raw).toUpperCase();
  if (!v) return "General";
  if (v === "GENERAL" || v === "GEN") return "General";
  if (v === "OBC") return "OBC";
  if (v === "SC") return "SC";
  if (v === "ST") return "ST";
  if (v === "SBC" || v === "OTHER" || v === "MINORITY") return "Minority";
  return "General";
}

function mapStudentType(raw) {
  const v = clean(raw).toLowerCase();
  if (!v) return "Day Scholar";
  if (v.includes("board")) return "Boarding";
  return "Day Scholar";
}

function parseRows(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  let headerIdx = -1;
  for (let i = 0; i < Math.min(matrix.length, 20); i++) {
    const row = matrix[i].map((c) => clean(c).toLowerCase());
    if (row.includes("student name") || row.includes("admissionnumber") || row.includes("admission number")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) throw new Error("Could not find header row in Excel");

  const headers = matrix[headerIdx].map((h) => clean(h));
  const keys = headers.map((h) => HEADER_ALIASES[h.toLowerCase()] || null);

  const rows = [];
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const raw = matrix[i];
    if (!raw || raw.every((c) => clean(c) === "")) continue;
    const obj = {};
    keys.forEach((key, idx) => {
      if (!key) return;
      obj[key] = raw[idx];
    });
    // skip if no identity
    if (!clean(obj.studentName) && !clean(obj.firstName) && !clean(obj.admissionNumber)) continue;
    rows.push(obj);
  }
  return rows;
}

async function findSchool() {
  const emailRe = new RegExp(`^${SCHOOL_EMAIL.replace(".", "\\.")}$`, "i");
  let school = await School.findOne({
    $or: [{ admin_email: emailRe }, { contact_email: emailRe }],
  });
  if (school) return school;

  school = await School.findOne({
    $or: [
      { admin_email: /smtsanskritcollege/i },
      { contact_email: /smtsanskritcollege/i },
      { school_name: /taparia|surajmal|sanskrit vidhyalay|sanskrit vidyalay/i },
    ],
  });
  return school;
}

async function ensureSection(schoolId, name) {
  let section = await Section.findOne({ schoolId, name });
  if (!section) {
    section = await Section.create({
      name,
      schoolId,
      status: "Active",
    });
    console.log(`Created section ${name}`);
  }
  return section;
}

async function ensureClass(schoolId, className, section) {
  let cls = await Class.findOne({ schoolId, name: className });
  if (!cls) {
    cls = await Class.create({
      name: className,
      schoolId,
      status: "Active",
      details: [
        {
          sectionId: section._id,
          roomNumber: `${className}-${section.name}`,
          capacity: 60,
          studentCount: 0,
          subjectTeachers: [],
        },
      ],
    });
    console.log(`Created class ${className}`);
    return cls;
  }

  const hasSection = (cls.details || []).some(
    (d) => String(d.sectionId) === String(section._id),
  );
  if (!hasSection) {
    cls.details.push({
      sectionId: section._id,
      roomNumber: `${className}-${section.name}`,
      capacity: 60,
      studentCount: 0,
      subjectTeachers: [],
    });
    await cls.save();
    console.log(`Linked section ${section.name} to class ${className}`);
  }
  return cls;
}

function customField(key, label, value) {
  const v = clean(value);
  if (!v) return null;
  return { key, label, type: "text", value: v };
}

async function main() {
  await connectDB();

  const school = await findSchool();
  if (!school) {
    console.error(`School not found for ${SCHOOL_EMAIL}`);
    process.exit(1);
  }
  console.log(`School: ${school.school_name} (${school._id})`);
  console.log(`admin_email=${school.admin_email} contact_email=${school.contact_email}`);

  const section = await ensureSection(school._id, DEFAULT_SECTION);
  const classMap = new Map();
  for (const name of TARGET_CLASSES) {
    const cls = await ensureClass(school._id, name, section);
    classMap.set(name.toLowerCase(), cls);
  }

  const rows = parseRows(FILE);
  console.log(`Parsed ${rows.length} student rows`);

  const existing = await Student.find({ schoolId: school._id })
    .select("studentId aadhaarNumber studentCredentials.username firstName lastName admissionDate")
    .lean();
  const existingIds = new Set(existing.map((s) => s.studentId).filter(Boolean));
  const existingAadhaar = new Set(
    existing.map((s) => clean(s.aadhaarNumber)).filter(Boolean),
  );
  const existingUsernames = new Set(
    existing.map((s) => s.studentCredentials?.username).filter(Boolean),
  );

  let runningCount = existing.length;
  const failed = [];
  const created = [];
  const skipped = [];

  // Prefer sequential create for clearer errors + group sync
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNo = i + 1;
    try {
      const { firstName, lastName } = splitName(
        row.studentName,
        row.firstName,
        row.middleName,
        row.lastName,
      );
      const className = clean(row.className) || "6th";
      const cls = classMap.get(className.toLowerCase());
      if (!cls) {
        // create unexpected class on the fly
        const createdCls = await ensureClass(school._id, className, section);
        classMap.set(className.toLowerCase(), createdCls);
      }
      const classDoc = classMap.get(className.toLowerCase());

      const admissionNumber = clean(row.admissionNumber);
      const aadhaar = clean(row.aadhaar).replace(/\s+/g, "");
      const statusRaw = clean(row.currentStatus).toLowerCase();
      const isActive = !(
        statusRaw.includes("inactive") ||
        statusRaw.includes("tc") ||
        statusRaw.includes("transfer")
      );

      // Dedup by admissionNumber as studentId, or aadhaar
      const preferredId = admissionNumber
        ? `ADM${admissionNumber}`
        : null;

      if (preferredId && existingIds.has(preferredId)) {
        skipped.push({ row: rowNo, reason: `duplicate studentId ${preferredId}`, name: `${firstName} ${lastName}` });
        continue;
      }
      if (aadhaar && existingAadhaar.has(aadhaar)) {
        skipped.push({ row: rowNo, reason: `duplicate aadhaar ${aadhaar}`, name: `${firstName} ${lastName}` });
        continue;
      }

      runningCount += 1;
      let studentId = preferredId || `STU${String(runningCount).padStart(4, "0")}`;
      while (existingIds.has(studentId) || existingUsernames.has(studentId)) {
        runningCount += 1;
        studentId = `STU${String(runningCount).padStart(4, "0")}`;
      }

      const rawPassword =
        clean(row.userPassword) ||
        (excelDate(row.dob)
          ? excelDate(row.dob)
              .toLocaleDateString("en-GB")
              .replace(/\//g, "")
              .slice(0, 6)
          : "Student@123");
      const hashedPassword = await bcrypt.hash(String(rawPassword), 8);

      const fatherMobile = clean(row.fatherMobile) || clean(row.userName) || "";
      const motherMobile = clean(row.motherMobile) || "";
      const fatherName =
        clean(row.fatherName) ||
        [row.fatherFirstName, row.fatherMiddleName, row.fatherLastName]
          .map(clean)
          .filter(Boolean)
          .join(" ");

      const addressParts = [clean(row.address), clean(row.city), clean(row.state), clean(row.pin)]
        .filter(Boolean)
        .join(", ");

      const customFields = [
        customField("religion", "Religion", row.religion),
        customField("srnNo", "SRN No.", row.srn),
        customField("city", "City", row.city),
        customField("state", "State", row.state),
        customField("pin", "PIN", row.pin),
        customField("email", "Email", row.email),
        customField("tcNumber", "TC Number", row.tcNumber),
        customField("admissionClass", "Admission Class", row.admissionClass),
        customField("notes", "Notes", row.notes),
        customField("apaarId", "Student APAAR Id", row.apaarId),
        customField("route", "Route", row.route),
        customField("newOrPromoted", "New/Promoted", row.newOrPromoted),
        customField("submittedDocuments", "Submitted Documents", row.submittedDocuments),
        customField("notSubmittedDocuments", "Not Submitted Documents", row.notSubmittedDocuments),
        customField("previousSchoolYear", "Previous School Year", row.previousSchoolYear),
        customField("sourceAdmissionNumber", "Source Admission Number", admissionNumber),
      ].filter(Boolean);

      const medical =
        [clean(row.medicalCondition), clean(row.medicalHistoryDetails)]
          .filter(Boolean)
          .join(" | ");

      const feeBatch =
        clean(row.newOrPromoted).toLowerCase().includes("new") ? "New" : "Old";

      const doc = {
        firstName,
        lastName,
        dob: excelDate(row.dob),
        gender: clean(row.gender) || undefined,
        admissionDate: excelDate(row.admissionDate),
        category: mapCategory(row.category),
        community: mapCategory(row.category) === "Minority" ? clean(row.category) : "",
        aadhaarNumber: aadhaar,
        confirmationStatus: "Confirmed",
        isActive,
        medicalConditionRemarks: medical,
        fatherName,
        fatherMobile,
        fatherEmail: "",
        motherName: clean(row.motherName),
        motherMobile,
        motherEmail: "",
        address: addressParts,
        previousSchoolName: clean(row.previousSchoolName),
        previousSchoolClass: clean(row.previousSchoolClass),
        previousSchoolTcNumber: clean(row.previousTcNo),
        classId: classDoc._id,
        sectionId: section._id,
        stream: clean(row.stream),
        rollNo: admissionNumber || "",
        studentType: mapStudentType(row.studentType),
        feeBatch,
        totalFee: 0,
        discountType: "",
        discountValue: 0,
        finalFee: 0,
        totalPaid: 0,
        totalDue: 0,
        feeFrequency: "annually",
        schoolId: school._id,
        academicYear: ACADEMIC_YEAR,
        studentId,
        customFields,
        studentCredentials: {
          username: studentId,
          password: hashedPassword,
          temp_password: String(rawPassword),
          firstTimeLogin: true,
        },
        parentCredentials: {
          username: fatherMobile || studentId,
          password: hashedPassword,
          temp_password: String(rawPassword),
          firstTimeLogin: true,
        },
      };

      const student = await Student.create(doc);
      existingIds.add(studentId);
      existingUsernames.add(studentId);
      if (aadhaar) existingAadhaar.add(aadhaar);

      try {
        await syncStudentGroups(student);
      } catch (err) {
        console.warn(`group sync failed ${studentId}:`, err.message);
      }

      // bump class section studentCount lightly
      try {
        const detail = classDoc.details?.find(
          (d) => String(d.sectionId) === String(section._id),
        );
        if (detail) {
          detail.studentCount = (detail.studentCount || 0) + 1;
          await Class.updateOne(
            { _id: classDoc._id, "details.sectionId": section._id },
            { $inc: { "details.$.studentCount": 1 } },
          );
        }
      } catch {
        /* ignore count errors */
      }

      created.push({
        row: rowNo,
        studentId,
        name: `${firstName} ${lastName}`,
        className,
        isActive,
      });
      if (created.length % 50 === 0) {
        console.log(`… imported ${created.length}/${rows.length}`);
      }
    } catch (err) {
      failed.push({
        row: rowNo,
        name: clean(row.studentName) || clean(row.firstName),
        error: err.message,
      });
    }
  }

  console.log("==== DONE ====");
  console.log(`created=${created.length} skipped=${skipped.length} failed=${failed.length}`);
  if (failed.length) {
    console.log("failed sample", JSON.stringify(failed.slice(0, 10), null, 2));
  }
  if (skipped.length) {
    console.log("skipped sample", JSON.stringify(skipped.slice(0, 10), null, 2));
  }

  const activeCount = await Student.countDocuments({ schoolId: school._id, isActive: true });
  const totalCount = await Student.countDocuments({ schoolId: school._id });
  console.log(`school totals: active=${activeCount} all=${totalCount}`);

  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.connection.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
