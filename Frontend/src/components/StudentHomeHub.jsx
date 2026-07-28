import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronRight } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import UserAvatar from "./UserAvatar";
import { ModuleGrid } from "./RoleMenuShell";

const FREQUENT_KEY = "menuFrequentClicks";
const FREQUENT_LIMIT = 8;

/** Soft pastel tiles + emoji icons (matches school-app home reference). */
export const STUDENT_ICON_META = {
  Dashboard: { emoji: "🏠", bg: "#EEF2FF", accent: "#6366F1", short: "Home" },
  Attendance: { emoji: "📅", bg: "#EEF6FF", accent: "#3B82F6", short: "Attendance" },
  Timetable: { emoji: "🗓️", bg: "#F3E8FF", accent: "#9333EA", short: "Timetable" },
  Assignment: { emoji: "📓", bg: "#ECFDF5", accent: "#10B981", short: "Class Work" },
  "Exam Results": { emoji: "📖", bg: "#FEF2F2", accent: "#EF4444", short: "Results" },
  "My ID Card": { emoji: "🪪", bg: "#ECFDF5", accent: "#059669", short: "ID Card" },
  Diary: { emoji: "📔", bg: "#FDF4FF", accent: "#C026D3", short: "Diary" },
  Homework: { emoji: "🎒", bg: "#FFF7ED", accent: "#F97316", short: "Home Work" },
  "Daily learning": { emoji: "✨", bg: "#EEF2FF", accent: "#4F46E5", short: "Learning" },
  "Syllabus Books": { emoji: "📚", bg: "#F0FDF4", accent: "#16A34A", short: "Syllabus" },
  Library: { emoji: "📕", bg: "#F0FDFA", accent: "#0D9488", short: "Library" },
  Group: { emoji: "💬", bg: "#EFF6FF", accent: "#2563EB", short: "Messages" },
  Notices: { emoji: "✉️", bg: "#FFF1F2", accent: "#E11D48", short: "Circular" },
  Events: { emoji: "🎯", bg: "#FFF7ED", accent: "#EA580C", short: "Activity" },
  Calendar: { emoji: "🗓️", bg: "#EFF6FF", accent: "#0EA5E9", short: "Calendar" },
  Blogs: { emoji: "📝", bg: "#F0FDFA", accent: "#0D9488", short: "Blogs" },
  "Help / Support": { emoji: "🎧", bg: "#FFFBEB", accent: "#D97706", short: "Help" },
};

const DEFAULT_FREQUENT = [
  "Homework",
  "Assignment",
  "Daily learning",
  "Attendance",
  "Group",
  "Notices",
  "Timetable",
  "Events",
];

