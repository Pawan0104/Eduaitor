import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  FaArrowLeft,
  FaCalendarDay,
  FaCalendarWeek,
  FaFileExcel,
  FaFilePdf,
  FaPrint,
  FaRupeeSign,
  FaUserClock,
  FaWallet,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { printReportHtml } from "../utils/printReport";
import {
  normalizeSchoolBranding,
  wrapExcelWithBranding,
} from "../utils/reportBranding";

const API = import.meta.env.VITE_API_URL;

const REPORT_TYPES = [
  {
    key: "daily",
    title: "Daily Collection",
    blurb: "Fees collected on a selected day.",
    icon: FaCalendarDay,
  },
  {
    key: "weekly",
    title: "Weekly Collection",
    blurb: "Fees collected across the selected week.",
    icon: FaCalendarWeek,
  },
  {
    key: "collected",
    title: "Fees Collected",
    blurb: "Who paid in the selected period.",
    icon: FaWallet,
  },
  {
    key: "due",
    title: "Due Fees",
    blurb: "Students with outstanding dues.",
    icon: FaRupeeSign,
  },
  {
    key: "defaulters",
    title: "Defaulters",
    blurb: "Due students who have not paid this month.",
    icon: FaUserClock,
  },
];

const toYmd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const startOfWeekMonday = (date = new Date()) => {
  const start = new Date(date);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
};

const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const StatCard = ({ label, value, hint }) => (
  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
      {label}
    </p>
    <p className="mt-1 text-xl font-bold text-[rgb(var(--text))]">{value}</p>
    {hint ? (
      <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{hint}</p>
    ) : null}
  </div>
);

