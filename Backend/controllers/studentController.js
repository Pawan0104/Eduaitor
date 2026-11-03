import mongoose from "mongoose";
import Student from "../models/student.js";
import Lead from "../models/lead.js";
import Registration from "../models/registration.js";
import Group from "../models/group.js";
import Teacher from "../models/teacher.js";
import Class from "../models/class.js";
import School from "../models/school.js";
import House from "../models/house.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import { deleteFromCloudinary } from "../utils/deleteFromCloudinary.js";
import {
  syncStudentGroups,
  removeStudentFromOldGroups,
} from "../utils/groupSync.js";
import { ensureDefaultHouses } from "../utils/ensureDefaultHouses.js";
import {
  parsePagination,
  applyPagination,
  sendPaginated,
} from "../utils/pagination.js";
import bcrypt from "bcryptjs";
import { resolveParentCredentialsForCreate } from "../utils/parentChildren.js";
import { notifyCredentialsAsync } from "../services/credentials/notifyCredentials.js";
import { resolveStream } from "../utils/resolveStream.js";

const isValidObjectId = (value) =>
  Boolean(value) && mongoose.Types.ObjectId.isValid(String(value));

/** Coerce FormData ObjectId fields; optional fields become null when missing/invalid. */
const sanitizeStudentObjectIds = (safeBody) => {
  const errors = [];
  const optionalIds = new Set(["sectionId", "transport", "houseId"]);

  for (const key of ["classId", "sectionId", "transport", "houseId"]) {
    if (
      safeBody[key] === undefined ||
      safeBody[key] === null ||
      safeBody[key] === ""
    ) {
      if (optionalIds.has(key)) safeBody[key] = null;
      continue;
    }
    const raw = String(safeBody[key]).trim();
    if (!isValidObjectId(raw)) {
      // Bad placeholders like "Section" â€” drop optional ids instead of failing create
      if (optionalIds.has(key)) {
        safeBody[key] = null;
        continue;
      }
      errors.push(`Invalid ${key}`);
      continue;
    }
    safeBody[key] = raw;
  }

  return errors;
};

const toBool = (value) =>
  value === true ||
  value === "true" ||
  value === "1" ||
  value === "on" ||
  value === 1;

const normalizeStudentFeeFields = (safeBody) => {
  ["isSpecialChild", "isEws", "isPhysicallyDisabled"].forEach((key) => {
    if (safeBody[key] !== undefined) {
      safeBody[key] = toBool(safeBody[key]);
    }
  });
  if (safeBody.aadhaarNumber !== undefined) {
    safeBody.aadhaarNumber = String(safeBody.aadhaarNumber || "")
      .replace(/\D/g, "")
      .slice(0, 12);
  }
  if (safeBody.feeBatch !== undefined) {
    safeBody.feeBatch =
      String(safeBody.feeBatch || "").trim() === "Old" ? "Old" : "New";
  }
  if (safeBody.transport === "") {
    safeBody.transport = null;
  }

  if (typeof safeBody.selectedOptionalFees === "string") {
    try {
      safeBody.selectedOptionalFees = JSON.parse(safeBody.selectedOptionalFees);
    } catch {
      safeBody.selectedOptionalFees = [];
    }
  }

  if (!Array.isArray(safeBody.selectedOptionalFees)) {
    safeBody.selectedOptionalFees = [];
  }

  safeBody.busFeeFrequency =
    safeBody.busFeeFrequency === "quarterly" ? "quarterly" : "annually";
  safeBody.busFeeQuarter =
    safeBody.busFeeFrequency === "quarterly"
      ? safeBody.busFeeQuarter || ""
      : "";
};

/* ============ ADMIN-DEFINED (CUSTOM) ADMISSION FIELDS ============ */
const CUSTOM_FIELD_FILE_PREFIX = "customField_";

/** Parse the JSON blob the wizard sends for admin-created fields. */
const parseCustomFieldMeta = (raw) => {
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return null;

    return parsed
      .filter((field) => field && typeof field.key === "string" && field.key)
      .map((field) => ({
        key: String(field.key).slice(0, 60),
        label: String(field.label ?? "").slice(0, 120),
        type: String(field.type ?? "text").slice(0, 20),
        value:
          field.value === undefined || field.value === null
            ? ""
            : String(field.value).slice(0, 4000),
      }));
  } catch {
    return null;
  }
};

/**
 * Merge submitted custom-field values with previously saved ones (so an edit
 * that does not re-send a file/value keeps the existing data).
 */
const buildCustomFields = async ({
  meta,
  files = {},
  existing = [],
  uploadFailures = [],
}) => {
  const existingByKey = new Map(
    (existing || []).filter(Boolean).map((field) => [field.key, field])
  );
  const result = [];

  for (const field of meta) {
    const previous = existingByKey.get(field.key);
    const uploadedFile = files[`${CUSTOM_FIELD_FILE_PREFIX}${field.key}`]?.[0];

    if (field.type === "file") {
      if (uploadedFile) {
        try {
          const uploaded = await uploadToCloudinary(uploadedFile, "documents");
          if (previous?.file?.public_id) {
            await deleteFromCloudinary(previous.file.public_id).catch(() => {});
          }
          result.push({
            ...field,
            value: uploaded.url,
            file: {
              url: uploaded.url,
              public_id: uploaded.public_id,
              type: uploaded.type,
            },
          });
        } catch (err) {
          console.error(`Upload failed for custom field ${field.key}`, err);
          uploadFailures.push(
            `${field.label || field.key}: ${err?.message || "upload failed"}`
          );
        }
      } else if (previous?.file?.url) {
        result.push({
          ...field,
          value: field.value || previous.value || previous.file.url,
          file: previous.file,
        });
      } else {
        result.push({ ...field, value: field.value || "" });
      }
      continue;
    }

    // Non-file field: keep the previous value when this request omits one
    // (e.g. a partial update from an older screen).
    const value =
      field.value || (previous?.value && previous.type === field.type
        ? previous.value
        : "");
    result.push({ ...field, value });
  }

  return result;
};

