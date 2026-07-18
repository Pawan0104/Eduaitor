import { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaHourglassHalf,
  FaTrash,
  FaEye,
} from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

const EMPTY_FORM = {
  classId: "",
  sectionId: "",
  subjectId: "",
  title: "",
  description: "",
  dueDate: "",
};

const STATUS = {
  assigned: {
    label: "Assigned",
    color: "bg-slate-100 text-slate-600",
    icon: <FaClock size={11} />,
  },
  marked_done: {
    label: "Awaiting approval",
    color: "bg-amber-100 text-amber-700",
    icon: <FaHourglassHalf size={11} />,
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-700",
    icon: <FaCheckCircle size={11} />,
  },
};

function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-[rgb(var(--text))]">
          {label}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

const fieldCls = (err) =>
  `w-full text-sm border rounded-xl px-3 py-2.5 bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-40 transition ${
    err ? "border-red-300" : "border-slate-200"
  }`;

function validate(form) {
  const errors = {};
  if (!form.classId) errors.classId = "Select a class";
  if (!form.sectionId) errors.sectionId = "Select a section";
  if (!form.subjectId) errors.subjectId = "Select a subject";
  if (!form.title.trim()) errors.title = "Title is required";
  if (!form.description.trim()) errors.description = "Description is required";
  if (!form.dueDate) errors.dueDate = "Due date is required";
  return errors;
}

