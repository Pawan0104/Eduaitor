import mongoose from "mongoose";

import EntranceExam from "../models/entranceExam.js";
import Registration from "../models/registration.js";
import Class from "../models/class.js";
import AcademicYear from "../models/academicYearSchema.js";
import { schoolAllowsEntranceExam } from "../utils/registration.js";
import { currentSessionName, SESSION_NAME_RE } from "../utils/academicSession.js";

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

const activeSessionName = async (schoolId) => {
  const active = await AcademicYear.findOne({ schoolId, isActive: true })
    .select("name")
    .lean();
  return active?.name || currentSessionName();
};

const snapshotFor = (exam) => ({
  examName: exam.name || "",
  examDate: exam.examDate || null,
  startTime: exam.startTime || "",
  endTime: exam.endTime || "",
  venue: exam.venue || "",
  totalMarks: Number(exam.totalMarks || 0),
  passingMarks: Number(exam.passingMarks || 0),
  updatedAt: new Date(),
});

const resultFor = (obtained, passingMarks) => {
  if (obtained === null || obtained === undefined || obtained === "") {
    return "pending";
  }
  const marks = Number(obtained);
  if (!Number.isFinite(marks)) return "pending";
  return marks >= Number(passingMarks || 0) ? "pass" : "fail";
};

const statusFor = (result) => {
  if (result === "pass") return "passed";
  if (result === "fail" || result === "absent") return "failed";
  return "exam_scheduled";
};

/** Keep every linked registration's exam snapshot in sync after an edit. */
const syncRegistrations = async (exam) => {
  const linked = await Registration.find({ entranceExamId: exam._id });
  const snapshot = snapshotFor(exam);

  for (const registration of linked) {
    const obtained = registration.entrance?.obtainedMarks ?? null;
    const result = resultFor(obtained, exam.passingMarks);
    registration.entrance = {
      ...snapshot,
      obtainedMarks: obtained,
      result,
      remarks: registration.entrance?.remarks || "",
    };
    registration.status = statusFor(result);
    await registration.save();
  }
};

/* ------------------------------------------------------------------ *
 * LIST
 * ------------------------------------------------------------------ */
