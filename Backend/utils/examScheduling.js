/**
 * Smart Exam Scheduler — core algorithm + validation + scoring.
 *
 * Deterministic greedy scheduler with:
 *  - holiday / Sunday exclusion
 *  - date-range enforcement (exams finish WITHIN the window, never stretched)
 *  - parallel day slots: multiple classes sit exams at the same time (each
 *    with its own invigilator); the daily window [startTime, endTime] holds
 *    as many slots as needed, packed as early as possible
 *  - one exam per class per slot; when days are too few, a class may sit more
 *    than one exam in a single day (in different slots) so nothing is dropped
 *  - per-class duration (a 1-hour class and a 2-hour class can run in the
 *    same slot on the same day)
 *  - configurable gap rule (0/1/2 days between a class's exams)
 *  - difficult-subject spacing (Math, Science, Physics, Chemistry never adjacent)
 *  - even distribution of language subjects
 *  - automatic invigilator assignment (balanced load, avoids own subject,
 *    no same teacher twice within a single slot)
 */

export const DIFFICULT_SUBJECT_KEYS = [
  "math",
  "mathematics",
  "maths",
  "science",
  "physics",
  "chemistry",
  "biology",
];

export const LANGUAGE_SUBJECT_KEYS = [
  "english",
  "hindi",
  "sanskrit",
  "gujarati",
  "marathi",
  "urdu",
  "bengali",
  "tamil",
  "telugu",
  "kannada",
  "malayalam",
  "punjabi",
];

/* ── date helpers (local-time safe, YYYY-MM-DD) ── */
const pad = (n) => String(n).padStart(2, "0");

