import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronDown, FaChevronUp, FaSearch, FaTimes } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import UserAvatar from "./UserAvatar";
import { ModuleGrid } from "./RoleMenuShell";
import { getMenuIconMeta } from "../utils/menuIcons";

const FREQUENT_KEY = "menuFrequentClicks";
const FREQUENT_LIMIT = 8;

/** Re-export shared map for older imports */
export { MENU_ICON_META as STUDENT_ICON_META } from "../utils/menuIcons";

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
  const meta = getMenuIconMeta(item.name);
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
      className="group flex flex-col items-center gap-1.5 select-none active:scale-95 transition-transform"
    >
      <span className="relative flex h-12 w-12 items-center justify-center text-[32px] leading-none">
        <span aria-hidden>{meta.emoji}</span>
        {hasChildren && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-extrabold text-white"
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
 * View all keeps the same emoji icons (does not switch to Fa icon grid).
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
  const [query, setQuery] = useState("");
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1024,
  );

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const frequent = useMemo(() => pickFrequent(menu, FREQUENT_LIMIT), [menu]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return menu;
    return menu.filter((item) => {
      if (item.name.toLowerCase().includes(q)) return true;
      return item.children?.some((c) => c.name.toLowerCase().includes(q));
    });
  }, [menu, query]);

  const displayItems = showAll ? filtered : frequent;

  const schoolName =
    user?.school_name || user?.schoolName || t("menu.yourSchool", "Your School");

  // Desktop: shared module grid
  if (!isNarrow) {
    return (
      <div className="flex flex-col gap-3">
        <ModuleGrid
          menu={menu}
          colorMap={colorMap}
          openItem={openItem}
          setOpenItem={setOpenItem}
          isDark={isDark}
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

        {showAll && (
          <div
            className="mb-3 flex h-11 items-center gap-2.5 rounded-2xl border px-3"
            style={{
              background: "rgb(var(--bg))",
              borderColor: "rgb(var(--border))",
            }}
          >
            <FaSearch
              size={13}
              className="shrink-0"
              style={{ color: "rgb(var(--text-muted))" }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("menu.searchModules", "Search modules…")}
              className="flex-1 bg-transparent text-[13px] font-semibold outline-none
                placeholder:font-medium placeholder:text-[rgb(var(--text-muted))]"
              style={{ color: "rgb(var(--text))" }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                aria-label={t("common.close", "Close")}
              >
                <FaTimes size={11} style={{ color: "rgb(var(--text-muted))" }} />
              </button>
            )}
          </div>
        )}

        <h2
          className="mb-3.5 text-[13px] font-extrabold"
          style={{ color: "rgb(var(--text))" }}
        >
          {showAll
            ? t("menu.allModules", "All modules")
            : t("menu.frequentActivities", "Frequent Activities")}
        </h2>

        {displayItems.length === 0 ? (
          <p
            className="mb-2 rounded-2xl px-3 py-6 text-center text-[12px] font-semibold"
            style={{
              background: "rgb(var(--bg))",
              color: "rgb(var(--text-muted))",
            }}
          >
            {t("menu.noneFound", "No modules found")}
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-x-2 gap-y-4">
            {displayItems.map((item) => (
              <SoftActivityTile
                key={item.name}
                item={item}
                onOpen={(path) => navigate(path)}
                onExpand={(name) => setOpenItem(name)}
              />
            ))}
          </div>
        )}

        {/* Orange expand / collapse — same emoji grid either way */}
        <button
          type="button"
          onClick={() => {
            if (showAll) {
              setShowAll(false);
              setQuery("");
              setOpenItem(null);
            } else {
              setShowAll(true);
            }
          }}
          className="absolute -bottom-5 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full text-white active:scale-95 transition-transform"
          style={{
            background: "linear-gradient(145deg, #fb923c 0%, #ea580c 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 24px -6px rgba(234,88,12,0.7)",
          }}
          aria-label={
            showAll
              ? t("menu.showLess", "Show less")
              : t("menu.viewAll", "View all modules")
          }
        >
          {showAll ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
        </button>
      </div>
    </div>
  );
}
