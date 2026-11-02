import AcademicYear from "../models/academicYearSchema.js";
import Student from "../models/student.js";
import Payment from "../models/payment.js";
import Attendance from "../models/attendance.js";
import ClassAttendance from "../models/classAttendance.js";
import Exam from "../models/exam.js";
import Result from "../models/result.js";
import Timetable from "../models/timetable.js";
import Homework from "../models/homework.js";
import Assignment from "../models/assignment.js";
import Diary from "../models/diary.js";
import Notice from "../models/notice.js";
import Event from "../models/event.js";
import ClassTest from "../models/classTest.js";
import { invalidateSessionCache } from "../middlewares/academicSession.js";
import {
  currentSessionName,
  nextSessionName,
  normalizeSessionName,
  sessionDates,
  SESSION_NAME_RE,
} from "../utils/academicSession.js";

/**
 * Collections that belong to an academic session. Masters (classes, sections,
 * subjects, staff, transport, hostel, library) are intentionally shared.
 */
const SESSION_COLLECTIONS = [
  { key: "students", model: Student, dateField: "admissionDate" },
  { key: "payments", model: Payment, dateField: "paidDate" },
  { key: "attendance", model: Attendance, dateField: "date" },
  { key: "classAttendance", model: ClassAttendance, dateField: "date" },
  { key: "exams", model: Exam, dateField: "examDate" },
  { key: "results", model: Result, dateField: null },
  { key: "timetables", model: Timetable, dateField: null },
  { key: "homework", model: Homework, dateField: "date" },
  { key: "assignments", model: Assignment, dateField: null },
  { key: "diary", model: Diary, dateField: "date" },
  { key: "notices", model: Notice, dateField: "publishDate" },
  { key: "events", model: Event, dateField: "startDate" },
  { key: "classTests", model: ClassTest, dateField: "testDate" },
];

const schoolIdOf = (req) => req.user?.school_id;

const adminRoles = new Set(["school_admin", "staff_admin", "super_admin"]);

const ensureSessions = async (schoolId) => {
  let sessions = await AcademicYear.find({ schoolId })
    .sort({ startDate: -1, name: -1 })
    .lean();

  if (sessions.length === 0) {
    const name = currentSessionName();
    const { startDate, endDate } = sessionDates(name);
    await AcademicYear.create({ schoolId, name, startDate, endDate, isActive: true });
    sessions = await AcademicYear.find({ schoolId })
      .sort({ startDate: -1, name: -1 })
      .lean();
  } else if (!sessions.some((session) => session.isActive)) {
    const fallback = sessions[0];
    await AcademicYear.updateOne(
      { _id: fallback._id },
      { $set: { isActive: true } }
    );
    fallback.isActive = true;
  }

  return sessions;
};

const activateExclusively = async (schoolId, sessionId) => {
  await AcademicYear.updateMany(
    { schoolId, _id: { $ne: sessionId } },
    { $set: { isActive: false } }
  );
  await AcademicYear.updateOne(
    { _id: sessionId, schoolId },
    { $set: { isActive: true } }
  );
};

const usageFor = async (schoolId, name) => {
  const usage = {};
  let total = 0;
  await Promise.all(
    SESSION_COLLECTIONS.map(async ({ key, model }) => {
      try {
        const count = await model
          .countDocuments({ schoolId, academicYear: name })
          .setOptions({ skipSession: true });
        if (count > 0) {
          usage[key] = count;
          total += count;
        }
      } catch {
        /* collection/model may not use the field yet */
      }
    })
  );
  return { total, usage };
};

/* ---------------- LIST (auto-creates the first session) ---------------- */
export const getAcademicYears = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    const sessions = await ensureSessions(schoolId);
    const active = sessions.find((session) => session.isActive) || sessions[0];

    return res.json({
      success: true,
      data: {
        sessions: sessions.map((session) => ({
          _id: session._id,
          name: session.name,
          startDate: session.startDate,
          endDate: session.endDate,
          isActive: Boolean(session.isActive),
        })),
        activeSession: active
          ? {
              _id: active._id,
              name: active.name,
              startDate: active.startDate,
              endDate: active.endDate,
            }
          : null,
        suggestedNext: nextSessionName(active?.name || currentSessionName()),
      },
    });
  } catch (error) {
    console.error("getAcademicYears failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not load academic sessions.",
    });
  }
};

/* ---------------- CREATE ---------------- */
export const createAcademicYear = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }
    if (!adminRoles.has(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const name = normalizeSessionName(req.body?.name);
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Session name is required (e.g. 2026-27).",
      });
    }
    if (!SESSION_NAME_RE.test(name)) {
      return res.status(400).json({
        success: false,
        message: "Use the format YYYY-YY, e.g. 2026-27.",
      });
    }

    const existing = await AcademicYear.countDocuments({ schoolId });
    if (existing >= 30) {
      return res.status(400).json({
        success: false,
        message: "Too many sessions. Delete old ones first.",
      });
    }

    const clash = await AcademicYear.findOne({ schoolId, name }).lean();
    if (clash) {
      return res.status(409).json({
        success: false,
        message: `Session ${name} already exists.`,
      });
    }

    const defaults = sessionDates(name);
    const startDate = req.body?.startDate || defaults.startDate;
    const endDate = req.body?.endDate || defaults.endDate;
    const makeActive =
      Boolean(req.body?.isActive) || existing === 0;

    const session = await AcademicYear.create({
      schoolId,
      name,
      startDate,
      endDate,
      isActive: makeActive,
    });

    if (makeActive) await activateExclusively(schoolId, session._id);
    invalidateSessionCache(schoolId);

    return res.status(201).json({
      success: true,
      message: `Session ${name} created.`,
      data: session,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "That session already exists.",
      });
    }
    console.error("createAcademicYear failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not create the session.",
    });
  }
};

