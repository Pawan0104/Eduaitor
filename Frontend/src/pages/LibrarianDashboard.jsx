import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaArrowLeft,
  FaArrowRight,
  FaBook,
  FaBookOpen,
  FaCoins,
  FaExclamationTriangle,
  FaLayerGroup,
  FaPlus,
} from "react-icons/fa";
import { FiSettings } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import UpComingNotifications from "../components/UpComingNotifications";
import RoleCampusDashboard from "../components/dashboards/RoleCampusDashboard";
import DashboardLayoutPicker, {
  useDashboardLayout,
} from "../components/dashboards/DashboardLayoutPicker";

// Update this to wherever your full LibraryManagement page is routed
const LIBRARY_MANAGEMENT_ROUTE = "/staff/library";

const LibrarianDashboard = () => {
  const API = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const [layout, setLayout] = useDashboardLayout();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [summary, setSummary] = useState({
    totalIssued: 0,
    overdue: 0,
    returned: 0,
    pendingFine: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [booksRes, issuesRes] = await Promise.all([
        axios.get(`${API}/library/books`, { withCredentials: true }),
        axios.get(`${API}/library/issues`, {
          params: { status: "all" },
          withCredentials: true,
        }),
      ]);

      setBooks(booksRes.data.data || []);
      setIssues(issuesRes.data.allissuebook || []);
      setSummary(
        issuesRes.data.summary || {
          totalIssued: 0,
          overdue: 0,
          returned: 0,
          pendingFine: 0,
        },
      );
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Could not load dashboard data",
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------- Derived data ----------
  const totalTitles = books.length;
  const totalCopies = books.reduce((sum, b) => sum + (b.totalCopies || 0), 0);
  const availableCopies = books.reduce(
    (sum, b) => sum + (b.availableCopies || 0),
    0,
  );

  const lowStockBooks = [...books]
    .filter((b) => (b.availableCopies || 0) < 2)
    .sort((a, b) => (a.availableCopies || 0) - (b.availableCopies || 0));

  const overdueIssues = issues
    .filter((i) => i.status === "Overdue")
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const recentIssues = [...issues]
    .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate))
    .slice(0, 6);

  const categoryBreakdown = books.reduce((acc, book) => {
    const key = book.category || "Uncategorized";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topCategories = Object.entries(categoryBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const statCards = [
    { label: "Total Titles", value: totalTitles, icon: FaBook, tone: "blue" },
    {
      label: "Copies Available",
      value: `${availableCopies}/${totalCopies}`,
      icon: FaLayerGroup,
      tone: "slate",
    },
    {
      label: "Active Issues",
      value: summary.totalIssued,
      icon: FaBookOpen,
      tone: "green",
    },
    {
      label: "Overdue",
      value: summary.overdue,
      icon: FaExclamationTriangle,
      tone: "red",
    },
    {
      label: "Pending Fine",
      value: `Rs ${summary.pendingFine || 0}`,
      icon: FaCoins,
      tone: "amber",
    },
  ];

  const campusSummaries = [
    {
      title: "Catalog",
      tone: "blue",
      path: LIBRARY_MANAGEMENT_ROUTE,
      rows: [
        ["Titles", totalTitles],
        ["Available", availableCopies],
        ["Total Copies", totalCopies],
      ],
    },
    {
      title: "Issues",
      tone: "green",
      path: LIBRARY_MANAGEMENT_ROUTE,
      rows: [
        ["Active", summary.totalIssued],
        ["Returned", summary.returned],
        ["Overdue", summary.overdue],
      ],
    },
    {
      title: "Fines",
      tone: "orange",
      path: LIBRARY_MANAGEMENT_ROUTE,
      rows: [
        ["Pending Fine", `Rs ${summary.pendingFine || 0}`],
        ["Low Stock", lowStockBooks.length],
        ["Categories", topCategories.length],
      ],
    },
    {
      title: "Follow-up",
      tone: "red",
      path: LIBRARY_MANAGEMENT_ROUTE,
      rows: [
        ["Overdue Books", overdueIssues.length],
        ["Recent Issues", recentIssues.length],
        ["Status", loading ? "Loading" : "Ready"],
      ],
    },
  ];

  const campusModules = [
    { label: "Manage Library", path: LIBRARY_MANAGEMENT_ROUTE, icon: FaBook },
    { label: "Issues", path: LIBRARY_MANAGEMENT_ROUTE, icon: FaBookOpen },
    { label: "Categories", path: LIBRARY_MANAGEMENT_ROUTE, icon: FaLayerGroup },
    { label: "Fines", path: LIBRARY_MANAGEMENT_ROUTE, icon: FaCoins },
  ];

  return (
    <div className="min-h-screen text-[rgb(var(--text))] p-4 sm:p-6 lg:p-8">
      <ToastContainer />

      {isMobile && (
        <button
          onClick={() => navigate(-1)}
          className="mb-3 flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5 text-sm font-bold text-[rgb(var(--text))] shadow-sm active:scale-95 transition-transform"
        >
          <FaArrowLeft size={14} />
          Back
        </button>
      )}

      {/* Header */}
      <div className="mx-auto max-w-7xl rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 py-6 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--primary))]">
              {today}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[rgb(var(--text))] sm:text-3xl">
              {greeting}, Librarian
            </h1>
            <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
              Here's what's happening in your library today.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-2.5 text-sm font-bold text-[rgb(var(--text))] sm:w-auto"
            >
              <FiSettings size={14} />
              Dashboard Settings
            </button>
            <button
              onClick={() => navigate(LIBRARY_MANAGEMENT_ROUTE)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-4 py-2.5 text-sm font-bold text-white shadow-sm sm:w-auto"
            >
              <FaPlus size={12} />
              Manage Library
            </button>
          </div>
        </div>
        {settingsOpen && (
          <div className="mt-5 border-t border-[rgb(var(--border))] pt-5">
            <DashboardLayoutPicker layout={layout} onLayoutChange={setLayout} />
          </div>
        )}
      </div>

      <div className="mt-2">
        <UpComingNotifications />
      </div>

      {layout === "campus" ? (
        <div className="mx-auto mt-6 max-w-7xl">
          <RoleCampusDashboard
            roleLabel="Librarian"
            profilePath="/staff/id-card"
            menuPath="/staff/dashboard"
            summaries={campusSummaries}
            modules={campusModules}
            showStatBars
            showFeeTrend={false}
            showNotices={false}
            showEvents={false}
            statBarsTitle="Library Snapshot"
            statBars={[
              { label: "Titles", value: totalTitles, color: "bg-sky-500" },
              {
                label: "Available",
                value: availableCopies,
                color: "bg-emerald-500",
              },
              {
                label: "Issued",
                value: summary.totalIssued,
                color: "bg-amber-500",
              },
              {
                label: "Overdue",
                value: summary.overdue,
                color: "bg-rose-500",
              },
            ]}
          />
        </div>
      ) : (
      <div className="mx-auto max-w-7xl mt-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} loading={loading} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Overdue books */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-sm lg:col-span-2">
            <SectionHeader
              title="Overdue Books"
              subtitle={`${overdueIssues.length} book(s) need follow-up`}
              actionLabel="View all"
              onAction={() => navigate(LIBRARY_MANAGEMENT_ROUTE)}
            />
            <div className="divide-y divide-[rgb(var(--border))]">
              {loading ? (
                <SkeletonRows />
              ) : overdueIssues.length === 0 ? (
                <EmptyRow text="No overdue books right now. Nice work." />
              ) : (
                overdueIssues
                  .slice(0, 6)
                  .map((issue) => <OverdueRow key={issue._id} issue={issue} />)
              )}
            </div>
          </div>

          {/* Low stock */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-sm">
            <SectionHeader
              title="Low Stock"
              subtitle={`${lowStockBooks.length} title(s) below 2 copies`}
            />
            <div className="divide-y divide-[rgb(var(--border))]">
              {loading ? (
                <SkeletonRows />
              ) : lowStockBooks.length === 0 ? (
                <EmptyRow text="Stock levels look healthy." />
              ) : (
                lowStockBooks
                  .slice(0, 6)
                  .map((book) => <LowStockRow key={book._id} book={book} />)
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent activity */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-sm lg:col-span-2">
            <SectionHeader
              title="Recent Activity"
              subtitle="Latest issues across the library"
              actionLabel="View all"
              onAction={() => navigate(LIBRARY_MANAGEMENT_ROUTE)}
            />
            <div className="divide-y divide-[rgb(var(--border))]">
              {loading ? (
                <SkeletonRows />
              ) : recentIssues.length === 0 ? (
                <EmptyRow text="No issue activity yet." />
              ) : (
                recentIssues.map((issue) => (
                  <ActivityRow key={issue._id} issue={issue} />
                ))
              )}
            </div>
          </div>

          {/* Category breakdown */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-wide text-[rgb(var(--text))]">
              Catalog by Category
            </h3>
            <p className="mb-4 mt-0.5 text-xs text-[rgb(var(--text-muted))]">
              Top {topCategories.length || 0} categories
            </p>
            {loading ? (
              <SkeletonRows />
            ) : topCategories.length === 0 ? (
              <EmptyRow text="Add books to see category breakdown." />
            ) : (
              <div className="space-y-3">
                {topCategories.map(([category, count]) => (
                  <CategoryBar
                    key={category}
                    category={category}
                    count={count}
                    max={topCategories[0][1]}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

const TONE_STYLES = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-600",
  slate: "bg-slate-100 text-slate-600",
};

const StatCard = ({ label, value, icon: Icon, tone, loading }) => (
  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">
        {label}
      </span>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${TONE_STYLES[tone]}`}
      >
        <Icon size={12} />
      </span>
    </div>
    <p className="mt-3 text-xl font-black text-[rgb(var(--text))] sm:text-2xl">
      {loading ? "—" : value}
    </p>
  </div>
);

const SectionHeader = ({ title, subtitle, actionLabel, onAction }) => (
  <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] px-5 py-4">
    <div>
      <h3 className="text-sm font-black uppercase tracking-wide text-[rgb(var(--text))]">
        {title}
      </h3>
      <p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">{subtitle}</p>
    </div>
    {actionLabel && (
      <button
        onClick={onAction}
        className="flex shrink-0 items-center gap-1 text-xs font-bold text-[rgb(var(--primary))]"
      >
        {actionLabel}
        <FaArrowRight size={10} />
      </button>
    )}
  </div>
);

const OverdueRow = ({ issue }) => {
  const days = daysLate(issue.dueDate);
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[rgb(var(--text))]">
          {issue.bookId?.title}
        </p>
        <p className="truncate text-xs text-[rgb(var(--text-muted))]">
          {getStudentName(issue.studentId)}
          {issue.studentId?.classId?.name
            ? ` · ${issue.studentId.classId.name}`
            : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-bold text-red-600">
          {days} day{days === 1 ? "" : "s"} late
        </p>
        <p className="text-[10px] text-[rgb(var(--text-muted))]">
          Rs {issue.fineAmount || 0}
        </p>
      </div>
    </div>
  );
};

const LowStockRow = ({ book }) => (
  <div className="flex items-center justify-between gap-3 px-5 py-3.5">
    <div className="min-w-0">
      <p className="truncate text-sm font-bold text-[rgb(var(--text))]">
        {book.title}
      </p>
      <p className="truncate text-xs text-[rgb(var(--text-muted))]">
        {book.category}
      </p>
    </div>
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
        book.availableCopies < 1
          ? "bg-red-50 text-red-600"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {book.availableCopies}/{book.totalCopies} left
    </span>
  </div>
);

const ActivityRow = ({ issue }) => (
  <div className="flex items-center justify-between gap-3 px-5 py-3.5">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--primary))]/10 text-[10px] font-black text-[rgb(var(--primary))]">
        {getStudentName(issue.studentId)
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[rgb(var(--text))]">
          {getStudentName(issue.studentId)}
        </p>
        <p className="truncate text-xs text-[rgb(var(--text-muted))]">
          {issue.bookId?.title}
        </p>
      </div>
    </div>
    <div className="shrink-0 text-right">
      <StatusTag status={issue.status} />
      <p className="mt-1 text-[10px] text-[rgb(var(--text-muted))]">
        {formatDate(issue.issueDate)}
      </p>
    </div>
  </div>
);

const StatusTag = ({ status }) => {
  const styles = {
    Issued: "bg-blue-50 text-blue-700",
    Overdue: "bg-red-50 text-red-700",
    Returned: "bg-emerald-50 text-emerald-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
        styles[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
};

const CategoryBar = ({ category, count, max }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-xs">
      <span className="font-semibold text-[rgb(var(--text))]">{category}</span>
      <span className="font-bold text-[rgb(var(--text-muted))]">{count}</span>
    </div>
    <div className="h-2 w-full rounded-full bg-[rgb(var(--bg))]">
      <div
        className="h-2 rounded-full bg-[rgb(var(--primary))]"
        style={{ width: `${Math.max((count / max) * 100, 6)}%` }}
      />
    </div>
  </div>
);

const SkeletonRows = () => (
  <div className="space-y-3 px-5 py-4">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="h-4 w-full animate-pulse rounded bg-[rgb(var(--bg))]"
      />
    ))}
  </div>
);

const EmptyRow = ({ text }) => (
  <div className="px-5 py-8 text-center text-sm text-[rgb(var(--text-muted))]">
    {text}
  </div>
);

const getStudentName = (student) => {
  if (!student) return "Unknown student";
  return [student.firstName, student.lastName].filter(Boolean).join(" ");
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

const daysLate = (dueDate) => {
  const due = new Date(dueDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 0);
};

export default LibrarianDashboard;