/* ================= GENERATE STUDENT ID ================= */
const normalizeAdmissionNumber = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

/**
 * Next STU#### for a school based on the highest existing STU number
 * (not document count â€” count+1 collides when IDs have gaps or custom prefixes).
 */
const generateStudentId = async (schoolId) => {
  const rows = await Student.find({ schoolId })
    .select("studentId")
    .setOptions({ skipSession: true })
    .lean();
  const used = new Set(
    rows.map((r) => normalizeAdmissionNumber(r.studentId)).filter(Boolean),
  );

  let maxStu = 0;
  for (const id of used) {
    const m = /^STU(\d+)$/.exec(id);
    if (m) maxStu = Math.max(maxStu, parseInt(m[1], 10));
  }

  for (let n = maxStu + 1; n <= maxStu + 5000; n++) {
    const candidate = `STU${String(n).padStart(4, "0")}`;
    if (!used.has(candidate)) return candidate;
  }

  const err = new Error("Could not generate a unique admission number");
  err.statusCode = 500;
  throw err;
};

/** Resolve admission/student ID: use provided value or auto-generate; reject duplicates. */
const resolveAdmissionNumber = async (schoolId, rawValue, excludeStudentId = null) => {
  const custom = normalizeAdmissionNumber(rawValue);
  if (custom) {
    const query = { schoolId, studentId: custom };
    if (excludeStudentId) query._id = { $ne: excludeStudentId };
    const exists = await Student.findOne(query)
      .select("_id")
      .setOptions({ skipSession: true })
      .lean();
    if (exists) {
      const err = new Error("Admission number already exists");
      err.statusCode = 400;
      err.code = "DUPLICATE_ADMISSION";
      throw err;
    }
    return custom;
  }
  return generateStudentId(schoolId);
};


/** Count active students in a class section and enforce capacity. */
const assertSectionCapacity = async (schoolId, classId, sectionId, excludeStudentId = null) => {
  if (!classId) return;
  const cls = await Class.findOne({ _id: classId, schoolId }).lean();
  if (!cls) {
    const err = new Error("Selected class was not found");
    err.statusCode = 400;
    throw err;
  }

  let capacity = null;
  if (sectionId && Array.isArray(cls.details)) {
    const detail = cls.details.find(
      (d) => String(d.sectionId) === String(sectionId),
    );
    if (detail && detail.capacity != null) capacity = Number(detail.capacity);
  }
  if (capacity == null && Array.isArray(cls.details) && cls.details.length) {
    const caps = cls.details
      .map((d) => Number(d.capacity))
      .filter((n) => Number.isFinite(n) && n > 0);
    capacity = caps.length ? Math.max(...caps) : null;
  }
  if (!capacity || capacity <= 0) return;

  const query = { schoolId, classId };
  if (sectionId) query.sectionId = sectionId;
  if (excludeStudentId) query._id = { $ne: excludeStudentId };

  const count = await Student.countDocuments(query);
  if (count >= capacity) {
    const err = new Error(
      `Class/section is full (${count}/${capacity}). Cannot admit more students.`,
    );
    err.statusCode = 400;
    throw err;
  }
};

/* ================= CREATE STUDENT ================= */

