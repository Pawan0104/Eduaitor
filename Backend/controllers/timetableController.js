import Timetable from "../models/timetable.js";
import Class from "../models/class.js";
import Teacher from "../models/teacher.js";
import {
  findOverlappingPeriodSlots,
  validateScheduleConflicts,
  findProxyConflicts,
} from "../utils/timetableValidation.js";
import { getUpcomingClassTests } from "./classTestController.js";

const buildAssignments = (schedule) => {
  const assignments = {};
  schedule.forEach((dayData) => {
    assignments[dayData.day] = {};
    dayData.periods.forEach((p) => {
      assignments[dayData.day][p.periodId] = {
        subjectId:
          p.subjectId?._id?.toString() || p.subjectId?.toString() || "",
        teacherId:
          p.teacherId?._id?.toString() || p.teacherId?.toString() || "",
        type: p.type,
        customName: p.customName || "",
        status: p.status,
        substituteTeacherId: p.substituteTeacherId?.toString() || "",
      };
    });
  });
  return assignments;
};

const buildSchedule = (assignments) =>
  Object.keys(assignments).map((day) => ({
    day,
    periods: Object.keys(assignments[day]).map((periodId) => {
      const p = assignments[day][periodId];
      return {
        periodId,
        subjectId: p?.subjectId || null,
        teacherId: p?.teacherId || null,
        substituteTeacherId: p?.substituteTeacherId || null,
        customName: p?.customName || "",
        type: p?.type || "lecture",
        status: !p?.teacherId ? "no-teacher" : "normal",
      };
    }),
  }));

/* ── SAVE / UPDATE ── */
export const saveTimetable = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { classId, detailId, periodConfigs, assignments } =
      req.body; // ← schoolId

    if (!schoolId)
      return res
        .status(400)
        .json({ success: false, message: "schoolId is required" });
    if (!classId)
      return res
        .status(400)
        .json({ success: false, message: "classId is required" });

    // Rule 1 — unique time slots within this timetable
    const overlap = findOverlappingPeriodSlots(periodConfigs);
    if (overlap) {
      return res.status(400).json({ success: false, message: overlap });
    }

    // Rule 2 — no teacher/room double-booking across timetables
    const conflict = await validateScheduleConflicts({
      schoolId,
      classId,
      detailId: detailId || null,
      periodConfigs,
      assignments,
    });
    if (conflict) {
      return res.status(400).json({
        success: false,
        message: conflict.error,
      });
    }

    const filter = { schoolId, classId, detailId: detailId || null }; // ← schoolId in filter
    const schedule = buildSchedule(assignments);

    let timetable = await Timetable.findOne(filter);

    if (timetable) {
      timetable.periodConfigs = periodConfigs;
      timetable.schedule = schedule;
      await timetable.save();
      return res.json({
        success: true,
        message: "Timetable updated",
        data: timetable,
      });
    }

    timetable = await Timetable.create({ ...filter, periodConfigs, schedule });
    res.json({ success: true, message: "Timetable created", data: timetable });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── GET ── */