function getScores() {
  try {
    return JSON.parse(localStorage.getItem(FREQUENT_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function recordUse(name) {
  if (!name) return;
  try {
    const scores = getScores();
    scores[name] = (scores[name] || 0) + 1;
    localStorage.setItem(FREQUENT_KEY, JSON.stringify(scores));
  } catch {
    /* ignore */
  }
}

function pickFrequent(menu, limit = FREQUENT_LIMIT) {
  const byName = Object.fromEntries(menu.map((m) => [m.name, m]));
  const scores = getScores();
  const ranked = [...menu].sort(
    (a, b) => (scores[b.name] || 0) - (scores[a.name] || 0),
  );
  const picked = [];
  const seen = new Set();

  for (const item of ranked) {
    if (picked.length >= limit) break;
    if ((scores[item.name] || 0) > 0) {
      picked.push(item);
      seen.add(item.name);
    }
  }
  for (const name of DEFAULT_FREQUENT) {
    if (picked.length >= limit) break;
    if (!seen.has(name) && byName[name]) {
      picked.push(byName[name]);
      seen.add(name);
    }
  }
  for (const item of menu) {
    if (picked.length >= limit) break;
    if (!seen.has(item.name)) {
      picked.push(item);
      seen.add(item.name);
    }
  }
  return picked;
}

function dayPartGreeting(t) {
  const h = new Date().getHours();
  if (h < 12) return t("menu.goodMorning", "Good Morning");
  if (h < 17) return t("menu.goodAfternoon", "Good Afternoon");
  return t("menu.goodEvening", "Good Evening");
}

export function StudentGreetingHeader({ name }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const greeting = dayPartGreeting(t);

  return (
    <div className="student-home-header relative overflow-hidden rounded-[1.5rem] px-5 pb-14 pt-5">
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/20" />
      <div className="pointer-events-none absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-white/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="truncate text-[22px] font-extrabold leading-tight text-white">
            {t("menu.hi", "Hi")}, {(name || "Student").toUpperCase()}
          </h1>
          <p className="mt-1 text-[14px] font-semibold text-white/90">{greeting}</p>
        </div>
        <UserAvatar
          name={name}
          photoUrl={user?.photo_url}
          size="lg"
          rounded="full"
          className="ring-[3px] ring-white/60 shadow-lg"
        />
      </div>
    </div>
  );
}

function SoftActivityTile({ item, onOpen, onExpand }) {
  const { tn } = useLanguage();
  const meta = STUDENT_ICON_META[item.name] || {
    emoji: "⭐",
    bg: "#F3F4F6",
    accent: "#6B7280",
    short: item.name,
  };
  const label = meta.short || tn(item.name);
  const hasChildren = Boolean(item.children?.length);

  return (
    <button
      type="button"
      onClick={() => {
        recordUse(item.name);
        if (hasChildren) onExpand(item.name);
        else onOpen(item.path);
      }}
      className="group flex flex-col items-center gap-2 select-none active:scale-95 transition-transform"
    >
      <span
        className="relative flex h-[58px] w-[58px] items-center justify-center rounded-[18px] text-[28px] leading-none shadow-sm"
        style={{
          background: meta.bg,
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.85),
            0 8px 16px -10px ${meta.accent}66,
            0 2px 0 rgba(255,255,255,0.9)
          `,
        }}
      >
        <span className="drop-shadow-sm" aria-hidden>
          {meta.emoji}
        </span>
        {hasChildren && (
          <span
            className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-extrabold text-white"
            style={{ background: meta.accent }}
          >
            {item.children.length}
          </span>
        )}
      </span>
      <span
        className="w-full text-center text-[11.5px] font-bold leading-tight line-clamp-2"
        style={{ color: "rgb(var(--text))" }}
      >
        {label}
      </span>
    </button>
  );
}

/**
 * Student mobile home — Frequent Activities uplifted card (reference layout).
 */
export default function StudentHomeHub({
  menu,
  colorMap,
  openItem,
  setOpenItem,
  isDark,
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [showAll, setShowAll] = useState(false);
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1024,
  );

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const frequent = useMemo(() => pickFrequent(menu, FREQUENT_LIMIT), [menu]);

  const schoolName =
    user?.school_name || user?.schoolName || t("menu.yourSchool", "Your School");

  if (!isNarrow || showAll) {
    return (
      <div className="flex flex-col gap-3">
        {isNarrow && showAll && (
          <button
            type="button"
            onClick={() => {
              setShowAll(false);
              setOpenItem(null);
            }}
            className="mx-auto flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg active:scale-95"
            style={{
              background: "linear-gradient(145deg, #fb923c, #ea580c)",
              boxShadow: "0 10px 22px -8px rgba(234,88,12,0.65)",
            }}
            aria-label={t("menu.showLess", "Show less")}
          >
            <FaChevronRight className="rotate-90" size={14} />
          </button>
        )}
        <ModuleGrid
          menu={menu}
          colorMap={colorMap}
          openItem={openItem}
          setOpenItem={setOpenItem}
          isDark={isDark}
          expandAll={isNarrow && showAll}
        />
      </div>
    );
  }

  return (
    <div className="relative z-10 -mt-9 px-0.5 pb-2">
      <div className="student-activities-card relative rounded-[1.75rem] border px-4 pb-8 pt-4 sm:px-5">
        <p
          className="mb-3 text-center text-[15px] font-extrabold tracking-tight"
          style={{ color: "#2563EB" }}
        >
          {schoolName}
        </p>

        <h2
          className="mb-3.5 text-[13px] font-extrabold"
          style={{ color: "rgb(var(--text))" }}
        >
          {t("menu.frequentActivities", "Frequent Activities")}
        </h2>

        <div className="grid grid-cols-4 gap-x-2 gap-y-4">
          {frequent.map((item) => (
            <SoftActivityTile
              key={item.name}
              item={item}
              onOpen={(path) => navigate(path)}
              onExpand={(name) => {
                setShowAll(true);
                setOpenItem(name);
              }}
            />
          ))}
        </div>

        {/* Orange “view all” pill overlapping card bottom (reference) */}
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="absolute -bottom-5 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full text-white active:scale-95 transition-transform"
          style={{
            background: "linear-gradient(145deg, #fb923c 0%, #ea580c 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 24px -6px rgba(234,88,12,0.7)",
          }}
          aria-label={t("menu.viewAll", "View all modules")}
        >
          <FaChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
