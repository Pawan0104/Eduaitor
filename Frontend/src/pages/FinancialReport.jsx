import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft, FaChartBar, FaPrint } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const FILTER_OPTIONS = [
  { key: "fy", label: "Financial Year" },
  { key: "last_month", label: "Last Month" },
  { key: "custom", label: "Custom" },
];

const toYmd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** Indian FY: 1 Apr → 31 Mar. `startYear` is the April calendar year. */
const getFyBounds = (startYear) => {
  const from = new Date(startYear, 3, 1);
  const to = new Date(startYear + 1, 2, 31);
  return {
    from: toYmd(from),
    to: toYmd(to),
    label: `FY ${startYear}-${String(startYear + 1).slice(-2)}`,
  };
};

const currentFyStartYear = () => {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
};

const getLastMonthBounds = () => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    from: toYmd(from),
    to: toYmd(to),
    label: from.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
  };
};

const FY_OPTIONS = Array.from({ length: 8 }, (_, i) => {
  const start = currentFyStartYear() - i;
  return { value: String(start), ...getFyBounds(start) };
});

const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtYmd = (ymd) => {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function StatCard({ label, value, hint, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 border-slate-200 text-slate-800",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    blue: "bg-sky-50 border-sky-200 text-sky-800",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.slate}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="text-xl font-black mt-1">{value}</p>
      {hint && <p className="text-xs mt-1 opacity-70">{hint}</p>}
    </div>
  );
}

export default function FinancialReport() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const lastMonth = useMemo(() => getLastMonthBounds(), []);
  const [filterMode, setFilterMode] = useState("fy");
  const [fyStartYear, setFyStartYear] = useState(String(currentFyStartYear()));
  const [customFrom, setCustomFrom] = useState(lastMonth.from);
  const [customTo, setCustomTo] = useState(toYmd(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classDetail, setClassDetail] = useState(null);
  const [classLoading, setClassLoading] = useState(false);

  const basePath = user?.role === "staff_admin" ? "/staff" : "/school";

  const resetClassView = () => {
    setSelectedClass(null);
    setClassDetail(null);
    setClassLoading(false);
  };

  const range = useMemo(() => {
    if (filterMode === "last_month") {
      return getLastMonthBounds();
    }
    if (filterMode === "custom") {
      return {
        from: customFrom,
        to: customTo,
        label: `${fmtYmd(customFrom)} – ${fmtYmd(customTo)}`,
      };
    }
    return getFyBounds(Number(fyStartYear) || currentFyStartYear());
  }, [filterMode, fyStartYear, customFrom, customTo]);

  const fetchReport = useCallback(
    async (from = range.from, to = range.to) => {
      if (!from || !to) {
        setError("Select both from and to dates");
        return;
      }
      if (from > to) {
        setError("From date must be on or before to date");
        return;
      }

      try {
        setLoading(true);
        setError("");
        resetClassView();
        const { data } = await axios.get(`${API}/fees/financial-report`, {
          params: { from, to },
          withCredentials: true,
        });
        setReport(data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load report");
        setReport(null);
      } finally {
        setLoading(false);
      }
    },
    [range.from, range.to],
  );

  const openClassDetail = async (row) => {
    if (!row) return;
    setSelectedClass(row);
    setClassLoading(true);
    setClassDetail(null);
    try {
      const { data } = await axios.get(`${API}/fees/financial-report`, {
        params: {
          from: range.from,
          to: range.to,
          classId: row.classId || "unassigned",
        },
        withCredentials: true,
      });
      setClassDetail(data.classDetail || null);
    } catch (err) {
      setClassDetail(null);
      setError(err.response?.data?.message || "Failed to load class report");
    } finally {
      setClassLoading(false);
    }
  };

  // Auto-load for Financial Year / Last Month; Custom waits for Apply
  useEffect(() => {
    if (filterMode === "custom") return;
    fetchReport(range.from, range.to);
  }, [filterMode, fyStartYear, range.from, range.to, fetchReport]);

  const exportCsv = () => {
    if (!report) return;
    const rows = [
      ["Section", "Label", "Amount", "Count"],
      ...report.byMode.map((r) => ["Mode", r.mode, r.total, r.count]),
      ...report.byMonth.map((r) => ["Month", r.monthLabel, r.total, r.count]),
      ...report.byClass.map((r) => ["Class", r.className, r.total, r.count]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report-${range.from}_to_${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxMonth = Math.max(1, ...(report?.byMonth?.map((m) => m.total) || [1]));

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 print:hidden">
        <div>
          <button
            type="button"
            onClick={() => navigate(`${basePath}/dashboard`)}
            className="flex items-center gap-2 px-3 py-1.5 mb-3 rounded-xl bg-[rgb(var(--surface))] border text-sm font-bold"
          >
            <FaArrowLeft /> Back
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaChartBar className="text-[rgb(var(--primary))]" />
            Financial Report
          </h1>
          <p className="text-sm text-[rgb(var(--text-light))] mt-1">
            Fee collection summary for your school
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium flex items-center gap-2"
          >
            <FaPrint /> Print
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!report}
            className="px-3 py-2 rounded-lg border text-sm font-medium disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Bank-style period filter */}
      <div className="mb-5 rounded-2xl border bg-[rgb(var(--surface))] p-3 sm:p-4 print:hidden">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[rgb(var(--text-light))] mb-2">
          Period
        </p>
        <div className="flex p-1 rounded-xl bg-[rgb(var(--bg))] border border-[rgb(var(--border))]">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilterMode(opt.key)}
              className={`flex-1 px-2 sm:px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                filterMode === opt.key
                  ? "bg-[rgb(var(--primary))] text-white shadow-sm"
                  : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end">
          {filterMode === "fy" && (
            <label className="flex flex-col gap-1 text-xs font-medium text-[rgb(var(--text-muted))]">
              Select financial year
              <select
                value={fyStartYear}
                onChange={(e) => setFyStartYear(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm bg-[rgb(var(--bg))] text-[rgb(var(--text))] min-w-[180px]"
              >
                {FY_OPTIONS.map((fy) => (
                  <option key={fy.value} value={fy.value}>
                    {fy.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {filterMode === "last_month" && (
            <p className="text-sm text-[rgb(var(--text))]">
              Showing{" "}
              <span className="font-semibold">{getLastMonthBounds().label}</span>
            </p>
          )}

          {filterMode === "custom" && (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium text-[rgb(var(--text-muted))]">
                From
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="px-3 py-2 rounded-lg border text-sm bg-[rgb(var(--bg))] text-[rgb(var(--text))]"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-[rgb(var(--text-muted))]">
                To
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="px-3 py-2 rounded-lg border text-sm bg-[rgb(var(--bg))] text-[rgb(var(--text))]"
                />
              </label>
              <button
                type="button"
                onClick={() => fetchReport(customFrom, customTo)}
                className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] text-white text-sm font-semibold"
              >
                Apply
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-[rgb(var(--text-light))]">
          Loading report…
        </div>
      ) : !report ? (
        <div className="py-20 text-center text-[rgb(var(--text-light))]">
          No report data.
        </div>
      ) : (
        <div id="financial-report-print" className="space-y-6">
          <div className="rounded-2xl border bg-[rgb(var(--surface))] p-4">
            <p className="text-sm font-bold">
              {report.school?.name || "School"}
            </p>
            <p className="text-xs text-[rgb(var(--text-light))] mt-0.5">
              Period: {range.label}
            </p>
            <p className="text-[11px] text-[rgb(var(--text-light))] mt-0.5">
              {fmtYmd(range.from)} – {fmtYmd(range.to)}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard
              label="Collected"
              value={fmtINR(report.summary.totalCollected)}
              hint={`${report.summary.paymentCount} payments`}
              tone="emerald"
            />
            <StatCard
              label="Average payment"
              value={fmtINR(report.summary.avgPayment)}
              tone="blue"
            />
            <StatCard
              label="Outstanding dues"
              value={fmtINR(report.summary.outstandingDue)}
              hint={`${report.summary.studentsWithDue} students`}
              tone="amber"
            />
            <StatCard
              label="All-time paid"
              value={fmtINR(report.summary.totalPaidAllTime)}
              hint={`${report.summary.studentCount} students`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border bg-[rgb(var(--surface))] p-4">
              <h2 className="font-bold text-sm mb-3">By payment mode</h2>
              {report.byMode.length === 0 ? (
                <p className="text-sm text-[rgb(var(--text-light))]">No data</p>
              ) : (
                <div className="space-y-2">
                  {report.byMode.map((r) => (
                    <div
                      key={r.mode}
                      className="flex items-center justify-between text-sm border-b border-slate-100 pb-2"
                    >
                      <span className="font-medium">{r.mode}</span>
                      <span className="text-[rgb(var(--text-light))]">
                        {r.count} · {fmtINR(r.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-[rgb(var(--surface))] p-4">
              <h2 className="font-bold text-sm mb-3">Monthly collection</h2>
              {report.byMonth.length === 0 ? (
                <p className="text-sm text-[rgb(var(--text-light))]">No data</p>
              ) : (
                <div className="space-y-2">
                  {report.byMonth.map((r) => (
                    <div key={`${r.year}-${r.month}`} className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{r.monthLabel}</span>
                        <span>{fmtINR(r.total)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width: `${Math.max(4, (r.total / maxMonth) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-[rgb(var(--surface))] p-4 overflow-x-auto">
            {!selectedClass ? (
              <>
                <h2 className="font-bold text-sm mb-3">By class</h2>
                <p className="text-xs text-[rgb(var(--text-light))] mb-3">
                  Click a class to view its payments for this period
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-[rgb(var(--text-light))] border-b">
                      <th className="py-2">Class</th>
                      <th className="py-2">Payments</th>
                      <th className="py-2 text-right">Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byClass.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-[rgb(var(--text-light))]">
                          No class-wise data
                        </td>
                      </tr>
                    ) : (
                      report.byClass.map((r) => (
                        <tr
                          key={r.classId || r.className}
                          onClick={() => openClassDetail(r)}
                          className="border-b border-slate-100 cursor-pointer hover:bg-[rgba(var(--primary),0.06)] transition"
                        >
                          <td className="py-2.5 font-medium text-[rgb(var(--primary))] underline underline-offset-2 decoration-dotted">
                            {r.className}
                          </td>
                          <td className="py-2.5">{r.count}</td>
                          <td className="py-2.5 text-right font-semibold">
                            {fmtINR(r.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div>
                    <button
                      type="button"
                      onClick={resetClassView}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--primary))] mb-1"
                    >
                      <FaArrowLeft size={12} /> Back to all classes
                    </button>
                    <h2 className="font-bold text-sm">
                      {selectedClass.className}
                    </h2>
                    <p className="text-xs text-[rgb(var(--text-light))] mt-0.5">
                      Class collection for {range.label}
                    </p>
                  </div>
                  {classDetail && (
                    <div className="text-sm sm:text-right">
                      <p className="font-bold text-emerald-700">
                        {fmtINR(classDetail.total)}
                      </p>
                      <p className="text-xs text-[rgb(var(--text-light))]">
                        {classDetail.count} payment
                        {classDetail.count === 1 ? "" : "s"}
                      </p>
                    </div>
                  )}
                </div>

                {classLoading ? (
                  <p className="py-8 text-center text-sm text-[rgb(var(--text-light))]">
                    Loading class data…
                  </p>
                ) : !classDetail ? (
                  <p className="py-8 text-center text-sm text-[rgb(var(--text-light))]">
                    No data for this class.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {classDetail.byMode?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {classDetail.byMode.map((m) => (
                          <span
                            key={m.mode}
                            className="text-xs px-2.5 py-1 rounded-full border bg-[rgb(var(--bg))]"
                          >
                            {m.mode}: {fmtINR(m.total)} ({m.count})
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="table-x-scroll">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-[rgb(var(--text-light))] border-b">
                          <th className="py-2">Receipt</th>
                          <th className="py-2">Student</th>
                          <th className="py-2">Mode</th>
                          <th className="py-2">Date</th>
                          <th className="py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(classDetail.payments || []).length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-6 text-center text-[rgb(var(--text-light))]"
                            >
                              No payments in this period
                            </td>
                          </tr>
                        ) : (
                          classDetail.payments.map((p) => (
                            <tr key={p._id} className="border-b border-slate-100">
                              <td className="py-2.5 font-mono text-xs">
                                {p.receiptNo}
                              </td>
                              <td className="py-2.5">
                                {p.studentName || "—"}
                                {p.studentCode ? (
                                  <span className="block text-xs text-[rgb(var(--text-light))]">
                                    {p.studentCode}
                                    {p.rollNo ? ` · Roll ${p.rollNo}` : ""}
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-2.5">{p.paymentMode}</td>
                              <td className="py-2.5">{fmtDate(p.paidDate)}</td>
                              <td className="py-2.5 text-right font-semibold">
                                {fmtINR(p.amountPaid)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="rounded-2xl border bg-[rgb(var(--surface))] p-4 overflow-x-auto">
            <h2 className="font-bold text-sm mb-3">Recent payments</h2>
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-[rgb(var(--text-light))] border-b">
                  <th className="py-2">Receipt</th>
                  <th className="py-2">Student</th>
                  <th className="py-2">Mode</th>
                  <th className="py-2">Date</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(report.recentPayments || []).map((p) => (
                  <tr key={p._id} className="border-b border-slate-100">
                    <td className="py-2.5 font-mono text-xs">{p.receiptNo}</td>
                    <td className="py-2.5">
                      {p.studentName || "—"}
                      {p.studentCode ? (
                        <span className="block text-xs text-[rgb(var(--text-light))]">
                          {p.studentCode}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5">{p.paymentMode}</td>
                    <td className="py-2.5">{fmtDate(p.paidDate)}</td>
                    <td className="py-2.5 text-right font-semibold">
                      {fmtINR(p.amountPaid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #financial-report-print, #financial-report-print * { visibility: visible !important; }
          #financial-report-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page { margin: 12mm; }
        }
      `}</style>
    </div>
  );
}