export const getTimetable = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { classId } = req.params;
    const detailId = req.query.detailId || null;

    if (!schoolId)
      return res
        .status(400)
        .json({ success: false, message: "schoolId is required" });

    const timetable = await Timetable.findOne({ schoolId, classId, detailId }) // ← schoolId
      .populate("schedule.periods.subjectId", "name")
      .populate("schedule.periods.teacherId", "fullName")
      .populate("schedule.periods.substituteTeacherId", "fullName");

    if (!timetable) return res.json({ success: true, data: null });

    res.json({
      success: true,
      data: {
        schoolId: timetable.schoolId,
        classId: timetable.classId,
        detailId: timetable.detailId,
        periodConfigs: timetable.periodConfigs,
        assignments: buildAssignments(timetable.schedule),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── CLASS TIMETABLE PREVIEW (all sections, populated names) ── */
export const getClassTimetablePreview = async (req, res) => {
  try {
    const schoolId = req.user?.school_id;
    const { classId } = req.params;

    if (!schoolId)
      return res
        .status(400)
        .json({ success: false, message: "schoolId is required" });

    const timetables = await Timetable.find({ schoolId, classId })
      .populate("schedule.periods.subjectId", "name")
      .populate("schedule.periods.teacherId", "fullName")
      .populate("schedule.periods.substituteTeacherId", "fullName");

    const data = timetables.map((t) => ({
      detailId: t.detailId,
      periodConfigs: t.periodConfigs || [],
      schedule: (t.schedule || []).map((d) => ({
        day: d.day,
        periods: d.periods || [],
      })),
    }));

    const tests = await getUpcomingClassTests(schoolId, classId);

    res.json({ success: true, data, tests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
export const markTeacherAbsent = async (req, res) => {
  try {
    const { schoolId, classId, detailId, day, periodId } = req.body; // ← schoolId

    if (!schoolId)
      return res
        .status(400)
        .json({ success: false, message: "schoolId is required" });

    const timetable = await Timetable.findOne({
      schoolId,
      classId,
      detailId: detailId || null,
    }); // ← schoolId

    if (!timetable)
      return res
        .status(404)
        .json({ success: false, message: "Timetable not found" });

    const dayData = timetable.schedule.find((d) => d.day === day);
    if (!dayData)
      return res.status(404).json({ success: false, message: "Day not found" });

    const period = dayData.periods.find((p) => p.periodId === periodId);
    if (!period)
      return res
        .status(404)
        .json({ success: false, message: "Period not found" });

    period.status = "teacher-absent";
    await timetable.save();

    res.json({ success: true, message: "Teacher marked absent" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const canManageProxy = (req) =>
  ["school_admin", "staff_admin"].includes(req.user?.role);

/* ── TEACHER DAY SCHEDULE (for school-admin proxy assignment) ── */
export const getTeacherDaySchedule = async (req, res) => {
  try {
    if (!canManageProxy(req))
      return res.status(403).json({ success: false, message: "Not authorized" });

    const schoolId = req.user?.school_id;
    const { teacherId, date } = req.query;

    if (!schoolId || !teacherId || !date)
      return res.status(400).json({ success: false, message: "teacherId and date are required" });

    const day = DAY_NAMES[new Date(date).getDay()];

    const [timetables, teacher] = await Promise.all([
      Timetable.find({ schoolId })
        .populate("schedule.periods.subjectId", "name")
        .populate("schedule.periods.teacherId", "fullName")
        .populate("schedule.periods.substituteTeacherId", "fullName")
        .lean(),
      Teacher.findById(teacherId).select("fullName").lean(),
    ]);

    const classIds = [
      ...new Set(timetables.map((t) => String(t.classId))),
    ];
    const classes = await Class.find({ schoolId, _id: { $in: classIds } })
      .populate("details.sectionId", "name")
      .lean();

    const classById = new Map(
      classes.map((c) => [String(c._id), c]),
    );

    const periods = [];
    timetables.forEach((tt) => {
      const cls = classById.get(String(tt.classId));
      const detail =
        (cls?.details || []).find((d) => String(d._id) === String(tt.detailId)) ||
        (cls?.details || [])[0];

      const dayData = (tt.schedule || []).find((s) => s.day === day);
      if (!dayData) return;

      const cfgById = new Map(
        (tt.periodConfigs || []).map((p) => [String(p.id), p]),
      );

      (dayData.periods || []).forEach((p) => {
        const isMain = p.teacherId && String(p.teacherId._id) === String(teacherId);
        const isSub = p.substituteTeacherId && String(p.substituteTeacherId._id) === String(teacherId);
        if (!isMain && !isSub) return;

        const cfg = cfgById.get(String(p.periodId));
        periods.push({
          classId: tt.classId,
          className: cls?.name || "Class",
          detailId: tt.detailId,
          sectionName: detail?.sectionId?.name || (cls?.details?.length > 1 ? "—" : ""),
          periodId: p.periodId,
          periodName: cfg?.name || "Period",
          start: cfg?.start || "",
          end: cfg?.end || "",
          subjectId: p.subjectId?._id || p.subjectId,
          subjectName: p.subjectId?.name || p.customName || "—",
          teacherId: p.teacherId?._id || p.teacherId,
          teacherName: p.teacherId?.fullName || "",
          substituteTeacherId: p.substituteTeacherId?._id || p.substituteTeacherId || "",
          substituteName: p.substituteTeacherId?.fullName || "",
          status: p.status || "normal",
          isProxy: isSub,
        });
      });
    });

    periods.sort((a, b) => a.start.localeCompare(b.start));

    res.json({
      success: true,
      day,
      date,
      teacher: teacher || null,
      periods,
    });
  } catch (err) {
    console.error("getTeacherDaySchedule Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── ASSIGN PROXY TEACHER(S) FOR A DAY ── */
export const assignProxyTeacher = async (req, res) => {
  try {
    if (!canManageProxy(req))
      return res.status(403).json({ success: false, message: "Not authorized" });

    const schoolId = req.user?.school_id;
    const { date, teacherId, replacements } = req.body;

    if (!schoolId)
      return res.status(400).json({ success: false, message: "schoolId missing" });
    if (!date || !teacherId || !Array.isArray(replacements) || replacements.length === 0)
      return res.status(400).json({ success: false, message: "date, teacherId and replacements are required" });

    const day = DAY_NAMES[new Date(date).getDay()];
    const plans = [];

    // Pass 1 — build plans & basic validation
    for (const r of replacements) {
      const { classId, detailId, periodId, status, substituteTeacherId } = r;
      if (!classId || !periodId) continue;

      const tt = await Timetable.findOne({
        schoolId,
        classId,
        detailId: detailId || null,
      });
      if (!tt) continue;

      const dayData = (tt.schedule || []).find((s) => s.day === day);
      if (!dayData) continue;

      const period = (dayData.periods || []).find((p) => p.periodId === periodId);
      if (!period) continue;

      if (substituteTeacherId && String(substituteTeacherId) === String(teacherId))
        return res.status(400).json({ success: false, message: "Proxy teacher must be a different teacher" });

      const cfg =
        (tt.periodConfigs || []).find((p) => p.id === periodId) || null;

      plans.push({
        ttId: tt._id,
        classId: String(classId),
        detailId: detailId || null,
        periodId: String(periodId),
        periodTimes: cfg ? { start: cfg.start, end: cfg.end } : null,
        status: status === "teacher-absent" ? "teacher-absent" : "normal",
        substituteTeacherId: substituteTeacherId || null,
        excludeKey: `${String(classId)}|${detailId ? String(detailId) : ""}|${String(periodId)}`,
      });
    }

    if (plans.length === 0)
      return res.status(400).json({ success: false, message: "No matching periods found for this day" });

    // Pass 2 — proxy conflict validation (all before any write)
    for (const plan of plans) {
      if (!plan.substituteTeacherId || !plan.periodTimes) continue;

      const conflicts = await findProxyConflicts({
        schoolId,
        day,
        proxyTeacherId: plan.substituteTeacherId,
        periodTimes: plan.periodTimes,
        excludeKey: plan.excludeKey,
      });

      if (conflicts.length > 0) {
        const c = conflicts[0];
        return res.status(409).json({
          success: false,
          message: `Proxy teacher is already teaching on ${day} at ${c.timeLabel} in ${c.label}.`,
        });
      }
    }

    // Pass 3 — apply
    const timetablesById = new Map();
    for (const plan of plans) {
      if (!timetablesById.has(String(plan.ttId))) {
        timetablesById.set(String(plan.ttId), await Timetable.findById(plan.ttId));
      }
      const tt = timetablesById.get(String(plan.ttId));
      const dayData = (tt.schedule || []).find((s) => s.day === day);
      const period = (dayData.periods || []).find((p) => p.periodId === plan.periodId);

      period.status = plan.status;
      period.substituteTeacherId = plan.substituteTeacherId || null;
      if (plan.status === "normal" && !plan.substituteTeacherId) {
        period.substituteTeacherId = null;
      }
      await tt.save();
    }

    res.json({
      success: true,
      message: "Proxy teachers assigned",
      updated: plans.length,
    });
  } catch (err) {
    console.error("assignProxyTeacher Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
