import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import {
  FiUsers, FiTrendingUp, FiAward, FiAlertTriangle, FiFilter, FiBook,
} from "react-icons/fi";

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
  "A+": "bg-emerald-100 text-emerald-700",
  "A":  "bg-green-100 text-green-700",
  "B+": "bg-sky-100 text-sky-700",
  "B":  "bg-blue-100 text-blue-600",
  "C":  "bg-yellow-100 text-yellow-700",
  "D":  "bg-orange-100 text-orange-700",
  "F":  "bg-red-100 text-red-600",
};

const STATUS_ABBR = {
  Absent:      "AB",
  Leave:       "LV",
  MedicalLeave:"ML",
  Exempted:    "EX",
};

/* ══════════════════════════════════════════════════════ */
export default function PrincipalResultView() {
  const navigate  = useNavigate();
  const isMobile  = window.innerWidth <= 768;

  const [classes,  setClasses]  = useState([]);
  const [terms,    setTerms]    = useState([]);
  const [filters,  setFilters]  = useState({ classId: "", sectionId: "", termId: "" });
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);

  /* derived sections from selected class */
  const sections = useMemo(() => {
    const cls = classes.find((c) => c._id === filters.classId);
    return (
      cls?.details?.map((d) => ({
        _id:  d.sectionId._id,
        name: d.sectionId.name,
      })) || []
    );
  }, [classes, filters.classId]);

  /* ── fetch meta ── */
  useEffect(() => {
    (async () => {
      try {
        const [cRes, tRes] = await Promise.all([
          axios.get(`${API}/classes/all`, { withCredentials: true }),
          axios.get(`${API}/terms`,       { withCredentials: true }),
        ]);
        setClasses(cRes.data.classes || []);
        setTerms(tRes.data.terms     || []);
      } catch {
        toast.error("Failed to load classes / terms");
      }
    })();
  }, []);

  /* ── handle class change → reset section ── */
  const handleClassChange = (classId) =>
    setFilters({ classId, sectionId: "", termId: filters.termId });

  /* ── load results ── */
  const handleLoad = async () => {
    if (!filters.classId || !filters.termId) {
      toast.error("Please select Class and Term");
      return;
    }
    try {
      setLoading(true);
      const qs = filters.sectionId ? `?sectionId=${filters.sectionId}` : "";
      const { data } = await axios.get(
        `${API}/exam/result/class/${filters.classId}/term/${filters.termId}${qs}`,
        { withCredentials: true },
      );
      setResults(data);
      setSearched(true);
      if (!data.length) toast.info("No results found for the selected filters.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to fetch results");
    } finally {
      setLoading(false);
    }
  };

  /* ── Build pivot: students × subjects ── */
  const { students, subjects, pivot, stats } = useMemo(() => {
    if (!results.length)
      return { students: [], subjects: [], pivot: {}, stats: null };

    const studentMap = {};
    const subjectMap = {};
    const pivotData  = {};

    results.forEach((r) => {
      const sid   = r.studentId?._id;
      const subId = r.subjectId?._id;
      if (!sid || !subId) return;

      if (!studentMap[sid]) studentMap[sid] = { ...r.studentId };
      if (!subjectMap[subId]) subjectMap[subId] = { _id: subId, name: r.subjectId?.name };

      if (!pivotData[sid]) pivotData[sid] = {};
      if (!pivotData[sid][subId])
        pivotData[sid][subId] = { obtained: 0, total: 0, count: 0, nonPresent: null };

      const cell = pivotData[sid][subId];

      if (r.attendanceStatus !== "Present") {
        cell.nonPresent = STATUS_ABBR[r.attendanceStatus] || r.attendanceStatus;
      } else if (r.marksObtained != null) {
        cell.obtained += r.marksObtained;
        cell.total    += r.totalMarks;
        cell.count++;
      }
    });

    /* Compute per-cell grade */
    Object.values(pivotData).forEach((subMap) =>
      Object.values(subMap).forEach((cell) => {
        if (cell.total > 0) {
          cell.pct   = parseFloat(((cell.obtained / cell.total) * 100).toFixed(1));
          cell.grade = calcGrade(cell.pct);
        }
      }),
    );

    const studentsArr = Object.values(studentMap).sort(
      (a, b) => (a.rollNo || 0) - (b.rollNo || 0),
    );
    const subjectsArr = Object.values(subjectMap);

    /* Aggregate stats */
    let passed = 0, countWithMarks = 0, totalPct = 0, highestPct = 0;

    studentsArr.forEach((s) => {
      const cells = Object.values(pivotData[s._id] || {}).filter((c) => c.total > 0);
      if (!cells.length) return;
      const avgPct =
        cells.reduce((sum, c) => sum + (c.pct || 0), 0) / cells.length;
      totalPct     += avgPct;
      if (avgPct > highestPct) highestPct = avgPct;
      if (avgPct >= 40) passed++;
      countWithMarks++;
    });

    return {
      students: studentsArr,
      subjects: subjectsArr,
      pivot:    pivotData,
      stats: {
        total:       studentsArr.length,
        passed,
        failed:      countWithMarks - passed,
        passPercent: countWithMarks
          ? ((passed / countWithMarks) * 100).toFixed(1)
          : 0,
        avgPct: countWithMarks ? (totalPct / countWithMarks).toFixed(1) : 0,
        highestPct: highestPct.toFixed(1),
      },
    };
  }, [results]);

  /* ── selected label helpers ── */
  const selectedClass   = classes.find((c) => c._id === filters.classId);
  const selectedSection = sections.find((s) => s._id === filters.sectionId);
  const selectedTerm    = terms.find((t) => t._id === filters.termId);

  /* ══════════════════════════════════════════════════════ */
  return (
    <div className="p-4 md:p-8  min-h-screen font-sans text-[rgb(var(--text))]">

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

      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between
                      items-start md:items-center gap-3 mb-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-black ">
            Result Sheet
          </h1>
          <p className=" text-sm mt-0.5">
            View class-wise results by term and section
          </p>
        </div>
      </div>

      {/* ── Filter Panel ── */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-slate-200
                      shadow-sm p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FiFilter className="text-indigo-500" />
          <span className="font-bold text-slate-700 text-sm">Filter Results</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Class */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Class <span className="text-red-400">*</span>
            </label>
            <select
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl
                         text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              value={filters.classId}
              onChange={(e) => handleClassChange(e.target.value)}
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>Class {c.name}</option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Section
            </label>
            <select
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl
                         text-sm outline-none focus:ring-2 focus:ring-indigo-400
                         disabled:opacity-50"
              value={filters.sectionId}
              onChange={(e) => setFilters((p) => ({ ...p, sectionId: e.target.value }))}
              disabled={!filters.classId}
            >
              <option value="">All Sections</option>
              {sections.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Term */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Term <span className="text-red-400">*</span>
            </label>
            <select
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl
                         text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              value={filters.termId}
              onChange={(e) => setFilters((p) => ({ ...p, termId: e.target.value }))}
            >
              <option value="">Select Term</option>
              {terms.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.academicYear})
                </option>
              ))}
            </select>
          </div>

          {/* Load Button */}
          <div className="flex items-end">
            <button
              onClick={handleLoad}
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700
                         text-white font-bold text-sm rounded-xl
                         active:scale-95 transition-all disabled:opacity-60"
            >
              {loading ? "Loading…" : "Load Results"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Nothing loaded yet ── */}
      {!searched && !loading && (
        <div className="max-w-7xl mx-auto text-center py-20 text-slate-400">
          <FiBook size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            Select class and term above to view the result sheet.
          </p>
        </div>
      )}

      {/* ── Loading spinner ── */}
      {loading && (
        <div className="max-w-7xl mx-auto flex items-center justify-center py-20">
          <div className="w-9 h-9 border-4 border-indigo-400 border-t-transparent
                          rounded-full animate-spin" />
        </div>
      )}

      {/* ── Results ── */}
      {searched && !loading && students.length > 0 && (
        <>
          {/* Sheet title */}
          <div className="max-w-7xl mx-auto mb-4">
            <h2 className="text-base font-black text-slate-700">
              Class {selectedClass?.name}
              {selectedSection ? ` — ${selectedSection.name}` : ""}
              {selectedTerm ? ` · ${selectedTerm.name} (${selectedTerm.academicYear})` : ""}
            </h2>
          </div>

          {/* Stats */}
          <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "TOTAL STUDENTS", value: stats.total,
                icon: <FiUsers />, bg: "bg-blue-50 text-blue-500" },
              { label: "PASSED", value: stats.passed,
                icon: <FiAward />, bg: "bg-green-50 text-green-500" },
              { label: "FAILED", value: stats.failed,
                icon: <FiAlertTriangle />, bg: "bg-red-50 text-red-500" },
              { label: "PASS %", value: `${stats.passPercent}%`,
                icon: <FiTrendingUp />, bg: "bg-indigo-50 text-indigo-500" },
            ].map((s, i) => (
              <div key={i}
                   className="bg-white rounded-xl border border-slate-100
                              shadow-sm px-4 py-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                                 text-lg shrink-0 ${s.bg}`}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold tracking-wide uppercase">
                    {s.label}
                  </p>
                  <p className="text-xl font-black text-slate-800">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop Table ── */}
          <div className="max-w-7xl mx-auto hidden md:block">
            <div className="bg-white rounded-2xl border border-slate-200
                            shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {/* Sticky columns */}
                      <th className="p-3 text-[10px] font-black text-slate-400
                                     uppercase tracking-wider sticky left-0 bg-slate-50
                                     min-w-12">
                        Roll
                      </th>
                      <th className="p-3 text-[10px] font-black text-slate-400
                                     uppercase tracking-wider sticky left-12
                                     bg-slate-50 min-w-35">
                        Student
                      </th>
                      {/* Subject columns */}
                      {subjects.map((sub) => (
                        <th key={sub._id}
                            className="p-3 text-[10px] font-black text-slate-400
                                       uppercase tracking-wider text-center min-w-25">
                          {sub.name}
                        </th>
                      ))}
                      {/* Aggregate */}
                      <th className="p-3 text-[10px] font-black text-indigo-400
                                     uppercase tracking-wider text-center min-w-20">
                        Overall %
                      </th>
                      <th className="p-3 text-[10px] font-black text-indigo-400
                                     uppercase tracking-wider text-center min-w-17.5">
                        Grade
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((stu) => {
                      const subCells = pivot[stu._id] || {};
                      const presentCells = Object.values(subCells).filter(
                        (c) => c.total > 0,
                      );
                      const overallPct =
                        presentCells.length
                          ? (
                              presentCells.reduce((s, c) => s + (c.pct || 0), 0) /
                              presentCells.length
                            ).toFixed(1)
                          : null;
                      const overallGrade = overallPct ? calcGrade(parseFloat(overallPct)) : null;

                      return (
                        <tr key={stu._id}
                            className="hover:bg-slate-50/60 transition-colors">
                          {/* Roll No */}
                          <td className="p-3 font-bold text-slate-500 sticky left-0
                                         bg-white text-xs text-center">
                            {stu.rollNo || "—"}
                          </td>
                          {/* Name */}
                          <td className="p-3 sticky left-12 bg-white">
                            <div className="font-bold text-slate-800 text-sm leading-tight">
                              {stu.firstName} {stu.lastName}
                            </div>
                            <div className="text-[10px] text-slate-400">{stu.studentId}</div>
                          </td>
                          {/* Subject marks */}
                          {subjects.map((sub) => {
                            const cell = subCells[sub._id];
                            if (!cell)
                              return (
                                <td key={sub._id} className="p-3 text-center text-slate-300 text-xs">
                                  —
                                </td>
                              );
                            if (cell.nonPresent)
                              return (
                                <td key={sub._id} className="p-3 text-center">
                                  <span className="text-[11px] font-bold px-2 py-0.5
                                                   rounded-full bg-slate-100 text-slate-500">
                                    {cell.nonPresent}
                                  </span>
                                </td>
                              );
                            return (
                              <td key={sub._id} className="p-3 text-center">
                                <div className="font-bold text-slate-700 text-sm">
                                  {cell.obtained}/{cell.total}
                                </div>
                                <div className={`text-[10px] font-bold px-1.5 py-0.5
                                                rounded-full w-fit mx-auto mt-0.5
                                                ${GRADE_STYLE[cell.grade] || ""}`}>
                                  {cell.grade}
                                </div>
                              </td>
                            );
                          })}
                          {/* Overall */}
                          <td className="p-3 text-center font-bold text-indigo-600 text-sm">
                            {overallPct ? `${overallPct}%` : "—"}
                          </td>
                          <td className="p-3 text-center">
                            {overallGrade ? (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                                               ${GRADE_STYLE[overallGrade] || ""}`}>
                                {overallGrade}
                              </span>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 px-5 py-3 border-t border-slate-100
                              text-[10px] font-bold text-slate-400">
                <span>AB = Absent</span>
                <span>LV = Leave</span>
                <span>ML = Medical Leave</span>
                <span>EX = Exempted</span>
                <span className="ml-auto">
                  Avg: {stats.avgPct}% · Highest: {stats.highestPct}%
                </span>
              </div>
            </div>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="max-w-7xl mx-auto md:hidden space-y-4">
            {students.map((stu) => {
              const subCells = pivot[stu._id] || {};
              const presentCells = Object.values(subCells).filter((c) => c.total > 0);
              const overallPct =
                presentCells.length
                  ? (
                      presentCells.reduce((s, c) => s + (c.pct || 0), 0) /
                      presentCells.length
                    ).toFixed(1)
                  : null;
              const overallGrade = overallPct ? calcGrade(parseFloat(overallPct)) : null;

              return (
                <div key={stu._id}
                     className="bg-white rounded-2xl border border-slate-200
                                shadow-sm overflow-hidden">
                  {/* Student header */}
                  <div className="flex items-center justify-between px-4 py-3
                                  bg-indigo-50 border-b border-indigo-100">
                    <div>
                      <div className="font-black text-slate-800">
                        {stu.firstName} {stu.lastName}
                      </div>
                      <div className="text-xs text-slate-400">
                        Roll: {stu.rollNo || "—"} · {stu.studentId}
                      </div>
                    </div>
                    <div className="text-right">
                      {overallPct && (
                        <>
                          <div className="text-sm font-black text-indigo-600">
                            {overallPct}%
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5
                                           rounded-full ${GRADE_STYLE[overallGrade] || ""}`}>
                            {overallGrade}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Subject rows */}
                  <div className="divide-y divide-slate-50">
                    {subjects.map((sub) => {
                      const cell = subCells[sub._id];
                      return (
                        <div key={sub._id}
                             className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-sm text-slate-600 font-medium">
                            {sub.name}
                          </span>
                          {!cell ? (
                            <span className="text-slate-300 text-xs">—</span>
                          ) : cell.nonPresent ? (
                            <span className="text-[11px] font-bold px-2 py-0.5
                                             rounded-full bg-slate-100 text-slate-500">
                              {cell.nonPresent}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-700">
                                {cell.obtained}/{cell.total}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5
                                               rounded-full ${GRADE_STYLE[cell.grade] || ""}`}>
                                {cell.grade}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* No results after search */}
      {searched && !loading && students.length === 0 && (
        <div className="max-w-7xl mx-auto text-center py-20 text-slate-400">
          <FiAlertTriangle size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No results found for the selected filters.</p>
        </div>
      )}
    </div>
  );
}