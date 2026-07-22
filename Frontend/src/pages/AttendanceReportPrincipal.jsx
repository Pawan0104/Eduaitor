/**
 * AttendanceReportPrincipal.jsx  (MODIFIED — tab wrapper added)
 *
 * HOW TO USE:
 * 1. Keep your original AttendanceReportPrincipal.jsx but rename the
 *    default export inside it to  PrincipalSubjectReport
 *    (or copy the SubjectWisePrincipal inner component below).
 * 2. Replace your route's component with this file's default export.
 *
 * This file contains the full subject-wise logic inline so you only
 * need to drop in ONE file.
 */

import React, { useState, useEffect, lazy, Suspense } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft, FaSearch, FaTimes,
  FaChevronRight, FaClipboardList, FaUserCheck,
} from "react-icons/fa";
import UserAvatar from "../components/UserAvatar";

const ClassAttendanceReportPrincipal = lazy(() => import("./ClassAttendanceReportPrincipal"));

const API     = import.meta.env.VITE_API_URL;
const TAB_KEY = "attendance_tab_preference";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const TODAY = new Date().toISOString().split("T")[0];

const PCT_COLOR = (p) => p >= 75 ? "bg-emerald-500" : p >= 50 ? "bg-amber-400" : "bg-red-500";
const PCT_TEXT  = (p) => p >= 75 ? "text-emerald-600" : p >= 50 ? "text-amber-600" : "text-red-600";
const STATUS_STYLE = {
  Present: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Absent:  "bg-red-100 text-red-700 border-red-200",
  Late:    "bg-amber-100 text-amber-700 border-amber-200",
};

