import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import api from "../config/axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** Cell / legend colors for attendance + calendar holidays */
const STATUS = {
  Present: {
    label: "Present",
    bg: "#ECFDF5",
    fg: "#047857",
    border: "#A7F3D0",
    swatch: "#10B981",
  },
  Absent: {
    label: "Absent",
    bg: "#FEF2F2",
    fg: "#B91C1C",
    border: "#FECACA",
    swatch: "#EF4444",
  },
  Leave: {
    label: "Leave",
    bg: "#FFF7ED",
    fg: "#C2410C",
    border: "#FED7AA",
    swatch: "#F97316",
  },
  Late: {
    label: "Late",
    bg: "#FFFBEB",
    fg: "#B45309",
    border: "#FDE68A",
    swatch: "#F59E0B",
  },
  Holiday: {
    label: "Holiday",
    bg: "#F5F3FF",
    fg: "#6D28D9",
    border: "#DDD6FE",
    swatch: "#8B5CF6",
  },
};

function toDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function eventCoversDate(event, dateKey) {
  const start = toDateKey(event.startDate);
  const end = event.endDate ? toDateKey(event.endDate) : start;
  return dateKey >= start && dateKey <= end;
}

function normalizeStatus(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (/^absent$/i.test(s)) return "Absent";
  if (/^leave|half\s*day|on\s*leave$/i.test(s)) return "Leave";
  if (/^late$/i.test(s)) return "Late";
  if (/^present$/i.test(s)) return "Present";
  if (/^holiday$/i.test(s)) return "Holiday";
  return s;
}

function roleAttendancePath(role, loginAs) {
  if (role === "student_admin" && loginAs === "parent") return "/parent/attendance";
  if (role === "student_admin") return "/student/attendance";
  return "/student/attendance";
}

/**
 * Month attendance calendar for student/parent home — after Urgent actions.
 */
