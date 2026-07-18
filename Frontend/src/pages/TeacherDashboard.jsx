import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FaClipboardList, FaUserGraduate } from "react-icons/fa6";
import {
  FiArrowRight,
  FiBell,
  FiBook,
  FiCalendar,
  FiClock,
  FiEdit3,
  FiRefreshCw,
  FiSettings,
  FiCheckSquare,
  FiMessageSquare,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaArrowLeft, FaBookReader } from "react-icons/fa";
import UpComingNotifications from "../components/UpComingNotifications";
import { useTx } from "../components/DashboardI18n";
import { useLanguage } from "../context/LanguageContext";

const API = import.meta.env.VITE_API_URL;

const settingsKey = "teacherDashboardVisibility";
const defaultVisibility = {
  stats: true,
  assignments: true,
  syllabus: true,
  diary: true,
  quickActions: true,
  groups: true,
};

const formatShortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "—";

const getDueBadge = (dueDate) => {
  if (!dueDate) return null;
  const diff = Math.ceil(
    (new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0) return { label: "Overdue", tone: "red" };
  if (diff === 0) return { label: "Due Today", tone: "amber" };
  if (diff <= 3) return { label: `${diff}d left`, tone: "amber" };
  return { label: `${diff}d left`, tone: "emerald" };
};

const badgeTones = {
  red: "bg-red-50 text-red-700",
  amber: "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  blue: "bg-blue-50 text-blue-700",
  violet: "bg-violet-50 text-violet-700",
};

const iconTones = {
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  red: "bg-red-50 text-red-600",
  sky: "bg-sky-50 text-sky-600",
};

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isMobile = window.innerWidth <= 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibility, setVisibility] = useState(() => {
    const saved = localStorage.getItem(settingsKey);
    return saved ? JSON.parse(saved) : defaultVisibility;
  });

  const [data, setData] = useState({
    classes: [],
    students: [],
    assignments: [],
    assignmentResults: [],
    diaries: [],
    groups: [],
    notices: [],
    events: [],
  });

  useEffect(() => {
    localStorage.setItem(settingsKey, JSON.stringify(visibility));
  }, [visibility]);

  const fetchDashboard = async ({ silent = false } = {}) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);

      const [
        classesRes,
        studentsRes,
        assignmentsRes,
        resultsRes,
        diaryRes,
        groupsRes,
        noticesRes,
        eventsRes,
      ] = await Promise.allSettled([
        axios.get(`${API}/classes/teacher/my-classes`, {
          withCredentials: true,
        }),
        axios.get(`${API}/students/teacher/my-students`, {
          withCredentials: true,
        }),
        axios.get(`${API}/assignment/teacher`, { withCredentials: true }),
        axios.get(`${API}/assignment/teacher/results`, {
          withCredentials: true,
        }),
        axios.get(`${API}/diary`, { withCredentials: true }),
        axios.get(`${API}/groups/my-groups`, { withCredentials: true }),
        axios.get(`${API}/notices`, { withCredentials: true }),
        axios.get(`${API}/events`, { withCredentials: true }),
      ]);

      setData({
        classes:
          classesRes.status === "fulfilled"
            ? classesRes.value.data?.classes || []
            : [],
        students:
          studentsRes.status === "fulfilled"
            ? studentsRes.value.data?.data || []
            : [],
        assignments:
          assignmentsRes.status === "fulfilled"
            ? assignmentsRes.value.data?.data || []
            : [],
        assignmentResults:
          resultsRes.status === "fulfilled"
            ? resultsRes.value.data?.data || []
            : [],
        diaries:
          diaryRes.status === "fulfilled" ? diaryRes.value.data || [] : [],
        groups:
          groupsRes.status === "fulfilled"
            ? groupsRes.value.data?.data || []
            : [],
        notices:
          noticesRes.status === "fulfilled"
            ? noticesRes.value.data?.notices || []
            : [],
        events:
          eventsRes.status === "fulfilled"
            ? eventsRes.value.data?.events || []
            : [],
      });
    } catch (error) {
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
    const totalSections = data.classes.reduce(
      (sum, cls) => sum + (cls.details?.length || 0),
      0,
    );
    const published = data.assignments.filter((a) => a.isPublished).length;
    const drafts = data.assignments.filter((a) => !a.isPublished).length;
    const overdue = data.assignments.filter(
      (a) => a.isPublished && new Date(a.dueDate) < new Date(),
    ).length;
    const homeworkCount = data.assignments.filter(
      (a) => a.type === "homework",
    ).length;
    const quizCount = data.assignments.filter((a) => a.type === "quiz").length;
    const examCount = data.assignments.filter((a) => a.type === "exam").length;
    const totalSubmissions = data.assignmentResults.reduce(
      (sum, a) => sum + (a.submissionCount || 0),
      0,
    );
    const avgScore =
      data.assignmentResults.length > 0
        ? Math.round(
            data.assignmentResults.reduce((s, a) => s + (a.avgScore || 0), 0) /
              data.assignmentResults.filter((a) => a.avgScore !== null)
                .length || 0,
          )
        : 0;
    const homeworkDiaries = data.diaries.filter(
      (d) => d.type === "homework",
    ).length;
    const classworkDiaries = data.diaries.filter(
      (d) => d.type === "classwork",
    ).length;
    const remarkDiaries = data.diaries.filter(
      (d) => d.type === "remark",
    ).length;
    const activeGroups = data.groups.filter(
      (g) => g.status === "Active",
    ).length;
    const upcomingEvents = data.events.filter(
      (e) => new Date(e.startDate) >= new Date(),
    ).length;

    return {
      totalClasses: data.classes.length,
      totalSections,
      totalStudents: data.students.length,
      totalAssignments: data.assignments.length,
      published,
      drafts,
      overdue,
      homeworkCount,
      quizCount,
      examCount,
      totalSubmissions,
      avgScore,
      homeworkDiaries,
      classworkDiaries,
      remarkDiaries,
      totalDiaries: data.diaries.length,
      activeGroups,
      upcomingEvents,
    };
  }, [data]);

  const recentAssignments = useMemo(
    () =>
      [...data.assignments]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),
    [data.assignments],
  );

  const recentDiaries = useMemo(
    () =>
      [...data.diaries]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 4),
    [data.diaries],
  );

  const upcomingEventsList = useMemo(
    () =>
      data.events
        .filter((e) => new Date(e.startDate) >= new Date())
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        .slice(0, 3),
    [data.events],
  );

  const latestNotices = data.notices.slice(0, 3);

  const quickActions = [
    {
      label: "Create Assignment",
      helper: "New homework, quiz, or exam",
      icon: <FiEdit3 />,
      to: "/teacher/assignment",
      tone: "blue",
    },
    {
      label: "Write Diary",
      helper: "Log classwork or homework",
      icon: <FiBook />,
      to: "/teacher/diary",
      tone: "emerald",
    },
    {
      label: "View Timetable",
      helper: "Check your class schedule",
      icon: <FiCalendar />,
      to: "/teacher/timetable",
      tone: "amber",
    },
    {
      label: "Attendance",
      helper: "Mark today's attendance",
      icon: <FiCheckSquare />,
      to: "/teacher/attendance/mark",
      tone: "violet",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600" />
          <p className="text-sm font-semibold text-[rgb(var(--text))]">
            Loading teacher dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  pb-10">
      {isMobile && (
        <div className="pt-4 px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl  shadow-sm border border-slate-100 text-sm font-bold text-[rgb(var(--text))] active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-200  bg-[rgb(var(--surface))] text-[rgb(var(--text))]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="mt-2 text-3xl font-black tracking-tight ">
                Teacher Dashboard
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--text))]">
                Manage your classes, assignments, student progress, diary
                entries and communication from one place.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setSettingsOpen((v) => !v)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-[rgb(var(--primary))] px-4 py-3 text-sm font-bold text-[rgb(var(--text))] transition"
              >
                <FiSettings />
                Dashboard Settings
              </button>
              <button
                onClick={() => fetchDashboard({ silent: true })}
                className="inline-flex items-center justify-center gap-2 rounded-2xl text-[rgb(var(--text))]px-4 py-3 text-sm font-bold  bg-[rgb(var(--primary))] p-2"
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
                setVisibility((cur) => ({ ...cur, [key]: !cur[key] }))
              }
              onReset={() => setVisibility(defaultVisibility)}
            />
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
              <UpComingNotifications />
        {/* Top Stats */}
        {visibility.stats && (
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="My Classes"
              value={metrics.totalClasses}
              note={`${metrics.totalSections} total sections`}
              icon={<FaBookReader />}
              tone="blue"
            />
            <StatCard
              title="My Students"
              value={metrics.totalStudents.toLocaleString()}
              note="Enrolled across all classes"
              icon={<FaUserGraduate />}
              tone="emerald"
            />
            <StatCard
              title="Assignments"
              value={metrics.totalAssignments}
              note={`${metrics.published} published · ${metrics.drafts} drafts`}
              icon={<FaClipboardList />}
              tone="amber"
            />
            <StatCard
              title="Diary Entries"
              value={metrics.totalDiaries}
              note={`${metrics.homeworkDiaries} HW · ${metrics.classworkDiaries} CW`}
              icon={<FiBook />}
              tone="violet"
            />
          </section>
        )}

        {/* Command banner + Alert panel */}
        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="overflow-hidden rounded-3xl bg-linear-to-br bg-[rgb(var(--surface))] p-6 text-[rgb(var(--text))] shadow-xl">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[rgb(var(--text))]">
              Overview
            </p>
            <h2 className="mt-3 text-2xl font-black">
              You have {metrics.totalStudents} students across{" "}
              {metrics.totalClasses} class
              {metrics.totalClasses !== 1 ? "es" : ""}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--text))]">
              Track pending assignments, diary entries, student submissions, and
              group conversations from this hub.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <HighlightCard
                label="Active Groups"
                value={metrics.activeGroups}
                subtext="Class & subject groups"
              />
              <HighlightCard
                label="Submissions"
                value={metrics.totalSubmissions}
                subtext="Total across assignments"
              />
              <HighlightCard
                label="Avg. Score"
                value={metrics.avgScore ? `${metrics.avgScore}%` : "N/A"}
                subtext="Student performance"
              />
              <HighlightCard
                label="Upcoming Events"
                value={metrics.upcomingEvents}
                subtext="On school calendar"
              />
            </div>
          </div>

          <div
            className="rounded-3xl border border-slate-200 bg-[rgb(var(--surface))] p-5 shadow-sm"
            data-no-i18n=""
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                <FiClock />
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
                value={metrics.overdue}
                helper={t("dashboard.publishedPastDue")}
                tone="red"
              />
              <AlertRow
                label={t("dashboard.draftAssignments")}
                value={metrics.drafts}
                helper={t("dashboard.notYetPublished")}
                tone="amber"
              />
              <AlertRow
                label={t("dashboard.homeworkDiaries")}
                value={metrics.homeworkDiaries}
                helper={t("dashboard.totalLoggedEntries")}
                tone="blue"
              />
              <AlertRow
                label={t("dashboard.activeNotices")}
                value={data.notices.filter((n) => n.isActive).length}
                helper={t("dashboard.schoolWideAnnouncements")}
                tone="emerald"
              />
            </div>
          </div>
        </section>

        {/* Assignment Types Row */}
        {visibility.assignments && (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AssignmentTypeCard
              label="Homework"
              count={metrics.homeworkCount}
              tone="blue"
              icon={<FiEdit3 />}
            />
            <AssignmentTypeCard
              label="Quizzes"
              count={metrics.quizCount}
              tone="violet"
              icon={<FiCheckSquare />}
            />
            <AssignmentTypeCard
              label="Exams"
              count={metrics.examCount}
              tone="red"
              icon={<FaClipboardList />}
            />
          </section>
        )}

        {/* Assignments Table + Diary */}
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          {visibility.assignments && (
            <SectionCard
              title="Recent Assignments"
              subtitle="Latest assignments you have created"
              action={{ label: "View All", to: "/teacher/assignment" }}
              onAction={() => navigate("/teacher/assignment")}
            >
              {recentAssignments.length === 0 ? (
                <EmptyState message="No assignments created yet." />
              ) : (
                <div className="space-y-3">
                  {recentAssignments.map((a) => {
                    const badge = getDueBadge(a.dueDate);
                    return (
                      <div
                        key={a._id}
                        onClick={() => navigate(`/teacher/assignment/result`)}
                        className="group flex cursor-pointer items-start justify-between gap-3 rounded-2xl border border-slate-100  bg-[rgb(var(--surface))] p-4 transition "
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-bold text-[rgb(var(--text))]">
                              {a.title}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${badgeTones[a.isPublished ? "emerald" : "amber"]}`}
                            >
                              {a.isPublished ? "Published" : "Draft"}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-[rgb(var(--text))]">
                            <span>{a.subjectId?.name || "—"}</span>
                            <span>·</span>
                            <span className="capitalize">{a.type}</span>
                            {a.classId?.name && (
                              <>
                                <span>·</span>
                                <span>{a.classId.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {badge && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badgeTones[badge.tone]}`}
                            >
                              {badge.label}
                            </span>
                          )}
                          <span className="text-xs text-[rgb(var(--text))]">
                            Due {formatShortDate(a.dueDate)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          )}

          {visibility.diary && (
            <SectionCard
              title="Diary Entries"
              subtitle="Recent classwork, homework, and remarks"
              action={{ label: "View All", to: "/teacher/diary" }}
              onAction={() => navigate("/teacher/diary")}
            >
              {recentDiaries.length === 0 ? (
                <EmptyState message="No diary entries yet." />
              ) : (
                <div className="space-y-3">
                  {recentDiaries.map((d) => (
                    <DiaryRow key={d._id} diary={d} />
                  ))}
                </div>
              )}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <MiniMetric
                  label="Homework"
                  value={metrics.homeworkDiaries}
                  tone="blue"
                />
                <MiniMetric
                  label="Classwork"
                  value={metrics.classworkDiaries}
                  tone="emerald"
                />
                <MiniMetric
                  label="Remarks"
                  value={metrics.remarkDiaries}
                  tone="violet"
                />
              </div>
            </SectionCard>
          )}
        </div>

        {/* Syllabus + Quick Actions */}
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          {visibility.syllabus && (
            <SectionCard
              title="My Classes"
              subtitle="Classes and sections assigned to you"
              action={{ label: "View Timetable", to: "/teacher/timetable" }}
              onAction={() => navigate("/teacher/timetable")}
            >
              {data.classes.length === 0 ? (
                <EmptyState message="No classes assigned yet." />
              ) : (
                <div className="space-y-3">
                  {data.classes.slice(0, 5).map((cls) => (
                    <div
                      key={cls._id}
                      onClick={() => navigate(`/teacher/class-view/${cls._id}`)}
                      className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-100 text-[rgb(var(--text))]
                        hover:-translate-y-0.5
                      bg-[rgb(var(--surface))] p-4 transition "
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700 font-black text-sm">
                          {cls.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[rgb(var(--text))]">
                            {cls.name}
                          </p>
                          <p className="text-xs text-[rgb(var(--text))]">
                            {cls.details?.length || 0} section
                            {(cls.details?.length || 0) !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badgeTones[cls.status === "Active" ? "emerald" : "amber"]}`}
                        >
                          {cls.status}
                        </span>
                        <FiArrowRight className="text-[rgb(var(--text))]" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {visibility.quickActions && (
            <SectionCard
              title="Quick Actions"
              subtitle="Fast entry points for everyday teacher tasks"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {quickActions.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.to)}
                    className="group rounded-2xl border border-slate-200 bg-[rgb(var(--surface))] p-4 text-left transition hover:-translate-y-0.5"
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
          )}
        </div>

        {/* Groups + Notices/Events */}
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          {visibility.groups && (
            <SectionCard
              title="My Groups"
              subtitle="Class, section, and subject communication groups"
              action={{ label: "Open Messages", to: "/teacher/group" }}
              onAction={() => navigate("/teacher/group")}
            >
              {data.groups.length === 0 ? (
                <EmptyState message="No groups yet." />
              ) : (
                <div className="space-y-3">
                  {data.groups.slice(0, 5).map((g) => (
                    <div
                      key={g._id}
                      onClick={() => navigate(`/teacher/group/`)}
                      className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-100 bg-[rgb(var(--surface))] p-4 transition hover:bg-[rgb(var(--surface-hover))] hover:border-slate-200 hover:shadow-sm"
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
                      <div className="flex items-center gap-2">
                        {g.lastMessage && (
                          <p className="hidden max-w-30 truncate text-xs text-[rgb(var(--text))] sm:block">
                            {g.lastMessage}
                          </p>
                        )}
                        <FiArrowRight className="shrink-0 text-[rgb(var(--text))]" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          <SectionCard
            title="School Updates"
            subtitle="Latest notices and upcoming events from school"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <MiniPanel
                title="Notices"
                tone="blue"
                actionLabel="Open"
                onAction={() => navigate("/teacher/notice")}
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
                onAction={() => navigate("/teacher/event")}
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
        </div>
      </div>
    </div>
  );
};

/* ─── Sub-components ─────────────────────────────────────────────── */

const DashboardSettingsControl = ({ visibility, onToggle, onReset }) => {
  const controls = [
    ["stats", "Stats"],
    ["assignments", "Assignments"],
    ["syllabus", "My Classes"],
    ["diary", "Diary"],
    ["quickActions", "Quick Actions"],
    ["groups", "Groups"],
  ];
  return (
    <div className="mt-5 rounded-3xl border border-slate-200 bg-[rgb(var(--surface))] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {controls.map(([key, label]) => (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
              visibility[key]
                ? "border-sky-200 "
                : "border-slate-200  text-[rgb(var(--text))]"
            }`}
          >
            <span className="text-sm font-bold">{label}</span>
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-black uppercase ${
                visibility[key]
                  ? "bg-[rgb(var(--bg))] text-[rgb(var(--text))]"
                  : "bg-[rgb(var(--primary))] text-[rgb(var(--text))]"
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
          className="shrink-0 text-sm font-bold text-[rgb(var(--text))] transition hover:text-[rgb(var(--text-muted))]  cursor-pointer"
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
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="rounded-3xl border border-slate-200 bg-[rgb(var(--surface))] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[rgb(var(--text))]">
            {title}
          </p>
          <p className="mt-3 text-3xl font-black text-[rgb(var(--text))]">{value}</p>
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
  <div className="rounded-2xl bg-[rgb(var(--surface))] border p-4 backdrop-blur-sm">
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
    amber: "bg-amber-50 text-amber-700",
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

const AssignmentTypeCard = ({ label, count, tone, icon }) => {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="rounded-3xl border border-slate-200 bg-[rgb(var(--surface))] text-[rgb(var(--text))] p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`rounded-2xl p-3 text-xl ${tones[tone]}`}>{icon}</div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[rgb(var(--text))]">
            {label}
          </p>
          <p className="mt-1 text-3xl font-black text-[rgb(var(--text))]">{count}</p>
        </div>
      </div>
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
    amber: "bg-amber-50 text-amber-600",
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
          <div className="rounded-2xl border border-dashed border-slate-300  p-4 text-sm font-medium text-[rgb(var(--text))]">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
};

const TimelineRow = ({ title, meta, date }) => (
  <div className="rounded-xl bg-[rgb(var(--surface))] border p-3">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[rgb(var(--text))]">{title}</p>
        <p className="mt-0.5 text-xs text-[rgb(var(--text))]">{meta}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-full bg-[rgb(var(--primary))] px-2 py-0.5 text-[11px] font-bold text-[rgb(var(--text))]">
        <FiClock size={10} />
        {date}
      </div>
    </div>
  </div>
);

const EmptyState = ({ message }) => {
  const tx = useTx();
  return (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-medium text-[rgb(var(--text))]">
    {tx(message)}
  </div>
  );
};

export default TeacherDashboard;
