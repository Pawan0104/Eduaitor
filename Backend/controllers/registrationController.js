import crypto from "node:crypto";
import { resolveStream } from "../utils/resolveStream.js";
import mongoose from "mongoose";

import Registration from "../models/registration.js";
import EntranceExam from "../models/entranceExam.js";
import Class from "../models/class.js";
import Section from "../models/section.js";
import Lead from "../models/lead.js";
import School from "../models/school.js";
import { SESSION_NAME_RE } from "../utils/academicSession.js";
import {
  activeSessionName,
  findExamForClass,
  linkExam,
  nextRegistrationNumber,
  schoolAllowsEntranceExam,
  unlinkExam,
} from "../utils/registration.js";

const ADMIN_ROLES = new Set(["school_admin", "staff_admin", "super_admin"]);

const schoolIdOf = (req) => req.user?.school_id;

const assertAdmin = (req) => {
  if (!schoolIdOf(req)) {
    const error = new Error("School not identified.");
    error.statusCode = 403;
    throw error;
  }
  if (!ADMIN_ROLES.has(req.user?.role)) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }
};

const sanitize = (value, max = 400) =>
  String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const resolveClassName = async (schoolId, classId) => {
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    const error = new Error("Select a valid class.");
    error.statusCode = 400;
    throw error;
  }
  const cls = await Class.findOne({ _id: classId, schoolId })
    .select("name")
    .lean();
  if (!cls) {
    const error = new Error("Selected class was not found.");
    error.statusCode = 400;
    throw error;
  }
  return cls.name;
};

const resolveSection = async (schoolId, sectionId) => {
  if (!sectionId) return { sectionId: null, sectionName: "" };
  if (!mongoose.Types.ObjectId.isValid(sectionId)) {
    return { sectionId: null, sectionName: "" };
  }
  const section = await Section.findOne({ _id: sectionId, schoolId })
    .select("name")
    .lean();
  return section
    ? { sectionId: section._id, sectionName: section.name }
    : { sectionId: null, sectionName: "" };
};

const resolveActor = (user = {}) => ({
  userId:
    user._id ||
    user.id ||
    user.staff_id ||
    user.teacher_id ||
    user.school_id ||
    user.userId ||
    "system",
  name: user.name || user.email || user.role || "Unknown User",
  role: user.role || "",
});

const makeFollowUp = (actor, comment, extra = {}) => ({
  comment: String(comment || "")
    .trim()
    .slice(0, 1000),
  addedBy: {
    userId: actor?.userId || "system",
    name: actor?.name || "System",
    role: actor?.role || "system",
  },
  nextFollowUpDate: parseDate(extra.nextFollowUpDate),
  assignedTo: String(extra.assignedTo || "").trim().slice(0, 120),
  createdAt: new Date(),
});

const normalizeCustomFieldList = (list = []) =>
  (Array.isArray(list) ? list : [])
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

const fieldLabelKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "");

/** Keep every lead custom value, then let non-empty registration values override. */
const mergeLeadCustomFields = (leadFields = [], submittedFields = []) => {
  const merged = new Map();
  for (const field of leadFields) {
    if (!field?.key) continue;
    merged.set(field.key, field);
    const labelKey = fieldLabelKey(field.label || field.key);
    if (labelKey) merged.set(`label:${labelKey}`, field);
  }

  const result = [];
  const usedLeadKeys = new Set();
  for (const field of submittedFields) {
    if (!field?.key) continue;
    const labelKey = fieldLabelKey(field.label || field.key);
    const fromLead =
      merged.get(field.key) ||
      (labelKey ? merged.get(`label:${labelKey}`) : null);
    const submittedEmpty = !String(field.value || "").trim();
    const leadValue = String(fromLead?.value || "").trim();
    const next = {
      ...field,
      value:
        submittedEmpty && leadValue ? fromLead.value : field.value,
      label: field.label || fromLead?.label || field.key,
    };
    result.push(next);
    if (fromLead?.key) usedLeadKeys.add(fromLead.key);
    usedLeadKeys.add(field.key);
  }

  for (const field of leadFields) {
    if (!field?.key || usedLeadKeys.has(field.key)) continue;
    if (!String(field.value || "").trim()) continue;
    result.push(field);
    usedLeadKeys.add(field.key);
  }

  return result;
};

