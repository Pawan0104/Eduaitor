import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FaCalendarAlt, FaClock, FaChevronRight } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * ClassTimetablePreview — compact timetable launcher shown inside a teacher
 * class card. Does NOT render the schedule inline; instead it shows a
 * "Time Table" button (opens TODAY's schedule) and a "Full Week" link
 * (opens the complete weekly timetable).
 *
 * Props:
 *   - classId     : the Class document _id
 *   - className   : the class name (for popup titles)
 *   - details     : the class details (sections)
 *   - myTeacherId : logged-in teacher _id (to highlight own periods)
 *   - onToday     : (todayRow) => void
 *   - onWeek      : (weekRows) => void
 */
export default function ClassTimetablePreview({
  classId,
  className = "",
  details = [],
  myTeacherId,
  onToday,
  onWeek,
}) {
  const [timetables, setTimetables] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API}/timetable/preview/${classId}`, { withCredentials: true })
      .then((res) => {
        if (!cancelled) {
          setTimetables(res.data.data || []);
          setTests(res.data.tests || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTimetables([]);
          setTests([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const nextWeekdayDate = (weekdayName) => {
    const now = new Date();
    const targetIndex = WEEKDAYS.indexOf(weekdayName) + 1; // JS getDay(): Mon=1
    const diff = (targetIndex - now.getDay() + 7) % 7;
    const d = new Date(now);
    d.setDate(now.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const build = useMemo(() => {
    if (timetables.length === 0 && tests.length === 0) return null;

    const configById = new Map();
    const dayMap = new Map(); // weekday(lower) -> Map(periodId -> entries[])

    for (const tt of timetables) {
      (tt.periodConfigs || []).forEach((p) => {
        if (!configById.has(p.id)) configById.set(p.id, p);
      });
      (tt.schedule || []).forEach((s) => {
        const key = String(s.day || "").trim().toLowerCase();
        if (!key) return;
        if (!dayMap.has(key)) dayMap.set(key, new Map());
        const byPeriod = dayMap.get(key);
        (s.periods || []).forEach((p) => {
          if (!byPeriod.has(p.periodId)) byPeriod.set(p.periodId, []);
          byPeriod.get(p.periodId).push({ ...p, detailId: tt.detailId });
        });
      });
    }

    const sectionNameById = new Map();
    details.forEach((d) => {
      sectionNameById.set(String(d._id), d.sectionId?.name || "Section");
    });

    const testsByWeekday = new Map(); // weekday(lower) -> tests[]
    tests.forEach((t) => {
      const wk = String(t.dayOfWeek || "").trim().toLowerCase();
      if (!wk) return;
      if (!testsByWeekday.has(wk)) testsByWeekday.set(wk, []);
      testsByWeekday.get(wk).push(t);
    });

    const isMine = (e, key) =>
      (e[key]?._id || e[key]) === myTeacherId;

    const buildDay = (weekdayKey, date) => {
      const byPeriod = dayMap.get(weekdayKey) || new Map();
      const periods = [];
      const periodIds = [...byPeriod.keys()].sort((a, b) =>
        (configById.get(a)?.start || "").localeCompare(
          configById.get(b)?.start || "",
        ),
      );

      periodIds.forEach((periodId) => {
        const entries = byPeriod.get(periodId) || [];
        const cfg = configById.get(periodId);
        const start = cfg?.start || "";
        const end = cfg?.end || "";
        const timeRange = cfg ? `${cfg.start}–${cfg.end}` : "";

        // Only this teacher's own periods (teacherId or substitute)
        const lectures = entries.filter(
          (e) =>
            e.type === "lecture" &&
            (e.subjectId?._id || e.subjectId || e.customName) &&
            (isMine(e, "teacherId") || isMine(e, "substituteTeacherId")),
        );

        lectures.forEach((e) => {
          const secName = sectionNameById.get(String(e.detailId)) || "";
          periods.push({
            periodId,
            start,
            end,
            timeRange,
            type: "lecture",
            subject: e.subjectId?.name || e.customName || "Class",
            sectionName: secName,
            teacherName:
              e.teacherId?.fullName ||
              e.substituteTeacherId?.fullName ||
              "",
            isMine: true,
          });
        });
      });

      // Only this teacher's own class tests
      (testsByWeekday.get(weekdayKey) || [])
        .filter((t) => isMine(t, "teacherId"))
        .forEach((t) => {
          periods.push({
            periodId: `test-${t._id}`,
            start: t.startTime,
            end: t.endTime,
            timeRange: `${t.startTime}–${t.endTime}`,
            type: "test",
            subject: t.subject?.name || "Test",
            sectionName: t.sectionId?.name || "",
            teacherName: t.teacherId?.fullName || "",
            isMine: true,
            testId: t._id,
          });
        });

      periods.sort(
        (a, b) =>
          a.start.localeCompare(b.start) ||
          (a.sectionName || "").localeCompare(b.sectionName || ""),
      );

      const dateLabel = date
        ? date.toLocaleDateString(undefined, { day: "numeric", month: "short" })
        : "";

      return {
        weekdayKey,
        date,
        dateLabel,
        periods,
      };
    };

    const now = new Date();
    const todayWeekday = DAY_NAMES[now.getDay()].toLowerCase();
    const todayRow = {
      ...buildDay(todayWeekday, now),
      isToday: true,
      weekday: "Today",
      className,
      classId,
    };

    const configuredDays = new Set();
    timetables.forEach((tt) =>
      (tt.schedule || []).forEach((s) =>
        configuredDays.add(String(s.day || "").trim().toLowerCase()),
      ),
    );

    const weekRows = WEEKDAYS.filter((w) =>
      configuredDays.has(w.toLowerCase()),
    ).map((w) => ({
      ...buildDay(w.toLowerCase(), nextWeekdayDate(w)),
      isToday: DAY_NAMES[now.getDay()] === w,
      weekday: w,
      className,
      classId,
    }));

    return { todayRow, weekRows, hasData: true };
  }, [timetables, tests, details, myTeacherId, className, classId]);

  const hasTimetable = timetables.length > 0 || tests.length > 0;
  const hasMySchedule = Boolean(
    build && build.weekRows.some((r) => r.periods.length > 0),
  );

  return (
    <div
      className="border-t pt-3"
      onClick={(e) => e.stopPropagation()}
    >
      {loading ? (
        <div className="flex items-center gap-2 py-2 text-xs text-[rgb(var(--text))]">
          <FaClock size={11} className="animate-spin" /> Loading timetable…
        </div>
      ) : !hasTimetable ? (
        <p className="text-[11px] italic text-[rgb(var(--text))] py-1">
          Timetable not set
        </p>
      ) : !hasMySchedule ? (
        <p className="text-[11px] italic text-[rgb(var(--text))] py-1">
          No classes for you in this class
        </p>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToday?.(build?.todayRow);
            }}
            className="flex items-center gap-2 rounded-xl bg-[rgb(var(--primary))] text-[rgb(var(--text))] px-3 py-2 text-left transition hover:bg-[rgb(var(--primary-hover))] active:scale-95"
          >
            <FaCalendarAlt size={13} className="shrink-0" />
            <span>
              <span className="block text-xs font-bold leading-tight">
                Time Table
              </span>
              <span className="block text-[10px] opacity-70 leading-tight">
                Today&apos;s schedule
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onWeek?.(build?.weekRows || []);
            }}
            className="flex items-center gap-1 text-xs font-semibold text-[rgb(var(--primary))] hover:underline px-1 py-1"
          >
            Full Week <FaChevronRight size={10} />
          </button>
        </div>
      )}
    </div>
  );
}