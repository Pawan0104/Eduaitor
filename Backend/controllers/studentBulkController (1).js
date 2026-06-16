import XLSX from "xlsx";
import bcrypt from "bcryptjs";
import Student from "../models/student.js";
import Class from "../models/class.js";
// NOTE: adjust this import path/filename if your Section model lives elsewhere.
import Section from "../models/section.js";
import { syncStudentGroups } from "../utils/groupSync.js";

/* ================= TEMPLATE ================= */

// Keep this list in sync with the fields read in bulkUploadStudents below.
const TEMPLATE_HEADERS = [
  "firstName",
  "lastName",
  "dob",
  "gender",
  "bloodGroup",
  "admissionDate",
  "fatherName",
  "fatherMobile",
  "fatherEmail",
  "motherName",
  "motherMobile",
  "motherEmail",
  "guardianName",
  "guardianMobile",
  "guardianRelation",
  "address",
  "className",
  "sectionName",
  "rollNo",
  "studentType",
  "totalFee",
  "discountType",
  "discountValue",
  "finalFee",
  "feeFrequency",
  "password",
];

export const downloadStudentTemplate = (req, res) => {
  try {
    const sampleRow = {
      firstName: "John",
      lastName: "Doe",
      dob: "2012-05-21",
      gender: "Male",
      bloodGroup: "O+",
      admissionDate: "2024-04-01",
      fatherName: "Richard Doe",
      fatherMobile: "9876543210",
      fatherEmail: "richard@example.com",
      motherName: "Jane Doe",
      motherMobile: "9876500000",
      motherEmail: "jane@example.com",
      guardianName: "",
      guardianMobile: "",
      guardianRelation: "",
      address: "123 Main Street",
      className: "Class 5", // must match an existing class name for this school
      sectionName: "A", // must match an existing section name for this school
      rollNo: "21",
      studentType: "Day Scholar",
      totalFee: 50000,
      discountType: "",
      discountValue: 0,
      finalFee: 50000,
      feeFrequency: "annually",
      password: "Welcome@123", // optional — defaults to Student@123 if left blank
    };

    const worksheet = XLSX.utils.json_to_sheet([sampleRow], {
      header: TEMPLATE_HEADERS,
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=student_bulk_upload_template.xlsx",
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.send(buffer);
  } catch (error) {
    console.error("Template download error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate template",
    });
  }
};

/* ================= HELPERS ================= */

// Builds name -> ObjectId lookup maps so each row doesn't hit the DB separately.
// Adjust the field names here (name / className / sectionName) to match your schema.
const buildLookupMaps = async (schoolId) => {
  const [classes, sections] = await Promise.all([
    Class.find({ schoolId }),
    Section.find({ schoolId }),
  ]);

  const classMap = new Map();
  classes.forEach((c) => {
    const key = (c.name || c.className || "").trim().toLowerCase();
    if (key) classMap.set(key, c._id);
  });

  const sectionMap = new Map();
  sections.forEach((s) => {
    const key = (s.name || s.sectionName || "").trim().toLowerCase();
    if (key) sectionMap.set(key, s._id);
  });

  return { classMap, sectionMap };
};

const normalizeRow = (row) => {
  const cleaned = {};
  Object.keys(row).forEach((key) => {
    const value = row[key];
    cleaned[key.trim()] = typeof value === "string" ? value.trim() : value;
  });
  return cleaned;
};

const toExcelSafeDate = (value) => {
  if (!value) return undefined;
  // xlsx with cellDates:true already gives JS Date objects for real date cells.
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

/* ================= BULK UPLOAD ================= */

export const bulkUploadStudents = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    let rows;
    try {
      const workbook = XLSX.read(req.file.buffer, {
        type: "buffer",
        cellDates: true,
      });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message:
          "Could not read the uploaded file. Please use the provided template (.xlsx, .xls, or .csv).",
      });
    }

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "The uploaded file has no data rows",
      });
    }

    const { classMap, sectionMap } = await buildLookupMaps(schoolId);

    // Existing usernames for this school, so generated studentIds never collide.
    const existingStudents = await Student.find({ schoolId }).select(
      "studentCredentials.username",
    );
    const existingUsernames = new Set(
      existingStudents
        .map((s) => s.studentCredentials?.username)
        .filter(Boolean),
    );

    let runningCount = await Student.countDocuments({ schoolId });

    const failed = [];
    const docsToInsert = [];
    const rowNumbersForDocs = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // header occupies row 1 in the spreadsheet
      const row = normalizeRow(rows[i]);
      const errors = [];

      if (!row.firstName) errors.push("firstName is required");
      if (!row.lastName) errors.push("lastName is required");

      let classId = null;
      let sectionId = null;

      if (row.className) {
        classId = classMap.get(String(row.className).toLowerCase());
        if (!classId) errors.push(`Class "${row.className}" was not found`);
      }

      if (row.sectionName) {
        sectionId = sectionMap.get(String(row.sectionName).toLowerCase());
        if (!sectionId)
          errors.push(`Section "${row.sectionName}" was not found`);
      }

      if (errors.length) {
        failed.push({ row: rowNumber, data: row, errors });
        continue;
      }

      runningCount += 1;
      const studentId = `STU${String(runningCount).padStart(4, "0")}`;

      if (existingUsernames.has(studentId)) {
        failed.push({
          row: rowNumber,
          data: row,
          errors: ["Generated username already exists — please retry"],
        });
        continue;
      }
      existingUsernames.add(studentId);

      const rawPassword = row.password
        ? String(row.password).trim()
        : "Student@123";
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      const totalFee = Number(row.totalFee) || 0;
      const finalFee = Number(row.finalFee) || totalFee;

      docsToInsert.push({
        firstName: row.firstName,
        lastName: row.lastName,
        dob: toExcelSafeDate(row.dob),
        gender: row.gender || undefined,
        bloodGroup: row.bloodGroup || undefined,
        admissionDate: toExcelSafeDate(row.admissionDate),
        fatherName: row.fatherName || "",
        fatherMobile: row.fatherMobile ? String(row.fatherMobile) : "",
        fatherEmail: row.fatherEmail || "",
        motherName: row.motherName || "",
        motherMobile: row.motherMobile ? String(row.motherMobile) : "",
        motherEmail: row.motherEmail || "",
        guardianName: row.guardianName || "",
        guardianMobile: row.guardianMobile ? String(row.guardianMobile) : "",
        guardianRelation: row.guardianRelation || "",
        address: row.address || "",
        classId,
        sectionId,
        rollNo: row.rollNo ? String(row.rollNo) : "",
        studentType: row.studentType || "",
        totalFee,
        discountType: row.discountType || "",
        discountValue: Number(row.discountValue) || 0,
        finalFee,
        totalPaid: 0,
        totalDue: finalFee,
        feeFrequency: row.feeFrequency || "annually",
        schoolId,
        studentId,
        studentCredentials: {
          username: studentId,
          password: hashedPassword,
          temp_password: rawPassword,
          firstTimeLogin: true,
        },
        parentCredentials: {
          username: row.fatherMobile ? String(row.fatherMobile) : "",
          password: hashedPassword,
          temp_password: rawPassword,
          firstTimeLogin: true,
        },
      });
      rowNumbersForDocs.push(rowNumber);
    }

    let insertedDocs = [];

    if (docsToInsert.length) {
      try {
        insertedDocs = await Student.insertMany(docsToInsert, {
          ordered: false,
        });
      } catch (bulkError) {
        // With ordered:false, valid documents are still inserted even though
        // the call throws because some documents failed.
        insertedDocs = bulkError.insertedDocs || [];

        const failedIndexes = new Set(
          (bulkError.writeErrors || []).map((e) => e.index),
        );

        docsToInsert.forEach((doc, idx) => {
          if (failedIndexes.has(idx)) {
            failed.push({
              row: rowNumbersForDocs[idx],
              data: { firstName: doc.firstName, lastName: doc.lastName },
              errors: ["This row could not be saved — it may be a duplicate"],
            });
          }
        });
      }
    }

    const created = [];
    for (const student of insertedDocs) {
      created.push({
        studentId: student.studentId,
        name: `${student.firstName} ${student.lastName}`,
      });

      try {
        await syncStudentGroups(student);
      } catch (err) {
        console.error("Group sync failed for", student.studentId, err);
      }
    }

    res.status(201).json({
      success: true,
      message: `${created.length} student(s) created, ${failed.length} row(s) failed`,
      createdCount: created.length,
      failedCount: failed.length,
      created,
      failed,
    });
  } catch (error) {
    console.error("Bulk upload students error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to bulk upload students",
    });
  }
};
