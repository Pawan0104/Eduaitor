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
} from "react-icons/fa";
import { FaBookJournalWhills } from "react-icons/fa6";
import { FiUsers } from "react-icons/fi";
import { GiOpenBook, GiTeacher } from "react-icons/gi";
import { HiAcademicCap } from "react-icons/hi2";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import BlogFeed from "../components/BlogFeed";

/* ─── Color map ─────────────────────────────────────────────── */
const COLOR_MAP = {
  Dashboard: { bg: "#FFF7ED", icon: "#F97316", dot: "#FED7AA" },
  Students: { bg: "#EFF6FF", icon: "#3B82F6", dot: "#BFDBFE" },
  Teachers: { bg: "#F0FDF4", icon: "#22C55E", dot: "#BBF7D0" },
  Classes: { bg: "#FAF5FF", icon: "#A855F7", dot: "#E9D5FF" },
  Attendance: { bg: "#FFF1F2", icon: "#F43F5E", dot: "#FFD5DB" },
  "Exam Management": { bg: "#FFF7ED", icon: "#EF4444", dot: "#FEE2E2" },
  Syllabus: { bg: "#F0FDF4", icon: "#10B981", dot: "#A7F3D0" },
  Timetable: { bg: "#EFF6FF", icon: "#6366F1", dot: "#C7D2FE" },
  "Fee Management": { bg: "#FFFBEB", icon: "#D97706", dot: "#FDE68A" },
  Diary: { bg: "#FDF4FF", icon: "#C026D3", dot: "#F5D0FE" },
  Events: { bg: "#FFF1F2", icon: "#E11D48", dot: "#FECDD3" },
  Notices: { bg: "#FFF7ED", icon: "#EA580C", dot: "#FED7AA" },
  Calendar: { bg: "#EFF6FF", icon: "#0EA5E9", dot: "#BAE6FD" },
  "Transport Management": { bg: "#F8FAFC", icon: "#64748B", dot: "#CBD5E1" },
  Library: { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },
};
const DEFAULT_COLOR = { bg: "#F3F4F6", icon: "#6B7280", dot: "#E5E7EB" };

/* ─── Exit Popup ────────────────────────────────────────────── */
function ExitPopup({ onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in"
      style={{ background: "rgba(0,0,0,0.45)" }}
    >
      <div className="w-full max-w-lg bg-white rounded-t-3xl px-6 pt-3 pb-10 animate-slide-up">
        <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-6" />

        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-2xl mb-4">
            🚪
          </div>
          <h2 className="text-lg font-extrabold text-slate-800 mb-1">
            Exit App?
          </h2>
          <p className="text-sm text-slate-500 text-center leading-relaxed">
            Are you sure you want to logout and exit?
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-2xl border border-slate-200 bg-slate-50
                       text-sm font-extrabold text-slate-600 active:scale-95 transition-transform"
          >
            Stay
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 rounded-2xl text-sm font-extrabold text-white
                       active:scale-95 transition-transform"
            style={{
              background: "linear-gradient(135deg,#1E3A5F 0%,#2563EB 100%)",
            }}
          >
            Logout &amp; Exit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Accordion panel — ALWAYS rendered, never unmounted ───────
   KEY FIX: conditional rendering caused unmount on close so
   the closing animation never played. Now we keep it mounted
   and drive open/close purely through max-height transition.
──────────────────────────────────────────────────────────────── */
function AccordionPanel({ isOpen, children }) {
  const innerRef = useRef(null);
  const [height, setHeight] = useState(0);

  /* Measure whenever children change */
  useEffect(() => {
    if (innerRef.current) {
      setHeight(innerRef.current.scrollHeight);
    }
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
function MenuCard({ item, color, globalIdx, isOpen, onToggle }) {
  const navigate = useNavigate();
  const hasChildren = Boolean(item.children);

  return (
    <div
      onClick={() => (hasChildren ? onToggle() : navigate(item.path))}
      className={[
        "relative overflow-hidden flex flex-col items-center bg-white cursor-pointer select-none",
        "px-3.5 pt-5 pb-4 transition-all duration-150 active:scale-95 animate-fade-slide-up",
        isOpen ? "rounded-t-[18px] shadow-md" : "rounded-[18px] shadow-sm",
      ].join(" ")}
      style={{
        animationDelay: `${globalIdx * 45}ms`,
        ...(isOpen ? { outline: `2px solid ${color.icon}25` } : {}),
      }}
    >
      {/* Decorative dot */}
      <div
        className="absolute -top-3 -right-3 w-12 h-12 rounded-full opacity-50 pointer-events-none"
        style={{ background: color.dot }}
      />

      {/* Icon bubble */}
      <div
        className="flex items-center justify-center mb-3 rounded-[15px] text-[22px]"
        style={{
          width: 52,
          height: 52,
          background: color.bg,
          color: color.icon,
        }}
      >
        {item.icon}
      </div>

      {/* Name */}
      <p className="m-0 text-[12.5px] font-extrabold text-slate-800 text-center leading-snug">
        {item.name}
      </p>

      {/* Badge */}
      {hasChildren && (
        <div
          className="mt-2 px-2.5 py-0.5 rounded-full flex items-center gap-1"
          style={{ background: color.bg }}
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
function ChildList({ children, color }) {
  const navigate = useNavigate();
  return (
    <div
      className="rounded-b-[18px] overflow-hidden"
      style={{ background: color.bg }}
    >
      <div className="flex flex-col gap-2 p-3 pt-2">
        {children.map((child, idx) => (
          <div
            key={child.name}
            onClick={() => navigate(child.path)}
            className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3
                       cursor-pointer active:scale-[0.97] transition-transform
                       shadow-sm animate-fade-slide-right"
            style={{
              border: `1.5px solid ${color.dot}`,
              animationDelay: `${idx * 50}ms`,
            }}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: color.icon }}
            />
            <span className="flex-1 text-[13.5px] font-bold text-slate-800">
              {child.name}
            </span>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: color.bg, color: color.icon }}
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
  const { user, loading, setUser } = useAuth();
  const API = import.meta.env.VITE_API_URL;

  const logout = async () => {
    try {
      const res = await axios.post(
        `${API}/auth/logout`,
        {},
        {
          withCredentials: true,
        },
      );
      toast.info("You have been logged out successfully.");
    } catch (err) {
      console.error("Backend logout failed:", err);
      toast.error("Logout failed. Please try again.");
    }
    setUser(null); // Clear user from context
    localStorage.clear();
    sessionStorage.clear();
    navigate("/admin/login", { replace: true });
  };

  const menu = [
    { name: "Dashboard", icon: <FaTachometerAlt />, path: "/school/dashboard" },
    {
      name: "Students",
      icon: <FaUserGraduate />,
      children: [
        { name: "All Students", path: "/school/students" },
        { name: "Add Student", path: "/school/student-manage" },
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
    { name: "Attendance", icon: <FiUsers />, path: "/school/attendance" },
    {
      name: "Exam Management",
      icon: <GiOpenBook />,
      children: [{ name: "Exam Structure", path: "/school/exam-structure" }],
    },
    { name: "Syllabus", icon: <FaBookDead />, path: "/school/syllabus" },
    { name: "Timetable", icon: <FaClock />, path: "/school/timetable" },
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
    { name: "Diary", icon: <FaBookOpen />, path: "/school/diary" },
    { name: "Events", icon: <FaCalendar />, path: "/school/event" },
    { name: "Notices", icon: <FaBell />, path: "/school/notice" },
    { name: "Calendar", icon: <FaCalendarAlt />, path: "/school/calendar" },
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
    { name: "Library", icon: <FaBookJournalWhills />, path: "/school/library" },
  ];

  /* Group into rows of 2 — keeps grid columns stable */
  const rows = [];
  for (let i = 0; i < menu.length; i += 2) rows.push(menu.slice(i, i + 2));

  /* ── Mobile back-button → exit popup ──────────────────────────
     FIX: empty dependency array (runs once on mount only),
     no pathname check (component only ever mounts at /school/menu),
     re-push null state to keep user trapped on this page.
  ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const isMobile =
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
      window.innerWidth <= 768;

    if (!isMobile) return;

    let isActive = true;

    const pushStateSafely = () => {
      // Avoid stacking multiple entries
      if (window.history.state !== "menu-lock") {
        window.history.pushState("menu-lock", "");
      }
    };

    // Initial push
    pushStateSafely();

    const onPopState = (e) => {
      if (!isActive) return;

      // Always re-push so user stays here
      pushStateSafely();

      setShowExit(true);
    };

    window.addEventListener("popstate", onPopState);

    // 🔥 IMPORTANT: handle when user comes back to tab/page
    const onFocus = () => {
      pushStateSafely();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      isActive = false;
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-slate-100 font-nunito">
      {/* Grid — row-based so accordion never breaks column count */}
      <div className="p-4 flex flex-col gap-3">
        {rows.map((row, rowIdx) => {
          /* Find the open item in this row (there can be at most one open globally) */
          const openInRow = row.find(
            (item) => item.name === openItem && item.children,
          );

          return (
            <div key={rowIdx} className="flex flex-col">
              {/* Always 2-column card row */}
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
                      onToggle={() => setOpenItem(isOpen ? null : item.name)}
                    />
                  );
                })}
              </div>

              {/* AccordionPanel is ALWAYS rendered for every row that has a child-item.
                  It is never conditionally mounted/unmounted — only open/closed via
                  max-height so the closing transition always plays. */}
              {row.some((item) => item.children) &&
                (() => {
                  /* Pick the child-item in this row (open or not — panel stays mounted) */
                  const childItem = openInRow ?? row.find((i) => i.children);
                  const color = COLOR_MAP[childItem.name] ?? DEFAULT_COLOR;
                  return (
                    <AccordionPanel isOpen={Boolean(openInRow)}>
                      <ChildList children={childItem.children} color={color} />
                    </AccordionPanel>
                  );
                })()}
            </div>
          );
        })}
      </div>

      <BlogFeed />
      {showExit && (
        <ExitPopup
          onConfirm={handleLogout}
          onCancel={() => setShowExit(false)}
        />
      )}
    </div>
  );
}