/* ─── Tab Bar ── */
function TabBar({ active, onChange }) {
  const tabs = [
    { id: "subject", label: "Subject-wise",     short: "Subject", icon: FaClipboardList },
    { id: "class",   label: "Class Attendance", short: "Class",   icon: FaUserCheck     },
  ];
  return (
    <div className="bg-[rgb(var(--surface))] border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-2xl mx-auto px-3 sm:px-6">
        <div className="flex">
          {tabs.map(({ id, label, short, icon: Icon }) => (
            <button key={id} onClick={() => onChange(id)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3.5 text-sm font-semibold
                border-b-2 transition-all duration-150 whitespace-nowrap
                ${active === id
                  ? "border-[rgb(var(--primary))] text-[rgb(var(--primary))]"
                  : "border-transparent text-[rgb(var(--text))] hover:text-[rgb(var(--primary))] hover:border-slate-300"
                }`}>
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{short}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabFallback() {
  return (
    <div className="flex items-center justify-center min-h-64 gap-2">
      <svg className="animate-spin w-5 h-5 text-[rgb(var(--primary))]" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      <span className="text-sm text-[rgb(var(--text))]">Loading…</span>
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl px-4 py-3 border ${color}`}>
      <span className="text-xl font-bold leading-none">{value}</span>
      <span className="text-xs mt-1 font-medium opacity-80">{label}</span>
    </div>
  );
}

function SummaryBar({ data, type }) {
  if (!data.length) return null;
  if (type === "daily") {
    const total=data.length, present=data.filter(s=>s.status==="Present").length;
    const absent=data.filter(s=>s.status==="Absent").length, late=data.filter(s=>s.status==="Late").length;
    const pct=total?Math.round((present/total)*100):0;
    return (
      <div className="bg-[rgb(var(--surface))] rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-wide">Daily Summary</p>
          <span className={`text-lg font-bold ${PCT_TEXT(pct)}`}>{pct}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div className={`h-full rounded-full transition-all duration-500 ${PCT_COLOR(pct)}`} style={{width:`${pct}%`}}/>
        </div>
        <div className="flex gap-2 flex-wrap">
          <StatPill label="Total" value={total} color="border-slate-200 text-[rgb(var(--text))]"/>
          <StatPill label="Present" value={present} color="bg-emerald-50 border-emerald-200 text-emerald-700"/>
          <StatPill label="Absent" value={absent} color="bg-red-50 border-red-200 text-red-700"/>
          <StatPill label="Late" value={late} color="bg-amber-50 border-amber-200 text-amber-700"/>
        </div>
      </div>
    );
  }
  const avgPct=data.length?Math.round(data.reduce((s,r)=>s+(r.percentage??0),0)/data.length):0;
  const good=data.filter(r=>r.percentage>=75).length, risk=data.filter(r=>r.percentage<75).length;
  return (
    <div className="bg-[rgb(var(--surface))] rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-wide">Monthly Summary</p>
        <span className={`text-lg font-bold ${PCT_TEXT(avgPct)}`}>{avgPct}% Avg</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div className={`h-full rounded-full ${PCT_COLOR(avgPct)}`} style={{width:`${avgPct}%`}}/>
      </div>
      <div className="flex gap-2 flex-wrap">
        <StatPill label="Students" value={data.length} color="border-slate-200 text-[rgb(var(--text))]"/>
        <StatPill label="≥75%" value={good} color="bg-emerald-50 border-emerald-200 text-emerald-700"/>
        <StatPill label="<75%" value={risk} color="bg-red-50 border-red-200 text-red-700"/>
      </div>
    </div>
  );
}

function DailyRow({ record, onClick }) {
  const { firstName, lastName, rollNo, documents } = record.studentId ?? {};
  const fullName = firstName ? `${firstName} ${lastName ?? ""}`.trim() : "—";
  const st = record.status ?? "Present";
  return (
    <div onClick={onClick} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0
      hover:bg-[rgb(var(--bg))] cursor-pointer transition-colors px-1 rounded-lg -mx-1">
      <div className="flex items-center gap-3">
        <UserAvatar
          name={fullName}
          photoUrl={documents?.studentPhoto?.url}
          size="sm"
        />
        <div>
          <p className="text-sm font-semibold text-[rgb(var(--text))] leading-tight">{fullName}</p>
          <p className="text-xs text-[rgb(var(--text))]">Roll {rollNo ?? "—"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_STYLE[st]}`}>{st}</span>
        <FaChevronRight size={10} className="text-[rgb(var(--text))] opacity-40"/>
      </div>
    </div>
  );
}

function MonthlyRow({ record, onClick }) {
  const { name, rollNumber, present=0, absent=0, late=0, total=0, percentage=0, photo_url } = record;
  return (
    <div onClick={onClick} className="py-3 border-b border-slate-100 last:border-0
      hover:bg-[rgb(var(--bg))] cursor-pointer transition-colors px-1 rounded-lg -mx-1">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <UserAvatar name={name} photoUrl={photo_url} size="sm" />
          <div>
            <p className="text-sm font-semibold text-[rgb(var(--text))] leading-tight">{name ?? "—"}</p>
            <p className="text-xs text-[rgb(var(--text))]">Roll {rollNumber ?? "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-base font-bold ${PCT_TEXT(percentage)}`}>{percentage}%</span>
          <FaChevronRight size={10} className="text-[rgb(var(--text))] opacity-40"/>
        </div>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full ${PCT_COLOR(percentage)}`} style={{width:`${percentage}%`}}/>
      </div>
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md px-2 py-0.5">P {present}</span>
        <span className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-md px-2 py-0.5">A {absent}</span>
        {late>0&&<span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2 py-0.5">L {late}</span>}
        <span className="text-xs bg-[rgb(var(--bg))] text-[rgb(var(--text))] border border-slate-200 rounded-md px-2 py-0.5">Total {total}</span>
      </div>
    </div>
  );
}

function Sel({ label, value, onChange, disabled, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-wide pl-0.5">{label}</label>
      <select value={value} onChange={onChange} disabled={disabled}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
          text-[rgb(var(--text))] bg-[rgb(var(--surface))]
          focus:outline-none focus:ring-2 focus:ring-[rgb(var(--border-strong))] focus:border-transparent
          disabled:opacity-40 disabled:cursor-not-allowed">
        {children}
      </select>
    </div>
  );
}

/* ── Subject-wise (original principal logic, preserved) ── */
function SubjectWisePrincipal() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [selClass, setSelClass] = useState("");
  const [selSection, setSelSection] = useState("");
  const [selSubject, setSelSubject] = useState("");
  const [selDate, setSelDate] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [search, setSearch] = useState("");
  const [reportData, setReportData] = useState([]);
  const [reportType, setReportType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const currentClass = classes.find(c => c._id === selClass);
  const availableSections = currentClass?.details ?? [];

  useEffect(() => {
    (async () => {
      try {
        setMetaLoading(true);
        const res = await axios.get(`${API}/attendance/meta`, { withCredentials: true });
        setClasses(res.data.classes ?? []);
        setSubjects(res.data.subjects ?? []);
      } catch { toast.error("Failed to load school data"); }
      finally { setMetaLoading(false); }
    })();
  }, []);

  const validate = () => {
    if (!selClass)   { toast.warning("Please select a class");   return false; }
    if (!selSection) { toast.warning("Please select a section"); return false; }
    if (!selSubject) { toast.warning("Please select a subject"); return false; }
    if (!selDate && (!month || !year)) { toast.warning("Select a date OR month + year"); return false; }
    return true;
  };

  const fetchReport = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API}/attendance/report`, {
        params: { classId:selClass, sectionId:selSection, subjectId:selSubject, date:selDate, month, year },
        withCredentials: true,
      });
      setReportData(res.data.data ?? []);
      setReportType(res.data.type);
      setHasFetched(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load report");
      setReportData([]); setHasFetched(true);
    } finally { setLoading(false); }
  };

  const goToStudent = (record) => {
    const studentId = record.studentId?._id ?? record._id;
    navigate(`/attendance/student/${studentId}`, {
      state: { from:"subject", month, year, selDate, subjectId:selSubject },
    });
  };

  const clearAll = () => {
    setSelClass(""); setSelSection(""); setSelSubject("");
    setSelDate(""); setMonth(""); setYear(""); setSearch("");
    setReportData([]); setReportType(null); setHasFetched(false);
  };

  const filteredData = search.trim()
    ? reportData.filter(r => {
        const name = r.name ?? `${r.studentId?.firstName??""} ${r.studentId?.lastName??""}`;
        const roll = String(r.rollNumber ?? r.studentId?.rollNo ?? "");
        const q = search.toLowerCase();
        return name.toLowerCase().includes(q) || roll.includes(q);
      })
    : reportData;

  const modeLabel = reportType==="daily"
    ? new Date(selDate).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})
    : reportType==="monthly" ? `${MONTHS[Number(month)-1]} ${year}` : null;

  const selectedClassName = currentClass?.name ?? "";
  const selectedSectionName = availableSections.find(d=>d.sectionId?._id===selSection)?.sectionId?.name ?? "";
  const selectedSubjectName = subjects.find(s=>s._id===selSubject)?.name ?? "";

  return (
    <div className="max-w-2xl mx-auto px-3 py-5 sm:px-6 sm:py-8">
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-full">Principal View</span>
        </div>
        <h1 className="text-2xl font-bold text-[rgb(var(--text))]">Attendance Report</h1>
        <p className="text-sm text-[rgb(var(--text))] mt-0.5">School-wide attendance by class, section &amp; subject</p>
      </div>

      <div className="bg-[rgb(var(--surface))] rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 mb-5">
        <p className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-wider mb-3">Filters</p>
        {metaLoading ? (
          <div className="flex items-center justify-center py-8 gap-2">
            <svg className="animate-spin w-4 h-4 text-[rgb(var(--primary))]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span className="text-sm text-[rgb(var(--text))]">Loading school data…</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Sel label="Class" value={selClass} onChange={e=>{setSelClass(e.target.value);setSelSection("");setReportData([]);setHasFetched(false);}}>
              <option value="">Select class</option>
              {classes.map(c=><option key={c._id} value={c._id} className="bg-[rgb(var(--surface))]">{c.name}</option>)}
            </Sel>
            <Sel label="Section" value={selSection} onChange={e=>setSelSection(e.target.value)} disabled={!selClass}>
              <option value="">Select section</option>
              {availableSections.map(d=><option key={d._id} value={d.sectionId?._id} className="bg-[rgb(var(--surface))]">{d.sectionId?.name}</option>)}
            </Sel>
            <div className="col-span-2">
              <Sel label="Subject" value={selSubject} onChange={e=>setSelSubject(e.target.value)}>
                <option value="">Select subject</option>
                {subjects.map(s=><option key={s._id} value={s._id} className="bg-[rgb(var(--surface))]">{s.name}</option>)}
              </Sel>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-wide pl-0.5 block mb-1">Search Student</label>
              <div className="relative">
                <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text))] opacity-40"/>
                <input type="text" placeholder="Name or roll number…" value={search} onChange={e=>setSearch(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-8 pr-8 py-2.5 text-sm
                    text-[rgb(var(--text))] bg-[rgb(var(--surface))]
                    focus:outline-none focus:ring-2 focus:ring-[rgb(var(--border-strong))]"/>
                {search&&<button onClick={()=>setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80"><FaTimes size={11}/></button>}
              </div>
            </div>
            <div className="col-span-2 border-t border-slate-100"/>
            <p className="col-span-2 text-xs text-[rgb(var(--text))]">Pick <span className="font-semibold">a date</span> for daily or <span className="font-semibold">month + year</span> for monthly</p>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-wide pl-0.5">Date</label>
              <input type="date" value={selDate} max={TODAY} onChange={e=>{setSelDate(e.target.value);setMonth("");setYear("");}}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--border-strong))]"/>
            </div>
            <Sel label="Month" value={month} onChange={e=>{setMonth(e.target.value);setSelDate("");}}>
              <option value="">Month</option>
              {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
            </Sel>
            <Sel label="Year" value={year} onChange={e=>{setYear(e.target.value);setSelDate("");}}>
              <option value="">Year</option>
              {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
            </Sel>
            <div className="col-span-2 flex gap-2 mt-1">
              <button onClick={fetchReport} disabled={loading}
                className="flex-1 bg-[rgb(var(--primary))] text-white disabled:opacity-60 text-sm font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2">
                {loading?<><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Loading…</>:"View Report"}
              </button>
              <button onClick={clearAll} className="border border-slate-200 text-sm font-medium py-2.5 px-4 rounded-xl bg-[rgb(var(--surface))] text-[rgb(var(--text))]">Clear</button>
            </div>
          </div>
        )}
      </div>

      {hasFetched && (
        <>
          {filteredData.length > 0 && <SummaryBar data={filteredData} type={reportType}/>}
          <div className="bg-[rgb(var(--surface))] rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-start justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <p className="text-sm font-semibold text-[rgb(var(--text))]">{reportType==="daily"?"Daily Report":"Monthly Report"}</p>
                <p className="text-xs text-[rgb(var(--text))] mt-0.5">{selectedClassName}{selectedSectionName&&` › ${selectedSectionName}`}{selectedSubjectName&&` › ${selectedSubjectName}`}</p>
                {modeLabel&&<p className="text-xs font-medium mt-0.5">{modeLabel}</p>}
                {search&&<p className="text-xs text-[rgb(var(--primary))] mt-0.5">Filtered: "{search}"</p>}
              </div>
              <span className="text-xs bg-[rgb(var(--bg))] border border-slate-200 text-[rgb(var(--text))] font-medium px-2.5 py-1 rounded-full shrink-0 ml-2">
                {filteredData.length} student{filteredData.length!==1?"s":""}
              </span>
            </div>
            {filteredData.length>0&&<p className="text-[10px] text-[rgb(var(--text))] px-4 pt-2 pb-0 opacity-60">Tap a student to view full attendance detail</p>}
            <div className="px-4">
              {filteredData.length===0?(
                <div className="py-12 text-center"><p className="text-3xl mb-2">📋</p><p className="text-sm text-[rgb(var(--text))]">No attendance records found</p><p className="text-xs text-[rgb(var(--text))] mt-1">Try a different filter or date</p></div>
              ):reportType==="daily"?(
                filteredData.map((r,i)=><DailyRow key={r._id??i} record={r} onClick={()=>goToStudent(r)}/>)
              ):(
                filteredData.map((r,i)=><MonthlyRow key={r._id??i} record={r} onClick={()=>goToStudent(r)}/>)
              )}
            </div>
          </div>
        </>
      )}
      {!hasFetched&&!metaLoading&&(
        <div className="text-center py-16"><p className="text-4xl mb-3">🏫</p><p className="text-sm text-[rgb(var(--text))]">Select class, section &amp; subject then tap <strong>View Report</strong></p></div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ROOT EXPORT — tab wrapper
══════════════════════════════════════════════════════════════ */
export default function AttendanceReportPrincipal() {
  const navigate  = useNavigate();
  const isMobile  = window.innerWidth <= 768;

  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem(TAB_KEY) ?? "subject"
  );

  const handleTabChange = (id) => {
    setActiveTab(id);
    localStorage.setItem(TAB_KEY, id);
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      {isMobile && (
        <div className="pt-4 px-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
              bg-[rgb(var(--surface))] shadow-sm border border-slate-100
              text-sm font-bold text-[rgb(var(--text))] active:scale-95 transition-transform mb-1">
            <FaArrowLeft size={14}/> Back
          </button>
        </div>
      )}

      <TabBar active={activeTab} onChange={handleTabChange}/>

      {activeTab === "subject" && <SubjectWisePrincipal/>}

      {activeTab === "class" && (
        <Suspense fallback={<TabFallback/>}>
          <ClassAttendanceReportPrincipal/>
        </Suspense>
      )}
    </div>
  );
}