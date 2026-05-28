import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCalendar,
  FiMapPin,
  FiUser,
  FiUsers,
  FiClock,
  FiTag,
  FiCheckCircle,
  FiAlertCircle,
  FiAward,
} from "react-icons/fi";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const TYPE_COLORS = {
  Competition: {
    bg: "bg-orange-100",
    text: "text-orange-600",
    border: "border-orange-200",
  },
  Cultural: {
    bg: "bg-pink-100",
    text: "text-pink-600",
    border: "border-pink-200",
  },
  Sports: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-200",
  },
  Administrative: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    border: "border-gray-200",
  },
};

const PRIORITY_COLORS = {
  High: { bg: "bg-red-100", text: "text-red-600" },
  Normal: { bg: "bg-blue-100", text: "text-blue-600" },
  Low: { bg: "bg-slate-100", text: "text-slate-500" },
};

/* ── compute status from dates ── */
const getStatus = (ev) => {
  if (!ev) return { label: "—", cls: "bg-gray-100 text-gray-500" };
  const now = new Date();
  const start = new Date(ev.startDate);
  const end = ev.endDate ? new Date(ev.endDate) : start;
  if (now < start)
    return { label: "Upcoming", cls: "bg-indigo-100 text-indigo-600" };
  if (now > end)
    return { label: "Completed", cls: "bg-gray-100   text-gray-500" };
  return { label: "Ongoing", cls: "bg-green-100  text-green-700" };
};

/* ── countdown logic ── */
const getCountdownTarget = (ev) => {
  if (!ev) return null;
  const now = new Date();
  const start = new Date(ev.startDate);
  const end = ev.endDate ? new Date(ev.endDate) : start;
  if (now < start) return { target: start, label: "Starts in" };
  if (now <= end) return { target: end, label: "Ends in" };
  return null;
};

const calcTimeLeft = (target) => {
  const diff = target - new Date();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
};

