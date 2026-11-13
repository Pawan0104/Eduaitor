import mongoose from "mongoose";

import Registration from "../models/registration.js";
import Class from "../models/class.js";
import Section from "../models/section.js";
import School from "../models/school.js";
import Stream from "../models/stream.js";
import AdmissionForm from "../models/admissionForm.js";
import { resolveStream } from "../utils/resolveStream.js";
import {
  activeSessionName,
  findExamForClass,
  linkExam,
  nextRegistrationNumber,
} from "../utils/registration.js";

/**
 * In-memory rate limit for the public form. A parent should not be able to
 * hammer the endpoint, but the limit is generous enough for a school's rush.
 */
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 8;
const rateBuckets = new Map();

const rateLimited = (key) => {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
    rateBuckets.set(key, { start: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX;
};

// Keep the map from growing forever on a long-running server.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.start > RATE_WINDOW_MS * 3) rateBuckets.delete(key);
  }
}, RATE_WINDOW_MS).unref?.();

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

const schoolByToken = async (token) => {
  const clean = sanitize(token, 80);
  if (!clean) return null;
  return School.findOne({
    "registrationForm.token": clean,
    "registrationForm.publicEnabled": true,
  })
    .select("school_name school_logo registrationForm address contact_email contact_phone")
    .lean();
};

const publicClassFilter = (school) => {
  const config = school.registrationForm || {};
  const open = Array.isArray(config.openClassIds) ? config.openClassIds : [];
  const query = { schoolId: school._id, status: "Active" };
  if (open.length) query._id = { $in: open };
  return query;
};

/* ------------------------------------------------------------------ *
 * PUBLIC FORM CONFIG (GET)
 * ------------------------------------------------------------------ */
export const getPublicRegistrationForm = async (req, res) => {
  try {
    const school = await schoolByToken(req.params.token);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: "This registration link is not available.",
      });
    }

    const classes = await Class.find(publicClassFilter(school))
      .select("name details")
      .populate("details.sectionId", "name status")
      .sort({ name: 1 })
      .lean();

    const sections = await Section.find({
      schoolId: school._id,
      status: "Active",
    })
      .select("name")
      .sort({ name: 1 })
      .lean();

    const streams = await Stream.find({
      schoolId: school._id,
      status: "Active",
    })
      .select("name code")
      .sort({ name: 1 })
      .lean();

    const activeYear = await activeSessionName(school._id);
    const formConfig = await AdmissionForm.findOne({
      schoolId: school._id,
      formType: "registration",
    })
      .select("steps")
      .lean();

    return res.json({
      success: true,
      data: {
        school: {
          name: school.school_name || "",
          logo: school.school_logo || "",
          address: school.address || "",
          phone: school.contact_phone || "",
          email: school.contact_email || "",
        },
        academicYear: activeYear,
        instructions: school.registrationForm?.instructions || "",
        formSteps: formConfig?.steps || null,
        classes: classes.map((cls) => ({
          _id: cls._id,
          name: cls.name,
          sections: (cls.details || [])
            .filter(
              (detail) =>
                detail.sectionId &&
                detail.sectionId._id &&
                String(detail.sectionId.status || "Active") === "Active",
            )
            .map((detail) => ({
              _id: detail.sectionId._id,
              name: detail.sectionId.name || "Section",
            })),
        })),
        sections: sections.map((section) => ({
          _id: section._id,
          name: section.name,
        })),
        streams: streams.map((stream) => ({
          _id: stream._id,
          name: stream.name,
          code: stream.code || "",
        })),
      },
    });
  } catch (error) {
    console.error("getPublicRegistrationForm failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not load the registration form.",
    });
  }
};

/* ------------------------------------------------------------------ *
 * PUBLIC SUBMIT (POST)
 * ------------------------------------------------------------------ */
