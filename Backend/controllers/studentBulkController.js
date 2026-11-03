import XLSX from "xlsx";
import bcrypt from "bcryptjs";
import Student from "../models/student.js";
import Class from "../models/class.js";
// NOTE: adjust this import path/filename if your Section model lives elsewhere.
import Section from "../models/section.js";
import { syncStudentGroups } from "../utils/groupSync.js";
import School from "../models/school.js";
import { notifyCredentialsAsync } from "../services/credentials/notifyCredentials.js";

/* ================= TEMPLATE ================= */

// Keep this list in sync with the fields read in bulkUploadStudents below.
const TEMPLATE_FIELDS = [
  { key: "firstName", label: "First Name", required: true, sample: "John" },
  { key: "lastName", label: "Last Name", required: true, sample: "Doe" },
  { key: "dob", label: "Date of Birth", required: false, sample: "2012-05-21" },
  { key: "gender", label: "Gender", required: false, sample: "Male" },
  { key: "bloodGroup", label: "Blood Group", required: false, sample: "O+" },
  {
    key: "admissionDate",
    label: "Admission Date",
    required: false,
    sample: "2024-04-01",
  },
  {
    key: "fatherName",
    label: "Father Name",
    required: false,
    sample: "Richard Doe",
  },
  {
    key: "fatherMobile",
    label: "Father Mobile",
    required: false,
    sample: "9876543210",
  },
  {
    key: "fatherEmail",
    label: "Father Email",
    required: false,
    sample: "richard@example.com",
  },
  {
    key: "motherName",
    label: "Mother Name",
    required: false,
    sample: "Jane Doe",
  },
  {
    key: "motherMobile",
    label: "Mother Mobile",
    required: false,
    sample: "9876500000",
  },
  {
    key: "motherEmail",
    label: "Mother Email",
    required: false,
    sample: "jane@example.com",
  },
  {
    key: "guardianName",
    label: "Guardian Name",
    required: false,
    sample: "",
  },
  {
    key: "guardianMobile",
    label: "Guardian Mobile",
    required: false,
    sample: "",
  },
  {
    key: "guardianRelation",
    label: "Guardian Relation",
    required: false,
    sample: "",
  },
  {
    key: "address",
    label: "Address",
    required: false,
    sample: "123 Main Street",
  },
  {
    key: "className",
    label: "Class Name",
    required: false,
    sample: "5",
  },
  {
    key: "sectionName",
    label: "Section Name",
    required: false,
    sample: "A",
  },
  { key: "rollNo", label: "Roll No", required: false, sample: "21" },
  {
    key: "studentType",
    label: "Student Type",
    required: false,
    sample: "Day Scholar",
  },
  { key: "totalFee", label: "Total Fee", required: false, sample: 50000 },
  {
    key: "discountType",
    label: "Discount Type",
    required: false,
    sample: "",
  },
  {
    key: "discountValue",
    label: "Discount Value",
    required: false,
    sample: 0,
  },
  { key: "finalFee", label: "Final Fee", required: false, sample: 50000 },
  {
    key: "feeFrequency",
    label: "Fee Frequency",
    required: false,
    sample: "annually",
  },
  {
    key: "password",
    label: "Password",
    required: false,
    sample: "Welcome@123",
  },
  {
    key: "documentsVerified",
    label: "Documents Verified",
    required: true,
    sample: "Yes",
  },
];

const TEMPLATE_FIELD_KEYS = new Set(TEMPLATE_FIELDS.map((field) => field.key));
const REQUIRED_TEMPLATE_KEYS = TEMPLATE_FIELDS.filter(
  (field) => field.required,
).map((field) => field.key);

const resolveTemplateHeaders = (requestedKeys) => {
  const requested = new Set(
    (Array.isArray(requestedKeys) ? requestedKeys : [])
      .map((key) => String(key || "").trim())
      .filter((key) => TEMPLATE_FIELD_KEYS.has(key)),
  );

  // Always keep mandatory columns, even if the client omits them.
  REQUIRED_TEMPLATE_KEYS.forEach((key) => requested.add(key));

  // If nothing optional was chosen (or request was empty), return all columns
  // so a plain template download still works.
  if (requested.size === REQUIRED_TEMPLATE_KEYS.length && !requestedKeys?.length) {
    return TEMPLATE_FIELDS.map((field) => field.key);
  }

  return TEMPLATE_FIELDS.filter((field) => requested.has(field.key)).map(
    (field) => field.key,
  );
};

export const getStudentBulkUploadFields = (_req, res) => {
  res.json({
    success: true,
    data: TEMPLATE_FIELDS.map(({ key, label, required }) => ({
      key,
      label,
      required: Boolean(required),
    })),
  });
};

export const downloadStudentTemplate = (req, res) => {
  try {
    const rawFields = req.query.fields ?? req.body?.fields;
    const requestedKeys = Array.isArray(rawFields)
      ? rawFields
      : String(rawFields || "")
          .split(",")
          .map((key) => key.trim())
          .filter(Boolean);

    const headers = resolveTemplateHeaders(requestedKeys);
    const sampleByKey = Object.fromEntries(
      TEMPLATE_FIELDS.map((field) => [field.key, field.sample]),
    );
    const sampleRow = Object.fromEntries(
      headers.map((key) => [key, sampleByKey[key] ?? ""]),
    );

    const worksheet = XLSX.utils.json_to_sheet([sampleRow], {
      header: headers,
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

      const docsOk = String(row.documentsVerified || "")
        .trim()
        .toLowerCase();
      if (!["yes", "y", "true", "1"].includes(docsOk)) {
        errors.push(
          "documentsVerified must be Yes (required documents verified before admission)",
        );
      }

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
    const schoolDoc = await School.findById(schoolId).select("school_name").lean();

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

      const parentEmails = [student.fatherEmail, student.motherEmail].filter(
        Boolean,
      );
      const parentMobile =
        student.fatherMobile || student.motherMobile || "";
      const parentUsername =
        student.parentCredentials?.username || parentMobile;
      const parentPassword =
        student.parentCredentials?.temp_password ||
        student.studentCredentials?.temp_password;
      const studentUsername =
        student.studentCredentials?.username || student.studentId;
      const studentPassword =
        student.studentCredentials?.temp_password || parentPassword;

      if (parentEmails.length || parentMobile) {
        notifyCredentialsAsync({
          role: "parent",
          name: student.fatherName || student.motherName || "Parent",
          username: parentUsername,
          password: parentPassword,
          emails: parentEmails,
          mobile: parentMobile,
          schoolName: schoolDoc?.school_name,
          credentialBlocks: [
            {
              title: "Parent login",
              username: parentUsername,
              password: parentPassword,
            },
            {
              title: "Student login",
              username: studentUsername,
              password: studentPassword,
            },
          ],
          extraLines: [
            `Student: ${student.firstName || ""} ${student.lastName || ""}`.trim(),
          ],
        });
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
