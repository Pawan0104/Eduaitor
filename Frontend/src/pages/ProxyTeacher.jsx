import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaUserTie,
  FaCalendarAlt,
  FaBook,
  FaExchangeAlt,
  FaSync,
} from "react-icons/fa";
import LoadingSpinner from "../components/LoadingSpinner";

const API = import.meta.env.VITE_API_URL;

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function ProxyTeacher() {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [day, setDay] = useState("");
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const res = await axios.get(`${API}/teachers`, { withCredentials: true });
        setTeachers(res.data.data || []);
      } catch {
        toast.error("Failed to load teachers");
      }
    };
    loadTeachers();
  }, []);

  const loadSchedule = async () => {
    if (!teacherId) return toast.warning("Select a teacher first");
    if (!date) return toast.warning("Select a date");
    setLoading(true);
    setLoaded(true);
    try {
      const res = await axios.get(`${API}/timetable/teacher-schedule`, {
        params: { teacherId, date },
        withCredentials: true,
      });
      setDay(res.data.day);
      setSchedule(
        (res.data.periods || []).map((p) => ({
          ...p,
          originalSubId: p.substituteTeacherId || "",
        })),
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load schedule");
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  };

  const updatePeriod = (idx, field, value) => {
    setSchedule((prev) => {
      const next = [...prev];
      const p = next[idx];
      if (field === "substituteTeacherId") {
        p.substituteTeacherId = value;
        if (value) p.status = "teacher-absent";
        else p.status = "normal";
      } else {
        p[field] = value;
      }
      next[idx] = { ...p };
      return next;
    });
  };

  const changedCount = () =>
    schedule.filter((p) => {
      if (p.status === "teacher-absent" && !p.substituteTeacherId) return false;
      const originalHas = Boolean(p.isProxy);
      const nowHas = Boolean(p.substituteTeacherId);
      if (nowHas && originalHas) return String(p.substituteTeacherId) !== String(p.originalSubId);
      return nowHas !== originalHas;
    }).length;

  const handleSave = async () => {
    const replacements = schedule
      .filter((p) => {
        if (p.status === "teacher-absent" && !p.substituteTeacherId) return false;
        const originalHas = Boolean(p.isProxy);
        const nowHas = Boolean(p.substituteTeacherId);
        if (nowHas && originalHas) return String(p.substituteTeacherId) !== String(p.originalSubId);
        return nowHas !== originalHas;
      })
      .map((p) => ({
        classId: p.classId,
        detailId: p.detailId || null,
        periodId: p.periodId,
        status: p.substituteTeacherId ? "teacher-absent" : "normal",
        substituteTeacherId: p.substituteTeacherId || null,
      }));

    if (replacements.length === 0) {
      return toast.info("No changes to save");
    }
    if (!teacherId) return toast.warning("Select a teacher");

    setSaving(true);
    try {
      const res = await axios.post(
        `${API}/timetable/proxy-assign`,
        { date, teacherId, replacements },
        { withCredentials: true },
      );
      toast.success(`Proxy teachers assigned (${res.data.updated})`);
      loadSchedule();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to assign proxy");
    } finally {
      setSaving(false);
    }
  };

  const teacherName = (id) =>
    teachers.find((t) => String(t._id) === String(id))?.fullName || "";

  const originalTeacherOf = (p) =>
    p.isProxy ? p.teacherName : teacherName(teacherId);

  return (
    <div className="space-y-6 p-8">
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[rgb(var(--primary))] shadow-sm border border-slate-100 text-sm font-bold text-[rgb(var(--text))] active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-[rgb(var(--text))]">Proxy Teacher</h1>
        <p className="text-sm text-[rgb(var(--text))] mt-0.5">
          When a teacher is unavailable, substitute their periods with a proxy teacher
        </p>
      </div>

      {/* Control bar */}
      <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3 w-full sm:w-auto">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Teacher
              </label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full sm:w-64 border border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))] px-3 py-2 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-400"
              >
                <option value="">Select Teacher</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full sm:w-52 border border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))] px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
              />
              <p className="text-[10px] text-[rgb(var(--text))] mt-0.5">
                {date ? DAY_NAMES[new Date(date).getDay()] : ""}
              </p>
            </div>
            <button
              onClick={loadSchedule}
              className="flex items-center gap-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))] text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition min-h-11"
            >
              <FaSync size={12} />
              Load Schedule
            </button>
          </div>

          {loaded && schedule.length > 0 && (
            <button
              onClick={handleSave}
              disabled={saving || changedCount() === 0}
              className="flex items-center gap-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))] text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-50 min-h-11"
            >
              {saving ? (
                <LoadingSpinner size="sm" label="" inline />
              ) : (
                <FaExchangeAlt size={12} />
              )}
              <span>Save Proxy Assignments ({changedCount()})</span>
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading && <LoadingSpinner label="Loading teacher's schedule…" />}

      {loaded && !loading && schedule.length === 0 && (
        <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-[rgb(var(--primary))] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FaCalendarAlt className="text-2xl text-[rgb(var(--text))]" />
          </div>
          <h2 className="text-base font-semibold text-gray-700 mb-1">
            No periods on {day}
          </h2>
          <p className="text-sm text-[rgb(var(--text))]">
            This teacher has no scheduled periods on the selected date
          </p>
        </div>
      )}

      {loaded && !loading && schedule.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--text))]">
            <FaUserTie className="text-[rgb(var(--primary))]" />
            {teacherName(teacherId)} — {day}, {new Date(date).toLocaleDateString("en-GB")}
            <span className="text-xs font-normal">
              ({schedule.length} periods)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {schedule.map((p, idx) => (
              <div
                key={`${p.classId}-${p.detailId}-${p.periodId}`}
                className={`bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl border shadow-sm p-4 space-y-2.5 ${
                  p.status === "teacher-absent"
                    ? "border-amber-300 ring-1 ring-amber-200"
                    : "border-gray-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wide">
                    {p.periodName}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      p.status === "teacher-absent"
                        ? "bg-amber-50 text-amber-600 border-amber-200"
                        : "bg-emerald-50 text-emerald-600 border-emerald-200"
                    }`}
                  >
                    {p.status === "teacher-absent" ? "Absent" : "Normal"}
                  </span>
                </div>

                <p className="text-xs">
                  <span className="font-bold">{p.className}</span>
                  {p.sectionName ? ` · ${p.sectionName}` : ""}
                </p>
                <p className="font-mono text-xs">{p.start} – {p.end}</p>

                <p className="flex items-center gap-1.5 text-xs">
                  <FaBook size={10} className="text-[rgb(var(--primary))] shrink-0" />
                  {p.subjectName}
                </p>

                <p className="text-xs text-[rgb(var(--text))]">
                  Assigned:{" "}
                  <span className="font-semibold">{originalTeacherOf(p)}</span>
                </p>

                <div>
                  <label className="block text-[10px] font-semibold mb-1">
                    {p.status === "teacher-absent" ? "Proxy Teacher" : "Mark absent & choose proxy"}
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={p.substituteTeacherId || ""}
                      onChange={(e) =>
                        updatePeriod(idx, "substituteTeacherId", e.target.value)
                      }
                      className="text-xs w-full border border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400"
                    >
                      <option value="">No proxy</option>
                      {teachers
                        .filter((t) => String(t._id) !== String(teacherId))
                        .map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.fullName}
                          </option>
                        ))}
                    </select>
                    {p.substituteTeacherId && (
                      <button
                        onClick={() => updatePeriod(idx, "substituteTeacherId", "")}
                        className="text-[10px] font-semibold text-red-500 hover:underline shrink-0"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {p.substituteTeacherId && (
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                      Proxy: {teacherName(p.substituteTeacherId)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}