const cloneFollowUps = (list = []) =>
  (Array.isArray(list) ? list : [])
    .filter((entry) => entry && String(entry.comment || "").trim())
    .map((entry) => ({
      comment: String(entry.comment).trim().slice(0, 1000),
      addedBy: {
        userId: entry.addedBy?.userId ?? "system",
        name: String(entry.addedBy?.name || "System").slice(0, 120),
        role: String(entry.addedBy?.role || "").slice(0, 60),
      },
      nextFollowUpDate: entry.nextFollowUpDate
        ? new Date(entry.nextFollowUpDate)
        : null,
      assignedTo: String(entry.assignedTo || "").slice(0, 120),
      createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
    }));

const sourceLabelOf = (plain = {}) => {
  if (plain.source === "public") return "Website";
  if (plain.source === "lead") return "Lead";
  const name = String(plain.createdByName || "").trim();
  return name || "Office";
};

const toPayload = (doc, options = {}) => {
  const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const examGatesAdmission =
    options.entranceExamEnabled !== false &&
    Boolean(plain.entranceExamId) &&
    plain.entrance?.result !== "pass";
  return {
    ...plain,
    sourceLabel: sourceLabelOf(plain),
    entranceExamEnabled: options.entranceExamEnabled !== false,
    canAdmit:
      plain.status !== "cancelled" &&
      plain.status !== "admitted" &&
      !examGatesAdmission,
  };
};

/* ------------------------------------------------------------------ *
 * LIST
 * ------------------------------------------------------------------ */
export const getRegistrations = async (req, res) => {
  try {
    assertAdmin(req);
    const schoolId = schoolIdOf(req);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const query = { schoolId };
    if (req.query.classId) query.classId = req.query.classId;
    if (req.query.status) query.status = req.query.status;
    if (req.query.examId) query.entranceExamId = req.query.examId;
    if (req.query.academicYear) query.academicYear = req.query.academicYear;

    const search = sanitize(req.query.search, 80);
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { studentName: rx },
        { parentName: rx },
        { parentMobile: rx },
        { registrationNumber: rx },
        { className: rx },
      ];
    }

    const [rows, total, statsRows, entranceExamEnabled] = await Promise.all([
      Registration.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Registration.countDocuments(query),
      Registration.aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(schoolId) } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      schoolAllowsEntranceExam(schoolId),
    ]);

    const stats = {
      total: 0,
      registered: 0,
      exam_scheduled: 0,
      passed: 0,
      failed: 0,
      admitted: 0,
      cancelled: 0,
    };
    for (const row of statsRows) {
      stats[row._id] = row.count;
      stats.total += row.count;
    }

    return res.json({
      success: true,
      data: {
        registrations: rows.map((row) =>
          toPayload(row, { entranceExamEnabled }),
        ),
        stats,
        entranceExamEnabled,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("getRegistrations failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not load registrations.",
    });
  }
};

/* ------------------------------------------------------------------ *
 * SINGLE
 * ------------------------------------------------------------------ */
export const getRegistration = async (req, res) => {
  try {
    assertAdmin(req);
    const registration = await Registration.findOne({
      _id: req.params.id,
      schoolId: schoolIdOf(req),
    }).lean();
    if (!registration) {
      return res
        .status(404)
        .json({ success: false, message: "Registration not found." });
    }
    const entranceExamEnabled = await schoolAllowsEntranceExam(
      schoolIdOf(req),
    );
    return res.json({
      success: true,
      data: toPayload(registration, { entranceExamEnabled }),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not load the registration.",
    });
  }
};

/* ------------------------------------------------------------------ *
 * CREATE
 * ------------------------------------------------------------------ */
