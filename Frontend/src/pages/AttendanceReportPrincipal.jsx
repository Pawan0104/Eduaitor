import React, { useState, useEffect } from "react";
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

const STATUS_STYLE = {
  Present: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Absent: "bg-red-100 text-red-700 border-red-200",
  Late: "bg-amber-100 text-amber-700 border-amber-200",
};

const PCT_COLOR = (p) =>
  p >= 75 ? "bg-emerald-500" : p >= 50 ? "bg-amber-400" : "bg-red-500";
const PCT_TEXT = (p) =>
  p >= 75 ? "text-emerald-600" : p >= 50 ? "text-amber-600" : "text-red-600";

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

/* ─── Reusable Select ────────────────────────────────────── */
function Sel({ label, value, onChange, disabled, children }) {
  return (
    <div className="flex flex-col gap-1 text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
      <label className="text-xs font-semibold text-[rgb(var(--text))] bg-[rgb(var(--surface))]  uppercase tracking-wide pl-0.5">
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm 
                   focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                   disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
      >
        {children}
      </select>
    </div>
  );
}

/* ─── Stat Pill ──────────────────────────────────────────── */
function StatPill({ label, value, color }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl px-4 py-3 border ${color} min-w-18`}
    >
      <span className="text-xl font-bold leading-none">{value}</span>
      <span className="text-xs mt-1 font-medium opacity-80">{label}</span>
    </div>
  );
}

/* ─── Summary Bar ────────────────────────────────────────── */
function SummaryBar({ data, type }) {
  if (!data.length) return null;

  if (type === "daily") {
    const total = data.length;
    const present = data.filter((s) => s.status === "Present").length;
    const absent = data.filter((s) => s.status === "Absent").length;
    const late = data.filter((s) => s.status === "Late").length;
    const pct = Math.round((present / total) * 100);

    return (
      <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide">
            Daily Summary
          </p>
          <span className={`text-lg font-bold ${PCT_TEXT(pct)}`}>{pct}%</span>
        </div>
        <div className="h-2  rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-500 ${PCT_COLOR(pct)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <StatPill
            label="Total"
            value={total}
            color="bg-slate-50 border-slate-200 text-slate-700"
          />
          <StatPill
            label="Present"
            value={present}
            color="bg-emerald-50 border-emerald-200 text-emerald-700"
          />
          <StatPill
            label="Absent"
            value={absent}
            color="bg-red-50 border-red-200 text-red-700"
          />
          <StatPill
            label="Late"
            value={late}
            color="bg-amber-50 border-amber-200 text-amber-700"
          />
        </div>
      </div>
    );
  }

  // Monthly
  const avgPct = Math.round(
    data.reduce((s, r) => s + (r.percentage ?? 0), 0) / data.length,
  );
  const good = data.filter((r) => r.percentage >= 75).length;
  const risk = data.filter((r) => r.percentage < 75).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Monthly Summary
        </p>
        <span className={`text-lg font-bold ${PCT_TEXT(avgPct)}`}>
          {avgPct}% Avg
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-500 ${PCT_COLOR(avgPct)}`}
          style={{ width: `${avgPct}%` }}
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        <StatPill
          label="Students"
          value={data.length}
          color="bg-slate-50 border-slate-200 text-slate-700"
        />
        <StatPill
          label="≥75%"
          value={good}
          color="bg-emerald-50 border-emerald-200 text-emerald-700"
        />
        <StatPill
          label="<75%"
          value={risk}
          color="bg-red-50 border-red-200 text-red-700"
        />
      </div>
    </div>
  );
}