export default function HomeAttendanceCard({ className = "" }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => now.getMonth() + 1);
  const [year, setYear] = useState(() => now.getFullYear());
  const [studentId, setStudentId] = useState(null);
  const [records, setRecords] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [summary, setSummary] = useState({
    present: 0,
    absent: 0,
    leave: 0,
    late: 0,
    total: 0,
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);

  const role = user?.role;
  const loginAs = user?.loginAs;
  const canShow = role === "student_admin";

  useEffect(() => {
    if (!canShow) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/attendance/parent/student-meta");
        if (cancelled) return;
        setStudentId(res.data?.student?._id || null);
      } catch {
        if (!cancelled) setStudentId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canShow, user?._id, user?.student_id, user?.activeChildId]);

  const loadMonth = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const [attRes, calRes] = await Promise.all([
        api
          .get("/class-attendance/parent/report", {
            params: { studentId, month, year },
          })
          .catch(() => null),
        api
          .get("/calendar/", {
            params: { start: monthStart, end: monthEnd },
          })
          .catch(() => null),
      ]);

      const recs = Array.isArray(attRes?.data?.records)
        ? attRes.data.records
        : [];
      setRecords(recs);

      const events = Array.isArray(calRes?.data?.events)
        ? calRes.data.events
        : Array.isArray(calRes?.data)
          ? calRes.data
          : [];
      setHolidays(events.filter((e) => String(e.type) === "Holiday"));

      const present = recs.filter((r) => normalizeStatus(r.status) === "Present").length;
      const absent = recs.filter((r) => normalizeStatus(r.status) === "Absent").length;
      const leave = recs.filter((r) => normalizeStatus(r.status) === "Leave").length;
      const late = recs.filter((r) => normalizeStatus(r.status) === "Late").length;
      const total = recs.length;
      const percentage = attRes?.data?.summary?.percentage ??
        (total ? Math.round(((present + late + leave) / total) * 100) : 0);

      setSummary({ present, absent, leave, late, total, percentage });
    } finally {
      setLoading(false);
    }
  }, [studentId, month, year]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  const statusByDay = useMemo(() => {
    const map = {};
    for (const r of records) {
      const key = toDateKey(r.date);
      map[key] = normalizeStatus(r.status);
    }
    return map;
  }, [records]);

  const cells = useMemo(() => buildCalendarGrid(year, month), [year, month]);
  const todayKey = toDateKey(now);
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (isCurrentMonth) return;
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const onMonthSelect = (e) => {
    const [y, m] = String(e.target.value).split("-").map(Number);
    if (!y || !m) return;
    const max = new Date(now.getFullYear(), now.getMonth(), 1);
    const pick = new Date(y, m - 1, 1);
    if (pick > max) return;
    setYear(y);
    setMonth(m);
  };

  const monthOptions = useMemo(() => {
    const opts = [];
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push({
        value: `${d.getFullYear()}-${d.getMonth() + 1}`,
        label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      });
    }
    return opts;
  }, [now]);

  if (!canShow) return null;

  const attPath = roleAttendancePath(role, loginAs);

  return (
    <section
      className={`rounded-[1.35rem] border overflow-hidden ${className}`}
      style={{
        background: "rgb(var(--surface))",
        borderColor: "rgb(var(--border))",
        boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
      }}
    >
      {/* Header + month filter */}
      <div
        className="flex flex-col gap-3 border-b px-3.5 py-3"
        style={{ borderColor: "rgb(var(--border))" }}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3
              className="text-[13px] font-extrabold"
              style={{ color: "rgb(var(--text))" }}
            >
              {t("home.attendance", "Attendance")}
            </h3>
            <p
              className="text-[11px] font-semibold"
              style={{ color: "rgb(var(--text-muted))" }}
            >
              {t("home.attendanceHint", "Date-wise this month")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(attPath)}
            className="text-[11px] font-extrabold"
            style={{ color: "#2563EB" }}
          >
            {t("common.viewAll", "View all")}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border active:scale-95"
            style={{
              borderColor: "rgb(var(--border))",
              color: "rgb(var(--text))",
              background: "rgb(var(--bg))",
            }}
            aria-label={t("home.prevMonth", "Previous month")}
          >
            <FaChevronLeft size={12} />
          </button>

          <select
            value={`${year}-${month}`}
            onChange={onMonthSelect}
            className="h-9 min-w-0 flex-1 rounded-xl border px-3 text-[13px] font-extrabold outline-none"
            style={{
              borderColor: "rgb(var(--border))",
              background: "rgb(var(--bg))",
              color: "rgb(var(--text))",
            }}
            aria-label={t("home.selectMonth", "Select month")}
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border active:scale-95 disabled:opacity-30"
            style={{
              borderColor: "rgb(var(--border))",
              color: "rgb(var(--text))",
              background: "rgb(var(--bg))",
            }}
            aria-label={t("home.nextMonth", "Next month")}
          >
            <FaChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div
        className="grid grid-cols-4 gap-px border-b"
        style={{
          background: "rgb(var(--border))",
          borderColor: "rgb(var(--border))",
        }}
      >
        {[
          { label: t("urgent.present", "Present"), val: summary.present, color: STATUS.Present.swatch },
          { label: t("urgent.absent", "Absent"), val: summary.absent, color: STATUS.Absent.swatch },
          {
            label: t("urgent.leave", "Leave"),
            val: summary.leave + summary.late,
            color: STATUS.Leave.swatch,
          },
          {
            label: "%",
            val: `${summary.percentage}%`,
            color:
              summary.percentage >= 75
                ? STATUS.Present.swatch
                : summary.percentage >= 50
                  ? STATUS.Late.swatch
                  : STATUS.Absent.swatch,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center py-2.5"
            style={{ background: "rgb(var(--surface))" }}
          >
            <span className="text-[15px] font-extrabold tabular-nums" style={{ color: s.color }}>
              {s.val}
            </span>
            <span
              className="text-[10px] font-semibold"
              style={{ color: "rgb(var(--text-muted))" }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="p-3">
        {loading ? (
          <p
            className="py-8 text-center text-[12px] font-semibold"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {t("home.attendanceLoading", "Loading attendance…")}
          </p>
        ) : (
          <>
            {/* Weekday headers */}
            <div className="mb-1 grid grid-cols-7">
              {DAYS_SHORT.map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-[10px] font-extrabold uppercase"
                  style={{ color: "rgb(var(--text-muted))" }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Date grid */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (!day) {
                  return <div key={`e-${idx}`} className="aspect-square" />;
                }

                const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isToday = dateKey === todayKey;
                const isFuture = dateKey > todayKey;
                const holiday = holidays.find((e) => eventCoversDate(e, dateKey));
                const rawStatus = statusByDay[dateKey];
                // Holiday wins for highlight; Leave includes Late for home view
                let kind = null;
                if (holiday) kind = "Holiday";
                else if (rawStatus === "Absent") kind = "Absent";
                else if (rawStatus === "Leave" || rawStatus === "Late") kind = "Leave";
                else if (rawStatus === "Present") kind = "Present";

                const st = kind ? STATUS[kind] : null;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    disabled={isFuture}
                    onClick={() => !isFuture && navigate(attPath)}
                    title={
                      holiday
                        ? holiday.title
                        : kind
                          ? `${MONTHS[month - 1]} ${day}: ${STATUS[kind].label}`
                          : `${MONTHS[month - 1]} ${day}`
                    }
                    className="aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5
                      text-[11px] font-extrabold transition-transform active:scale-95 disabled:opacity-35"
                    style={{
                      background: st ? st.bg : "rgb(var(--bg))",
                      color: st ? st.fg : "rgb(var(--text-muted))",
                      border: isToday
                        ? "2px solid #2563EB"
                        : `1px solid ${st ? st.border : "rgb(var(--border))"}`,
                    }}
                  >
                    <span>{day}</span>
                    {st && (
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: st.swatch }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
              {["Present", "Absent", "Leave", "Holiday"].map((key) => (
                <span key={key} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: STATUS[key].swatch }}
                  />
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: "rgb(var(--text-muted))" }}
                  >
                    {t(`home.status.${key.toLowerCase()}`, STATUS[key].label)}
                  </span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