export const createStudent = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { ...safeBody } = req.body;
    normalizeStudentFeeFields(safeBody);

    const idErrors = sanitizeStudentObjectIds(safeBody);
    if (idErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: idErrors[0],
      });
    }

    const totalDue = Number(safeBody.finalFee) || 0;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const rawFiles = req.files || [];
    const files = Array.isArray(rawFiles)
      ? rawFiles.reduce((acc, file) => {
          const field = file.fieldname;
          acc[field] = acc[field] || [];
          acc[field].push(file);
          return acc;
        }, {})
      : rawFiles;

    const documents = {};
    const uploadFailures = [];

    const uploadFile = async (field, folder) => {
      try {
        if (!files[field] || !files[field][0]) return;

        const uploaded = await uploadToCloudinary(files[field][0], folder);

        documents[field] = {
          url: uploaded.url,
          public_id: uploaded.public_id,
          type: uploaded.type,
        };
      } catch (err) {
        console.error(`Upload failed for ${field}`, err);
        uploadFailures.push(
          `${field}: ${err?.message || "upload failed"}`,
        );
      }
    };

    const parseExtraDocumentsMeta = () => {
      if (!safeBody.extraDocumentsMeta) return [];

      try {
        return JSON.parse(safeBody.extraDocumentsMeta).map((doc) => ({
          fieldName: doc.fieldName,
          label: doc.label || "",
        }));
      } catch {
        return [];
      }
    };

    // Upload images
    await uploadFile("studentPhoto", "students");
    await uploadFile("fatherPhoto", "students");
    await uploadFile("motherPhoto", "students");
    await uploadFile("guardianPhoto", "students");

    // Upload documents
    await uploadFile("birthCertificate", "documents");
    await uploadFile("transferCertificate", "documents");

    await uploadFile("studentAadhar", "documents");
    await uploadFile("fatherAadhar", "documents");
    await uploadFile("motherAadhar", "documents");

    const extraDocumentsMeta = parseExtraDocumentsMeta();
    delete safeBody.extraDocumentsMeta;
    const extraDocuments = [];

    for (const docMeta of extraDocumentsMeta) {
      const field = docMeta.fieldName;
      if (!files[field] || !files[field][0]) continue;

      try {
        const uploaded = await uploadToCloudinary(files[field][0], "documents");
        extraDocuments.push({
          fieldName: field,
          label: docMeta.label || "",
          url: uploaded.url,
          public_id: uploaded.public_id,
          type: uploaded.type,
        });
      } catch (err) {
        console.error(`Upload failed for extra document ${field}`, err);
        uploadFailures.push(
          `${field}: ${err?.message || "upload failed"}`,
        );
      }
    }

    if (uploadFailures.length > 0) {
      return res.status(502).json({
        success: false,
        message: uploadFailures[0],
      });
    }

    // Admin-defined admission fields (Admission Form Builder).
    const customFieldsMeta = parseCustomFieldMeta(safeBody.customFieldsMeta);
    delete safeBody.customFieldsMeta;
    let customFields = [];
    if (customFieldsMeta) {
      customFields = await buildCustomFields({
        meta: customFieldsMeta,
        files,
        existing: [],
        uploadFailures,
      });
    }

    if (uploadFailures.length > 0) {
      return res.status(502).json({
        success: false,
        message: uploadFailures[0],
      });
    }

    if (!String(safeBody.password || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Password is required to create student and parent login credentials",
      });
    }
    if (!String(safeBody.fatherMobile || safeBody.username || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Father mobile (parent username) is required",
      });
    }
    // Guardian is optional. When a guardian name is provided, the guardian's
    // mobile and relation become mandatory so the record is never half-filled.
    if (String(safeBody.guardianName || "").trim()) {
      if (!String(safeBody.guardianMobile || "").trim()) {
        return res.status(400).json({
          success: false,
          message: "Guardian mobile is required when a guardian name is provided",
        });
      }
      if (!String(safeBody.guardianRelation || "").trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Guardian relation is required when a guardian name is provided",
        });
      }
    }

    let studentId;
    try {
      studentId = await resolveAdmissionNumber(
        schoolId,
        safeBody.studentId || safeBody.admissionNumber,
      );
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || "Invalid admission number",
      });
    }
    delete safeBody.studentId;
    delete safeBody.admissionNumber;

    // â”€â”€ HASH PASSWORD (same password used for both, set at creation) â”€â”€
    const rawPassword = safeBody.password?.trim();
    const hashedPassword = rawPassword
      ? await bcrypt.hash(rawPassword, 10)
      : undefined;

    // â”€â”€ BUILD CREDENTIAL OBJECTS â”€â”€
    const studentCredentials = {
      username: studentId, // STU0001 â€” auto generated or custom admission no
      password: hashedPassword,
      temp_password: rawPassword || undefined,
      firstTimeLogin: true,
    };

    const parentCredentials = await resolveParentCredentialsForCreate({
      schoolId,
      fatherMobile: safeBody.fatherMobile,
      hashedPassword,
      rawPassword,
    });

    // â”€â”€ STRIP OLD TOP-LEVEL CREDENTIAL FIELDS â”€â”€
    delete safeBody.username;
    delete safeBody.password;
    delete safeBody.temp_password;
    delete safeBody.firstTimeLogin;

    const leadIdRaw = safeBody.leadId || safeBody.convertedFromLeadId || null;
    delete safeBody.leadId;
    delete safeBody.convertedFromLeadId;

    let convertedFromLeadId = null;
    if (leadIdRaw) {
      if (!mongoose.Types.ObjectId.isValid(leadIdRaw)) {
        return res.status(400).json({
          success: false,
          message: "Invalid lead reference",
        });
      }

      const leadQuery = { _id: leadIdRaw, schoolId };
      if (req.user?.role === "staff_admin" && req.user?.staff_id) {
        leadQuery["assignedTo.userType"] = "staff";
        leadQuery["assignedTo.userId"] = req.user.staff_id;
      }

      const lead = await Lead.findOne(leadQuery);
      if (!lead) {
        return res.status(404).json({
          success: false,
          message: "Lead not found or not assigned to you",
        });
      }
      if (lead.studentId) {
        return res.status(400).json({
          success: false,
          message: "This lead has already been converted to a student",
        });
      }
      if (String(lead.status || "").toLowerCase() === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cancelled leads cannot be admitted",
        });
      }
      convertedFromLeadId = lead._id;
    }

    const registrationIdRaw =
      safeBody.registrationId || safeBody.convertedFromRegistrationId || null;
    delete safeBody.registrationId;
    delete safeBody.convertedFromRegistrationId;

    let registrationDoc = null;
    if (registrationIdRaw) {
      if (!mongoose.Types.ObjectId.isValid(registrationIdRaw)) {
        return res.status(400).json({
          success: false,
          message: "Invalid registration reference",
        });
      }

      registrationDoc = await Registration.findOne({
        _id: registrationIdRaw,
        schoolId,
      });
      if (!registrationDoc) {
        return res.status(404).json({
          success: false,
          message: "Registration not found",
        });
      }
      if (registrationDoc.status === "admitted" || registrationDoc.studentId) {
        return res.status(400).json({
          success: false,
          message: "This registration has already been admitted",
        });
      }
      if (registrationDoc.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cancelled registrations cannot be admitted",
        });
      }
      if (
        registrationDoc.entranceExamId &&
        registrationDoc.entrance?.result !== "pass"
      ) {
        return res.status(400).json({
          success: false,
          message:
            registrationDoc.entrance?.result === "fail"
              ? "This candidate did not pass the entrance exam"
              : "Entrance exam result is still pending. Add the marks first.",
        });
      }

      // A registration opened from a lead keeps that lead in sync.
      if (!convertedFromLeadId && registrationDoc.leadId) {
        const linkedLead = await Lead.findOne({
          _id: registrationDoc.leadId,
          schoolId,
        })
          .select("_id studentId status")
          .lean();
        if (linkedLead && !linkedLead.studentId) {
          convertedFromLeadId = linkedLead._id;
        }
      }
    }

    let resolvedStreamOnAdmit = { streamId: null, stream: "" };
    try {
      resolvedStreamOnAdmit = await resolveStream(
        schoolId,
        safeBody.streamId || null,
      );
    } catch (streamErr) {
      return res.status(streamErr.statusCode || 400).json({
        success: false,
        message: streamErr.message || "Invalid stream selected.",
      });
    }
    if (!resolvedStreamOnAdmit.streamId && safeBody.stream) {
      resolvedStreamOnAdmit.stream = String(safeBody.stream).trim();
    }

    // Auto-assign a random active house when school uses House Allocation
    let houseId = safeBody.houseId || null;
    if (!houseId) {
      try {
        const school = await School.findById(schoolId)
          .select("subscribed_modules")
          .lean();
        if (school?.subscribed_modules?.includes("house")) {
          await ensureDefaultHouses(schoolId);
          const houses = await House.find({
            schoolId,
            status: "Active",
          }).select("_id");
          if (houses.length > 0) {
            houseId = houses[Math.floor(Math.random() * houses.length)]._id;
          }
        }
      } catch {
        /* non-blocking */
      }
    }

    await assertSectionCapacity(
      schoolId,
      safeBody.classId,
      safeBody.sectionId,
    );

    // Create with a bounded retry. `generateStudentId` is read-then-write, so two
    // simultaneous admissions can pick the same number and the second one fails
    // the unique index. That is a race, not a user error â€” so when the admission
    // number was AUTO-generated we transparently re-generate and retry. A number
    // the user typed themselves is never retried (a real duplicate must surface).
    const isAutoAdmission =
      !normalizeAdmissionNumber(safeBody.studentId || safeBody.admissionNumber);

    // confirmationStatus is system-managed — never trust the client.
    delete safeBody.confirmationStatus;
    const confirmationStatus = registrationDoc
      ? "Confirmed"
      : "Non-Confirmed";

    // Prefer the registration's academic year so admitted students appear in
    // the same session as the registration; otherwise let the session plugin
    // stamp the active header year.
    const academicYearFromRegistration = String(
      registrationDoc?.academicYear || "",
    ).trim();

    const buildStudentDoc = (nextId) => ({
      ...safeBody,
      schoolId,
      studentId: nextId,
      studentCredentials: { ...studentCredentials, username: nextId },
      totalDue,
      totalPaid: 0,
      documents,
      extraDocuments,
      customFields,
      parentCredentials,
      houseId,
      streamId: resolvedStreamOnAdmit.streamId,
      stream: resolvedStreamOnAdmit.stream,
      idCardIssuedAt: new Date(),
      confirmationStatus,
      ...(academicYearFromRegistration
        ? { academicYear: academicYearFromRegistration }
        : {}),
      convertedFromLeadId,
      convertedFromRegistrationId: registrationDoc?._id || null,
    });

    let student = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        student = await Student.create(buildStudentDoc(studentId));
        break;
      } catch (createErr) {
        const isAdmissionClash =
          createErr?.code === 11000 &&
          (createErr?.keyPattern?.studentId ||
            createErr?.keyPattern?.["studentCredentials.username"]);

        if (isAdmissionClash && isAutoAdmission && attempt < 4) {
          const nextId = await generateStudentId(schoolId);
          if (nextId && nextId !== studentId) {
            studentId = nextId;
            continue;
          }
        }
        throw createErr;
      }
    }

    if (convertedFromLeadId) {
      await Lead.findOneAndUpdate(
        {
          _id: convertedFromLeadId,
          schoolId,
          $or: [{ studentId: null }, { studentId: { $exists: false } }],
        },
        { $set: { status: "admitted", studentId: student._id } },
      );
    }

    if (registrationDoc) {
      registrationDoc.status = "admitted";
      registrationDoc.studentId = student._id;
      registrationDoc.admittedAt = new Date();
      await registrationDoc.save();
    }

    // AUTO ADD TO GROUPS (non-blocking for admit)
    try {
      await syncStudentGroups(student);
    } catch (syncErr) {
      console.error("syncStudentGroups after create failed:", syncErr);
    }

    const schoolDoc = await School.findById(schoolId)
      .select("school_name")
      .lean();
    const parentEmails = [
      student.fatherEmail,
      student.motherEmail,
    ].filter(Boolean);
    const parentMobile =
      student.fatherMobile || student.motherMobile || student.guardianMobile || "";
    const parentUsername =
      student.parentCredentials?.username || parentMobile;
    const parentPassword =
      student.parentCredentials?.temp_password || rawPassword;
    const studentUsername =
      student.studentCredentials?.username || student.studentId;
    const studentPassword =
      student.studentCredentials?.temp_password || rawPassword || parentPassword;

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
          student.firstName || student.lastName
            ? `Student: ${[student.firstName, student.lastName].filter(Boolean).join(" ")}`
            : null,
        ].filter(Boolean),
      });
    }

    res.status(201).json({
      success: true,
      message: "Student created successfully. ID card is ready to download.",
      data: student,
      idCardReady: true,
      credentialsNotified: parentEmails.length > 0,
    });
  } catch (error) {
    console.error("Create student error:", error);

    if (error?.code === 11000 && error?.keyPattern?.convertedFromLeadId) {
      return res.status(400).json({
        success: false,
        message: "This lead has already been converted to a student",
      });
    }

    if (
      error?.code === 11000 &&
      error?.keyPattern?.convertedFromRegistrationId
    ) {
      return res.status(400).json({
        success: false,
        message: "This registration has already been admitted",
      });
    }

    if (
      error?.code === 11000 &&
      (error?.keyPattern?.studentId ||
        error?.keyPattern?.["studentCredentials.username"])
    ) {
      return res.status(400).json({
        success: false,
        message: "Admission number already exists",
      });
    }

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create student",
    });
  }
};

