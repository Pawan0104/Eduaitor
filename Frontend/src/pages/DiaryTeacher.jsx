import { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

const EMPTY_FORM = {
  classId: "",
  sectionId: "",
  subjectId: "",
  type: "homework",
  content: "",
  dueDate: "",
};

const TYPE_STYLES = {
  homework: {
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    accent: "border-l-amber-400",
  },
  classwork: {
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    accent: "border-l-blue-400",
  },
  remark: {
    badge: "bg-violet-50 text-violet-700 border border-violet-200",
    accent: "border-l-violet-400",
  },
};

// ─── Validation ────────────────────────────────────────────────────────────────
function validate(form) {
  const errors = {};
  if (!form.classId) errors.classId = "Please select a class";
  if (!form.sectionId) errors.sectionId = "Please select a section";
  if (!form.subjectId) errors.subjectId = "Please select a subject";
  if (!form.content.trim()) errors.content = "Content is required";
  if (form.type === "homework" && !form.dueDate)
    errors.dueDate = "Due date is required for homework";
  return errors;
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium ">{label}</label>}
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Select / Input shared style ───────────────────────────────────────────────
const fieldCls = (err) =>
  `w-full text-sm border rounded-xl px-3 py-2.5 bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-40 transition ${
    err ? "border-red-300" : "border-slate-200"
  }`;

// ─── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ entry, classes, onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Pre-fill form when entry loads
  useEffect(() => {
    if (!entry) return;
    setForm({
      classId: entry.classId?._id || entry.classId || "",
      sectionId: entry.sectionId?._id || entry.sectionId || "",
      subjectId: entry.subjectId?._id || entry.subjectId || "",
      type: entry.type || "homework",
      content: entry.content || "",
      dueDate: entry.dueDate ? entry.dueDate.split("T")[0] : "",
    });
  }, [entry]);

  // Populate sections when classId is set
  useEffect(() => {
    if (!form.classId) {
      setSections([]);
      setSubjects([]);
      return;
    }
    const cls = classes.find((c) => c._id === form.classId);
    setSections(cls?.details || []);
  }, [form.classId, classes]);

  // Populate subjects when sectionId is set
  useEffect(() => {
    if (!form.sectionId) {
      setSubjects([]);
      return;
    }
    const sec = sections.find(
      (s) => s.sectionId?._id?.toString() === form.sectionId,
    );
    setSubjects(sec?.subjectTeachers || []);
  }, [form.sectionId, sections]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await axios.put(`${API}/diary/${entry._id}`, form, {
        withCredentials: true,
      });
      toast.success("Diary entry updated");
      onSaved();
      onClose();
    } catch {
      toast.error("Failed to update entry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-[rgb(var(--surface))]  w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-[rgb(var(--text))]">
            Edit Diary Entry
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg  cursor-pointer text-[rgb(var(--text))] text-lg"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {/* Class */}
          <Field label="Class" error={errors.classId}>
            <select
              className={fieldCls(errors.classId)}
              value={form.classId}
              onChange={(e) => {
                set("classId", e.target.value);
                set("sectionId", "");
                set("subjectId", "");
              }}
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  Class {c.name}
                </option>
              ))}
            </select>
          </Field>

          {/* Section */}
          <Field label="Section" error={errors.sectionId}>
            <select
              className={fieldCls(errors.sectionId)}
              value={form.sectionId}
              disabled={!sections.length}
              onChange={(e) => {
                set("sectionId", e.target.value);
                set("subjectId", "");
              }}
            >
              <option value="">Select section</option>
              {sections.map((s) => (
                <option key={s._id} value={s.sectionId?._id}>
                  {s.sectionId?.name} (Room {s.roomNumber})
                </option>
              ))}
            </select>
          </Field>

          {/* Subject */}
          <Field label="Subject" error={errors.subjectId}>
            <select
              className={fieldCls(errors.subjectId)}
              value={form.subjectId}
              disabled={!subjects.length}
              onChange={(e) => set("subjectId", e.target.value)}
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s.subjectId?._id} value={s.subjectId?._id}>
                  {s.subjectId?.name || "Unknown"}
                </option>
              ))}
            </select>
          </Field>

          {/* Type */}
          <Field label="Entry type">
            <div className="grid grid-cols-3 gap-2">
              {["homework", "classwork", "remark"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("type", t)}
                  className={`py-2 text-xs font-medium rounded-xl border capitalize transition-all ${
                    form.type === t
                      ? TYPE_STYLES[t].badge +
                        " ring-2 ring-offset-1 ring-current/20"
                      : "border-slate-200  hover:bg-[rgb(var(--primary))]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          {/* Content */}
          <Field label="Content" error={errors.content}>
            <textarea
              rows={3}
              placeholder="Describe the task…"
              className={fieldCls(errors.content) + " resize-none"}
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
            />
          </Field>

          {/* Due Date */}
          {form.type === "homework" && (
            <Field label="Due date" error={errors.dueDate}>
              <input
                type="date"
                className={fieldCls(errors.dueDate)}
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </Field>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[rgb(var(--primary))] text-[rgb(var(--text))]transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[rgb(var(--primary))]  disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DiaryTeacher() {
  // Shared state
  const [classes, setClasses] = useState([]);
  const [diaryList, setDiaryList] = useState([]);

  // Add form state
  const [form, setForm] = useState(EMPTY_FORM);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // List state
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const { user, loading, setUser } = useAuth();

  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API}/classes/teacher/my-classes`, {
        withCredentials: true,
      });
      console.log("Classes:", res.data.classes);
      setClasses(res.data.classes);
    } catch {
      toast.error("Failed to load classes");
    }
  };

  const fetchDiary = async () => {
    try {
      const res = await axios.get(`${API}/diary`, { withCredentials: true });
      console.log("Diary entries:", res.data);
      setDiaryList(res.data);
    } catch {
      toast.error("Failed to load diary entries");
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchDiary();
  }, []);

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleClassChange = (classId) => {
    setForm({ ...form, classId, sectionId: "", subjectId: "" });
    setErrors((e) => ({ ...e, classId: undefined }));
    const cls = classes.find((c) => c._id === classId);
    setSections(cls?.details || []);
    setSubjects([]);
  };

  const handleSectionChange = (sectionId) => {
    setForm({ ...form, sectionId, subjectId: "" });
    setErrors((e) => ({ ...e, sectionId: undefined }));
    const sec = sections.find(
      (s) => s.sectionId?._id?.toString() === sectionId,
    );
    const filteredSubjects = sec?.subjectTeachers?.filter(
      (st) => st.teacherId?._id?.toString() === user?.teacher_id?.toString(),
    );
    setSubjects(filteredSubjects || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Please fix the errors before submitting");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/diary`, form, { withCredentials: true });
      toast.success("Diary entry added successfully");
      setForm(EMPTY_FORM);
      setSections([]);
      setSubjects([]);
      setErrors({});
      fetchDiary();
    } catch {
      toast.error("Failed to create diary entry");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/diary/${deleteId}`, { withCredentials: true });
      toast.success("Entry deleted");
      setDeleteId(null);
      fetchDiary();
    } catch {
      toast.error("Failed to delete entry");
    } finally {
      setDeleting(false);
    }
  };

  // ── Format date ────────────────────────────────────────────────────────────
  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";

  return (
    <div className="min-h-screen ">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar
        closeOnClick
        pauseOnHover
      />

      {/* 🔙 BACK BUTTON */}
      {isMobile && (
        <div className="px-4 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                 bg-white shadow-sm border border-slate-100
                 text-sm font-bold text-[rgb(var(--text))] active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* ── Add Form ───────────────────────────────────────────────────────── */}
        <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-[rgb(var(--text))]">
              Add new entry
            </h2>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="px-5 py-4 space-y-4"
          >
            {/* Type toggle */}
            <div className="grid grid-cols-3 gap-2">
              {["homework", "classwork", "remark"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t, dueDate: "" })}
                  className={`py-2.5 text-xs font-medium rounded-xl border capitalize transition-all ${
                    form.type === t
                      ? TYPE_STYLES[t].badge +
                        " ring-2 ring-offset-1 ring-current/20"
                      : "border-slate-200 text-[rgb(var(--text))] hover:bg-[rgb(var(--primary))]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Class + Section row */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Class" error={errors.classId}>
                <select
                  className={`${fieldCls(errors.classId)} text-[rgb(var(--text))] bg-[rgb(var(--surface))] `}
                  value={form.classId}
                  onChange={(e) => handleClassChange(e.target.value)}
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option
                      key={c._id}
                      value={c._id}
                      className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                    >
                      Class {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Section" error={errors.sectionId}>
                <select
                  className={fieldCls(errors.sectionId)}
                  value={form.sectionId}
                  disabled={!sections.length}
                  onChange={(e) => handleSectionChange(e.target.value)}
                >
                  <option value="">Select section</option>
                  {sections.map((s) => (
                    <option key={s._id} value={s.sectionId?._id}>
                      {s.sectionId?.name} (Room {s.roomNumber})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Subject */}
            <Field label="Subject" error={errors.subjectId}>
              <select
                className={fieldCls(errors.subjectId)}
                value={form.subjectId}
                disabled={!subjects.length}
                onChange={(e) =>
                  setForm({ ...form, subjectId: e.target.value })
                }
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.subjectId?._id} value={s.subjectId?._id}>
                    {s.subjectId?.name || "Unknown"}
                  </option>
                ))}
              </select>
            </Field>

            {/* Content */}
            <Field label="Content" error={errors.content}>
              <textarea
                rows={3}
                placeholder="Describe the task or write a remark…"
                className={fieldCls(errors.content) + " resize-none"}
                value={form.content}
                onChange={(e) => {
                  setForm({ ...form, content: e.target.value });
                  if (errors.content)
                    setErrors((er) => ({ ...er, content: undefined }));
                }}
              />
            </Field>

            {/* Due Date — only for homework */}
            {form.type === "homework" && (
              <Field label="Due date" error={errors.dueDate}>
                <input
                  type="date"
                  className={fieldCls(errors.dueDate)}
                  value={form.dueDate}
                  onChange={(e) => {
                    setForm({ ...form, dueDate: e.target.value });
                    if (errors.dueDate)
                      setErrors((er) => ({ ...er, dueDate: undefined }));
                  }}
                />
              </Field>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl text-sm font-medium text-[rgb(var(--text))] bg-[rgb(var(--primary))] active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              {submitting ? "Adding…" : "Add Entry"}
            </button>
          </form>
        </div>

        {/* ── Diary List ────────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-semibold text-[rgb(var(--text))] uppercase tracking-widest mb-3 px-1">
            All entries
          </h2>

          {diaryList.length === 0 ? (
            <div className="bg-[rgb(var(--surface))] rounded-2xl border border-slate-200 py-12 text-center">
              <p className="text-sm text-[rgb(var(--text))]">
                No diary entries yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {diaryList.map((d) => {
                const ts = TYPE_STYLES[d.type] || TYPE_STYLES.remark;
                return (
                  <div
                    key={d._id}
                    className={`bg-[rgb(var(--surface))] rounded-2xl border border-slate-200 border-l-4 ${ts.accent} p-4`}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${ts.badge}`}
                        >
                          {d.type}
                        </span>
                        {d.classId?.name && (
                          <span className="text-xs text-[rgb(var(--text))]">
                            Class {d.classId.name}
                            {d.sectionId?.name
                              ? ` · Sec ${d.sectionId.name}`
                              : ""}
                          </span>
                        )}
                        {d.subjectId?.name && (
                          <span className="text-xs px-2 py-0.5 rounded-full">
                            {d.subjectId.name}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditEntry(d)}
                          className="p-1.5 rounded-lg text-[rgb(var(--text))] hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteId(d._id)}
                          className="p-1.5 rounded-lg text-[rgb(var(--text))] hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-sm text-[rgb(var(--text))] leading-relaxed">
                      {d.content}
                    </p>

                    {/* Footer */}
                    {d.type === "homework" && d.dueDate && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <svg
                          className="w-3.5 h-3.5 text-amber-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-xs text-amber-700 font-medium">
                          Due {fmtDate(d.dueDate)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
      {editEntry && (
        <EditModal
          entry={editEntry}
          classes={classes}
          onClose={() => setEditEntry(null)}
          onSaved={fetchDiary}
        />
      )}

      {/* ── Delete Confirm ──────────────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl shadow-xl p-6 w-full max-w-xs">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <svg
                className="w-5 h-5 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-[rgb(var(--text))] mb-1">
              Delete entry?
            </h3>
            <p className="text-xs text-[rgb(var(--text))] mb-5 leading-relaxed">
              This will permanently remove the diary entry. Students and parents
              will no longer see it.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-[rgb(var(--bg))] text-[rgb(var(--text))] hover:bg-[rgb(var(--surface))] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
