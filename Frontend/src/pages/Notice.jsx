import { useState, useEffect } from "react";
import {
  FiBell,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiX,
  FiUsers,
  FiCalendar,
  FiAlertCircle,
  FiInfo,
  FiCheckCircle,
  FiAlertTriangle,
} from "react-icons/fi";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

// Add later
const createdBy = "Admin";

/* ── style maps ── */
const CATEGORY_STYLES = {
  Examination: { bg: "bg-red-100", text: "text-red-600" },
  Meeting: { bg: "bg-blue-100", text: "text-blue-600" },
  Holiday: { bg: "bg-green-100", text: "text-green-700" },
  Fee: { bg: "bg-orange-100", text: "text-orange-600" },
  Event: { bg: "bg-purple-100", text: "text-purple-600" },
  General: { bg: "bg-gray-100", text: "text-gray-600" },
};

const PRIORITY_STYLES = {
  High: {
    bg: "bg-red-50",
    text: "text-red-500",
    icon: <FiAlertCircle size={11} />,
  },
  Normal: {
    bg: "bg-blue-50",
    text: "text-blue-500",
    icon: <FiInfo size={11} />,
  },
  Low: {
    bg: "bg-slate-50",
    text: "text-slate-500",
    icon: <FiCheckCircle size={11} />,
  },
};

const AUDIENCE_STYLES = {
  All: { bg: "bg-indigo-50", text: "text-indigo-600" },
  Parents: { bg: "bg-pink-50", text: "text-pink-600" },
  Staff: { bg: "bg-amber-50", text: "text-amber-600" },
  Class: { bg: "bg-green-50", text: "text-green-600" },
};

const AUDIENCE_OPTIONS = ["All", "Parents", "Staff", "Class"];

const EMPTY_FORM = {
  title: "",
  content: "",
  category: "",
  priority: "Normal",
  audience: "All",
  assignedClass: "",
  publishDate: "",
  expiryDate: "",
  isActive: true,
};