/* ─── Daily Row ──────────────────────────────────────────── */
function DailyRow({ record }) {
  const { firstName, lastName, rollNo } = record.studentId ?? {};
  const fullName = firstName ? `${firstName} ${lastName ?? ""}`.trim() : "—";
  const st = record.status ?? "Present";

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[rgb(var(--primary))] flex items-center justify-center text-sm font-bold text-[rgb(var(--text))] shrink-0">
          {(firstName ?? "?")[0].toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-[rgb(var(--text))] leading-tight">
            {fullName}
          </p>
          <p className="text-xs text-[rgb(var(--text))]">Roll {rollNo ?? "—"}</p>
        </div>
      </div>
      <span
        className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_STYLE[st]}`}
      >
        {st}
      </span>
    </div>
  );
}

/* ─── Monthly Row ────────────────────────────────────────── */
function MonthlyRow({ record }) {
  const {
    name,
    rollNumber,
    present = 0,
    absent = 0,
    late = 0,
    total = 0,
    percentage = 0,
  } = record;

  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[rgb(var(--primary))] flex items-center justify-center text-sm font-bold text-[rgb(var(--text))] shrink-0">
            {(name ?? "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold  leading-tight">
              {name ?? "—"}
            </p>
            <p className="text-xs text-[rgb(var(--text))]">Roll {rollNumber ?? "—"}</p>
          </div>
        </div>
        <span className={`text-base font-bold ${PCT_TEXT(percentage)}`}>
          {percentage}%
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full ${PCT_COLOR(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md px-2 py-0.5">
          P {present}
        </span>
        <span className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-md px-2 py-0.5">
          A {absent}
        </span>
        {late > 0 && (
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2 py-0.5">
            L {late}
          </span>
        )}
        <span className="text-xs bg-slate-100 text-slate-600 rounded-md px-2 py-0.5">
          Total {total}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN — Principal Attendance Report
══════════════════════════════════════════════════════════ */
export default function AttendanceReportPrincipal() {
  const API = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  /* ── Meta state ── */
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);

  /* ── Filter state ── */
  const [selClass, setSelClass] = useState("");
  const [selSection, setSelSection] = useState("");
  const [selSubject, setSelSubject] = useState("");
  const [selDate, setSelDate] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  /* ── Report state ── */
  const [reportData, setReportData] = useState([]);
  const [reportType, setReportType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  /* ── Derived ── */
  const currentClass = classes.find((c) => c._id === selClass);
  const availableSections = currentClass?.details ?? [];

  /* ── Load meta on mount ── */
  useEffect(() => {
    (async () => {
      try {
        setMetaLoading(true);
        const res = await axios.get(`${API}/attendance/meta`, {
          withCredentials: true,
        });
        // school_admin branch returns { classes, subjects }
        setClasses(res.data.classes ?? []);
        setSubjects(res.data.subjects ?? []);
      } catch {
        toast.error("Failed to load school data");
      } finally {
        setMetaLoading(false);
      }
    })();
  }, []);

  /* ── Reset section when class changes ── */
  const handleClassChange = (e) => {
    setSelClass(e.target.value);
    setSelSection("");
    setReportData([]);
    setHasFetched(false);
  };

  /* ── Validation ── */
  const validate = () => {
    if (!selClass) {
      toast.warning("Please select a class");
      return false;
    }
    if (!selSection) {
      toast.warning("Please select a section");
      return false;
    }
    if (!selSubject) {
      toast.warning("Please select a subject");
      return false;
    }
    if (!selDate && (!month || !year)) {
      toast.warning("Select a date  OR  both month and year");
      return false;
    }
    if (month && !year) {
      toast.warning("Please select a year");
      return false;
    }
    if (year && !month) {
      toast.warning("Please select a month");
      return false;
    }
    return true;
  };

  /* ── Fetch report ── */
  const fetchReport = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API}/attendance/report`, {
        params: {
          classId: selClass,
          sectionId: selSection,
          subjectId: selSubject,
          date: selDate || undefined,
          month: month || undefined,
          year: year || undefined,
        },
        withCredentials: true,
      });
      setReportData(res.data.data ?? []);
      setReportType(res.data.type);
      setHasFetched(true);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load report";
      toast.error(msg);
      setReportData([]);
      setHasFetched(true);
    } finally {
      setLoading(false);
    }
  };

  /* ── Clear all ── */
  const clearAll = () => {
    setSelClass("");
    setSelSection("");
    setSelSubject("");
    setSelDate("");
    setMonth("");
    setYear("");
    setReportData([]);
    setReportType(null);
    setHasFetched(false);
  };

  /* ── Label for result header ── */
  const modeLabel =
    reportType === "daily"
      ? new Date(selDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : reportType === "monthly"
        ? `${MONTHS[Number(month) - 1]} ${year}`
        : null;

  const selectedClassName = currentClass?.name ?? "";
  const selectedSectionName =
    availableSections.find((d) => d.sectionId?._id === selSection)?.sectionId
      ?.name ?? "";
  const selectedSubjectName =
    subjects.find((s) => s._id === selSubject)?.name ?? "";

  /* ─────────────────── RENDER ─────────────────── */
  return (
    <div className="min-h-screen bg-[rgb(var(--surface))]">
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
          <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                 bg-[rgb(var(--surface))] shadow-sm border border-slate-100
                 text-sm font-bold text-[rgb(var(--text))] active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}
      <div className="max-w-2xl mx-auto px-3 py-5 sm:px-6 sm:py-8">
        {/* ── Page Header ── */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            {/* Purple badge to distinguish from teacher view */}
            <span className="text-xs font-semibold bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-full">
              Principal View
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[rgb(var(--text))]">
            Attendance Report
          </h1>
          <p className="text-sm text-[rgb(var(--text))] mt-0.5">
            School-wide attendance by class, section &amp; subject
          </p>
        </div>

        {/* ── Filter Card ── */}
        <div className="bg-[rgb(var(--surface))] rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 mb-5">
          <p className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-wider mb-3">
            Filters
          </p>

          {metaLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-[rgb(var(--text))]">
              <svg
                className="animate-spin w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              <span className="text-sm">Loading school data…</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {/* Class */}
              <Sel label="Class" value={selClass} onChange={handleClassChange}>
                <option value="" className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">Select class</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id} className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">
                    {c.name}
                  </option>
                ))}
              </Sel>

              {/* Section — depends on class */}
              <Sel
                label="Section"
                value={selSection}
                onChange={(e) => setSelSection(e.target.value)}
                disabled={!selClass}
              >
                <option value="" className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">Select section</option>
                {availableSections.map((d) => (
                  <option key={d._id} value={d.sectionId?._id} className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">
                    {d.sectionId?.name}
                  </option>
                ))}
              </Sel>

              {/* Subject — full width */}
              <div className="col-span-2">
                <Sel
                  label="Subject"
                  value={selSubject}
                  onChange={(e) => setSelSubject(e.target.value)}
                >
                  <option value="" className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">Select subject</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id} className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">
                      {s.name}
                    </option>
                  ))}
                </Sel>
              </div>

              {/* Divider */}
              <div className="col-span-2 border-t border-slate-100" />
              <p className="col-span-2 text-xs text-[rgb(var(--text))]">
                Pick{" "}
                <span className="font-semibold text-[rgb(var(--text))]">a date</span> for
                daily view or{" "}
                <span className="font-semibold text-[rgb(var(--text))]">
                  month + year
                </span>{" "}
                for monthly summary
              </p>

              {/* Date — full width */}
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-semibold text-[rgb(var(--text))] bg-[rgb(var(--surface))] uppercase tracking-wide pl-0.5">
                  Date
                </label>
                <input
                  type="date"
                  value={selDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setSelDate(e.target.value);
                    setMonth("");
                    setYear("");
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-[rgb(var(--surface))] text-[rgb(var(--text))]
                             focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                />
              </div>

              {/* Month */}
              <Sel
                label="Month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setSelDate("");
                }}
              >
                <option value="" className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">Month</option>
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1} className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">
                    {m}
                  </option>
                ))}
              </Sel>

              {/* Year */}
              <Sel
                label="Year"
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  setSelDate("");
                }}
              >
                <option value="" className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">Year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y} className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">
                    {y}
                  </option>
                ))}
              </Sel>

              {/* Actions */}
              <div className="col-span-2 flex gap-2 mt-1">
                <button
                  onClick={fetchReport}
                  disabled={loading}
                  className="flex-1  bg-[rgb(var(--primary))] text-[rgb(var(--text))]  disabled:opacity-60
                             text-sm font-semibold py-2.5 px-4 rounded-xl transition-colors
                             flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                      Loading…
                    </>
                  ) : (
                    "View Report"
                  )}
                </button>
                <button
                  onClick={clearAll}
                  className="border border-slate-200 text-sm font-medium py-2.5 px-4
                             rounded-xl transition-colors bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Results ── */}
        {hasFetched && (
          <>
            {reportData.length > 0 && (
              <SummaryBar data={reportData} type={reportType} />
            )}

            <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Result header */}
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {reportType === "daily"
                        ? "Daily Report"
                        : "Monthly Report"}
                    </p>
                    {/* Breadcrumb: Class › Section › Subject */}
                    <p className="text-xs text-[rgb(var(--text))] mt-0.5">
                      {selectedClassName}
                      {selectedSectionName && ` › ${selectedSectionName}`}
                      {selectedSubjectName && ` › ${selectedSubjectName}`}
                    </p>
                    {modeLabel && (
                      <p className="text-xs  font-medium mt-0.5">
                        {modeLabel}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-[rgb(var(--text))] bg-[rgb(var(--primary))] font-medium px-2.5 py-1 rounded-full shrink-0 ml-2">
                    {reportData.length} student
                    {reportData.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Rows */}
              <div className="px-4">
                {reportData.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-3xl mb-2">📋</p>
                    <p className="text-sm text-[rgb(var(--text))]">
                      No attendance records found
                    </p>
                    <p className="text-xs text-[rgb(var(--text))] mt-1">
                      Try a different filter or date
                    </p>
                  </div>
                ) : reportType === "daily" ? (
                  reportData.map((r, i) => (
                    <DailyRow key={r._id ?? i} record={r} />
                  ))
                ) : (
                  reportData.map((r, i) => (
                    <MonthlyRow key={r._id ?? i} record={r} />
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Empty state ── */}
        {!hasFetched && !metaLoading && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🏫</p>
            <p className="text-sm text-slate-500">
              Select class, section &amp; subject then tap{" "}
              <strong className="text-slate-700">View Report</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
