import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaArrowLeft,
  FaChartBar,
  FaFileAlt,
  FaFilePdf,
  FaPrint,
  FaUserGraduate,
} from "react-icons/fa";
import {
  FiClipboard,
  FiDownload,
  FiLayers,
  FiRefreshCw,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { API } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { printReportElement } from "../utils/printReport";
import {
  normalizeSchoolBranding,
  wrapCsvWithBranding,
} from "../utils/reportBranding";

const REPORT_TYPES = [
  {
    key: "enquiry",
    title: "Admission Enquiry Report",
    blurb: "Detailed lead / enquiry list with assignee and follow-ups.",
    icon: FaFileAlt,
  },
  {
    key: "status_summary",
    title: "Admission Status Summary",
    blurb: "Funnel view of lead and registration statuses.",
    icon: FaChartBar,
  },
  {
    key: "class_summary",
    title: "Admission Class-wise Summary",
    blurb: "Class-wise registration, exam and admission totals.",
    icon: FiLayers,
  },
  {
    key: "registration",
    title: "Registration Report",
    blurb: "Full registration register with exam outcome.",
    icon: FiClipboard,
  },
];

const toYmd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const startOfMonth = () => {
  const now = new Date();
  return toYmd(new Date(now.getFullYear(), now.getMonth(), 1));
};

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

const titleCase = (value = "") =>
  String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const downloadCsv = (filename, rows, branding = null, meta = {}) => {
  const escape = (cell) => {
    const text = String(cell ?? "");
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const withBrand = branding
    ? wrapCsvWithBranding(rows, branding, meta)
    : rows;
  const csv = withBrand.map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

export default function AdmissionReports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const basePath = user?.role === "staff_admin" ? "/staff" : "/school";
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  const [reportType, setReportType] = useState("enquiry");
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(toYmd(new Date()));
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const activeType = useMemo(
    () => REPORT_TYPES.find((item) => item.key === reportType) || REPORT_TYPES[0],
    [reportType],
  );

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
      const { data } = await axios.get(`${API}/admission-reports`, {
        params: {
          type: reportType,
          from: from || undefined,
          to: to || undefined,
          classId: classId || undefined,
          status: status || undefined,
          academicYear: academicYear || undefined,
        },
        withCredentials: true,
      });
      setReport(data?.data || null);
    } catch (error) {
      setReport(null);
      toast.error(
        error.response?.data?.message || "Could not generate the report.",
      );
    } finally {
      setLoading(false);
    }
  }, [reportType, from, to, classId, status, academicYear]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const statusOptions = useMemo(() => {
    if (reportType === "enquiry") {
      return ["active", "processing", "admitted", "cancelled"];
    }
    if (reportType === "registration" || reportType === "class_summary") {
      return [
        "registered",
        "exam_scheduled",
        "passed",
        "failed",
        "admitted",
        "cancelled",
      ];
    }
    return [];
  }, [reportType]);

  const schoolBranding = normalizeSchoolBranding(report?.meta?.school);
  const exportMeta = {
    title: activeType?.title || "Admission Report",
    subtitle: `Period: ${from || "—"} to ${to || "—"}`,
  };

  const exportCsv = () => {
    if (!report) return;
    const stamp = `${from || "all"}_to_${to || "all"}`;
    if (reportType === "enquiry") {
      downloadCsv(
        `admission-enquiry-report-${stamp}.csv`,
        [
          [
            "S.No",
            "Lead No",
            "Enquiry Date",
            "Student",
            "Parent",
            "Mobile",
            "Email",
            "Class",
            "Stream",
            "Previous School",
            "Assigned To",
            "Role",
            "Status",
            "Follow-ups",
            "Converted",
          ],
          ...(report.rows || []).map((row) => [
            row.sNo,
            row.leadNumber,
            fmtDate(row.enquiryDate),
            row.studentName,
            row.parentName,
            row.parentMobile,
            row.parentEmail,
            row.className,
            row.stream,
            row.previousSchoolName,
            row.assignedTo,
            row.assignedRole,
            row.status,
            row.followUps,
            row.converted ? "Yes" : "No",
          ]),
        ],
        schoolBranding,
        exportMeta,
      );
      return;
    }

    if (reportType === "status_summary") {
      downloadCsv(
        `admission-status-summary-${stamp}.csv`,
        [
          ["Section", "Status", "Count", "Share %"],
          ...(report.tables?.leadStatus || []).map((row) => [
            "Lead",
            row.status,
            row.count,
            row.share,
          ]),
          ...(report.tables?.registrationStatus || []).map((row) => [
            "Registration",
            row.status,
            row.count,
            row.share,
          ]),
          ["Funnel", "Stage", "Count", ""],
          ...(report.funnel || []).map((row) => [
            "Funnel",
            row.stage,
            row.count,
            "",
          ]),
        ],
        schoolBranding,
        exportMeta,
      );
      return;
    }

    if (reportType === "class_summary") {
      downloadCsv(
        `admission-class-summary-${stamp}.csv`,
        [
          [
            "Class",
            "Total",
            "Registered",
            "Exam Scheduled",
            "Passed",
            "Failed",
            "Admitted",
            "Cancelled",
            "Conversion %",
            "From Lead",
            "From Public",
            "From ERP",
          ],
          ...(report.rows || []).map((row) => [
            row.className,
            row.total,
            row.registered,
            row.exam_scheduled,
            row.passed,
            row.failed,
            row.admitted,
            row.cancelled,
            row.conversionRate,
            row.fromLead,
            row.fromPublic,
            row.fromErp,
          ]),
        ],
        schoolBranding,
        exportMeta,
      );
      return;
    }

    downloadCsv(`registration-report-${stamp}.csv`, [
      [
        "S.No",
        "Reg No",
        "Date",
        "Session",
        "Student",
        "Gender",
        "DOB",
        "Class",
        "Section",
        "Parent",
        "Mobile",
        "Email",
        "City",
        "Previous School",
        "Source",
        "Status",
        "Exam",
        "Exam Date",
        "Result",
        "Marks",
        "Admitted At",
      ],
      ...(report.rows || []).map((row) => [
        row.sNo,
        row.registrationNumber,
        fmtDate(row.registrationDate),
        row.academicYear,
        row.studentName,
        row.gender,
        fmtDate(row.dob),
        row.className,
        row.sectionName,
        row.parentName,
        row.parentMobile,
        row.parentEmail,
        row.city,
        row.previousSchoolName,
        row.source,
        row.status,
        row.entranceExam,
        fmtDate(row.entranceDate),
        row.entranceResult,
        row.obtainedMarks !== ""
          ? `${row.obtainedMarks}/${row.totalMarks}`
          : "",
        fmtDate(row.admittedAt),
      ]),
    ], schoolBranding, exportMeta);
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
              onClick={() => navigate(`${basePath}/menu`)}
              className="mb-3 flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5 text-sm font-bold"
            >
              <FaArrowLeft size={12} /> Back
            </button>
          )}
          <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
            <FaUserGraduate className="text-[rgb(var(--primary))]" />
            Admission Reports
          </h1>
          <p className="mt-0.5 text-sm text-[rgb(var(--text-muted))]">
            Generate detailed enquiry, status, class-wise and registration
            reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchReport}
            className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-2.5 text-sm font-medium"
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            onClick={() =>
              printReportElement("admission-report-print", {
                title: activeType?.title || "Admission Report",
                subtitle: `Period: ${from || "—"} to ${to || "—"}`,
                branding: schoolBranding,
                asPdf: false,
                onInfo: (msg) => toast.info(msg),
                onError: (msg) => toast.error(msg),
              })
            }
            disabled={!report}
            className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <FaPrint size={13} /> Print
          </button>
          <button
            type="button"
            onClick={() =>
              printReportElement("admission-report-print", {
                title: activeType?.title || "Admission Report",
                subtitle: `Period: ${from || "—"} to ${to || "—"}`,
                branding: schoolBranding,
                asPdf: true,
                onInfo: (msg) => toast.info(msg),
                onError: (msg) => toast.error(msg),
              })
            }
            disabled={!report}
            className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            <FaFilePdf size={13} /> PDF
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!report}
            className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            <FiDownload size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 print:hidden sm:grid-cols-2 xl:grid-cols-4">
        {REPORT_TYPES.map((item) => {
          const Icon = item.icon;
          const active = reportType === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setReportType(item.key);
                setStatus("");
              }}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-[rgb(var(--primary))] bg-[rgba(var(--primary),0.08)] shadow-sm"
                  : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:bg-[rgb(var(--bg))]"
              }`}
            >
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(var(--primary),0.1)] text-[rgb(var(--primary))]">
                <Icon size={16} />
              </div>
              <p className="font-semibold text-[rgb(var(--text))]">{item.title}</p>
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1 text-xs font-medium text-[rgb(var(--text-muted))]">
            From date
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm text-[rgb(var(--text))]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[rgb(var(--text-muted))]">
            To date
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm text-[rgb(var(--text))]"
            />
          </label>
          {(reportType === "class_summary" ||
            reportType === "registration" ||
            reportType === "status_summary") && (
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
          )}
          {statusOptions.length > 0 && (
            <label className="flex flex-col gap-1 text-xs font-medium text-[rgb(var(--text-muted))]">
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm text-[rgb(var(--text))]"
              >
                <option value="">All statuses</option>
                {statusOptions.map((item) => (
                  <option key={item} value={item}>
                    {titleCase(item)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(reportType === "class_summary" ||
            reportType === "registration" ||
            reportType === "status_summary") && (
            <label className="flex flex-col gap-1 text-xs font-medium text-[rgb(var(--text-muted))]">
              Academic session
              <input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2026-27"
                className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5 text-sm text-[rgb(var(--text))]"
              />
            </label>
          )}
        </div>
      </div>

      <div id="admission-report-print" className="space-y-5">
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[rgb(var(--text))]">
                {report?.meta?.title || activeType.title}
              </h2>
              <p className="text-sm text-[rgb(var(--text-muted))]">
                {report?.meta?.description || activeType.blurb}
              </p>
            </div>
            <p className="text-xs text-[rgb(var(--text-muted))]">
              Period: {from || "—"} to {to || "—"}
              {report?.meta?.generatedAt
                ? ` · Generated ${fmtDate(report.meta.generatedAt)}`
                : ""}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 py-12 text-center text-[rgb(var(--text-muted))]">
            Generating report…
          </p>
        ) : !report ? (
          <p className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 py-12 text-center text-[rgb(var(--text-muted))]">
            No report data available for the selected filters.
          </p>
        ) : (
          <>
            {reportType === "enquiry" && (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard
                    label="Total Enquiries"
                    value={report.summary?.totalEnquiries || 0}
                  />
                  <StatCard
                    label="Converted"
                    value={report.summary?.converted || 0}
                  />
                  <StatCard
                    label="With Registration"
                    value={report.summary?.withRegistration || 0}
                  />
                  <StatCard
                    label="Active"
                    value={report.summary?.byStatus?.active || 0}
                  />
                </div>
                <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-[rgb(var(--bg))] text-xs uppercase tracking-wide text-[rgb(var(--text-muted))]">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Lead</th>
                          <th className="px-4 py-3">Enquiry Date</th>
                          <th className="px-4 py-3">Student / Parent</th>
                          <th className="px-4 py-3">Contact</th>
                          <th className="px-4 py-3">Class / Stream</th>
                          <th className="px-4 py-3">Assigned To</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Follow-ups</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(report.rows || []).length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="px-4 py-10 text-center text-[rgb(var(--text-muted))]"
                            >
                              No enquiries found for this period.
                            </td>
                          </tr>
                        ) : (
                          report.rows.map((row) => (
                            <tr
                              key={`${row.leadNumber}-${row.sNo}`}
                              className="border-t border-[rgb(var(--border))]"
                            >
                              <td className="px-4 py-3">{row.sNo}</td>
                              <td className="px-4 py-3 font-semibold">
                                {row.leadNumber}
                              </td>
                              <td className="px-4 py-3">
                                {fmtDate(row.enquiryDate)}
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-semibold">{row.studentName}</p>
                                <p className="text-xs text-[rgb(var(--text-muted))]">
                                  {row.parentName}
                                  {row.previousSchoolName
                                    ? ` · ${row.previousSchoolName}`
                                    : ""}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <p>{row.parentMobile || "—"}</p>
                                <p className="text-xs text-[rgb(var(--text-muted))]">
                                  {row.parentEmail || "—"}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <p>{row.className || "—"}</p>
                                <p className="text-xs text-[rgb(var(--text-muted))]">
                                  {row.stream || ""}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <p>{row.assignedTo || "—"}</p>
                                <p className="text-xs text-[rgb(var(--text-muted))]">
                                  {row.assignedRole || ""}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                {titleCase(row.status)}
                                {row.converted ? " · Converted" : ""}
                              </td>
                              <td className="px-4 py-3">{row.followUps}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {reportType === "status_summary" && (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard
                    label="Total Leads"
                    value={report.summary?.totalLeads || 0}
                  />
                  <StatCard
                    label="Total Registrations"
                    value={report.summary?.totalRegistrations || 0}
                  />
                  <StatCard
                    label="Lead Admitted"
                    value={report.summary?.leadByStatus?.admitted || 0}
                  />
                  <StatCard
                    label="Registration Admitted"
                    value={report.summary?.registrationByStatus?.admitted || 0}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
                    <h3 className="mb-3 text-lg font-semibold">Admission Funnel</h3>
                    <div className="space-y-3">
                      {(report.funnel || []).map((stage) => (
                        <div
                          key={stage.stage}
                          className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold">{stage.stage}</p>
                            <p className="text-lg font-bold">{stage.count}</p>
                          </div>
                          <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                            {stage.hint}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
                      <div className="border-b border-[rgb(var(--border))] px-4 py-3 font-semibold">
                        Lead Status Breakdown
                      </div>
                      <table className="min-w-full text-sm">
                        <thead className="bg-[rgb(var(--bg))] text-xs uppercase text-[rgb(var(--text-muted))]">
                          <tr>
                            <th className="px-4 py-2 text-left">Status</th>
                            <th className="px-4 py-2 text-right">Count</th>
                            <th className="px-4 py-2 text-right">Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(report.tables?.leadStatus || []).map((row) => (
                            <tr
                              key={`lead-${row.status}`}
                              className="border-t border-[rgb(var(--border))]"
                            >
                              <td className="px-4 py-2">{titleCase(row.status)}</td>
                              <td className="px-4 py-2 text-right">{row.count}</td>
                              <td className="px-4 py-2 text-right">
                                {row.share}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
                      <div className="border-b border-[rgb(var(--border))] px-4 py-3 font-semibold">
                        Registration Status Breakdown
                      </div>
                      <table className="min-w-full text-sm">
                        <thead className="bg-[rgb(var(--bg))] text-xs uppercase text-[rgb(var(--text-muted))]">
                          <tr>
                            <th className="px-4 py-2 text-left">Status</th>
                            <th className="px-4 py-2 text-right">Count</th>
                            <th className="px-4 py-2 text-right">Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(report.tables?.registrationStatus || []).map(
                            (row) => (
                              <tr
                                key={`reg-${row.status}`}
                                className="border-t border-[rgb(var(--border))]"
                              >
                                <td className="px-4 py-2">
                                  {titleCase(row.status)}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  {row.count}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  {row.share}%
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {reportType === "class_summary" && (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard label="Classes" value={report.summary?.classes || 0} />
                  <StatCard
                    label="Total Registrations"
                    value={report.summary?.total || 0}
                  />
                  <StatCard
                    label="Admitted"
                    value={report.summary?.admitted || 0}
                  />
                  <StatCard
                    label="Conversion"
                    value={`${report.summary?.overallConversion || 0}%`}
                  />
                </div>
                <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-[rgb(var(--bg))] text-xs uppercase tracking-wide text-[rgb(var(--text-muted))]">
                        <tr>
                          <th className="px-4 py-3">Class</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-right">Registered</th>
                          <th className="px-4 py-3 text-right">Exam</th>
                          <th className="px-4 py-3 text-right">Passed</th>
                          <th className="px-4 py-3 text-right">Failed</th>
                          <th className="px-4 py-3 text-right">Admitted</th>
                          <th className="px-4 py-3 text-right">Cancelled</th>
                          <th className="px-4 py-3 text-right">Conversion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(report.rows || []).length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="px-4 py-10 text-center text-[rgb(var(--text-muted))]"
                            >
                              No class-wise registration data found.
                            </td>
                          </tr>
                        ) : (
                          report.rows.map((row) => (
                            <tr
                              key={String(row.classId || row.className)}
                              className="border-t border-[rgb(var(--border))]"
                            >
                              <td className="px-4 py-3 font-semibold">
                                {row.className}
                                <p className="text-xs font-normal text-[rgb(var(--text-muted))]">
                                  Lead {row.fromLead} · Public {row.fromPublic} ·
                                  ERP {row.fromErp}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-right">{row.total}</td>
                              <td className="px-4 py-3 text-right">
                                {row.registered}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {row.exam_scheduled}
                              </td>
                              <td className="px-4 py-3 text-right">{row.passed}</td>
                              <td className="px-4 py-3 text-right">{row.failed}</td>
                              <td className="px-4 py-3 text-right">
                                {row.admitted}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {row.cancelled}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {row.conversionRate}%
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

            {reportType === "registration" && (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard
                    label="Total Registrations"
                    value={report.summary?.totalRegistrations || 0}
                  />
                  <StatCard
                    label="Passed"
                    value={report.summary?.passed || 0}
                  />
                  <StatCard
                    label="Failed"
                    value={report.summary?.failed || 0}
                  />
                  <StatCard
                    label="Admitted"
                    value={report.summary?.admitted || 0}
                  />
                </div>
                <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-[rgb(var(--bg))] text-xs uppercase tracking-wide text-[rgb(var(--text-muted))]">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Reg No / Date</th>
                          <th className="px-4 py-3">Student</th>
                          <th className="px-4 py-3">Class</th>
                          <th className="px-4 py-3">Parent</th>
                          <th className="px-4 py-3">Source</th>
                          <th className="px-4 py-3">Exam</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(report.rows || []).length === 0 ? (
                          <tr>
                            <td
                              colSpan={8}
                              className="px-4 py-10 text-center text-[rgb(var(--text-muted))]"
                            >
                              No registrations found for this period.
                            </td>
                          </tr>
                        ) : (
                          report.rows.map((row) => (
                            <tr
                              key={`${row.registrationNumber}-${row.sNo}`}
                              className="border-t border-[rgb(var(--border))]"
                            >
                              <td className="px-4 py-3">{row.sNo}</td>
                              <td className="px-4 py-3">
                                <p className="font-semibold">
                                  {row.registrationNumber}
                                </p>
                                <p className="text-xs text-[rgb(var(--text-muted))]">
                                  {fmtDate(row.registrationDate)}
                                  {row.academicYear
                                    ? ` · ${row.academicYear}`
                                    : ""}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-semibold">{row.studentName}</p>
                                <p className="text-xs text-[rgb(var(--text-muted))]">
                                  {row.gender || "—"}
                                  {row.dob ? ` · ${fmtDate(row.dob)}` : ""}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                {row.className || "—"}
                                {row.sectionName ? ` · ${row.sectionName}` : ""}
                              </td>
                              <td className="px-4 py-3">
                                <p>{row.parentName || "—"}</p>
                                <p className="text-xs text-[rgb(var(--text-muted))]">
                                  {row.parentMobile || "—"}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                {titleCase(row.source)}
                              </td>
                              <td className="px-4 py-3">
                                {row.entranceExam ? (
                                  <>
                                    <p>{row.entranceExam}</p>
                                    <p className="text-xs text-[rgb(var(--text-muted))]">
                                      {fmtDate(row.entranceDate)} ·{" "}
                                      {titleCase(row.entranceResult || "pending")}
                                      {row.obtainedMarks !== ""
                                        ? ` · ${row.obtainedMarks}/${row.totalMarks}`
                                        : ""}
                                    </p>
                                  </>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {titleCase(row.status)}
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
          </>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #admission-report-print, #admission-report-print * { visibility: visible !important; }
          #admission-report-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