/* ════════════════════════════════════════════════════ */
export default function Notice() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [classes, setClasses] = useState([]);
  const isMobile = window.innerWidth <= 768;
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    highPriority: 0,
    audiences: 0,
  });

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewNotice, setViewNotice] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("All");
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isAdmin = user?.role === "school_admin";
  const isTeacher = user?.role === "teacher_admin";
  const isStudent = user?.role === "student_admin";

  /* ── fetch notices ── */
  const loadNotices = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/notices/`, {
        withCredentials: true,
      });
      setNotices(data.notices);
      setStats(data.stats);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load notices.");
    } finally {
      setLoading(false);
    }
  };

  /* ── fetch classes ── */
  const fetchClasses = async () => {
    try {
      const { data } = await axios.get(`${API}/classes/all`, {
        withCredentials: true,
      });

      if (data.success) {
        setClasses(data.classes || []);
      } else {
        toast.error(data.message || "Failed to load classes");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to load classes",
      );
    }
  };

  useEffect(() => {
    loadNotices();
    fetchClasses();
  }, []);

  /* ── stat cards ── */
  const statCards = [
    {
      label: "TOTAL NOTICES",
      value: stats.total,
      icon: <FiBell />,
      iconBg: "bg-blue-50 text-blue-500",
    },
    {
      label: "ACTIVE",
      value: stats.active,
      icon: <FiCheckCircle />,
      iconBg: "bg-green-50 text-green-500",
    },
    {
      label: "HIGH PRIORITY",
      value: stats.highPriority,
      icon: <FiAlertTriangle />,
      iconBg: "bg-red-50 text-red-500",
    },
    {
      label: "AUDIENCES",
      value: stats.audiences,
      icon: <FiUsers />,
      iconBg: "bg-purple-50 text-purple-500",
    },
  ];

  /* ── modal helpers ── */
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (n) => {
    setEditingId(n._id);
    setForm({
      title: n.title,
      content: n.content,
      category: n.category,
      priority: n.priority,
      audience: n.audience,
      assignedClass: n.assignedClass || "",
      publishDate: n.publishDate?.slice(0, 10) || "",
      expiryDate: n.expiryDate?.slice(0, 10) || "",
      isActive: n.isActive,
    });
    setShowModal(true);
  };

  /* ── form ── */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleAudienceSelect = (opt) => {
    setForm((p) => ({
      ...p,
      audience: opt,
      assignedClass: opt !== "Class" ? "" : p.assignedClass,
    }));
  };

  const validate = () => {
    if (!form.title.trim()) return "Notice title is required.";
    if (!form.category) return "Category is required.";
    if (!form.content.trim()) return "Content is required.";
    if (!form.publishDate) return "Publish date is required.";
    if (form.audience === "Class" && !form.assignedClass)
      return "Please select a class for this notice.";
    return "";
  };

  /* check if form has been touched from EMPTY or from original edit values */
  const isFormDirty = () => {
    if (!editingId) {
      return Object.values(form).some((v) =>
        typeof v === "boolean"
          ? v !== true
          : v !== "" && v !== "All" && v !== "Normal",
      );
    }
    return true; // always confirm discard on edit
  };

  const tryClose = () => {
    if (isFormDirty()) {
      setConfirmDiscard(true);
    } else {
      closeModal();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
    setConfirmDiscard(false);
    setConfirmSave(false);
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setConfirmSave(true); // show save confirm instead of saving directly
  };

  const confirmAndSave = async () => {
    setConfirmSave(false);
    try {
      setSubmitting(true);
      if (editingId) {
        await axios.put(`${API}/notices/${editingId}`, { ...form, createdBy },{withCredentials:true});
        toast.success("Notice updated successfully!");
      } else {
        await axios.post(
          `${API}/notices/create`,
          { ...form, createdBy },
          { withCredentials: true },
        );
        toast.success("Notice created successfully!");
      }
      closeModal();
      loadNotices();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/notices/${deleteId}`,{withCredentials:true});
      toast.success("Notice deleted successfully!");
      setDeleteId(null);
      loadNotices();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete notice.");
      setDeleteId(null);
    }
  };

  /* ── filtered list ── */
  const filtered =
    filter === "All"
      ? notices
      : notices.filter(
          (n) =>
            n.audience === filter ||
            n.priority === filter ||
            n.category === filter,
        );

  /* ════════════════════════════════════════════════════ */
  return (
    <div className="p-8 text-[rgb(var(--text))] bg-[rgb(var(--bg))]">
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => {
              if (!user?.role) return;

              if (isAdmin) navigate("/school/notice");
              else if (isTeacher) navigate("/teacher/notice");
              else if (isStudent) navigate("/parent/notice");
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                 bg-[rgb(var(--primary))]  shadow-sm border border-slate-100
                 text-sm font-bold active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[rgb(var(--text))]">Notices</h1>
        <p className="text-sm text-[rgb(var(--text))] mt-0.5">
          {isAdmin
            ? `Manage and publish notices for students, parents, and staff.`
            : isTeacher
              ? `See the notice for student, parent, staff.`
              : isStudent
                ? `See the notice for the student.`
                : `No notice available`}
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <div
            key={i}
            className="bg-[rgb(var(--surface))] rounded-xl border border-[rgb(var(--border))] shadow-sm px-5 py-4 flex items-center gap-4"
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${s.iconBg}`}
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

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        {!isStudent && (
          <div className="flex items-center gap-2 flex-wrap">
            {["All", "Parents", "Staff", "High"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition ${
                  filter === f
                    ? "text-[rgb(var(--text))] bg-[rgb(var(--primary))]"
                    : "bg-[rgb(var(--surface))] text-[rgb(var(--text))] border-[rgb(var(--border))] hover:border-[rgb(var(--primary))] hover:text-[rgb(var(--primary))]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
        {user?.role === "school_admin" && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))] text-sm font-semibold px-5 py-2.5 rounded-xl transition shrink-0"
          >
            <FiPlus size={15} /> Create Notice
          </button>
        )}
      </div>

      {/* ── Notice Cards ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          No notices found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((n) => {
            const catCls =
              CATEGORY_STYLES[n.category] || CATEGORY_STYLES.General;
            const prioCls =
              PRIORITY_STYLES[n.priority] || PRIORITY_STYLES.Normal;
            const audCls = AUDIENCE_STYLES[n.audience] || AUDIENCE_STYLES.All;
            const isExpired =
              n.expiryDate && new Date(n.expiryDate) < new Date();

            return (
              <div
                key={n._id}
                className={`bg-[rgb(var(--surface))] rounded-xl border shadow-sm p-5 flex flex-col hover:shadow-md transition ${
                  !n.isActive || isExpired
                    ? "opacity-60 border-gray-100"
                    : "border-gray-100"
                }`}
              >
                {/* top row */}
                <div className="flex items-start justify-between gap-2 mb-3 text-[rgb(var(--text))]">
                  <h3 className="text-sm font-bold leading-snug flex-1">
                    {n.title}
                  </h3>
                  {(!n.isActive || isExpired) && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-[rgb(var(--primary))] shrink-0">
                      Inactive
                    </span>
                  )}
                </div>

                {/* badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${catCls.bg} ${catCls.text}`}
                  >
                    {n.category?.toUpperCase()}
                  </span>
                  <span
                    className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${prioCls.bg} ${prioCls.text}`}
                  >
                    {prioCls.icon} {n.priority}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${audCls.bg} ${audCls.text}`}
                  >
                    {n.audience === "Class" && n.assignedClass
                      ? `Class: ${n.assignedClass}`
                      : n.audience}
                  </span>
                </div>

                {/* preview */}
                <p className="text-xs  leading-relaxed line-clamp-2 flex-1 mb-3">
                  {n.content}
                </p>

                {/* dates */}
                <div className="flex items-center gap-3 text-[11px]  mb-4">
                  <span className="flex items-center gap-1">
                    <FiCalendar size={11} /> {n.publishDate?.slice(0, 10)}
                  </span>
                  {n.expiryDate && (
                    <>
                      <span>→</span>
                      <span className={isExpired ? "text-red-400" : ""}>
                        {n.expiryDate?.slice(0, 10)}
                      </span>
                    </>
                  )}
                </div>

                {/* author */}
                <div className="flex items-center gap-2 pb-4 border-b border-gray-100 mb-3">
                  <div className="w-6 h-6 rounded-full text-[rgb(var(--text))] bg-[rgb(var(--primary))] flex items-center justify-center text-[10px] font-bold shrink-0">
                    {n.createdBy?.charAt(0)?.toUpperCase()}
                  </div>
                  <span className="text-xs ">{n.createdBy}</span>
                </div>

                {/* actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewNotice(n)}
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition"
                  >
                    <FiEye size={13} /> View
                  </button>
                  {user?.role === "school_admin" && (
                    <>
                      <button
                        onClick={() => openEdit(n)}
                        className="flex items-center gap-1.5 text-xs font-medium text-amber-500 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition"
                      >
                        <FiEdit2 size={13} /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(n._id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:bg-red-50 px-3 py-1.5 rounded-lg transition ml-auto"
                      >
                        <FiTrash2 size={13} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════ View Modal ════════ */}
      {viewNotice && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div
              className={`h-1.5 w-full ${CATEGORY_STYLES[viewNotice.category]?.bg || "bg-gray-100"}`}
            />
            <div className="px-6 py-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold leading-snug">
                  {viewNotice.title}
                </h2>
                <button
                  onClick={() => {
                    setViewNotice(null);
                  }}
                  className="text-[rgb(var(--text))] hover:text-[rgb(var(--primary))] shrink-0"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={`text-[11px] font-bold px-3 py-0.5 rounded-full ${CATEGORY_STYLES[viewNotice.category]?.bg} ${CATEGORY_STYLES[viewNotice.category]?.text}`}
                >
                  {viewNotice.category?.toUpperCase()}
                </span>
                <span
                  className={`text-[11px] font-bold px-3 py-0.5 rounded-full ${PRIORITY_STYLES[viewNotice.priority]?.bg} ${PRIORITY_STYLES[viewNotice.priority]?.text}`}
                >
                  {viewNotice.priority} Priority
                </span>
                <span
                  className={`text-[11px] font-bold px-3 py-0.5 rounded-full ${AUDIENCE_STYLES[viewNotice.audience]?.bg} ${AUDIENCE_STYLES[viewNotice.audience]?.text}`}
                >
                  {viewNotice.audience === "Class" && viewNotice.assignedClass
                    ? `Class: ${viewNotice.assignedClass}`
                    : viewNotice.audience}
                </span>
                {!viewNotice.isActive && (
                  <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-gray-100 text-gray-400">
                    Inactive
                  </span>
                )}
              </div>

              <div className="border rounded-xl p-4 mb-4">
                <p className="text-sm  leading-relaxed whitespace-pre-line">
                  {viewNotice.content}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                <div className="border rounded-lg p-3">
                  <p className=" font-medium mb-0.5">
                    Publish Date
                  </p>
                  <p className="font-semibold ">
                    {viewNotice.publishDate?.slice(0, 10) || "—"}
                  </p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className=" font-medium mb-0.5">
                    Expiry Date
                  </p>
                  <p className="font-semibold ">
                    {viewNotice.expiryDate?.slice(0, 10) || "—"}
                  </p>
                </div>
                <div className="border rounded-lg p-3 col-span-2">
                  <p className=" font-medium mb-0.5">Created By</p>
                  <p className="font-semibold ">
                    {viewNotice.createdBy}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setViewNotice(null);
                  }}
                  className="px-5 py-2 text-sm font-medium text-[rgb(var(--text))] bg-[rgb(var(--primary))]  rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Create / Edit Modal ════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold ">
                {editingId ? "Edit Notice" : "Create Notice"}
              </h2>
              <button
                onClick={closeModal}
                className="text-[rgb(var(--primary))]"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-mediummb-1">
                  Notice Title <span className="text-[rgb(var(--primary))]">*</span>
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Enter notice title"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>

              {/* Category + Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium  mb-1">
                    Category <span className="text-[rgb(var(--primary))]">*</span>
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none
                      text-[rgb(var(--text))] bg-[rgb(var(--surface))]
                    focus:border-indigo-400"
                  >
                    <option value="">Select Category</option>
                    <option>Examination</option>
                    <option>Meeting</option>
                    <option>Holiday</option>
                    <option>Fee</option>
                    <option>Event</option>
                    <option>General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium  mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 
                    text-[rgb(var(--text))] bg-[rgb(var(--surface))]
                    text-sm focus:outline-none focus:border-indigo-400"
                  >
                    <option>Normal</option>
                    <option>High</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>

              {/* ── Audience Radio Toggle ── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audience
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleAudienceSelect(opt)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition ${
                        form.audience === opt
                          ? "text-[rgb(var(--text))] bg-[rgb(var(--primary))]"
                          : "text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {/* class dropdown — only when Class is selected */}
                {form.audience === "Class" && (
                  <select
                    name="assignedClass"
                    value={form.assignedClass}
                    onChange={handleChange}
                    className="w-full border border-indigo-200 
                    text-[rgb(var(--text))] bg-[rgb(var(--surface))]
                    rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  >
                    <option value="" className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">— Select a class —</option>
                    {classes.length > 0 ? (
                      classes.map((cls, i) => (
                        <option key={i} value={cls.name} className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                          {cls.name}
                        </option>
                      ))
                    ) : (
                      <option key={c} value={c} className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                        Class not available
                      </option>
                    )}
                  </select>
                )}
              </div>

              {/* Publish + Expiry Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium t mb-1">
                    Publish Date <span className="text-[rgb(var(--primary))]">*</span>
                  </label>
                  <input
                    type="date"
                    name="publishDate"
                    value={form.publishDate}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={form.expiryDate}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm ">
                  Publish immediately (Active)
                </label>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium  mb-1">
                  Content <span className="text-[rgb(var(--primary))]">*</span>
                </label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Write notice content here..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-y"
                />
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
                className="px-5 py-2 text-sm font-semibold text-[rgb(var(--text))] bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-light))] rounded-lg transition disabled:opacity-60"
              >
                {submitting
                  ? "Saving…"
                  : editingId
                    ? "Update Notice"
                    : "Create Notice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Delete Confirm ════════ */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--surface))] rounded-2xl w-full max-w-sm shadow-xl p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiTrash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold  mb-1">
              Delete Notice?
            </h3>
            <p className="text-sm  mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2 text-sm font-medium  bg-[rgb(var(--primary))] rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 text-sm font-semibold bg-[rgb(var(--primary))] text-[rgb(var(--text))] rounded-lg transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Save Confirm Popup ════════ */}
      {confirmSave && (
        <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
          <div className=" bg-[rgb(var(--surface))] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            {/* top colour strip */}
            <div className="h-1.5 w-full " />
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCheckCircle size={22} className="text-indigo-500" />
              </div>
              <h3 className="text-base font-bold  mb-1">
                {editingId ? "Update this notice?" : "Create this notice?"}
              </h3>
              <p className="text-sm  mb-1">
                <span className="font-semibold ">
                  "{form.title}"
                </span>
              </p>
              <p className="text-xs text-gray-400 mb-6">
                Audience:{" "}
                <span className="font-medium ">
                  {form.audience === "Class" && form.assignedClass
                    ? `Class: ${form.assignedClass}`
                    : form.audience}
                </span>
                &nbsp;·&nbsp; Priority:{" "}
                <span className="font-medium ">
                  {form.priority}
                </span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmSave(false)}
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl text-[rgb(var(--text))] bg-[rgb(var(--primary))] transition"
                >
                  Go Back
                </button>
                <button
                  onClick={confirmAndSave}
                  disabled={submitting}
                  className="flex-1 py-2.5 text-sm font-semibold text-[rgb(var(--text))] bg-[rgb(var(--primary))] rounded-xl transition disabled:opacity-60"
                >
                  {submitting ? "Saving…" : "Yes, Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Discard Confirm Popup ════════ */}
      {confirmDiscard && (
        <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
          <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            {/* top colour strip */}
            <div className="h-1.5 w-full bg-[rgb(var(--primary))]" />
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiAlertTriangle size={22} className="text-amber-500" />
              </div>
              <h3 className="text-base font-bold  mb-1">
                Discard changes?
              </h3>
              <p className="text-sm  mb-6">
                You have unsaved changes. If you close now, all your changes
                will be lost.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDiscard(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-[rgb(var(--text))] bg-[rgb(var(--primary))]  rounded-xl transition"
                >
                  Keep Editing
                </button>
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 text-sm font-semibold text-[rgb(var(--text))] bg-[rgb(var(--primary))] rounded-xl transition"
                >
                  Yes, Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
