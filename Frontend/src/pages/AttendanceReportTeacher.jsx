import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {FaArrowLeft} from "react-icons/fa";
import { useNavigate } from "react-router-dom";


const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_STYLE = {
  Present: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Absent:  "bg-red-100 text-red-700 border-red-200",
  Late:    "bg-amber-100 text-amber-700 border-amber-200",
};

const PCT_COLOR = (pct) => {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-400";
  return "bg-red-500";
};

const PCT_TEXT = (pct) => {
  if (pct >= 75) return "text-emerald-600";
  if (pct >= 50) return "text-amber-600";
  return "text-red-600";
};

/* ─── Stat Pill ──────────────────────────────────────────── */
function StatPill({ label, value, color }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl px-4 py-3 border ${color} min-w-18`}>
      <span className="text-xl font-bold leading-none">{value}</span>
      <span className="text-xs mt-1 font-medium opacity-80">{label}</span>
    </div>
  );
}

/* ─── Summary Bar ────────────────────────────────────────── */
function SummaryBar({ data, type }) {
  if (!data.length) return null;

  if (type === "daily") {
    const total   = data.length;
    const present = data.filter(s => s.status === "Present").length;
    const absent  = data.filter(s => s.status === "Absent").length;
    const late    = data.filter(s => s.status === "Late").length;
    const pct     = Math.round((present / total) * 100);

    return (
      <div className="bg-[rgb(var(--surface))]  rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[rgb(var(--text))] uppercase tracking-wide">Daily Summary</p>
          <span className={`text-lg font-bold ${PCT_TEXT(pct)}`}>{pct}% Attendance</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div className={`h-full rounded-full transition-all duration-500 ${PCT_COLOR(pct)}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <StatPill label="Total"   value={total}   color=" border-slate-200 text-[rgb(var(--text))]" />
          <StatPill label="Present" value={present} color="bg-emerald-50 border-emerald-200 text-emerald-700" />
          <StatPill label="Absent"  value={absent}  color="bg-red-50 border-red-200 text-red-700" />
          <StatPill label="Late"    value={late}    color="bg-amber-50 border-amber-200 text-amber-700" />
        </div>
      </div>
    );
  }

  const totalStudents = data.length;
  const avgPct = Math.round(data.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / totalStudents);
  const good   = data.filter(s => s.percentage >= 75).length;
  const risk   = data.filter(s => s.percentage < 75).length;

  return (
    <div className="bg-[rgb(var(--surface))] rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[rgb(var(--text))] uppercase tracking-wide">Monthly Summary</p>
        <span className={`text-lg font-bold ${PCT_TEXT(avgPct)}`}>{avgPct}% Avg</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div className={`h-full rounded-full transition-all duration-500 ${PCT_COLOR(avgPct)}`} style={{ width: `${avgPct}%` }} />
      </div>
      <div className="flex gap-2 flex-wrap">
        <StatPill label="Students" value={totalStudents} color="border-slate-200 text-[rgb(var(--text))]" />
        <StatPill label="≥75%"     value={good}          color="bg-emerald-50 border-emerald-200 text-emerald-700" />
        <StatPill label="<75%"     value={risk}          color="bg-red-50 border-red-200 text-red-700" />
      </div>
    </div>
  );
}

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
          <p className="text-sm font-semibold text-[rgb(var(--text))] leading-tight">{fullName}</p>
          <p className="text-xs text-[rgb(var(--text))]">Roll {rollNo ?? "—"}</p>
        </div>
      </div>
      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_STYLE[st]}`}>
        {st}
      </span>
    </div>
  );
}
/* ─── Monthly Row ────────────────────────────────────────── */
function MonthlyRow({ record }) {
  const { name, rollNumber, present = 0, absent = 0, late = 0, total = 0, percentage = 0 } = record;

  return (
    <div className="py-3 bg-[rgb(var(--surface))] border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[rgb(var(--primary))] flex items-center justify-center text-sm font-bold text-[rgb(var(--text))] shrink-0">
            {(name ?? "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-[rgb(var(--text))] leading-tight">{name ?? "—"}</p>
            <p className="text-xs text-[rgb(var(--text))]">Roll {rollNumber ?? "—"}</p>
          </div>
        </div>
        <span className={`text-base font-bold ${PCT_TEXT(percentage)}`}>{percentage}%</span>
      </div>

      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full ${PCT_COLOR(percentage)}`} style={{ width: `${percentage}%` }} />
      </div>

      <div className="flex gap-2 flex-wrap">
        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md px-2 py-0.5">P {present}</span>
        <span className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-md px-2 py-0.5">A {absent}</span>
        {late > 0 && (
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2 py-0.5">L {late}</span>
        )}
        <span className="text-xs bg-[rgb(var(--primary))] text-[rgb(var(--text))] rounded-md px-2 py-0.5">Total {total}</span>
      </div>
    </div>
  );
}

