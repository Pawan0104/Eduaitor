import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

/* ─── Constants ──────────────────────────────────────────── */
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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

const STATUS_CONFIG = {
  Present: {
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100",
    dot: "bg-emerald-500",
    icon: "✓",
  },
  Absent: {
    pill: "bg-rose-50 text-rose-600 border-rose-200 ring-rose-100",
    dot: "bg-rose-500",
    icon: "✗",
  },
  Late: {
    pill: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-100",
    dot: "bg-amber-400",
    icon: "◷",
  },
};

const PCT_BG = (p) =>
  p >= 75 ? "bg-emerald-500" : p >= 50 ? "bg-amber-400" : "bg-rose-500";
const PCT_TEXT = (p) =>
  p >= 75 ? "text-emerald-600" : p >= 50 ? "text-amber-600" : "text-rose-600";
const PCT_RING = (p) =>
  p >= 75 ? "ring-emerald-200" : p >= 50 ? "ring-amber-200" : "ring-rose-200";

/* ─── Ring Progress ──────────────────────────────────────── */
function RingProgress({ pct }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <svg width="72" height="72" className="-rotate-90">
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth="6"
      />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke={pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#f43f5e"}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)" }}
      />
      <text
        x="36"
        y="40"
        textAnchor="middle"
        className="rotate-90"
        style={{
          fill: pct >= 75 ? "#059669" : pct >= 50 ? "#d97706" : "#e11d48",
          fontSize: "11px",
          fontWeight: 700,
          transform: "rotate(90deg)",
          transformOrigin: "36px 36px",
        }}
      >
        {pct}%
      </text>
    </svg>
  );
}

/* ─── Summary Card ───────────────────────────────────────── */
function SummaryCard({ records }) {
  const total = records.length;
  const present = records.filter((r) => r.status === "Present").length;
  const absent = records.filter((r) => r.status === "Absent").length;
  const late = records.filter((r) => r.status === "Late").length;
  const pct = total ? Math.round(((present + late) / total) * 100) : 0;

  const pills = [
    {
      label: "Present",
      val: present,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      label: "Absent",
      val: absent,
      color: "bg-rose-50 text-rose-600 border-rose-200",
    },
    {
      label: "Late",
      val: late,
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      label: "Total",
      val: total,
      color: "bg-slate-100 text-slate-600 border-slate-200",
    },
  ];

  return (
    <div
      className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4 bg-[rgb(var(--surface))]"
    >
      <div className="flex items-center gap-4 p-4 ">
        <RingProgress pct={pct} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-wider mb-0.5">
            Attendance this month
          </p>
          <p className={`text-2xl font-bold leading-none ${PCT_TEXT(pct)}`}>
            {pct}%
            <span className="text-sm font-normal text-[rgb(var(--text))] ml-1">
              ({present + late}/{total} classes)
            </span>
          </p>
          <div className="h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${PCT_BG(pct)}`}
              style={{
                width: `${pct}%`,
                transition: "width 0.8s cubic-bezier(.4,0,.2,1)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 border-t border-slate-100">
        {pills.map(({ label, val, color }) => (
          <div
            key={label}
            className={`flex flex-col items-center py-3 border-r last:border-0 border-slate-100`}
          >
            <span className="text-lg font-bold text-[rgb(var(--text))] leading-none">
              {val}
            </span>
            <span className="text-[10px] text-[rgb(var(--text))] mt-0.5 font-medium">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Subject Tab ────────────────────────────────────────── */
function SubjectTabs({ subjects, active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mb-4 -mx-3 px-3">
      <button
        onClick={() => onChange("")}
        className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
          active === ""
            ? "bg-[rgb(var(--primary))] text-[rgb(var(--text))] shadow-sm"
            : "text-[rgb(var(--primary))] bg-[rgb(var(--surface))]"
        }`}
      >
        All Subjects
      </button>
      {subjects.map((s) => (
        <button
          key={s._id}
          onClick={() => onChange(s._id)}
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            active === s._id
              ? "bg-[rgb(var(--primary))] text-[rgb(var(--text))] shadow-sm"
              : "text-[rgb(var(--primary))] bg-[rgb(var(--surface))]"
          }`}
        >
          {s.name}
        </button>
      ))}
    </div>
  );
}

/* ─── Date Row ───────────────────────────────────────────── */
function DateRow({ record, isLatest }) {
  const date = new Date(record.date);
  const day = DAYS[date.getDay()];
  const dayNum = date.getDate();
  const st = record.status ?? "Present";
  const cfg = STATUS_CONFIG[st];
  const subjName = record.subjectId?.name ?? "—";

  return (
    <div
      className={`flex items-center gap-3 py-3 border-b border-slate-50 last:border-0 ${isLatest ? "animate-pulse-once" : ""}`}
    >
      {/* Date block */}
      <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl  border border-slate-100 shrink-0">
        <span className="text-[10px] font-semibold text-[rgb(var(--text))] uppercase leading-none">
          {day}
        </span>
        <span className="text-base font-bold text-[rgb(var(--text))] leading-tight">
          {dayNum}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[rgb(var(--text))] leading-tight truncate">
          {subjName}
        </p>
        <p className="text-xs text-[rgb(var(--text))] mt-0.5">
          {date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Status */}
      <span
        className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border ring-2 ${cfg.pill} ${cfg.ring}`}
      >
        {cfg.icon} {st}
      </span>
    </div>
  );
}

/* ─── Month Nav ──────────────────────────────────────────── */
function MonthNav({ month, year, onChange }) {
  const prev = () => {
    if (month === 1) onChange(12, year - 1);
    else onChange(month - 1, year);
  };
  const next = () => {
    const now = new Date();
    if (year === now.getFullYear() && month === now.getMonth() + 1) return; // can't go future
    if (month === 12) onChange(1, year + 1);
    else onChange(month + 1, year);
  };
  const isCurrentMonth =
    year === new Date().getFullYear() && month === new Date().getMonth() + 1;

  return (
    <div className="flex items-center justify-between text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl border border-slate-200 px-3 py-2 mb-4">
      <button
        onClick={prev}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
      >
        ‹
      </button>
      <div className="text-center">
        <p className="text-sm font-bold text-[rgb(var(--text))]">
          {MONTHS[month - 1]} {year}
        </p>
      </div>
      <button
        onClick={next}
        disabled={isCurrentMonth}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ›
      </button>
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────── */
function EmptyState({ month, year }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[rgb(var(--surface))] flex items-center justify-center mb-3 text-2xl">
        📅
      </div>
      <p className="text-sm font-semibold ">No records found</p>
      <p className="text-xs text-[rgb(var(--text))] mt-1">
        No attendance for {MONTHS[month - 1]} {year}
      </p>
    </div>
  );
}

/* ── Group records by date for multi-subject view ─────────── */
function groupByDate(records) {
  const map = {};
  records.forEach((r) => {
    const key = new Date(r.date).toISOString().split("T")[0];
    if (!map[key]) map[key] = [];
    map[key].push(r);
  });
  return Object.entries(map).sort(([a], [b]) => new Date(b) - new Date(a));
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function AttendanceParent() {
  const API = import.meta.env.VITE_API_URL;

  /* Student meta comes from auth/parent context */
  const [student, setStudent] = useState(null); // { name, rollNumber, className, sectionName, _id }
  const [subjects, setSubjects] = useState([]);

  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(CURRENT_YEAR);

  const [activeSubject, setActiveSubject] = useState(""); // "" = all
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  /* ── Fetch student meta on mount ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/attendance/parent/student-meta`, {
          withCredentials: true,
        });
        setStudent(res.data.student);
        setSubjects(res.data.subjects ?? []);
      } catch {
        toast.error("Failed to load student info");
      }
    })();
  }, []);

  /* ── Fetch attendance whenever month/year/subject changes ── */
  useEffect(() => {
    if (!student) return;
    fetchAttendance();
  }, [student, month, year, activeSubject]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const params = {
        studentId: student._id,
        month,
        year,
      };
      if (activeSubject) params.subjectId = activeSubject;

      const res = await axios.get(`${API}/attendance/parent/report`, {
        params,
        withCredentials: true,
      });
      setRecords(res.data.data ?? []);
      setInitialized(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  /* Sort records newest first */
  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [records],
  );

  const handleMonthChange = (m, y) => {
    setMonth(m);
    setYear(y);
  };

  /* ────────────────── RENDER ────────────────── */
  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-3 py-5 sm:px-5 sm:py-8">
        {/* Back button (mobile) */}
        {isMobile && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 mb-4 rounded-xl
                     bg-white shadow-sm border border-slate-100
                     text-sm font-bold text-slate-600 active:scale-95 transition-transform"
          >
            <FaArrowLeft size={14} /> Back
          </button>
        )}

        {/* ── Student Header ── */}
        {student && (
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-[rgb(var(--text))] shadow-sm shrink-0 bg-[rgb(var(--primary))]"
            >
              {student.name?.[0]?.toUpperCase() ?? "S"}
            </div>
            <div>
              <h1 className="text-lg font-bold text-[rgb(var(--text))] leading-tight">
                {student.name}
              </h1>
              <p className="text-xs text-[rgb(var(--text))] mt-0.5">
                {student.className} • {student.sectionName} • Roll{" "}
                {student.rollNumber}
              </p>
            </div>
          </div>
        )}

        {!student && (
          <div className="mb-5">
            <div className="h-12 w-48 bg-[rgb(var(--primary))] rounded-2xl animate-pulse" />
          </div>
        )}

        {/* ── Month Nav ── */}
        <MonthNav month={month} year={year} onChange={handleMonthChange} />

        {/* ── Subject Tabs ── */}
        {subjects.length > 0 && (
          <SubjectTabs
            subjects={subjects}
            active={activeSubject}
            onChange={setActiveSubject}
          />
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-[rgb(var(--surface))] rounded-xl p-3 border border-slate-100"
              >
                <div className="w-11 h-11 rounded-xl bg-[rgb(var(--primary))] animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-[rgb(var(--primary))] rounded animate-pulse w-3/4" />
                  <div className="h-2.5 bg-[rgb(var(--primary))] rounded animate-pulse w-1/2" />
                </div>
                <div className="w-16 h-7 rounded-full bg-[rgb(var(--primary))] animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* ── Results ── */}
        {!loading && initialized && (
          <>
            {/* Summary */}
            {sortedRecords.length > 0 && (
              <SummaryCard records={sortedRecords} />
            )}

            {/* Records list */}
            <div className="bg-[rgb(var(--surface))] rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                <p className="text-sm font-bold text-[rgb(var(--text))]">
                  {activeSubject
                    ? (subjects.find((s) => s._id === activeSubject)?.name ??
                      "Subject")
                    : "All Subjects"}
                </p>
                {sortedRecords.length > 0 && (
                  <span className="text-xs bg-slate-100 text-[rgb(var(--primary))] font-semibold px-2.5 py-1 rounded-full">
                    {sortedRecords.length}{" "}
                    {sortedRecords.length === 1 ? "class" : "classes"}
                  </span>
                )}
              </div>

              <div className="px-4">
                {sortedRecords.length === 0 ? (
                  <EmptyState month={month} year={year} />
                ) : (
                  sortedRecords.map((r, i) => (
                    <DateRow key={r._id ?? i} record={r} isLatest={i === 0} />
                  ))
                )}
              </div>
            </div>

            {/* Legend */}
            {sortedRecords.length > 0 && (
              <div className="flex gap-3 justify-center mt-4 flex-wrap">
                {Object.entries(STATUS_CONFIG).map(([label, cfg]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-xs text-[rgb(var(--text))]">{label}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Initial / Not loaded ── */}
        {!loading && !initialized && (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-sm text-[rgb(var(--text))]">
              Loading your child's attendance…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
