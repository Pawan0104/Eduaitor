import mongoose from "mongoose";
import ExamSchedule from "../models/examSchedule.js";
import Class from "../models/class.js";
import Subject from "../models/subject.js";
import Teacher from "../models/teacher.js";
import {
  scheduleExams,
  validateSchedule,
  computeScore,
  fmtDate,
  parseDate,
} from "../utils/examScheduling.js";

const requireId = (v) => (mongoose.Types.ObjectId.isValid(v) ? v : null);

const clampDuration = (m) =>
  Math.max(15, Math.min(480, Math.round(Number(m) || 120)));

const normalizeHolidays = (h) =>
  (Array.isArray(h) ? h : [])
    .map((d) => String(d).slice(0, 10))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

const buildClassMeta = (doc) => {
  const map = new Map();
  (doc.subjects || []).forEach((s) => {
    if (!map.has(String(s.classId))) {
      map.set(String(s.classId), {
        classId: s.classId,
        className: s.className || "",
        subjects: [],
      });
    }
    map.get(String(s.classId)).subjects.push({
      subjectId: s.subjectId,
      subjectName: s.subjectName || "",
    });
  });
  return [...map.values()];
};

const baseDoc = (req) => req.user.school_id;

/* ── CREATE ── */
export const createExamSchedule = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    if (!schoolId) return res.status(400).json({ success: false, message: "School not identified" });

    const {
      examName,
      paperSubmissionDeadline,
      paperTotalMarks,
      startDate,
      endDate,
      holidays = [],
      autoSundays = true,
      classes = [],
      subjects = [],
      teachers = [],
      teacherUnavailable = [],
      gapRule = 1,
      startTime = "09:00",
      endTime = "11:00",
    } = req.body;

    if (!examName || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: "Exam name, start date and end date are required" });
    }
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (end <= start) {
      return res.status(400).json({ success: false, message: "End date must be greater than start date" });
    }

    const doc = await ExamSchedule.create({
      schoolId,
      examName: String(examName).trim(),
      paperSubmissionDeadline: parseDate(paperSubmissionDeadline) || null,
      paperTotalMarks: Math.max(10, Math.min(500, Number(paperTotalMarks) || 80)),
      startDate: start,
      endDate: end,
      holidays: normalizeHolidays(holidays),
      autoSundays,
      classes: (classes || []).map((c) => requireId(c.classId || c)).filter(Boolean),
      subjects: (subjects || []).map((s) => ({
        classId: requireId(s.classId),
        className: s.className || "",
        subjectId: requireId(s.subjectId),
        subjectName: s.subjectName || "",
        durationMinutes: clampDuration(s.durationMinutes),
      })),
      teachers: (teachers || []).map((t) => requireId(t.teacherId || t)).filter(Boolean),
      teacherUnavailable: (teacherUnavailable || []).map((u) => ({
        teacherId: requireId(u.teacherId),
        dates: normalizeHolidays(u.dates),
      })),
      gapRule,
      startTime: startTime || "09:00",
      endTime: endTime || "11:00",
      createdBy: req.user?._id || null,
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (error) {
    console.error("Create exam schedule error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ── LIST ── */
export const getAllExamSchedules = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    if (!schoolId) return res.status(400).json({ success: false, message: "School not identified" });
    const docs = await ExamSchedule.find({ schoolId })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data: docs });
  } catch (error) {
    console.error("List exam schedules error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ── GET ONE ── */
export const getExamSchedule = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const doc = await ExamSchedule.findOne({ _id: req.params.id, schoolId });
    if (!doc) return res.status(404).json({ success: false, message: "Exam schedule not found" });
    return res.json({ success: true, data: doc });
  } catch (error) {
    console.error("Get exam schedule error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ── UPDATE FORM FIELDS (metadata only) ── */
export const updateExamSchedule = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const doc = await ExamSchedule.findOne({ _id: req.params.id, schoolId });
    if (!doc) return res.status(404).json({ success: false, message: "Exam schedule not found" });

    const {
      examName,
      paperSubmissionDeadline,
      paperTotalMarks,
      startDate,
      endDate,
      holidays,
      autoSundays,
      classes,
      subjects,
      teachers,
      teacherUnavailable,
      gapRule,
      startTime,
      endTime,
      clearSchedule,
    } = req.body;

    if (startDate && endDate) {
      const start = parseDate(startDate);
      const end = parseDate(endDate);
      if (end <= start) {
        return res.status(400).json({ success: false, message: "End date must be greater than start date" });
      }
      doc.startDate = start;
      doc.endDate = end;
    }
    if (examName) doc.examName = String(examName).trim();
    if (paperSubmissionDeadline !== undefined) doc.paperSubmissionDeadline = parseDate(paperSubmissionDeadline) || null;
    if (paperTotalMarks !== undefined) doc.paperTotalMarks = Math.max(10, Math.min(500, Number(paperTotalMarks) || 80));
    if (holidays !== undefined) doc.holidays = normalizeHolidays(holidays);
    if (autoSundays !== undefined) doc.autoSundays = !!autoSundays;
    if (classes !== undefined) doc.classes = classes.map((c) => requireId(c.classId || c)).filter(Boolean);
    if (subjects !== undefined) {
      doc.subjects = subjects.map((s) => ({
        classId: requireId(s.classId),
        className: s.className || "",
        subjectId: requireId(s.subjectId),
        subjectName: s.subjectName || "",
        durationMinutes: clampDuration(s.durationMinutes),
      }));
    }
    if (teachers !== undefined) doc.teachers = teachers.map((t) => requireId(t.teacherId || t)).filter(Boolean);
    if (teacherUnavailable !== undefined) {
      doc.teacherUnavailable = teacherUnavailable.map((u) => ({
        teacherId: requireId(u.teacherId),
        dates: normalizeHolidays(u.dates),
      }));
    }
    if (gapRule !== undefined) doc.gapRule = Number(gapRule);
    if (startTime) doc.startTime = startTime;
    if (endTime) doc.endTime = endTime;
    if (clearSchedule) {
      doc.schedule = [];
      doc.conflicts = [];
      doc.suggestions = [];
      doc.score = 0;
    }

    await doc.save();
    return res.json({ success: true, data: doc });
  } catch (error) {
    console.error("Update exam schedule error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const snapshotCurrent = (doc) => ({
  version: doc.version,
  schedule: doc.schedule.map((r) => r.toObject()),
  status: doc.status,
  score: doc.score,
  publishedAt: doc.publishedAt,
  createdAt: new Date(),
});

/* ── GENERATE SMART SCHEDULE ── */
export const generateSchedule = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const doc = await ExamSchedule.findOne({ _id: req.params.id, schoolId });
    if (!doc) return res.status(404).json({ success: false, message: "Exam schedule not found" });

    const body = req.body || {};

    const startDate = body.startDate || fmtDate(doc.startDate);
    const endDate = body.endDate || fmtDate(doc.endDate);
    const gapRule = body.gapRule !== undefined ? Number(body.gapRule) : doc.gapRule;
    const holidays = normalizeHolidays(body.holidays !== undefined ? body.holidays : doc.holidays);
    const autoSundays = body.autoSundays !== undefined ? !!body.autoSundays : doc.autoSundays;
    const startTime = body.startTime || doc.startTime;
    const endTime = body.endTime || doc.endTime;

    const storedByClass = new Map();
    (doc.subjects || []).forEach((s) => {
      if (!storedByClass.has(String(s.classId))) storedByClass.set(String(s.classId), []);
      storedByClass
        .get(String(s.classId))
        .push({ subjectId: s.subjectId, subjectName: s.subjectName || "", durationMinutes: s.durationMinutes });
    });

    const selClasses = (
      body.classes && body.classes.length
        ? body.classes.map((c) => ({
            classId: c.classId || c,
            className: c.className || "",
            durationMinutes: c.durationMinutes,
            subjects: c.subjects || [],
          }))
        : [...storedByClass.entries()].map(([cid, subs]) => ({
            classId: cid,
            className: subs[0]?.className || "",
            durationMinutes: subs[0]?.durationMinutes,
            subjects: subs,
          }))
    ).filter((c) => c.classId);

    const classIds = selClasses.filter((c) => c.subjects && c.subjects.length).map((c) => c.classId);
    const teacherIds = (body.teachers && body.teachers.length ? body.teachers.map((t) => t.teacherId || t) : doc.teachers).filter(Boolean);
    const teacherUnavailableRaw =
      body.teacherUnavailable !== undefined ? body.teacherUnavailable : doc.teacherUnavailable;

    const [classDocs, teacherDocs] = await Promise.all([
      Class.find({ _id: { $in: classIds }, schoolId }).select("name").lean(),
      Teacher.find({
        _id: { $in: teacherIds },
        schoolId,
      })
        .select("fullName subjects")
        .lean(),
    ]);

    const clsNameMap = new Map(classDocs.map((c) => [String(c._id), c.name]));

    /* resolve every selected subject id so names are always real */
    const wantedSubjectIds = new Set();
    selClasses.forEach((c) =>
      (c.subjects || []).forEach((s) => {
        const id = s.subjectId || s;
        if (id) wantedSubjectIds.add(String(id));
      }),
    );
    const subjectDocsAll = await Subject.find({
      schoolId,
      _id: { $in: [...wantedSubjectIds] },
    })
      .select("name")
      .lean();
    const subjNameMap = new Map(subjectDocsAll.map((s) => [String(s._id), s.name]));

    const classesMeta = selClasses
      .filter((c) => c.subjects && c.subjects.length)
      .map((c) => ({
        classId: c.classId,
        className: c.className || clsNameMap.get(String(c.classId)) || "Class",
        durationMinutes: clampDuration(c.durationMinutes),
        subjects: (c.subjects || [])
          .map((s) => {
            const id = s.subjectId || s;
            return { subjectId: id, subjectName: s.subjectName || subjNameMap.get(String(id)) || "" };
          })
          .filter((s) => s.subjectId),
      }));

    const teachersMeta = teacherDocs.map((t) => ({
      teacherId: t._id,
      teacherName: t.fullName,
      subjects: t.subjects || [],
    }));

    const teacherUnavailable = (teacherUnavailableRaw || []).map((u) => ({
      teacherId: u.teacherId,
      dates: normalizeHolidays(u.dates),
    }));

    const result = scheduleExams({
      startDate,
      endDate,
      holidays,
      autoSundays,
      gapRule,
      classes: classesMeta,
      teachers: teachersMeta,
      teacherUnavailable,
      startTime,
      endTime,
    });

    /* persist the selection set used for this generation so the UI can render it */
    if (body.examName && String(body.examName).trim()) doc.examName = String(body.examName).trim();
    if (body.startDate && body.endDate) {
      const s = parseDate(body.startDate);
      const e = parseDate(body.endDate);
      if (e > s) {
        doc.startDate = s;
        doc.endDate = e;
      }
    }
    doc.holidays = holidays;
    doc.autoSundays = autoSundays;
    doc.gapRule = gapRule;
    doc.startTime = startTime;
    doc.endTime = endTime;
    doc.classes = classesMeta.map((c) => c.classId);
    doc.subjects = classesMeta.flatMap((c) =>
      c.subjects.map((s) => ({
        classId: c.classId,
        className: c.className || "",
        subjectId: s.subjectId,
        subjectName: s.subjectName || "",
        durationMinutes: c.durationMinutes,
      })),
    );
    doc.teachers = teacherIds;
    doc.teacherUnavailable = teacherUnavailable.map((u) => ({
      teacherId: u.teacherId,
      dates: u.dates,
    }));

    /* archive current before overwriting */
    if (doc.schedule.length) doc.versions.push(snapshotCurrent(doc));

    doc.schedule = result.schedule.map((r) => ({
      date: r.date,
      classId: r.classId,
      className: r.className,
      subjectId: r.subjectId,
      subjectName: r.subjectName,
      teacherId: r.teacherId,
      teacherName: r.teacherName,
      startTime: r.startTime,
      endTime: r.endTime,
    }));
    doc.conflicts = result.conflicts;
    doc.suggestions = result.suggestions;
    doc.score = result.score;
    doc.version += 1;
    doc.status = "draft";

    await doc.save();
    return res.json({ success: true, data: doc, warnings: result.warnings });
  } catch (error) {
    console.error("Generate schedule error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ── MANUAL ROW EDITS → re-run conflict detection + score ── */
export const editRows = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const doc = await ExamSchedule.findOne({ _id: req.params.id, schoolId });
    if (!doc) return res.status(404).json({ success: false, message: "Exam schedule not found" });

    const rows = (req.body.schedule || []).map((r) => ({
      date: r.date ? parseDate(String(r.date).slice(0, 10)) : null,
      classId: requireId(r.classId),
      className: r.className || "",
      subjectId: requireId(r.subjectId),
      subjectName: r.subjectName || "",
      teacherId: requireId(r.teacherId) || null,
      teacherName: r.teacherName || "",
      startTime: r.startTime || doc.startTime,
      endTime: r.endTime || doc.endTime,
    }));

    const conflicts = validateSchedule({
      schedule: rows.filter((r) => r.date && r.classId && r.subjectId),
      startDate: fmtDate(doc.startDate),
      endDate: fmtDate(doc.endDate),
      holidays: doc.holidays,
      autoSundays: doc.autoSundays,
      classes: buildClassMeta(doc),
    });

    const score = computeScore({
      rows: rows.filter((r) => r.date && r.classId && r.subjectId),
      classes: buildClassMeta(doc),
      conflicts,
    });

    doc.schedule = rows.filter((r) => r.date && r.classId && r.subjectId);
    doc.conflicts = conflicts;
    doc.score = score;
    doc.status = "draft";

    await doc.save();
    return res.json({ success: true, data: doc });
  } catch (error) {
    console.error("Edit rows error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ── AUTO PAPER TASKS ON PUBLISH ── */
/* NOTE: papers are NOT auto-created on publish. Teachers (or admins) create candidate
   papers for an exam slot; the admin approves whichever one should be printed. */

export const publishSchedule = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const doc = await ExamSchedule.findOne({ _id: req.params.id, schoolId });
    if (!doc) return res.status(404).json({ success: false, message: "Exam schedule not found" });
    if (!doc.schedule.length) {
      return res.status(400).json({ success: false, message: "Generate a schedule before publishing" });
    }
    if (doc.conflicts.length) {
      return res.status(400).json({
        success: false,
        message: `Cannot publish with ${doc.conflicts.length} unresolved conflict(s)`,
      });
    }

    if (doc.schedule.length) doc.versions.push(snapshotCurrent(doc));
    doc.status = "published";
    doc.publishedAt = new Date();
    doc.version += 1;

    await doc.save();

    return res.json({ success: true, data: doc });
  } catch (error) {
    console.error("Publish schedule error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ── RESTORE VERSION ── */
export const restoreVersion = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const doc = await ExamSchedule.findOne({ _id: req.params.id, schoolId });
    if (!doc) return res.status(404).json({ success: false, message: "Exam schedule not found" });

    const versionNumber = Number(req.params.version);
    const snap = doc.versions.find((v) => v.version === versionNumber);
    if (!snap) {
      return res.status(404).json({ success: false, message: `Version ${versionNumber} not found` });
    }

    const conflicts = validateSchedule({
      schedule: snap.schedule,
      startDate: fmtDate(doc.startDate),
      endDate: fmtDate(doc.endDate),
      holidays: doc.holidays,
      autoSundays: doc.autoSundays,
      classes: buildClassMeta(doc),
    });
    const score = computeScore({ rows: snap.schedule, classes: buildClassMeta(doc), conflicts });

    if (doc.schedule.length) doc.versions.push(snapshotCurrent(doc));
    doc.schedule = snap.schedule.map((r) => (r.toObject ? r.toObject() : { ...r }));
    doc.conflicts = conflicts;
    doc.suggestions = [];
    doc.score = score;
    doc.status = "draft";
    doc.version += 1;

    await doc.save();
    return res.json({ success: true, data: doc });
  } catch (error) {
    console.error("Restore version error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ── DELETE ── */
export const deleteExamSchedule = async (req, res) => {
  try {
    const schoolId = baseDoc(req);
    const deleted = await ExamSchedule.findOneAndDelete({ _id: req.params.id, schoolId });
    if (!deleted) return res.status(404).json({ success: false, message: "Exam schedule not found" });
    return res.json({ success: true, data: null });
  } catch (error) {
    console.error("Delete exam schedule error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};