export const submitPublicRegistration = async (req, res) => {
  try {
    const school = await schoolByToken(req.params.token);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: "This registration link is not available.",
      });
    }

    const ip =
      String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.ip ||
      "unknown";
    if (rateLimited(`${school._id}:${ip}`)) {
      return res.status(429).json({
        success: false,
        message: "Too many submissions. Please try again after a minute.",
      });
    }

    const body = req.body || {};
    const studentName = sanitize(body.studentName, 120);
    const parentName = sanitize(body.parentName, 120);
    const parentMobile = sanitize(body.parentMobile, 20)
      .replace(/\D/g, "")
      .slice(-10);

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
        message: "Please enter a valid 10-digit mobile number.",
      });
    }
    if (!body.classId || !mongoose.Types.ObjectId.isValid(body.classId)) {
      return res
        .status(400)
        .json({ success: false, message: "Please select a class." });
    }

    const cls = await Class.findOne({
      ...publicClassFilter(school),
      _id: body.classId,
    })
      .select("name")
      .lean();
    if (!cls) {
      return res.status(400).json({
        success: false,
        message: "This class is not open for registration.",
      });
    }

    let section = null;
    if (body.sectionId && mongoose.Types.ObjectId.isValid(body.sectionId)) {
      section = await Section.findOne({
        _id: body.sectionId,
        schoolId: school._id,
        status: "Active",
      })
        .select("name")
        .lean();
    }

    let resolvedPublicStream = { streamId: null, stream: "" };
    try {
      resolvedPublicStream = await resolveStream(
        school._id,
        body.streamId || null,
        body.classId || null,
      );
    } catch (streamErr) {
      return res.status(streamErr.statusCode || 400).json({
        success: false,
        message: streamErr.message || "Invalid stream selected.",
      });
    }

    const academicYear = await activeSessionName(school._id);

    const duplicate = await Registration.findOne({
      schoolId: school._id,
      parentMobile,
      classId: cls._id,
      academicYear,
      status: { $in: ["registered", "exam_scheduled", "passed"] },
    })
      .select("_id registrationNumber")
      .lean();
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `An application (${duplicate.registrationNumber}) already exists for this mobile number and class. Please contact the school office.`,
        data: { registrationNumber: duplicate.registrationNumber },
      });
    }

    const registration = new Registration({
      schoolId: school._id,
      registrationNumber: await nextRegistrationNumber(school._id),
      academicYear,
      studentName,
      dob: parseDate(body.dob),
      gender: ["Male", "Female", "Other"].includes(body.gender)
        ? body.gender
        : "",
      bloodGroup: sanitize(body.bloodGroup, 10),
      classId: cls._id,
      className: cls.name,
      sectionId: section?._id || null,
      sectionName: section?.name || "",
      streamId: resolvedPublicStream.streamId,
      stream: resolvedPublicStream.stream,
      parentName,
      parentMobile,
      parentEmail: sanitize(body.parentEmail, 160),
      address: sanitize(body.address, 400),
      city: sanitize(body.city, 80),
      state: sanitize(body.state, 80),
      district: sanitize(body.district, 80),
      pincode: sanitize(body.pincode, 10),
      previousSchoolName: sanitize(body.previousSchoolName, 160),
      notes: sanitize(body.notes, 600),
      customFields: Array.isArray(body.customFields) ? body.customFields : [],
      source: "public",
      createdByName: "Website",
      status: "registered",
    });

    const exam = await findExamForClass(school._id, cls._id);
    if (exam) linkExam(registration, exam);

    await registration.save();

    return res.status(201).json({
      success: true,
      message: exam
        ? `Application received. Entrance exam: ${exam.name} on ${new Date(
            exam.examDate,
          ).toLocaleDateString("en-IN")} at ${exam.startTime || "the school"}.`
        : "Application received. The school office will contact you shortly.",
      data: {
        registrationNumber: registration.registrationNumber,
        studentName: registration.studentName,
        className: registration.className,
        status: registration.status,
        entrance: registration.entrance,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Could not save the application. Please try again.",
      });
    }
    console.error("submitPublicRegistration failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not submit the application. Please try again.",
    });
  }
};
