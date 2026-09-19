import Class from "../models/class.js";
import Teacher from "../models/teacher.js";
import Timetable from "../models/timetable.js";

/** "HH:MM" -> minutes since midnight (-1 if invalid) */
const toTimeMin = (t) => {
  if (typeof t !== "string" || !t) return -1;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
};

/** Do the two [startA, endA] / [startB, endB] ranges overlap? */
const rangesOverlap = (startA, endA, startB, endB) =>
  startA >= 0 &&
  endA >= 0 &&
  startB >= 0 &&
  endB >= 0 &&
  startA < endB &&
  startB < endA;

/** id -> { start, end } for quick lookup */
const buildTimeMap = (periodConfigs = []) => {
  const map = new Map();
  (periodConfigs || []).forEach((p) => {
    map.set(String(p?.id), {
      start: toTimeMin(p?.start),
      end: toTimeMin(p?.end),
      label: `${p.start || ""}–${p.end || ""}`,
    });
  });
  return map;
};

const fmtTime = (mins) => {
  if (mins < 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/**
 * Rule 1 — within one timetable no two periods may share / overlap a time.
 * Returns an error message or null.
 */
export const findOverlappingPeriodSlots = (periodConfigs = []) => {
  const slots = (periodConfigs || [])
    .map((p) => ({
      id: String(p?.id),
      name: p?.name || p?.id || "Period",
      start: toTimeMin(p?.start),
      end: toTimeMin(p?.end),
      startLabel: p?.start || "",
      endLabel: p?.end || "",
    }))
    .filter((s) => s.start >= 0 && s.end >= 0);

  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      if (rangesOverlap(a.start, a.end, b.start, b.end)) {
        return `Time slots "${a.name}" (${a.startLabel}–${a.endLabel}) and "${b.name}" (${b.startLabel}–${b.endLabel}) overlap. Each period needs a unique time.`;
      }
    }
  }
  return null;
};

/**
 * Rule 2 — a teacher cannot be double-booked, and a room cannot be
 * double-booked, at the same day + overlapping time across timetables
 * in the same school.
 *
 * Returns { error } or null.
 */
export const validateScheduleConflicts = async ({
  schoolId,
  classId,
  detailId,
  periodConfigs,
  assignments,
}) => {
  const myKey = `${String(classId)}|${detailId ? String(detailId) : ""}`;
  const myTimeMap = buildTimeMap(periodConfigs);

  const [allTimetables, schoolClasses, allTeachers] = await Promise.all([
    Timetable.find({ schoolId }).lean(),
    Class.find({ schoolId }).select("name details").lean(),
    Teacher.find({ schoolId }).select("fullName").lean(),
  ]);

  const teacherName = new Map(
    allTeachers.map((t) => [String(t._id), t.fullName || "Teacher"]),
  );

  const classByName = new Map();
  const roomByKey = new Map();
  const labelByKey = new Map();
  schoolClasses.forEach((c) => {
    classByName.set(String(c._id), c.name);
    (c.details || []).forEach((d) => {
      const key = `${String(c._id)}|${String(d._id)}`;
      roomByKey.set(key, String(d.roomNumber || "").trim());
      labelByKey.set(
        key,
        `${c.name}${d.sectionId?.name ? ` - ${d.sectionId.name}` : ""}`,
      );
    });
  });

  const roomForKey = (cid, did) => {
    const key = `${String(cid)}|${did ? String(did) : ""}`;
    if (roomByKey.has(key)) return roomByKey.get(key);
    const single = schoolClasses.find(
      (c) => String(c._id) === String(cid) && (c.details || []).length === 1,
    );
    return single ? String(single.details[0].roomNumber || "").trim() : "";
  };

  const myClass = schoolClasses.find((c) => String(c._id) === String(classId));
  const myDetail =
    (myClass?.details || []).find((d) =>
      detailId ? String(d._id) === String(detailId) : true,
    ) || (myClass?.details || [])[0];
  const myRoom = String(myDetail?.roomNumber || "").trim();

  // Incoming cells (day, time, teacher)
  const cells = [];
  Object.entries(assignments || {}).forEach(([day, dayAssign]) => {
    Object.entries(dayAssign || {}).forEach(([periodId, cell]) => {
      if (!cell || cell.type === "lunch") return;
      const cfg = myTimeMap.get(String(periodId));
      const tId = cell.teacherId || cell.substituteTeacherId;
      cells.push({
        day,
        dayKey: String(day || "").trim().toLowerCase(),
        start: cfg?.start ?? -1,
        end: cfg?.end ?? -1,
        timeLabel: cfg?.label || "",
        teacherId: tId ? String(tId) : "",
        teacherName: tId ? teacherName.get(String(tId)) || "" : "",
      });
    });
  });

  for (const other of allTimetables) {
    const otherKey = `${String(other.classId)}|${other.detailId ? String(other.detailId) : ""}`;
    if (otherKey === myKey) continue;

    const otherTimeMap = buildTimeMap(other.periodConfigs || []);
    const otherById = new Map();
    (other.schedule || []).forEach((s) => {
      const key = String(s.day || "").trim().toLowerCase();
      if (!key) return;
      if (!otherById.has(key)) otherById.set(key, []);
      (s.periods || []).forEach((p) => otherById.get(key).push(p));
    });

    const otherRoom = roomForKey(other.classId, other.detailId);
    const otherLabel =
      labelByKey.get(otherKey) ||
      classByName.get(String(other.classId)) ||
      "another class";

    for (const cell of cells) {
      const otherPeriods = otherById.get(cell.dayKey);
      if (!otherPeriods) continue;

      for (const op of otherPeriods) {
        const oc = otherTimeMap.get(String(op.periodId));
        if (!oc || oc.start < 0) continue;
        const opTeacher = op.teacherId || op.substituteTeacherId;

        // Teacher double-booking
        if (
          cell.teacherId &&
          opTeacher &&
          String(opTeacher) === cell.teacherId &&
          rangesOverlap(cell.start, cell.end, oc.start, oc.end)
        ) {
          return {
            error: `Teacher ${cell.teacherName || "already"} is already scheduled on ${cell.day} at ${fmtTime(cell.start)}–${fmtTime(cell.end)} in ${otherLabel}.`,
          };
        }

        // Room double-booking
        if (
          myRoom &&
          otherRoom &&
          myRoom.toLowerCase() === otherRoom.toLowerCase() &&
          rangesOverlap(cell.start, cell.end, oc.start, oc.end)
        ) {
          return {
            error: `Room "${myRoom}" is already booked on ${cell.day} at ${fmtTime(cell.start)}–${fmtTime(cell.end)} in ${otherLabel}.`,
          };
        }
      }
    }
  }

  return null;
};

