import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiArrowRight,
  FiBell,
  FiCalendar,
  FiClock,
  FiRefreshCw,
  FiSettings,
  FiMessageSquare,
  FiCheckSquare,
  FiAlertCircle,
  FiAward,
} from "react-icons/fi";
import {
  FaArrowLeft,
  FaUserGraduate,
  FaClipboardList,
  FaBookOpen,
  FaIdCard,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import UpComingNotifications from "../components/UpComingNotifications";
import { useTx } from "../components/DashboardI18n";
import { useLanguage } from "../context/LanguageContext";
import RoleCampusDashboard from "../components/dashboards/RoleCampusDashboard";
import DashboardLayoutPicker, {
  useDashboardLayout,
} from "../components/dashboards/DashboardLayoutPicker";

const API = import.meta.env.VITE_API_URL;

const settingsKey = "studentDashboardVisibility";
const defaultVisibility = {
  assignments: true,
  library: true,
  diary: true,
  notices: true,
  groups: true,
};

const formatShortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "—";

const badgeTones = {
  red: "bg-red-50 text-red-700",
  amber: "bg-[rgb(var(--surface))] text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  blue: "bg-blue-50 text-blue-700",
  violet: "bg-violet-50 text-violet-700",
  sky: "bg-sky-50 text-sky-700",
};

const iconTones = {
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-[rgb(var(--surface))] text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  red: "bg-red-50 text-red-600",
  sky: "bg-sky-50 text-sky-600",
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isMobile = window.innerWidth <= 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layout, setLayout] = useDashboardLayout();
  const [visibility, setVisibility] = useState(() => {
    const saved = localStorage.getItem(settingsKey);
    return saved ? JSON.parse(saved) : defaultVisibility;
  });

  const [data, setData] = useState({
    assignments: [],
    myIssues: [],
    diary: [],
    notices: [],
    events: [],
    groups: [],
    attendanceMeta: null,
  });

  useEffect(() => {
    localStorage.setItem(settingsKey, JSON.stringify(visibility));
  }, [visibility]);

  const fetchDashboard = async ({ silent = false } = {}) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);

      const [
        assignmentsRes,
        libraryRes,
        noticesRes,
        eventsRes,
        groupsRes,
        attendanceMetaRes,
      ] = await Promise.allSettled([
        axios.get(`${API}/assignment/student/list`, { withCredentials: true }),
        axios.get(`${API}/library/issues/my`, { withCredentials: true }),
        axios.get(`${API}/notices`, { withCredentials: true }),
        axios.get(`${API}/events`, { withCredentials: true }),
        axios.get(`${API}/groups/my-groups`, { withCredentials: true }),
        // NOTE: this is the same path the parent dashboard uses — confirm it
        // resolves correctly when the logged-in user is the student rather
        // than the parent, or swap in the right student-scoped path.
        axios.get(`${API}/attendance/parent/student-meta`, {
          withCredentials: true,
        }),
      ]);

      setData({
        assignments:
          assignmentsRes.status === "fulfilled"
            ? assignmentsRes.value.data?.data || []
            : [],
        myIssues:
          libraryRes.status === "fulfilled"
            ? libraryRes.value.data?.myIssues || []
            : [],
        notices:
          noticesRes.status === "fulfilled"
            ? noticesRes.value.data?.notices || []
            : [],
        events:
          eventsRes.status === "fulfilled"
            ? eventsRes.value.data?.events || []
            : [],
        groups:
          groupsRes.status === "fulfilled"
            ? groupsRes.value.data?.data || []
            : [],
        attendanceMeta:
          attendanceMetaRes.status === "fulfilled"
            ? attendanceMetaRes.value.data
            : null,
      });
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const metrics = useMemo(() => {
    const totalAssignments = data.assignments.length;
    const pendingAssignments = data.assignments.filter(
      (a) => a.status === "active" && !a.submitted,
    ).length;
    const submittedAssignments = data.assignments.filter(
      (a) => a.submitted,
    ).length;
    const overdueAssignments = data.assignments.filter(
      (a) => !a.submitted && new Date(a.dueDate) < new Date(),
    ).length;

    const activeBooks = data.myIssues.filter(
      (i) => i.status !== "Returned",
    ).length;
    const overdueBooks = data.myIssues.filter(
      (i) => i.status === "Overdue",
    ).length;
    const totalFine = data.myIssues.reduce(
      (s, i) => s + (i.outstandingFine || 0),
      0,
    );

    const upcomingEvents = data.events.filter(
      (e) => new Date(e.startDate) >= new Date(),
    ).length;

    const activeGroups = data.groups.filter(
      (g) => g.status === "Active",
    ).length;

    const studentName = data.attendanceMeta?.student?.name || "";
    const className = data.attendanceMeta?.student?.className || "";
    const sectionName = data.attendanceMeta?.student?.sectionName || "";

    return {
      totalAssignments,
      pendingAssignments,
      submittedAssignments,
      overdueAssignments,
      activeBooks,
      overdueBooks,
      totalFine,
      upcomingEvents,
      activeGroups,
      studentName,
      className,
      sectionName,
    };
  }, [data]);

  const recentAssignments = useMemo(
    () =>
      [...data.assignments]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),
    [data.assignments],
  );

  const recentIssues = useMemo(
    () =>
      [...data.myIssues]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 4),
    [data.myIssues],
  );

  const latestNotices = data.notices.slice(0, 3);

  const upcomingEventsList = useMemo(
    () =>
      data.events
        .filter((e) => new Date(e.startDate) >= new Date())
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        .slice(0, 3),
    [data.events],
  );

  const quickActions = [
    {
      label: "View Attendance",
      helper: "Check your monthly attendance report",
      icon: <FiCheckSquare />,
      to: "/student/attendance",
      tone: "blue",
    },
    {
      label: "My Assignments",
      helper: "Pending homework & quizzes",
      icon: <FaClipboardList />,
      to: "/student/assignment",
      tone: "emerald",
    },
    {
      label: "Syllabus Books",
      helper: "View books, chapters and content",
      icon: <FaBookOpen />,
      to: "/student/syllabus-books",
      tone: "violet",
    },
    {
      label: "Library",
      helper: "Issued library books",
      icon: <FaBookOpen />,
      to: "/student/library",
      tone: "blue",
    },
    {
      label: "Exam Results",
      helper: "View your latest results",
      icon: <FiAward />,
      to: "/student/exam-result",
      tone: "amber",
    },
    {
      label: "My ID Card",
      helper: "View and print your school ID",
      icon: <FaIdCard />,
      to: "/student/id-card",
      tone: "blue",
    },
  ];

  const campusModules = [
    { label: "Attendance", path: "/student/attendance", icon: FiCheckSquare },
    { label: "Assignments", path: "/student/assignment", icon: FaClipboardList },
    { label: "Syllabus", path: "/student/syllabus-books", icon: FaBookOpen },
    { label: "Library", path: "/student/library", icon: FaBookOpen },
    { label: "Results", path: "/student/exam-result", icon: FiAward },
    { label: "ID Card", path: "/student/id-card", icon: FaIdCard },
    { label: "Notices", path: "/student/notice", icon: FiBell },
    { label: "Calendar", path: "/student/calendar", icon: FiCalendar },
  ];

  const campusSummaries = [
    {
      title: "Assignments",
      tone: "blue",
      path: "/student/assignment",
      rows: [
        ["Total", metrics.totalAssignments],
        ["Pending", metrics.pendingAssignments],
        ["Submitted", metrics.submittedAssignments],
      ],
    },
    {
      title: "Library",
      tone: "violet",
      path: "/student/library",
      rows: [
        ["Active Books", metrics.activeBooks],
        ["Overdue", metrics.overdueBooks],
        ["Fine", `₹${metrics.totalFine}`],
      ],
    },
    {
      title: "School Life",
      tone: "green",
      path: "/student/event",
      rows: [
        ["Events", metrics.upcomingEvents],
        ["Groups", metrics.activeGroups],
        ["Overdue HW", metrics.overdueAssignments],
      ],
    },
    {
      title: "Profile",
      tone: "orange",
      path: "/student/id-card",
      rows: [
        ["Name", metrics.studentName || "—"],
        ["Class", metrics.className || "—"],
        ["Section", metrics.sectionName || "—"],
      ],
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--surface))] p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600" />
          <p className="text-sm font-semibold text-[rgb(var(--text))]">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--surface))] pb-10">
      {isMobile && (
        <div className="pt-4 px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[rgb(var(--surface))] shadow-sm border border-slate-100 text-sm font-bold text-[rgb(var(--text))] active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-200 text-[rgb(var(--text))] bg-[rgb(var(--bg))]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 ">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between ">
            <div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[rgb(var(--text))]">
                Student Dashboard
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--text))]">
                {metrics.studentName
                  ? `Welcome back, ${metrics.studentName} — ${metrics.className}${metrics.sectionName ? ` · ${metrics.sectionName}` : ""}`
                  : "Track your attendance, assignments, library books and school updates."}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setSettingsOpen((v) => !v)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-[rgb(var(--surface))] px-4 py-3 text-sm font-bold transition"
              >
                <FiSettings />
                Dashboard Settings
              </button>
              <button
                onClick={() => fetchDashboard({ silent: true })}
                className="inline-flex items-center justify-center gap-2 rounded-2xl text-[rgb(var(--text))] px-4 py-3 text-sm font-bold  transition hover:bg-slate-800"
              >
                <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>
          {settingsOpen && (
            <DashboardSettingsControl
              visibility={visibility}
              layout={layout}
              onLayoutChange={setLayout}
              onToggle={(key) =>
                setVisibility((cur) => ({ ...cur, [key]: !cur[key] }))
              }
              onReset={() => setVisibility(defaultVisibility)}
            />
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 text-[rgb(var(--text))] bg-[rgb(var(--bg))]">
        <UpComingNotifications />
        {layout === "campus" ? (
          <RoleCampusDashboard
            roleLabel="Student"
            subtitle={
              metrics.className
                ? `${metrics.className}${metrics.sectionName ? ` · ${metrics.sectionName}` : ""}`
                : ""
            }
            profilePath="/student/id-card"
            menuPath="/student/dashboard"
            summaries={campusSummaries}
            modules={campusModules}
            showModules
            showStatBars
            showNotices={visibility.notices !== false}
            showEvents
            statBarsTitle="My Snapshot"
            statBars={[
              { label: "Pending", value: metrics.pendingAssignments, color: "bg-sky-500" },
              { label: "Submitted", value: metrics.submittedAssignments, color: "bg-emerald-500" },
              { label: "Overdue", value: metrics.overdueAssignments, color: "bg-rose-500" },
              { label: "Books", value: metrics.activeBooks, color: "bg-violet-500" },
            ]}
            notices={latestNotices.map((n) => ({
              id: n._id,
              title: n.title,
              meta: n.audience || "All",
            }))}
            events={upcomingEventsList.map((e) => ({
              id: e._id,
              title: e.title,
              meta: e.location || "Campus",
            }))}
          />
        ) : (
        <>
        {/* Top Stats */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Assignments"
            value={metrics.totalAssignments}
            note={`${metrics.pendingAssignments} pending · ${metrics.submittedAssignments} submitted`}
            icon={<FaClipboardList />}
            tone="blue"
          />
          <StatCard
            title="Library Books"
            value={metrics.activeBooks}
            note={`${metrics.overdueBooks} overdue · ₹${metrics.totalFine} fine`}
            icon={<FaBookOpen />}
            tone="violet"
          />
          <StatCard
            title="Upcoming Events"
            value={metrics.upcomingEvents}
            note="On school calendar"
            icon={<FiCalendar />}
            tone="sky"
          />
          <StatCard
            title="My Groups"
            value={metrics.activeGroups}
            note="Class & subject groups"
            icon={<FiMessageSquare />}
            tone="emerald"
          />
        </section>

        {/* Command Banner + Alert Panel */}
        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="overflow-hidden rounded-3xl bg-linear-to-br text-[rgb(var(--text))] bg-[rgb(var(--surface))] p-4 shadow-xl">
            <p className="text-xs font-black uppercase tracking-[0.25em] ">
              Overview
            </p>
            <h2 className="mt-3 text-2xl font-black">
              {metrics.studentName
                ? `${metrics.studentName}'s school summary`
                : "Your school summary"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--text))]">
              Track assignments, library books, notices, events and group
              messages — all from one place.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <HighlightCard
                label="Pending Assignments"
                value={metrics.pendingAssignments}
                subtext="Not yet submitted"
              />
              <HighlightCard
                label="Overdue Assignments"
                value={metrics.overdueAssignments}
                subtext="Past due date"
              />
              <HighlightCard
                label="Outstanding Fine"
                value={`₹${metrics.totalFine}`}
                subtext="Library dues"
              />
              <HighlightCard
                label="Active Groups"
                value={metrics.activeGroups}
                subtext="Class & subject groups"
              />
            </div>
          </div>

          <div
            className="rounded-3xl border border-slate-200 bg-[rgb(var(--surface))] p-5 shadow-sm"
            data-no-i18n=""
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-[rgb(var(--surface))] p-3 text-amber-600">
                <FiAlertCircle />
              </div>
              <div>
                <h2 className="text-lg font-black text-[rgb(var(--text))]">
                  {t("dashboard.attentionNeeded")}
                </h2>
                <p className="text-sm text-[rgb(var(--text))]">
                  {t("dashboard.attentionSubtitle")}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <AlertRow
                label={t("dashboard.overdueAssignments")}
                value={metrics.overdueAssignments}
                helper={t("dashboard.pastSubmissionDeadline")}
                tone={metrics.overdueAssignments > 0 ? "red" : "emerald"}
              />
              <AlertRow
                label={t("dashboard.pendingAssignments")}
                value={metrics.pendingAssignments}
                helper={t("dashboard.notYetSubmitted")}
                tone={metrics.pendingAssignments > 0 ? "amber" : "emerald"}
              />
              <AlertRow
                label={t("dashboard.overdueBooks")}
                value={metrics.overdueBooks}
                helper={t("dashboard.libraryBooksPastDue")}
                tone={metrics.overdueBooks > 0 ? "amber" : "emerald"}
              />
              <AlertRow
                label={t("dashboard.activeNotices")}
                value={data.notices.filter((n) => n.isActive).length}
                helper={t("dashboard.schoolWideAnnouncements")}
                tone="blue"
              />
            </div>
          </div>
        </section>

        {/* Assignments + Library */}
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          {visibility.assignments && (
            <SectionCard
              title="Assignments"
              subtitle="Your latest assignments from teachers"
              action={{ label: "View All", to: "/student/assignment" }}
              onAction={() => navigate("/student/assignment")}
            >
              {recentAssignments.length === 0 ? (
                <EmptyState message="No assignments found." />
              ) : (
                <div className="space-y-3">
                  {recentAssignments.map((a) => {
                    const isOverdue =
                      !a.submitted && new Date(a.dueDate) < new Date();
                    const badgeTone = a.submitted
                      ? "emerald"
                      : isOverdue
                        ? "red"
                        : "amber";
                    const badgeLabel = a.submitted
                      ? "Submitted"
                      : isOverdue
                        ? "Overdue"
                        : "Pending";
                    return (
                      <div
                        key={a._id}
                        onClick={() => navigate("/student/assignment")}
                        className="group flex cursor-pointer items-start justify-between gap-3 rounded-2xl border border-slate-100  p-4 transition  hover:bg-[rgb(var(--surface))] hover:shadow-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-bold text-[rgb(var(--text))]">
                              {a.title}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${badgeTones[badgeTone]}`}
                            >
                              {badgeLabel}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-[rgb(var(--text))]">
                            <span>{a.subjectId?.name || "—"}</span>
                            <span>·</span>
                            <span className="capitalize">{a.type}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span className="text-xs text-[rgb(var(--text))]">
                            Due {formatShortDate(a.dueDate)}
                          </span>
                          <FiArrowRight className="text-[rgb(var(--text))] group-hover:text-[rgb(var(--text))] transition" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          )}

          {visibility.library && (
            <SectionCard
              title="Library Books"
              subtitle="Books you currently have issued"
              action={{ label: "View All", to: "/student/library" }}
              onAction={() => navigate("/student/library")}
            >
              {recentIssues.length === 0 ? (
                <EmptyState message="No books currently issued." />
              ) : (
                <div className="space-y-3">
                  {recentIssues.map((issue) => (
                    <LibraryRow key={issue._id} issue={issue} />
                  ))}
                </div>
              )}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <MiniMetric
                  label="Issued"
                  value={metrics.activeBooks}
                  tone="blue"
                />
                <MiniMetric
                  label="Overdue"
                  value={metrics.overdueBooks}
                  tone="red"
                />
                <MiniMetric
                  label="Fine (₹)"
                  value={metrics.totalFine}
                  tone="amber"
                />
              </div>
            </SectionCard>
          )}
        </div>

        {/* Attendance + Quick Actions */}
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <SectionCard
            title="Attendance"
            subtitle="Your enrolment details and attendance report"
            action={{ label: "View Full Report", to: "/student/attendance" }}
            onAction={() => navigate("/student/attendance")}
          >
            {!data.attendanceMeta ? (
              <EmptyState message="Attendance details aren't available right now." />
            ) : (
              <div className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4">
                <div className="rounded-2xl bg-blue-50 p-3 text-xl text-blue-600">
                  <FaUserGraduate />
                </div>
                <div>
                  <p className="text-base font-black text-[rgb(var(--text))]">
                    {metrics.studentName || "—"}
                  </p>
                  <p className="text-xs text-[rgb(var(--text))]">
                    Class {metrics.className || "—"}
                    {metrics.sectionName ? ` · Section ${metrics.sectionName}` : ""}
                  </p>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Quick Actions"
            subtitle="Fast entry points for everyday tasks"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {quickActions.map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.to)}
                  className="group rounded-2xl border border-slate-200 bg-[rgb(var(--surface))] p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div
                    className={`mb-4 inline-flex rounded-2xl p-3 text-lg ${iconTones[item.tone]}`}
                  >
                    {item.icon}
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black text-[rgb(var(--text))]">
                        {item.label}
                      </h3>
                      <p className="mt-1 text-sm text-[rgb(var(--text))]">
                        {item.helper}
                      </p>
                    </div>
                    <FiArrowRight className="mt-1 text-[rgb(var(--text))] transition group-hover:text-[rgb(var(--text))]" />
                  </div>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Groups + Notices/Events */}
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          {visibility.groups && (
            <SectionCard
              title="My Groups"
              subtitle="Class, section, and subject communication groups"
              action={{ label: "Open Messages", to: "/student/group" }}
              onAction={() => navigate("/student/group")}
            >
              {data.groups.length === 0 ? (
                <EmptyState message="No groups yet." />
              ) : (
                <div className="space-y-3">
                  {data.groups.slice(0, 5).map((g) => (
                    <div
                      key={g._id}
                      onClick={() => navigate("/student/group")}
                      className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-100 bg-[rgb(var(--surface))] p-4 transition hover:bg-[rgb(var(--surface))] hover:border-slate-200 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                          <FiMessageSquare size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[rgb(var(--text))]">
                            {g.name}
                          </p>
                          <p className="text-xs text-[rgb(var(--text))] capitalize">
                            {g.type} · {g.members?.length || 0} members
                          </p>
                        </div>
                      </div>
                      <FiArrowRight className="shrink-0 text-[rgb(var(--text))]" />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {visibility.notices && (
            <SectionCard
              title="School Updates"
              subtitle="Latest notices and upcoming events from school"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <MiniPanel
                  title="Notices"
                  tone="blue"
                  actionLabel="Open"
                  onAction={() => navigate("/student/notice")}
                  emptyMessage="No notices yet."
                >
                  {latestNotices.map((n) => (
                    <TimelineRow
                      key={n._id}
                      title={n.title}
                      meta={`${n.audience} · ${n.priority}`}
                      date={formatShortDate(n.publishDate)}
                    />
                  ))}
                </MiniPanel>
                <MiniPanel
                  title="Events"
                  tone="amber"
                  actionLabel="Open"
                  onAction={() => navigate("/student/event")}
                  emptyMessage="No upcoming events."
                >
                  {upcomingEventsList.map((e) => (
                    <TimelineRow
                      key={e._id}
                      title={e.title}
                      meta={`${e.location || "Campus"}`}
                      date={formatShortDate(e.startDate)}
                    />
                  ))}
                </MiniPanel>
              </div>
            </SectionCard>
          )}
        </div>

        {/* Diary */}
        {visibility.diary && (
          <SectionCard
            title="Class Diary"
            subtitle="Recent homework and classwork entries from teachers"
            action={{ label: "View All", to: "/student/diary" }}
            onAction={() => navigate("/student/diary")}
          >
            {data.diary?.length === 0 ? (
              <EmptyState message="No diary entries found." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {(data.diary || []).slice(0, 6).map((d) => (
                  <DiaryRow key={d._id} diary={d} />
                ))}
              </div>
            )}
          </SectionCard>
        )}
        </>
        )}
      </div>
    </div>
  );
};

/* ─── Sub-components ──────────────────────────────────────────────────────── */

const DashboardSettingsControl = ({
  visibility,
  onToggle,
  onReset,
  layout,
  onLayoutChange,
}) => {
  const controls = [
    ["assignments", "Assignments"],
    ["library", "Library"],
    ["diary", "Diary"],
    ["notices", "Notices"],
    ["groups", "Groups"],
  ];
  return (
    <div className="mt-5 rounded-3xl border border-slate-200 bg-[rgb(var(--surface))] p-5">
      <DashboardLayoutPicker layout={layout} onLayoutChange={onLayoutChange} />
      <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-black text-[rgb(var(--text))]">
            Dashboard Content Control
          </h2>
          <p className="text-sm text-[rgb(var(--text))]">
            Toggle which sections are visible.
          </p>
        </div>
        <button
          onClick={onReset}
          className="rounded-2xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-bold text-[rgb(var(--text))] shadow-sm transition "
        >
          Reset Defaults
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4 xl:grid-cols-5">
        {controls.map(([key, label]) => (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
              visibility[key]
                ? "border-sky-200   text-[rgb(var(--text))]"
                : "border-slate-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
            }`}
          >
            <span className="text-sm font-bold">{label}</span>
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-black uppercase ${
                visibility[key]
                  ? " text-[rgb(var(--text))] bg-[rgb(var(--primary))]"
                  : "bg-[rgb(var(--primary-light))] text-[rgb(var(--text))]"
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

const SectionCard = ({ title, subtitle, children, action, onAction }) => {
  const tx = useTx();
  return (
  <section className="rounded-3xl border border-slate-200 bg-[rgb(var(--surface))] p-5 shadow-sm">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-black text-[rgb(var(--text))]">{tx(title)}</h2>
        <p className="mt-1 text-sm text-[rgb(var(--text))]">{tx(subtitle)}</p>
      </div>
      {action && (
        <button
          onClick={onAction}
          className="shrink-0 text-sm font-bold text-[rgb(var(--text))] transition hover:text-[rgb(var(--text))] cursor-pointer"
        >
          {tx(action.label)}
        </button>
      )}
    </div>
    {children}
  </section>
  );
};

const StatCard = ({ title, value, note, icon, tone }) => {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-[rgb(var(--surface))] text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    red: "bg-red-50 text-red-600",
    sky: "bg-sky-50 text-sky-600",
  };
  return (
    <div className="rounded-3xl border border-slate-200 bg-[rgb(var(--surface))] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[rgb(var(--text))]">
            {title}
          </p>
          <p className="mt-3 text-2xl font-black text-[rgb(var(--text))]">{value}</p>
          <p className="mt-2 text-sm text-[rgb(var(--text))]">{note}</p>
        </div>
        <div className={`rounded-2xl p-3 text-xl ${tones[tone]}`}>{icon}</div>
      </div>
    </div>
  );
};

const HighlightCard = ({ label, value, subtext }) => {
  const tx = useTx();
  return (
  <div className="rounded-2xl bg-[rgb(var(--surface))]/10 p-4 backdrop-blur-sm border">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[rgb(var(--text))]">
      {tx(label)}
    </p>
    <p className="mt-2 text-2xl font-black text-[rgb(var(--text))]">{value}</p>
    <p className="mt-2 text-sm text-[rgb(var(--text))]">{tx(subtext)}</p>
  </div>
  );
};

const AlertRow = ({ label, value, helper, tone }) => {
  const tones = {
    red: "bg-red-50 text-red-700",
    amber: "bg-[rgb(var(--surface))] text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border p-3">
      <div>
        <p className="text-sm font-bold text-[rgb(var(--text))]">{label}</p>
        <p className="text-xs text-[rgb(var(--text))]">{helper}</p>
      </div>
      <span
        className={`rounded-full px-3 py-1 text-xs font-bold ${tones[tone]}`}
      >
        {value}
      </span>
    </div>
  );
};

const LibraryRow = ({ issue }) => {
  const statusColors = {
    Issued: "bg-blue-50 text-blue-700",
    Overdue: "bg-red-50 text-red-700",
    Returned: "bg-emerald-50 text-emerald-700",
  };
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100  p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[rgb(var(--text))]">
          {issue.bookId?.title || "—"}
        </p>
        <p className="mt-1 text-xs text-[rgb(var(--text))]">
          {issue.bookId?.author || "—"} · Due {formatShortDate(issue.dueDate)}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${statusColors[issue.status] || "bg-slate-100 text-[rgb(var(--text))]"}`}
      >
        {issue.status}
      </span>
    </div>
  );
};

const DiaryRow = ({ diary }) => {
  const typeColors = {
    homework: "bg-blue-50 text-blue-700",
    classwork: "bg-emerald-50 text-emerald-700",
    remark: "bg-violet-50 text-violet-700",
  };
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-[rgb(var(--surface))] p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[rgb(var(--text))]">
          {diary.content?.slice(0, 60)}
          {diary.content?.length > 60 ? "..." : ""}
        </p>
        <p className="mt-1 text-xs text-[rgb(var(--text))]">
          {diary.subjectId?.name || "—"} ·{" "}
          {formatShortDate(diary.date || diary.createdAt)}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${typeColors[diary.type] || "bg-slate-100 text-[rgb(var(--text))]"}`}
      >
        {diary.type}
      </span>
    </div>
  );
};

const MiniMetric = ({ label, value, tone }) => {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-[rgb(var(--surface))] text-amber-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-2xl p-3 text-center ${tones[tone]}`}>
      <p className="text-xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold">{label}</p>
    </div>
  );
};

const MiniPanel = ({
  title,
  tone,
  actionLabel,
  onAction,
  children,
  emptyMessage,
}) => {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-[rgb(var(--surface))] text-amber-600",
  };
  const hasChildren = Array.isArray(children)
    ? children.length > 0
    : !!children;
  return (
    <div className="rounded-2xl border border-slate-200 bg-[rgb(var(--surface))] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2 ${tones[tone]}`}>
            {title.includes("Notice") ? (
              <FiBell size={14} />
            ) : (
              <FiCalendar size={14} />
            )}
          </div>
          <h3 className="text-sm font-black text-[rgb(var(--text))]">{title}</h3>
        </div>
        <button
          onClick={onAction}
          className="text-xs font-bold text-[rgb(var(--text))] transition hover:text-[rgb(var(--text))]"
        >
          {actionLabel}
        </button>
      </div>
      <div className="space-y-2">
        {hasChildren ? (
          children
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-[rgb(var(--surface))] p-4 text-sm font-medium text-[rgb(var(--text))]">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
};

const TimelineRow = ({ title, meta, date }) => (
  <div className="rounded-xl bg-[rgb(var(--surface))] p-3">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[rgb(var(--text))]">{title}</p>
        <p className="mt-0.5 text-xs text-[rgb(var(--text))]">{meta}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-[rgb(var(--text))]">
        <FiClock size={10} />
        {date}
      </div>
    </div>
  </div>
);

const EmptyState = ({ message }) => {
  const tx = useTx();
  return (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-[rgb(var(--surface))] p-8 text-center text-sm font-medium text-[rgb(var(--text))]">
    {tx(message)}
  </div>
  );
};

export default StudentDashboard;