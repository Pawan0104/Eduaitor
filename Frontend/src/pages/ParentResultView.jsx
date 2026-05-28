import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import {
  FiBook, FiCheckCircle, FiXCircle, FiAward,
  FiTrendingUp, FiAlertTriangle, FiCalendar,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext"; // ← adjust path if needed

const API = import.meta.env.VITE_API_URL;

/* ── Grade helpers ── */
const calcGrade = (pct) => {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
};

const GRADE_STYLE = {
  "A+": { bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
  "A":  { bar: "bg-green-500",   badge: "bg-green-100 text-green-700"     },
  "B+": { bar: "bg-sky-500",     badge: "bg-sky-100 text-sky-700"         },
  "B":  { bar: "bg-blue-500",    badge: "bg-blue-100 text-blue-700"       },
  "C":  { bar: "bg-yellow-500",  badge: "bg-yellow-100 text-yellow-700"   },
  "D":  { bar: "bg-orange-500",  badge: "bg-orange-100 text-orange-700"   },
  "F":  { bar: "bg-red-500",     badge: "bg-red-100 text-red-600"         },
};

const ATTENDANCE_STYLE = {
  Present:     "bg-green-100 text-green-700",
  Absent:      "bg-red-100 text-red-600",
  Leave:       "bg-slate-100 text-[rgb(var(--text))]",
  MedicalLeave:"bg-blue-100 text-blue-600",
  Exempted:    "bg-purple-100 text-purple-600",
};

/* ══════════════════════════════════════════════════════ */
export default function ParentResultView() {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const { user }  = useAuth();

  // adjust to user.student_id if that's the field in your auth context
  const studentId = user?.student_id;

  const [terms,      setTerms]      = useState([]);
  const [activeTerm, setActiveTerm] = useState(null);
  const [results,    setResults]    = useState([]);
  const [loading,    setLoading]    = useState(false);

  /* ── fetch terms ── */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/terms`, { withCredentials: true });
        const termList = data.terms || [];
        setTerms(termList);
        if (termList.length) setActiveTerm(termList[0]._id);
      } catch {
        toast.error("Failed to load terms");
      }
    })();
  }, []);

  /* ── fetch results when term changes ── */
  useEffect(() => {
    if (!studentId || !activeTerm) return;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `${API}/exam/result/student/${studentId}?termId=${activeTerm}`,
          { withCredentials: true },
        );
        setResults(data);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId, activeTerm]);

  /* ── Group results by subject ── */
  const { subjectGroups, summary, studentInfo, termInfo } = useMemo(() => {
    if (!results.length)
      return { subjectGroups: [], summary: null, studentInfo: null, termInfo: null };

    const first = results[0];
    const studentInfo = {
      class:   first.classId?.name,
      section: first.sectionId?.name,
    };
    const termInfo = first.termId;

    // Group by subjectId
    const grouped = {};
    results.forEach((r) => {
      const subId = r.subjectId?._id || r.examId?.subject?._id;
      const subName =
        r.subjectId?.name ||
        r.examId?.subject?.name ||
        "Unknown Subject";

      if (!grouped[subId]) grouped[subId] = { name: subName, exams: [] };
      grouped[subId].exams.push(r);
    });

    // Aggregate per subject
    const subjectGroups = Object.values(grouped).map((g) => {
      const presentExams = g.exams.filter(
        (e) => e.attendanceStatus === "Present" && e.marksObtained != null,
      );
      const totalObtained = presentExams.reduce((s, e) => s + e.marksObtained, 0);
      const totalMax      = presentExams.reduce((s, e) => s + e.totalMarks, 0);
      const pct = totalMax > 0
        ? parseFloat(((totalObtained / totalMax) * 100).toFixed(1))
        : null;
      const grade   = pct != null ? calcGrade(pct) : null;
      const isPassed = pct != null ? pct >= 40 : null;

      return {
        name: g.name,
        exams: g.exams,
        totalObtained,
        totalMax,
        pct,
        grade,
        isPassed,
      };
    });

    // Overall summary
    const subWithMarks = subjectGroups.filter((s) => s.pct != null);
    const overallPct =
      subWithMarks.length
        ? subWithMarks.reduce((s, g) => s + g.pct, 0) / subWithMarks.length
        : null;
    const overallGrade = overallPct != null ? calcGrade(overallPct) : null;
    const passed = subWithMarks.filter((s) => s.isPassed).length;

    return {
      subjectGroups,
      studentInfo,
      termInfo,
      summary: {
        total:    subjectGroups.length,
        passed,
        failed:   subWithMarks.length - passed,
        overallPct: overallPct != null ? overallPct.toFixed(1) : null,
        overallGrade,
      },
    };
  }, [results]);

  const activeTerm$ = terms.find((t) => t._id === activeTerm);

  /* ══════════════════════════════════════════════════════ */
  return (
    <div className="p-4 md:p-8  min-h-screen font-sans text-[rgb(var(--text))]">

      {/* Back button (mobile) */}
      {isMobile && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 mb-4 rounded-xl
                     bg-white shadow-sm border border-slate-100
                     text-sm font-bold text-[rgb(var(--text))] active:scale-95 transition-transform"
        >
          <FaArrowLeft size={14} /> Back
        </button>
      )}

      {/* ── Header ── */}
      <div className="max-w-3xl mx-auto mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-[rgb(var(--text))]">
          My Results
        </h1>
        <p className="text-[rgb(var(--text))] text-sm mt-0.5">
          View your exam results and performance
        </p>
      </div>

      {/* ── Student Info Banner ── */}
      {studentInfo && (
        <div className="max-w-3xl mx-auto bg-indigo-600 rounded-2xl
                        px-5 py-4 mb-6 flex items-center justify-between">
          <div>
            <div className="text-indigo-200 text-xs font-bold uppercase tracking-wide mb-0.5">
              Currently Viewing
            </div>
            <div className="text-white font-black text-base">
              Class {studentInfo.class}
              {studentInfo.section ? ` — ${studentInfo.section}` : ""}
            </div>
            {termInfo && (
              <div className="text-indigo-200 text-xs mt-0.5">
                {termInfo.name} · {termInfo.academicYear}
              </div>
            )}
          </div>
          {summary?.overallGrade && (
            <div className="text-center">
              <div className="text-indigo-200 text-xs font-bold uppercase mb-1">
                Overall
              </div>
              <div className="text-3xl font-black text-white">
                {summary.overallGrade}
              </div>
              <div className="text-indigo-200 text-xs font-bold">
                {summary.overallPct}%
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Term Tabs ── */}
      <div className="max-w-3xl mx-auto mb-6 overflow-x-auto">
        <div className="flex gap-2 pb-1 min-w-max">
          {terms.map((t) => (
            <button
              key={t._id}
              onClick={() => setActiveTerm(t._id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition whitespace-nowrap
                ${activeTerm === t._id
                  ? "bg-[rgb(var(--primary))]  text-[rgb(var(--text))] shadow-md"
                  : "bg-[rgb(var(--bg))]  text-[rgb(var(--text))] border-slate-200 "
                }`}
            >
              {t.name}
              <span className={`ml-1.5 text-[10px] ${activeTerm === t._id ? "text-indigo-200" : "text-[rgb(var(--text))]"}`}>
                {t.academicYear}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="max-w-3xl mx-auto flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent
                          rounded-full animate-spin" />
        </div>
      )}

      {/* ── Summary Stats ── */}
      {!loading && summary && (
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "SUBJECTS", value: summary.total,
              icon: <FiBook />, bg: "bg-blue-50 text-blue-500" },
            { label: "PASSED", value: summary.passed,
              icon: <FiCheckCircle />, bg: "bg-green-50 text-green-500" },
            { label: "FAILED", value: summary.failed,
              icon: <FiXCircle />, bg: "bg-red-50 text-red-500" },
          ].map((s, i) => (
            <div key={i}
                 className="bg-white rounded-xl border border-slate-100
                            shadow-sm px-3 py-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                               text-base shrink-0 ${s.bg}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-[9px] text-[rgb(var(--text))] font-bold tracking-wide uppercase">
                  {s.label}
                </p>
                <p className="text-xl font-black text-[rgb(var(--text))]">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Subject Result Cards ── */}
      {!loading && subjectGroups.length > 0 && (
        <div className="max-w-3xl mx-auto space-y-4 mb-8">
          {subjectGroups.map((sub, idx) => {
            const gStyle = GRADE_STYLE[sub.grade] || GRADE_STYLE["F"];
            const barW   = sub.pct != null ? Math.min(sub.pct, 100) : 0;

            return (
              <div key={idx}
                   className="bg-[rgb(var(--surface))]  text-[rgb(var(--text))]  rounded-2xl border border-slate-200
                              shadow-sm overflow-hidden">
                {/* Subject header */}
                <div className="flex items-start justify-between px-5 pt-4 pb-3">
                  <div>
                    <h3 className="font-black text-[rgb(var(--text))] text-base">{sub.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {sub.isPassed === true && (
                        <span className="flex items-center gap-1 text-[10px] font-bold
                                         text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <FiCheckCircle size={9} /> Passed
                        </span>
                      )}
                      {sub.isPassed === false && (
                        <span className="flex items-center gap-1 text-[10px] font-bold
                                         text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          <FiXCircle size={9} /> Failed
                        </span>
                      )}
                    </div>
                  </div>
                  {sub.grade ? (
                    <div className="text-right shrink-0">
                      <div className={`text-2xl font-black px-3 py-1 rounded-xl
                                       ${gStyle.badge}`}>
                        {sub.grade}
                      </div>
                      <div className="text-xs font-bold text-[rgb(var(--text))] mt-1">
                        {sub.pct}%
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-[rgb(var(--text))] bg-[rgb(var(--surface))]
                                     px-2 py-1 rounded-lg">
                      No Marks
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {sub.pct != null && (
                  <div className="px-5 pb-2">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${gStyle.bar}`}
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Aggregate marks */}
                {sub.totalMax > 0 && (
                  <div className="px-5 py-3 bg-[rgb(var(--surface))] border-t border-slate-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[rgb(var(--text))] font-medium">
                        Total Marks
                      </span>
                      <span className="font-black text-[rgb(var(--text))]">
                        {sub.totalObtained} / {sub.totalMax}
                      </span>
                    </div>
                  </div>
                )}

                {/* Per-exam breakdown */}
                {sub.exams.length > 1 && (
                  <div className="border-t border-slate-100">
                    <div className="px-5 py-2 text-[10px] font-bold text-[rgb(var(--text))]
                                    uppercase tracking-wide">
                      Exam Breakdown
                    </div>
                    <div className="divide-y divide-slate-50">
                      {sub.exams.map((exam, eIdx) => {
                        const examDate =
                          exam.examId?.examDate
                            ? new Date(exam.examId.examDate).toLocaleDateString("en-GB")
                            : "—";
                        const attStyle =
                          ATTENDANCE_STYLE[exam.attendanceStatus] || "bg-slate-100 text-[rgb(var(--text))]";

                        return (
                          <div key={eIdx}
                               className="flex items-center justify-between px-5 py-2.5">
                            <div className="flex items-center gap-2">
                              <FiCalendar size={11} className="text-[rgb(var(--text))]" />
                              <span className="text-xs text-[rgb(var(--text))] font-medium">
                                {examDate}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5
                                               rounded-full ${attStyle}`}>
                                {exam.attendanceStatus}
                              </span>
                            </div>
                            {exam.attendanceStatus === "Present" && exam.marksObtained != null ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[rgb(var(--text))]">
                                  {exam.marksObtained}/{exam.totalMarks}
                                </span>
                                {exam.grade && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5
                                                   rounded-full
                                                   ${GRADE_STYLE[exam.grade]?.badge || ""}`}>
                                    {exam.grade}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-[rgb(var(--text))]">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && activeTerm && subjectGroups.length === 0 && (
        <div className="max-w-3xl mx-auto text-center py-20 text-[rgb(var(--text))]">
          <FiAlertTriangle size={36} className="mx-auto mb-3" />
          <p className="text-sm font-medium">
            No results found for {activeTerm$?.name}.
          </p>
        </div>
      )}
    </div>
  );
}