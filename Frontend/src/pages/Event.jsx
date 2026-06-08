import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiTag,
  FiPlus,
  FiMapPin,
  FiUser,
  FiUsers,
  FiX,
  FiEdit2,
  FiTrash2,
  FiEye,
} from "react-icons/fi";
import axios from "axios";
import { toast } from "react-toastify";
import { FiAlertTriangle } from "react-icons/fi";
import { FaArrowLeft } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const TYPE_COLORS = {
  Competition: "bg-orange-100 text-orange-600",
  Cultural: "bg-pink-100 text-pink-600",
  Sports: "bg-green-100 text-green-700",
  Administrative: "bg-gray-100 text-gray-600",
};

const EMPTY_FORM = {
  title: "",
  type: "",
  priority: "Normal",
  organizer: "",
  startDate: "",
  endDate: "",
  time: "",
  location: "",
  assignClass: "All Classes",
  registrationRequired: false,
  capacity: "",
  description: "",
};

const getStatus = (ev) => {
  const now = new Date();
  const start = new Date(ev.startDate);
  const end = ev.endDate ? new Date(ev.endDate) : start;
  if (now < start) return "Upcoming";
  if (now > end) return "Completed";
  return "Ongoing";
};

export default function EventsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;

  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    upcoming: 0,
    categories: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [classes, setClasses] = useState([]);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isAdmin = user?.role === "school_admin";
  const isTeacher = user?.role === "teacher_admin";
  const isStudent = user?.role === "student_admin";

  /* ─── load ─── */
  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/events/`, {
        withCredentials: true,
      });
      setEvents(data.events);
      setStats(data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await axios.get(`${API}/classes/all`, {
        withCredentials: true,
      });
      setClasses(data.classes || []);
    } catch {
      toast.error("Failed to load classes");
    }
  };

  useEffect(() => {
    loadEvents();
    if (isAdmin) fetchClasses();
  }, []);

  /* ─── modal helpers ─── */
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowModal(true);
  };

  const openEdit = (ev) => {
    setEditingId(ev._id);
    setForm({
      title: ev.title,
      type: ev.type,
      priority: ev.priority,
      organizer: ev.organizer,
      startDate: ev.startDate?.slice(0, 10) || "",
      endDate: ev.endDate?.slice(0, 10) || "",
      time: ev.time,
      location: ev.location,
      assignClass: ev.assignClass,
      registrationRequired: ev.registrationRequired,
      capacity: ev.capacity || "",
      description: ev.description,
    });
    setError("");
    setShowModal(true);
  };

  const isFormDirty = () => {
    return Object.values(form).some(
      (v) => v !== "" && v !== false && v !== "Normal" && v !== "All Classes",
    );
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
    setError("");
    setConfirmDiscard(false);
    setConfirmSave(false);
  };

  /* ─── form ─── */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!form.title.trim()) newErrors.title = "Event title is required.";

    if (!form.type) newErrors.type = "Event type is required.";

    if (!form.organizer.trim()) newErrors.organizer = "Organizer is required.";

    if (!form.startDate) {
      newErrors.startDate = "Start date is required.";
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const startDate = new Date(form.startDate);
      startDate.setHours(0, 0, 0, 0);

      if (startDate < tomorrow) {
        newErrors.startDate = "Start Date must be tomorrow or later.";
      }
    }

    if (form.endDate) {
      const startDate = new Date(form.startDate);
      const endDate = new Date(form.endDate);

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      if (endDate < startDate) {
        newErrors.endDate = "End Date must be on or after Start Date.";
      }
    }

    if (!form.time) newErrors.time = "Time is required.";

    if (!form.location.trim()) newErrors.location = "Location is required.";

    if (!form.description.trim())
      newErrors.description = "Description is required.";

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setConfirmSave(true);
  };

  const confirmAndSave = async () => {
    setConfirmSave(false);

    try {
      setSubmitting(true);

      if (editingId) {
        await axios.put(`${API}/events/${editingId}`, form, {
          withCredentials: true,
        });
        toast.success("Event updated successfully!");
      } else {
        await axios.post(`${API}/events/create`, form, {
          withCredentials: true,
        });
        toast.success("Event created successfully!");
      }

      closeModal();
      loadEvents();
    } catch (err) {
      const msg = err?.response?.data?.message || "Something went wrong.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── delete ─── */
  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/events/${deleteId}`);
      setDeleteId(null);
      loadEvents();
    } catch (err) {
      console.error(err);
    }
  };

  /* ─── stat cards config ─── */
  const statCards = [
    {
      label: "TOTAL EVENTS",
      value: stats.total,
      icon: <FiCalendar />,
      iconBg: "bg-blue-50 text-blue-500",
    },
    {
      label: "COMPLETED",
      value: stats.completed,
      icon: <FiCheckCircle />,
      iconBg: "bg-green-50 text-green-500",
    },
    {
      label: "UPCOMING",
      value: stats.upcoming,
      icon: <FiClock />,
      iconBg: "bg-purple-50 text-purple-500",
    },
    {
      label: "CATEGORIES",
      value: stats.categories,
      icon: <FiTag />,
      iconBg: "bg-orange-50 text-orange-500",
    },
  ];

  /* ════════════════════════════════════════════════════ */
  return (
    <div className="p-8 text-[rgb(var(--text))] bg-[rgb(var(--bg))]">
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
        <div className="px-4 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                 bg-[rgb(var(--primary))] shadow-sm border border-slate-100
                 text-sm font-bold 0 active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold ">Events</h1>
        <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">
          Good Afternoon, Welcome to the Events panel.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <div
            key={i}
            className="bg-[rgb(var(--surface))]  rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4"
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${s.iconBg}`}
            >
              {s.icon}
            </div>
            <div>
              <p className="text-xs  font-medium tracking-wide">{s.label}</p>
              <p className="text-2xl font-bold  leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── List header ── */}
      {user?.role === "school_admin" && (
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold ">All Events</h2>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))] text-sm font-semibold px-5 py-2.5 rounded-xl transition"
          >
            <FiPlus size={15} /> Create Event
          </button>
        </div>
      )}

      {/* ── Event Cards ── */}
      {loading ? (
        <div className="text-center py-20 text-sm">Loading events…</div>
      ) : events.length === 0 ? (
        <div className="text-center py-20  text-sm">No events found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {events.map((ev) => {
            const status = getStatus(ev);
            const isCompleted = status === "Completed";

            return (
              <div
                key={ev._id}
                className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition flex flex-col"
              >
                {/* title + status */}
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-bold  leading-snug">
                    {ev.title}
                  </h3>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap ml-2 ${
                      isCompleted
                        ? "text-gray-400"
                        : status === "Ongoing"
                          ? "text-green-600"
                          : "text-indigo-500"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                {/* type badge */}
                <span
                  className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-3 w-fit ${TYPE_COLORS[ev.type] || "bg-gray-100 text-gray-600"}`}
                >
                  {ev.type?.toUpperCase()}
                </span>

                {/* meta */}
                <div className="space-y-1.5 text-sm text-gray-500 flex-1">
                  <div className="flex items-center gap-2">
                    <FiCalendar size={13} className="shrink-0" />
                    <span>
                      {ev.startDate?.slice(0, 10)} at {ev.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiMapPin size={13} className="shrink-0" />
                    <span>{ev.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiUser size={13} className="shrink-0" />
                    <span>{ev.organizer}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiUsers size={13} className="shrink-0" />
                    <span>{ev.attendees} attendees</span>
                  </div>
                </div>

                {/* ── Action Buttons ── */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  {/* View — always visible */}
                  <button
                    onClick={() => {
                      if (!user?.role) return;

                      if (isAdmin) navigate(`/school/event/${ev._id}`);
                      else if (isTeacher) navigate(`/teacher/event/${ev._id}`);
                      else if (isStudent) navigate(`/parent/event/${ev._id}`);
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition"
                  >
                    <FiEye size={13} /> View
                  </button>

                  {/* Edit + Delete — hidden when Completed */}
                  {user?.role === "school_admin" && !isCompleted && (
                    <>
                      <button
                        onClick={() => openEdit(ev)}
                        className="flex items-center gap-1.5 text-xs font-medium text-amber-500 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition"
                      >
                        <FiEdit2 size={13} /> Edit
                      </button>

                      <button
                        onClick={() => setDeleteId(ev._id)}
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

      {/* ════════ Create / Edit Modal ════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl">
            {/* header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold ">
                {editingId ? "Edit Event" : "Add New Event"}
              </h2>
              <button
                onClick={tryClose}
                className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] transition"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* body */}
            <div className="px-6 py-5 space-y-4">
              {/* inline error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5">
                  {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
                  Event Title{" "}
                  <span className="text-[rgb(var(--primary))]">*</span>
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Enter event title (e.g., Annual Sports Day)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
                {errors.title && (
                  <p className="text-red-500 text-xs mt-1">{errors.title}</p>
                )}
              </div>

              {/* Type + Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
                    Event Type{" "}
                    <span className="text-[rgb(var(--primary))]">*</span>
                  </label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none
                     focus:border-indigo-400 text-[rgb(var(--text))] bg-[rgb(var(--surface))] "
                  >
                    <option value="">Select Event Type</option>
                    <option>Competition</option>
                    <option>Cultural</option>
                    <option>Sports</option>
                    <option>Administrative</option>
                  </select>
                  {errors.type && (
                    <p className="text-red-500 text-xs mt-1">{errors.type}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium  mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm 
                      text-[rgb(var(--text))] bg-[rgb(var(--surface))]
                    focus:outline-none focus:border-indigo-400"
                  >
                    <option>Normal</option>
                    <option>High</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>

              {/* Organizer */}
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
                  Organizer{" "}
                  <span className="text-[rgb(var(--primary))]">*</span>
                </label>
                <input
                  name="organizer"
                  value={form.organizer}
                  onChange={handleChange}
                  placeholder="Organizer name (e.g., Sports Committee)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
                {errors.organizer && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.organizer}
                  </p>
                )}
              </div>

              {/* Start + End Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
                    Start Date{" "}
                    <span className="text-[rgb(var(--primary))]">*</span>
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleChange}
                    min={
                      new Date(Date.now() + 86400000)
                        .toISOString()
                        .split("T")[0]
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                  {errors.startDate && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.startDate}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleChange}
                    min={form.startDate}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                  {errors.endDate && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.endDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Time + Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
                    Time <span className="text-[rgb(var(--primary))]">*</span>
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={form.time}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                  {errors.time && (
                    <p className="text-red-500 text-xs mt-1">{errors.time}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
                    Location{" "}
                    <span className="text-[rgb(var(--primary))]">*</span>
                  </label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="Enter location (e.g., School Ground)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                  {errors.location && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.location}
                    </p>
                  )}
                </div>
              </div>

              {/* Assign Class */}
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
                  Assign Class{" "}
                  <span className="text-[rgb(var(--primary))]">*</span>
                </label>
                <select
                  name="assignClass"
                  value={form.assignClass}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg 
                  text-[rgb(var(--text))] bg-[rgb(var(--surface))]
                  px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                >
                  <option value="All Classes">All Classes</option>
                  {classes.map((cls, i) => (
                    <option key={i} value={cls.name}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Registration */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reg"
                  name="registrationRequired"
                  checked={form.registrationRequired}
                  onChange={handleChange}
                  className="w-4 h-4 "
                />
                <label htmlFor="reg" className="text-sm ">
                  Registration Required
                </label>
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
                  Participant Capacity
                </label>
                <input
                  name="capacity"
                  value={form.capacity}
                  onChange={handleChange}
                  placeholder="Enter maximum participants (optional)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
                  Description{" "}
                  <span className="text-[rgb(var(--primary))]">*</span>
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Write event details here..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-y"
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.description}
                  </p>
                )}
              </div>
            </div>

            {/* footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={tryClose}
                className="px-5 py-2 text-sm font-medium text-[rgb(var(--text))] bg-[rgb(var(--surface))] hover:bg-[rgb(var(--surface-hover))] rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 text-sm font-semibold text-[rgb(var(--text))] bg-[rgb(var(--primary))]  rounded-lg transition disabled:opacity-60"
              >
                {submitting
                  ? "Saving…"
                  : editingId
                    ? "Update Event"
                    : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Delete Confirm Modal ════════ */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]  rounded-2xl w-full max-w-sm shadow-xl p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiTrash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold  mb-1">Delete Event?</h3>
            <p className="text-sm t mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2 text-sm font-medium text-[rgb(var(--text))] bg-[rgb(var(--surface))] hover:bg-[rgb(var(--surface-hover))] rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmSave && (
        <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
          <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]  rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="h-1.5 w-full bg-indigo-500" />

            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCheckCircle
                  size={22}
                  className="text-[rgb(var(--primary))]"
                />
              </div>

              <h3 className="text-base font-bold  mb-1">
                {editingId ? "Update this event?" : "Create this event?"}
              </h3>

              <p className="text-sm  mb-6">
                <span className="font-semibold ">"{form.title}"</span>
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmSave(false)}
                  className="flex-1 py-2.5 text-sm font-medium  rounded-xl"
                >
                  Go Back
                </button>

                <button
                  onClick={confirmAndSave}
                  disabled={submitting}
                  className="flex-1 py-2.5 text-sm font-semibold text-[rgb(var(--text))] bg-[rgb(var(--primary))] rounded-xl"
                >
                  {submitting ? "Saving…" : "Yes, Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDiscard && (
        <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
          <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="h-1.5 w-full bg-[rgb(var(--primary))]" />

            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiAlertTriangle size={22} className="text-amber-500" />
              </div>

              <h3 className="text-base font-bold  mb-1">Discard changes?</h3>

              <p className="text-sm mb-6">
                You have unsaved changes. Closing will discard them.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDiscard(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-[rgb(var(--text))] bg-[rgb(var(--primary))] hover:bg-[rgb(var(--surface-hover))] rounded-xl"
                >
                  Keep Editing
                </button>

                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 text-sm font-semiboldtext-[rgb(var(--text))] bg-[rgb(var(--primary))] rounded-xl"
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