export const fmtDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseDate = (s) => {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const diffDays = (a, b) =>
  Math.round((parseDate(fmtDate(b)) - parseDate(fmtDate(a))) / 86400000);

const sortKey = (s) => String(s || "").toLowerCase();

const isDifficult = (name) => {
  const k = sortKey(name);
  return DIFFICULT_SUBJECT_KEYS.some((dk) => k.includes(dk));
};

const isLanguage = (name) => {
  const k = sortKey(name);
  return LANGUAGE_SUBJECT_KEYS.some((dk) => k.includes(dk));
};

/* ── time helpers ("09:00" <-> minutes since midnight) ── */
const toMinutes = (t) => {
  const [h, m] = String(t || "09:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const fmtClock = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(Math.round(mins % 60)).padStart(2, "0")}`;

/**
 * Build the list of working (exam-able) day dates between start/end.
 */
export function buildExamDays({ startDate, endDate, holidays = [], autoSundays = true }) {
  const holidaysSet = new Set(holidays);
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const days = [];
  let cursor = new Date(start);
  let guard = 0;
  while (cursor <= end && guard < 10000) {
    const iso = fmtDate(cursor);
    if (!(autoSundays && cursor.getDay() === 0) && !holidaysSet.has(iso)) {
      days.push(new Date(cursor));
    }
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return { days, isHoliday: (dateStr) => holidaysSet.has(dateStr) };
}

/* alternate two lists starting with the longer one (even spread) */
const interleave2 = (A, B) => {
  const out = [];
  let a = 0;
  let b = 0;
  let takeA = A.length >= B.length;
  while (a < A.length || b < B.length) {
    if (takeA && a < A.length) out.push(A[a++]);
    else if (b < B.length) out.push(B[b++]);
    else if (a < A.length) out.push(A[a++]);
    takeA = !takeA;
  }
  return out;
};

/**
 * Per-class subject order: difficult subjects are never adjacent (a non-difficult
 * subject sits between them whenever possible) and language subjects are spread out.
 */
const orderClassSubjects = (subjects) => {
  const byName = (a, b) => sortKey(a.subjectName).localeCompare(sortKey(b.subjectName));
  const diffs = subjects.filter((s) => isDifficult(s.subjectName)).sort(byName);
  const langs = subjects.filter((s) => isLanguage(s.subjectName)).sort(byName);
  const plain = subjects.filter((s) => !isDifficult(s.subjectName) && !isLanguage(s.subjectName)).sort(byName);
  const rest = interleave2(langs, plain);

  const order = [];
  let lastWasDiff = false;
  while (rest.length || diffs.length) {
    if (lastWasDiff && rest.length) {
      order.push(rest.shift());
      lastWasDiff = false;
    } else if (diffs.length) {
      order.push(diffs.shift());
      lastWasDiff = true;
    } else {
      order.push(rest.shift());
      lastWasDiff = false;
    }
  }
  return order;
};

/**
 * Schedule all exams.
 *
 * One day can host several parallel slots. Each slot opens at the current
 * slot start time (`startTime`, then + the longest exam already in the slot)
 * and every eligible class with a free invigilator sits its next subject in
 * that slot. Slots repeat until the daily window `[startTime, endTime]` is
 * full, then we move to the next working day. Exams are therefore packed
 * as early as possible and always finish within `[startDate, endDate]`.
 *
 * @param {Object} cfg
 * @param {string} cfg.startDate            YYYY-MM-DD
 * @param {string} cfg.endDate              YYYY-MM-DD
 * @param {string[]} cfg.holidays           ["2026-01-26", ...]
 * @param {boolean} cfg.autoSundays
 * @param {number} cfg.gapRule              0 | 1 | 2  (min days between a class's exams)
 * @param {Array<{classId, className, durationMinutes, subjects:[{subjectId, subjectName}]}>} cfg.classes
 * @param {Array<{teacherId, teacherName, subjects:[...]}>} cfg.teachers  invigilator pool
 * @param {Array<{teacherId, dates:[string]}>} cfg.teacherUnavailable
 * @param {string} cfg.startTime            daily first-slot start ("09:00")
 * @param {string} cfg.endTime              daily window end ("15:00")
 */
export function scheduleExams(cfg) {
  const {
    startDate,
    endDate,
    holidays = [],
    autoSundays = true,
    gapRule = 1,
    classes = [],
    teachers = [],
    teacherUnavailable = [],
    startTime = "09:00",
    endTime = "15:00",
  } = cfg;

  const { days } = buildExamDays({ startDate, endDate, holidays, autoSundays });
  const warnings = [];

  if (days.length === 0) {
    return {
      schedule: [],
      score: 0,
      warnings: ["No valid exam days found between start and end date (all excluded)."],
      conflicts: [],
      suggestions: [],
    };
  }
  if (!classes.length) {
    return {
      schedule: [],
      score: 0,
      warnings: ["No classes selected."],
      conflicts: [],
      suggestions: [],
    };
  }

  const startMins = toMinutes(startTime);
  const endMins = toMinutes(endTime);
  if (startMins >= endMins) {
    return {
      schedule: [],
      score: 0,
      warnings: ["Exam start time must be before end time."],
      conflicts: [],
      suggestions: [],
    };
  }

  const g = Math.max(0, Math.min(2, Number(gapRule) || 0)); // min calendar days between a class's exams

  const unavailable = new Map(); // teacherId -> Set("YYYY-MM-DD")
  teacherUnavailable.forEach((u) =>
    unavailable.set(String(u.teacherId), new Set((u.dates || []).map((d) => String(d).slice(0, 10)))),
  );
  const pool = teachers.filter((t) => t && t.teacherId);

  const groups = classes
    .map((cls) => {
      const classId = String(cls.classId || cls._id || "");
      const subjects = (cls.subjects || []).filter((s) => s && s.subjectId);
      if (!classId || subjects.length === 0) {
        if (classId) warnings.push(`${cls.className || "Class"}: no subjects selected, skipped.`);
        return null;
      }
      return {
        classId,
        className: cls.className || "",
        duration: Math.max(15, Math.min(480, Math.round(Number(cls.durationMinutes) || 120))),
        order: orderClassSubjects(subjects),
        lastDay: -Infinity, // day-index of its most recent exam
        scheduledToday: false,
      };
    })
    .filter(Boolean);

  if (!groups.length) {
    return {
      schedule: [],
      score: 0,
      warnings: ["No schedulable classes (all skipped)."],
      conflicts: [],
      suggestions: [],
    };
  }

  const rows = [];

  for (let d = 0; d < days.length; d += 1) {
    const day = days[d];
    const dateStr = fmtDate(day);

    let remaining = groups.filter(
      (a) => a.order.length > 0 && !a.scheduledToday && d - a.lastDay > g,
    );
    if (!remaining.length) continue;

    /* rotate so no class always goes first */
    if (d > 0) {
      const r = d % remaining.length;
      remaining = remaining.slice(r).concat(remaining.slice(0, r));
    }

    let waveStart = startMins;
    while (remaining.some((a) => a.order.length > 0 && !a.scheduledToday)) {
      const usedTeachers = new Set(); // a teacher invigilates 1 exam per slot
      let waveMaxDur = 0; // slot end = waveStart + longest exam in this slot
      let placedAny = false;

      for (const a of remaining) {
        if (a.scheduledToday || a.order.length === 0) continue;
        const dur = a.duration;
        if (waveStart + dur > endMins) continue; // class doesn't fit this slot today
        const subject = a.order[0];
        const teacher = pool.length
          ? pickTeacher(pool, unavailable, dateStr, subject, usedTeachers, rows)
          : null;
        if (pool.length && !teacher) continue;

        a.order.shift();
        rows.push({
          date: new Date(day),
          classId: a.classId,
          className: a.className,
          subjectId: subject.subjectId,
          subjectName: subject.subjectName || "",
          teacherId: teacher ? teacher.teacherId : null,
          teacherName: teacher ? teacher.teacherName : "",
          startTime: fmtClock(waveStart),
          endTime: fmtClock(waveStart + dur),
        });
        if (teacher) usedTeachers.add(String(teacher.teacherId));
        a.scheduledToday = true;
        a.lastDay = d;
        waveMaxDur = Math.max(waveMaxDur, dur);
        placedAny = true;
      }

      if (!placedAny) break; // nothing fits this slot -> next day
      waveStart += waveMaxDur;
    }

    for (const a of groups) a.scheduledToday = false;
  }

  /* ── Phase 2: when days are too few, allow multiple exams per class per day (in different slots) ── */
  const unscheduledPhase1 = groups.reduce((n, a) => n + a.order.length, 0);
  if (unscheduledPhase1 > 0) {
    warnings.push(
      `Only ${days.length} day(s) available — allowing more than one exam per class per day to fit all subjects.`,
    );

    const busyClassSlots = new Set();
    const busyTeacherSlots = new Set();
    rows.forEach((r) => {
      const fd = fmtDate(new Date(r.date));
      busyClassSlots.add(`${String(r.classId)}|${fd}|${r.startTime}`);
      if (r.teacherId) busyTeacherSlots.add(`${String(r.teacherId)}|${fd}|${r.startTime}`);
    });

    for (let d = 0; d < days.length; d += 1) {
      const day = days[d];
      const dateStr = fmtDate(day);
      let waveStart = startMins;

      while (waveStart + 15 <= endMins && groups.some((a) => a.order.length > 0)) {
        const usedTeachers = new Set();
        let waveMaxDur = 0;
        let placedAny = false;

        for (const a of groups) {
          if (a.order.length === 0) continue;
          const dur = a.duration;
          if (waveStart + dur > endMins) continue;
          const slotKey = fmtClock(waveStart);
          if (busyClassSlots.has(`${a.classId}|${dateStr}|${slotKey}`)) continue;

          const subject = a.order[0];
          const teacher = pool.length
            ? pickTeacher(pool, unavailable, dateStr, subject, usedTeachers, rows)
            : null;
          if (pool.length && !teacher) continue;

          a.order.shift();
          rows.push({
            date: new Date(day),
            classId: a.classId,
            className: a.className,
            subjectId: subject.subjectId,
            subjectName: subject.subjectName || "",
            teacherId: teacher ? teacher.teacherId : null,
            teacherName: teacher ? teacher.teacherName : "",
            startTime: slotKey,
            endTime: fmtClock(waveStart + dur),
          });
          busyClassSlots.add(`${a.classId}|${dateStr}|${slotKey}`);
          if (teacher) {
            busyTeacherSlots.add(`${String(teacher.teacherId)}|${dateStr}|${slotKey}`);
            usedTeachers.add(String(teacher.teacherId));
          }
          waveMaxDur = Math.max(waveMaxDur, dur);
          placedAny = true;
        }

        if (!placedAny) break;
        waveStart += waveMaxDur;
      }
    }

    const unscheduledAfter = groups.reduce((n, a) => n + a.order.length, 0);
    if (unscheduledAfter > 0) {
      warnings.push(
        `${unscheduledAfter} exam(s) still unscheduled — increase the end date to fit the remaining exams.`,
      );
    }
  }

  const conflicts = validateSchedule({
    schedule: rows,
    startDate,
    endDate,
    holidays,
    autoSundays,
    classes,
  });
  const score = computeScore({ rows, classes, teachers, conflicts, warnings });
  const suggestions = generateSuggestions({ rows, classes, score, conflicts, startDate, endDate });

  return {
    schedule: rows,
    score,
    warnings: [...new Set(warnings)],
    conflicts,
    suggestions,
  };
}

/* ── invigilator pick for one slot ── */
function pickTeacher(pool, unavailable, dateStr, subject, usedTeachers, rows) {
  const rowSubject = subject.subjectId ? String(subject.subjectId) : "";
  const load = new Map();
  rows.forEach((r) => {
    if (r.teacherId) load.set(String(r.teacherId), (load.get(String(r.teacherId)) || 0) + 1);
  });

  const candidates = pool
    .map((t) => {
      const tid = String(t.teacherId);
      const unavail = unavailable.get(tid);
      return {
        tid,
        name: t.teacherName || "",
        teachesOwn: (t.subjects || []).some((s) => String(s.subjectId || s._id || s) === rowSubject),
        available: !(unavail && unavail.has(dateStr)) && !usedTeachers.has(tid),
        load: load.get(tid) || 0,
      };
    })
    .filter((c) => c.available);

  if (!candidates.length) return null;

  const ok = candidates.filter((c) => !c.teachesOwn);
  const pickFrom = ok.length ? ok : candidates;
  pickFrom.sort((a, b) => a.load - b.load || a.tid.localeCompare(b.tid));
  const chosen = pickFrom[0];
  return { teacherId: chosen.tid, teacherName: chosen.name };
}

/* ── conflict detection ── */
export function validateSchedule({
  schedule = [],
  startDate,
  endDate,
  holidays = [],
  autoSundays = true,
  classes = [],
}) {
  const conflicts = [];
  const holidaysSet = new Set(holidays);
  const clsName = new Map();
  classes.forEach((c) => clsName.set(String(c.classId || c._id), c.className));
  const subjName = new Map();
  classes.forEach((c) =>
    (c.subjects || []).forEach((s) => subjName.set(String(s.subjectId), s.subjectName)),
  );

  const byClassDate = new Map(); // `${classId}|${date}` -> index
  const byTeacherSlot = new Map(); // `${teacherId}|${date}|${startTime}` -> index

  schedule.forEach((row, idx) => {
    const d = new Date(row.date);
    const dateStr = fmtDate(d);
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (d < start || d > end) {
      conflicts.push({
        type: "date-range",
        message: `${row.className || "Class"} • ${row.subjectName || "Subject"} on ${dateStr} is outside the exam window.`,
        date: row.date,
        classId: row.classId,
        subjectId: row.subjectId,
        teacherId: row.teacherId,
        rowIndex: idx,
      });
    }
    if (autoSundays && d.getDay() === 0) {
      conflicts.push({
        type: "holiday",
        message: `${dateStr} is a Sunday — no exam allowed.`,
        date: row.date,
        classId: row.classId,
        subjectId: row.subjectId,
        teacherId: row.teacherId,
        rowIndex: idx,
      });
    }
    if (holidaysSet.has(dateStr)) {
      conflicts.push({
        type: "holiday",
        message: `${dateStr} is marked as a holiday.`,
        date: row.date,
        classId: row.classId,
        subjectId: row.subjectId,
        teacherId: row.teacherId,
        rowIndex: idx,
      });
    }

    if (row.classId) {
      const key = `${String(row.classId)}|${dateStr}|${row.startTime || ""}`;
      if (byClassDate.has(key)) {
        conflicts.push({
          type: "class-conflict",
          message: `${row.className || "Class"} has two exams in the same time slot on ${dateStr} — only one is allowed per slot.`,
          date: row.date,
          classId: row.classId,
          subjectId: row.subjectId,
          teacherId: row.teacherId,
          rowIndex: idx,
        });
      } else {
        byClassDate.set(key, idx);
      }
    }

    if (row.teacherId) {
      const key = `${String(row.teacherId)}|${dateStr}|${row.startTime || ""}`;
      if (byTeacherSlot.has(key)) {
        conflicts.push({
          type: "teacher-conflict",
          message: `${row.teacherName || "Invigilator"} is assigned to two exams in the same slot on ${dateStr}.`,
          date: row.date,
          classId: row.classId,
          subjectId: row.subjectId,
          teacherId: row.teacherId,
          rowIndex: idx,
        });
      } else {
        byTeacherSlot.set(key, idx);
      }
    }
  });

  return conflicts;
}

/* ── quality score (0-100) ── */
export function computeScore({ rows = [], classes = [], teachers = [], conflicts = [], warnings = [] }) {
  let score = 100;
  const byClass = new Map();
  rows.forEach((r) => {
    const key = String(r.classId);
    if (!byClass.has(key)) byClass.set(key, []);
    byClass.get(key).push(r);
  });

  // difficult-subject adjacency per class
  for (const list of byClass.values()) {
    const diffs = list
      .filter((r) => isDifficult(r.subjectName))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    for (let i = 1; i < diffs.length; i += 1) {
      const gap = diffDays(diffs[i - 1].date, diffs[i].date);
      if (gap < 2) {
        score -= 8;
        break;
      }
    }
    // language evenness
    const langs = list
      .filter((r) => isLanguage(r.subjectName))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    if (langs.length > 2) {
      const dates = langs.map((r) => new Date(r.date).getTime());
      const windowMs = Math.max(dates[dates.length - 1] - dates[0], 86400000);
      const ideal = windowMs / (dates.length - 1);
      let spreadPenalty = 0;
      for (let i = 1; i < dates.length; i += 1) {
        const actual = dates[i] - dates[i - 1];
        spreadPenalty += Math.abs(actual - ideal) / 86400000;
      }
      if (spreadPenalty > 8) score -= 5;
      else if (spreadPenalty > 4) score -= 3;
    }
  }

  // teacher workload balance
  const loadMap = new Map();
  rows.filter((r) => r.teacherId).forEach((r) => {
    const k = String(r.teacherId);
    loadMap.set(k, (loadMap.get(k) || 0) + 1);
  });
  const loads = [...loadMap.values()];
  if (loads.length > 1) {
    const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
    const variance = loads.reduce((a, b) => a + (b - mean) ** 2, 0) / loads.length;
    const std = Math.sqrt(variance);
    if (std > 2) score -= 5;
    else if (std > 1) score -= 2;
  }

  // gap consistency across a class (exams should follow the gap rule)
  for (const list of byClass.values()) {
    const sorted = [...list].sort((a, b) => new Date(a.date) - new Date(b.date));
    for (let i = 1; i < sorted.length; i += 1) {
      const gap = diffDays(sorted[i - 1].date, sorted[i].date);
      if (gap < 2) score -= 2;
    }
  }

  score -= conflicts.length * 12;
  if (rows.some((r) => !r.teacherId)) score -= 5;
  score -= warnings.length * 2;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/* ── simple heuristic AI suggestions ── */
export function generateSuggestions({ rows = [], classes = [], score, conflicts = [], startDate, endDate }) {
  const suggestions = [];
  const byClass = new Map();
  rows.forEach((r) => {
    const key = String(r.classId);
    if (!byClass.has(key)) byClass.set(key, []);
    byClass.get(key).push(r);
  });

  for (const list of byClass.values()) {
    const diffs = list
      .filter((r) => isDifficult(r.subjectName))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    for (let i = 1; i < diffs.length; i += 1) {
      const gap = diffDays(diffs[i - 1].date, diffs[i].date);
      if (gap < 2) {
        const moved = addDays(diffs[i - 1].date, 2);
        suggestions.push(
          `Move ${diffs[i].subjectName} (${r_short(diffs[i].className)}) to ${fmtDate(moved)} to separate difficult subjects.`,
        );
      }
    }
  }

  if (conflicts.length) {
    suggestions.push(
      `Resolve ${conflicts.length} conflict(s) to improve the schedule.`,
    );
  }
  if (score < 60) {
    suggestions.push(
      "Consider extending the exam window or enabling a larger gap rule to improve quality.",
    );
  }

  return suggestions.slice(0, 5);
}

const r_short = (c) => String(c || "").replace("Class ", "");

/** Validate + print-friendly label helpers to reuse on the client. */
export const conflictColor = (c) =>
  c === "holiday" ? "#ef4444" : c === "date-range" ? "#f97316" : c === "class-conflict" ? "#e11d48" : "#8b5cf6";