/* ================= NEXT ROLL NUMBER ================= */

/**
 * Next auto-increment roll number for a class (+ optional section).
 * Scoped to the school so two schools can both have roll "1".
 */
export const getNextAdmissionNumber = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const nextId = await generateStudentId(schoolId);
    return res.json({ success: true, data: nextId });
  } catch (error) {
    console.error("Get next admission number error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to resolve next admission number",
    });
  }
};

export const getNextRollNo = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const { classId, sectionId } = req.query;

    const query = { schoolId, rollNo: { $exists: true, $ne: "" } };

    if (classId && isValidObjectId(classId)) {
      query.classId = classId;
      if (sectionId && isValidObjectId(sectionId)) {
        query.sectionId = sectionId;
      }
    }

    const rows = await Student.find(query)
      .select("rollNo")
      .lean();

    // Only plain integers participate in the sequence; anything custom
    // (e.g. "A-01") is left alone and never blocks allocation.
    const max = rows.reduce((acc, r) => {
      const n = parseInt(String(r.rollNo ?? "").trim(), 10);
      return Number.isFinite(n) && n > acc ? n : acc;
    }, 0);

    return res.json({ success: true, data: max + 1 });
  } catch (error) {
    console.error("Get next roll number error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to resolve next roll number",
    });
  }
};