/* ---------------- UPDATE ---------------- */
export const updateAcademicYear = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }
    if (!adminRoles.has(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const session = await AcademicYear.findOne({
      _id: req.params.id,
      schoolId,
    });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    const nextName =
      req.body?.name !== undefined
        ? normalizeSessionName(req.body.name)
        : session.name;

    if (!nextName) {
      return res.status(400).json({
        success: false,
        message: "Session name cannot be empty.",
      });
    }
    if (!SESSION_NAME_RE.test(nextName)) {
      return res.status(400).json({
        success: false,
        message: "Use the format YYYY-YY, e.g. 2026-27.",
      });
    }

    const renaming = nextName !== session.name;
    if (renaming) {
      const clash = await AcademicYear.findOne({
        schoolId,
        name: nextName,
        _id: { $ne: session._id },
      }).lean();
      if (clash) {
        return res.status(409).json({
          success: false,
          message: `Session ${nextName} already exists.`,
        });
      }
    }

    const update = { name: nextName };
    if (req.body?.startDate !== undefined) update.startDate = req.body.startDate || null;
    if (req.body?.endDate !== undefined) update.endDate = req.body.endDate || null;

    // Keep dates sensible when only the label changed.
    if (renaming && req.body?.startDate === undefined && req.body?.endDate === undefined) {
      const defaults = sessionDates(nextName);
      update.startDate = defaults.startDate || session.startDate;
      update.endDate = defaults.endDate || session.endDate;
    }

    const oldName = session.name;
    session.set(update);
    await session.save();

    if (renaming) {
      // Move every tagged record to the new label so nothing disappears from
      // the session view after a rename.
      await Promise.all(
        SESSION_COLLECTIONS.map(({ model }) =>
          model
            .updateMany(
              { schoolId, academicYear: oldName },
              { $set: { academicYear: nextName } }
            )
            .setOptions({ skipSession: true })
            .catch(() => null)
        )
      );
    }

    if (req.body?.isActive) {
      await activateExclusively(schoolId, session._id);
      session.isActive = true;
    }

    invalidateSessionCache(schoolId);

    return res.json({
      success: true,
      message: "Session updated.",
      data: session,
    });
  } catch (error) {
    console.error("updateAcademicYear failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not update the session.",
    });
  }
};

/* ---------------- ACTIVATE ---------------- */
export const activateAcademicYear = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }
    if (!adminRoles.has(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const session = await AcademicYear.findOne({
      _id: req.params.id,
      schoolId,
    });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    await activateExclusively(schoolId, session._id);
    invalidateSessionCache(schoolId);

    return res.json({
      success: true,
      message: `${session.name} is now the active session.`,
      data: { _id: session._id, name: session.name, isActive: true },
    });
  } catch (error) {
    console.error("activateAcademicYear failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not activate the session.",
    });
  }
};

/* ---------------- USAGE ---------------- */
export const getAcademicYearUsage = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }

    const session = await AcademicYear.findOne({
      _id: req.params.id,
      schoolId,
    }).lean();
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    const usage = await usageFor(schoolId, session.name);
    return res.json({ success: true, data: { ...usage, name: session.name } });
  } catch (error) {
    console.error("getAcademicYearUsage failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not check session usage.",
    });
  }
};

/* ---------------- DELETE ---------------- */
export const deleteAcademicYear = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }
    if (!adminRoles.has(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const session = await AcademicYear.findOne({
      _id: req.params.id,
      schoolId,
    });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    if (session.isActive) {
      return res.status(400).json({
        success: false,
        message: "Activate another session before deleting this one.",
      });
    }

    const total = await AcademicYear.countDocuments({ schoolId });
    if (total <= 1) {
      return res.status(400).json({
        success: false,
        message: "A school needs at least one session.",
      });
    }

    const { total: used, usage } = await usageFor(schoolId, session.name);
    if (used > 0) {
      return res.status(400).json({
        success: false,
        message: `This session still has ${used} record(s) (${Object.entries(usage)
          .map(([key, count]) => `${count} ${key}`)
          .join(", ")}). Move or delete them first.`,
        data: { usage },
      });
    }

    await AcademicYear.deleteOne({ _id: session._id, schoolId });
    invalidateSessionCache(schoolId);

    return res.json({
      success: true,
      message: `Session ${session.name} deleted.`,
    });
  } catch (error) {
    console.error("deleteAcademicYear failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not delete the session.",
    });
  }
};

/* ---------------- ASSIGN EXISTING (untagged) RECORDS ---------------- */
export const assignExistingToSession = async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "School not identified.",
      });
    }
    if (!adminRoles.has(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const session = await AcademicYear.findOne({
      _id: req.params.id,
      schoolId,
    }).lean();
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    const untagged = {
      $or: [
        { academicYear: { $exists: false } },
        { academicYear: null },
        { academicYear: "" },
      ],
    };

    const assigned = {};
    for (const { key, model } of SESSION_COLLECTIONS) {
      try {
        const result = await model
          .updateMany(
            { schoolId, ...untagged },
            { $set: { academicYear: session.name } }
          )
          .setOptions({ skipSession: true });
        if (result.modifiedCount > 0) assigned[key] = result.modifiedCount;
      } catch {
        /* ignore models without the field */
      }
    }

    invalidateSessionCache(schoolId);

    return res.json({
      success: true,
      message: `Existing records assigned to ${session.name}.`,
      data: { assigned },
    });
  } catch (error) {
    console.error("assignExistingToSession failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not assign existing records.",
    });
  }
};
