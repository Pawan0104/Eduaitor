import Timetable from "../models/timetable.js";

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

/* ── MARK TEACHER ABSENT ── */
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