export default function FinancialReport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const basePath = user?.role === "staff_admin" ? "/staff" : "/school";
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  const [reportType, setReportType] = useState("daily");
  const [day, setDay] = useState(toYmd(new Date()));
  const [weekStart, setWeekStart] = useState(toYmd(startOfWeekMonday()));
  const [from, setFrom] = useState(
    toYmd(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
  );
  const [to, setTo] = useState(toYmd(new Date()));
  const [classId, setClassId] = useState("");
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const activeType =
    REPORT_TYPES.find((item) => item.key === reportType) || REPORT_TYPES[0];

  const isPaymentReport =
    reportType === "daily" ||
    reportType === "weekly" ||
    reportType === "collected";

  const loadClasses = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/classes/all`, {
        withCredentials: true,
      });
      setClasses(data?.classes || []);
    } catch {
      setClasses([]);
    }
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = { type: reportType, classId: classId || undefined };
      if (reportType === "daily") params.day = day;
      if (reportType === "weekly") params.weekStart = weekStart;
      if (reportType === "collected") {
        params.from = from;
        params.to = to;
      }
      const { data } = await axios.get(`${API}/fees/reports`, {
        params,
        withCredentials: true,
      });
      setReport(data?.data || null);
    } catch (error) {
      setReport(null);
      toast.error(
        error.response?.data?.message || "Could not generate the fee report.",
      );
    } finally {
      setLoading(false);
    }
  }, [reportType, day, weekStart, from, to, classId]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const periodLabel = useMemo(() => {
    if (reportType === "daily") return fmtDate(day);
    if (reportType === "weekly") {
      const start = new Date(`${weekStart}T00:00:00`);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${fmtDate(start)} – ${fmtDate(end)}`;
    }
    if (reportType === "collected") return `${fmtDate(from)} – ${fmtDate(to)}`;
    return "As of today";
  }, [reportType, day, weekStart, from, to]);

  const excelRows = useMemo(() => {
    if (!report?.rows) return [];
    if (isPaymentReport) {
      return [
        [
          "S.No",
          "Receipt",
          "Date",
          "Student",
          "Admission No",
          "Class",
          "Section",
          "Roll",
          "Mobile",
          "Mode",
          "Amount",
          "UTR / Txn",
        ],
        ...report.rows.map((row) => [
          row.sNo,
          row.receiptNo,
          fmtDate(row.paidDate),
          row.studentName,
          row.studentCode,
          row.className,
          row.sectionName,
          row.rollNo,
          row.parentMobile,
          row.paymentMode,
          row.amountPaid,
          row.utr || row.transactionId || "",
        ]),
      ];
    }
    return [
      [
        "S.No",
        "Student",
        "Admission No",
        "Class",
        "Section",
        "Roll",
        "Mobile",
        "Final Fee",
        "Paid",
        "Due",
        "Last Paid",
      ],
      ...report.rows.map((row) => [
        row.sNo,
        row.studentName,
        row.studentCode,
        row.className,
        row.sectionName,
        row.rollNo,
        row.parentMobile,
        row.finalFee,
        row.totalPaid,
        row.dueAmount,
        fmtDate(row.lastPaidDate),
      ]),
    ];
  }, [report, isPaymentReport]);

  const schoolBranding = normalizeSchoolBranding(report?.meta?.school);

  const exportExcel = () => {
    if (!report?.rows?.length) {
      toast.error("No rows to export.");
      return;
    }
    const title = report.meta?.title || activeType.title;
    const aoa = wrapExcelWithBranding(excelRows, schoolBranding, {
      title,
      subtitle: `Period: ${periodLabel} · Generated ${fmtDate(
        report.meta?.generatedAt || new Date(),
      )}`,
    });
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Fee Report");
    XLSX.writeFile(
      book,
      `fee-${reportType}-report-${toYmd(new Date())}.xlsx`,
    );
  };

  const openPrintPdf = (asPdf = false) => {
    if (!report) {
      toast.error("Load a report first");
      return;
    }
    const title = report.meta?.title || activeType.title;
    const schoolName = schoolBranding.name || "School";
    const tableHtml = isPaymentReport
      ? `<table>
          <thead><tr>
            <th>#</th><th>Receipt</th><th>Date</th><th>Student</th><th>Class</th><th>Mode</th><th>Amount</th>
          </tr></thead>
          <tbody>
            ${(report.rows || [])
              .map(
                (row) => `<tr>
              <td>${row.sNo}</td>
              <td>${row.receiptNo || "—"}</td>
              <td>${fmtDate(row.paidDate)}</td>
              <td>${row.studentName || "—"}</td>
              <td>${row.className || "—"}${row.sectionName ? ` · ${row.sectionName}` : ""}</td>
              <td>${row.paymentMode || "—"}</td>
              <td>${fmtINR(row.amountPaid)}</td>
            </tr>`,
              )
              .join("")}
          </tbody>
        </table>`
      : `<table>
          <thead><tr>
            <th>#</th><th>Student</th><th>Class</th><th>Mobile</th><th>Paid</th><th>Due</th>
          </tr></thead>
          <tbody>
            ${(report.rows || [])
              .map(
                (row) => `<tr>
              <td>${row.sNo}</td>
              <td>${row.studentName || "—"}</td>
              <td>${row.className || "—"}${row.sectionName ? ` · ${row.sectionName}` : ""}</td>
              <td>${row.parentMobile || "—"}</td>
              <td>${fmtINR(row.totalPaid)}</td>
              <td>${fmtINR(row.dueAmount)}</td>
            </tr>`,
              )
              .join("")}
          </tbody>
        </table>`;

    const summaryHtml = isPaymentReport
      ? `<p><b>Total collected:</b> ${fmtINR(report.summary?.totalCollected)} · <b>Payments:</b> ${report.summary?.paymentCount || 0}</p>`
      : `<p><b>Students:</b> ${report.summary?.studentCount || 0} · <b>Total due:</b> ${fmtINR(report.summary?.totalDue)}</p>`;

    printReportHtml({
      title,
      subtitle: `Period: ${periodLabel} · Generated ${fmtDate(report.meta?.generatedAt || new Date())}`,
      bodyHtml: `${summaryHtml}${tableHtml}`,
      branding: schoolBranding.name ? schoolBranding : { name: schoolName },
      asPdf,
      onInfo: (msg) => toast.info(msg),
      onError: (msg) => toast.error(msg),
    });
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] p-4 text-[rgb(var(--text))] md:p-6">
      {isMobile && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5 text-sm font-bold print:hidden"
        >
          <FaArrowLeft size={12} /> Back
        </button>
      )}

      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end print:hidden">
        <div>
          {!isMobile && (
            <button
              type="button"
              onClick={() => navigate(`${basePath}/reports`)}
              className="mb-3 flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5 text-sm font-bold"
            >
              <FaArrowLeft size={12} /> Back
            </button>
          )}
          <h1 className="text-2xl font-bold md:text-3xl">Fee Reports</h1>
          <p className="mt-0.5 text-sm text-[rgb(var(--text-muted))]">
            Generate daily, weekly, collected, due and defaulter fee reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openPrintPdf(false)}
            disabled={!report}
            className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            <FaPrint size={13} /> Print
          </button>
          <button
            type="button"
            onClick={() => openPrintPdf(true)}
            disabled={!report}
            className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            <FaFilePdf size={13} /> PDF
          </button>
          <button
            type="button"
            onClick={exportExcel}
            disabled={!report}
            className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <FaFileExcel size={13} /> Excel
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 print:hidden sm:grid-cols-2 xl:grid-cols-5">
        {REPORT_TYPES.map((item) => {
          const Icon = item.icon;
          const active = reportType === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setReportType(item.key)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-[rgb(var(--primary))] bg-[rgba(var(--primary),0.08)] shadow-sm"
                  : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:bg-[rgb(var(--bg))]"
              }`}
            >
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(var(--primary),0.1)] text-[rgb(var(--primary))]">
                <Icon size={16} />
              </div>
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                {item.blurb}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mb-5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 print:hidden">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[rgb(var(--text-muted))]">
          Filters
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {reportType === "daily" && (
            <label className="flex flex-col gap-1 text-xs font-medium text-[rgb(var(--text-muted))]">
              Date
              <input
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm text-[rgb(var(--text))]"
              />
            </label>
          )}
          {reportType === "weekly" && (
            <label className="flex flex-col gap-1 text-xs font-medium text-[rgb(var(--text-muted))]">
              Week starting (Monday)
              <input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm text-[rgb(var(--text))]"
              />
            </label>
          )}
          {reportType === "collected" && (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium text-[rgb(var(--text-muted))]">
                From
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm text-[rgb(var(--text))]"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-[rgb(var(--text-muted))]">
                To
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm text-[rgb(var(--text))]"
                />
              </label>
            </>
          )}
          <label className="flex flex-col gap-1 text-xs font-medium text-[rgb(var(--text-muted))]">
            Class
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm text-[rgb(var(--text))]"
            >
              <option value="">All classes</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div id="fee-report-print" className="space-y-5">
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {report?.meta?.title || activeType.title}
              </h2>
              <p className="text-sm text-[rgb(var(--text-muted))]">
                {report?.meta?.school?.name || "School"} · {periodLabel}
              </p>
            </div>
            <p className="text-xs text-[rgb(var(--text-muted))]">
              Generated {fmtDate(report?.meta?.generatedAt || new Date())}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 py-12 text-center text-[rgb(var(--text-muted))]">
            Generating report…
          </p>
        ) : !report ? (
          <p className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 py-12 text-center text-[rgb(var(--text-muted))]">
            No report data for the selected filters.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {isPaymentReport ? (
                <>
                  <StatCard
                    label="Total Collected"
                    value={fmtINR(report.summary?.totalCollected)}
                  />
                  <StatCard
                    label="Payments"
                    value={report.summary?.paymentCount || 0}
                  />
                  {(report.summary?.byMode || []).slice(0, 2).map((mode) => (
                    <StatCard
                      key={mode.mode}
                      label={mode.mode}
                      value={fmtINR(mode.total)}
                    />
                  ))}
                </>
              ) : (
                <>
                  <StatCard
                    label="Students"
                    value={report.summary?.studentCount || 0}
                  />
                  <StatCard
                    label="Total Due"
                    value={fmtINR(report.summary?.totalDue)}
                  />
                  <StatCard
                    label="Already Paid"
                    value={fmtINR(report.summary?.totalPaid)}
                  />
                </>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[rgb(var(--bg))] text-xs uppercase tracking-wide text-[rgb(var(--text-muted))]">
                    {isPaymentReport ? (
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Receipt / Date</th>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3">Mobile</th>
                        <th className="px-4 py-3 text-right">Paid</th>
                        <th className="px-4 py-3 text-right">Due</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {(report.rows || []).length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-[rgb(var(--text-muted))]"
                        >
                          No records found for this report.
                        </td>
                      </tr>
                    ) : isPaymentReport ? (
                      report.rows.map((row) => (
                        <tr
                          key={`${row.receiptNo}-${row.sNo}`}
                          className="border-t border-[rgb(var(--border))]"
                        >
                          <td className="px-4 py-3">{row.sNo}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold">{row.receiptNo || "—"}</p>
                            <p className="text-xs text-[rgb(var(--text-muted))]">
                              {fmtDate(row.paidDate)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold">{row.studentName || "—"}</p>
                            <p className="text-xs text-[rgb(var(--text-muted))]">
                              {row.studentCode || "—"}
                              {row.rollNo ? ` · Roll ${row.rollNo}` : ""}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {row.className || "—"}
                            {row.sectionName ? ` · ${row.sectionName}` : ""}
                          </td>
                          <td className="px-4 py-3">{row.paymentMode || "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {fmtINR(row.amountPaid)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      report.rows.map((row) => (
                        <tr
                          key={`${row.studentCode}-${row.sNo}`}
                          className="border-t border-[rgb(var(--border))]"
                        >
                          <td className="px-4 py-3">{row.sNo}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold">{row.studentName || "—"}</p>
                            <p className="text-xs text-[rgb(var(--text-muted))]">
                              {row.studentCode || "—"}
                              {row.rollNo ? ` · Roll ${row.rollNo}` : ""}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {row.className || "—"}
                            {row.sectionName ? ` · ${row.sectionName}` : ""}
                          </td>
                          <td className="px-4 py-3">{row.parentMobile || "—"}</td>
                          <td className="px-4 py-3 text-right">
                            {fmtINR(row.totalPaid)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-rose-600">
                            {fmtINR(row.dueAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
