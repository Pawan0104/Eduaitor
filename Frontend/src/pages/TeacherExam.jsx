// import React, { useEffect, useState } from "react";
// import axios from "axios";

// function TeacherExam() {
//   const API = import.meta.env.VITE_API_URL;
//   const [exams, setExams] = useState([]);
//   const [loading, setLoading] = useState(false);

//   const fetchTeacherExams = async () => {
//     setLoading(true);
//     try {
//       const res = await axios.get(`${API}/exam/teacher-exams`, {
//         withCredentials: true,
//       });
//       setExams(res.data);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchTeacherExams();
//   }, []);

//   const formatTime = (time) => {
//     if (!time) return "";
//     const [h, m] = time.split(":");
//     const hour = parseInt(h);
//     return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
//   };

//   return (
//     <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
//       {/* Header */}
//       <div className="max-w-6xl mx-auto mb-6">
//         <h1 className="text-2xl md:text-3xl font-black text-indigo-900">
//           All Exams
//         </h1>
//         <p className="text-sm text-[rgb(var(--text))]">
//           Exams assigned to Me
//         </p>
//       </div>

//       {/* Content */}
//       <div className="max-w-6xl mx-auto">
//         {loading ? (
//           <p className="text-center text-[rgb(var(--text))]">Loading...</p>
//         ) : exams.length === 0 ? (
//           <p className="text-center text-[rgb(var(--text))]">
//             No exams assigned
//           </p>
//         ) : (
//           <>
//             {/* Desktop Table */}
//             <div className="hidden md:block bg-white rounded-2xl shadow border overflow-hidden">
//               <table className="w-full text-left">
//                 <thead className="bg-slate-50 border-b">
//                   <tr className="text-xs uppercase text-[rgb(var(--text))]">
//                     <th className="p-4">Subject</th>
//                     <th className="p-4">Class</th>
//                     <th className="p-4">Date</th>
//                     <th className="p-4">Time</th>
//                     <th className="p-4">Term</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {exams.map((exam) => (
//                     <tr key={exam._id} className="border-b hover:bg-slate-50">
//                       <td className="p-4 font-bold text-[rgb(var(--text))]">
//                         {exam.subject?.name}
//                       </td>
//                       <td className="p-4">
//                         Class {exam.className?.name}
//                       </td>
//                       <td className="p-4">
//                         {new Date(exam.examDate).toLocaleDateString("en-GB")}
//                       </td>
//                       <td className="p-4 text-sm text-slate-600">
//                         {formatTime(exam.startTime)} - {formatTime(exam.endTime)}
//                       </td>
//                       <td className="p-4 text-indigo-600 font-semibold">
//                         {exam.termId?.name}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {/* Mobile Cards */}
//             <div className="md:hidden space-y-4">
//               {exams.map((exam) => (
//                 <div
//                   key={exam._id}
//                   className="bg-white p-4 rounded-2xl shadow border"
//                 >
//                   <h3 className="font-bold text-lg text-[rgb(var(--text))]">
//                     {exam.subject?.name}
//                   </h3>

//                   <p className="text-xs text-indigo-600 font-bold uppercase">
//                     Class {exam.className?.name}
//                   </p>

//                   <div className="mt-2 text-sm text-[rgb(var(--text))]">
//                     📅 {new Date(exam.examDate).toLocaleDateString("en-GB")}
//                   </div>

//                   <div className="text-sm text-[rgb(var(--text))]">
//                     ⏰ {formatTime(exam.startTime)} - {formatTime(exam.endTime)}
//                   </div>

//                   <div className="mt-2 text-xs text-indigo-500 font-bold">
//                     {exam.termId?.name}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

// export default TeacherExam;

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";

// ─── Constants ───────────────────────────────────────────────────────────────

