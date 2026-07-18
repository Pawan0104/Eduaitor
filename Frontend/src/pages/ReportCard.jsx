import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPrint } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

export default function ReportCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;
  const role = user?.role;
  const isParentOrStudent = role === "student_admin";
  const ownStudentId = user?.student_id;

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState(ownStudentId || "");
  const [termId, setTermId] = useState("");
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/terms`, {
          withCredentials: true,
        });
        const list = data.terms || [];
        setTerms(list);
        if (list.length) setTermId(list[0]._id);
      } catch {
        toast.error("Failed to load terms");
      }
    })();
  }, []);

  useEffect(() => {
    if (isParentOrStudent) return;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/classes/all`, {
          withCredentials: true,
        });
        setClasses(data.classes || data.data || data || []);
      } catch {
        toast.error("Failed to load classes");
      }
    })();
  }, [isParentOrStudent]);

  useEffect(() => {
    if (isParentOrStudent || !classId) {
      setStudents([]);
      return;
    }
    (async () => {
      try {
        const { data } = await axios.get(`${API}/students`, {
          withCredentials: true,
        });
        const list = (data.data || []).filter(
          (s) => String(s.classId?._id || s.classId) === String(classId),
        );
        setStudents(list);
      } catch {
        toast.error("Failed to load students");
      }
    })();
  }, [classId, isParentOrStudent]);

  const loadReport = async () => {
    const sid = isParentOrStudent ? ownStudentId : studentId;
    if (!sid) return toast.error("Select a student");
    if (!termId) return toast.error("Select a term");
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/exam/report-card/${sid}`, {
        params: { termId },
        withCredentials: true,
      });
      setCard(data);
    } catch (err) {
      setCard(null);
      toast.error(err.response?.data?.message || "Failed to load report card");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isParentOrStudent && ownStudentId && termId) loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isParentOrStudent, ownStudentId, termId]);

  const includedLabel = (card?.terms || []).map((t) => t.name).join(" + ");

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen text-[rgb(var(--text))]">
      {isMobile && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 mb-4 rounded-xl bg-[rgb(var(--surface))] border text-sm font-bold print:hidden"
        >
          <FaArrowLeft /> Back
        </button>
      )}

      <div className="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Report Card</h1>
          <p className="text-sm text-[rgb(var(--text-light))] mt-1">
            Term-wise cumulative report — Term 2 includes Term 1 + Term 2 marks,
            with attendance till date
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          {!isParentOrStudent && (
            <>
              <Select
                label="Class"
                value={classId}
                onChange={setClassId}
                options={[
                  { value: "", label: "Select class" },
                  ...classes.map((c) => ({
                    value: c._id,
                    label: c.name || c.className,
                  })),
                ]}
              />
              <Select
                label="Student"
                value={studentId}
                onChange={setStudentId}
                options={[
                  { value: "", label: "Select student" },
                  ...students.map((s) => ({
                    value: s._id,
                    label: `${s.firstName} ${s.lastName || ""} (${s.studentId || ""})`,
                  })),
                ]}
              />
            </>
          )}
          <Select
            label="Up to term"
            value={termId}
            onChange={setTermId}
            options={[
              { value: "", label: "Select term" },
              ...terms.map((t) => ({
                value: t._id,
                label: `${t.name}${t.academicYear ? ` (${t.academicYear})` : ""}`,
              })),
            ]}
          />
          <button
            onClick={loadReport}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] text-sm font-medium h-10"
          >
            {loading ? "Loading..." : "Generate"}
          </button>
          {card && (
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium h-10 flex items-center gap-2"
            >
              <FaPrint /> Print
            </button>
          )}
        </div>
      </div>

      {loading && (
        <p className="text-center py-10 text-[rgb(var(--text-light))]">
          Generating report card...
        </p>
      )}

      {!loading && !card && (
        <div className="rounded-2xl border bg-[rgb(var(--surface))] p-10 text-center text-[rgb(var(--text-light))]">
          Select a term and generate the report card. Marks appear as soon as
          teachers publish exam results.
        </div>
      )}

      {card && (
        <div
          id="report-card-print"
          className="max-w-3xl mx-auto bg-white text-slate-900 rounded-2xl border shadow-sm p-6 sm:p-8 print:shadow-none print:border-0"
        >
          <div className="text-center border-b pb-4 mb-4">
            {card.school?.logo && (
              <img
                src={card.school.logo}
                alt=""
                className="h-14 mx-auto mb-2 object-contain"
              />
            )}
            <h2 className="text-xl font-black tracking-wide">
              {card.school?.name || "School"}
            </h2>
            {card.school?.address && (
              <p className="text-xs text-slate-500 mt-1">{card.school.address}</p>
            )}
            <p className="mt-3 text-sm font-bold uppercase tracking-widest text-indigo-700">
              Report Card · {card.selectedTerm?.name || "Term"}
              {card.academicYear ? ` · ${card.academicYear}` : ""}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Cumulative marks: {includedLabel || "—"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-6">
            <Info label="Student" value={card.student?.name} />
            <Info label="Student ID" value={card.student?.studentId} />
            <Info label="Class" value={card.student?.className} />
            <Info label="Section" value={card.student?.sectionName} />
            <Info label="Roll No." value={card.student?.rollNo} />
            <Info label="Selected term" value={card.selectedTerm?.name} />
          </div>

          {/* Per-term exam detail */}
          {(card.termSections || []).map((section) => (
            <div key={section.termId} className="mb-5">
              <h3 className="font-bold text-sm uppercase tracking-wide mb-2">
                {section.termName} — exam marks
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border mb-2">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-2 text-left border">Subject</th>
                      <th className="p-2 text-center border">Date</th>
                      <th className="p-2 text-center border">Obtained</th>
                      <th className="p-2 text-center border">Max</th>
                      <th className="p-2 text-center border">%</th>
                      <th className="p-2 text-center border">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(section.exams || []).map((e) => (
                      <tr key={e.resultId}>
                        <td className="p-2 border font-medium">
                          {e.subjectName}
                        </td>
                        <td className="p-2 border text-center text-xs">
                          {e.examDate
                            ? new Date(e.examDate).toLocaleDateString("en-IN")
                            : "—"}
                        </td>
                        <td className="p-2 border text-center">
                          {e.marksObtained != null
                            ? e.marksObtained
                            : e.attendanceStatus || "—"}
                        </td>
                        <td className="p-2 border text-center">
                          {e.totalMarks ?? "—"}
                        </td>
                        <td className="p-2 border text-center">
                          {e.percentage != null ? `${e.percentage}%` : "—"}
                        </td>
                        <td className="p-2 border text-center font-bold">
                          {e.grade || "—"}
                        </td>
                      </tr>
                    ))}
                    {(section.exams || []).length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-3 text-center text-slate-500"
                        >
                          No marks published for this term yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <h3 className="font-bold text-sm uppercase tracking-wide mb-2">
            Cumulative subject totals
          </h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 text-left border">Subject</th>
                  <th className="p-2 text-center border">Obtained</th>
                  <th className="p-2 text-center border">Max</th>
                  <th className="p-2 text-center border">%</th>
                  <th className="p-2 text-center border">Grade</th>
                </tr>
              </thead>
              <tbody>
                {(card.subjects || []).map((s) => (
                  <tr key={s.subjectId}>
                    <td className="p-2 border font-medium">{s.subjectName}</td>
                    <td className="p-2 border text-center">
                      {s.totalMarks ? s.marksObtained : "—"}
                    </td>
                    <td className="p-2 border text-center">
                      {s.totalMarks || "—"}
                    </td>
                    <td className="p-2 border text-center">
                      {s.percentage != null ? `${s.percentage}%` : "—"}
                    </td>
                    <td className="p-2 border text-center font-bold">
                      {s.grade}
                    </td>
                  </tr>
                ))}
                {(card.subjects || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500">
                      No marks available yet. Generate again after results are
                      published.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td className="p-2 border">Overall</td>
                  <td className="p-2 border text-center">
                    {card.summary?.totalObtained ?? "—"}
                  </td>
                  <td className="p-2 border text-center">
                    {card.summary?.totalMax ?? "—"}
                  </td>
                  <td className="p-2 border text-center">
                    {card.summary?.overallPercentage != null
                      ? `${card.summary.overallPercentage}%`
                      : "—"}
                  </td>
                  <td className="p-2 border text-center">
                    {card.summary?.overallGrade ?? "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <h3 className="font-bold text-sm uppercase tracking-wide mb-2">
            Attendance till date
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <Stat label="Present" value={card.attendance?.present ?? 0} />
            <Stat label="Late" value={card.attendance?.late ?? 0} />
            <Stat label="Absent" value={card.attendance?.absent ?? 0} />
            <Stat label="Total days" value={card.attendance?.totalDays ?? 0} />
            <Stat
              label="Attendance %"
              value={`${card.attendance?.percentage ?? 0}%`}
            />
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Attendance from{" "}
            {card.attendance?.from
              ? new Date(card.attendance.from).toLocaleDateString("en-IN")
              : "start of year"}{" "}
            to{" "}
            {card.attendance?.to
              ? new Date(card.attendance.to).toLocaleDateString("en-IN")
              : "today"}
          </p>

          <div className="grid grid-cols-2 gap-8 mt-10 pt-6 border-t text-xs text-slate-500">
            <div className="text-center">
              <div className="border-t border-slate-400 mt-10 pt-2">
                Class Teacher
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-400 mt-10 pt-2">
                Principal
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 text-center">
            Generated{" "}
            {card.generatedAt
              ? new Date(card.generatedAt).toLocaleString()
              : ""}
          </p>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-card-print, #report-card-print * { visibility: visible; }
          #report-card-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}

const Select = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-[10px] font-bold uppercase mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))] min-w-[140px] h-10"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

const Info = ({ label, value }) => (
  <div>
    <p className="text-[10px] uppercase font-bold text-slate-400">{label}</p>
    <p className="font-semibold">{value || "—"}</p>
  </div>
);

const Stat = ({ label, value }) => (
  <div className="rounded-xl border bg-slate-50 p-3 text-center">
    <p className="text-lg font-bold">{value}</p>
    <p className="text-[10px] uppercase font-bold text-slate-500">{label}</p>
  </div>
);