/* ─── Select wrapper ─────────────────────────────────────── */
function Sel({ label, value, onChange, disabled, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-wide pl-1">
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]
                   focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                    disabled:text-[rgb(var(--text))] disabled:cursor-not-allowed"
      >
        {children}
      </select>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════ */
export default function AttendanceReportTeacher() {
  const API = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;


  const [classes,  setClasses]  = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [selClass,   setSelClass]   = useState("");
  const [selSection, setSelSection] = useState("");
  const [selSubject, setSelSubject] = useState("");
  const [selDate,    setSelDate]    = useState("");
  const [month,      setMonth]      = useState("");
  const [year,       setYear]       = useState("");

  const [reportData, setReportData] = useState([]);
  const [reportType, setReportType] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const currentClass      = classes.find(c => c._id === selClass);
  const availableSections = currentClass?.details ?? [];

  /* ── fetch meta ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/attendance/meta`, { withCredentials: true });
        setClasses(res.data.teacher.assignedClasses ?? []);
        setSubjects(res.data.teacher.subjects ?? []);
      } catch {
        toast.error("Failed to load metadata");
      }
    })();
  }, []);

  /* ── validate ── */
  const validate = () => {
    if (!selClass)   { toast.warning("Select a class");   return false; }
    if (!selSection) { toast.warning("Select a section"); return false; }
    if (!selSubject) { toast.warning("Select a subject"); return false; }
    if (!selDate && (!month || !year)) {
      toast.warning("Select a date  OR  month + year");
      return false;
    }
    return true;
  };

  /* ── fetch report ── */
  const fetchReport = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API}/attendance/report`, {
        params: { classId: selClass, sectionId: selSection, subjectId: selSubject, date: selDate, month, year },
        withCredentials: true,
      });
      console.log("REPORT RES:", res.data.data);
      setReportData(res.data.data ?? []);
      setReportType(res.data.type);
      setHasFetched(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setSelClass(""); setSelSection(""); setSelSubject("");
    setSelDate(""); setMonth(""); setYear("");
    setReportData([]); setReportType(null); setHasFetched(false);
  };

  const modeLabel = reportType === "daily"
    ? `Date: ${new Date(selDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
    : reportType === "monthly"
    ? `${MONTHS[Number(month) - 1]} ${year}`
    : null;

  /* ────────────────── RENDER ────────────────── */
  return (
    <div className="min-h-screen">
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
          <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                 bg-white shadow-sm border border-slate-100
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
          <h1 className="text-2xl font-bold text-[rgb(var(--text))]">Attendance Report</h1>
          <p className="text-sm text-[rgb(var(--text))] mt-0.5">View attendance by class &amp; subject</p>
        </div>

        {/* ── Filter Card ── */}
        <div className="bg-[rgb(var(--surface))] rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 mb-5">
          <p className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-wider mb-3">Filters</p>

          <div className="grid grid-cols-2 gap-3">

            <Sel label="Class" value={selClass} onChange={e => { setSelClass(e.target.value); setSelSection(""); }}>
              <option value="">Select class</option>
              {classes.map(c => <option key={c._id} value={c._id} className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">{c.name}</option>)}
            </Sel>

            <Sel label="Section" value={selSection} onChange={e => setSelSection(e.target.value)} disabled={!selClass}>
              <option value="">Select section</option>
              {availableSections.map(d => (
                <option key={d._id} value={d.sectionId?._id}>{d.sectionId?.name}</option>
              ))}
            </Sel>

            <div className="col-span-2">
              <Sel label="Subject" value={selSubject} onChange={e => setSelSubject(e.target.value)}>
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </Sel>
            </div>

            <div className="col-span-2 border-t border-slate-100 my-1" />
            <p className="col-span-2 text-xs text-[rgb(var(--text))] -mt-1">
              Pick <span className="font-semibold text-[rgb(var(--text))]">a date</span> for daily or{" "}
              <span className="font-semibold text-[rgb(var(--text))]">month + year</span> for monthly
            </p>

            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-wide pl-1">Date</label>
              <input
                type="date"
                value={selDate}
                onChange={e => { setSelDate(e.target.value); setMonth(""); setYear(""); }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm 
                           focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            <Sel label="Month" value={month} onChange={e => { setMonth(e.target.value); setSelDate(""); }}>
              <option value="">Month</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </Sel>

            <Sel label="Year" value={year} onChange={e => { setYear(e.target.value); setSelDate(""); }}>
              <option value="">Year</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </Sel>

          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="flex-1  disabled:opacity-60 bg-[rgb(var(--primary))] text-[rgb(var(--text))]
                        text-sm font-semibold py-2.5 px-4 rounded-xl transition-colors"
            >
              {loading ? "Loading…" : "View Report"}
            </button>
            <button
              onClick={clearAll}
              className="border border-slate-200 text-[rgb(var(--text))] text-sm font-medium py-2.5 px-4
                         rounded-xl bg-[rgb(var(--bg))] transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* ── Results ── */}
        {hasFetched && (
          <>
            {reportData.length > 0 && (
              <SummaryBar data={reportData} type={reportType} />
            )}

            <div className=" bg-[rgb(var(--surface))] rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-[rgb(var(--text))]">
                    {reportType === "daily" ? "Daily Report" : "Monthly Report"}
                  </p>
                  {modeLabel && <p className="text-xs text-[rgb(var(--text))]">{modeLabel}</p>}
                </div>
                <span className="text-xs bg-[rgb(var(--primary))] text-[rgb(var(--text))] font-medium px-2.5 py-1 rounded-full">
                  {reportData.length} student{reportData.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="px-4">
                {reportData.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-3xl mb-2">📋</p>
                    <p className="text-sm text-[rgb(var(--text))]">No attendance records found</p>
                    <p className="text-xs text-[rgb(var(--text))] mt-1">Try a different date or filter</p>
                  </div>
                ) : reportType === "daily" ? (
                  reportData.map((r, i) => <DailyRow key={r._id ?? i} record={r} />)
                ) : (
                  reportData.map((r, i) => <MonthlyRow key={r._id ?? i} record={r} />)
                )}
              </div>
            </div>
          </>
        )}

        {!hasFetched && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🗓️</p>
            <p className="text-sm text-[rgb(var(--text))]">Select filters and tap <strong>View Report</strong></p>
          </div>
        )}

      </div>
    </div>
  );
}