/* ══════════════════════════════════════════════════════════ */
export default function EventView() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);
  const [cdLabel, setCdLabel] = useState("");

  const isAdmin = user?.role === "school_admin";
  const isTeacher = user?.role === "teacher_admin";
  const isStudent = user?.role === "student_admin";

  /* ── fetch event ── */
  useEffect(() => {
    axios
      .get(`${API}/events/detail/${id}`)
      .then(({ data }) => setEvent(data.event))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  /* ── countdown tick ── */
  useEffect(() => {
    if (!event) return;
    const info = getCountdownTarget(event);
    if (!info) return;
    setCdLabel(info.label);
    setTimeLeft(calcTimeLeft(info.target));
    const timer = setInterval(() => {
      const tl = calcTimeLeft(info.target);
      if (!tl) {
        clearInterval(timer);
        setTimeLeft(null);
        return;
      }
      setTimeLeft(tl);
    }, 1000);
    return () => clearInterval(timer);
  }, [event]);

  /* ── states ── */
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!event)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400 gap-3">
        <FiAlertCircle size={36} />
        <p className="text-sm">Event not found.</p>
        <button
          onClick={() => {
            if (!user?.role) return;

            if (isAdmin) navigate("/school/event");
            else if (isTeacher) navigate("/teacher/event");
            else if (isStudent) navigate("/parent/event");
          }}
          className="text-indigo-500 text-sm hover:underline"
        >
          Go back
        </button>
      </div>
    );

  const status = getStatus(event);
  const typeCls = TYPE_COLORS[event.type] || TYPE_COLORS.Administrative;
  const prioCls = PRIORITY_COLORS[event.priority] || PRIORITY_COLORS.Normal;
  const isCompleted = status.label === "Completed";

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div className="w-full p-8">
      {/* ── Back ── */}
      <button
        onClick={() => {
          if (!user?.role) return;

          if (isAdmin) navigate("/school/event");
          else if (isTeacher) navigate("/teacher/event");
          else if (isStudent) navigate("/parent/event");
        }}
        className="flex items-center gap-2 text-sm  text-[rgb(var(--text))] mb-6 transition"
      >
        <FiArrowLeft size={15} /> Back to Events
      </button>

      {/* ── Hero Card ── */}
      <div className="bg-[rgb(var(--surface))] rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        {/* colour strip */}
        <div className={`h-1.5 w-full ${typeCls.bg}`} />

        <div className="p-6 sm:p-8">
          {/* top row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold  leading-tight mb-3">
                {event.title}
              </h1>

              {/* badges */}
              <div className="flex flex-wrap gap-2">
                <span
                  className={`text-[11px] font-bold px-3 py-1 rounded-full border ${typeCls.bg} ${typeCls.text} ${typeCls.border}`}
                >
                  {event.type?.toUpperCase()}
                </span>
                <span
                  className={`text-[11px] font-bold px-3 py-1 rounded-full ${status.cls}`}
                >
                  {status.label}
                </span>
                <span
                  className={`text-[11px] font-bold px-3 py-1 rounded-full ${prioCls.bg} ${prioCls.text}`}
                >
                  {event.priority} Priority
                </span>
                {event.registrationRequired && (
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full text-[rgb(var(--text))]">
                    Registration Required
                  </span>
                )}
              </div>
            </div>

            {/* attendees bubble */}
            <div className="flex flex-col items-center justify-center bg-indigo-50 rounded-2xl px-6 py-4 shrink-0">
              <FiUsers size={20} className="text-[rgb(var(--primary))] mb-1" />
              <p className="text-2xl font-bold text-[rgb(var(--primary))]">
                {event.attendees ?? 0}
              </p>
              <p className="text-xs text-[rgb(var(--primary))] font-medium">Attendees</p>
            </div>
          </div>

          {/* ── Countdown ── */}
          {!isCompleted && timeLeft && (
            <div className="bg-linear-to-br rounded-2xl border p-5 mb-6">
              <p className="text-xs font-semibold  uppercase tracking-widest mb-4 flex items-center gap-2">
                <FiClock size={13} /> {cdLabel}
              </p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { value: timeLeft.days, unit: "Days" },
                  { value: timeLeft.hours, unit: "Hours" },
                  { value: timeLeft.minutes, unit: "Minutes" },
                  { value: timeLeft.seconds, unit: "Seconds" },
                ].map((t, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center bg-[rgb(var(--surface))] rounded-xl py-3 px-2 border border-gray-200 shadow-sm"
                  >
                    <span className="text-2xl sm:text-3xl font-bold text-[rgb(var(--primary))] tabular-nums leading-none">
                      {String(t.value).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] text-[rgb(var(--primary))] font-semibold mt-1 uppercase tracking-wide">
                      {t.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Completed banner ── */}
          {isCompleted && (
            <div className="flex items-center gap-3  border-gray-200 rounded-xl px-5 py-4 mb-6">
              <FiCheckCircle size={20} className="text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[rgb(var(--primary))]">
                  This event has been completed
                </p>
                <p className="text-xs text-[rgb(var(--primary))] ">
                  No countdown available for past events
                </p>
              </div>
            </div>
          )}

          {/* ── Info Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <InfoCard
              icon={<FiCalendar />}
              label="Start Date & Time"
              value={`${event.startDate?.slice(0, 10)} at ${event.time}`}
              color="text-indigo-500"
            />
            <InfoCard
              icon={<FiCalendar />}
              label="End Date"
              value={event.endDate?.slice(0, 10) || "Same as start date"}
              color="text-indigo-500"
            />
            <InfoCard
              icon={<FiMapPin />}
              label="Location"
              value={event.location}
              color="text-pink-500"
            />
            <InfoCard
              icon={<FiUser />}
              label="Organizer"
              value={event.organizer}
              color="text-amber-500"
            />
            <InfoCard
              icon={<FiTag />}
              label="Assigned Class"
              value={event.assignClass}
              color="text-green-500"
            />
            <InfoCard
              icon={<FiAward />}
              label="Participant Capacity"
              value={
                event.capacity
                  ? `${event.capacity} max participants`
                  : "Unlimited"
              }
              color="text-purple-500"
            />
          </div>

          {/* ── Description ── */}
          <div className=" rounded-xl p-5 border border-slate-100">
            <p className="text-xs font-semibold  uppercase tracking-widest mb-3">
              Description
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>
        </div>
      </div>

      {/* ── Meta footer ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs text-[rgb(var(--primary))]">
        <span>
          Created:{" "}
          {new Date(event.createdAt).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
        <span>
          Last updated:{" "}
          {new Date(event.updatedAt).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
      </div>
    </div>
  );
}

/* ── Reusable info card ── */
function InfoCard({ icon, label, value, color }) {
  return (
    <div className="flex items-start gap-3 bg-[rgb(var(--surface))] border border-gray-200 rounded-xl p-4 shadow-sm">
      <span className={`mt-0.5 shrink-0 text-lg ${color}`}>{icon}</span>
      <div>
        <p className="text-xs text-[rgb(var(--text-muted))] font-medium mb-0.5">{label}</p>
        <p className="text-sm text-[rgb(var(--text))] font-semibold">{value}</p>
      </div>
    </div>
  );
}
