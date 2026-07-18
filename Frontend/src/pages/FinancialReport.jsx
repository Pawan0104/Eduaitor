import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft, FaChartBar, FaPrint } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

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
const YEARS = Array.from({ length: currentYear - 2019 }, (_, i) => {
  const y = currentYear - i;
  return { label: String(y), value: String(y) };
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

  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  const basePath = user?.role === "staff_admin" ? "/staff" : "/school";

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = { year };
      if (month) params.month = month;
      const { data } = await axios.get(`${API}/fees/financial-report`, {
        params,
        withCredentials: true,
      });
      setReport(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

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
    a.download = `financial-report-${year}${month ? `-${month}` : ""}.csv`;
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
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm bg-[rgb(var(--surface))]"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm bg-[rgb(var(--surface))]"
          >
            {YEARS.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </select>
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
              Period:{" "}
              {month
                ? `${MONTHS.find((m) => m.value === month)?.label || month} `
                : "Full year "}
              {year}
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
                    <div key={r.month} className="text-sm">
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
            <h2 className="font-bold text-sm mb-3">By class</h2>
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
                    <tr key={r.classId || r.className} className="border-b border-slate-100">
                      <td className="py-2.5 font-medium">{r.className}</td>
                      <td className="py-2.5">{r.count}</td>
                      <td className="py-2.5 text-right font-semibold">
                        {fmtINR(r.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border bg-[rgb(var(--surface))] p-4 overflow-x-auto">
            <h2 className="font-bold text-sm mb-3">Recent payments</h2>
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
