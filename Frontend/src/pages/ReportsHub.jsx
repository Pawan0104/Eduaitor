import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaChartBar,
  FaChartPie,
  FaClipboardCheck,
  FaFileInvoiceDollar,
  FaUserCheck,
  FaUserGraduate,
  FaWallet,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const REPORT_GROUPS = [
  {
    key: "admission",
    title: "Admission",
    blurb: "Enquiry, funnel and registration summaries.",
    items: [
      {
        key: "admission-reports",
        title: "Admission Reports",
        description:
          "Enquiry list, status summary, class-wise and registration reports.",
        path: "admission-reports",
        icon: FaUserGraduate,
      },
    ],
  },
  {
    key: "fees",
    title: "Fees",
    blurb: "Collections, dues and financial health.",
    items: [
      {
        key: "fee-report",
        title: "Fee / Financial Report",
        description: "Collection trends, paid vs pending and session-wise totals.",
        path: "financial-report",
        icon: FaFileInvoiceDollar,
      },
      {
        key: "defaulters",
        title: "Fee Defaulters",
        description: "Students with outstanding dues for follow-up.",
        path: "defaulters",
        icon: FaWallet,
      },
      {
        key: "fee-history",
        title: "Fee History",
        description: "Payment history and receipt trail.",
        path: "fee-history",
        icon: FaChartBar,
      },
    ],
  },
  {
    key: "attendance",
    title: "Attendance",
    blurb: "Student and staff presence reports.",
    items: [
      {
        key: "attendance-report",
        title: "Attendance Report",
        description: "Class-wise student attendance summary and drill-down.",
        path: "attendance",
        icon: FaUserCheck,
      },
      {
        key: "leave-request",
        title: "Leave Requests",
        description: "Leave applications raised by students or staff.",
        path: "leave-request",
        icon: FaClipboardCheck,
      },
    ],
  },
];

export default function ReportsHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = user?.role === "staff_admin";
  const basePath = isStaff ? "/staff" : "/school";
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  const groups = useMemo(
    () =>
      REPORT_GROUPS.map((group) => ({
        ...group,
        items: group.items
          .filter((item) => !(item.schoolOnly && isStaff))
          .map((item) => ({
            ...item,
            href: `${basePath}/${item.path}`,
          })),
      })).filter((group) => group.items.length > 0),
    [basePath, isStaff],
  );

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] p-4 text-[rgb(var(--text))] md:p-6">
      {isMobile && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5 text-sm font-bold"
        >
          <FaArrowLeft size={12} /> Back
        </button>
      )}

      <div className="mb-8">
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
          <FaChartPie className="text-[rgb(var(--primary))]" />
          Reports
        </h1>
        <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
          Open fee, attendance, admission and academic reports from one place.
        </p>
      </div>

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.key}>
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-[rgb(var(--text))]">
                {group.title}
              </h2>
              <p className="text-sm text-[rgb(var(--text-muted))]">{group.blurb}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => navigate(item.href)}
                    className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 text-left transition hover:border-[rgb(var(--primary))] hover:bg-[rgba(var(--primary),0.04)]"
                  >
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(var(--primary),0.1)] text-[rgb(var(--primary))]">
                      <Icon size={18} />
                    </div>
                    <p className="text-base font-semibold text-[rgb(var(--text))]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