export const createRegistration = async (req, res) => {
  try {
    assertAdmin(req);
    const schoolId = schoolIdOf(req);
    const body = req.body || {};

    const studentName = sanitize(body.studentName, 120);
    const parentName = sanitize(body.parentName, 120);
    const parentMobile = sanitize(body.parentMobile, 20).replace(/\D/g, "").slice(-10);

    if (!studentName) {
      return res
        .status(400)
        .json({ success: false, message: "Student name is required." });
    }
    if (!parentName) {
      return res
        .status(400)
        .json({ success: false, message: "Parent name is required." });
    }
    if (parentMobile.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Parent mobile must be a 10-digit number.",
      });
    }
    if (!body.classId) {
      return res
        .status(400)
        .json({ success: false, message: "Applied class is required." });
    }

    const className = await resolveClassName(schoolId, body.classId);
    const section = await resolveSection(schoolId, body.sectionId);
    const resolvedStream = await resolveStream(
      schoolId,
      body.streamId || null,
      body.classId,
    );

    const requestedYear = sanitize(body.academicYear, 12);
    const academicYear =
      requestedYear && SESSION_NAME_RE.test(requestedYear)
        ? requestedYear
        : req.academicYear || (await activeSessionName(schoolId));

    let lead = null;
    let source = "erp";
    if (body.source === "public") source = "public";
    if (body.leadId) {
      if (!mongoose.Types.ObjectId.isValid(body.leadId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid lead reference." });
      }
      lead = await Lead.findOne({ _id: body.leadId, schoolId });
      if (!lead) {
        return res
          .status(404)
          .json({ success: false, message: "Lead not found." });
      }
      if (lead.studentId || lead.status === "admitted") {
        return res.status(400).json({
          success: false,
          message: "This lead has already been admitted.",
        });
      }
      if (lead.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cancelled leads cannot be registered.",
        });
      }
      if (lead.registrationId) {
        return res.status(400).json({
          success: false,
          message:
            "This lead already has a registration. Open that registration instead.",
        });
      }
      source = "lead";
    }

    if (source === "public") {
      const duplicate = await Registration.findOne({
        schoolId,
        parentMobile,
        classId: body.classId,
        academicYear,
        status: { $in: ["registered", "exam_scheduled", "passed"] },
      })
        .select("_id registrationNumber")
        .lean();
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `A registration (${duplicate.registrationNumber}) already exists for this mobile number and class.`,
        });
      }
    }

    const submittedCustomFields = normalizeCustomFieldList(body.customFields);
    const leadCustomFields = normalizeCustomFieldList(lead?.customFields);
    const normalizedCustomFields = lead
      ? mergeLeadCustomFields(leadCustomFields, submittedCustomFields)
      : submittedCustomFields;

    const actor = resolveActor(req.user);
    const registrationNumber = await nextRegistrationNumber(schoolId);
    const followUps = lead ? cloneFollowUps(lead.followUps) : [];
    if (lead) {
      followUps.push(
        makeFollowUp(
          actor,
          `Created from Lead ${lead.leadNumber || lead._id}. Status moved to Registration.`,
        ),
      );
    } else {
      followUps.push(
        makeFollowUp(
          actor,
          `Registration ${registrationNumber} created.`,
        ),
      );
    }

    // Prefer submitted notes; otherwise seed from the lead's latest follow-up.
    let notes = sanitize(body.notes, 600);
    if (!notes && lead?.followUps?.length) {
      const latest = [...lead.followUps]
        .reverse()
        .find((entry) => String(entry?.comment || "").trim());
      if (latest) notes = sanitize(latest.comment, 600);
    }

    const registration = new Registration({
      schoolId,
      registrationNumber,
      academicYear,
      studentName,
      dob: parseDate(body.dob),
      gender: ["Male", "Female", "Other"].includes(body.gender)
        ? body.gender
        : "",
      bloodGroup: sanitize(body.bloodGroup, 10),
      classId: body.classId,
      className,
      sectionId: section.sectionId,
      sectionName: section.sectionName,
      streamId: resolvedStream.streamId,
      stream: resolvedStream.stream,
      parentName,
      parentMobile,
      parentEmail: sanitize(body.parentEmail, 160),
      address: sanitize(body.address, 400),
      city: sanitize(body.city, 80),
      pincode: sanitize(body.pincode, 10),
      previousSchoolName: sanitize(
        body.previousSchoolName || lead?.previousSchoolName,
        160,
      ),
      notes,
      nextFollowUpDate: parseDate(body.nextFollowUpDate),
      customFields: normalizedCustomFields,
      followUps,
      source,
      leadId: lead?._id || null,
      createdBy: req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)
        ? req.user._id
        : null,
      createdByName:
        source === "public"
          ? "Website"
          : actor.name || "",
      status: "registered",
    });

    // Link a scheduled entrance exam unless the caller picked a specific one.
    const entranceExamEnabled = await schoolAllowsEntranceExam(schoolId);
    let exam = null;
    if (
      entranceExamEnabled &&
      body.entranceExamId &&
      mongoose.Types.ObjectId.isValid(body.entranceExamId)
    ) {
      exam = await EntranceExam.findOne({
        _id: body.entranceExamId,
        schoolId,
        status: { $ne: "cancelled" },
      }).lean();
    }
    if (entranceExamEnabled && !exam) {
      exam = await findExamForClass(schoolId, body.classId);
    }
    if (exam) linkExam(registration, exam);

    await registration.save();

    if (lead) {
      await Lead.findOneAndUpdate(
        {
          _id: lead._id,
          schoolId,
          status: { $nin: ["admitted", "cancelled"] },
        },
        {
          $set: {
            registrationId: registration._id,
            status: "processing",
          },
          $push: {
            followUps: makeFollowUp(
              actor,
              `Moved to Registration ${registration.registrationNumber}. Status set to Processing.`,
            ),
          },
        },
      );
    }

    return res.status(201).json({
      success: true,
      message: `${registration.studentName} registered as ${registration.registrationNumber}.`,
      data: toPayload(registration, { entranceExamEnabled }),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Could not allocate a registration number. Please retry.",
      });
    }
    console.error("createRegistration failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not create the registration.",
    });
  }
};

/* ------------------------------------------------------------------ *
 * UPDATE
 * ------------------------------------------------------------------ */
export const updateRegistration = async (req, res) => {
  try {
    assertAdmin(req);
    const schoolId = schoolIdOf(req);
    const registration = await Registration.findOne({
      _id: req.params.id,
      schoolId,
    });
    if (!registration) {
      return res
        .status(404)
        .json({ success: false, message: "Registration not found." });
    }
    if (registration.status === "admitted") {
      return res.status(400).json({
        success: false,
        message: "Admitted registrations are linked to a student and cannot be edited.",
      });
    }

    const body = req.body || {};
    if (body.studentName !== undefined) {
      const value = sanitize(body.studentName, 120);
      if (!value) {
        return res
          .status(400)
          .json({ success: false, message: "Student name is required." });
      }
      registration.studentName = value;
    }
    if (body.parentName !== undefined) {
      const value = sanitize(body.parentName, 120);
      if (!value) {
        return res
          .status(400)
          .json({ success: false, message: "Parent name is required." });
      }
      registration.parentName = value;
    }
    if (body.parentMobile !== undefined) {
      const value = sanitize(body.parentMobile, 20).replace(/\D/g, "").slice(-10);
      if (value.length !== 10) {
        return res.status(400).json({
          success: false,
          message: "Parent mobile must be a 10-digit number.",
        });
      }
      registration.parentMobile = value;
    }
    if (body.parentEmail !== undefined) {
      registration.parentEmail = sanitize(body.parentEmail, 160);
    }
    if (body.dob !== undefined) registration.dob = parseDate(body.dob);
    if (body.gender !== undefined) {
      registration.gender = ["Male", "Female", "Other"].includes(body.gender)
        ? body.gender
        : "";
    }
    if (body.bloodGroup !== undefined) {
      registration.bloodGroup = sanitize(body.bloodGroup, 10);
    }
    if (body.address !== undefined) registration.address = sanitize(body.address, 400);
    if (body.city !== undefined) registration.city = sanitize(body.city, 80);
    if (body.pincode !== undefined) registration.pincode = sanitize(body.pincode, 10);
    if (body.previousSchoolName !== undefined) {
      registration.previousSchoolName = sanitize(body.previousSchoolName, 160);
    }
    if (body.notes !== undefined) registration.notes = sanitize(body.notes, 600);
    if (body.nextFollowUpDate !== undefined) {
      registration.nextFollowUpDate = parseDate(body.nextFollowUpDate);
    }
    if (body.customFields !== undefined) {
      registration.customFields = Array.isArray(body.customFields)
        ? body.customFields
            .filter((field) => field && typeof field.key === "string" && field.key)
            .map((field) => ({
              key: String(field.key).slice(0, 60),
              label: String(field.label ?? "").slice(0, 120),
              type: String(field.type ?? "text").slice(0, 20),
              value:
                field.value === undefined || field.value === null
                  ? ""
                  : String(field.value).slice(0, 4000),
            }))
        : [];
    }

    let classChanged = false;
    if (body.classId !== undefined && String(body.classId) !== String(registration.classId)) {
      const className = await resolveClassName(schoolId, body.classId);
      registration.classId = body.classId;
      registration.className = className;
      classChanged = true;
    }

    if (body.streamId !== undefined || classChanged) {
      const nextStreamId =
        body.streamId !== undefined
          ? body.streamId || null
          : registration.streamId;
      try {
        const resolvedStream = await resolveStream(
          schoolId,
          nextStreamId,
          registration.classId,
        );
        registration.streamId = resolvedStream.streamId;
        registration.stream = resolvedStream.stream;
      } catch (streamErr) {
        if (classChanged && body.streamId === undefined) {
          // Class changed and previous stream is not valid for the new class.
          registration.streamId = null;
          registration.stream = "";
        } else {
          return res.status(streamErr.statusCode || 400).json({
            success: false,
            message: streamErr.message || "Invalid stream selected.",
          });
        }
      }
    }

    if (body.sectionId !== undefined || classChanged) {
      const section = await resolveSection(schoolId, body.sectionId);
      registration.sectionId = section.sectionId;
      registration.sectionName = section.sectionName;
    }

    if (body.academicYear !== undefined) {
      const year = sanitize(body.academicYear, 12);
      if (!SESSION_NAME_RE.test(year)) {
        return res.status(400).json({
          success: false,
          message: "Academic session must look like 2026-27.",
        });
      }
      registration.academicYear = year;
    }

    if (classChanged) {
      unlinkExam(registration);
      const exam = await findExamForClass(schoolId, registration.classId);
      if (exam) linkExam(registration, exam);
    }

    if (body.entranceExamId !== undefined) {
      const raw = body.entranceExamId;
      const canUseExams = await schoolAllowsEntranceExam(schoolId);
      if (!canUseExams) {
        // Entrance exams are off for this school; leave any existing data alone.
      } else if (!raw) {
        unlinkExam(registration);
      } else if (mongoose.Types.ObjectId.isValid(raw)) {
        const exam = await EntranceExam.findOne({
          _id: raw,
          schoolId,
          status: { $ne: "cancelled" },
        }).lean();
        if (exam) linkExam(registration, exam);
      }
    }

    await registration.save();
    return res.json({
      success: true,
      message: "Registration updated.",
      data: toPayload(registration, {
        entranceExamEnabled: await schoolAllowsEntranceExam(schoolId),
      }),
    });
  } catch (error) {
    console.error("updateRegistration failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not update the registration.",
    });
  }
};

/* ------------------------------------------------------------------ *
 * STATUS
 * ------------------------------------------------------------------ */
export const updateRegistrationStatus = async (req, res) => {
  try {
    assertAdmin(req);
    const schoolId = schoolIdOf(req);
    const next = sanitize(req.body?.status, 24).toLowerCase();
    if (!["registered", "cancelled"].includes(next)) {
      return res.status(400).json({
        success: false,
        message: "Only 'registered' or 'cancelled' can be set here. Use Admit to create the student.",
      });
    }

    const registration = await Registration.findOne({
      _id: req.params.id,
      schoolId,
    });
    if (!registration) {
      return res
        .status(404)
        .json({ success: false, message: "Registration not found." });
    }
    if (registration.status === "admitted") {
      return res.status(400).json({
        success: false,
        message: "This registration is already admitted.",
      });
    }

    const actor = resolveActor(req.user);
    const previousStatus = registration.status;

    if (next === "cancelled") {
      registration.status = "cancelled";
      registration.followUps = registration.followUps || [];
      registration.followUps.push(
        makeFollowUp(
          actor,
          `Registration cancelled (was ${previousStatus}).`,
        ),
      );
    } else {
      registration.status = "registered";
      registration.followUps = registration.followUps || [];
      registration.followUps.push(
        makeFollowUp(
          actor,
          `Registration restored to Registered (was ${previousStatus}).`,
        ),
      );
      if (registration.entranceExamId) {
        const canUseExams = await schoolAllowsEntranceExam(schoolId);
        if (canUseExams) {
          const exam = await EntranceExam.findOne({
            _id: registration.entranceExamId,
            schoolId,
          }).lean();
          if (exam && exam.status !== "cancelled") {
            linkExam(registration, exam);
          } else {
            unlinkExam(registration);
            const fallback = await findExamForClass(
              schoolId,
              registration.classId,
            );
            if (fallback) linkExam(registration, fallback);
          }
        }
      } else {
        const exam = await findExamForClass(schoolId, registration.classId);
        if (exam) linkExam(registration, exam);
      }
    }

    await registration.save();

    // Keep the linked lead in sync with registration lifecycle.
    if (registration.leadId) {
      if (next === "cancelled") {
        await Lead.findOneAndUpdate(
          {
            _id: registration.leadId,
            schoolId,
            status: { $nin: ["admitted", "cancelled"] },
          },
          {
            $set: { status: "active" },
            $unset: { registrationId: 1 },
            $push: {
              followUps: makeFollowUp(
                actor,
                `Registration ${registration.registrationNumber} cancelled. Lead returned to Active.`,
              ),
            },
          },
        );
      } else {
        await Lead.findOneAndUpdate(
          {
            _id: registration.leadId,
            schoolId,
            status: { $nin: ["admitted", "cancelled"] },
          },
          {
            $set: {
              status: "processing",
              registrationId: registration._id,
            },
            $push: {
              followUps: makeFollowUp(
                actor,
                `Registration ${registration.registrationNumber} restored. Lead set to Processing.`,
              ),
            },
          },
        );
      }
    }

    return res.json({
      success: true,
      message: `Registration marked ${registration.status}.`,
      data: toPayload(registration, {
        entranceExamEnabled: await schoolAllowsEntranceExam(schoolId),
      }),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not update the registration status.",
    });
  }
};

/* ------------------------------------------------------------------ *
 * DELETE
 * ------------------------------------------------------------------ */
export const deleteRegistration = async (req, res) => {
  try {
    assertAdmin(req);
    const schoolId = schoolIdOf(req);
    const registration = await Registration.findOne({
      _id: req.params.id,
      schoolId,
    });
    if (!registration) {
      return res
        .status(404)
        .json({ success: false, message: "Registration not found." });
    }
    if (registration.status === "admitted") {
      return res.status(400).json({
        success: false,
        message: "Admitted registrations keep the student's admission history.",
      });
    }

    if (registration.leadId) {
      await Lead.updateOne(
        { _id: registration.leadId, schoolId },
        { $set: { registrationId: null } },
      );
    }

    await Registration.deleteOne({ _id: registration._id, schoolId });
    return res.json({
      success: true,
      message: `Registration ${registration.registrationNumber || ""} deleted.`,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not delete the registration.",
    });
  }
};

/* ------------------------------------------------------------------ *
 * PUBLIC LINK
 * ------------------------------------------------------------------ */
export const getRegistrationLink = async (req, res) => {
  try {
    assertAdmin(req);
    const schoolId = schoolIdOf(req);
    const school = await School.findById(schoolId)
      .select("school_name entranceExamEnabled registrationForm")
      .lean();
    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found." });
    }

    const entranceExamEnabled = school.entranceExamEnabled !== false;

    let config = school.registrationForm || {};
    if (!config.token) {
      config = {
        publicEnabled: Boolean(config.publicEnabled),
        instructions: config.instructions || "",
        openClassIds: config.openClassIds || [],
        token: crypto.randomBytes(16).toString("hex"),
      };
      await School.updateOne(
        { _id: schoolId },
        { $set: { registrationForm: config } },
      );
    }

    return res.json({
      success: true,
      data: {
        enabled: Boolean(config.publicEnabled),
        entranceExamEnabled,
        token: config.token,
        path: `/register/${config.token}`,
        instructions: config.instructions || "",
        openClassIds: config.openClassIds || [],
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not load the registration link.",
    });
  }
};

