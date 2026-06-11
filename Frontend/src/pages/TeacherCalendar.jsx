import { useState, useEffect } from "react";
import axios from "axios";
import {
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiMapPin,
  FiRefreshCw,
} from "react-icons/fi";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

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

export default function TeacherCalendar({ schoolId }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const loadAll = async () => {
    setLoading(true);
    try {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59);

      const [resCal, resSchool] = await Promise.all([
        axios.get(`${API}/calendar/`, {
          params: {
            start: start.toISOString(),
            end: end.toISOString(),
            schoolId,
          },
          withCredentials: true,
        }),
        axios.get(`${API}/events/`, { withCredentials: true }),
      ]);

      const calendarData = Array.isArray(resCal.data)
        ? resCal.data
        : resCal.data.events || [];
      const schoolData = resSchool.data.events || [];

      // IMPORTANT: Only include school events that actually fall within THIS month
      const filteredSchoolEvents = schoolData.filter((ev) => {
        const evDate = new Date(ev.startDate);
        return evDate >= start && evDate <= end;
      });

      setAllEvents([...calendarData, ...filteredSchoolEvents]);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadAll();
  }, [month, year]);

  const filtered =
    activeFilter === "All"
      ? allEvents
      : allEvents.filter((e) => e.type === activeFilter);
  const getDayEvents = (day) => {
    const target = new Date(year, month, day);
    return filtered.filter((ev) => {
      const s = new Date(ev.startDate);
      const e = ev.endDate ? new Date(ev.endDate) : s;
      s.setHours(0, 0, 0, 0);
      e.setHours(0, 0, 0, 0);
      return target >= s && target <= e;
    });
  };

  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  return (
    <div className="min-h-screen  p-2 sm:p-4 md:p-6 lg:p-8">
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[rgb(var(--text))] tracking-tight">
            Academic Calendar
          </h1>
          {/* <p className="text-sm text-[rgb(var(--text))]">Teacher View • Read Only</p> */}
        </div>
        <button
          onClick={loadAll}
          className={`p-2.5 rounded-xl border bg-[rgb(var(--surface))] shadow-sm hover:bg-gray-50 ${loading ? "animate-spin" : ""}`}
        >
          <FiRefreshCw size={18} className="text-[rgb(var(--text))]" />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 order-2 lg:order-1">
          {/* Controls & Filters */}
          <div className="bg-[rgb(var(--surface))] rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-2 flex-wrap">
  <button
    onClick={() => {
      if (month === 0) { setMonth(11); setYear((y) => y - 1); }
      else setMonth((m) => m - 1);
    }}
    className="p-2 rounded-xl cursor-pointer"
  >
    <FiChevronLeft />
  </button>

  <select
    value={month}
    onChange={(e) => setMonth(Number(e.target.value))}
    className="text-sm font-semibold border border-gray-200 rounded-lg px-2 py-1.5
               text-[rgb(var(--text))] bg-[rgb(var(--surface))]
               focus:outline-none focus:ring-2 focus:ring-indigo-300"
  >
    {MONTHS.map((m, i) => (
      <option key={i} value={i}>{m}</option>
    ))}
  </select>

  <select
    value={year}
    onChange={(e) => setYear(Number(e.target.value))}
    className="text-sm font-semibold border border-gray-200 rounded-lg px-2 py-1.5
               text-[rgb(var(--text))] bg-[rgb(var(--surface))]
               focus:outline-none focus:ring-2 focus:ring-indigo-300"
  >
    {Array.from({ length: 11 }, (_, i) => 2020 + i).map((y) => (
      <option key={y}>{y}</option>
    ))}
  </select>

  <button
    onClick={() => {
      if (month === 11) { setMonth(0); setYear((y) => y + 1); }
      else setMonth((m) => m + 1);
    }}
    className="p-2 rounded-xl cursor-pointer"
  >
    <FiChevronRight />
  </button>
</div>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setActiveFilter("All")}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${activeFilter === "All" ? "bg-gray-800 text-white" : "bg-white text-gray-600 hover:border-gray-300"}`}
                >
                  All ({allEvents.length})
                </button>
                {ALL_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveFilter(t)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${activeFilter === t ? `${TYPE_CONFIG[t].bg} text-white border-transparent` : `${TYPE_CONFIG[t].light} border-current hover:opacity-80`}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-[rgb(var(--surface))] rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-100 ">
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="py-3 text-center text-[10px] md:text-xs font-bold text-[rgb(var(--text))] uppercase tracking-wider"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div
                  key={`pad-${i}`}
                  className="h-20 sm:h-24 md:h-28 lg:h-32 border-b border-r border-gray-50 "
                />
              ))}
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                const dayEvents = getDayEvents(day);
                const isToday =
                  new Date().toDateString() ===
                  new Date(year, month, day).toDateString();
                return (
                  <div
                    key={day}
                    className={`h-20 sm:h-24 md:h-28 lg:h-32 border-b border-r border-gray-100 p-1 relative  transition-colors ${isToday ? "bg-[rgb(var(--primary))]" : ""}`}
                  >
                    <div
                      className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs sm:text-sm font-semibold mb-1 ${isToday ? "bg-[rgb(var(--bg))]  text-[rgb(var(--text))] shadow-sm" : "text-gray-700"}`}
                    >
                      {day}
                    </div>
                    {/* Desktop Labels */}
                    <div className="hidden sm:block space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev, idx) => (
                        <div
                          key={idx}
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate border ${TYPE_CONFIG[ev.type]?.light}`}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] font-bold text-indigo-500 px-1">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                    {/* Mobile Dots */}
                    <div className="sm:hidden flex flex-wrap gap-0.5 mt-1">
                      {dayEvents.map((ev, idx) => (
                        <div
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${TYPE_CONFIG[ev.type]?.bg}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Summary & Details */}
        <div className="w-full lg:w-80 order-1 lg:order-2 space-y-4">
          {/* Stats Grid */}
          <div className="bg-[rgb(var(--surface))] rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-[10px] font-bold text-[rgb(var(--text))] uppercase tracking-widest mb-3">
              Month Summary
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "Holidays",
                  val: allEvents.filter((e) => e.type === "Holiday").length,
                  color: "text-red-500",
                },
                {
                  label: "Exams",
                  val: allEvents.filter((e) => e.type === "Exam").length,
                  color: "text-amber-500",
                },
                {
                  label: "Events",
                  val: allEvents.filter((e) =>
                    ["Event", "Cultural", "Sports"].includes(e.type),
                  ).length,
                  color: "text-pink-500",
                },
                {
                  label: "Meetings",
                  val: allEvents.filter((e) => e.type === "Meeting").length,
                  color: "text-blue-500",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-[rgb(var(--surface))] border rounded-xl p-2 text-center"
                >
                  <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-[9px] text-[rgb(var(--text))] font-bold uppercase">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* List View for Mobile and Side View for Desktop */}
          <div className="bg-[rgb(var(--surface))] rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-[10px] font-bold text-[rgb(var(--text))] uppercase tracking-widest mb-3">
              Upcoming
            </h3>
            <div className="space-y-3 max-h-75 lg:max-h-125 overflow-y-auto pr-2">
              {filtered.slice(0, 8).map((ev, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 items-start p-2 rounded-xl transition-colors group"
                >
                  <div
                    className={`w-1 shrink-0 rounded-full self-stretch ${TYPE_CONFIG[ev.type]?.bg || "bg-gray-200"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[rgb(var(--text))] truncate">
                      {ev.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TYPE_CONFIG[ev.type]?.light}`}
                      >
                        {ev.type}
                      </span>
                      <span className="text-[10px] text-[rgb(var(--text))] font-medium">
                        {new Date(ev.startDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-xs text-[rgb(var(--text))] py-6">
                  No entries for this view
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