export const getEntranceExams = async (req, res) => {
  try {
    assertAdmin(req);
    const schoolId = schoolIdOf(req);

    const query = { schoolId };
    if (req.query.classId) query.classId = req.query.classId;
    if (req.query.status) query.status = req.query.status;

    const search = sanitize(req.query.search, 80);
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ name: rx }, { className: rx }, { venue: rx }];
    }

    const [exams, counts] = await Promise.all([
      EntranceExam.find(query).sort({ examDate: -1, createdAt: -1 }).lean(),
      Registration.aggregate([
        {
          $match: {
            schoolId: new mongoose.Types.ObjectId(schoolId),
            entranceExamId: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$entranceExamId",
            total: { $sum: 1 },
            passed: {
              $sum: { $cond: [{ $eq: ["$entrance.result", "pass"] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ["$entrance.result", "fail"] }, 1, 0] },
            },
            pending: {
              $sum: {
                $cond: [
                  {
                    $in: ["$status", ["exam_scheduled", "registered"]],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const countMap = new Map(counts.map((row) => [String(row._id), row]));

    return res.json({
      success: true,
      data: {
        exams: exams.map((exam) => {
          const info = countMap.get(String(exam._id)) || {};
          return {
            ...exam,
            counts: {
              total: info.total || 0,
              passed: info.passed || 0,
              failed: info.failed || 0,
              pending: info.pending || 0,
            },
          };
        }),
      },
    });
  } catch (error) {
    console.error("getEntranceExams failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not load entrance exams.",
    });
  }
};

/* ------------------------------------------------------------------ *
 * SINGLE (exam + candidates)
 * ------------------------------------------------------------------ */
export const getEntranceExam = async (req, res) => {
  try {
    assertAdmin(req);
    const schoolId = schoolIdOf(req);
    const exam = await EntranceExam.findOne({
      _id: req.params.id,
      schoolId,
    }).lean();
    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Entrance exam not found." });
    }
    const candidates = await Registration.find({
      schoolId,
      entranceExamId: exam._id,
    })
      .sort({ studentName: 1 })
      .lean();
    return res.json({ success: true, data: { exam, candidates } });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not load the entrance exam.",
    });
  }
};

/* ------------------------------------------------------------------ *
 * CREATE
 * ------------------------------------------------------------------ */
export const createEntranceExam = async (req, res) => {
  try {
    assertAdmin(req);
    const schoolId = schoolIdOf(req);
    const body = req.body || {};

    if (!(await schoolAllowsEntranceExam(schoolId))) {
      return res.status(400).json({
        success: false,
        message:
          "Entrance exams are turned off for this school. Ask the platform administrator to enable them.",
      });
    }

    const name = sanitize(body.name, 120);
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Exam name is required." });
    }
    if (!body.classId || !mongoose.Types.ObjectId.isValid(body.classId)) {
      return res
        .status(400)
        .json({ success: false, message: "Select the class for this exam." });
    }
    const cls = await Class.findOne({ _id: body.classId, schoolId })
      .select("name")
      .lean();
    if (!cls) {
      return res
        .status(400)
        .json({ success: false, message: "Selected class was not found." });
    }

    const examDate = parseDate(body.examDate);
    if (!examDate) {
      return res
        .status(400)
        .json({ success: false, message: "Exam date is required." });
    }

    const totalMarks = Math.max(1, Number(body.totalMarks) || 100);
    const passingMarks = Math.min(
      totalMarks,
      Math.max(0, Number(body.passingMarks) || 33),
    );

    const requestedYear = sanitize(body.academicYear, 12);
    const academicYear =
      requestedYear && SESSION_NAME_RE.test(requestedYear)
        ? requestedYear
        : req.academicYear || (await activeSessionName(schoolId));

    const exam = await EntranceExam.create({
      schoolId,
      name,
      academicYear,
      classId: body.classId,
      className: cls.name,
      examDate,
      startTime: sanitize(body.startTime, 10) || "09:00",
      endTime: sanitize(body.endTime, 10) || "11:00",
      venue: sanitize(body.venue, 160),
      totalMarks,
      passingMarks,
      instructions: sanitize(body.instructions, 1000),
      status: "scheduled",
      createdBy:
        req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)
          ? req.user._id
          : null,
    });

    // Pull in every pending registration for this class.
    const pending = await Registration.find({
      schoolId,
      classId: body.classId,
      status: "registered",
    });

    const snapshot = snapshotFor(exam);
    for (const registration of pending) {
      registration.entranceExamId = exam._id;
      registration.entrance = {
        ...snapshot,
        obtainedMarks: null,
        result: "pending",
        remarks: "",
      };
      registration.status = "exam_scheduled";
      await registration.save();
    }

    return res.status(201).json({
      success: true,
      message: `${name} scheduled for ${cls.name}. ${pending.length} candidate(s) linked.`,
      data: { exam, linked: pending.length },
    });
  } catch (error) {
    console.error("createEntranceExam failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not schedule the entrance exam.",
    });
  }
};

/* ------------------------------------------------------------------ *
 * UPDATE
 * ------------------------------------------------------------------ */
export const updateEntranceExam = async (req, res) => {
  try {
    assertAdmin(req);
    const schoolId = schoolIdOf(req);
    const exam = await EntranceExam.findOne({
      _id: req.params.id,
      schoolId,
    });
    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Entrance exam not found." });
    }

    const body = req.body || {};
    if (body.name !== undefined) {
      const value = sanitize(body.name, 120);
      if (!value) {
        return res
          .status(400)
          .json({ success: false, message: "Exam name is required." });
      }
      exam.name = value;
    }

    let classChanged = false;
    if (body.classId !== undefined && String(body.classId) !== String(exam.classId)) {
      if (!mongoose.Types.ObjectId.isValid(body.classId)) {
        return res
          .status(400)
          .json({ success: false, message: "Select a valid class." });
      }
      const cls = await Class.findOne({ _id: body.classId, schoolId })
        .select("name")
        .lean();
      if (!cls) {
        return res
          .status(400)
          .json({ success: false, message: "Selected class was not found." });
      }
      // Detach candidates from the old class before moving the exam.
      await Registration.updateMany(
        { schoolId, entranceExamId: exam._id },
        {
          $set: {
            entranceExamId: null,
            status: "registered",
            entrance: {
              examName: "",
              examDate: null,
              startTime: "",
              endTime: "",
              venue: "",
              totalMarks: 0,
              passingMarks: 0,
              obtainedMarks: null,
              result: "pending",
              remarks: "",
              updatedAt: null,
            },
          },
        },
      );
      exam.classId = body.classId;
      exam.className = cls.name;
      classChanged = true;
    }

    if (body.examDate !== undefined) {
      const date = parseDate(body.examDate);
      if (!date) {
        return res
          .status(400)
          .json({ success: false, message: "Exam date is required." });
      }
      exam.examDate = date;
    }
    if (body.startTime !== undefined) exam.startTime = sanitize(body.startTime, 10);
    if (body.endTime !== undefined) exam.endTime = sanitize(body.endTime, 10);
    if (body.venue !== undefined) exam.venue = sanitize(body.venue, 160);
    if (body.instructions !== undefined) {
      exam.instructions = sanitize(body.instructions, 1000);
    }
    if (body.totalMarks !== undefined) {
      exam.totalMarks = Math.max(1, Number(body.totalMarks) || 1);
    }
    if (body.passingMarks !== undefined) {
      exam.passingMarks = Math.min(
        exam.totalMarks,
        Math.max(0, Number(body.passingMarks) || 0),
      );
    }
    if (body.academicYear !== undefined) {
      const year = sanitize(body.academicYear, 12);
      if (SESSION_NAME_RE.test(year)) exam.academicYear = year;
    }

    await exam.save();
    await syncRegistrations(exam);

    if (classChanged) {
      const pending = await Registration.find({
        schoolId,
        classId: exam.classId,
        status: "registered",
      });
      const snapshot = snapshotFor(exam);
      for (const registration of pending) {
        registration.entranceExamId = exam._id;
        registration.entrance = {
          ...snapshot,
          obtainedMarks: null,
          result: "pending",
          remarks: "",
        };
        registration.status = "exam_scheduled";
        await registration.save();
      }
    }

    return res.json({
      success: true,
      message: "Entrance exam updated.",
      data: exam,
    });
  } catch (error) {
    console.error("updateEntranceExam failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not update the entrance exam.",
    });
  }
};

