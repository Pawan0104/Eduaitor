import { useEffect, useState } from "react";
import axios from "axios";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import { toast } from "react-toastify";
import {
  FaSave,
  FaEdit,
  FaClock,
  FaPlus,
  FaTrash,
  FaUserTie,
  FaBook,
  FaCoffee,
  FaRunning,
} from "react-icons/fa";
import { MdOutlineClass } from "react-icons/md";
import { FiX } from "react-icons/fi";

const API = import.meta.env.VITE_API_URL;

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function TimeTable() {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  /* selected flat entry */
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [classId, setClassId] = useState("");
  const [detailId, setDetailId] = useState("");

  const [isEditMode, setIsEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);

  const [savedPeriodConfigs, setSavedPeriodConfigs] = useState([]);
  const [savedAssignments, setSavedAssignments] = useState({});

  const [periodConfigs, setPeriodConfigs] = useState([
    { id: "P1", name: "Period 1", start: "08:00", end: "08:45" },
    { id: "P2", name: "Period 2", start: "08:45", end: "09:30" },
    { id: "P3", name: "Period 3", start: "09:30", end: "10:15" },
  ]);

  const [assignments, setAssignments] = useState({});

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
      toast.error("Error loading data");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ── fetch timetable when selection changes ── */
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
        const pc = res.data.data.periodConfigs || [];
        const as = res.data.data.assignments || {}; 
        setPeriodConfigs(pc);
        setAssignments(as);
        setSavedPeriodConfigs(pc);
        setSavedAssignments(as);
        setIsEditMode(false);
      } else {
        setAssignments({});
        setIsEditMode(true);
      }
    } catch {
      setAssignments({});
      setIsEditMode(true);
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
      setAssignments({});
      setIsEditMode(false);
    }
    setHasChanges(false);
  };

  /* ── period config ── */
  const addPeriodSlot = () => {
    setPeriodConfigs((p) => [
      ...p,
      { id: `P${Date.now()}`, name: "New Period", start: "", end: "" },
    ]);
  };

  const deletePeriodSlot = (id) => {
    setPeriodConfigs((p) => p.filter((x) => x.id !== id));
    const updated = { ...assignments };
    DAYS.forEach((day) => {
      if (updated[day]) delete updated[day][id];
    });
    setAssignments(updated);
  };

  const updatePeriodConfig = (index, field, value) => {
    setPeriodConfigs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  /* ── assignments ── */
  const updateAssignment = (day, pId, field, value) => {
    setAssignments((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [pId]: { ...(prev[day]?.[pId] || { type: "lecture" }), [field]: value },
      },
    }));
    setHasChanges(true);
  };

  /* ── save ── */
  const saveDraft = async () => {
    if (!classId) return toast.warning("Select a class first");
    try {
      await axios.post(
        `${API}/timetable/save`,
        {
          classId,
          detailId: detailId || null,
          periodConfigs,
          assignments,
        },
        { withCredentials: true },
      );
      toast.success("Timetable saved successfully!");
      setIsEditMode(false);
      setHasChanges(false);
    } catch {
      toast.error("Save failed");
    }
  };

  const saveTeacherUpdate = async () => {
    try {
      await axios.post(
        `${API}/timetable/save`,
        {
          classId,
          detailId: detailId || null,
          periodConfigs,
          assignments,
        },
        { withCredentials: true },
      );
      toast.success("Teacher assignment updated!");
      setHasChanges(false);
      fetchTimetable();
    } catch {
      toast.error("Update failed");
    }
  };

  /* ── cell style ── */
  const getCellStyle = (data) => {
    if (data?.type === "lecture" && !data?.teacherId)
      return "bg-red-50 border border-red-200";
    if (data?.status === "teacher-absent")
      return "bg-yellow-50 border border-yellow-300";
    return "";
  };

  /* ── subject / teacher name lookup ── */
  const subjectName = (id) => subjects.find((s) => s._id === id)?.name || "";
  const teacherName = (id) =>
    teachers.find((t) => t._id === id)?.fullName || "";

  const cancelEdit = () => {
    // restore to last saved state
    setPeriodConfigs(savedPeriodConfigs);
    setAssignments(savedAssignments);
    setHasChanges(false);
    setIsEditMode(false);
  };

  /* ════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 p-8">
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                 bg-[rgb(var(--primary))] shadow-sm border border-slate-100
                 text-sm font-bold text-[rgb(var(--text))] active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-[rgb(var(--text))]">Timetable</h1>
        <p className="text-sm text-[rgb(var(--text))] mt-0.5">
          Create and manage class timetables
        </p>
      </div>

      {/* ── Control Bar ── */}
      <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left — class selector */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary))] flex items-center justify-center text-lg shrink-0">
              <MdOutlineClass />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-semibold mb-1">
                Select Class &amp; Section
              </label>
              <select
                value={selectedEntry?._id || ""}
                onChange={handleClassChange}
                className="w-full sm:w-64 border border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))]  px-3 py-2 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-400"
              >
                <option value="" className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">Choose Class</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id} className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right — action buttons */}
          {classId && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Save substitution — view mode only */}
              {hasChanges && !isEditMode && (
                <button
                  onClick={saveTeacherUpdate}
                  className="flex items-center gap-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))] text-xs sm:text-sm font-semibold px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl transition"
                >
                  <FaSave size={12} />
                  <span>Save Changes</span>
                </button>
              )}

              {isEditMode ? (
                <>
                  {/* Cancel — only if existing timetable */}
                  {savedPeriodConfigs.length > 0 && (
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))] text-xs sm:text-sm font-semibold px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl transition"
                    >
                      <FiX size={12} />
                      <span>Cancel</span>
                    </button>
                  )}
                  <button
                    onClick={saveDraft}
                    className="flex items-center gap-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))]  text-xs sm:text-sm font-semibold px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl transition"
                  >
                    <FaSave size={12} />
                    <span>Save Timetable</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center gap-2 bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-hover))] text-[rgb(var(--text))] text-xs sm:text-sm font-semibold px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl transition"
                >
                  <FaEdit size={12} />
                  <span>Edit Timetable</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {!classId && (
        <div className="bg-[rgb(var(--primary))]  rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-[rgb(var(--primary))] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MdOutlineClass className="text-3xl text-[rgb(var(--text))]" />
          </div>
          <h2 className="text-base font-semibold text-gray-700 mb-1">
            Select a Class to Continue
          </h2>
          <p className="text-sm text-[rgb(var(--text))]">
            Choose a class or section above to create or view its timetable
          </p>
        </div>
      )}

      {/* ── Loading ── */}
      {classId && loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Edit Mode ── */}
      {classId && !loading && isEditMode && (
        <div className="space-y-6">
          {/* Step 1 — Period timings */}
          <div className="bg-[rgb(var(--surface))]  rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FaClock className="text-[rgb(var(--text))]" />
                Step 1 — Define Period Timings
              </h3>
              <button
                onClick={addPeriodSlot}
                className="flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--text))] bg-[rgb(var(--primary))]  px-3 py-1.5 rounded-lg transition"
              >
                <FaPlus size={10} /> Add Period
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {periodConfigs.map((p, idx) => (
                <div
                  key={p.id}
                  className="relative group  border-gray-200 rounded-xl p-3 space-y-2"
                >
                  {/* delete */}
                  <button
                    onClick={() => deletePeriodSlot(p.id)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                  >
                    <FaTrash size={8} />
                  </button>

                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) =>
                      updatePeriodConfig(idx, "name", e.target.value)
                    }
                    className="text-[10px] font-bold text-[rgb(var(--text))] uppercase w-full bg-transparent border-none p-0 focus:outline-none"
                  />
                  <input
                    type="time"
                    value={p.start}
                    onChange={(e) =>
                      updatePeriodConfig(idx, "start", e.target.value)
                    }
                    className="text-xs w-full px-2 py-1 rounded-lg border text-[rgb(var(--text))]  border-gray-200 focus:outline-none focus:border-indigo-400"
                  />
                  <input
                    type="time"
                    value={p.end}
                    onChange={(e) =>
                      updatePeriodConfig(idx, "end", e.target.value)
                    }
                    className="text-xs w-full px-2 py-1 rounded-lg border text-[rgb(var(--text))] border-gray-200 focus:outline-none focus:border-indigo-400"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Step 2 — Assignments */}
          <div>
            <h3 className="text-sm font-bold  flex items-center gap-2 mb-4">
              <MdOutlineClass className="bg-[rgb(var(--primary))]" />
              Step 2 — Assign Subjects &amp; Teachers
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="bg-[rgb(var(--surface))]  rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <div className=" px-4 py-3 text-xs font-bold uppercase tracking-widest text-center">
                    {day}
                  </div>
                  <div className="p-4 space-y-3">
                    {periodConfigs.map((p) => {
                      const data = assignments[day]?.[p.id] || {
                        type: "lecture",
                      };
                      return (
                        <div
                          key={p.id}
                          className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] border border-gray-200 rounded-xl p-3 space-y-2"
                        >
                          {/* period name + type */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold  uppercase">
                              {p.name}
                            </span>
                            <select
                              value={data.type}
                              onChange={(e) =>
                                updateAssignment(
                                  day,
                                  p.id,
                                  "type",
                                  e.target.value,
                                )
                              }
                              className="text-[10px] font-bold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none bg-[rgb(var(--surface))] text-[rgb(var(--text))] "
                            >
                              <option value="lecture">Lecture</option>
                              <option value="lunch">Lunch/Break</option>
                              <option value="activity">Activity</option>
                              <option value="free">Free</option>
                            </select>
                          </div>

                          {/* lecture */}
                          {data.type === "lecture" && (
                            <div className="space-y-1.5">
                              <select
                                value={data.subjectId || ""}
                                onChange={(e) =>
                                  updateAssignment(
                                    day,
                                    p.id,
                                    "subjectId",
                                    e.target.value,
                                  )
                                }
                                className="text-xs w-full px-2 py-1.5 border border-gray-200 rounded-lg  focus:outline-none focus:border-indigo-400 text-[rgb(var(--text))] bg-[rgb(var(--surface))] "
                              >
                                <option value="">Select Subject</option>
                                {subjects.map((s) => (
                                  <option key={s._id} value={s._id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={data.teacherId || ""}
                                onChange={(e) =>
                                  updateAssignment(
                                    day,
                                    p.id,
                                    "teacherId",
                                    e.target.value,
                                  )
                                }
                                className="text-xs w-full px-2 py-1.5 border border-gray-200 rounded-lg  focus:outline-none focus:border-indigo-400 text-[rgb(var(--text))] bg-[rgb(var(--surface))]  "
                              >
                                <option value="">Select Teacher</option>
                                {teachers.map((t) => (
                                  <option key={t._id} value={t._id}>
                                    {t.fullName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* activity */}
                          {data.type === "activity" && (
                            <input
                              type="text"
                              placeholder="e.g. Sports, Assembly"
                              value={data.customName || ""}
                              onChange={(e) =>
                                updateAssignment(
                                  day,
                                  p.id,
                                  "customName",
                                  e.target.value,
                                )
                              }
                              className="text-xs w-full px-2 py-1.5 border border-gray-200 rounded-lg text-[rgb(var(--text))] bg-[rgb(var(--surface))] focus:outline-none focus:border-indigo-400"
                            />
                          )}

                          {/* lunch */}
                          {data.type === "lunch" && (
                            <div className="flex items-center justify-center gap-2 py-2 bg-orange-50 rounded-lg text-orange-500 text-[10px] font-bold">
                              <FaCoffee /> LUNCH BREAK
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── View Mode ── */}
      {classId && !loading && !isEditMode && (
        <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="">
                <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wider border-r border-gray-700 min-w-32.5">
                  Time Slot
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="px-4 py-4 font-semibold text-xs uppercase tracking-wider text-center min-w-35"
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
                  className={`border-b border-gray-100 `}
                >
                  {/* time slot */}
                  <td className="px-5 py-4 border-r border-gray-100">
                    <p className="text-xs font-bold text-[rgb(var(--text))] uppercase">
                      {p.name}
                    </p>
                    <p className="text-[10px]  font-mono mt-0.5">
                      {p.start} – {p.end}
                    </p>
                  </td>

                  {/* day cells */}
                  {DAYS.map((day) => {
                    const data = assignments[day]?.[p.id];
                    return (
                      <td
                        key={day}
                        className={`px-3 py-3 text-center align-top ${getCellStyle(data)} text-[rgb(var(--text))] bg-[rgb(var(--surface))]`}
                      >
                        {data?.type === "lecture" ? (
                          <div className="text-left space-y-1 ">
                            {data.subjectId && (
                              <div className="flex items-center gap-1.5 text-xs font-bold ">
                                <FaBook
                                  size={10}
                                  className="text-indigo-400 shrink-0"
                                />
                                {subjectName(data.subjectId)}
                              </div>
                            )}

                            {data.teacherId ? (
                              <div className="flex items-center gap-1.5 text-[11px] ">
                                <FaUserTie
                                  size={10}
                                  className=" shrink-0"
                                />
                                {teacherName(data.teacherId)}
                              </div>
                            ) : (
                              <>
                                <p className="text-[10px] text-red-500 font-bold">
                                  No Teacher
                                </p>
                                <select
                                  className="text-[10px] border border-gray-200 rounded-lg px-1.5 py-1 w-full bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none"
                                  onChange={(e) =>
                                    updateAssignment(
                                      day,
                                      p.id,
                                      "teacherId",
                                      e.target.value,
                                    )
                                  }
                                >
                                  <option className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">Assign Teacher</option>
                                  {teachers.map((t) => (
                                    <option key={t._id} value={t._id} className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]">
                                      {t.fullName}
                                    </option>
                                  ))}
                                </select>
                              </>
                            )}

                            {data.status === "teacher-absent" && (
                              <div className="mt-1">
                                <p className="text-[10px] text-amber-500 font-bold">
                                  Teacher Absent
                                </p>
                                <select
                                  className="text-[10px] border border-gray-200 rounded-lg px-1.5 py-1 w-full bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none"
                                  onChange={(e) =>
                                    updateAssignment(
                                      day,
                                      p.id,
                                      "substituteTeacherId",
                                      e.target.value,
                                    )
                                  }
                                >
                                  <option>Select Substitute</option>
                                  {teachers.map((t) => (
                                    <option key={t._id} value={t._id}>
                                      {t.fullName}
                                    </option>
                                  ))}
                                </select>
                              </div>
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
                          <span className="text-[10px] text-gray-300 italic">
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