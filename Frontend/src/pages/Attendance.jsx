import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

/* ─── Status config ─────────────────────────────────────────── */
const STATUS = {
  Present: {
    label: "P",
    full: "Present",
    btn: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    active: "border-emerald-500 bg-emerald-500 text-[rgb(var(--text))]shadow-sm",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  Absent: {
    label: "A",
    full: "Absent",
    btn: "border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
    active: "border-red-500 bg-red-500 text-[rgb(var(--text))]shadow-sm",
    badge: "bg-red-100 text-red-600",
    dot: "bg-red-500",
  },
  Late: {
    label: "L",
    full: "Late",
    btn: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    active: "border-amber-500 bg-amber-500 text-[rgb(var(--text))]shadow-sm",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
};

/* ─── Reusable pieces ───────────────────────────────────────── */

function StatusBadge({ status }) {
  const cfg = STATUS[status];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cfg.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.full}
    </span>
  );
}

/* Three separate P / A / L buttons */
function StatusSelector({ studentId, current, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      {Object.entries(STATUS).map(([key, cfg]) => {
        const isActive = current === key;
        return (
          <button
            key={key}
            onClick={() => onChange(studentId, key)}
            className={`
              h-8 w-9 sm:w-auto sm:px-3 rounded-lg border text-xs font-bold
              transition-all duration-150 cursor-pointer select-none
              ${isActive ? cfg.active : "bg-[rgb(var(--surface))] border-slate-200 text-[rgb(var(--text))] hover:border-slate-300 hover:text-slate-600"}
            `}
          >
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, valueClass }) {
  return (
    <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl border border-slate-200 flex flex-col items-center justify-center py-3 px-2 sm:px-4">
      <span
        className={`text-xl sm:text-2xl font-bold tabular-nums leading-none ${valueClass}  text-[rgb(var(--text))]`}
      >
        {value}
      </span>
      <span className="text-[10px] sm:text-[11px] text-[rgb(var(--text))] font-semibold mt-1 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label className="block text-[10px] sm:text-[11px] font-bold text-[rgb(var(--text))] uppercase tracking-widest mb-1.5">
      {children}
    </label>
  );
}

const selectCls =
  "w-full rounded-lg border border-slate-200  px-3 py-2.5 text-sm font-mediumtext-[rgb(var(--text))] " +
  "outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 " +
  "disabled:opacity-40 disabled:cursor-not-allowed appearance-none cursor-pointer";

function SelectWrap({ children }) {
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
        <svg
          className="w-3.5 h-3.5 text-[rgb(var(--text))]"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────── */
export default function Attendance() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [record, setRecord] = useState({}); // { studentId: 'Present'|'Absent'|'Late' }
  const [existingIds, setExistingIds] = useState({}); // { studentId: attendanceDoc._id }  → used for PUT

  const [selClass, setSelClass] = useState("");
  const [selSection, setSelSection] = useState("");
  const [selSubject, setSelSubject] = useState("");
  const [selDate, setSelDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [loadingStudents, setLoadingStudents] = useState(false);
  const [checkingExist, setCheckingExist] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false); // true = record already exists for this date

  const today = new Date().toISOString().split("T")[0];
  const currentClass = classes.find((c) => c._id === selClass);
  const availableSections = currentClass?.details ?? [];
  const filtersComplete = !!(selClass && selSection && selSubject && selDate);
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  /* Derived counts */
  const counts = Object.values(record).reduce(
    (acc, s) => {
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    { Present: 0, Absent: 0, Late: 0 },
  );

  /* ── 1. Fetch metadata on mount ─────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/attendance/meta`, {
          withCredentials: true,
        });
        setClasses(res.data.teacher.assignedClasses);
        setSubjects(res.data.teacher.subjects);
      } catch {
        toast.error("Failed to load metadata");
      }
    })();
  }, []);

  /* ── 2. Fetch students when class + section change ──────── */
  useEffect(() => {
    if (!selClass || !selSection) {
      setStudents([]);
      setRecord({});
      setExistingIds({});
      setIsEdit(false);
      return;
    }
    (async () => {
      setLoadingStudents(true);
      try {
        const res = await axios.get(`${API}/attendance/students/filter`, {
          params: { classId: selClass, sectionId: selSection },
          withCredentials: true,
        });
        const list = res.data.students ?? [];
        setStudents(list);
        // Default everyone to Present
        const init = {};
        list.forEach((s) => {
          init[s._id] = "Present";
        });
        setRecord(init);
        setExistingIds({});
        setIsEdit(false);
      } catch {
        toast.error("Failed to load students");
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    })();
  }, [selClass, selSection]);

  /* ── 3. Check if attendance already exists for selected date + subject ── */
  useEffect(() => {
    if (!selClass || !selSection || !selSubject || !selDate || !students.length)
      return;

    (async () => {
      setCheckingExist(true);
      try {
        // GET /attendance/existing?classId=&sectionId=&subjectId=&date=
        // Returns { records: [{ studentId, status, _id }] }
        const res = await axios.get(`${API}/attendance/existing`, {
          params: {
            classId: selClass,
            sectionId: selSection,
            subjectId: selSubject,
            date: selDate,
          },
          withCredentials: true,
        });

        const existing = res.data.records ?? [];

        if (existing.length) {
          const newRecord = {};
          const newIds = {};
          existing.forEach((r) => {
            newRecord[r.studentId] = r.status;
            newIds[r.studentId] = r._id; // attendance doc _id for PATCH/PUT
          });
          // Fill missing students (newly added) with Present
          students.forEach((s) => {
            if (!newRecord[s._id]) newRecord[s._id] = "Present";
          });
          setRecord(newRecord);
          setExistingIds(newIds);
          setIsEdit(true);
          toast.info("Existing attendance loaded — you are in edit mode.", {
            autoClose: 3000,
          });
        } else {
          // No record for this day — fresh entry
          const init = {};
          students.forEach((s) => {
            init[s._id] = "Present";
          });
          setRecord(init);
          setExistingIds({});
          setIsEdit(false);
        }
      } catch {
        // 404 = no existing record, treat as fresh
        const init = {};
        students.forEach((s) => {
          init[s._id] = "Present";
        });
        setRecord(init);
        setExistingIds({});
        setIsEdit(false);
      } finally {
        setCheckingExist(false);
      }
    })();
  }, [selDate, selSubject, selClass, selSection]); // re-check when date OR subject changes

  /* ── Mark single student ───────────────────────────────── */
  const markStudent = useCallback((id, status) => {
    setRecord((prev) => ({ ...prev, [id]: status }));
  }, []);

  /* ── Bulk mark all ─────────────────────────────────────── */
  const markAll = (status) => {
    const next = {};
    students.forEach((s) => {
      next[s._id] = status;
    });
    setRecord(next);
  };

  /* ── Save (POST) or Update (PUT) ───────────────────────── */
  const handleSubmit = async () => {
    if (!filtersComplete) {
      toast.error("Please fill Class, Section, Subject, and Date.");
      return;
    }
    if (!students.length) {
      toast.error("No students to save attendance for.");
      return;
    }
    setSaving(true);
    try {
      const records = students.map((s) => ({
        studentId: s._id,
        status: record[s._id] ?? "Present",
        // include the existing doc id only in edit mode and only if it exists
        ...(isEdit && existingIds[s._id]
          ? { attendanceId: existingIds[s._id] }
          : {}),
      }));

      const payload = {
        classId: selClass,
        sectionId: selSection,
        subjectId: selSubject,
        date: selDate,
        records,
      };

      if (isEdit) {
        // PUT /attendance/update  — updates existing docs
        await axios.put(`${API}/attendance/update`, payload, {
          withCredentials: true,
        });
        toast.success("Attendance updated successfully!");
      } else {
        // POST /attendance/save  — creates new docs
        const res = await axios.post(`${API}/attendance/save`, payload, {
          withCredentials: true,
        });
        toast.success("Attendance saved successfully!");
        // Store the returned _ids so subsequent saves go to PUT
        const savedIds = {};
        (res.data.savedRecords ?? []).forEach((r) => {
          savedIds[r.studentId] = r._id;
        });
        setExistingIds(savedIds);
        setIsEdit(true);
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ??
          "Something went wrong. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ═══════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen ">
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600"
          >
            <FaArrowLeft />
            Back
          </button>
        </div>
      )}

      {/* ── Sticky Header ───────────────────────────────── */}
      <header className=" border-b bg-[rgb(var(--surface))] border-slate-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-[rgb(var(--text))] leading-tight">
              Attendance
            </h1>
            <p className="text-[11px] text-[rgb(var(--text))] font-medium hidden sm:block">
              Mark &amp; manage attendance
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode pill */}
            {filtersComplete && !checkingExist && (
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border ${
                  isEdit
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isEdit ? "bg-blue-500" : "bg-emerald-500"}`}
                />
                {isEdit ? "Edit Mode" : "New Entry"}
              </span>
            )}

            {/* Header save button (visible on all screens) */}
            {students.length > 0 && (
              <button
                onClick={handleSubmit}
                disabled={saving || !filtersComplete}
                className="
                  flex items-center gap-1.5  bg-[rgb(var(--primary))] 
                  disabled:opacity-50 disabled:cursor-not-allowed
                  text-[rgb(var(--text))] text-xs sm:text-sm font-semibold
                  px-3 py-2 sm:px-4 rounded-lg transition-all active:scale-95
                "
              >
                {saving ? (
                  <SpinIcon className="w-3.5 h-3.5" />
                ) : (
                  <CheckIcon className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">
                  {isEdit ? "Update" : "Save"}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* ── Filter Panel ────────────────────────────────── */}
        <div className="bg-[rgb(var(--surface))] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <FieldLabel>Class</FieldLabel>
              <SelectWrap>
                <select
                  className={`${selectCls} bg-[rgb(var(--surface))] text-[rgb(var(--text))]`}
                  value={selClass}
                  onChange={(e) => {
                    setSelClass(e.target.value);
                    setSelSection("");
                  }}
                >
                  <option value="" className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">Select class</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id} className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">
                      {c.name}
                    </option>
                  ))}
                </select>
              </SelectWrap>
            </div>

            <div>
              <FieldLabel>Section</FieldLabel>
              <SelectWrap>
                <select
                  className={selectCls}
                  value={selSection}
                  onChange={(e) => setSelSection(e.target.value)}
                  disabled={!selClass}
                >
                  <option value="">Select section</option>
                  {availableSections.map((d) => (
                    <option key={d._id} value={d.sectionId?._id} className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">
                      {d.sectionId?.name ?? "Section"}
                    </option>
                  ))}
                </select>
              </SelectWrap>
            </div>

            <div>
              <FieldLabel>Subject</FieldLabel>
              <SelectWrap>
                <select
                  className={selectCls}
                  value={selSubject}
                  onChange={(e) => setSelSubject(e.target.value)}
                >
                  <option value="" className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">Select subject</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id} className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] hover:bg-[rgb(var(--primary))] ">
                      {s.name}
                    </option>
                  ))}
                </select>
              </SelectWrap>
            </div>

            <div>
              <FieldLabel>Date</FieldLabel>
              <input
                type="date"
                className={selectCls}
                value={selDate}
                max={today}
                onChange={(e) => setSelDate(e.target.value)}
              />
            </div>
          </div>

          {/* Checking existing pill */}
          {checkingExist && (
            <p className="mt-3 text-xs text-[rgb(var(--text))] flex items-center gap-1.5">
              <SpinIcon className="w-3 h-3 text-blue-400" />
              Checking existing attendance…
            </p>
          )}
        </div>

        {/* ── Summary strip ────────────────────────────────── */}
        {students.length > 0 && (
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            <StatCard
              label="Total"
              value={students.length}
              valueClass="text-[rgb(var(--text))]"
            />
            <StatCard
              label="Present"
              value={counts.Present || 0}
              valueClass="text-emerald-600"
            />
            <StatCard
              label="Absent"
              value={counts.Absent || 0}
              valueClass="text-red-500"
            />
            <StatCard
              label="Late"
              value={counts.Late || 0}
              valueClass="text-amber-600"
            />
          </div>
        )}

        {/* ── Student Card ─────────────────────────────────── */}
        <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Card top bar */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100 ">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[rgb(var(--text))]">Students</span>
              {students.length > 0 && (
                <span className="text-[11px] font-bold text-[rgb(var(--text))]  px-2 py-0.5 rounded-full">
                  {students.length}
                </span>
              )}
            </div>

            {/* Bulk buttons */}
            {students.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[rgb(var(--text))] mr-0.5 hidden sm:inline">
                  All:
                </span>
                {Object.entries(STATUS).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => markAll(key)}
                    className={`px-2.5 py-1 rounded-md border text-[11px] font-bold transition-all ${cfg.btn}`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Loading skeleton */}
          {loadingStudents && (
            <div className="divide-y divide-slate-100">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-4 sm:px-5 py-3.5"
                >
                  <div className="w-8 h-3 bg-[rgb(var(--surface))] rounded animate-pulse" />
                  <div className="flex-1 h-3 bg-[rgb(var(--surface))] rounded animate-pulse" />
                  <div className="w-28 h-8 bg-[rgb(var(--surface))] rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!loadingStudents && !students.length && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3">
                <svg
                  className="w-5 h-5 text-[rgb(var(--text))]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold ">
                No students loaded
              </p>
              <p className="text-xs text-[rgb(var(--text))] mt-1">
                Select a class and section above to begin
              </p>
            </div>
          )}

          {/* ── Desktop Table (sm+) ─────────────────────────── */}
          {!loadingStudents && students.length > 0 && (
            <>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className=" border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-[10.5px] font-bold text-[rgb(var(--text))] uppercase tracking-widest w-14">
                        #
                      </th>
                      <th className="text-left px-5 py-3 text-[10.5px] font-bold text-[rgb(var(--text))] uppercase tracking-widest">
                        Student
                      </th>
                      <th className="text-left px-5 py-3 text-[10.5px] font-bold text-[rgb(var(--text))] uppercase tracking-widest w-28">
                        Status
                      </th>
                      <th className="text-left px-5 py-3 text-[10.5px] font-bold text-[rgb(var(--text))] uppercase tracking-widest">
                        Mark
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, idx) => {
                      const status = record[student._id] ?? "Present";
                      return (
                        <tr
                          key={student._id}
                          className="border-b border-slate-100 last:border-0  transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <span className="text-[11px] font-mono font-semibold text-[rgb(var(--text))]">
                              {student.rollNo ??
                                String(idx + 1).padStart(2, "0")}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-[rgb(var(--text))]">
                              {student.firstName}
                            </span>
                            {student.lastName && (
                              <span className="text-[rgb(var(--text))] ml-1">
                                {student.lastName}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusBadge status={status} />
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusSelector
                              studentId={student._id}
                              current={status}
                              onChange={markStudent}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile List (< sm) ─────────────────────────── */}
              <div className="sm:hidden divide-y divide-slate-100">
                {students.map((student, idx) => {
                  const status = record[student._id] ?? "Present";
                  const cfg = STATUS[status];
                  return (
                    <div
                      key={student._id}
                      className="flex items-center gap-3 px-4 py-3.5"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-mono font-semibold text-[rgb(var(--text))]  px-1.5 py-0.5 rounded">
                            {student.rollNo ?? String(idx + 1).padStart(2, "0")}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}
                          >
                            {cfg.full}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[rgb(var(--text))] truncate">
                          {student.firstName} {student.lastName ?? ""}
                        </p>
                      </div>
                      {/* Separate P / A / L buttons */}
                      <div className="flex gap-1.5 shrink-0">
                        {Object.entries(STATUS).map(([key, s]) => (
                          <button
                            key={key}
                            onClick={() => markStudent(student._id, key)}
                            className={`
                              w-9 h-9 rounded-lg border text-xs font-bold transition-all duration-150
                              ${status === key ? s.active : "bg-[rgb(var(--surface))] border-slate-200 text-[rgb(var(--text))] hover:border-slate-300"}
                            `}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Footer */}
          {!loadingStudents && students.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 border-t border-slate-100 ">
              <p className="text-xs text-[rgb(var(--text))]">
                <span className="font-semibold text-[rgb(var(--text))]">
                  {counts.Present ?? 0}
                </span>{" "}
                present ·{" "}
                <span className="font-semibold text-[rgb(var(--text))]">
                  {counts.Absent ?? 0}
                </span>{" "}
                absent ·{" "}
                <span className="font-semibold text-[rgb(var(--text))]">
                  {counts.Late ?? 0}
                </span>{" "}
                late
                {isEdit && (
                  <span className="ml-2 font-semibold text-[rgb(var(--primary))]">
                    · Editing existing record
                  </span>
                )}
              </p>

              <button
                onClick={handleSubmit}
                disabled={saving || !filtersComplete}
                className="
                  w-full sm:w-auto flex items-center justify-center gap-2
                  bg-[rgb(var(--primary))]  active:scale-95
                  disabled:opacity-50 disabled:cursor-not-allowed
                  text-[rgb(var(--text))] text-sm font-semibold px-5 py-2.5 rounded-lg
                  transition-all shadow-sm 
                "
              >
                {saving ? (
                  <>
                    <SpinIcon className="w-4 h-4" /> Saving…
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    {isEdit ? "Update Attendance" : "Save Attendance"}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Tiny SVG helpers ──────────────────────────────────────── */
function CheckIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SpinIcon({ className }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
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
        d="M4 12a8 8 0 018-8v8H4z"
      />
    </svg>
  );
}