/**
 * Proxy-teacher check — used by the school-admin "Proxy Teacher" flow.
 * Confirms that a proxy/substitute teacher is NOT already teaching or
 * covering another period in the same school at the same day + overlapping
 * time (in any class/section timetable).
 *
 * @param {object} args
 *   schoolId        - school the timetables belong to
 *   day             - weekday label (e.g. "Monday")
 *   proxyTeacherId  - the substitute being assigned
 *   periodTimes     - { start, end } minutes for the period being replaced
 *   excludeKey      - `${classId}|${detailId}|${periodId}` to ignore the period
 *                     being edited
 * @returns array of { classId, detailId, periodId, label, start, end, timeLabel }
 */
export const findProxyConflicts = async ({
  schoolId,
  day,
  proxyTeacherId,
  periodTimes,
  excludeKey,
}) => {
  if (!schoolId || !proxyTeacherId || !day || !periodTimes) return [];

  const proxyStr = String(proxyTeacherId);
  const dayKey = String(day).trim().toLowerCase();
  const want = { start: toTimeMin(periodTimes.start), end: toTimeMin(periodTimes.end) };
  if (want.start < 0 || want.end < 0) return [];

  const [allTimetables, schoolClasses] = await Promise.all([
    Timetable.find({ schoolId }).lean(),
    Class.find({ schoolId }).select("name details").lean(),
  ]);

  const classLabel = new Map();
  schoolClasses.forEach((c) => {
    (c.details || []).forEach((d) => {
      const key = `${String(c._id)}|${String(d._id)}`;
      const label = `${c.name}${d.sectionId?.name ? ` - ${d.sectionId.name}` : ""}`;
      classLabel.set(key, label);
    });
  });

  const conflicts = [];
  for (const tt of allTimetables) {
    const timeMap = buildTimeMap(tt.periodConfigs || []);
    const key = `${String(tt.classId)}|${tt.detailId ? String(tt.detailId) : ""}`;
    const label =
      classLabel.get(key) ||
      schoolClasses.find((c) => String(c._id) === String(tt.classId))?.name ||
      "another class";

    const dayData = (tt.schedule || []).find(
      (s) => String(s.day || "").trim().toLowerCase() === dayKey,
    );
    if (!dayData) continue;

    for (const p of dayData.periods || []) {
      const effective = p.substituteTeacherId || p.teacherId;
      if (!effective || String(effective) !== proxyStr) continue;

      const pKey = `${String(tt.classId)}|${tt.detailId ? String(tt.detailId) : ""}|${String(p.periodId)}`;
      if (excludeKey && pKey === String(excludeKey)) continue;

      const cfg = timeMap.get(String(p.periodId));
      if (!cfg || cfg.start < 0) continue;

      if (rangesOverlap(want.start, want.end, cfg.start, cfg.end)) {
        conflicts.push({
          classId: tt.classId,
          detailId: tt.detailId,
          periodId: p.periodId,
          label,
          start: cfg.start,
          end: cfg.end,
          timeLabel: cfg.label,
        });
      }
    }
  }

  return conflicts;
};