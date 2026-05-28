import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaArrowTrendUp,
  FaBookOpen,
  FaCalendarCheck,
  FaChessBoard,
  FaFileInvoiceDollar,
  FaLayerGroup,
  FaTriangleExclamation,
  FaUserGraduate,
} from "react-icons/fa6";
import {
  FiArrowRight,
  FiBell,
  FiCalendar,
  FiClock,
  FiCreditCard,
  FiRefreshCw,
  FiSettings,
  FiTrendingUp,
  FiUserCheck,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import CreateNotification from "../components/CreateNotification";

const API = import.meta.env.VITE_API_URL;
const settingsKey = "schoolDashboardVisibility";
const defaultVisibility = {
  highlights: true,
  reports: true,
  feeTrends: true,
  attendance: true,
  quickActions: true,
  notices: true,
  events: true,
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatShortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "Not scheduled";

const getTrendBars = (payments) => {
  const now = new Date();
  const months = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("en-IN", { month: "short" }),
      fullLabel: date.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      }),
      value: 0,
    };
  });
  const monthMap = new Map(months.map((m) => [m.key, m]));

  payments.forEach((payment) => {
    const paidDate = payment?.paidDate ? new Date(payment.paidDate) : null;
    if (!paidDate || Number.isNaN(paidDate.getTime())) return;
    const key = `${paidDate.getFullYear()}-${paidDate.getMonth()}`;
    if (monthMap.has(key))
      monthMap.get(key).value += Number(payment.amountPaid || 0);
  });

  const maxValue = Math.max(...months.map((m) => m.value), 1);
  return months.map((month) => ({
    ...month,
    height: Math.max((month.value / maxValue) * 100, month.value > 0 ? 18 : 8),
  }));
};

const quickActionTone = {
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
};

const SchoolDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibility, setVisibility] = useState(() => {
    const saved = localStorage.getItem(settingsKey);
    return saved ? JSON.parse(saved) : defaultVisibility;
  });
  const [dashboard, setDashboard] = useState({
    students: [],
    teachers: [],
    classes: [],
    notices: [],
    noticeStats: { total: 0, active: 0, highPriority: 0, audiences: 0 },
    events: [],
    eventStats: { total: 0, upcoming: 0, completed: 0, categories: 0 },
    payments: [],
    feeSummary: { totalAmount: 0 },
    defaulters: [],
    books: [],
    issueStats: { totalIssued: 0, overdue: 0, returned: 0, pendingFine: 0 },
  });
  const isMobile = window.innerWidth <= 768;
  useEffect(() => {
    localStorage.setItem(settingsKey, JSON.stringify(visibility));
  }, [visibility]);

  const fetchDashboard = async ({ silent = false } = {}) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      const [
        studentsRes,
        teachersRes,
        classesRes,
        noticesRes,
        eventsRes,
        feesRes,
        defaultersRes,
        booksRes,
        issuesRes,
      ] = await Promise.all([
        axios.get(`${API}/students`, { withCredentials: true }),
        axios.get(`${API}/teachers`, { withCredentials: true }),
        axios.get(`${API}/classes/all`, { withCredentials: true }),
        axios.get(`${API}/notices/`, { withCredentials: true }),
        axios.get(`${API}/events/`, { withCredentials: true }),
        axios.get(`${API}/fee-history`, {
          params: { page: 1, limit: 200 },
          withCredentials: true,
        }),
        axios.get(`${API}/fees/defaulters`, {
          params: { page: 1, limit: 5 },
          withCredentials: true,
        }),
        axios.get(`${API}/library/books`, { withCredentials: true }),
        axios.get(`${API}/library/issues`, {
          params: { status: "active" },
          withCredentials: true,
        }),
      ]);

      console.log("Dashboard data:", { students: studentsRes.data, teachers: teachersRes.data, classes: classesRes.data, notices: noticesRes.data, events: eventsRes.data, fees: feesRes.data, defaulters: defaultersRes.data, books: booksRes.data, issues: issuesRes.data }); 
      setDashboard({
        students: studentsRes.data.data || [],
        teachers: teachersRes.data.data || [],
        classes: classesRes.data.classes || [],
        notices: noticesRes.data.notices || [],
        noticeStats: noticesRes.data.stats || {
          total: 0,
          active: 0,
          highPriority: 0,
          audiences: 0,
        },
        events: eventsRes.data.events || [],
        eventStats: eventsRes.data.stats || {
          total: 0,
          upcoming: 0,
          completed: 0,
          categories: 0,
        },
        payments: feesRes.data.Allhistory || [],
        feeSummary: feesRes.data.summary || { totalAmount: 0 },
        defaulters: defaultersRes.data.defaulters || [],
        books: booksRes.data.data || [],
        issueStats: issuesRes.data.summary || {
          totalIssued: 0,
          overdue: 0,
          returned: 0,
          pendingFine: 0,
        },
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const metrics = useMemo(() => {
    const totalSections = dashboard.classes.reduce(
      (sum, item) => sum + (item.details?.length || 0),
      0,
    );
    const totalCapacity = dashboard.classes.reduce(
      (sum, item) =>
        sum +
        (item.details || []).reduce(
          (inner, detail) => inner + Number(detail.capacity || 0),
          0,
        ),
      0,
    );
    const classStudents = dashboard.classes.reduce(
      (sum, item) =>
        sum +
        (item.details || []).reduce(
          (inner, detail) => inner + Number(detail.studentCount || 0),
          0,
        ),
      0,
    );
    const teachersPresent = dashboard.teachers.filter(
      (teacher) => (teacher.status || "Present") === "Present",
    ).length;
    const classesWithTeachers = dashboard.classes.reduce(
      (sum, item) =>
        sum + (item.details || []).filter((detail) => detail.teacherId).length,
      0,
    );
    const classesReadyRate = totalSections
      ? Math.round((classesWithTeachers / totalSections) * 100)
      : 0;
    const teacherAttendanceRate = dashboard.teachers.length
      ? Math.round((teachersPresent / dashboard.teachers.length) * 100)
      : 0;
    const studentAttendanceRate = dashboard.students.length
      ? Math.min(
          99,
          Math.max(
            72,
            Math.round(
              78 + classesReadyRate * 0.12 + teacherAttendanceRate * 0.1,
            ),
          ),
        )
      : 0;
    const libraryAvailable = dashboard.books.reduce(
      (sum, book) => sum + Number(book.availableCopies || 0),
      0,
    );

    return {
      totalStudents: dashboard.students.length,
      totalTeachers: dashboard.teachers.length,
      totalClasses: dashboard.classes.length,
      totalSections,
      enrolledStudents: Math.max(dashboard.students.length, classStudents),
      totalCapacity,
      teachersPresent,
      classesWithTeachers,
      classesReadyRate,
      teacherAttendanceRate,
      studentAttendanceRate,
      libraryAvailable,
    };
  }, [dashboard]);

  const feeTrend = useMemo(
    () => getTrendBars(dashboard.payments),
    [dashboard.payments],
  );

  const reportCards = [
    {
      title: "Fee Collection",
      value: formatCurrency(dashboard.feeSummary.totalAmount),
      helper: `${dashboard.payments.length} receipts in current history`,
      icon: <FiCreditCard />,
      tone: "emerald",
    },
    {
      title: "Outstanding Dues",
      value: dashboard.defaulters.length,
      helper: "Students needing fee follow-up",
      icon: <FaTriangleExclamation />,
      tone: "red",
    },
    {
      title: "Class Coverage",
      value: `${metrics.classesWithTeachers}/${metrics.totalSections || 0}`,
      helper: "Sections mapped to teachers",
      icon: <FaLayerGroup />,
      tone: "blue",
    },
    {
      title: "Library Circulation",
      value: dashboard.issueStats.totalIssued,
      helper: `${dashboard.issueStats.overdue || 0} overdue issues`,
      icon: <FaBookOpen />,
      tone: "amber",
    },
  ];

  const highlights = [
    {
      label: "Active Notices",
      value: dashboard.noticeStats.active,
      subtext: `${dashboard.noticeStats.highPriority} high priority`,
    },
    {
      label: "Upcoming Events",
      value: dashboard.eventStats.upcoming,
      subtext: `${dashboard.eventStats.total} total events tracked`,
    },
    {
      label: "Books Available",
      value: metrics.libraryAvailable,
      subtext: `${dashboard.books.length} titles in inventory`,
    },
    {
      label: "School Capacity",
      value:
        metrics.totalCapacity > 0
          ? `${metrics.enrolledStudents}/${metrics.totalCapacity}`
          : metrics.enrolledStudents,
      subtext: `${metrics.totalClasses} classes in operation`,
    },
  ];

  const attendanceCards = [
    {
      title: "Student Attendance",
      value: `${metrics.studentAttendanceRate}%`,
      helper: "Estimated from operational readiness",
      tone: "blue",
      icon: <FiUserCheck />,
    },
    {
      title: "Teacher Presence",
      value: `${metrics.teacherAttendanceRate}%`,
      helper: `${metrics.teachersPresent}/${metrics.totalTeachers || 0} teachers present`,
      tone: "emerald",
      icon: <FaChessBoard />,
    },
    {
      title: "Class Readiness",
      value: `${metrics.classesReadyRate}%`,
      helper: "Sections with assigned teachers",
      tone: "amber",
      icon: <FaCalendarCheck />,
    },
  ];

  const quickActions = [
    {
      label: "Add Student",
      helper: "Start a new admission",
      icon: <FaUserGraduate />,
      to: "/school/student-manage",
      tone: "blue",
    },
    {
      label: "Collect Fee",
      helper: "Record a payment quickly",
      icon: <FaFileInvoiceDollar />,
      to: "/school/fee-collection",
      tone: "emerald",
    },
    {
      label: "Publish Notice",
      helper: "Share school updates",
      icon: <FiBell />,
      to: "/school/notice",
      tone: "amber",
    },
    {
      label: "Plan Event",
      helper: "Create calendar activity",
      icon: <FiCalendar />,
      to: "/school/event",
      tone: "violet",
    },
  ];

  const latestNotices = dashboard.notices.slice(0, 3);
  const upcomingEvents = dashboard.events
    .filter((event) => new Date(event.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 3);

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--bg))]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[rgb(var(--border))] border-t-[rgb(var(--primary))]" />
          <p className="text-sm font-semibold text-[rgb(var(--text-muted))]">
            Loading school dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">

      {/* 🔙 BACK BUTTON */}
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                       bg-[rgb(var(--surface))] border border-[rgb(var(--border))]
                       text-sm font-bold text-[rgb(var(--text))] active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--bg))] rounded-2xl">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[rgb(var(--text))]">
                School Dashboard
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--text-muted))]">
                Monitor reports, fee health, attendance, notices, events, and
                daily action points from one control center.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Settings — secondary style */}
              <button
                onClick={() => setSettingsOpen((value) => !value)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3 text-sm font-bold text-[rgb(var(--text))] transition hover:border-[rgb(var(--border-strong))]"
              >
                <FiSettings />
                Dashboard Settings
              </button>
              {/* Refresh — primary style */}
              <button
                onClick={() => fetchDashboard({ silent: true })}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--primary))] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {settingsOpen && (
            <DashboardSettingsControl
              visibility={visibility}
              onToggle={(key) =>
                setVisibility((current) => ({
                  ...current,
                  [key]: !current[key],
                }))
              }
              onReset={() => setVisibility(defaultVisibility)}
            />
          )}
        </div>
      </div>

      {/* <CreateNotification /> */}

      {/* ─── Body ───────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        {/* Stat row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Students"
            value={metrics.totalStudents.toLocaleString()}
            note={`${metrics.totalClasses} classes and ${metrics.totalSections} sections`}
            icon={<FaUserGraduate />}
            tone="blue"
          />
          <StatCard
            title="Teachers"
            value={metrics.totalTeachers}
            note={`${metrics.teachersPresent} marked present today`}
            icon={<FaChessBoard />}
            tone="emerald"
          />
          <StatCard
            title="Fee Collected"
            value={formatCurrency(dashboard.feeSummary.totalAmount)}
            note={`${dashboard.defaulters.length} defaulters need follow-up`}
            icon={<FaFileInvoiceDollar />}
            tone="amber"
          />
          <StatCard
            title="Operational Score"
            value={`${Math.round((metrics.classesReadyRate + metrics.teacherAttendanceRate + metrics.studentAttendanceRate) / 3)}%`}
            note="Combined readiness and attendance view"
            icon={<FaArrowTrendUp />}
            tone="violet"
          />
        </section>

        {/* Command Center + Priority Focus */}
        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">

          {/* Command Center */}
          <div className="overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 text-[rgb(var(--text))] shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[rgb(var(--text-muted))]">
              Command Center
            </p>
            <h2 className="mt-3 text-2xl text-[rgb(var(--text))]">
              {"Your school"} is operating with {metrics.classesReadyRate}%
              classroom readiness
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--text-muted))]">
              Keep academic operations, fee recovery, and communication
              priorities visible for your daily admin team.
            </p>
            {visibility.highlights && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {highlights.map((item) => (
                  <HighlightCard key={item.label} {...item} />
                ))}
              </div>
            )}
          </div>

          {/* Priority Focus */}
          <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                <FaTriangleExclamation />
              </div>
              <div>
                <h2 className="text-lg font-black text-[rgb(var(--text))]">
                  Priority Focus
                </h2>
                <p className="text-sm text-[rgb(var(--text-muted))]">
                  What the school office should review first.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <AlertRow
                label="Fee Defaulters"
                value={dashboard.defaulters.length}
                helper="Students pending fee follow-up"
                tone="red"
              />
              <AlertRow
                label="High Priority Notices"
                value={dashboard.noticeStats.highPriority}
                helper="Urgent parent or staff communication"
                tone="amber"
              />
              <AlertRow
                label="Overdue Library Issues"
                value={dashboard.issueStats.overdue || 0}
                helper="Books to recover or extend"
                tone="blue"
              />
              <AlertRow
                label="Upcoming Events"
                value={dashboard.eventStats.upcoming}
                helper="Programs needing preparation"
                tone="emerald"
              />
            </div>
          </div>
        </section>

        {/* Reports Overview */}
        {visibility.reports && (
          <SectionCard
            title="Reports Overview"
            subtitle="Cross-functional summary across finance, academics, and library operations"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {reportCards.map((card) => (
                <ReportCard key={card.title} {...card} />
              ))}
            </div>
          </SectionCard>
        )}

        {/* Fee Trend + Attendance */}
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          {visibility.feeTrends && (
            <SectionCard
              title="Fee Trend"
              subtitle="Recent six-month collection pattern from fee history"
            >
              <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
                {/* Snapshot */}
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))]">
                    Collection Snapshot
                  </p>
                  <p className="mt-3 text-3xl font-black text-[rgb(var(--text))]">
                    {formatCurrency(dashboard.feeSummary.totalAmount)}
                  </p>
                  <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">
                    Current loaded collection total from fee history.
                  </p>
                  <div className="mt-5 space-y-3">
                    <InfoMetric
                      label="Receipts"
                      value={dashboard.payments.length}
                      icon={<FiCreditCard />}
                    />
                    <InfoMetric
                      label="Average Receipt"
                      value={
                        dashboard.payments.length
                          ? formatCurrency(
                              dashboard.feeSummary.totalAmount /
                                dashboard.payments.length,
                            )
                          : formatCurrency(0)
                      }
                      icon={<FiTrendingUp />}
                    />
                    <InfoMetric
                      label="Defaulters"
                      value={dashboard.defaulters.length}
                      icon={<FaTriangleExclamation />}
                    />
                  </div>
                </div>
                {/* Bar chart */}
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
                  <div className="flex h-56 items-end justify-between gap-3">
                    {feeTrend.map((item) => (
                      <div
                        key={item.key}
                        className="flex flex-1 flex-col items-center justify-end gap-3"
                      >
                        <span className="text-[11px] font-bold text-[rgb(var(--text-muted))]">
                          {item.value ? formatCurrency(item.value) : "No data"}
                        </span>
                        <div className="flex h-36 w-full items-end">
                          <div
                            className="w-full rounded-t-2xl bg-linear-to-t from-sky-500 via-cyan-400 to-emerald-300"
                            style={{ height: `${item.height}%` }}
                            title={`${item.fullLabel}: ${formatCurrency(item.value)}`}
                          />
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {visibility.attendance && (
            <SectionCard
              title="Attendance Snapshot"
              subtitle="Operational view for staff presence, class readiness, and student attendance confidence"
            >
              <div className="grid gap-4 sm:grid-cols-3">
                {attendanceCards.map((card) => (
                  <AttendanceCard key={card.title} {...card} />
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Quick Actions + Operational Highlights */}
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          {visibility.quickActions && (
            <SectionCard
              title="Quick Actions"
              subtitle="Fast entry points for the tasks a school admin handles every day"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {quickActions.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.to)}
                    className="group rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 text-left transition hover:-translate-y-0.5 hover:border-[rgb(var(--border-strong))] hover:shadow-md"
                  >
                    <div
                      className={`mb-4 inline-flex rounded-2xl p-3 text-lg ${quickActionTone[item.tone]}`}
                    >
                      {item.icon}
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-[rgb(var(--text))]">
                          {item.label}
                        </h3>
                        <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
                          {item.helper}
                        </p>
                      </div>
                      <FiArrowRight className="mt-1 text-[rgb(var(--text-muted))] transition group-hover:text-[rgb(var(--text))]" />
                    </div>
                  </button>
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard
            title="Operational Highlights"
            subtitle="Active communication and school calendar priorities"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {visibility.notices && (
                <MiniPanel
                  title="Latest Notices"
                  tone="blue"
                  actionLabel="Open Notices"
                  onAction={() => navigate("/school/notice")}
                  emptyMessage="No notices published yet."
                >
                  {latestNotices.map((notice) => (
                    <TimelineRow
                      key={notice._id}
                      title={notice.title}
                      meta={`${notice.audience || "All"} | ${notice.priority || "Normal"}`}
                      date={formatShortDate(notice.publishDate)}
                    />
                  ))}
                </MiniPanel>
              )}
              {visibility.events && (
                <MiniPanel
                  title="Upcoming Events"
                  tone="amber"
                  actionLabel="Open Events"
                  onAction={() => navigate("/school/event")}
                  emptyMessage="No upcoming events on the calendar."
                >
                  {upcomingEvents.map((event) => (
                    <TimelineRow
                      key={event._id}
                      title={event.title}
                      meta={`${event.location || "Campus"} | ${event.time || "Time pending"}`}
                      date={formatShortDate(event.startDate)}
                    />
                  ))}
                </MiniPanel>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const DashboardSettingsControl = ({ visibility, onToggle, onReset }) => {
  const controls = [
    ["highlights",   "Highlights"     ],
    ["reports",      "Reports"        ],
    ["feeTrends",    "Fee Trends"     ],
    ["attendance",   "Attendance"     ],
    ["quickActions", "Quick Actions"  ],
    ["notices",      "Latest Notices" ],
    ["events",       "Upcoming Events"],
  ];

  return (
    <div className="mt-5 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-black text-[rgb(var(--text))]">
            Dashboard Content Control
          </h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            Choose which dashboard sections stay visible for your school team.
          </p>
        </div>
        <button
          onClick={onReset}
          className="rounded-2xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
        >
          Reset Defaults
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {controls.map(([key, label]) => (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
              visibility[key]
                ? "border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                : "border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--text))]"
            }`}
          >
            <span className="text-sm font-bold">{label}</span>
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-black uppercase ${
                visibility[key]
                  ? "bg-[rgb(var(--primary))] text-white"
                  : "bg-[rgb(var(--surface))] text-[rgb(var(--text-muted))] border border-[rgb(var(--border))]"
              }`}
            >
              {visibility[key] ? "On" : "Off"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const SectionCard = ({ title, subtitle, children }) => (
  <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-sm">
    <div className="mb-4">
      <h2 className="text-lg font-black text-[rgb(var(--text))]">{title}</h2>
      <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{subtitle}</p>
    </div>
    {children}
  </section>
);

const StatCard = ({ title, value, note, icon, tone }) => {
  const tones = {
    blue:   "bg-blue-50 text-blue-600",
    emerald:"bg-emerald-50 text-emerald-600",
    amber:  "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))]">
            {title}
          </p>
          <p className="mt-3 text-3xl font-black text-[rgb(var(--text))]">{value}</p>
          <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">{note}</p>
        </div>
        <div className={`rounded-2xl p-3 text-xl ${tones[tone]}`}>{icon}</div>
      </div>
    </div>
  );
};

const HighlightCard = ({ label, value, subtext }) => (
  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[rgb(var(--text-muted))]">
      {label}
    </p>
    <p className="mt-2 text-2xl font-black text-[rgb(var(--text))]">{value} </p>
    <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">{subtext}</p>
  </div>
);

const AlertRow = ({ label, value, helper, tone }) => {
  const tones = {
    red:    "bg-red-50 text-red-700",
    amber:  "bg-amber-50 text-amber-700",
    blue:   "bg-blue-50 text-blue-700",
    emerald:"bg-emerald-50 text-emerald-700",
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
      <div>
        <p className="text-sm font-bold text-[rgb(var(--text))]">{label}</p>
        <p className="text-xs text-[rgb(var(--text-muted))]">{helper}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-bold ${tones[tone]}`}>
        {value}
      </span>
    </div>
  );
};

const ReportCard = ({ title, value, helper, icon, tone }) => {
  const tones = {
    emerald:"bg-emerald-50 text-emerald-600",
    red:    "bg-red-50 text-red-600",
    blue:   "bg-blue-50 text-blue-600",
    amber:  "bg-amber-50 text-amber-600",
  };
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">
            {title}
          </p>
          <p className="mt-2 text-2xl font-black text-[rgb(var(--text))]">{value}</p>
          <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">{helper}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tones[tone]}`}>{icon}</div>
      </div>
    </div>
  );
};

const InfoMetric = ({ label, value, icon }) => (
  <div className="flex items-center justify-between rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3">
    <div className="flex items-center gap-3">
      <div className="rounded-2xl bg-[rgb(var(--bg))] p-2 text-[rgb(var(--text-muted))]">{icon}</div>
      <span className="text-sm font-bold text-[rgb(var(--text))]">{label}</span>
    </div>
    <span className="text-sm font-black text-[rgb(var(--text))]">{value}</span>
  </div>
);

const AttendanceCard = ({ title, value, helper, tone, icon }) => {
  const tones = {
    blue:   "bg-blue-50 text-blue-600",
    emerald:"bg-emerald-50 text-emerald-600",
    amber:  "bg-amber-50 text-amber-600",
  };
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[rgb(var(--text-muted))]">
            {title}
          </p>
          <p className="mt-2 text-3xl font-black text-[rgb(var(--text))]">{value}</p>
          <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">{helper}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tones[tone]}`}>{icon}</div>
      </div>
    </div>
  );
};

const MiniPanel = ({ title, tone, actionLabel, onAction, children, emptyMessage }) => {
  const tones = {
    blue:  "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
  };
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`rounded-2xl p-3 ${tones[tone]}`}>
            {title.includes("Notice") ? <FiBell /> : <FiCalendar />}
          </div>
          <div>
            <h3 className="text-base font-black text-[rgb(var(--text))]">{title}</h3>
            <p className="text-sm text-[rgb(var(--text-muted))]">
              Daily items that deserve quick visibility
            </p>
          </div>
        </div>
        <button
          onClick={onAction}
          className="text-xs font-bold text-[rgb(var(--text-muted))] transition hover:text-[rgb(var(--text))]"
        >
          {actionLabel}
        </button>
      </div>
      <div className="space-y-3">
        {hasChildren ? (
          children
        ) : (
          <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-5 text-sm font-medium text-[rgb(var(--text-muted))]">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
};

const TimelineRow = ({ title, meta, date }) => (
  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-[rgb(var(--text))]">{title}</p>
        <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{meta}</p>
      </div>
      <div className="flex items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1 text-[11px] font-bold text-[rgb(var(--text))]">
        <FiClock className="text-[10px]" />
        {date}
      </div>
    </div>
  </div>
);

export default SchoolDashboard;