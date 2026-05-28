import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaPlus,
  FaBook,
  FaEdit,
  FaTrash,
  FaLayerGroup,
  FaArrowLeft,
} from "react-icons/fa";
import { FiX, FiCheckCircle, FiAlertTriangle } from "react-icons/fi";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const EMPTY_FORM = { name: "", status: "Active" };

export default function Subject() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const isMobile = window.innerWidth <= 768;

  /* ── fetch ── */
  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/subjects/all`, {
        withCredentials: true,
      });
      setSubjects(data.subjects || []);
    } catch {
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  /* ── stats ── */
  const totalSubjects = subjects.length;
  const activeSubjects = subjects.filter((s) => s.status === "Active").length;
  const inactiveSubjects = subjects.filter(
    (s) => s.status === "Inactive",
  ).length;
  const usedSubjects = subjects.filter((s) => s.classCount > 0).length;

  /* ── dirty check ── */
  const isFormDirty = () =>
    JSON.stringify(form) !== JSON.stringify(initialForm);

  /* ── modal helpers ── */
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setInitialForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (sub) => {
    const f = { name: sub.name, status: sub.status };
    setEditing(sub);
    setForm(f);
    setInitialForm(f);
    setShowModal(true);
  };

  const tryClose = () => {
    if (isFormDirty()) setConfirmDiscard(true);
    else closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setConfirmDiscard(false);
    setConfirmSave(false);
  };

  /* ── submit ── */
  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Subject name is required");
      return;
    }
    setConfirmSave(true);
  };

  const confirmAndSave = async () => {
    setConfirmSave(false);
    try {
      setSubmitting(true);
      if (editing) {
        await axios.put(
          `${API}/subjects/update/${editing._id}`,
          {
            ...form,
          },
          { withCredentials: true },
        );
        toast.success("Subject updated successfully!");
      } else {
        await axios.post(
          `${API}/subjects/create`,
          {
            ...form,
          },
          { withCredentials: true },
        );
        toast.success("Subject created successfully!");
      }
      closeModal();
      fetchSubjects();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/subjects/delete/${deleteId}`, {
        withCredentials: true,
      });
      toast.success("Subject deleted successfully!");
      setDeleteId(null);
      fetchSubjects();
    } catch {
      toast.error("Failed to delete subject.");
      setDeleteId(null);
    }
  };

  /* ════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 p-8 bg-[rgb(var(--surface))] text-[rgb(var(--text))]">
      {/* ── Header ── */}
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
          <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[rgb(var(--text))] bg-[rgb(var(--primary))]
                  shadow-sm border border-slate-100
                 text-sm font-bold  active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ">
        <div>
          <h1 className="text-2xl font-bold ">Subjects</h1>
          <p className="text-sm  mt-0.5">Manage school subjects</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))] text-sm font-semibold px-5 py-2.5 rounded-xl transition shrink-0"
        >
          <FaPlus size={12} /> Add Subject
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <FaLayerGroup />,
            label: "TOTAL SUBJECTS",
            value: totalSubjects,
            bg: "bg-blue-50 text-blue-500",
          },
          {
            icon: <FaBook />,
            label: "ACTIVE",
            value: activeSubjects,
            bg: "bg-green-50 text-green-500",
          },
          {
            icon: <FaBook />,
            label: "INACTIVE",
            value: inactiveSubjects,
            bg: "bg-red-50 text-red-500",
          },
          {
            icon: <FaBook />,
            label: "USED IN CLASSES",
            value: usedSubjects,
            bg: "bg-purple-50 text-purple-500",
          },
        ].map((s, i) => (
          <div
            key={i}
            className=" rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4"
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${s.bg}`}
            >
              {s.icon}
            </div>
            <div>
              <p className="text-xs text-[rgb(var(--text))] font-medium tracking-wide">
                {s.label}
              </p>
              <p className="text-2xl font-bold text-[rgb(var(--text))] leading-tight">
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Subject Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-20 text-[rgb(var(--text))] text-sm">
          No subjects found. Add your first subject!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {subjects.map((sub) => (
            <div
              key={sub._id}
              className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition flex flex-col gap-4"
            >
              {/* top row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[rgb(var(--primary))] text-[rgb(var(--text))] flex items-center justify-center text-base shrink-0">
                    <FaBook />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight">
                      {sub.name}
                    </h3>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${
                        sub.status === "Active"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-500"
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>
                </div>

                {/* actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(sub)}
                    className="text-amber-500 hover:bg-amber-50 p-1.5 rounded-lg transition"
                  >
                    <FaEdit size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteId(sub._id)}
                    className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>

              {/* class usage */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs  font-medium mb-2">
                  Used in{" "}
                  <span className=" font-semibold">
                    {sub.classCount || 0}
                  </span>{" "}
                  class{sub.classCount !== 1 ? "es" : ""}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sub.classes?.length > 0 ? (
                    sub.classes.map((cls) => (
                      <span
                        key={cls._id}
                        className="text-[11px] font-medium px-2.5 py-0.5 rounded-full   border border-indigo-100"
                      >
                        {cls.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs  italic">
                      Not assigned to any class
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════ Add / Edit Modal ════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50  flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--surface))] rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-[rgb(var(--text))]">
                {editing ? "Edit Subject" : "Add Subject"}
              </h2>
              <button
                onClick={tryClose}
                className=""
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 text-[rgb(var(--text))]">
              <div>
                <label className="block text-sm font-medium  mb-1">
                  Subject Name <span className="text-pink-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Mathematics, Science"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium  mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, status: e.target.value }))
                  }
                  className="w-full border bg-[rgb(var(--surface))] text-[rgb(var(--text))] border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={tryClose}
                className="px-5 py-2 text-sm font-medium text-[rgb(var(--text))] bg-[rgb(var(--primary))] rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 text-sm font-semibold  bg-[rgb(var(--primary))] text-[rgb(var(--text))] rounded-lg transition disabled:opacity-60"
              >
                {editing ? "Update Subject" : "Save Subject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Save Confirm ════════ */}
      {confirmSave && (
        <ConfirmPopup
          icon={<FiCheckCircle size={22} className="text-[rgb(var(--text))]" />}
          iconBg="bg-[rgb(var(--primary))]"
          strip="bg-[rgb(var(--primary))]"
          title={editing ? "Update this subject?" : "Create this subject?"}
          message={`"${form.name}" will be marked as ${form.status}`}
          confirmLabel={submitting ? "Saving…" : "Yes, Save"}
          confirmCls="bg-[rgb(var(--primary))]"
          onConfirm={confirmAndSave}
          onCancel={() => setConfirmSave(false)}
          disabled={submitting}
        />
      )}

      {/* ════════ Discard Confirm ════════ */}
      {confirmDiscard && (
        <ConfirmPopup
          icon={<FiAlertTriangle size={22} className="text-amber-500" />}
          iconBg="bg-amber-100"
          strip="bg-amber-400"
          title="Discard changes?"
          message="You have unsaved changes. If you close now all changes will be lost."
          confirmLabel="Yes, Discard"
          confirmCls="bg-amber-500 hover:bg-amber-600"
          cancelLabel="Keep Editing"
          onConfirm={closeModal}
          onCancel={() => setConfirmDiscard(false)}
        />
      )}

      {/* ════════ Delete Confirm ════════ */}
      {deleteId && (
        <ConfirmPopup
          icon={<FaTrash size={18} className="text-red-500" />}
          iconBg="bg-red-100"
          strip="bg-red-500"
          title="Delete this subject?"
          message="This action cannot be undone. The subject will be removed from all classes."
          confirmLabel="Delete"
          confirmCls="bg-red-500 hover:bg-red-600"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}

/* ── Reusable Confirm Popup ── */
function ConfirmPopup({
  icon,
  iconBg,
  strip,
  title,
  message,
  confirmLabel = "Confirm",
  confirmCls = "bg-[rgb(var(--primary))]",
  cancelLabel = "Go Back",
  onConfirm,
  onCancel,
  disabled = false,
}) {
  return (
    <div className="fixed inset-0 z-60  flex items-center justify-center p-4">
      <div className="bg-[rgb(var(--surface))] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className={`h-1.5 w-full ${strip}`} />
        <div className="p-6 text-center">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${iconBg}`}
          >
            {icon}
          </div>
          <h3 className="text-base font-bold text-[rgb(var(--text))] mb-1">{title}</h3>
          <p className="text-sm text-[rgb(var(--text))] mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 text-sm font-medium text-[rgb(var(--text))] bg-[rgb(var(--primary))]  rounded-xl transition"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={disabled}
              className={`flex-1 py-2.5 text-sm font-semibold bg-[rgb(var(--primary))] text-[rgb(var(--text))] rounded-xl transition disabled:opacity-60 ${confirmCls}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