/* ------------------------------------------------------------------ *
 * MARKS (bulk save + optional complete)
 * ------------------------------------------------------------------ */
export const saveEntranceMarks = async (req, res) => {
  try {
    assertAdmin(req);
    const schoolId = schoolIdOf(req);
    const exam = await EntranceExam.findOne({
      _id: req.params.id,
      schoolId,
    });
    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Entrance exam not found." });
    }

    const results = Array.isArray(req.body?.results) ? req.body.results : [];
    if (!results.length) {
      return res
        .status(400)
        .json({ success: false, message: "No marks were submitted." });
    }

    let updated = 0;
    for (const row of results) {
      if (!row?.registrationId || !mongoose.Types.ObjectId.isValid(row.registrationId)) {
        continue;
      }
      const registration = await Registration.findOne({
        _id: row.registrationId,
        schoolId,
        entranceExamId: exam._id,
      });
      if (!registration) continue;

      const raw = row.obtainedMarks;
      const obtained =
        raw === "" || raw === null || raw === undefined ? null : Number(raw);
      if (obtained !== null && (!Number.isFinite(obtained) || obtained < 0)) {
        continue;
      }
      const marks =
        obtained === null
          ? null
          : Math.min(Number(exam.totalMarks || obtained), obtained);

      const result =
        row.absent === true ? "absent" : resultFor(marks, exam.passingMarks);
      registration.entrance.obtainedMarks = marks;
      registration.entrance.result = result;
      registration.entrance.remarks = sanitize(row.remarks, 300);
      registration.entrance.updatedAt = new Date();
      if (registration.status !== "admitted") {
        registration.status = statusFor(result);
      }
      await registration.save();
      updated += 1;
    }

    if (req.body?.complete === true) {
      exam.status = "completed";
      exam.resultDate = new Date();
      await exam.save();
    }

    return res.json({
      success: true,
      message: `${updated} mark(s) saved${req.body?.complete ? " and the exam is completed" : ""}.`,
      data: { updated, exam },
    });
  } catch (error) {
    console.error("saveEntranceMarks failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not save the entrance marks.",
    });
  }
};

/* ------------------------------------------------------------------ *
 * STATUS
 * ------------------------------------------------------------------ */
export const updateEntranceStatus = async (req, res) => {
  try {
    assertAdmin(req);
    const schoolId = schoolIdOf(req);
    const next = sanitize(req.body?.status, 24).toLowerCase();
    if (!["scheduled", "completed", "cancelled"].includes(next)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid exam status." });
    }

    const exam = await EntranceExam.findOne({
      _id: req.params.id,
      schoolId,
    });
    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Entrance exam not found." });
    }

    exam.status = next;
    if (next === "completed") exam.resultDate = new Date();
    await exam.save();

    if (next === "cancelled") {
      // A cancelled exam must never block admission.
      await Registration.updateMany(
        {
          schoolId,
          entranceExamId: exam._id,
          status: { $in: ["exam_scheduled", "passed", "failed"] },
        },
        {
          $set: {
            entranceExamId: null,
            status: "registered",
            entrance: {
              examName: "",
              examDate: null,
              startTime: "",
              endTime: "",
              venue: "",
              totalMarks: 0,
              passingMarks: 0,
              obtainedMarks: null,
              result: "pending",
              remarks: "",
              updatedAt: null,
            },
          },
        },
      );
    }

    return res.json({
      success: true,
      message: `Exam marked ${next}.`,
      data: exam,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not update the exam status.",
    });
  }
};

/* ------------------------------------------------------------------ *
 * DELETE
 * ------------------------------------------------------------------ */
export const deleteEntranceExam = async (req, res) => {
  try {
    assertAdmin(req);
    const schoolId = schoolIdOf(req);
    const exam = await EntranceExam.findOne({
      _id: req.params.id,
      schoolId,
    });
    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Entrance exam not found." });
    }

    await Registration.updateMany(
      { schoolId, entranceExamId: exam._id, status: { $ne: "admitted" } },
      {
        $set: {
          entranceExamId: null,
          status: "registered",
          entrance: {
            examName: "",
            examDate: null,
            startTime: "",
            endTime: "",
            venue: "",
            totalMarks: 0,
            passingMarks: 0,
            obtainedMarks: null,
            result: "pending",
            remarks: "",
            updatedAt: null,
          },
        },
      },
    );

    await EntranceExam.deleteOne({ _id: exam._id, schoolId });
    return res.json({
      success: true,
      message: `Entrance exam "${exam.name}" deleted.`,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not delete the entrance exam.",
    });
  }
};