/* ================= GET ALL STUDENTS ================= */

export const getStudents = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const { page, limit, skip, paginate } = parsePagination(req.query);
    const { search, classId, gender, category } = req.query;

    const filter = { schoolId };

    if (classId && mongoose.Types.ObjectId.isValid(String(classId))) {
      filter.classId = classId;
    }

    if (gender === "Male" || gender === "Female") {
      filter.gender = gender;
    }

    if (category) {
      if (category === "General") {
        filter.$or = [
          { category: "General" },
          { category: { $exists: false } },
          { category: null },
        ];
      } else {
        filter.category = category;
      }
    }

    if (search?.trim()) {
      const q = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(q, "i");
      const searchOr = [
        { firstName: rx },
        { lastName: rx },
        { studentId: rx },
        { rollNo: rx },
        { fatherName: rx },
        { motherName: rx },
        { guardianName: rx },
        { fatherMobile: rx },
        { motherMobile: rx },
        { guardianMobile: rx },
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }

    const total = await Student.countDocuments(filter);

    const students = await applyPagination(
      Student.find(filter)
        .populate("classId", "name className")
        .populate("sectionId", "name sectionName")
        .populate("transport", "name routeId")
        .populate("houseId", "name code color")
        .sort({ createdAt: -1 }),
      { page, limit, skip, paginate },
    );

    if (!paginate) {
      return res.json({ success: true, data: students });
    }

    return res.json(sendPaginated(res, { items: students, total, page, limit }));
  } catch (error) {
    console.error("Get students error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch students",
    });
  }
};

/* ================= GET SINGLE STUDENT ================= */

export const getStudent = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const student = await Student.findOne({
      _id: req.params.id,
      schoolId,
    })
      .populate("classId", "name className")
      .populate("sectionId", "name sectionName")
      .populate("transport", "name routeId");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error("Get student error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch student",
    });
  }
};

/* ================= UPDATE STUDENT ================= */