const ATTENDANCE_OPTIONS = [
  {
    value: "Present",
    label: "Present",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    value: "Absent",
    label: "Absent",
    color: "text-rose-600 bg-rose-50 border-rose-200",
  },
  {
    value: "Leave",
    label: "Leave",
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  {
    value: "MedicalLeave",
    label: "Medical Leave",
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  {
    value: "Exempted",
    label: "Exempted",
    color: "text-[rgb(var(--text))] bg-slate-50 border-slate-200",
  },
];

const GRADE_COLORS = {
  "A+": "bg-emerald-100 text-emerald-700",
  A: "bg-green-100 text-green-700",
  "B+": "bg-teal-100 text-teal-700",
  B: "bg-sky-100 text-sky-700",
  C: "bg-yellow-100 text-yellow-700",
  D: "bg-orange-100 text-orange-700",
  F: "bg-rose-100 text-rose-700",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (time) => {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const getExamStatus = (exam) => {
  const examDate = new Date(exam.examDate);
  examDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (today < examDate)
    return {
      label: "Upcoming",
      color: "bg-slate-100 text-[rgb(var(--text))]",
      canEnter: false,
    };

  const deadline = new Date(exam.examDate);
  deadline.setDate(deadline.getDate() + 2);
  deadline.setHours(23, 59, 59, 999);

  if (new Date() <= deadline)
    return {
      label: "Enter Marks",
      color: "bg-indigo-100 text-indigo-700",
      canEnter: true,
    };

  return {
    label: "Locked",
    color: "bg-rose-100 text-rose-600",
    canEnter: false,
  };
};

const getAttendanceBadge = (status) =>
  ATTENDANCE_OPTIONS.find((o) => o.value === status) || ATTENDANCE_OPTIONS[0];

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, color = "bg-white" }) => (
  <div className={`bg-[rgb(var(--surface))] rounded-xl p-3 text-center border`}>
    <div className="text-xl font-black text-[rgb(var(--text))]">{value}</div>
    <div className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-wide">
      {label}
    </div>
    {sub && <div className="text-xs text-[rgb(var(--text))] mt-0.5">{sub}</div>}
  </div>
);

const Toast = ({ msg, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 transition-all
        ${type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}
    >
      {type === "success" ? "✅" : "❌"} {msg}
    </div>
  );
};

// ─── View: Exam List ──────────────────────────────────────────────────────────

const ExamList = ({ exams, loading, onSelect, onViewResult }) => (
  <div className="max-w-3xl mx-auto">
    <div className="mb-6">
      <h1 className="text-2xl font-black text-[rgb(var(--text))] ">My Exams</h1>
      <p className="text-sm text-[rgb(var(--text))] mt-0.5">
        Tap an exam to enter marks
      </p>
    </div>

    {loading ? (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24  rounded-2xl animate-pulse"
          />
        ))}
      </div>
    ) : exams.length === 0 ? (
      <div className="text-center py-16 text-[rgb(var(--text))]">
        <div className="text-4xl mb-2">📋</div>
        <p className="font-semibold">No exams assigned yet</p>
      </div>
    ) : (
      <div className="flex flex-col gap-3">
        {exams.map((exam) => {
          const status = getExamStatus(exam);
          return (
            <div
              key={exam._id}
              className="bg-[rgb(var(--surface))] rounded-2xl border shadow-sm overflow-hidden"
            >
              {/* Top bar */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div>
                  <h3 className="font-bold text-[rgb(var(--text))] text-base leading-tight">
                    {exam.subject?.name}
                  </h3>
                  <p className="text-xs text-[rgb(var(--text))] mt-0.5">
                    Class {exam.className?.name}
                    {exam.sectionId?.name
                      ? ` – Sec ${exam.sectionId.name}`
                      : ""}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full text-[rgb(var(--text))] bg-[rgb(var(--sidebar-text))]`}
                >
                  {status.label}
                </span>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-4 px-4 pb-3 text-xs text-[rgb(var(--text))]">
                <span>📅 {formatDate(exam.examDate)}</span>
                <span>
                  ⏰ {formatTime(exam.startTime)} – {formatTime(exam.endTime)}
                </span>
                <span>📝 {exam.totalMarks} marks</span>
              </div>

              <div className="text-xs text-[rgb(var(--text))] px-4 pb-3">
                {exam.termId?.name}
              </div>

              {/* Actions */}
              <div className="border-t flex">
                {status.canEnter && (
                  <button
                    onClick={() => onSelect(exam)}
                    className="flex-1 py-3 text-sm font-bold text-[rgb(var(--primary))] bg-[rgb(var(--surface))] transition-colors"
                  >
                    ✏️ Enter / Edit Marks
                  </button>
                )}
                <button
                  onClick={() => onViewResult(exam)}
                  className={`flex-1 py-3 text-sm font-bold text-[rgb(var(--text))]  bg-[rgb(var(--primary))] transition-colors ${status.canEnter ? "border-l" : ""}`}
                >
                  📊 View Results
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

// ─── View: Marks Entry ────────────────────────────────────────────────────────

const MarksEntry = ({ examData, onBack, onSaved }) => {
  const API = import.meta.env.VITE_API_URL;
  const { exam, students, canEdit, editDeadline } = examData;

  const initRow = (s) => ({
    studentId: s._id,
    attendanceStatus: s.result?.attendanceStatus || "Present",
    marksObtained:
      s.result?.marksObtained !== null && s.result?.marksObtained !== undefined
        ? String(s.result.marksObtained)
        : "",
    remarks: s.result?.remarks || "",
  });

  const [rows, setRows] = useState(() =>
    students.map((s) => ({ ...initRow(s), _student: s })),
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("All");

  const updateRow = (idx, field, value) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const updated = { ...r, [field]: value };
        // Clear marks if not present
        if (field === "attendanceStatus" && value !== "Present") {
          updated.marksObtained = "";
        }
        return updated;
      }),
    );
  };

  const markAll = (status) =>
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        attendanceStatus: status,
        marksObtained: status !== "Present" ? "" : r.marksObtained,
      })),
    );

  const handleSave = async () => {
    // Validate marks
    for (const row of rows) {
      if (row.attendanceStatus === "Present") {
        const m = parseFloat(row.marksObtained);
        if (row.marksObtained === "" || isNaN(m)) {
          setToast({
            msg: `Enter marks for ${row._student.firstName}`,
            type: "error",
          });
          return;
        }
        if (m < 0 || m > exam.totalMarks) {
          setToast({
            msg: `Marks for ${row._student.firstName} must be 0–${exam.totalMarks}`,
            type: "error",
          });
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = rows.map((r) => ({
        studentId: r.studentId,
        attendanceStatus: r.attendanceStatus,
        marksObtained:
          r.attendanceStatus === "Present" ? parseFloat(r.marksObtained) : null,
        remarks: r.remarks,
      }));

      await axios.post(
        `${API}/exam/${exam._id}/submit`,
        { results: payload },
        {
          withCredentials: true,
        },
      );

      setToast({ msg: "Marks saved successfully!", type: "success" });
      setTimeout(() => onSaved(), 1500);
    } catch (err) {
      setToast({
        msg: err.response?.data?.message || "Failed to save marks",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const filtered =
    filter === "All" ? rows : rows.filter((r) => r.attendanceStatus === filter);
  const presentCount = rows.filter(
    (r) => r.attendanceStatus === "Present",
  ).length;

  return (
    <div className="max-w-3xl mx-auto">
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-[rgb(var(--surface))] border shadow-sm flex items-center justify-center text-[rgb(var(--text))] "
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-black text-[rgb(var(--text))] leading-tight">
            {exam.subject?.name}
          </h1>
          <p className="text-xs text-[rgb(var(--text))]">
            Class {exam.className?.name} · {formatDate(exam.examDate)} ·{" "}
            {exam.totalMarks} marks
          </p>
        </div>
      </div>

      {/* Edit window notice */}
      {canEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 text-xs text-amber-700 font-medium flex items-center gap-2">
          ⏳ Edit window open until{" "}
          <span className="font-bold">
            {new Date(editDeadline).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}

      {!canEdit && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 mb-4 text-xs text-rose-600 font-semibold">
          🔒 Marks are locked. Edit window has closed.
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <StatCard label="Total" value={rows.length} />
        <StatCard label="Present" value={presentCount} color="bg-emerald-50" />
        <StatCard
          label="Absent"
          value={rows.filter((r) => r.attendanceStatus === "Absent").length}
          color="bg-rose-50"
        />
        <StatCard
          label="Leave"
          value={
            rows.filter((r) =>
              ["Leave", "MedicalLeave"].includes(r.attendanceStatus),
            ).length
          }
          color="bg-amber-50"
        />
      </div>

      {/* Quick actions */}
      {canEdit && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <span className="text-xs text-[rgb(var(--text))] self-center shrink-0">
            Mark all:
          </span>
          {["Present", "Absent", "Leave"].map((s) => (
            <button
              key={s}
              onClick={() => markAll(s)}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {["All", "Present", "Absent", "Leave", "MedicalLeave", "Exempted"].map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors
              ${
                filter === f
                  ? "bg-indigo-600 text-[rgb(var(--text))]"
                  : "bg-[rgb(var(--surface))] border text-[rgb(var(--text))] "
              }`}
            >
              {f === "All" ? `All (${rows.length})` : f}
            </button>
          ),
        )}
      </div>

      {/* Student rows */}
      <div className="flex flex-col gap-2 mb-6">
        {filtered.map((row, idx) => {
          const realIdx = rows.findIndex((r) => r.studentId === row.studentId);
          const student = row._student;
          const badge = getAttendanceBadge(row.attendanceStatus);
          const hasResult = !!student.result;
          const m = parseFloat(row.marksObtained);
          const perc =
            row.attendanceStatus === "Present" && !isNaN(m)
              ? ((m / exam.totalMarks) * 100).toFixed(1)
              : null;

          return (
            <div
              key={row.studentId}
              className="bg-[rgb(var(--surface))] rounded-2xl border shadow-sm overflow-hidden"
            >
              {/* Student info */}
              <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                <div className="w-9 h-9 rounded-xl bg-[rgb(var(--bg))] flex items-center justify-center text-sm font-black text-[rgb(var(--primary))] shrink-0">
                  {student.rollNo || idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[rgb(var(--text))] text-sm truncate">
                    {student.firstName} {student.lastName}
                  </div>
                  <div className="text-xs text-[rgb(var(--text))]">
                    ID: {student.studentId}
                    {hasResult && (
                      <span className="ml-2 text-emerald-500 font-semibold">
                        ● Saved
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendance selector */}
              <div className="px-4 pb-2">
                <div className="text-xs text-[rgb(var(--text))] mb-1.5 font-medium">
                  Attendance
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {ATTENDANCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      disabled={!canEdit}
                      onClick={() =>
                        updateRow(realIdx, "attendanceStatus", opt.value)
                      }
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all
                        ${
                          row.attendanceStatus === opt.value
                            ? opt.color + " ring-1 ring-offset-1"
                            : "bg-[rgb(var(--surface))] border-slate-200 text-[rgb(var(--text))]"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Marks input (only if Present) */}
              {row.attendanceStatus === "Present" && (
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-[rgb(var(--text))] mb-1 font-medium">
                        Marks Obtained{" "}
                        <span className="text-[rgb(var(--text))]">
                          / {exam.totalMarks}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={exam.totalMarks}
                        disabled={!canEdit}
                        value={row.marksObtained}
                        onChange={(e) =>
                          updateRow(realIdx, "marksObtained", e.target.value)
                        }
                        placeholder={`0 – ${exam.totalMarks}`}
                        className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-50 disabled:text-[rgb(var(--text))]"
                      />
                    </div>

                    {/* Live percentage preview */}
                    {perc !== null && (
                      <div className="shrink-0 text-center">
                        <div className="text-lg font-black text-[rgb(var(--text))]">
                          {perc}%
                        </div>
                        <div
                          className={`text-xs font-bold px-2 py-0.5 rounded-lg mt-0.5
                            ${m >= exam.passingMarks ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}
                        >
                          {m >= exam.passingMarks ? "Pass" : "Fail"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div className="px-4 pb-3">
                <input
                  type="text"
                  disabled={!canEdit}
                  value={row.remarks}
                  onChange={(e) =>
                    updateRow(realIdx, "remarks", e.target.value)
                  }
                  placeholder="Remarks (optional)"
                  className="w-full border border-dashed rounded-xl px-3 py-1.5 text-xs text-[rgb(var(--text))] focus:outline-none focus:ring-1 focus:ring-indigo-200 disabled:bg-transparent disabled:border-transparent"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Save button */}
      {canEdit && (
        <div className="sticky bottom-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full text-[rgb(var(--text))] bg-[rgb(var(--primary))] font-black py-4 rounded-2xl shadow-lg  active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-base"
          >
            {saving
              ? "Saving..."
              : `💾 Save All Marks (${rows.length} students)`}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── View: Results ────────────────────────────────────────────────────────────

const ResultsView = ({ exam, onBack }) => {
  const API = import.meta.env.VITE_API_URL;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/exam/${exam._id}`, {
          withCredentials: true,
        });
        setData(res.data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [exam._id]);

  if (loading)
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-[rgb(var(--surface))] border shadow-sm flex items-center justify-center text-[rgb(var(--text))]"
          >
            ←
          </button>
          <div className="h-6 w-40  rounded-lg animate-pulse" />
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16  rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );

  if (!data)
    return (
      <div className="max-w-3xl mx-auto text-center py-16 text-[rgb(var(--text))]">
        <p>No results found</p>
        <button
          onClick={onBack}
          className="mt-4 text-indigo-600 font-semibold text-sm"
        >
          ← Back
        </button>
      </div>
    );

  const { results, stats } = data;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl  border shadow-sm flex items-center justify-center text-[rgb(var(--text))]"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-black text-[rgb(var(--text))] leading-tight">
            Results – {exam.subject?.name}
          </h1>
          <p className="text-xs text-[rgb(var(--text))]">
            Class {exam.className?.name} · {formatDate(exam.examDate)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCard label="Total Students" value={stats.total} />
        <StatCard
          label="Pass %"
          value={`${stats.passPercentage}%`}
          color="bg-emerald-50"
        />
        <StatCard label="Passed" value={stats.passed} color="bg-emerald-50" />
        <StatCard label="Failed" value={stats.failed} color="bg-rose-50" />
        <StatCard label="Absent" value={stats.absent} color="bg-slate-50" />
        <StatCard
          label="Avg Marks"
          value={stats.averageMarks}
          sub={`/ ${exam.totalMarks}`}
        />
      </div>

      {/* Result rows */}
      <div className="flex flex-col gap-2">
        {results.length === 0 ? (
          <div className="text-center py-12 text-[rgb(var(--text))]">
            <div className="text-3xl mb-2">📭</div>
            <p>No marks entered yet</p>
          </div>
        ) : (
          results.map((r) => {
            const student = r.studentId;
            const badge = getAttendanceBadge(r.attendanceStatus);
            const gradeColor =
              GRADE_COLORS[r.grade] || "bg-[rgb(var(--surface))] text-[rgb(var(--text))]";
            return (
              <div
                key={r._id}
                className="bg-[rgb(var(--surface))] rounded-2xl border shadow-sm px-4 py-3 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-[rgb(var(--primary))] flex items-center justify-center text-xs font-black text-[rgb(var(--text))] shrink-0">
                  {student?.rollNo || "–"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[rgb(var(--text))] text-sm truncate">
                    {student?.firstName} {student?.lastName}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                    {r.attendanceStatus === "Present" &&
                      r.marksObtained !== null && (
                        <>
                          <span className="text-xs text-[rgb(var(--text))]">
                            {r.marksObtained}/{exam.totalMarks}
                          </span>
                          <span className="text-xs text-[rgb(var(--text))]">
                            {r.percentage}%
                          </span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md ${gradeColor}`}
                          >
                            {r.grade}
                          </span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md
                          ${r.isPassed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}
                          >
                            {r.isPassed ? "Pass" : "Fail"}
                          </span>
                        </>
                      )}
                  </div>
                  {r.remarks && (
                    <div className="text-xs text-[rgb(var(--text))] mt-1 italic">
                      "{r.remarks}"
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeacherExam() {
  const API = import.meta.env.VITE_API_URL;
  const [view, setView] = useState("list"); // 'list' | 'marks' | 'results'
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null); // for results view
  const [examData, setExamData] = useState(null); // for marks entry
  const [studentLoading, setStudentLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/exam/teacher-exams`, {
        withCredentials: true,
      });
      // Sort latest to oldest
      const sorted = [...res.data].sort(
        (a, b) => new Date(b.examDate) - new Date(a.examDate),
      );
      setExams(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [API]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleSelectExam = async (exam) => {
    setStudentLoading(true);
    try {
      const res = await axios.get(`${API}/exam/${exam._id}/students`, {
        withCredentials: true,
      });
      setExamData(res.data);
      setView("marks");
    } catch (err) {
      setToast({
        msg: err.response?.data?.message || "Failed to load students",
        type: "error",
      });
    } finally {
      setStudentLoading(false);
    }
  };

  const handleViewResult = (exam) => {
    setSelectedExam(exam);
    setView("results");
  };

  const handleBack = () => {
    setView("list");
    setExamData(null);
    setSelectedExam(null);
  };

  const handleSaved = () => {
    setView("list");
    fetchExams();
  };

  return (
    <div className="min-h-screen ">
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {studentLoading && (
        <div className="fixed inset-0 bg-[rgb(var(--surface))] backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-[rgb(var(--text))]">
              Loading students…
            </p>
          </div>
        </div>
      )}

      <div className="p-4 pb-24">
        {view === "list" && (
          <ExamList
            exams={exams}
            loading={loading}
            onSelect={handleSelectExam}
            onViewResult={handleViewResult}
          />
        )}
        {view === "marks" && examData && (
          <MarksEntry
            examData={examData}
            onBack={handleBack}
            onSaved={handleSaved}
          />
        )}
        {view === "results" && selectedExam && (
          <ResultsView exam={selectedExam} onBack={handleBack} />
        )}
      </div>
    </div>
  );
}
