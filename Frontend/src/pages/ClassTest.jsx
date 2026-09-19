import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaClipboardCheck,
  FaBook,
  FaClock,
  FaUsers,
  FaSchool,
  FaChalkboardTeacher,
  FaTimes,
  FaArrowLeft,
} from "react-icons/fa";
import { FiX, FiCheckCircle } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
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

const formatTimeTo12h = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
};

const EMPTY_FORM = {
  className: "",
  detailId: "",
  sectionId: "",
  subject: "",
  teacherId: "",
  title: "",
  testDate: "",
  startTime: "",
  endTime: "",
  totalMarks: "",
  passingMarks: "",
};

const testPast = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today >= d;
};

export default function ClassTest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;
  const isTeacher = user?.role === "teacher_admin";

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [classFilter, setClassFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [marksTest, setMarksTest] = useState(null);
  const [marksData, setMarksData] = useState(null);
  const [marksLoading, setMarksLoading] = useState(false);
  const [markRows, setMarkRows] = useState([]);

  const [deleteId, setDeleteId] = useState(null);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const url = `${API}/classtest/list${
        classFilter ? `?classId=${classFilter}` : ""
      }`;
      const res = await axios.get(url, { withCredentials: true });
      setTests(res.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load class tests");
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
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
      toast.error("Error loading class/subject/teacher data");
    }
  };

  useEffect(() => {
    loadDropdowns();
  }, []);

  useEffect(() => {
    fetchTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      testDate: new Date().toISOString().split("T")[0],
      startTime: "09:00",
      endTime: "09:40",
      totalMarks: 20,
      passingMarks: 8,
      teacherId: isTeacher ? user?.teacher_id || "" : "",
    });
    setShowModal(true);
  };

  const openEdit = (test) => {
    if (testPast(test.testDate)) {
      toast.error("Past class tests cannot be edited");
      return;
    }
    const cls = classes.find(
      (c) => String(c.classId) === String(test.className?._id || test.className),
    );
    setEditingId(test._id);
    setForm({
      className: test.className?._id || test.className || "",
      detailId: cls?.detailId || "",
      sectionId: test.sectionId?._id || test.sectionId || "",
      subject: test.subject?._id || test.subject || "",
      teacherId: test.teacherId?._id || test.teacherId || "",
      title: test.title || "",
      testDate: String(test.testDate).split("T")[0],
      startTime: test.startTime,
      endTime: test.endTime,
      totalMarks: test.totalMarks,
      passingMarks: test.passingMarks,
    });
    setShowModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`${API}/classtest/delete/${deleteId}`, {
        withCredentials: true,
      });
      toast.success("Class test deleted");
      setTests((p) => p.filter((t) => t._id !== deleteId));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    } finally {
      setDeleteId(null);
    }
  };

  const handleSubmit = async () => {
    if (!form.className || !form.subject || !form.testDate || !form.startTime || !form.endTime || !form.totalMarks || !form.passingMarks) {
      toast.warning("Fill all required fields");
      return;
    }
    if (form.endTime <= form.startTime) {
      toast.error("End time must be after start time");
      return;
    }
    if (!isTeacher && !form.teacherId) {
      toast.warning("Select a teacher");
      return;
    }
    const payload = {
      className: form.className,
      sectionId: form.sectionId || null,
      subject: form.subject,
      teacherId: form.teacherId,
      title: form.title,
      testDate: form.testDate,
      startTime: form.startTime,
      endTime: form.endTime,
      totalMarks: Number(form.totalMarks),
      passingMarks: Number(form.passingMarks),
    };

    setSubmitting(true);
    try {
      if (editingId) {
        await axios.put(`${API}/classtest/edit/${editingId}`, payload, {
          withCredentials: true,
        });
        toast.success("Class test updated");
      } else {
        await axios.post(`${API}/classtest/create`, payload, {
          withCredentials: true,
        });
        toast.success("Class test scheduled");
      }
      setShowModal(false);
      fetchTests();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const openMarks = async (test) => {
    setMarksTest(test);
    setMarksLoading(true);
    setMarkRows([]);
    try {
      const res = await axios.get(`${API}/classtest/${test._id}/students`, {
        withCredentials: true,
      });
      setMarksData(res.data);
      setMarkRows(
        (res.data.students || []).map((s) => ({
          studentId: s._id,
          attendanceStatus: s.result?.attendanceStatus || "Present",
          marksObtained:
            s.result?.marksObtained != null ? s.result.marksObtained : "",
        })),
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load students");
    } finally {
      setMarksLoading(false);
    }
  };

  const updateMarkRow = (idx, field, value) => {
    setMarkRows((rows) => {
      const next = [...rows];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const marksStats = useMemo(() => {
    const present = markRows.filter((r) => r.attendanceStatus === "Present" && r.marksObtained !== "" && r.marksObtained != null);
    if (present.length === 0)
      return { total: markRows.length, present: 0, max: "—", avg: "—" };
    const nums = present.map((r) => Number(r.marksObtained));
    const max = Math.max(...nums);
    const avg = (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
    return { total: markRows.length, present: present.length, max, avg };
  }, [markRows]);

  const submitMarks = async () => {
    if (!marksData?.canEdit) return;
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/classtest/${marksTest._id}/submit`,
        { results: markRows },
        { withCredentials: true },
      );
      toast.success("Marks saved successfully");
      setMarksTest(null);
      setMarksData(null);
      fetchTests();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save marks");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSections = useMemo(() => {
    if (!form.className) return [];
    return classes.filter((c) => String(c.classId) === String(form.className));
  }, [form.className, classes]);

  const field = (k) => form[k];
  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

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

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--text))]">Class Tests</h1>
          <p className="text-sm text-[rgb(var(--text))] mt-0.5">
            Create and manage class tests — they appear on the class timetable
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))] text-xs sm:text-sm font-semibold px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl transition"
        >
          <FaPlus size={12} />
          <span>{isTeacher ? "New Class Test" : "New Class Test"}</span>
        </button>
      </div>

      {!isTeacher && (
        <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <label className="block text-xs font-semibold mb-1.5 text-[rgb(var(--text))]">
            Filter by Class
          </label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full sm:w-64 border border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))] px-3 py-2 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-400"
          >
            <option value="">All Classes</option>
            {[...new Map(classes.map((c) => [String(c.classId), c])).values()].map((c) => (
              <option key={c.classId} value={c.classId}>
                {c.className}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── List ── */}
      {loading ? (
        <LoadingSpinner label="Loading class tests…" />
      ) : tests.length === 0 ? (
        <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-[rgb(var(--primary))] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FaBook className="text-3xl text-[rgb(var(--text))]" />
          </div>
          <h2 className="text-base font-semibold text-gray-700 mb-1">No class tests yet</h2>
          <p className="text-sm text-[rgb(var(--text))]">
            Click "New Class Test" to schedule one
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {tests.map((test) => {
            const past = testPast(test.testDate);
            const subjectName =
              test.subject?.name || test.subject || "Subject";
            return (
              <div
                key={test._id}
                className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[rgb(var(--primary))] flex items-center justify-center text-lg shrink-0">
                      <FaClipboardCheck />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">
                        {test.title || subjectName}
                      </p>
                      <p className="text-xs text-[rgb(var(--text))]">{subjectName}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border ${
                      past
                        ? "bg-gray-100 text-gray-500 border-gray-200"
                        : "bg-emerald-50 text-emerald-600 border-emerald-200"
                    }`}
                  >
                    {past ? "Completed" : "Scheduled"}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="flex items-center gap-2">
                    <FaSchool className="text-[rgb(var(--primary))] shrink-0" />
                    Class {test.className?.name || "—"}
                    {test.sectionId?.name ? ` · ${test.sectionId.name}` : ""}
                  </p>
                  <p className="flex items-center gap-2">
                    <FaClock className="text-[rgb(var(--primary))] shrink-0" />
                    {new Date(test.testDate).toLocaleDateString("en-GB")}
                    {" · "}{DAY_NAMES[new Date(test.testDate).getDay()]}
                    {" · "}
                    {formatTimeTo12h(test.startTime)} - {formatTimeTo12h(test.endTime)}
                  </p>
                  <p className="flex items-center gap-2">
                    <FaChalkboardTeacher className="text-[rgb(var(--primary))] shrink-0" />
                    {test.teacherId?.fullName || "—"}
                  </p>
                  <p className="flex items-center gap-2">
                    <FiCheckCircle className="text-[rgb(var(--primary))] shrink-0" />
                    {test.passingMarks} / {test.totalMarks} Marks
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap mt-auto">
                  <button
                    onClick={() => openMarks(test)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-3 py-1.5 rounded-lg transition"
                  >
                    <FaUsers size={11} />
                    {past ? "View / Enter Marks" : "Students"}
                  </button>
                  {!past && (
                    <>
                      <button
                        onClick={() => openEdit(test)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                      >
                        <FaEdit size={11} />
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(test._id)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition"
                      >
                        <FaTrash size={11} />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-[rgb(var(--surface))] z-10">
              <div>
                <h2 className="text-base font-bold">
                  {editingId ? "Edit Class Test" : "Schedule Class Test"}
                </h2>
                <p className="text-xs text-[rgb(var(--text))]">
                  Test will appear on the class timetable
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">
                    Class &amp; Section
                  </label>
                  <select
                    value={form.className || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      const c = classes.find((c) => String(c.classId) === String(v));
                      set("className", v);
                      set("sectionId", "");
                      set("detailId", c?.detailId || "");
                    }}
                    className="w-full border border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))] px-3 py-2 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-400"
                  >
                    <option value="">Select Class</option>
                    {[...new Map(classes.map((c) => [String(c.classId), c])).values()].map((c) => (
                      <option key={c.classId} value={c.classId}>
                        {c.className}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Section</label>
                  <select
                    value={form.sectionId || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      const c = selectedSections.find((c) => String(c.sectionId || c.detailId) === String(v));
                      set("sectionId", v);
                      set("detailId", c?.detailId || "");
                    }}
                    className="w-full border border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))] px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                  >
                    <option value="">Whole class</option>
                    {selectedSections.map((c) => (
                      <option key={c._id} value={c.sectionId || c.detailId}>
                        {c.sectionName || c.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Subject</label>
                  <select
                    value={field("subject")}
                    onChange={(e) => set("subject", e.target.value)}
                    className="w-full border border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))] px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Title (optional)</label>
                <input
                  type="text"
                  value={field("title")}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Unit Test 1"
                  className="w-full border border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))] px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold mb-1">Test Date</label>
                  <input
                    type="date"
                    value={field("testDate")}
                    onChange={(e) => set("testDate", e.target.value)}
                    className="w-full border border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))] px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Start Time</label>
                  <input
                    type="time"
                    value={field("startTime")}
                    onChange={(e) => set("startTime", e.target.value)}
                    className="w-full border border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))] px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">End Time</label>
                  <input
                    type="time"
                    value={field("endTime")}
                    onChange={(e) => set("endTime", e.target.value)}
                    className="w-full border border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))] px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Total Marks</label>
                  <input
                    type="number"
                    min="1"
                    value={field("totalMarks")}
                    onChange={(e) => set("totalMarks", e.target.value)}
                    className="w-full border border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))] px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Passing Marks</label>
                  <input
                    type="number"
                    min="0"
                    value={field("passingMarks")}
                    onChange={(e) => set("passingMarks", e.target.value)}
                    className="w-full border border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))] px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {!isTeacher && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Teacher</label>
                  <select
                    value={form.teacherId}
                    onChange={(e) => set("teacherId", e.target.value)}
                    className="w-full border border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))] px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
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
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-[rgb(var(--surface))]">
              <button
                onClick={() => setShowModal(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200"
              >
                <FiX size={12} /> Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-[rgb(var(--text))] bg-[rgb(var(--primary))] disabled:opacity-50 min-h-11"
              >
                {submitting ? (
                  <LoadingSpinner size="sm" label="" inline />
                ) : (
                  <>
                    <FaPlus size={12} />
                    {editingId ? "Update Test" : "Schedule Test"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Marks entry modal ── */}
      {marksTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base font-bold">
                  {marksTest.subject?.name || "Class Test"} — Marks Entry
                </h2>
                <p className="text-xs text-[rgb(var(--text))]">
                  {marksData?.test?.className?.name || "Class"} ·{" "}
                  {new Date(marksTest.testDate).toLocaleDateString("en-GB")} ·{" "}
                  {marksTest.totalMarks} Marks
                </p>
              </div>
              <button
                onClick={() => {
                  setMarksTest(null);
                  setMarksData(null);
                }}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
              >
                <FaTimes />
              </button>
            </div>

            <div className="px-6 py-3 flex flex-wrap gap-3 text-xs border-b border-gray-100 shrink-0">
              <span className="font-semibold">Students: {marksData?.totalStudents ?? "…"}</span>
              <span className="font-semibold">Marks entered: {marksData?.marksEntered ?? "…"}</span>
              <span className="font-semibold text-emerald-600">
                Present: {marksStats.present} · Highest: {marksStats.max} · Avg: {marksStats.avg}
              </span>
              {marksData && !marksData.canEdit && (
                <span className="text-amber-600 font-semibold">
                  {!marksData.testDatePast
                    ? "Marks open after the test date"
                    : "Edit window closed"}
                </span>
              )}
            </div>

            {marksLoading ? (
              <div className="p-8">
                <LoadingSpinner label="Loading students…" />
              </div>
            ) : (
              <div className="overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[rgb(var(--surface))]">
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Roll</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                        Marks / {marksData?.test?.totalMarks ?? ""}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(marksData?.students || []).map((s, idx) => (
                      <tr key={s._id} className="border-b border-gray-50">
                        <td className="px-6 py-2.5 font-medium">
                          {s.firstName} {s.lastName}
                        </td>
                        <td className="px-4 py-2.5">{s.rollNo || "—"}</td>
                        <td className="px-4 py-2.5">
                          <select
                            disabled={!marksData?.canEdit}
                            value={markRows[idx]?.attendanceStatus || "Present"}
                            onChange={(e) =>
                              updateMarkRow(idx, "attendanceStatus", e.target.value)
                            }
                            className="text-xs w-full max-w-32 border border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400 disabled:opacity-60"
                          >
                            <option>Present</option>
                            <option>Absent</option>
                            <option>Leave</option>
                          </select>
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            min="0"
                            max={marksData?.test?.totalMarks}
                            disabled={!marksData?.canEdit || markRows[idx]?.attendanceStatus !== "Present"}
                            value={markRows[idx]?.marksObtained ?? ""}
                            onChange={(e) =>
                              updateMarkRow(idx, "marksObtained", e.target.value)
                            }
                            placeholder="—"
                            className="text-xs w-24 border border-gray-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400 disabled:opacity-60"
                          />
                        </td>
                      </tr>
                    ))}
                    {(marksData?.students || []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-sm text-[rgb(var(--text))]">
                          No students in this class/section
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {marksData?.canEdit && (
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end shrink-0">
                <button
                  onClick={submitMarks}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-[rgb(var(--text))] bg-[rgb(var(--primary))] disabled:opacity-50 min-h-11"
                >
                  {submitting ? (
                    <LoadingSpinner size="sm" label="" inline />
                  ) : (
                    <>
                      <FaClipboardCheck size={12} />
                      Save Marks
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-bold mb-2">Delete Class Test?</h3>
            <p className="text-sm text-[rgb(var(--text))] mb-6">
              This will remove the class test and any entered marks permanently.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}