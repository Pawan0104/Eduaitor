import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiX,
  FiCalendar,
  FiMapPin,
  FiAlertCircle,
  FiRefreshCw,
  FiEdit2,
  FiTrash2,
  FiFileText,
  FiInfo,
} from "react-icons/fi";

const API = import.meta.env.VITE_API_URL;

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TYPE_CONFIG = {
  Holiday: {
    bg: "bg-red-500",
    light: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  Event: {
    bg: "bg-pink-500",
    light: "bg-pink-50 text-pink-700 border-pink-200",
    dot: "bg-pink-500",
  },
  Exam: {
    bg: "bg-amber-500",
    light: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  Meeting: {
    bg: "bg-blue-500",
    light: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  Competition: {
    bg: "bg-orange-500",
    light: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
  },
  Cultural: {
    bg: "bg-purple-500",
    light: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
  Sports: {
    bg: "bg-green-500",
    light: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  Administrative: {
    bg: "bg-gray-500",
    light: "bg-gray-50 text-gray-700 border-gray-200",
    dot: "bg-gray-500",
  },
};

const ALL_TYPES = Object.keys(TYPE_CONFIG);

// ── color field intentionally removed ────────────────────────────────────────
const EVENT_FORM_EMPTY = {
  title: "",
  type: "Holiday",
  startDate: "",
  endDate: "",
  isAllDay: true,
  description: "",
  location: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "—";
  return (
    toLocalDate(dateStr)?.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) ?? "—"
  );
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getStatus = (ev) => {
  const now = new Date();
  const start = toLocalDate(ev.startDate);
  const end = ev.endDate ? toLocalDate(ev.endDate) : start;
  if (!start) return "Unknown";
  if (now < start) return "Upcoming";
  if (end && now > end) return "Completed";
  return "Ongoing";
};

// ─── Main Calendar ────────────────────────────────────────────────────────────

export default function Calendar({ schoolId /* academicYearId */ }) {
  const today = new Date();
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const [calEvents, setCalEvents] = useState([]);
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [prefilledDate, setPrefilledDate] = useState(null);

  const [popoverDay, setPopoverDay] = useState(null);
  const [popoverRef, setPopoverRef] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchCalendarEvents = async () => {
    try {
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59).toISOString();
      const { data } = await axios.get(`${API}/calendar/`, {
        params: { start, end, schoolId },
        withCredentials: true,
      });
      setCalEvents(Array.isArray(data) ? data : data.events || []);
    } catch (err) {
      console.error("Calendar fetch:", err);
    }
  };

  const fetchSchoolEvents = async () => {
    try {
      const { data } = await axios.get(`${API}/events/`, {
        withCredentials: true,
      });
      setSchoolEvents(data.events || []);
    } catch (err) {
      console.error("Events fetch:", err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchCalendarEvents(), fetchSchoolEvents()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [month, year]);

  // ── Merged + filtered data ────────────────────────────────────────────────

  const allEvents = [
    ...calEvents.map((e) => ({ ...e, _source: "Calendar" })),
    ...schoolEvents.map((e) => ({ ...e, _source: "Events" })),
  ];

  const filtered =
    activeFilter === "All"
      ? allEvents
      : allEvents.filter((e) => e.type === activeFilter);

  const eventsForDay = (day) => {
    const target = new Date(year, month, day);
    return filtered.filter((ev) => {
      const start = toLocalDate(ev.startDate);
      const end = ev.endDate ? toLocalDate(ev.endDate) : start;
      if (!start) return false;
      return target >= start && target <= end;
    });
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`${API}/calendar/${deleteId}`, {
        withCredentials: true,
      });
      toast.success("Event deleted.");
      setDeleteId(null);
      setPopoverDay(null);
      loadAll();
    } catch {
      toast.error("Failed to delete event.");
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  const changeMonth = (dir) => {
    setPopoverDay(null);
    if (dir === "prev") {
      if (month === 0) {
        setMonth(11);
        setYear((y) => y - 1);
      } else setMonth((m) => m - 1);
    } else {
      if (month === 11) {
        setMonth(0);
        setYear((y) => y + 1);
      } else setMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    setMonth(today.getMonth());
    setYear(today.getFullYear());
    setPopoverDay(null);
  };

  // ── Grid ──────────────────────────────────────────────────────────────────

  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  // ── Sidebar upcoming ──────────────────────────────────────────────────────

  const upcoming = [...allEvents]
    .filter((e) => {
      const start = toLocalDate(e.startDate);
      return start && start >= new Date(year, month, 1);
    })
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 6);

  const typeCounts = ALL_TYPES.reduce((acc, t) => {
    acc[t] = allEvents.filter((e) => e.type === t).length;
    return acc;
  }, {});

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-[rgb(var(--bg))] text-[rgb(var(--text))] ">
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                  shadow-sm border border-slate-100
                 text-sm font-bold  active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold  tracking-tight">
            Academic Calendar
          </h1>
          <p className="text-sm  mt-0.5">
            Holidays, Exams, Events &amp; Meetings
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadAll}
            title="Refresh"
            className={`p-2.5 rounded-xl border border-gray-200  hover:shadow-sm transition ${loading ? "animate-spin" : ""}`}
          >
            <FiRefreshCw size={15} />
          </button>
          <button
            onClick={() => {
              setEditData(null);
              setPrefilledDate(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 text-[rgb(var(--text))] bg-[rgb(var(--surface))] text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
          >
            <FiPlus size={15} /> Add Event
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* ── Calendar panel ── */}
        <div className="w-full lg:flex-1 min-w-0 order-1 lg:order-2 text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
          {/* Controls */}
          <div className=" rounded-2xl shadow-sm border border-gray-100 px-5 py-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 md:gap-10">
              <div className="flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto">
                <button
                  onClick={() => changeMonth("prev")}
                  className="p-2 rounded-xl  transition"
                >
                  <FiChevronLeft size={18} />
                </button>
                <h2 className="text-sm sm:text-lg font-bold  text-center flex-1 sm:flex-none">
                  {MONTHS[month]} {year}
                </h2>
                <button
                  onClick={() => changeMonth("next")}
                  className="p-2 rounded-xl  transition"
                >
                  <FiChevronRight size={18} />
                </button>
                <button
                  onClick={goToday}
                  className="text-xs font-semibold px-2 py-1 rounded-lg bg-[rgb(var(--primary))]  transition"
                >
                  Today
                </button>
              </div>

              <div className="flex w-full sm:w-auto gap-2">
                <select
                  value={month}
                  onChange={(e) => {
                    setMonth(Number(e.target.value));
                    setPopoverDay(null);
                  }}
                  className="flex-1 sm:flex-none text-xs sm:text-sm border border-gray-200 rounded-lg 
                    text-[rgb(var(--text))] bg-[rgb(var(--surface))]
                  px-2 py-1.5  focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => {
                    setYear(Number(e.target.value));
                    setPopoverDay(null);
                  }}
                  className="flex-1 sm:flex-none text-xs sm:text-sm border 
                  text-[rgb(var(--text))] bg-[rgb(var(--surface))]
                  border-gray-200 rounded-lg px-2 py-1.5  focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {Array.from({ length: 10 }, (_, i) => year - 4 + i).map(
                    (y) => (
                      <option key={y}>{y}</option>
                    ),
                  )}
                </select>
              </div>
            </div>

            {/* Type filter pills */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setActiveFilter("All")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                  activeFilter === "All"
                    ? "bg-gray-800 text-white border-gray-800"
                    : " text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                All ({allEvents.length})
              </button>
              {ALL_TYPES.map((t) => {
                const cfg = TYPE_CONFIG[t];
                const active = activeFilter === t;
                const count = typeCounts[t];
                if (
                  !count &&
                  !["Holiday", "Event", "Exam", "Meeting"].includes(t)
                )
                  return null;
                return (
                  <button
                    key={t}
                    onClick={() => setActiveFilter(t)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                      active
                        ? `${cfg.bg} text-white border-transparent`
                        : `${cfg.light} border-current hover:opacity-80`
                    }`}
                  >
                    {t}
                    {count ? ` (${count})` : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid */}
          <div className=" rounded-2xl shadow-sm border border-gray-100 overflow-visible">
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="py-2 sm:py-3 text-center text-[10px] sm:text-xs font-bold  uppercase tracking-wider"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div
                  key={`e-${i}`}
                  className="h-20 sm:h-24 md:h-28 lg:h-32 border-b border-r border-gray-50 "
                />
              ))}

              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                const dayEvents = eventsForDay(day);
                const thisDate = new Date(year, month, day);
                const isToday = isSameDay(thisDate, today);
                const isPopoverOpen =
                  popoverDay && isSameDay(popoverDay, thisDate);
                const isWeekend =
                  thisDate.getDay() === 0 || thisDate.getDay() === 6;

                return (
                  <div
                    key={day}
                    className={`relative h-20 sm:h-24 md:h-28 lg:h-32 border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors group
                      ${isToday ? "bg-[rgb(var(--primary))]" : isWeekend ? "bg-[rgb(var(--bg))]" : ""}
                      ${isPopoverOpen ? "ring-2 ring-inset ring-bg[rgb(var(--surface))]" : ""}
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPopoverDay(isPopoverOpen ? null : thisDate);
                      setPopoverRef(e.currentTarget);
                    }}
                  >
                    <div
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold mb-1 transition
                      ${isToday ? "bg-[rgb(var(--surface))] text-[rgb(var(--text))] shadow-sm" : ""}`}
                    >
                      {day}
                    </div>

                    {/* Desktop view */}
                    <div className="hidden sm:block space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev, idx) => {
                        const cfg =
                          TYPE_CONFIG[ev.type] || TYPE_CONFIG["Event"];
                        return (
                          <div
                            key={ev._id || idx}
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate border ${cfg.light}`}
                          >
                            {ev.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] font-semibold text-indigo-500 px-1.5">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>

                    {/* Mobile dots */}
                    <div className="sm:hidden flex flex-wrap gap-0.5 mt-1">
                      {dayEvents.map((ev, idx) => {
                        const cfg =
                          TYPE_CONFIG[ev.type] || TYPE_CONFIG["Event"];
                        return (
                          <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}
                          />
                        );
                      })}
                    </div>

                    {isPopoverOpen && (
                      <DayPopover
                        date={thisDate}
                        events={eventsForDay(day)}
                        anchorRef={{ current: popoverRef }}
                        onClose={() => setPopoverDay(null)}
                        onEdit={(ev) => {
                          setEditData(ev);
                          setShowModal(true);
                          setPopoverDay(null);
                        }}
                        onDelete={(id) => {
                          setDeleteId(id);
                          setPopoverDay(null);
                        }}
                        onAdd={() => {
                          setEditData(null);
                          setPrefilledDate(thisDate.toISOString().slice(0, 10));
                          setShowModal(true);
                          setPopoverDay(null);
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 px-1">
            {ALL_TYPES.map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${TYPE_CONFIG[t].dot}`}
                />
                <span className="text-xs text-gray-500">{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="w-full lg:w-72 shrink-0 space-y-4 order-1 lg:order-2">
          <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-xs font-bold  uppercase tracking-wide mb-3">
              Summary Events
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "OverAll Events",
                  value: allEvents.length,
                  color: "text-gray-800",
                },
                {
                  label: "Holidays",
                  value: allEvents.filter((e) => e.type === "Holiday").length,
                  color: "text-red-600",
                },
                {
                  label: "Exams",
                  value: allEvents.filter((e) => e.type === "Exam").length,
                  color: "text-amber-600",
                },
                {
                  label: "This Month Events",
                  value: allEvents.filter((e) =>
                    ["Event", "Competition", "Cultural", "Sports"].includes(
                      e.type,
                    ),
                  ).length,
                  color: "text-pink-600",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-gray-50 rounded-xl p-3 text-center"
                >
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-xs font-bold  uppercase tracking-wide mb-3">
              Upcoming
            </h3>
            {loading ? (
              <div className="py-4 text-center text-xs ">
                Loading…
              </div>
            ) : upcoming.length === 0 ? (
              <div className="py-4 text-center text-xs ">
                No upcoming events
              </div>
            ) : (
              <div className="space-y-1.5">
                {upcoming.map((ev) => {
                  const cfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG["Event"];
                  const status = getStatus(ev);
                  return (
                    <div
                      key={ev._id}
                      className="flex gap-2.5 items-start p-2 rounded-xl  transition"
                    >
                      <div
                        className={`w-1 shrink-0 rounded-full self-stretch ${cfg.dot}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold  truncate">
                          {ev.title}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <FiCalendar
                            size={9}
                            className=" shrink-0"
                          />
                          <span className="text-[10px] ">
                            {formatDisplayDate(ev.startDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <TypeBadge type={ev.type} small />
                          <StatusPill status={status} />
                        </div>
                        {ev.location && (
                          <p className="text-[10px]  mt-0.5 flex items-center gap-1">
                            <FiMapPin size={9} /> {ev.location}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setEditData(null);
              setPrefilledDate(null);
              setShowModal(true);
            }}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-indigo-200  text-[rgb(var(--text))] bg-[rgb(var(--surface))] text-sm font-semibold flex items-center justify-center gap-2 transition"
          >
            <FiPlus size={15} /> Add Calendar Event
          </button>
        </div>
      </div>

      {/* Modals */}
      <EventModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditData(null);
          setPrefilledDate(null);
        }}
        onSaved={loadAll}
        editData={editData}
        // academicYearId={academicYearId}
        schoolId={schoolId}
        prefilledDate={prefilledDate}
      />

      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="h-1.5 bg-[rgb(var(--primary))] w-full" />
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiTrash2 size={22} className="text-red-500" />
              </div>
              <h3 className="text-base font-bold  mb-1">
                Delete Event?
              </h3>
              <p className="text-sm mb-6">
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 text-sm font-medium bg-[rgb(var(--primary))] rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 text-sm font-semibold text-[rgb(var(--text))] bg-[rgb(var(--primary))] rounded-xl transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared UI Atoms ─────────────────────────────────────────────────────────

function TypeBadge({ type, small = false }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG["Event"];
  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-full font-semibold tracking-wide ${
        small ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"
      } ${cfg.light}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {type}
    </span>
  );
}

function StatusPill({ status }) {
  const map = {
    Upcoming: "bg-indigo-50 text-indigo-600 border-indigo-200",
    Ongoing: "bg-green-50 text-green-600 border-green-200",
    Completed: "bg-gray-100 text-gray-500 border-gray-200",
    Unknown: "bg-gray-100 text-gray-400 border-gray-200",
  };
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${map[status] || map.Unknown}`}
    >
      {status}
    </span>
  );
}

function FormField({ label, required, hint, children }) {
  return (
    <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold  uppercase tracking-wide">
          {label}{" "}
          {required && (
            <span className="text-red-400 normal-case font-normal">*</span>
          )}
        </label>
        {hint && <span className="text-[10px]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function EventModal({
  open,
  onClose,
  onSaved,
  editData,
  // academicYearId,
  schoolId,
  prefilledDate,
}) {
  const [form, setForm] = useState(EVENT_FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editData) {
      setForm({
        title: editData.title || "",
        type: editData.type || "Holiday",
        startDate: editData.startDate?.slice(0, 10) || "",
        endDate: editData.endDate?.slice(0, 10) || "",
        isAllDay: editData.isAllDay ?? true,
        description: editData.description || "",
        location: editData.location || "",
      });
    } else {
      setForm({ ...EVENT_FORM_EMPTY, startDate: prefilledDate || "" });
    }
    setError("");
  }, [editData, open, prefilledDate]);

  if (!open) return null;

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const validate = () => {
    if (!form.title.trim()) return "Event title is required.";
    if (!form.type) return "Event type is required.";
    if (!form.startDate) return "Start date is required.";
    if (form.endDate && form.endDate < form.startDate)
      return "End date cannot be before start date.";
    return "";
  };

  const submit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    try {
      setSaving(true);
      // const payload = { ...form, schoolId, academicYearId };
      const payload = { ...form, schoolId };
      if (editData?._id) {
        await axios.put(`${API}/calendar/${editData._id}`, payload, {
          withCredentials: true,
        });
        toast.success("Calendar event updated!");
      } else {
        await axios.post(`${API}/calendar/`, payload, {
          withCredentials: true,
        });
        toast.success("Event added to calendar!");
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to save event.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const typeCfg = TYPE_CONFIG[form.type] || TYPE_CONFIG["Event"];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Accent bar — reflects selected type color */}
        <div className={`h-1.5 w-full transition-colors duration-300`} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${typeCfg.light}`}
            >
              <FiCalendar size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[rgb(var(--text))] leading-tight">
                {editData ? "Edit Calendar Event" : "New Calendar Event"}
              </h2>
              <p className="text-xs  mt-0.5">
                Academic Year Calendar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[rgb(var(--primary))] transition"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              <FiAlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <FormField label="Event Title" required>
            <input
              name="title"
              value={form.title}
              onChange={handle}
              placeholder="e.g., Republic Day, Mid-Term Exams, Staff Meeting…"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-[rgb(var(--text))] placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
            />
          </FormField>

          {/* Type — visual card picker (no color field needed) */}
          <FormField label="Event Type" required>
            <div className="grid grid-cols-4 gap-2">
              {ALL_TYPES.map((t) => {
                const cfg = TYPE_CONFIG[t];
                const active = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, type: t }))}
                    className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl border-2 text-[10px] font-bold uppercase tracking-wide transition
                      ${
                        active
                          ? `${cfg.bg} text-white border-transparent shadow-sm`
                          : "border-gray-100 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${active ? "bg-white/60" : cfg.dot}`}
                    />
                    {t}
                  </button>
                );
              })}
            </div>
          </FormField>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date" required>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handle}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
              />
            </FormField>
            <FormField label="End Date" hint="Optional — for multi-day">
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                min={form.startDate}
                onChange={handle}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
              />
            </FormField>
          </div>

          {/* All Day toggle */}
          <div className="flex items-center justify-between text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium ">All Day Event</p>
              <p className="text-xs  mt-0.5">
                No specific time slot
              </p>
            </div>
            <label className="relative cursor-pointer select-none">
              <input
                type="checkbox"
                name="isAllDay"
                checked={form.isAllDay}
                onChange={handle}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-300 peer-checked:bg-indigo-500 rounded-full transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
            </label>
          </div>

          {/* Location */}
          <FormField label="Location" hint="Optional">
            <div className="relative">
              <FiMapPin
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                name="location"
                value={form.location}
                onChange={handle}
                placeholder="e.g., School Auditorium, Ground, All Classrooms…"
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
              />
            </div>
          </FormField>

          {/* Description */}
          <FormField label="Description" hint="Optional">
            <div className="relative">
              <FiFileText
                size={14}
                className="absolute left-3.5 top-3 text-[rgb(var(--text))] pointer-events-none"
              />
              <textarea
                name="description"
                value={form.description}
                onChange={handle}
                rows={3}
                placeholder="Any notes, instructions, or details about this event…"
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm resize-none
                           focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
              />
            </div>
          </FormField>

          {/* Live preview pill */}
          {/* {form.title && form.startDate && (
            <div
              className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${typeCfg.light}`}
            >
              <FiInfo size={13} className="shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                <span className="font-semibold">{form.title}</span>
                {" · "}
                {formatDisplayDate(form.startDate)}
                {form.endDate && form.endDate !== form.startDate
                  ? ` → ${formatDisplayDate(form.endDate)}`
                  : ""}
                {form.location ? ` · ${form.location}` : ""}
              </p>
            </div>
          )} */}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium  rounded-xl transition border cursor-pointer text-[rgb(var(--text))] bg-[rgb(var(--primary))]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className={`flex-1 py-2.5 text-sm font-semibold text-[rgb(var(--text))] bg-[rgb(var(--primary))] border rounded-xl transition disabled:opacity-60 hover:opacity-90 `}
          >
            {saving ? "Saving…" : editData ? "Update Event" : "Add to Calendar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Day Popover ──────────────────────────────────────────────────────────────

function DayPopover({
  date,
  events,
  onClose,
  onEdit,
  onDelete,
  onAdd,
  anchorRef,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (
        ref.current &&
        !ref.current.contains(e.target) &&
        !anchorRef?.current?.contains(e.target)
      )
        onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-[92vw] max-w-sm sm:w-72 text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
    >
      <div className="bg-linear-to-r text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-4 py-3 flex items-center justify-between">
        <div>
          <p className=" font-bold text-sm">
            {date.toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <p className=" text-xs mt-0.5">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onAdd}
            title="Add event on this day"
            className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center  transition"
          >
            <FiPlus size={14} />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center  transition"
          >
            <FiX size={14} />
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {events.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <FiCalendar size={22} className=" mx-auto mb-2" />
            <p className="text-xs ">No events scheduled</p>
            <button
              onClick={onAdd}
              className="mt-2 text-xs text-[rgb(var(--primary))] hover:underline font-medium"
            >
              + Add one
            </button>
          </div>
        ) : (
          <div className="p-2 space-y-1 bg-[rgb(var(--surface))] text-[rgb(var(--text))] ">
            {events.map((ev) => {
              const cfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG["Event"];
              const status = getStatus(ev);
              const isReadOnly = ev._source === "Events";
              return (
                <div
                  key={ev._id}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl  transition group"
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${cfg.dot}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold  truncate">
                      {ev.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <TypeBadge type={ev.type} small />
                      <StatusPill status={status} />
                    </div>
                    {ev.location && (
                      <p className="text-[10px] mt-0.5 flex items-center gap-1">
                        <FiMapPin size={9} /> {ev.location}
                      </p>
                    )}
                    {isReadOnly && (
                      <p className="text-[10px] text-[rgb(var(--primary))] font-medium mt-0.5">
                        via Events module
                      </p>
                    )}
                  </div>
                  {!isReadOnly && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                      <button
                        onClick={() => onEdit(ev)}
                        className="p-1 rounded text-amber-500 hover:bg-amber-50"
                        title="Edit"
                      >
                        <FiEdit2 size={11} />
                      </button>
                      <button
                        onClick={() => onDelete(ev._id)}
                        className="p-1 rounded text-red-400 hover:bg-red-50"
                        title="Delete"
                      >
                        <FiTrash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