export const updateStudent = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { ...safeBody } = req.body;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    // Locked system fields — not editable via the admission form.
    delete safeBody.confirmationStatus;
    delete safeBody.studentId;
    delete safeBody.admissionNumber;

    normalizeStudentFeeFields(safeBody);

    const idErrors = sanitizeStudentObjectIds(safeBody);
    if (idErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: idErrors[0],
      });
    }

    const student = await Student.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const oldStudent = student.toObject(); // Reference for group sync

    const rawFiles = req.files || [];
    const files = Array.isArray(rawFiles)
      ? rawFiles.reduce((acc, file) => {
          const field = file.fieldname;
          acc[field] = acc[field] || [];
          acc[field].push(file);
          return acc;
        }, {})
      : rawFiles;

    const documents = student.documents || {};
    const extraDocuments = student.extraDocuments || [];
    const uploadFailures = [];

    const updateFile = async (field, folder) => {
      if (files[field] && files[field][0]) {
        try {
          // Delete old file
          if (documents[field]?.public_id) {
            await deleteFromCloudinary(documents[field].public_id);
          }

          const uploaded = await uploadToCloudinary(files[field][0], folder);

          documents[field] = {
            url: uploaded.url,
            public_id: uploaded.public_id,
            type: uploaded.type,
          };
        } catch (err) {
          console.error(`Upload failed for ${field}`, err);
          uploadFailures.push(
            `${field}: ${err?.message || "upload failed"}`,
          );
        }
      }
    };

    const parseExtraDocumentsMeta = () => {
      if (!safeBody.extraDocumentsMeta) return [];

      try {
        return JSON.parse(safeBody.extraDocumentsMeta).map((doc) => ({
          fieldName: doc.fieldName,
          label: doc.label || "",
        }));
      } catch {
        return [];
      }
    };

    // Update images
    await updateFile("studentPhoto", "students");
    await updateFile("fatherPhoto", "students");
    await updateFile("motherPhoto", "students");
    await updateFile("guardianPhoto", "students");

    // Update documents
    await updateFile("birthCertificate", "documents");
    await updateFile("transferCertificate", "documents");

    await updateFile("studentAadhar", "documents");
    await updateFile("fatherAadhar", "documents");
    await updateFile("motherAadhar", "documents");

    const extraDocumentsMeta = parseExtraDocumentsMeta();
    delete safeBody.extraDocumentsMeta;
    const newExtraDocuments = [];

    for (const docMeta of extraDocumentsMeta) {
      const field = docMeta.fieldName;
      if (!files[field] || !files[field][0]) continue;

      try {
        const uploaded = await uploadToCloudinary(files[field][0], "documents");
        newExtraDocuments.push({
          fieldName: field,
          label: docMeta.label || "",
          url: uploaded.url,
          public_id: uploaded.public_id,
          type: uploaded.type,
        });
      } catch (err) {
        console.error(`Upload failed for extra document ${field}`, err);
        uploadFailures.push(
          `${field}: ${err?.message || "upload failed"}`,
        );
      }
    }

    if (uploadFailures.length > 0) {
      return res.status(502).json({
        success: false,
        message: uploadFailures[0],
      });
    }

    // Admin-defined admission fields: only touch them when the client sent the
    // meta blob, otherwise a normal edit would wipe previously stored values.
    const customFieldsMeta = parseCustomFieldMeta(safeBody.customFieldsMeta);
    delete safeBody.customFieldsMeta;
    let nextCustomFields = null;
    if (customFieldsMeta) {
      nextCustomFields = await buildCustomFields({
        meta: customFieldsMeta,
        files,
        existing: student.customFields || [],
        uploadFailures,
      });
    }

    if (uploadFailures.length > 0) {
      return res.status(502).json({
        success: false,
        message: uploadFailures[0],
      });
    }

    // â”€â”€ STRIP OLD TOP-LEVEL CREDENTIAL FIELDS â”€â”€
    delete safeBody.username;
    delete safeBody.firstTimeLogin;

    // â”€â”€ Admission number (studentId) â”€â”€
    const requestedAdmission =
      safeBody.studentId || safeBody.admissionNumber || "";
    delete safeBody.admissionNumber;
    if (requestedAdmission) {
      try {
        const nextId = await resolveAdmissionNumber(
          schoolId,
          requestedAdmission,
          student._id,
        );
        if (nextId !== student.studentId) {
          safeBody.studentId = nextId;
        } else {
          delete safeBody.studentId;
        }
      } catch (err) {
        return res.status(err.statusCode || 400).json({
          success: false,
          message: err.message || "Invalid admission number",
        });
      }
    } else {
      delete safeBody.studentId;
    }

    // â”€â”€ BUILD SEPARATE $set FOR NESTED CREDENTIAL FIELDS â”€â”€
    const credentialUpdate = {};

    if (safeBody.studentId) {
      credentialUpdate["studentCredentials.username"] = safeBody.studentId;
    }

    if (safeBody.password && safeBody.password.trim() !== "") {
      const rawPassword = safeBody.password.trim();
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      credentialUpdate["studentCredentials.password"] = hashedPassword;
      credentialUpdate["studentCredentials.temp_password"] = rawPassword;
      credentialUpdate["parentCredentials.password"] = hashedPassword;
      credentialUpdate["parentCredentials.temp_password"] = rawPassword;
    }

    // Sync parent username if fatherMobile changed
    if (safeBody.fatherMobile) {
      credentialUpdate["parentCredentials.username"] = safeBody.fatherMobile;
      // Reuse sibling parent password when linking to an existing father mobile
      const sibling = await Student.findOne({
        schoolId,
        _id: { $ne: student._id },
        "parentCredentials.username": String(safeBody.fatherMobile).trim(),
        "parentCredentials.password": { $exists: true, $ne: null },
      })
        .select("parentCredentials")
        .lean();
      if (sibling?.parentCredentials?.password && !safeBody.password) {
        credentialUpdate["parentCredentials.password"] =
          sibling.parentCredentials.password;
        credentialUpdate["parentCredentials.temp_password"] =
          sibling.parentCredentials.temp_password;
        credentialUpdate["parentCredentials.firstTimeLogin"] =
          sibling.parentCredentials.firstTimeLogin ?? false;
      }
    }

    // â”€â”€ STRIP password from safeBody so it doesn't conflict â”€â”€
    delete safeBody.password;
    delete safeBody.temp_password;

    // â”€â”€ ALSO STRIP any nested credential objects if accidentally in safeBody â”€â”€
    delete safeBody.studentCredentials;
    delete safeBody.parentCredentials;

    const totalPaid = Number(student.totalPaid) || 0;
    const finalFee = Number(safeBody.finalFee);

    await assertSectionCapacity(
      schoolId,
      safeBody.classId || student.classId,
      safeBody.sectionId !== undefined ? safeBody.sectionId : student.sectionId,
      req.params.id,
    );

    const updatedStudent = await Student.findOneAndUpdate(
      { _id: req.params.id, schoolId },
      {
        ...safeBody,
        ...(Number.isFinite(finalFee)
          ? {
              totalDue: Math.max(0, finalFee - totalPaid),
            }
          : {}),
        documents,
        extraDocuments: [...extraDocuments, ...newExtraDocuments],
        ...(nextCustomFields ? { customFields: nextCustomFields } : {}),
        ...credentialUpdate,
      },
      { new: true },
    )
      .populate("classId", "name className")
      .populate("sectionId", "name sectionName")
      .populate("transport", "name routeId");

    const classChanged =
      oldStudent.classId?.toString() !== updatedStudent.classId?.toString();

    const sectionChanged =
      oldStudent.sectionId?.toString() !== updatedStudent.sectionId?.toString();

    if (classChanged || sectionChanged) {
      // remove from old groups
      await removeStudentFromOldGroups(oldStudent);

      // add to new groups
      await syncStudentGroups(updatedStudent);
    }

    // Keep sibling parent logins in sync (same father mobile)
    const sharedParentUser =
      updatedStudent?.parentCredentials?.username ||
      String(safeBody.fatherMobile || "").trim();
    if (
      sharedParentUser &&
      (credentialUpdate["parentCredentials.password"] ||
        credentialUpdate["parentCredentials.username"])
    ) {
      const siblingSet = {};
      if (credentialUpdate["parentCredentials.password"]) {
        siblingSet["parentCredentials.password"] =
          credentialUpdate["parentCredentials.password"];
        siblingSet["parentCredentials.temp_password"] =
          credentialUpdate["parentCredentials.temp_password"];
      }
      if (credentialUpdate["parentCredentials.firstTimeLogin"] !== undefined) {
        siblingSet["parentCredentials.firstTimeLogin"] =
          credentialUpdate["parentCredentials.firstTimeLogin"];
      }
      if (Object.keys(siblingSet).length) {
        await Student.updateMany(
          {
            schoolId,
            "parentCredentials.username": sharedParentUser,
            _id: { $ne: updatedStudent._id },
          },
          { $set: siblingSet },
        );
      }
    }

    res.json({
      success: true,
      message: "Student updated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    console.error("Update student error:", error);

    if (
      error?.code === 11000 &&
      (error?.keyPattern?.studentId ||
        error?.keyPattern?.["studentCredentials.username"])
    ) {
      return res.status(400).json({
        success: false,
        message: "Admission number already exists",
      });
    }

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update student",
    });
  }
};

