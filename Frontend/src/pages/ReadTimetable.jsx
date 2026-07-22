import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaArrowLeft,
  FaBook,
  FaUserTie,
  FaCoffee,
  FaRunning,
} from "react-icons/fa";
import { MdOutlineClass } from "react-icons/md";
import { FaClock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BulkTimetableUpload from "../components/BulkTimetableUpload";

const API = import.meta.env.VITE_API_URL;

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * ReadTimetable — read-only timetable viewer for non-admin roles
 * (teachers, students, parents, etc.)
 *
 * Props:
 *   - preselectedClassId  (optional) — skip the class selector and load directly
 *   - preselectedDetailId (optional) — paired with preselectedClassId
 *   - showClassSelector   (default: true) — set false to hide the selector
 *                          (useful when the class is determined by the logged-in user)
 */
export default function ReadTimetable({
  preselectedClassId,
  preselectedDetailId,
  showClassSelector = true,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;
  const canUpload =
    user?.role === "teacher_admin" ||
    user?.role === "school_admin" ||
    user?.role === "staff_admin";

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [selectedEntry, setSelectedEntry] = useState(null);
  const [classId, setClassId] = useState(preselectedClassId || "");
  const [detailId, setDetailId] = useState(preselectedDetailId || "");

  const [periodConfigs, setPeriodConfigs] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [timetableExists, setTimetableExists] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ── fetch dropdown data ── */
  const loadData = async () => {
    try {
      const [cls, sub, tea] = await Promise.all([
        axios.get(`${API}/classes/flat`, { withCredentials: true }),
        axios.get(`${API}/subjects/all`, { withCredentials: true }),
        axios.get(`${API}/teachers`, { withCredentials: true }),
      ]);
      setClasses(cls.data.classes || []);
      setSubjects(sub.data.subjects || []);
      setTeachers(tea.data.data || []);
    } catch {
      // silently fail — UI will still show "not set" state
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ── auto-load when preselected ids are provided ── */
  useEffect(() => {
    if (preselectedClassId) {
      setClassId(preselectedClassId);
      setDetailId(preselectedDetailId || "");
    }
  }, [preselectedClassId, preselectedDetailId]);

  /* ── fetch timetable whenever classId changes ── */
  useEffect(() => {
    if (classId) fetchTimetable();
  }, [classId, detailId]);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (detailId) params.append("detailId", detailId);

      const res = await axios.get(`${API}/timetable/${classId}?${params}`, {
        withCredentials: true,
      });
      if (res.data.data) {
        setPeriodConfigs(res.data.data.periodConfigs || []);
        setAssignments(res.data.data.assignments || {});
        setTimetableExists(true);
      } else {
        setPeriodConfigs([]);
        setAssignments({});
        setTimetableExists(false);
      }
    } catch {
      setPeriodConfigs([]);
      setAssignments({});
      setTimetableExists(false);
    } finally {
      setLoading(false);
    }
  };

  /* ── class selection ── */
  const handleClassChange = (e) => {
    const val = e.target.value;
    const selected = classes.find((c) => c._id === val);
    if (selected) {
      setSelectedEntry(selected);
      setClassId(selected.classId);
      setDetailId(selected.detailId || "");
    } else {
      setSelectedEntry(null);
      setClassId("");
      setDetailId("");
      setPeriodConfigs([]);
      setAssignments({});
      setTimetableExists(false);
    }
  };

  /* ── lookups ── */
  const subjectName = (id) => subjects.find((s) => s._id === id)?.name || "";
  const teacherName = (id) =>
    teachers.find((t) => t._id === id)?.fullName || "";

  /* ════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 p-8">
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                 bg-white shadow-sm border border-slate-100
                 text-sm font-bold text-slate-600 active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-[rgb(var(--text))]">Timetable</h1>
        <p className="text-sm text-[rgb(var(--text))] mt-0.5">View your class schedule</p>
      </div>

      {canUpload && (
        <BulkTimetableUpload onComplete={() => classId && fetchTimetable()} />
      )}

      {/* ── Class Selector (optional) ── */}
      {showClassSelector && (
        <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg shrink-0">
              <MdOutlineClass />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-semibold text-[rgb(var(--text))] mb-1">
                Select Class &amp; Section
              </label>
              <select
                value={selectedEntry?._id || ""}
                onChange={handleClassChange}
                className="w-full sm:w-64 border border-gray-200 bg-[rgb(var(--surface))]  text-[rgb(var(--text))] px-3 py-2 rounded-xl text-sm font-semibold  focus:outline-none focus:border-indigo-400"
              >
                <option value="" className="bg-[rgb(var(--bg))]  text-[rgb(var(--text))]">Choose Class</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state — no class chosen ── */}
      {!classId && showClassSelector && (
        <div className=" rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MdOutlineClass className="text-3xl text-indigo-400" />
          </div>
          <h2 className="text-base font-semibold text-[rgb(var(--text))] mb-1">
            Select a Class to View Timetable
          </h2>
          <p className="text-sm text-[rgb(var(--text))]">
            Choose a class or section above to view its schedule
          </p>
        </div>
      )}

      {/* ── Loading ── */}
      {classId && loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Timetable Not Set ── */}
      {classId && !loading && !timetableExists && (
        <div className="bg-[rgb(var(--surface))]  rounded-2xl border border-amber-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FaClock className="text-3xl text-amber-400" />
          </div>
          <h2 className="text-base font-semibold text-[rgb(var(--text))] mb-1">
            Timetable Not Set
          </h2>
          <p className="text-sm text-[rgb(var(--text))] max-w-xs mx-auto">
            The timetable for this class hasn't been created yet by the school
            admin. Please check back later or contact your school administrator.
          </p>
        </div>
      )}

      {/* ── Timetable View ── */}
      {classId && !loading && timetableExists && (
        <div className=" rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[rgb(var(--surface))]  text-[rgb(var(--text))]">
                <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wider border-r  min-w-[130px]">
                  Time Slot
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="px-4 py-4 font-semibold text-xs uppercase tracking-wider text-center min-w-[140px]"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periodConfigs.map((p, i) => (
                <tr
                  key={p.id}
                 className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] border-t"
                >
                  {/* Time slot */}
                  <td className="px-5 py-4 border-r border-gray-100">
                    <p className="text-xs font-bold text-[rgb(var(--primary))]">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-[rgb(var(--text))] font-mono mt-0.5">
                      {p.start} – {p.end}
                    </p>
                  </td>

                  {/* Day cells */}
                  {DAYS.map((day) => {
                    const data = assignments[day]?.[p.id];
                    return (
                      <td key={day} className="px-3 py-3 text-center align-top">
                        {data?.type === "lecture" ? (
                          <div className="text-left space-y-1">
                            {data.subjectId && (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[rgb(var(--text))]">
                                <FaBook
                                  size={10}
                                  className="text-[rgb(var(--primary))] shrink-0"
                                />
                                {subjectName(data.subjectId)}
                              </div>
                            )}
                            {data.teacherId ? (
                              <div className="flex items-center gap-1.5 text-[11px] text-[rgb(var(--text))]">
                                <FaUserTie
                                  size={10}
                                  className="text-[rgb(var(--text))] shrink-0"
                                />
                                {teacherName(data.teacherId)}
                              </div>
                            ) : (
                              <p className="text-[10px] text-[rgb(var(--text))] italic">
                                Teacher TBD
                              </p>
                            )}
                          </div>
                        ) : data?.type === "lunch" ? (
                          <div className="flex items-center justify-center gap-1.5 py-2 text-orange-400 text-[10px] font-bold">
                            <FaCoffee /> Lunch Break
                          </div>
                        ) : data?.type === "activity" ? (
                          <div className="flex items-center justify-center gap-1.5 text-emerald-600 text-xs font-bold">
                            <FaRunning size={11} /> {data.customName}
                          </div>
                        ) : (
                          <span className="text-[10px] text-[rgb(var(--text))] italic">
                            Free
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
