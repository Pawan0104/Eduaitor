import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

/* ─── Constants ──────────────────────────────────────────── */
const LIMIT = 20;

const MONTHS = [
  { label: "All Months", value: "" },
  { label: "January", value: "1" },
  { label: "February", value: "2" },
  { label: "March", value: "3" },
  { label: "April", value: "4" },
  { label: "May", value: "5" },
  { label: "June", value: "6" },
  { label: "July", value: "7" },
  { label: "August", value: "8" },
  { label: "September", value: "9" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

const currentYear = new Date().getFullYear();
const YEARS = [
  { label: "All Years", value: "" },
  ...Array.from({ length: currentYear - 2019 }, (_, i) => {
    const y = currentYear - i;
    return { label: String(y), value: String(y) };
  }),
];

/* ─── Helpers ────────────────────────────────────────────── */
function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(amt) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amt);
}

const MODE_STYLE = {
  Cash: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Online: "bg-blue-50   text-blue-700   border-blue-200",
  Cheque: "bg-amber-50  text-amber-700  border-amber-200",
  UPI: "bg-violet-50 text-violet-700 border-violet-200",
};

/* ─── Sub-components ─────────────────────────────────────── */
function Badge({ mode }) {
  const cls =
    MODE_STYLE[mode] || "bg-stone-100 text-stone-600 border-stone-200";
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full border font-sans font-medium ${cls}`}
    >
      {mode}
    </span>
  );
}

function Skeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="border-b border-stone-100">
          {[...Array(6)].map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 rounded bg-stone-100 animate-pulse"
                style={{ width: `${60 + ((j * 7) % 30)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages = [];
    const delta = 2;
    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);

    if (left > 1) {
      pages.push(1);
      if (left > 2) pages.push("…");
    }
    for (let p = left; p <= right; p++) pages.push(p);
    if (right < totalPages) {
      if (right < totalPages - 1) pages.push("…");
      pages.push(totalPages);
    }
    return pages;
  };

  const btn =
    "min-w-[36px] h-9 px-2 text-sm rounded-lg font-sans transition flex items-center justify-center";

  return (
    <div className="flex items-center justify-center gap-1 flex-wrap pt-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${btn} border border-stone-200 text-stone-500 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {getPages().map((p, i) =>
        p === "…" ? (
          <span key={`dots-${i}`} className="text-stone-400 px-1 font-sans text-sm select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`${btn} border font-medium ${
              p === currentPage
                ? "bg-stone-800 text-white border-stone-800"
                : "border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${btn} border border-stone-200 text-stone-500 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
function AdminFeeHistory() {
  const API = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [totalAmount, setTotalAmount] = useState(0);

  const debounceRef = useRef(null);

  // Load schools list
  useEffect(() => {
    axios
      .get(`${API}/schools`, { withCredentials: true })
      .then((r) => setSchools(r.data.data || []))
      .catch(() => {});
  }, [API]);

  const fetchHistory = useCallback(
    async (params) => {
      if (!params.schoolId) return;
      try {
        setLoading(true);
        setError(null);
        const { data } = await axios.get(`${API}/fee-history/admin`, {
          params: { ...params },
          withCredentials: true,
        });
        setRecords(data.Allhistory || []);
        setPagination(data.pagination || { total: 0, totalPages: 1 });
        setTotalAmount(data.summary?.totalAmount || 0);
      } catch (err) {
        setError("Could not load fee history. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [API],
  );

  useEffect(() => {
    const params = { schoolId: selectedSchoolId, page, limit: LIMIT, search, month, year };

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (search) {
      debounceRef.current = setTimeout(() => fetchHistory(params), 500);
    } else {
      fetchHistory(params);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, month, year, page, selectedSchoolId, fetchHistory]);

  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const from = pagination.total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = Math.min(page * LIMIT, pagination.total);

  const activeMonthLabel = MONTHS.find((m) => m.value === month)?.label || "";
  const summaryLabel =
    [activeMonthLabel !== "All Months" && activeMonthLabel, year]
      .filter(Boolean)
      .join(" ") || "all time";

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] py-8" style={{ fontFamily: "Georgia, serif" }}>
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
        <div className="pt-4 px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-xl bg-[rgb(var(--primary))] shadow-sm border border-slate-100 text-sm font-bold text-[rgb(var(--text))] active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="border-b border-stone-200 px-4 sm:px-8 py-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-xs tracking-widest uppercase mb-1 font-sans">Super Admin</p>
            <h1 className="text-2xl sm:text-3xl text-[rgb(var(--primary))] font-normal tracking-tight">
              Fee Collection History
            </h1>
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-sans mb-0.5">Total collected · {summaryLabel}</p>
            <p className="text-2xl font-semibold font-sans">
              {loading ? (
                <span className="inline-block h-7 w-28 rounded bg-[rgb(var(--primary))] animate-pulse align-middle" />
              ) : (
                formatAmount(totalAmount)
              )}
            </p>
            <p className="text-xs font-sans mt-0.5">
              {pagination.total} record{pagination.total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6">
        {/* ── School Selector ── */}
        <div className="mb-4">
          <label className="block text-xs font-semibold font-sans mb-1.5 text-[rgb(var(--text))]">
            Select School
          </label>
          <select
            value={selectedSchoolId}
            onChange={(e) => handleFilterChange(setSelectedSchoolId)(e.target.value)}
            className="w-full sm:w-72 appearance-none pl-3 pr-8 py-2.5 text-sm border-stone-200 rounded-lg text-[rgb(var(--text))] bg-[rgb(var(--surface))] focus:outline-none focus:ring-2 font-sans cursor-pointer"
          >
            <option value="" className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
              — Select a school —
            </option>
            {schools.map((s) => (
              <option key={s._id} value={s._id} className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                {s.school_name}
              </option>
            ))}
          </select>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search name, student ID, receipt…"
              value={search}
              onChange={(e) => handleFilterChange(setSearch)(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 text-sm border-stone-200 rounded-lg border-1 bg-[rgb(var(--surface))] focus:outline-none focus:ring-2 focus:ring-stone-300 font-sans transition"
            />
            {search && (
              <button
                onClick={() => handleFilterChange(setSearch)("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="relative sm:w-40">
            <select
              value={month}
              onChange={(e) => handleFilterChange(setMonth)(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm border-stone-200 rounded-lg text-[rgb(var(--text))] bg-[rgb(var(--surface))] focus:outline-none focus:ring-2 font-sans cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value} className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                  {m.label}
                </option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--primary))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <div className="relative sm:w-32">
            <select
              value={year}
              onChange={(e) => handleFilterChange(setYear)(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm border-stone-200 rounded-lg text-[rgb(var(--text))] bg-[rgb(var(--surface))] focus:outline-none focus:ring-2 font-sans cursor-pointer"
            >
              {YEARS.map((y) => (
                <option key={y.value} value={y.value} className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                  {y.label}
                </option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--primary))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 font-sans text-sm text-red-600">
            <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0z" />
            </svg>
            {error}
            <button
              onClick={() => fetchHistory({ schoolId: selectedSchoolId, page, limit: LIMIT, search, month, year })}
              className="ml-auto underline text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Table — desktop ── */}
        <div className="hidden md:block bg-[rgb(var(--surface))] border border-stone-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200">
                {["Receipt", "Student", "Class", "Amount", "Mode", "Date & Remarks", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider font-sans">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <Skeleton />
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 font-sans text-sm">
                    {selectedSchoolId ? "No records found" : "Select a school to view fee history"}
                  </td>
                </tr>
              ) : (
                records.map((item) => {
                  const s = item.studentId;
                  return (
                    <tr key={item._id} className="border-b border-stone-100 text-[rgb(var(--text))] transition-colors">
                      <td className="px-4 py-3 text-xs font-sans font-medium">{item.receiptNo}</td>
                      <td className="px-4 py-3">
                        <p className="text-[rgb(var(--primary))] font-medium">
                          {s?.firstName} {s?.lastName}
                        </p>
                        <p className="text-xs font-sans">{s?.studentId}</p>
                      </td>
                      <td className="px-4 py-3 font-sans">
                        {s?.className}-{s?.section}
                      </td>
                      <td className="px-4 py-3 font-sans font-semibold">{formatAmount(item.amountPaid)}</td>
                      <td className="px-4 py-3"><Badge mode={item.paymentMode} /></td>
                      <td className="px-4 py-3 font-sans text-xs">
                        {formatDate(item.paidDate)}
                        {item.remarks && (
                          <p className="mt-0.5 max-w-45 truncate" title={item.remarks}>{item.remarks}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/fees/receipt/${item._id}`)}
                          className="text-xs font-bold text-emerald-700 hover:underline"
                        >
                          Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Cards — mobile ── */}
        <div className="md:hidden space-y-3">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-stone-200 p-4 space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-4 bg-stone-100 rounded animate-pulse" />
                ))}
              </div>
            ))
          ) : records.length === 0 ? (
            <div className="text-center py-16 font-sans text-sm">
              {selectedSchoolId ? "No records found" : "Select a school to view fee history"}
            </div>
          ) : (
            records.map((item) => {
              const s = item.studentId;
              return (
                <div key={item._id} className="bg-[rgb(var(--surface))] rounded-xl border border-stone-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-medium text-stone-800">{s?.firstName} {s?.lastName}</p>
                      <p className="text-xs text-stone-400 font-sans">{s?.studentId} · Class {s?.className}-{s?.section}</p>
                    </div>
                    <p className="text-base font-semibold text-stone-800 font-sans shrink-0">{formatAmount(item.amountPaid)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-sans text-stone-500">
                    <span className="bg-stone-100 px-2 py-0.5 rounded-full">{item.receiptNo}</span>
                    <Badge mode={item.paymentMode} />
                    <span>{formatDate(item.paidDate)}</span>
                  </div>
                  {item.remarks && (
                    <p className="mt-2 text-xs text-stone-400 font-sans border-t border-stone-100 pt-2">{item.remarks}</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && pagination.total > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-[rgb(var(--text))] font-sans">
              Showing {from}–{to} of {pagination.total} records
            </p>
            <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminFeeHistory;