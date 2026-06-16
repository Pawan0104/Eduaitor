import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaClock,
  FaWallet,
  FaCalendarAlt,
  FaBell,
  FaBusAlt,
  FaBookDead,
  FaCalendar,
  FaBookOpen,
  FaChevronDown,
  FaUserGraduate,
  FaClipboardCheck,
  FaBook,
  FaBlog,
} from "react-icons/fa";
import { FaBookJournalWhills } from "react-icons/fa6";
import { FiUsers } from "react-icons/fi";
import { GiOpenBook, GiTeacher } from "react-icons/gi";
import { HiAcademicCap } from "react-icons/hi2";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import BlogFeed from "../components/BlogFeed";
import UpComingNotifications from "../components/UpComingNotifications";

/* ─── Color map ─────────────────────────────────────────────── */
export const COLOR_MAP = {
  Dashboard: { bg: "#FFF7ED", icon: "#F97316", dot: "#FED7AA" },

  // Admin
  "Platform Analytics": { bg: "#EEF2FF", icon: "#4F46E5", dot: "#C7D2FE" },
  "Access Control": { bg: "#FDF4FF", icon: "#A855F7", dot: "#E9D5FF" },
  School: { bg: "#EFF6FF", icon: "#3B82F6", dot: "#BFDBFE" },
  "School Detail": { bg: "#F0FDF4", icon: "#22C55E", dot: "#BBF7D0" },

  // Student / Principal
  Students: { bg: "#EFF6FF", icon: "#3B82F6", dot: "#BFDBFE" },
  Teachers: { bg: "#F0FDF4", icon: "#22C55E", dot: "#BBF7D0" },
  Classes: { bg: "#FAF5FF", icon: "#A855F7", dot: "#E9D5FF" },
  "My Classes": { bg: "#FAF5FF", icon: "#A855F7", dot: "#E9D5FF" },

  Attendance: { bg: "#FFF1F2", icon: "#F43F5E", dot: "#FFD5DB" },

  Exams: { bg: "#FFF7ED", icon: "#EF4444", dot: "#FEE2E2" },
  "Exam Results": { bg: "#FFF7ED", icon: "#EF4444", dot: "#FEE2E2" },
  "Exam Management": { bg: "#FFF7ED", icon: "#EF4444", dot: "#FEE2E2" },

  Syllabus: { bg: "#F0FDF4", icon: "#10B981", dot: "#A7F3D0" },

  Timetable: { bg: "#EFF6FF", icon: "#6366F1", dot: "#C7D2FE" },

  Assignment: { bg: "#F8FAFC", icon: "#64748B", dot: "#CBD5E1" },

  "Fee Management": { bg: "#FFFBEB", icon: "#D97706", dot: "#FDE68A" },

  Diary: { bg: "#FDF4FF", icon: "#C026D3", dot: "#F5D0FE" },

  Events: { bg: "#FFF1F2", icon: "#E11D48", dot: "#FECDD3" },

  Notices: { bg: "#FFF7ED", icon: "#EA580C", dot: "#FED7AA" },

  Calendar: { bg: "#EFF6FF", icon: "#0EA5E9", dot: "#BAE6FD" },

  Library: { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },

  Blog: { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },
  Blogs: { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },

  Group: { bg: "#F0FDF4", icon: "#22C55E", dot: "#BBF7D0" },

  "Transport Management": {
    bg: "#F8FAFC",
    icon: "#64748B",
    dot: "#CBD5E1",
  },
};
const DEFAULT_COLOR = { bg: "#F3F4F6", icon: "#6B7280", dot: "#E5E7EB" };

/* ─── Greeting header ───────────────────────────────────────── */
function GreetingHeader({ name, role, loginAs }) {
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setDateStr(
        now.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "2-digit",
          month: "short",
        }),
      );
    };
    update();
  }, []);

  const displayRole = (loginAs ? loginAs : role || "").replace("_", " ");

  return (
    <div
      className="rounded-[20px] px-5 py-5 mb-1 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgb(var(--sidebar)) 0%, rgb(var(--primary)) 100%)",
      }}
    >
      {/* Decorative dot */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 pointer-events-none"
        style={{ background: "#fff" }}
      />
      {displayRole && (
        <p className="text-white/80 text-[11px] font-bold uppercase tracking-wide mb-1">
          {displayRole}
        </p>
      )}
      <h1 className="text-white text-xl font-extrabold mb-1 capitalize">
        Welcome, {name}
      </h1>
      <p className="text-white/80 text-[12.5px] font-semibold">{dateStr}</p>
    </div>
  );
}

/* ─── Exit Popup ────────────────────────────────────────────── */
function ExitPopup({ onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl px-6 pt-3 pb-10"
        style={{ background: "rgb(var(--bg))" }}
      >
        <div
          className="w-10 h-1 rounded-full mx-auto mb-6"
          style={{ background: "rgb(var(--border))" }}
        />
        <div className="flex flex-col items-center mb-7">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-4"
            style={{ background: "rgb(var(--surface))" }}
          >
            🚪
          </div>
          <h2
            className="text-lg font-extrabold mb-1"
            style={{ color: "rgb(var(--text))" }}
          >
            Exit App?
          </h2>
          <p
            className="text-sm text-center leading-relaxed"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            Are you sure you want to logout and exit?
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-2xl text-sm font-extrabold active:scale-95 transition-transform border"
            style={{
              borderColor: "rgb(var(--border))",
              background: "rgb(var(--surface))",
              color: "rgb(var(--text))",
            }}
          >
            Stay
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 rounded-2xl text-sm font-extrabold text-white active:scale-95 transition-transform"
            style={{
              background:
                "linear-gradient(135deg, rgb(var(--sidebar)) 0%, rgb(var(--primary)) 100%)",
            }}
          >
            Logout &amp; Exit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Accordion panel ───────────────────────────────────────── */
function AccordionPanel({ isOpen, children }) {
  const innerRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (innerRef.current) setHeight(innerRef.current.scrollHeight);
  });

  return (
    <div
      className="overflow-hidden"
      style={{
        maxHeight: isOpen ? `${height}px` : "0px",
        transition: "max-height 0.38s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
}

/* ─── Card tile ─────────────────────────────────────────────── */
function MenuCard({ item, color, globalIdx, isOpen, onToggle, isDark }) {
  const navigate = useNavigate();
  const hasChildren = Boolean(item.children);

  const iconBg = isDark ? "rgb(var(--surface))" : color.bg;
  const dotColor = isDark ? "rgb(var(--border))" : color.dot;

  return (
    <div
      onClick={() => (hasChildren ? onToggle() : navigate(item.path))}
      className={[
        "relative overflow-hidden flex flex-col items-center cursor-pointer select-none",
        "px-3.5 pt-5 pb-4 transition-all duration-150 active:scale-95",
        isOpen ? "rounded-t-[18px] shadow-md" : "rounded-[18px] shadow-sm",
      ].join(" ")}
      style={{
        background: "rgb(var(--bg))",
        border: isOpen
          ? `2px solid ${color.icon}40`
          : "1px solid rgb(var(--border))",
        animationDelay: `${globalIdx * 45}ms`,
      }}
    >
      {/* Decorative dot */}
      <div
        className="absolute -top-3 -right-3 w-12 h-12 rounded-full opacity-50 pointer-events-none"
        style={{ background: dotColor }}
      />

      {/* Icon bubble */}
      <div
        className="flex items-center justify-center mb-3 rounded-[15px] text-[22px]"
        style={{ width: 52, height: 52, background: iconBg, color: color.icon }}
      >
        {item.icon}
      </div>

      {/* Name */}
      <p
        className="m-0 text-[12.5px] font-extrabold text-center leading-snug"
        style={{ color: "rgb(var(--text))" }}
      >
        {item.name}
      </p>

      {/* Badge */}
      {hasChildren && (
        <div
          className="mt-2 px-2.5 py-0.5 rounded-full flex items-center gap-1"
          style={{ background: iconBg }}
        >
          <span className="text-[10px] font-bold" style={{ color: color.icon }}>
            {item.children.length} items
          </span>
          <FaChevronDown
            size={8}
            style={{
              color: color.icon,
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Children list ─────────────────────────────────────────── */
function ChildList({ children, color, isDark }) {
  const navigate = useNavigate();
  const listBg = isDark ? "rgb(var(--surface))" : color.bg;

  return (
    <div
      className="rounded-b-[18px] overflow-hidden"
      style={{ background: listBg }}
    >
      <div className="flex flex-col gap-2 p-3 pt-2">
        {children.map((child, idx) => (
          <div
            key={child.name}
            onClick={() => navigate(child.path)}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer active:scale-[0.97] transition-transform shadow-sm"
            style={{
              background: "rgb(var(--bg))",
              border: `1.5px solid rgb(var(--border))`,
              animationDelay: `${idx * 50}ms`,
            }}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: color.icon }}
            />
            <span
              className="flex-1 text-[13.5px] font-bold"
              style={{ color: "rgb(var(--text))" }}
            >
              {child.name}
            </span>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: listBg, color: color.icon }}
            >
              ›
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Root ──────────────────────────────────────────────────── */
export default function SchoolMenu() {
  const navigate = useNavigate();
  const [openItem, setOpenItem] = useState(null);
  const [showExit, setShowExit] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { user, setUser } = useAuth();
  const API = import.meta.env.VITE_API_URL;

  // ── Read + apply saved theme on mount ───────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("theme") || "theme-light";
    document.documentElement.className = saved;
    setIsDark(saved === "theme-dark");

    const onStorage = () => {
      const t = localStorage.getItem("theme") || "theme-light";
      document.documentElement.className = t;
      setIsDark(t === "theme-dark");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      toast.info("You have been logged out successfully.");
    } catch (err) {
      toast.error("Logout failed. Please try again.");
    }
    setUser(null);
    localStorage.clear();
    sessionStorage.clear();
    navigate("/admin/login", { replace: true });
  };

  // ── Greeting info (same pattern as Topbar) ──────────────────
  const greetingName = user?.name || user?.school_name || "User";
  const greetingRole = user?.role || "User";
  const greetingLoginAs = user?.loginAs;

  const menu = [
    {
      name: "Dashboard",
      icon: <FaTachometerAlt />,
      path: "/school/dashboard",
    },
    {
      name: "Students",
      icon: <FaUserGraduate />,
      children: [
        { name: "All Students", path: "/school/students" },
        { name: "Add Student", path: "/school/student-manage" },
        { name: "Bulk Upload", path: "/school/students/bulk-upload" },
      ],
    },
    {
      name: "Teachers",
      icon: <GiTeacher />,
      children: [
        { name: "All Teachers", path: "/school/teachers" },
        { name: "Add Teacher", path: "/school/teacher-manage" },
        
      ],
    },
    {
      name: "Classes",
      icon: <HiAcademicCap />,
      children: [
        { name: "Class", path: "/school/class" },
        { name: "Section", path: "/school/section" },
        { name: "Subjects", path: "/school/subject" },
      ],
    },
    {
      name: "Attendance",
      icon: <FaClipboardCheck />,
      path: "/school/attendance",
    },
    {
      name: "Exam Management",
      icon: <GiOpenBook />,
      children: [{ name: "Exam Structure", path: "/school/exam-structure" }],
    },
    {
      name: "Syllabus",
      icon: <FaBook />,
      path: "/school/syllabus",
    },
    {
      name: "Timetable",
      icon: <FaClock />,
      path: "/school/timetable",
    },
    {
      name: "Fee Management",
      icon: <FaWallet />,
      children: [
        { name: "Fee Structure", path: "/school/fee-structure" },
        { name: "Fee Collection", path: "/school/fee-collection" },
        { name: "Fee History", path: "/school/fee-history" },
        { name: "Defaulters", path: "/school/defaulters" },
      ],
    },
    {
      name: "Diary",
      icon: <FaBookOpen />,
      path: "/school/diary",
    },
    {
      name: "Events",
      icon: <FaCalendar />,
      path: "/school/event",
    },
    {
      name: "Notices",
      icon: <FaBell />,
      path: "/school/notice",
    },
    {
      name: "Calendar",
      icon: <FaCalendarAlt />,
      path: "/school/calendar",
    },
    {
      name: "Transport Management",
      icon: <FaBusAlt />,
      children: [
        { name: "Transport", path: "/school/transport" },
        { name: "Route Manage", path: "/school/transport-route" },
        { name: "Bus Manage", path: "/school/transport-bus" },
        { name: "Driver Manage", path: "/school/transport-driver" },
      ],
    },
    {
      name: "Library",
      icon: <FaBookJournalWhills />,
      path: "/school/library",
    },
    {
      name: "Blog",
      icon: <FaBlog />,
      path: "/school/blogs",
    },
  ];

  const rows = [];
  for (let i = 0; i < menu.length; i += 2) rows.push(menu.slice(i, i + 2));

  // ── Mobile back-button → exit popup ─────────────────────────
  useEffect(() => {
    const isMobile =
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
      window.innerWidth <= 768;
    if (!isMobile) return;

    let isActive = true;
    const push = () => {
      if (window.history.state !== "menu-lock")
        window.history.pushState("menu-lock", "");
    };
    push();

    const onPopState = () => {
      if (!isActive) return;
      push();
      setShowExit(true);
    };
    const onFocus = () => push();

    window.addEventListener("popstate", onPopState);
    window.addEventListener("focus", onFocus);
    return () => {
      isActive = false;
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <div
      className="min-h-screen font-nunito"
      style={{ background: "rgb(var(--bg))" }}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Greeting */}
        <GreetingHeader
          name={greetingName}
          role={greetingRole}
          loginAs={greetingLoginAs}
        />

        {rows.map((row, rowIdx) => {
          const openInRow = row.find(
            (item) => item.name === openItem && item.children,
          );

          return (
            <div key={rowIdx} className="flex flex-col">
              <UpComingNotifications />
              <div className="grid grid-cols-2 gap-3">
                {row.map((item, colIdx) => {
                  const color = COLOR_MAP[item.name] ?? DEFAULT_COLOR;
                  const isOpen = openItem === item.name;
                  const globalIdx = rowIdx * 2 + colIdx;

                  return (
                    <MenuCard
                      key={item.name}
                      item={item}
                      color={color}
                      globalIdx={globalIdx}
                      isOpen={isOpen}
                      isDark={isDark}
                      onToggle={() => setOpenItem(isOpen ? null : item.name)}
                    />
                  );
                })}
              </div>
              {row.some((item) => item.children) &&
                (() => {
                  const childItem = openInRow ?? row.find((i) => i.children);
                  const color = COLOR_MAP[childItem.name] ?? DEFAULT_COLOR;
                  return (
                    <AccordionPanel isOpen={Boolean(openInRow)}>
                      <ChildList
                        children={childItem.children}
                        color={color}
                        isDark={isDark}
                      />
                    </AccordionPanel>
                  );
                })()}
            </div>
          );
        })}
      </div>

      <BlogFeed />

      {showExit && (
        <ExitPopup onConfirm={logout} onCancel={() => setShowExit(false)} />
      )}
    </div>
  );
}