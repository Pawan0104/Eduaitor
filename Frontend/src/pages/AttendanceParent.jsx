import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import UserAvatar from "../components/UserAvatar";

const API = import.meta.env.VITE_API_URL;
const TAB_KEY = "attendance_tab_preference";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS_SHORT  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const CURRENT_YEAR  = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

/* ─── Status colours ───────────────────────────────────────── */
const STATUS_DOT = {
  Present: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", letter: "P", label: "Present" },
  Absent:  { dot: "bg-rose-500",    text: "text-rose-700",    bg: "bg-rose-50",     border: "border-rose-200",    letter: "A", label: "Absent"  },
  Late:    { dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",   letter: "L", label: "Late"    },
};

const EVENT_TYPE_STYLE = {
  Holiday: { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500", letter: "H" },
  Event:   { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200",   dot: "bg-blue-500",   letter: "E" },
  Exam:    { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500", letter: "X" },
  Meeting: { bg: "bg-teal-100",   text: "text-teal-700",   border: "border-teal-200",   dot: "bg-teal-500",   letter: "M" },
};

/* ─── Helpers ──────────────────────────────────────────────── */
function toDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function buildCalendarGrid(year, month) {
  // Returns array of 42 cells (6 weeks × 7 days), some null (padding)
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/* Check if a calendar event covers a given date */
function eventCoversDate(event, dateKey) {
  const start = toDateKey(event.startDate);
  const end   = event.endDate ? toDateKey(event.endDate) : start;
  return dateKey >= start && dateKey <= end;
}

/* ─── Ring progress (for summary) ─────────────────────────── */
function RingProgress({ pct }) {
  const r = 26, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#f43f5e";
  return (
    <svg width="68" height="68" className="-rotate-90">
      <circle cx="34" cy="34" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
      <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x="34" y="38" textAnchor="middle"
        style={{ fill: color, fontSize: "11px", fontWeight: 700,
          transform: "rotate(90deg)", transformOrigin: "34px 34px" }}>
        {pct}%
      </text>
    </svg>
  );
}

/* ─── Summary card ─────────────────────────────────────────── */
function SummaryCard({ summary }) {
  const { present = 0, absent = 0, late = 0, total = 0, percentage = 0 } = summary;
  return (
    <div className="bg-[rgb(var(--surface))] rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-3">
      <div className="flex items-center gap-4 p-4">
        <RingProgress pct={percentage} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-wider mb-0.5">
            Attendance this month
          </p>
          <p className={`text-2xl font-bold leading-none
            ${percentage >= 75 ? "text-emerald-600" : percentage >= 50 ? "text-amber-600" : "text-rose-600"}`}>
            {percentage}%
            <span className="text-sm font-normal text-[rgb(var(--text))] ml-1.5">
              ({present + late}/{total} classes)
            </span>
          </p>
          <div className="h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700
                ${percentage >= 75 ? "bg-emerald-500" : percentage >= 50 ? "bg-amber-400" : "bg-rose-500"}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 border-t border-slate-100">
        {[
          { label: "Present", val: present, cls: "text-emerald-600" },
          { label: "Absent",  val: absent,  cls: "text-rose-600"    },
          { label: "Late",    val: late,    cls: "text-amber-600"   },
          { label: "Total",   val: total,   cls: "text-[rgb(var(--text))]" },
        ].map(({ label, val, cls }) => (
          <div key={label} className="flex flex-col items-center py-3 border-r last:border-0 border-slate-100">
            <span className={`text-lg font-bold leading-none ${cls}`}>{val}</span>
            <span className="text-[10px] text-[rgb(var(--text))] mt-0.5 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Day detail popup / bottom sheet ─────────────────────── */
function DayPopup({ day, year, month, activeTab, subjectRecords, classRecords, calendarEvents, subjects, onClose }) {
  if (!day) return null;

  const dateKey = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  const dateLabel = new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // Subject-wise records for this day
  const daySubjectRecords = subjectRecords.filter(r => toDateKey(r.date) === dateKey);

  // Class attendance for this day
  const dayClassRecord = classRecords.find(r => toDateKey(r.date) === dateKey);

  // Calendar events for this day
  const dayEvents = calendarEvents.filter(e => eventCoversDate(e, dateKey));

  const hasAttendance = activeTab === "subject" ? daySubjectRecords.length > 0 : !!dayClassRecord;
  const hasEvents     = dayEvents.length > 0;
  const isEmpty       = !hasAttendance && !hasEvents;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet — bottom on mobile, centered on desktop */}
      <div className="fixed z-50
        bottom-0 left-0 right-0 rounded-t-2xl
        sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
        sm:w-full sm:max-w-md sm:rounded-2xl
        bg-[rgb(var(--surface))] shadow-2xl
        max-h-[85vh] overflow-y-auto
      ">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-base font-bold text-[rgb(var(--text))]">{dateLabel}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {activeTab === "subject"
                ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]">Subject-wise</span>
                : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]">Class Attendance</span>
              }
              {dayEvents.map(e => {
                const s = EVENT_TYPE_STYLE[e.type] ?? EVENT_TYPE_STYLE.Event;
                return (
                  <span key={e._id} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                    {e.type}
                  </span>
                );
              })}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-[rgb(var(--text))] transition-colors shrink-0 ml-2"
          >
            <FaTimes size={13} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* ── Calendar events section ── */}
          {hasEvents && (
            <div>
              <p className="text-[10px] font-bold text-[rgb(var(--text))] uppercase tracking-widest mb-2">
                School Event
              </p>
              <div className="space-y-2">
                {dayEvents.map(event => {
                  const s = EVENT_TYPE_STYLE[event.type] ?? EVENT_TYPE_STYLE.Event;
                  return (
                    <div key={event._id} className={`rounded-xl border ${s.border} ${s.bg} p-3`}>
                      <div className="flex items-start gap-2">
                        <span className={`w-2 h-2 rounded-full ${s.dot} shrink-0 mt-1.5`} />
                        <div>
                          <p className={`text-sm font-bold ${s.text}`}>{event.title}</p>
                          {event.description && (
                            <p className={`text-xs mt-0.5 ${s.text} opacity-80`}>{event.description}</p>
                          )}
                          {event.location && (
                            <p className={`text-xs mt-0.5 ${s.text} opacity-70`}>📍 {event.location}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Subject-wise attendance ── */}
          {activeTab === "subject" && (
            <div>
              <p className="text-[10px] font-bold text-[rgb(var(--text))] uppercase tracking-widest mb-2">
                Subject Attendance
              </p>
              {daySubjectRecords.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-[rgb(var(--bg))] p-4 text-center">
                  <p className="text-sm text-[rgb(var(--text))]">
                    {hasEvents ? "No classes on this day" : "No attendance recorded"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {daySubjectRecords.map((r, i) => {
                    const st  = r.status ?? "Present";
                    const cfg = STATUS_DOT[st];
                    const subjectName = r.subjectId?.name ?? subjects.find(s => s._id === r.subjectId)?.name ?? "—";
                    return (
                      <div key={r._id ?? i} className={`flex items-center justify-between rounded-xl border ${cfg.border} ${cfg.bg} px-3 py-2.5`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
                          <span className="text-sm font-semibold text-[rgb(var(--text))]">{subjectName}</span>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Class attendance ── */}
          {activeTab === "class" && (
            <div>
              <p className="text-[10px] font-bold text-[rgb(var(--text))] uppercase tracking-widest mb-2">
                Class Attendance
              </p>
              {!dayClassRecord ? (
                <div className="rounded-xl border border-slate-200 bg-[rgb(var(--bg))] p-4 text-center">
                  <p className="text-sm text-[rgb(var(--text))]">
                    {hasEvents ? "No class on this day" : "Not marked for this day"}
                  </p>
                </div>
              ) : (
                <div className={`rounded-xl border px-4 py-3
                  ${STATUS_DOT[dayClassRecord.status]?.border ?? "border-slate-200"}
                  ${STATUS_DOT[dayClassRecord.status]?.bg ?? "bg-slate-50"}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[rgb(var(--text))]">Daily Attendance</p>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full
                      ${STATUS_DOT[dayClassRecord.status]?.bg ?? "bg-slate-100"}
                      ${STATUS_DOT[dayClassRecord.status]?.text ?? "text-slate-600"}
                      border ${STATUS_DOT[dayClassRecord.status]?.border ?? "border-slate-200"}`}
                    >
                      {STATUS_DOT[dayClassRecord.status]?.label ?? dayClassRecord.status}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Empty state ── */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <span className="text-3xl mb-2">📅</span>
              <p className="text-sm font-semibold text-[rgb(var(--text))]">No data</p>
              <p className="text-xs text-[rgb(var(--text))] mt-0.5">No attendance or events for this day</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Calendar grid ─────────────────────────────────────────── */
function CalendarGrid({ year, month, activeTab, subjectRecords, classRecords, calendarEvents, onDayClick }) {
  const cells  = useMemo(() => buildCalendarGrid(year, month), [year, month]);
  const todayKey = toDateKey(new Date());

  return (
    <div className="bg-[rgb(var(--surface))] rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DAYS_SHORT.map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-bold text-[rgb(var(--text))] uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="border-r border-b border-slate-100 last:border-r-0" style={{ minHeight: 64 }} />;
          }

          const dateKey = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isToday = dateKey === todayKey;
          const isFuture = dateKey > todayKey;

          /* Attendance status for this day */
          let attStatus  = null;
          let attStyle   = null;

          if (activeTab === "subject") {
            const recs = subjectRecords.filter(r => toDateKey(r.date) === dateKey);
            if (recs.length > 0) {
              // Aggregate: if any absent → Absent; if any late → Late; else Present
              const hasAbsent  = recs.some(r => r.status === "Absent");
              const hasLate    = recs.some(r => r.status === "Late");
              attStatus = hasAbsent ? "Absent" : hasLate ? "Late" : "Present";
              attStyle  = STATUS_DOT[attStatus];
            }
          } else {
            const rec = classRecords.find(r => toDateKey(r.date) === dateKey);
            if (rec) {
              attStatus = rec.status;
              attStyle  = STATUS_DOT[attStatus];
            }
          }

          /* Calendar event for this day */
          const dayEvents = calendarEvents.filter(e => eventCoversDate(e, dateKey));
          const topEvent  = dayEvents[0] ?? null;
          const evStyle   = topEvent ? (EVENT_TYPE_STYLE[topEvent.type] ?? EVENT_TYPE_STYLE.Event) : null;

          /* Holiday takes priority over attendance display at top */
          const isHoliday = dayEvents.some(e => e.type === "Holiday");

          return (
            <button
              key={dateKey}
              onClick={() => !isFuture && onDayClick(day)}
              disabled={isFuture}
              className={`
                border-r border-b border-slate-100
                flex flex-col
                transition-colors text-left
                ${isFuture ? "opacity-30 cursor-not-allowed" : "hover:bg-[rgb(var(--bg))] cursor-pointer active:scale-95"}
                ${isToday ? "ring-2 ring-inset ring-[rgb(var(--primary))]" : ""}
              `}
              style={{ minHeight: 64 }}
            >
              {/* TOP HALF — date number + status dot */}
              <div className="flex items-start justify-between px-1.5 pt-1.5 pb-0.5 flex-1">
                <span className={`text-xs font-bold leading-none
                  ${isToday
                    ? "w-5 h-5 flex items-center justify-center rounded-full bg-[rgb(var(--primary))] text-white text-[10px]"
                    : "text-[rgb(var(--text))]"
                  }`}
                >
                  {day}
                </span>

                {/* Status indicator */}
                {!isFuture && (
                  <div className="flex flex-col items-end gap-0.5">
                    {attStyle && !isHoliday && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${attStyle.dot}`} />
                    )}
                    {isHoliday && (
                      <span className="w-2 h-2 rounded-full shrink-0 bg-violet-500" />
                    )}
                    {!attStyle && !isHoliday && topEvent && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${evStyle.dot}`} />
                    )}
                  </div>
                )}
              </div>

              {/* BOTTOM HALF — event name */}
              {topEvent && (
                <div className={`mx-1 mb-1 px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-semibold leading-tight truncate
                  ${evStyle.bg} ${evStyle.text}`}
                >
                  {topEvent.title}
                </div>
              )}
              {!topEvent && attStatus && (
                <div className={`mx-1 mb-1 px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-semibold leading-tight
                  ${attStyle.bg} ${attStyle.text}`}
                >
                  {attStyle.letter}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Tab bar ────────────────────────────────────────────────── */
function TabBar({ active, onChange }) {
  const tabs = [
    { id: "subject", label: "Subject-wise" },
    { id: "class",   label: "Class Attendance" },
  ];
  return (
    <div className="flex gap-0 bg-[rgb(var(--surface))] rounded-xl border border-slate-200 p-1 mb-4">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all
            ${active === id
              ? "bg-[rgb(var(--primary))] text-white shadow-sm"
              : "text-[rgb(var(--text))] hover:bg-[rgb(var(--bg))]"
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─── Legend ─────────────────────────────────────────────────── */
function Legend() {
  const items = [
    { dot: "bg-emerald-500", label: "Present" },
    { dot: "bg-rose-500",    label: "Absent"  },
    { dot: "bg-amber-400",   label: "Late"    },
    { dot: "bg-violet-500",  label: "Holiday" },
    { dot: "bg-blue-500",    label: "Event"   },
  ];
  return (
    <div className="flex gap-3 flex-wrap justify-center mt-4">
      {items.map(({ dot, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <span className="text-xs text-[rgb(var(--text))]">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════ */
export default function AttendanceParent() {
  const navigate  = useNavigate();
  const isMobile  = window.innerWidth <= 768;

  /* ── Tab ── */
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem(TAB_KEY) ?? "subject"
  );

  /* ── Student meta ── */
  const [student,  setStudent]  = useState(null);
  const [subjects, setSubjects] = useState([]);

  /* ── Month nav ── */
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year,  setYear]  = useState(CURRENT_YEAR);

  /* ── Data ── */
  const [subjectRecords,  setSubjectRecords]  = useState([]);
  const [classRecords,    setClassRecords]    = useState([]);
  const [calendarEvents,  setCalendarEvents]  = useState([]);
  const [summary,         setSummary]         = useState({ present:0, absent:0, late:0, total:0, percentage:0 });

  /* ── Loading ── */
  const [loadingMeta, setLoadingMeta]     = useState(true);
  const [loadingData, setLoadingData]     = useState(false);

  /* ── Popup ── */
  const [selectedDay, setSelectedDay] = useState(null);

  /* ── 1. Fetch student meta on mount ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/attendance/parent/student-meta`, { withCredentials: true });
        setStudent(res.data.student);
        setSubjects(res.data.subjects ?? []);
      } catch {
        toast.error("Failed to load student info");
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, []);

  /* ── 2. Fetch attendance + calendar when student/month/year/tab changes ── */
  useEffect(() => {
    if (!student) return;
    fetchMonthData();
  }, [student, month, year, activeTab]);

  const fetchMonthData = async () => {
    setLoadingData(true);
    try {
      const monthStart = `${year}-${String(month).padStart(2,"0")}-01`;
      const lastDay    = new Date(year, month, 0).getDate();
      const monthEnd   = `${year}-${String(month).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;

      const promises = [
        /* Calendar events for this month */
        axios.get(`${API}/calendar/`, {
          params: { start: monthStart, end: monthEnd },
          withCredentials: true,
        }),
      ];

      if (activeTab === "subject") {
        promises.push(
          axios.get(`${API}/attendance/parent/report`, {
            params: { studentId: student._id, month, year },
            withCredentials: true,
          })
        );
      } else {
        promises.push(
          axios.get(`${API}/class-attendance/parent/report`, {
            params: { studentId: student._id, month, year },
            withCredentials: true,
          })
        );
      }

      const [calRes, attRes] = await Promise.all(promises);

      setCalendarEvents(calRes.data.events ?? []);

      if (activeTab === "subject") {
        const records = attRes.data.data ?? [];
        setSubjectRecords(records);
        setClassRecords([]);
        // Summary from subject records
        const present    = records.filter(r => r.status === "Present").length;
        const absent     = records.filter(r => r.status === "Absent").length;
        const late       = records.filter(r => r.status === "Late").length;
        const total      = records.length;
        const percentage = total ? Math.round(((present + late) / total) * 100) : 0;
        setSummary({ present, absent, late, total, percentage });
      } else {
        const records = attRes.data.records ?? [];
        setClassRecords(records);
        setSubjectRecords([]);
        setSummary(attRes.data.summary ?? { present:0, absent:0, late:0, total:0, percentage:0 });
      }
    } catch (err) {
      // Silently handle 404 (no records yet)
      if (err?.response?.status !== 404) {
        toast.error("Failed to load attendance data");
      }
      setSubjectRecords([]);
      setClassRecords([]);
      setCalendarEvents([]);
      setSummary({ present:0, absent:0, late:0, total:0, percentage:0 });
    } finally {
      setLoadingData(false);
    }
  };

  /* ── Month navigation ── */
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (year === CURRENT_YEAR && month === CURRENT_MONTH) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const isCurrentMonth = year === CURRENT_YEAR && month === CURRENT_MONTH;

  /* ── Tab change ── */
  const handleTabChange = (id) => {
    setActiveTab(id);
    localStorage.setItem(TAB_KEY, id);
    setSelectedDay(null);
  };

  /* ══════════════ RENDER ══════════════ */
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-lg mx-auto px-3 py-5 sm:px-5 sm:py-8">

        {/* Back (mobile) */}
        {isMobile && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 mb-4 rounded-xl
              bg-[rgb(var(--surface))] shadow-sm border border-slate-100
              text-sm font-bold text-[rgb(var(--text))] active:scale-95 transition-transform"
          >
            <FaArrowLeft size={14} /> Back
          </button>
        )}

        {/* ── Student header ── */}
        {loadingMeta ? (
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-slate-200 animate-pulse shrink-0" />
            <div className="space-y-2">
              <div className="h-4 w-36 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
        ) : student && (
          <div className="flex items-center gap-3 mb-5">
            <UserAvatar
              name={student.name}
              photoUrl={student.photo_url}
              size="lg"
              rounded="2xl"
              className="shadow-sm"
            />
            <div>
              <h1 className="text-lg font-bold text-[rgb(var(--text))] leading-tight">{student.name}</h1>
              <p className="text-xs text-[rgb(var(--text))] mt-0.5">
                {student.className} · {student.sectionName} · Roll {student.rollNumber}
              </p>
            </div>
          </div>
        )}

        {/* ── Tab bar ── */}
        <TabBar active={activeTab} onChange={handleTabChange} />

        {/* ── Month navigator ── */}
        <div className="flex items-center justify-between bg-[rgb(var(--surface))] rounded-xl border border-slate-200 px-3 py-2 mb-4">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[rgb(var(--bg))] text-[rgb(var(--text))] transition-colors"
          >
            <FaChevronLeft size={12} />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-[rgb(var(--text))]">{MONTHS[month - 1]} {year}</p>
          </div>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[rgb(var(--bg))] text-[rgb(var(--text))] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FaChevronRight size={12} />
          </button>
        </div>

        {/* ── Summary card ── */}
        {!loadingData && summary.total > 0 && <SummaryCard summary={summary} />}

        {/* ── Loading skeleton ── */}
        {loadingData && (
          <div className="bg-[rgb(var(--surface))] rounded-2xl border border-slate-200 p-4 animate-pulse">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {[...Array(7)].map((_,i) => <div key={i} className="h-4 bg-slate-200 rounded" />)}
            </div>
            {[...Array(5)].map((_,i) => (
              <div key={i} className="grid grid-cols-7 gap-1 mb-1">
                {[...Array(7)].map((_,j) => <div key={j} className="h-14 bg-slate-200 rounded" />)}
              </div>
            ))}
          </div>
        )}

        {/* ── Calendar grid ── */}
        {!loadingData && (
          <CalendarGrid
            year={year}
            month={month}
            activeTab={activeTab}
            subjectRecords={subjectRecords}
            classRecords={classRecords}
            calendarEvents={calendarEvents}
            onDayClick={setSelectedDay}
          />
        )}

        {/* ── Legend ── */}
        {!loadingData && <Legend />}

        {/* ── Hint text ── */}
        {!loadingData && (
          <p className="text-center text-xs text-[rgb(var(--text))] mt-3">
            Tap any day to see details
          </p>
        )}
      </div>

      {/* ── Day popup ── */}
      {selectedDay && (
        <DayPopup
          day={selectedDay}
          year={year}
          month={month}
          activeTab={activeTab}
          subjectRecords={subjectRecords}
          classRecords={classRecords}
          calendarEvents={calendarEvents}
          subjects={subjects}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}