function ReviewModal({ homework, onClose, onSaved }) {
  const [remarkDrafts, setRemarkDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    if (!homework) return;
    const drafts = {};
    (homework.students || []).forEach((s) => {
      const sid = s.studentId?._id || s.studentId;
      drafts[sid] = s.teacherRemark || "";
    });
    setRemarkDrafts(drafts);
  }, [homework]);

  if (!homework) return null;

  const review = async (studentId, approve) => {
    setSavingId(`${studentId}-${approve ? "a" : "r"}`);
    try {
      await axios.post(
        `${API}/homework/${homework._id}/review`,
        {
          studentId,
          remark: remarkDrafts[studentId] || "",
          approve,
        },
        { withCredentials: true },
      );
      toast.success(approve ? "Homework approved" : "Remark saved");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update");
    } finally {
      setSavingId(null);
    }
  };

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-[rgb(var(--surface))] w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-[rgb(var(--text))]">
              {homework.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Due {fmt(homework.dueDate)} · Class{" "}
              {homework.classId?.name || "—"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer text-[rgb(var(--text))] text-lg"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {(homework.students || []).length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No students on this homework
            </p>
          ) : (
            homework.students.map((s) => {
              const sid = s.studentId?._id || s.studentId;
              const name = s.studentId
                ? `${s.studentId.firstName || ""} ${s.studentId.lastName || ""}`.trim()
                : "Student";
              const st = STATUS[s.status] || STATUS.assigned;
              const busy = savingId?.startsWith(String(sid));

              return (
                <div
                  key={sid}
                  className="border border-slate-200 rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[rgb(var(--text))]">
                        {name}
                      </p>
                      {s.markedDoneAt && (
                        <p className="text-[11px] text-slate-500">
                          Marked done by {s.markedDoneBy || "—"} ·{" "}
                          {fmt(s.markedDoneAt)}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full ${st.color}`}
                    >
                      {st.icon}
                      {st.label}
                    </span>
                  </div>

                  <textarea
                    rows={2}
                    className={fieldCls(false)}
                    placeholder="Teacher remark (visible to parent & student)"
                    value={remarkDrafts[sid] || ""}
                    onChange={(e) =>
                      setRemarkDrafts((d) => ({
                        ...d,
                        [sid]: e.target.value,
                      }))
                    }
                    disabled={s.status === "completed"}
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy || s.status === "completed"}
                      onClick={() => review(sid, false)}
                      className="flex-1 py-2 rounded-xl text-xs font-medium border border-slate-200 text-[rgb(var(--text))] disabled:opacity-50"
                    >
                      Save remark
                    </button>
                    <button
                      type="button"
                      disabled={
                        busy ||
                        s.status === "completed" ||
                        s.status !== "marked_done"
                      }
                      onClick={() => review(sid, true)}
                      className="flex-1 py-2 rounded-xl text-xs font-medium bg-[rgb(var(--primary))] text-[rgb(var(--text))] disabled:opacity-50"
                    >
                      Approve & complete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomeworkTeacher() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [classes, setClasses] = useState([]);
  const [list, setList] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reviewHw, setReviewHw] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API}/classes/all`, {
        withCredentials: true,
      });
      setClasses(res.data.classes || []);
    } catch {
      toast.error("Failed to load classes");
    }
  };

  const fetchList = async () => {
    try {
      const res = await axios.get(`${API}/homework/teacher`, {
        withCredentials: true,
      });
      setList(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load homework");
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchList();
  }, []);

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
    const filtered = sec?.subjectTeachers?.filter(
      (st) => st.teacherId?._id?.toString() === user?.teacher_id?.toString(),
    );
    setSubjects(filtered || []);
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
      await axios.post(`${API}/homework`, form, { withCredentials: true });
      toast.success("Homework assigned — parents notified");
      setForm(EMPTY_FORM);
      setSections([]);
      setSubjects([]);
      setErrors({});
      fetchList();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to assign homework");
    } finally {
      setSubmitting(false);
    }
  };

  const openReview = async (id) => {
    setLoadingReview(true);
    try {
      const res = await axios.get(`${API}/homework/${id}`, {
        withCredentials: true,
      });
      setReviewHw(res.data);
    } catch {
      toast.error("Failed to load student statuses");
    } finally {
      setLoadingReview(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/homework/${deleteId}`, {
        withCredentials: true,
      });
      toast.success("Homework deleted");
      setDeleteId(null);
      fetchList();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";

  const counts = (hw) => {
    const students = hw.students || [];
    return {
      total: students.length,
      done: students.filter((s) => s.status === "marked_done").length,
      completed: students.filter((s) => s.status === "completed").length,
    };
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 text-[rgb(var(--text))]">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

      {isMobile && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white shadow-sm border border-slate-100 text-sm font-bold text-slate-600 mb-3"
        >
          <FaArrowLeft size={16} /> Back
        </button>
      )}

      <h1 className="text-lg font-semibold mb-4">Homework</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-[rgb(var(--surface))] border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 mb-6"
      >
        <p className="text-sm font-medium">Assign new homework</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Class" error={errors.classId}>
            <select
              className={fieldCls(errors.classId)}
              value={form.classId}
              onChange={(e) => handleClassChange(e.target.value)}
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
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
                  {s.sectionId?.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subject" error={errors.subjectId}>
            <select
              className={fieldCls(errors.subjectId)}
              value={form.subjectId}
              disabled={!subjects.length}
              onChange={(e) =>
                setForm((f) => ({ ...f, subjectId: e.target.value }))
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
        </div>

        <Field label="Title" error={errors.title}>
          <input
            className={fieldCls(errors.title)}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Chapter 5 exercises"
          />
        </Field>

        <Field label="Description" error={errors.description}>
          <textarea
            rows={3}
            className={fieldCls(errors.description)}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="What should students do?"
          />
        </Field>

        <Field label="Due date" error={errors.dueDate}>
          <input
            type="date"
            className={fieldCls(errors.dueDate)}
            value={form.dueDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, dueDate: e.target.value }))
            }
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium bg-[rgb(var(--primary))] disabled:opacity-60"
        >
          {submitting ? "Assigning…" : "Assign homework"}
        </button>
      </form>

      <div className="space-y-3">
        <p className="text-sm font-medium">Your assigned homework</p>
        {list.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-10">
            No homework assigned yet
          </p>
        ) : (
          list.map((hw) => {
            const c = counts(hw);
            return (
              <div
                key={hw._id}
                className="bg-[rgb(var(--surface))] border border-slate-200 border-l-4 border-l-amber-400 rounded-xl p-4"
              >
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate">
                      {hw.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {hw.subjectId?.name || "Subject"} · Class{" "}
                      {hw.classId?.name} · Due {fmtDate(hw.dueDate)}
                    </p>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                      {hw.description}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2">
                      {c.completed}/{c.total} completed · {c.done} awaiting
                      approval
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={loadingReview}
                      onClick={() => openReview(hw._id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-200"
                    >
                      <FaEye size={12} /> Review
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(hw._id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-600 border border-red-100"
                    >
                      <FaTrash size={11} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {reviewHw && (
        <ReviewModal
          homework={reviewHw}
          onClose={() => setReviewHw(null)}
          onSaved={async () => {
            const res = await axios.get(`${API}/homework/${reviewHw._id}`, {
              withCredentials: true,
            });
            setReviewHw(res.data);
            fetchList();
          }}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-[rgb(var(--surface))] rounded-2xl p-5 w-full max-w-sm space-y-4">
            <p className="text-sm font-medium">Delete this homework?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2 rounded-xl text-sm border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="flex-1 py-2 rounded-xl text-sm bg-red-500 text-white disabled:opacity-60"
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