export const updateRegistrationLink = async (req, res) => {
  try {
    assertAdmin(req);
    const schoolId = schoolIdOf(req);
    const school = await School.findById(schoolId)
      .select("entranceExamEnabled registrationForm")
      .lean();
    if (!school) {
      return res
        .status(404)
        .json({ success: false, message: "School not found." });
    }

    const current = school.registrationForm || {};
    const next = {
      publicEnabled:
        req.body?.enabled !== undefined
          ? Boolean(req.body.enabled)
          : Boolean(current.publicEnabled),
      instructions:
        req.body?.instructions !== undefined
          ? sanitize(req.body.instructions, 1000)
          : current.instructions || "",
      openClassIds: Array.isArray(req.body?.openClassIds)
        ? req.body.openClassIds.filter((id) =>
            mongoose.Types.ObjectId.isValid(id),
          )
        : current.openClassIds || [],
      token:
        req.body?.rotate || !current.token
          ? crypto.randomBytes(16).toString("hex")
          : current.token,
    };

    await School.updateOne(
      { _id: schoolId },
      { $set: { registrationForm: next } },
    );

    return res.json({
      success: true,
      message: next.publicEnabled
        ? "Public registration form is live."
        : "Public registration form is off.",
      data: {
        enabled: next.publicEnabled,
        entranceExamEnabled: school.entranceExamEnabled !== false,
        token: next.token,
        path: `/register/${next.token}`,
        instructions: next.instructions,
        openClassIds: next.openClassIds,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not update the registration link.",
    });
  }
};

/* ------------------------------------------------------------------ *
 * FOLLOW-UPS
 * ------------------------------------------------------------------ */
export const addRegistrationFollowUp = async (req, res) => {
  try {
    assertAdmin(req);
    const schoolId = schoolIdOf(req);
    const comment = String(req.body?.comment || "").trim();
    if (!comment) {
      return res
        .status(400)
        .json({ success: false, message: "Feedback comment is required" });
    }

    const hasNextDate = req.body?.nextFollowUpDate !== undefined;
    const followUp = makeFollowUp(resolveActor(req.user), comment, {
      nextFollowUpDate: req.body?.nextFollowUpDate,
      assignedTo: req.body?.assignedTo,
    });
    if (!followUp.comment) {
      return res
        .status(400)
        .json({ success: false, message: "Feedback comment is required" });
    }

    const update = { $push: { followUps: followUp } };
    if (hasNextDate) {
      update.$set = { nextFollowUpDate: followUp.nextFollowUpDate };
    }

    const registration = await Registration.findOneAndUpdate(
      { _id: req.params.id, schoolId },
      update,
      { new: true },
    );

    if (!registration) {
      return res
        .status(404)
        .json({ success: false, message: "Registration not found" });
    }

    return res.json({
      success: true,
      message: "Feedback added successfully",
      data: toPayload(registration, {
        entranceExamEnabled: await schoolAllowsEntranceExam(schoolId),
      }),
    });
  } catch (error) {
    console.error("addRegistrationFollowUp failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to add feedback",
    });
  }
};

export const getRegistrationFollowUps = async (req, res) => {
  try {
    assertAdmin(req);
    const registration = await Registration.findOne({
      _id: req.params.id,
      schoolId: schoolIdOf(req),
    })
      .select("studentName followUps")
      .lean();

    if (!registration) {
      return res
        .status(404)
        .json({ success: false, message: "Registration not found" });
    }

    const followUps = [...(registration.followUps || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    return res.json({
      success: true,
      data: {
        registrationId: req.params.id,
        studentName: registration.studentName,
        followUps,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to load feedback",
    });
  }
};
