import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaBookOpen,
  FaCalendarAlt,
  FaChevronRight,
  FaClipboardList,
  FaExclamationCircle,
} from "react-icons/fa";
import api from "../config/axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayDiffFromToday(dateLike) {
  if (!dateLike) return null;
  const d = startOfDay(dateLike);
  const t = startOfDay();
  return Math.round((d - t) / (1000 * 60 * 60 * 24));
}

function isWithinHours(dateLike, hours) {
  if (!dateLike) return false;
  const age = Date.now() - new Date(dateLike).getTime();
  return age >= 0 && age <= hours * 60 * 60 * 1000;
}

function fmtShort(dateLike) {
  try {
    return new Date(dateLike).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

function hwStatus(hw) {
  if (hw?.myStatus && typeof hw.myStatus === "object") {
    return String(hw.myStatus.status || "").toLowerCase();
  }
  return String(hw?.status || "").toLowerCase();
}

function isAssignmentDone(a) {
  if (a?.submitted || a?.status === "closed") return true;
  if (a?.mySubmission) return true;
  return false;
}

function notifEndDate(n) {
  return n?.endingDate || n?.edningDate || null;
}

function roleHomeBase(role, loginAs) {
  if (role === "student_admin") {
    return loginAs === "parent" ? "/parent" : "/student";
  }
  if (role === "teacher_admin") return "/teacher";
  if (role === "staff_admin") return "/staff";
  if (role === "school_admin") return "/school";
  return "/school";
}

const BADGE = {
  danger: "bg-rose-100 text-rose-700",
  warn: "bg-amber-100 text-amber-700",
  info: "bg-sky-100 text-sky-700",
  purple: "bg-violet-100 text-violet-700",
  teal: "bg-teal-100 text-teal-700",
  ok: "bg-emerald-100 text-emerald-700",
};

const DUE_WINDOW_DAYS = 7;

function SectionCard({ title, subtitle, count, icon, accent, actionLabel, onAction, children }) {
  return (
    <section
      className="rounded-[1.35rem] border overflow-hidden"
      style={{
        background: "rgb(var(--surface))",
        borderColor: "rgb(var(--border))",
        boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
      }}
    >
      <div
        className="flex items-center justify-between gap-3 border-b px-3.5 py-3"
        style={{ borderColor: "rgb(var(--border))" }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[15px]"
            style={{
              color: accent,
              background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            }}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <h3
              className="truncate text-[13px] font-extrabold"
              style={{ color: "rgb(var(--text))" }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                className="truncate text-[11px] font-semibold"
                style={{ color: "rgb(var(--text-muted))" }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {count > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums text-white"
              style={{ background: accent }}
            >
              {count}
            </span>
          )}
          {onAction && (
            <button
              type="button"
              onClick={onAction}
              className="text-[11px] font-extrabold"
              style={{ color: accent }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 p-3">{children}</div>
    </section>
  );
}

function ItemCard({ title, subtitle, tag, tone = "info", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left
        active:scale-[0.99] transition-transform"
      style={{
        background: "rgb(var(--bg))",
        borderColor: "rgb(var(--border))",
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <p
            className="truncate text-[13px] font-extrabold"
            style={{ color: "rgb(var(--text))" }}
          >
            {title}
          </p>
          {tag && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${BADGE[tone] || BADGE.info}`}
            >
              {tag}
            </span>
          )}
        </div>
        {subtitle && (
          <p
            className="text-[11px] font-semibold"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      <FaChevronRight
        size={12}
        className="mt-1 shrink-0 opacity-40"
        style={{ color: "rgb(var(--text))" }}
      />
    </button>
  );
}

/**
 * Urgent actions — separate cards for assignments, homework, notices, etc.
 */
export default function UrgentActions({ className = "" }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [raw, setRaw] = useState({
    assignments: [],
    homework: [],
    notices: [],
    events: [],
    notifications: [],
  });
  const [loading, setLoading] = useState(true);

  const role = user?.role;
  const loginAs = user?.loginAs;
  const userId = String(user?._id || user?.id || "");
  const isSchoolBound =
    role === "student_admin" ||
    role === "teacher_admin" ||
    role === "school_admin" ||
    role === "staff_admin";

  useEffect(() => {
    if (!user || !isSchoolBound) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const learner = role === "student_admin";

      const tasks = [
        api.get("/notifications").catch(() => null),
        learner
          ? api.get("/assignment/student/list").catch(() => null)
          : Promise.resolve(null),
        learner ? api.get("/homework/my").catch(() => null) : Promise.resolve(null),
        learner || role === "school_admin" || role === "teacher_admin"
          ? api.get("/notices").catch(() => null)
          : Promise.resolve(null),
        learner || role === "school_admin" || role === "teacher_admin"
          ? api.get("/events").catch(() => null)
          : Promise.resolve(null),
      ];

      const [notifRes, assignRes, hwRes, noticeRes, eventRes] =
        await Promise.all(tasks);

      if (cancelled) return;

      setRaw({
        notifications: Array.isArray(notifRes?.data)
          ? notifRes.data
          : notifRes?.data?.notifications || [],
        assignments: Array.isArray(assignRes?.data?.data)
          ? assignRes.data.data
          : Array.isArray(assignRes?.data)
            ? assignRes.data
            : [],
        homework: Array.isArray(hwRes?.data)
          ? hwRes.data
          : hwRes?.data?.data || [],
        notices: Array.isArray(noticeRes?.data?.notices)
          ? noticeRes.data.notices
          : Array.isArray(noticeRes?.data)
            ? noticeRes.data
            : [],
        events: Array.isArray(eventRes?.data?.events)
          ? eventRes.data.events
          : Array.isArray(eventRes?.data?.data)
            ? eventRes.data.data
            : Array.isArray(eventRes?.data)
              ? eventRes.data
              : [],
      });
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?._id, user?.student_id, user?.activeChildId, user?.email, role, isSchoolBound]);

  const groups = useMemo(() => {
    const base = roleHomeBase(role, loginAs);
    const isParent = role === "student_admin" && loginAs === "parent";
    const today = startOfDay();

    const assignments = [];
    if (!isParent) {
      for (const a of raw.assignments) {
        if (isAssignmentDone(a)) continue;
        const diff = dayDiffFromToday(a.dueDate);
        if (diff === null || diff > DUE_WINDOW_DAYS) continue;
        const overdue = diff < 0;
        assignments.push({
          id: a._id,
          title: a.title || t("urgent.assignment", "Assignment"),
          subtitle: overdue
            ? t("urgent.wasDue", "Was due {d}").replace("{d}", fmtShort(a.dueDate))
            : t("urgent.dueOn", "Due {d}").replace("{d}", fmtShort(a.dueDate)),
          tag: overdue
            ? t("urgent.overdue", "Overdue")
            : diff === 0
              ? t("urgent.dueToday", "Due today")
              : diff === 1
                ? t("urgent.dueTomorrow", "Due tomorrow")
                : t("urgent.dueSoon", "Due soon"),
          tone: overdue ? "danger" : diff === 0 ? "warn" : "info",
          path: `${base}/assignment`,
          priority: overdue ? 0 : diff === 0 ? 1 : 2 + diff,
        });
      }
    }
    assignments.sort((a, b) => a.priority - b.priority);

    const homework = [];
    for (const hw of raw.homework) {
      const status = hwStatus(hw);
      if (status === "completed" || status === "marked_done") continue;
      const diff = dayDiffFromToday(hw.dueDate);
      if (diff === null || diff > DUE_WINDOW_DAYS) continue;
      const overdue = diff < 0;
      homework.push({
        id: hw._id,
        title: hw.title || t("urgent.homework", "Homework"),
        subtitle: overdue
          ? t("urgent.homeworkOverdue", "Homework overdue")
          : t("urgent.dueOn", "Due {d}").replace("{d}", fmtShort(hw.dueDate)),
        tag: overdue
          ? t("urgent.overdue", "Overdue")
          : diff === 0
            ? t("urgent.dueToday", "Due today")
            : t("urgent.dueSoon", "Due soon"),
        tone: overdue ? "danger" : diff === 0 ? "warn" : "info",
        path: `${base}/homework`,
        priority: overdue ? 0 : diff === 0 ? 1 : 2 + diff,
      });
    }
    homework.sort((a, b) => a.priority - b.priority);

    const rankedNotices = raw.notices.slice(0, 20).map((n) => {
      const fresh = isWithinHours(n.createdAt, 24 * 7);
      const high = String(n.priority || "").toLowerCase() === "high";
      return { n, high, fresh, score: high ? 0 : fresh ? 1 : 2 };
    });
    rankedNotices.sort((a, b) => a.score - b.score);
    const noticePick =
      rankedNotices.filter((x) => x.high || x.fresh).slice(0, 4).length > 0
        ? rankedNotices.filter((x) => x.high || x.fresh).slice(0, 4)
        : rankedNotices.slice(0, 3);

    const notices = noticePick.map(({ n, high, fresh }) => ({
      id: n._id,
      title: n.title || t("urgent.notice", "Notice"),
      subtitle: fresh
        ? t("urgent.postedRecently", "Posted recently")
        : high
          ? t("urgent.highPriority", "High priority notice")
          : fmtShort(n.createdAt) || t("urgent.schoolNotice", "School notice"),
      tag: high
        ? t("urgent.important", "Important")
        : fresh
          ? t("urgent.newNotice", "New notice")
          : t("urgent.notice", "Notice"),
      tone: high ? "danger" : "info",
      path: `${base}/notice`,
    }));

    const events = [];
    for (const e of raw.events) {
      const start = e.startDate || e.date;
      const diff = dayDiffFromToday(start);
      if (diff === null || diff < 0 || diff > DUE_WINDOW_DAYS) continue;
      events.push({
        id: e._id,
        title: e.title || e.name || t("urgent.event", "Event"),
        subtitle:
          diff === 0
            ? t("urgent.eventToday", "Event happening today")
            : t("urgent.onDate", "On {d}").replace("{d}", fmtShort(start)),
        tag:
          diff === 0
            ? t("urgent.today", "Today")
            : diff === 1
              ? t("urgent.tomorrow", "Tomorrow")
              : t("urgent.upcoming", "Upcoming"),
        tone: "purple",
        path: `${base}/event`,
      });
    }

    const notifications = [];
    for (const n of raw.notifications) {
      const read =
        Array.isArray(n.readBy) &&
        n.readBy.some((id) => String(id) === userId);
      const startRaw = n.startingDate;
      const endRaw = notifEndDate(n);
      const hasDates = Boolean(startRaw || endRaw);
      let includeDated = false;
      let diff = null;
      let ongoing = false;

      if (hasDates) {
        const start = startOfDay(startRaw || endRaw);
        const end = endRaw ? startOfDay(endRaw) : start;
        if (end >= today) {
          diff = Math.round((start - today) / (1000 * 60 * 60 * 24));
          ongoing = diff < 0 && end >= today;
          includeDated = ongoing || diff === 0 || diff === 1;
        }
      }

      const recentUnread =
        !read && isWithinHours(n.createdAt || n.scheduledAt, 24 * 7);
      if (!includeDated && !recentUnread) continue;

      notifications.push({
        id: n._id,
        title: n.title || t("urgent.reminder", "Reminder"),
        subtitle: n.message
          ? String(n.message).slice(0, 80)
          : t("urgent.scheduled", "Scheduled reminder"),
        tag: includeDated
          ? ongoing || diff === 0
            ? t("urgent.today", "Today")
            : t("urgent.tomorrow", "Tomorrow")
          : t("urgent.unread", "Unread"),
        tone: includeDated && (ongoing || diff === 0) ? "warn" : "teal",
        path: `${base}/notification`,
      });
    }

    return {
      assignments: assignments.slice(0, 4),
      homework: homework.slice(0, 4),
      notices: notices.slice(0, 4),
      events: events.slice(0, 4),
      notifications: notifications.slice(0, 4),
      base,
    };
  }, [raw, role, loginAs, t, userId]);

  if (loading) {
    return (
      <div
        className={`rounded-[1.35rem] border px-3.5 py-4 ${className}`}
        style={{
          background: "rgb(var(--surface))",
          borderColor: "rgb(var(--border))",
        }}
      >
        <p
          className="text-[12px] font-semibold"
          style={{ color: "rgb(var(--text-muted))" }}
        >
          {t("urgent.loading", "Loading urgent actions…")}
        </p>
      </div>
    );
  }

  const hasAny =
    groups.assignments.length > 0 ||
    groups.homework.length > 0 ||
    groups.notices.length > 0 ||
    groups.events.length > 0 ||
    groups.notifications.length > 0;

  const renderItems = (items) =>
    items.map((item) => (
      <ItemCard
        key={item.id}
        title={item.title}
        subtitle={item.subtitle}
        tag={item.tag}
        tone={item.tone}
        onClick={() => item.path && navigate(item.path)}
      />
    ));

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="px-0.5">
        <h2
          className="text-[13px] font-extrabold"
          style={{ color: "rgb(var(--text))" }}
        >
          {t("urgent.title", "Urgent actions")}
        </h2>
        <p
          className="mt-0.5 text-[11px] font-semibold"
          style={{ color: "rgb(var(--text-muted))" }}
        >
          {t("urgent.subtitle", "Assignments, notices & reminders")}
        </p>
      </div>

      {!hasAny ? (
        <div
          className="rounded-[1.35rem] border px-3.5 py-4"
          style={{
            background: "rgb(var(--surface))",
            borderColor: "rgb(var(--border))",
          }}
        >
          <p
            className="text-[12px] font-semibold"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {t(
              "urgent.empty",
              "Nothing urgent right now. You’re all caught up.",
            )}
          </p>
        </div>
      ) : (
        <>
          {groups.assignments.length > 0 && (
            <SectionCard
              title={t("urgent.assignments", "Assignments")}
              subtitle={t("urgent.assignmentsHint", "Due soon from teachers")}
              count={groups.assignments.length}
              icon={<FaClipboardList />}
              accent="#10B981"
              actionLabel={t("common.viewAll", "View all")}
              onAction={() => navigate(`${groups.base}/assignment`)}
            >
              {renderItems(groups.assignments)}
            </SectionCard>
          )}

          {groups.homework.length > 0 && (
            <SectionCard
              title={t("urgent.homework", "Homework")}
              subtitle={t("urgent.homeworkHint", "Pending home work")}
              count={groups.homework.length}
              icon={<FaBookOpen />}
              accent="#F97316"
              actionLabel={t("common.viewAll", "View all")}
              onAction={() => navigate(`${groups.base}/homework`)}
            >
              {renderItems(groups.homework)}
            </SectionCard>
          )}

          {groups.notices.length > 0 && (
            <SectionCard
              title={t("urgent.notices", "Notices")}
              subtitle={t("urgent.noticesHint", "School circulars & updates")}
              count={groups.notices.length}
              icon={<FaBell />}
              accent="#E11D48"
              actionLabel={t("common.viewAll", "View all")}
              onAction={() => navigate(`${groups.base}/notice`)}
            >
              {renderItems(groups.notices)}
            </SectionCard>
          )}

          {groups.events.length > 0 && (
            <SectionCard
              title={t("urgent.events", "Events")}
              subtitle={t("urgent.eventsHint", "Coming up this week")}
              count={groups.events.length}
              icon={<FaCalendarAlt />}
              accent="#7C3AED"
              actionLabel={t("common.viewAll", "View all")}
              onAction={() => navigate(`${groups.base}/event`)}
            >
              {renderItems(groups.events)}
            </SectionCard>
          )}

          {groups.notifications.length > 0 && (
            <SectionCard
              title={t("urgent.reminders", "Reminders")}
              subtitle={t("urgent.remindersHint", "Unread & scheduled")}
              count={groups.notifications.length}
              icon={<FaExclamationCircle />}
              accent="#0D9488"
              actionLabel={t("common.viewAll", "View all")}
              onAction={() => navigate(`${groups.base}/notification`)}
            >
              {renderItems(groups.notifications)}
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
