import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const TODAY = new Date().toISOString().split("T")[0];

/* ─── Status config ─────────────────────────────────────────── */
const STATUS = {
  Present: {
    label: "P",
    full: "Present",
    active: "bg-emerald-500 border-emerald-500 text-white shadow-sm",
    inactive: "bg-[rgb(var(--surface))] border-slate-200 text-[rgb(var(--text))] hover:border-emerald-300",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    ring: "ring-emerald-100",
  },
  Absent: {
    label: "A",
    full: "Absent",
    active: "bg-red-500 border-red-500 text-white shadow-sm",
    inactive: "bg-[rgb(var(--surface))] border-slate-200 text-[rgb(var(--text))] hover:border-red-300",
    badge: "bg-red-100 text-red-600",
    dot: "bg-red-500",
    ring: "ring-red-100",
  },
  Late: {
    label: "L",
    full: "Late",
    active: "bg-amber-500 border-amber-500 text-white shadow-sm",
    inactive: "bg-[rgb(var(--surface))] border-slate-200 text-[rgb(var(--text))] hover:border-amber-300",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    ring: "ring-amber-100",
  },
};

/* ─── Reusable pieces ───────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = STATUS[status];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.full}
    </span>
  );
}

function StatusSelector({ studentId, current, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      {Object.entries(STATUS).map(([key, cfg]) => (
        <button
          key={key}
          onClick={() => onChange(studentId, key)}
          className={`h-8 w-9 sm:w-auto sm:px-3 rounded-lg border text-xs font-bold
            transition-all duration-150 cursor-pointer select-none
            ${current === key ? cfg.active : cfg.inactive}`}
        >
          {cfg.label}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value, valueClass }) {
  return (
    <div className="bg-[rgb(var(--surface))] rounded-xl border border-slate-200 flex flex-col items-center justify-center py-3 px-2 sm:px-4">
      <span className={`text-xl sm:text-2xl font-bold tabular-nums leading-none ${valueClass}`}>
        {value}
      </span>
      <span className="text-[10px] sm:text-[11px] text-[rgb(var(--text))] font-semibold mt-1 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

function SpinIcon({ className }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

/* ─── Main Component ────────────────────────────────────────── */
export default function ClassAttendanceMarking() {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  /* ── Meta state ── */
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [assignedClass, setAssignedClass]   = useState(null);   // { _id, name }
  const [assignedSection, setAssignedSection] = useState(null); // { _id, name }
  const [metaLoading, setMetaLoading]        = useState(true);

  /* ── Date filter ── */
  const [selDate, setSelDate] = useState(TODAY);

  /* ── Students + attendance state ── */
  const [students, setStudents]       = useState([]);
  const [record, setRecord]           = useState({});       // { studentId: status }
  const [existingIds, setExistingIds] = useState({});       // { studentId: docId }
  const [isEdit, setIsEdit]           = useState(false);

  /* ── Today snapshot (always today, separate from selDate) ── */
  const [snapshot, setSnapshot]         = useState([]);    // enriched students with todayStatus
  const [snapshotMarked, setSnapshotMarked] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(true);

  /* ── UI flags ── */
  const [checkingExist, setCheckingExist] = useState(false);
  const [saving, setSaving]               = useState(false);

  const isToday = selDate === TODAY;

  /* ── 1. Fetch meta on mount ── */
  useEffect(() => {
    (async () => {
      try {
        setMetaLoading(true);
        const res = await axios.get(`${API}/class-attendance/meta`, { withCredentials: true });
        if (!res.data.isClassTeacher || !res.data.classes?.length) {
          setIsClassTeacher(false);
          return;
        }
        setIsClassTeacher(true);
        const cls     = res.data.classes[0];
        const detail  = cls.details[0];
        setAssignedClass({ _id: cls._id, name: cls.name });
        setAssignedSection({
          _id:  detail.sectionId?._id  ?? detail.sectionId,
          name: detail.sectionId?.name ?? "Section",
        });
      } catch {
        toast.error("Failed to load class info");
      } finally {
        setMetaLoading(false);
      }
    })();
  }, []);

  /* ── 2. Fetch today snapshot whenever meta loads ── */
  useEffect(() => {
    if (!isClassTeacher) return;
    fetchTodaySnapshot();
  }, [isClassTeacher]);

  const fetchTodaySnapshot = async () => {
    try {
      setSnapshotLoading(true);
      const res = await axios.get(`${API}/class-attendance/today-snapshot`, { withCredentials: true });
      setSnapshot(res.data.students ?? []);
      setSnapshotMarked(res.data.isMarked ?? false);
    } catch {
      toast.error("Failed to load today's snapshot");
    } finally {
      setSnapshotLoading(false);
    }
  };

  /* ── 3. When assignedClass/Section ready, fetch students + check existing for selDate ── */
  useEffect(() => {
    if (!assignedClass || !assignedSection) return;
    fetchStudentsAndCheck();
  }, [assignedClass, assignedSection, selDate]);

  const fetchStudentsAndCheck = async () => {
    try {
      setCheckingExist(true);

      // Fetch students (reuse existing endpoint)
      const studRes = await axios.get(`${API}/attendance/students/filter`, {
        params: { classId: assignedClass._id, sectionId: assignedSection._id },
        withCredentials: true,
      });
      const list = studRes.data.students ?? [];
      setStudents(list);

      // Default all to Present
      const init = {};
      list.forEach((s) => { init[s._id] = "Present"; });

      // Check existing for selected date
      try {
        const existRes = await axios.get(`${API}/class-attendance/existing`, {
          params: { classId: assignedClass._id, sectionId: assignedSection._id, date: selDate },
          withCredentials: true,
        });
        const existing = existRes.data.records ?? [];
        if (existing.length) {
          const newRecord = { ...init };
          const newIds    = {};
          existing.forEach((r) => {
            newRecord[r.studentId] = r.status;
            newIds[r.studentId]    = r._id;
          });
          setRecord(newRecord);
          setExistingIds(newIds);
          setIsEdit(true);
          toast.info("Attendance already marked — edit mode.", { autoClose: 2500 });
        } else {
          setRecord(init);
          setExistingIds({});
          setIsEdit(false);
        }
      } catch {
        // 404 = not marked yet
        setRecord(init);
        setExistingIds({});
        setIsEdit(false);
      }
    } catch {
      toast.error("Failed to load students");
    } finally {
      setCheckingExist(false);
    }
  };

  /* ── Mark single student ── */
  const markStudent = useCallback((id, status) => {
    setRecord((prev) => ({ ...prev, [id]: status }));
  }, []);

  /* ── Bulk mark all ── */
  const markAll = (status) => {
    const next = {};
    students.forEach((s) => { next[s._id] = status; });
    setRecord(next);
  };

  /* ── Derived counts ── */
  const counts = Object.values(record).reduce(
    (acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; },
    { Present: 0, Absent: 0, Late: 0 }
  );

  /* ── Save / Update ── */
  const handleSubmit = async () => {
    if (!students.length) { toast.error("No students loaded."); return; }
    setSaving(true);
    try {
      const records = students.map((s) => ({
        studentId: s._id,
        status: record[s._id] ?? "Present",
        ...(isEdit && existingIds[s._id] ? { attendanceId: existingIds[s._id] } : {}),
      }));

      const payload = {
        classId:   assignedClass._id,
        sectionId: assignedSection._id,
        date:      selDate,
        records,
      };

      if (isEdit) {
        await axios.put(`${API}/class-attendance/update`, payload, { withCredentials: true });
        toast.success("Attendance updated!");
      } else {
        const res = await axios.post(`${API}/class-attendance/save`, payload, { withCredentials: true });
        const savedIds = {};
        (res.data.savedRecords ?? []).forEach((r) => { savedIds[r.studentId] = r._id; });
        setExistingIds(savedIds);
        setIsEdit(true);
        toast.success("Attendance saved!");
      }

      // Refresh snapshot if we just marked today
      if (isToday) fetchTodaySnapshot();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  /* ══════════════ RENDER ══════════════ */

  /* Not a class teacher */
  if (!metaLoading && !isClassTeacher) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🏫</div>
        <h2 className="text-lg font-bold text-[rgb(var(--text))] mb-2">Not assigned as Class Teacher</h2>
        <p className="text-sm text-[rgb(var(--text))] max-w-xs">
          You are not the class teacher for any section. Contact your administrator if this is incorrect.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">

      {/* ── Sticky Header ── */}
      <header className="border-b bg-[rgb(var(--surface))] border-slate-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button onClick={() => navigate(-1)} className="text-[rgb(var(--text))] p-1">
                <FaArrowLeft size={15} />
              </button>
            )}
            <div>
              <h1 className="text-base font-bold text-[rgb(var(--text))] leading-tight">Class Attendance</h1>
              {assignedClass && (
                <p className="text-[11px] text-[rgb(var(--text))] font-medium hidden sm:block">
                  {assignedClass.name} · {assignedSection?.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode pill */}
            {!checkingExist && students.length > 0 && (
              <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border
                ${isEdit
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isEdit ? "bg-blue-500" : "bg-emerald-500"}`} />
                {isEdit ? "Edit Mode" : "New Entry"}
              </span>
            )}

            {students.length > 0 && (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-1.5 bg-[rgb(var(--primary))] text-white
                  text-xs sm:text-sm font-semibold px-3 py-2 sm:px-4 rounded-lg
                  transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <SpinIcon className="w-3.5 h-3.5" /> : <CheckIcon className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isEdit ? "Update" : "Save"}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* ── Meta loading skeleton ── */}
        {metaLoading && (
          <div className="bg-[rgb(var(--surface))] rounded-xl border border-slate-200 p-5 animate-pulse">
            <div className="h-4 w-48 bg-slate-200 rounded mb-3" />
            <div className="h-10 w-full bg-slate-200 rounded" />
          </div>
        )}

        {!metaLoading && isClassTeacher && (
          <>
            {/* ── Filter Panel ── */}
            <div className="bg-[rgb(var(--surface))] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
              <p className="text-[10px] font-bold text-[rgb(var(--text))] uppercase tracking-widest mb-3">
                Attendance Filter
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                {/* Class — read only */}
                <div>
                  <label className="block text-[10px] font-bold text-[rgb(var(--text))] uppercase tracking-widest mb-1.5">
                    Class
                  </label>
                  <div className="w-full rounded-lg border border-slate-200 bg-[rgb(var(--bg))] px-3 py-2.5 text-sm font-medium text-[rgb(var(--text))]">
                    {assignedClass?.name ?? "—"}
                  </div>
                </div>

                {/* Section — read only */}
                <div>
                  <label className="block text-[10px] font-bold text-[rgb(var(--text))] uppercase tracking-widest mb-1.5">
                    Section
                  </label>
                  <div className="w-full rounded-lg border border-slate-200 bg-[rgb(var(--bg))] px-3 py-2.5 text-sm font-medium text-[rgb(var(--text))]">
                    {assignedSection?.name ?? "—"}
                  </div>
                </div>

                {/* Date picker */}
                <div>
                  <label className="block text-[10px] font-bold text-[rgb(var(--text))] uppercase tracking-widest mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))]
                      px-3 py-2.5 text-sm outline-none transition
                      focus:border-[rgb(var(--border-strong))] focus:ring-2 focus:ring-[rgb(var(--border-strong))]/20
                      cursor-pointer"
                    value={selDate}
                    max={TODAY}
                    onChange={(e) => setSelDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Checking pill */}
              {checkingExist && (
                <p className="mt-3 text-xs text-[rgb(var(--text))] flex items-center gap-1.5">
                  <SpinIcon className="w-3 h-3 text-blue-400" />
                  Checking existing attendance…
                </p>
              )}
            </div>

            {/* ── Summary strip ── */}
            {students.length > 0 && !checkingExist && (
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                <StatCard label="Total"   value={students.length}    valueClass="text-[rgb(var(--text))]" />
                <StatCard label="Present" value={counts.Present || 0} valueClass="text-emerald-600" />
                <StatCard label="Absent"  value={counts.Absent  || 0} valueClass="text-red-500" />
                <StatCard label="Late"    value={counts.Late    || 0} valueClass="text-amber-600" />
              </div>
            )}

            {/* ── Student Marking Card ── */}
            {students.length > 0 && !checkingExist && (
              <div className="bg-[rgb(var(--surface))] rounded-xl border border-slate-200 overflow-hidden shadow-sm">

                {/* Card top bar */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[rgb(var(--text))]">
                      {isToday ? "Mark Today's Attendance" : `Attendance for ${new Date(selDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`}
                    </span>
                    <span className="text-[11px] font-bold text-[rgb(var(--text))] px-2 py-0.5 rounded-full bg-[rgb(var(--bg))]">
                      {students.length}
                    </span>
                  </div>

                  {/* Bulk mark */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-[rgb(var(--text))] mr-0.5 hidden sm:inline">All:</span>
                    {Object.entries(STATUS).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => markAll(key)}
                        className={`px-2.5 py-1 rounded-md border text-[11px] font-bold transition-all
                          ${key === "Present" ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : key === "Absent"  ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                          : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                      >
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Desktop Table ── */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {["#", "Student", "Status", "Mark"].map((h) => (
                          <th key={h} className="text-left px-5 py-3 text-[10.5px] font-bold text-[rgb(var(--text))] uppercase tracking-widest">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, idx) => {
                        const status = record[student._id] ?? "Present";
                        return (
                          <tr key={student._id} className="border-b border-slate-100 last:border-0 transition-colors">
                            <td className="px-5 py-3.5">
                              <span className="text-[11px] font-mono font-semibold text-[rgb(var(--text))]">
                                {student.rollNo ?? String(idx + 1).padStart(2, "0")}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="font-semibold text-[rgb(var(--text))]">{student.firstName}</span>
                              {student.lastName && <span className="text-[rgb(var(--text))] ml-1">{student.lastName}</span>}
                            </td>
                            <td className="px-5 py-3.5"><StatusBadge status={status} /></td>
                            <td className="px-5 py-3.5">
                              <StatusSelector studentId={student._id} current={status} onChange={markStudent} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── Mobile List ── */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {students.map((student, idx) => {
                    const status = record[student._id] ?? "Present";
                    const cfg    = STATUS[status];
                    return (
                      <div key={student._id} className="flex items-center gap-3 px-4 py-3.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-mono font-semibold text-[rgb(var(--text))] px-1.5 py-0.5 rounded bg-[rgb(var(--bg))]">
                              {student.rollNo ?? String(idx + 1).padStart(2, "0")}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                              {cfg.full}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-[rgb(var(--text))] truncate">
                            {student.firstName} {student.lastName ?? ""}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {Object.entries(STATUS).map(([key, s]) => (
                            <button
                              key={key}
                              onClick={() => markStudent(student._id, key)}
                              className={`w-9 h-9 rounded-lg border text-xs font-bold transition-all duration-150
                                ${status === key ? s.active : s.inactive}`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Card Footer */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3
                  px-4 sm:px-5 py-4 border-t border-slate-100">
                  <p className="text-xs text-[rgb(var(--text))]">
                    <span className="font-semibold text-emerald-600">{counts.Present ?? 0}</span> present ·{" "}
                    <span className="font-semibold text-red-500">{counts.Absent ?? 0}</span> absent ·{" "}
                    <span className="font-semibold text-amber-600">{counts.Late ?? 0}</span> late
                    {isEdit && (
                      <span className="ml-2 font-semibold text-blue-600">· Editing existing record</span>
                    )}
                  </p>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="w-full sm:w-auto flex items-center justify-center gap-2
                      bg-[rgb(var(--primary))] text-white active:scale-95
                      disabled:opacity-50 disabled:cursor-not-allowed
                      text-sm font-semibold px-5 py-2.5 rounded-lg transition-all shadow-sm"
                  >
                    {saving
                      ? <><SpinIcon className="w-4 h-4" /> Saving…</>
                      : <><CheckIcon className="w-4 h-4" />{isEdit ? "Update Attendance" : "Save Attendance"}</>
                    }
                  </button>
                </div>
              </div>
            )}

            {/* ── No students empty state ── */}
            {!checkingExist && students.length === 0 && (
              <div className="bg-[rgb(var(--surface))] rounded-xl border border-slate-200 flex flex-col items-center
                justify-center py-16 px-6 text-center shadow-sm">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-sm font-semibold text-[rgb(var(--text))]">No students found</p>
                <p className="text-xs text-[rgb(var(--text))] mt-1">No students are assigned to your class section.</p>
              </div>
            )}

            {/* ── Today's Snapshot ── */}
            <div className="bg-[rgb(var(--surface))] rounded-xl border border-slate-200 overflow-hidden shadow-sm">

              {/* Snapshot header — collapsible toggle */}
              <button
                onClick={() => setSnapshotOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 sm:px-5 py-3
                  border-b border-slate-100 hover:bg-[rgb(var(--bg))] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[rgb(var(--text))]">Today's Class Snapshot</span>
                  {snapshotMarked
                    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Marked ✓</span>
                    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Not marked yet</span>
                  }
                </div>
                <span className="text-[rgb(var(--text))] shrink-0">
                  {snapshotOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                </span>
              </button>

              {snapshotOpen && (
                <>
                  {snapshotLoading && (
                    <div className="divide-y divide-slate-100">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                          <div className="w-8 h-3 bg-slate-200 rounded animate-pulse" />
                          <div className="flex-1 h-3 bg-slate-200 rounded animate-pulse" />
                          <div className="w-16 h-6 bg-slate-200 rounded-full animate-pulse" />
                        </div>
                      ))}
                    </div>
                  )}

                  {!snapshotLoading && snapshot.length === 0 && (
                    <div className="py-10 text-center">
                      <p className="text-sm text-[rgb(var(--text))]">No student data available</p>
                    </div>
                  )}

                  {!snapshotLoading && snapshot.length > 0 && (
                    <>
                      {/* Snapshot summary row */}
                      <div className="grid grid-cols-4 gap-0 border-b border-slate-100">
                        {[
                          { label: "Total",   val: snapshot.length,                                         cls: "text-[rgb(var(--text))]" },
                          { label: "Present", val: snapshot.filter(s => s.todayStatus === "Present").length, cls: "text-emerald-600" },
                          { label: "Absent",  val: snapshot.filter(s => s.todayStatus === "Absent").length,  cls: "text-red-500" },
                          { label: "Late",    val: snapshot.filter(s => s.todayStatus === "Late").length,    cls: "text-amber-600" },
                        ].map(({ label, val, cls }) => (
                          <div key={label} className="flex flex-col items-center py-3 border-r last:border-0 border-slate-100">
                            <span className={`text-lg font-bold leading-none ${cls}`}>{val}</span>
                            <span className="text-[10px] text-[rgb(var(--text))] mt-0.5 font-medium">{label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Student rows */}
                      <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                        {snapshot.map((student, idx) => {
                          const st  = student.todayStatus;
                          const cfg = st ? STATUS[st] : null;
                          return (
                            <div key={student._id} className="flex items-center justify-between px-4 sm:px-5 py-3">
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] font-mono font-semibold text-[rgb(var(--text))] w-6 shrink-0">
                                  {student.rollNo ?? String(idx + 1).padStart(2, "0")}
                                </span>
                                <p className="text-sm font-medium text-[rgb(var(--text))]">
                                  {student.firstName} {student.lastName ?? ""}
                                </p>
                              </div>
                              {cfg
                                ? (
                                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                                    {cfg.full}
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                                    —
                                  </span>
                                )
                              }
                            </div>
                          );
                        })}
                      </div>

                      {/* Edit today shortcut — only show if today is not already selected */}
                      {snapshotMarked && !isToday && (
                        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-[rgb(var(--bg))]">
                          <button
                            onClick={() => setSelDate(TODAY)}
                            className="text-xs font-semibold text-[rgb(var(--primary))] underline underline-offset-2"
                          >
                            Switch to today to edit attendance →
                          </button>
                        </div>
                      )}

                      {!snapshotMarked && (
                        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-amber-50">
                          <p className="text-xs text-amber-700 font-medium">
                            ⚠ Today's attendance has not been marked yet.
                            {!isToday && (
                              <button
                                onClick={() => setSelDate(TODAY)}
                                className="ml-1 font-bold underline underline-offset-2"
                              >
                                Mark now →
                              </button>
                            )}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}