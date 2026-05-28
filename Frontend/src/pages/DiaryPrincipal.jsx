import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_STYLES = {
  homework: {
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    accent: "border-[rgb(var(--border-strong))]",
    dot: "bg-amber-400",
  },
  classwork: {
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    accent: "border-[rgb(var(--border-strong))]",
    dot: "bg-blue-400",
  },
  remark: {
    badge: "bg-violet-50 text-violet-700 border border-violet-200",
    accent: "border-[rgb(var(--border-strong))]",
    dot: "bg-violet-400",
  },
};

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

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

const fmtDay = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const initials = (name = "") =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  const colors = {
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 flex flex-col gap-0.5 bg-[rgb(var(--surface))] ${colors[color]}`}
    >
      <span className="text-xl font-semibold">{value}</span>
      <span className="text-xs font-medium opacity-60">{label}</span>
    </div>
  );
}

// ─── Diary Card ───────────────────────────────────────────────────────────────

function DiaryCard({ entry }) {
  const ts = TYPE_STYLES[entry.type] || TYPE_STYLES.remark;

  return (
    <div
      className={`bg-[rgb(var(--surface))] rounded-2xl border border-slate-200 border-l-4 ${ts.accent} p-4`}
    >
      {/* Top meta row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${ts.badge}`}
          >
            {entry.type}
          </span>

          {entry.classId?.name && (
            <span className="text-xs ">
              Class {entry.classId.name}
              {entry.sectionName ? ` · Sec ${entry.sectionName}` : ""}
              {entry.roomNumber ? ` (Rm ${entry.roomNumber})` : ""}
            </span>
          )}

          {entry.subjectId?.name && (
            <span className="text-xs  px-2 py-0.5 rounded-full">
              {entry.subjectId.name}
            </span>
          )}
        </div>

        <span className="text-xs  whitespace-nowrap shrink-0">
          {new Date(entry.date).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Content */}
      <p className="text-sm  leading-relaxed">{entry.content}</p>

      {/* Due date */}
      {entry.type === "homework" && entry.dueDate && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5 text-amber-500 shrink-0"
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
            Due {fmtDate(entry.dueDate)}
          </span>
        </div>
      )}

      {/* Teacher footer */}
      {entry.teacherId && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--text))] flex items-center justify-center  text-xs font-semibold shrink-0">
            {initials(entry.teacherId.name)}
          </div>
          <span className="text-xs text-[rgb(var(--text))]">{entry?.teacherId?.name} -</span>
        </div>
      )}
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ filters, onChange, classes, onClear, hasFilters }) {
  const selectedClass = classes.find((c) => c._id === filters.classId);
  const sections = selectedClass?.details || [];

  // sectionId stored in Diary = sectionDetail subdocument's own _id (s._id),
  // NOT the referenced Section collection document's id (s.sectionId._id).
  const selectedSection = sections.find(
    (s) => s._id?.toString() === filters.sectionId,
  );

  // ✅ FIX: subjects now resolve because the backend populates subjectTeachers.subjectId
  const subjects =
    selectedSection?.subjectTeachers?.filter((st) => st.subjectId?._id) || [];

  const selCls =
    "text-xs border rounded-xl px-3 py-2.5  text-[rgb(var(--text))] bg-[rgb(var(--surface))] focus:outline-none focus:ring-2  w-full";

  return (
    <div className="bg-[rgb(var(--surface))] rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold  uppercase tracking-widest">
          Filters
        </span>
        {hasFilters && (
          <button
            onClick={onClear}
            className="text-xs text-[rgb(var(--primary))] font-medium hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Row 1: Class + Section + Subject */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select
          className={selCls}
          value={filters.classId}
          onChange={(e) =>
            onChange({ classId: e.target.value, sectionId: "", subjectId: "" })
          }
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c._id} value={c._id}>
              Class {c.name}
            </option>
          ))}
        </select>

        <select
          className={selCls}
          value={filters.sectionId}
          disabled={!sections.length}
          onChange={(e) =>
            onChange({ sectionId: e.target.value, subjectId: "" })
          }
        >
          <option value="">All sections</option>
          {sections.map((s) => (
            // value = s._id (the sectionDetail subdocument's own _id)
            // This is what Diary.sectionId actually stores in the DB.
            <option key={s._id} value={s._id?.toString()}>
              Section {s.sectionId?.name} (Rm {s.roomNumber})
            </option>
          ))}
        </select>

        <select
          className={selCls}
          value={filters.subjectId}
          disabled={!subjects.length}
          onChange={(e) => onChange({ subjectId: e.target.value })}
        >
          <option value="">All subjects</option>
          {subjects.map(({ subjectId: s }) => (
            // ✅ FIX: s is now a populated object {_id, name, code}
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Row 2: Type + Month + Year + Date */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <select
          className={selCls}
          value={filters.type}
          onChange={(e) => onChange({ type: e.target.value })}
        >
          <option value="">All types</option>
          <option value="homework">Homework</option>
          <option value="classwork">Classwork</option>
          <option value="remark">Remark</option>
        </select>

        <select
          className={selCls}
          value={filters.month}
          onChange={(e) => onChange({ month: e.target.value, date: "" })}
        >
          <option value="">All months</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i}>
              {m}
            </option>
          ))}
        </select>

        <select
          className={selCls}
          value={filters.year}
          onChange={(e) => onChange({ year: e.target.value, date: "" })}
        >
          <option value="">All years</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <input
          type="date"
          className={`${selCls} col-span-2 sm:col-span-1`}
          value={filters.date}
          onChange={(e) =>
            onChange({ date: e.target.value, month: "", year: "" })
          }
        />
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }) {
  return (
    <div className="bg-[rgb(var(--surface))] text-[rgb(var(--primary))] rounded-2xl border border-slate-200 py-16 flex flex-col items-center gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl  flex items-center justify-center">
        <svg
          className="w-7 h-7 "
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium ">
          No diary entries found
        </p>
        <p className="text-xs  mt-1">
          {hasFilters
            ? "Try adjusting or clearing the filters"
            : "No entries have been added yet"}
        </p>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-2xl border border-slate-200 border-l-4 border-l-slate-200 p-4 space-y-2"
        >
          <div className="flex gap-2">
            <div className="h-5 w-20 bg-slate-100 rounded-full" />
            <div className="h-5 w-28 bg-slate-100 rounded-full" />
          </div>
          <div className="h-4 bg-slate-100 rounded w-full" />
          <div className="h-4 bg-slate-100 rounded w-3/4" />
          <div className="pt-2 border-t border-slate-100 flex gap-2 items-center">
            <div className="w-6 h-6 bg-slate-100 rounded-full" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const INIT_FILTERS = {
  classId: "",
  sectionId: "",
  subjectId: "",
  type: "",
  month: "",
  year: "",
  date: "",
};

export default function DiaryPrincipal() {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [classes, setClasses] = useState([]);
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    homework: 0,
    classwork: 0,
    remark: 0,
  });
  const [filters, setFilters] = useState(INIT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // ── Fetch filter options ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await axios.get(`${API}/diary/principal/filters`, {
          withCredentials: true,
        });
        setClasses(res.data.classes || []);
      } catch {
        toast.error("Failed to load filter options");
      }
    };
    fetchFilters();
  }, []);

  // ── Fetch diary entries ─────────────────────────────────────────────────────
  const fetchEntries = useCallback(async (f, pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => {
        if (v !== "") params.append(k, v);
      });
      params.append("page", pg);
      params.append("limit", 30);

      const res = await axios.get(
        `${API}/diary/principal?${params.toString()}`,
        {
          withCredentials: true,
        },
      );
console.log(res.data.data);
      setEntries(res.data.data || []);
      setStats(
        res.data.stats || { total: 0, homework: 0, classwork: 0, remark: 0 },
      );
      setPagination(res.data.pagination || { total: 0, pages: 1 });
    } catch {
      toast.error("Failed to load diary entries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries(filters, page);
  }, [filters, page, fetchEntries]);

  // ── Filter helpers ──────────────────────────────────────────────────────────
  const handleFilterChange = (updates) => {
    setFilters((f) => ({ ...f, ...updates }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(INIT_FILTERS);
    setPage(1);
  };

  const hasFilters = Object.values(filters).some((v) => v !== "");

  // ── Group entries by date ───────────────────────────────────────────────────
  const grouped = entries.reduce((acc, entry) => {
    const key = new Date(entry.date).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b) - new Date(a),
  );
  const activeCount = Object.values(filters).filter((v) => v !== "").length;

  return (
    <div className="min-h-screen ">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar
        closeOnClick
        pauseOnHover
      />

      {/* ── Sticky Header ────────────────────────────────────────────────────── */}
      <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
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
          <div>
            <h1 className="text-base font-semibold text-[rgb(var(--primary))] leading-tight">
              School Diary
            </h1>
            <p className="text-xs  mt-0.5">
              Principal view · All classes
            </p>
          </div>
          {activeCount > 0 && (
            <span className="sm:hidden text-xs font-medium text-[rgb(var(--text))]  border border-blue-200 px-2.5 py-1 rounded-full">
              {activeCount} filter{activeCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* ── Stat Cards ───────────────────────────────────────────────────── */}
        {/* ✅ FIX: each card now uses its own stat field, not total for all */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <StatCard label="Total" value={stats.total} color="slate" />
          <StatCard label="Homework" value={stats.homework} color="amber" />
          <StatCard label="Classwork" value={stats.classwork} color="blue" />
          <StatCard label="Remarks" value={stats.remark} color="violet" />
        </div>

        {/* ── Filter Bar ───────────────────────────────────────────────────── */}
        <FilterBar
          filters={filters}
          onChange={handleFilterChange}
          classes={classes}
          onClear={clearFilters}
          hasFilters={hasFilters}
        />

        {/* ── Results summary ───────────────────────────────────────────────── */}
        {!loading && (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs ">
              {pagination.total} entr{pagination.total !== 1 ? "ies" : "y"}{" "}
              found
              {hasFilters ? " (filtered)" : ""}
            </span>
            {pagination.pages > 1 && (
              <span className="text-xs ">
                Page {page} of {pagination.pages}
              </span>
            )}
          </div>
        )}

        {/* ── Entry List ────────────────────────────────────────────────────── */}
        {loading ? (
          <Skeleton />
        ) : sortedDates.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <div className="space-y-6">
            {sortedDates.map((dateKey) => (
              <div key={dateKey}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold  uppercase tracking-wide whitespace-nowrap">
                    {fmtDay(dateKey)}
                  </span>
                  <div className="flex-1 h-px " />
                  <span className="text-xs  whitespace-nowrap">
                    {grouped[dateKey].length} entr
                    {grouped[dateKey].length > 1 ? "ies" : "y"}
                  </span>
                </div>
                <div className="space-y-3">
                  {grouped[dateKey].map((entry) => (
                    <DiaryCard key={entry._id} entry={entry} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        {pagination.pages > 1 && !loading && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              ← Prev
            </button>

            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const p =
                  page <= 3
                    ? i + 1
                    : page >= pagination.pages - 2
                      ? pagination.pages - 4 + i
                      : page - 2 + i;
                if (p < 1 || p > pagination.pages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 text-xs font-medium rounded-xl transition-colors ${
                      p === page
                        ? "bg-slate-800 text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