/* ================= DELETE STUDENT ================= */

export const deleteStudent = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const student = await Student.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const docs = student.documents || {};

    // Delete all files from Cloudinary
    for (const key in docs) {
      if (docs[key]?.public_id) {
        await deleteFromCloudinary(docs[key].public_id);
      }
    }

    await Group.updateMany(
      {
        schoolId,
        "members.userId": student._id,
      },
      {
        $pull: {
          members: { userId: student._id },
        },
      },
    );

    await student.deleteOne();

    res.json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    console.error("Delete student error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete student",
    });
  }
};

/* ================= GET ALL STUDENTS FOR SUPER ADMIN ================= */
export const getAllStudents = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const schoolId = req.query.schoolId;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const students = await Student.find({ schoolId })
      .populate("classId", "name className")
      .populate("sectionId", "name sectionName")
      .populate("transport", "name routeId")
      .populate("houseId", "name code color")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error("Get students error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch students",
    });
  }
};

/* ================= GET STUDENTS FOR TEACHER ================= */
export const getStudentsByTeacher = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const rawTeacherId = req.user?.teacher_id;

    if (!schoolId || !rawTeacherId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing credentials" });
    }

    const teacherObjId = new mongoose.Types.ObjectId(rawTeacherId);
    const schoolObjId = new mongoose.Types.ObjectId(schoolId);

    // Source 1 & 2: classes where teacher appears in details.teacherId OR subjectTeachers
    const classesFromClassDoc = await Class.find({
      schoolId: schoolObjId,
      $or: [
        { "details.teacherId": teacherObjId },
        { "details.subjectTeachers.teacherId": teacherObjId },
      ],
    }).select("_id");

    // Source 3: Teacher.assignedClasses[]
    const teacher =
      await Teacher.findById(teacherObjId).select("assignedClasses");

    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found" });
    }

    // Merge and deduplicate all class IDs
    const allClassIds = new Set([
      ...classesFromClassDoc.map((c) => c._id.toString()),
      ...(teacher.assignedClasses || []).map((id) => id.toString()),
    ]);

    if (allClassIds.size === 0) {
      return res.json({ success: true, data: [], assignedClasses: [] });
    }

    const classIdArray = [...allClassIds].map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    // Fetch all class docs for the dropdown (includes empty classes)
    const allClassDocs = await Class.find({
      _id: { $in: classIdArray },
    })
      .select("_id name")
      .sort({ name: 1 });

    const { page, limit, skip, paginate } = parsePagination(req.query);
    const { search, classId, gender, category } = req.query;

    const filter = {
      schoolId: schoolObjId,
      classId: { $in: classIdArray },
    };

    if (classId) {
      if (
        mongoose.Types.ObjectId.isValid(String(classId)) &&
        allClassIds.has(String(classId))
      ) {
        filter.classId = classId;
      } else {
        return res.json({
          success: true,
          data: [],
          assignedClasses: allClassDocs,
          pagination: { total: 0, page: 1, limit, totalPages: 0, hasNextPage: false, hasPrevPage: false },
        });
      }
    }

    if (gender === "Male" || gender === "Female") {
      filter.gender = gender;
    }

    if (category) {
      if (category === "General") {
        filter.$or = [
          { category: "General" },
          { category: { $exists: false } },
          { category: null },
        ];
      } else {
        filter.category = category;
      }
    }

    if (search?.trim()) {
      const q = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(q, "i");
      const searchOr = [
        { firstName: rx },
        { lastName: rx },
        { studentId: rx },
        { rollNo: rx },
        { fatherName: rx },
        { motherName: rx },
        { guardianName: rx },
        { fatherMobile: rx },
        { motherMobile: rx },
        { guardianMobile: rx },
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }

    const total = await Student.countDocuments(filter);

    const students = await applyPagination(
      Student.find(filter)
        .populate("classId", "name")
        .populate("sectionId", "name")
        .sort({ createdAt: -1 }),
      { page, limit, skip, paginate },
    );

    if (!paginate) {
      return res.json({
        success: true,
        data: students,
        assignedClasses: allClassDocs,
      });
    }

    const meta = sendPaginated(res, { items: students, total, page, limit });
    return res.json({ ...meta, assignedClasses: allClassDocs });
  } catch (error) {
    console.error("getStudentsByTeacher error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
/* ================= STUDENT DOCUMENTS DIRECTORY ================= */

const DOCUMENT_LABELS = {
  studentPhoto: "Student Photo",
  fatherPhoto: "Father Photo",
  motherPhoto: "Mother Photo",
  guardianPhoto: "Guardian Photo",
  birthCertificate: "Birth Certificate",
  transferCertificate: "Transfer Certificate",
  studentAadhar: "Student Aadhaar",
  fatherAadhar: "Father Aadhaar",
  motherAadhar: "Mother Aadhaar",
};

const pushDocRow = (rows, base, key, label, file, source) => {
  const url = String(file?.url || "").trim();
  if (!url) return;
  rows.push({
    ...base,
    documentKey: key,
    documentLabel: label || key,
    url,
    fileType: file?.type || "",
    source,
  });
};

export const getStudentDocuments = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    const { classId, sectionId, search } = req.query;
    const filter = { schoolId };

    if (classId && mongoose.Types.ObjectId.isValid(String(classId))) {
      filter.classId = classId;
    }
    if (sectionId && mongoose.Types.ObjectId.isValid(String(sectionId))) {
      filter.sectionId = sectionId;
    }

    if (search?.trim()) {
      const q = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(q, "i");
      filter.$or = [
        { firstName: rx },
        { lastName: rx },
        { studentId: rx },
        { rollNo: rx },
      ];
    }

    const students = await Student.find(filter)
      .select(
        "firstName lastName studentId rollNo classId sectionId documents extraDocuments customFields",
      )
      .populate("classId", "name className")
      .populate("sectionId", "name sectionName")
      .sort({ createdAt: -1 })
      .lean();

    const rows = [];
    for (const student of students) {
      const base = {
        studentMongoId: String(student._id),
        studentId: student.studentId || "",
        studentName: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
        rollNo: student.rollNo || "",
        className:
          student.classId?.name || student.classId?.className || "",
        sectionName:
          student.sectionId?.name || student.sectionId?.sectionName || "",
      };

      const docs = student.documents || {};
      Object.entries(DOCUMENT_LABELS).forEach(([key, label]) => {
        pushDocRow(rows, base, key, label, docs[key], "documents");
      });

      (student.extraDocuments || []).forEach((doc, index) => {
        pushDocRow(
          rows,
          base,
          doc.fieldName || `extra_${index}`,
          doc.label || doc.fieldName || "Extra document",
          doc,
          "extraDocuments",
        );
      });

      (student.customFields || []).forEach((field) => {
        if (String(field?.type || "") !== "file") return;
        pushDocRow(
          rows,
          base,
          field.key || "custom_file",
          field.label || field.key || "Custom document",
          field.file,
          "customFields",
        );
      });
    }

    return res.json({
      success: true,
      data: rows,
      total: rows.length,
    });
  } catch (error) {
    console.error("getStudentDocuments error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch student documents",
    });
  }
};
