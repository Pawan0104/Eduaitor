import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUsers,
  FaClock,
  FaBell,
  FaCalendarAlt,
  FaCalendar,
  FaBookOpen,
  FaBlog,
} from "react-icons/fa";
import { FaBookJournalWhills } from "react-icons/fa6";
import { GiOpenBook, GiSchoolBag } from "react-icons/gi";
import { FaChevronDown } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import BlogFeed from "../components/BlogFeed";

/* ─── Color map ─────────────────────────────────────────────── */
const COLOR_MAP = {
  Dashboard: { bg: "#FFF7ED", icon: "#F97316", dot: "#FED7AA" },
  Attendance: { bg: "#FFF1F2", icon: "#F43F5E", dot: "#FFD5DB" },
  Timetable: { bg: "#EFF6FF", icon: "#6366F1", dot: "#C7D2FE" },
  Assignment: { bg: "#F0FDF4", icon: "#22C55E", dot: "#BBF7D0" },
  "Exam Results": { bg: "#FFF7ED", icon: "#EF4444", dot: "#FEE2E2" },
  Diary: { bg: "#FDF4FF", icon: "#C026D3", dot: "#F5D0FE" },
  Library: { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },
  Group: { bg: "#FAF5FF", icon: "#A855F7", dot: "#E9D5FF" },
  Notices: { bg: "#FFF7ED", icon: "#EA580C", dot: "#FED7AA" },
  Events: { bg: "#FFF1F2", icon: "#E11D48", dot: "#FECDD3" },
  Calendar: { bg: "#EFF6FF", icon: "#0EA5E9", dot: "#BAE6FD" },
  Blogs: { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },
};
const DEFAULT_COLOR = { bg: "#F3F4F6", icon: "#6B7280", dot: "#E5E7EB" };

/* ─── Exit Popup ─────────────────────────────────────────────── */
function ExitPopup({ onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
    >
      <div className="w-full max-w-lg bg-white rounded-t-3xl px-6 pt-3 pb-10">
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
function MenuCard({ item, color, globalIdx, isOpen, onToggle }) {
  const navigate = useNavigate();
  const hasChildren = Boolean(item.children);

  return (
    <div
      onClick={() => (hasChildren ? onToggle() : navigate(item.path))}
      className={[
        "relative overflow-hidden flex flex-col items-center bg-white cursor-pointer select-none",
        "px-3.5 pt-5 pb-4 transition-all duration-150 active:scale-95",
        isOpen ? "rounded-t-[18px] shadow-md" : "rounded-[18px] shadow-sm",
      ].join(" ")}
      style={{
        animationDelay: `${globalIdx * 45}ms`,
        ...(isOpen ? { outline: `2px solid ${color.icon}25` } : {}),
      }}
    >
      <div
        className="absolute -top-3 -right-3 w-12 h-12 rounded-full opacity-50 pointer-events-none"
        style={{ background: color.dot }}
      />
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
      <p className="m-0 text-[12.5px] font-extrabold text-slate-800 text-center leading-snug">
        {item.name}
      </p>
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
                       cursor-pointer active:scale-[0.97] transition-transform shadow-sm"
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
export default function StudentMenu() {
  const navigate = useNavigate();
  const [openItem, setOpenItem] = useState(null);
  const [showExit, setShowExit] = useState(false);
  const { setUser } = useAuth();
  const API = import.meta.env.VITE_API_URL;

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      toast.info("You have been logged out successfully.");
    } catch (err) {
      console.error("Backend logout failed:", err);
      toast.error("Logout failed. Please try again.");
    }
    setUser(null);
    localStorage.clear();
    sessionStorage.clear();
    navigate("/admin/login", { replace: true });
  };

  /* ─── Menu items ── student-specific routes only ─── */
  const menu = [
    {
      name: "Dashboard",
      icon: <FaTachometerAlt />,
      path: "/student/dashboard",
    },
    { name: "Attendance", icon: <FaUsers />, path: "/student/attendance" },
    { name: "Timetable", icon: <FaClock />, path: "/student/timetable" },
    {
      name: "Assignment",
      icon: <GiSchoolBag />,
      children: [
        { name: "My Assignments", path: "/student/assignment" },
        { name: "Assignment Result", path: "/student/assignment/result" },
      ],
    },
    {
      name: "Exam Results",
      icon: <GiOpenBook />,
      path: "/student/exam-result",
    },
    { name: "Diary", icon: <FaBookOpen />, path: "/student/diary" },
    {
      name: "Library",
      icon: <FaBookJournalWhills />,
      path: "/student/library",
    },
    { name: "Group", icon: <FaUsers />, path: "/student/group" },
    { name: "Notices", icon: <FaBell />, path: "/student/notice" },
    { name: "Events", icon: <FaCalendar />, path: "/student/event" },
    { name: "Calendar", icon: <FaCalendarAlt />, path: "/student/calendar" },
    { name: "Blogs", icon: <FaBlog />, path: "/student/blogs" },
  ];

  /* Group into rows of 2 */
  const rows = [];
  for (let i = 0; i < menu.length; i += 2) rows.push(menu.slice(i, i + 2));

  /* Back-button → exit popup on mobile */
  useEffect(() => {
    const isMobile =
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
      window.innerWidth <= 768;
    if (!isMobile) return;

    let isActive = true;
    const pushStateSafely = () => {
      if (window.history.state !== "menu-lock")
        window.history.pushState("menu-lock", "");
    };

    pushStateSafely();
    const onPopState = () => {
      if (!isActive) return;
      pushStateSafely();
      setShowExit(true);
    };
    const onFocus = () => pushStateSafely();

    window.addEventListener("popstate", onPopState);
    window.addEventListener("focus", onFocus);
    return () => {
      isActive = false;
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="p-4 flex flex-col gap-3">
        {rows.map((row, rowIdx) => {
          const openInRow = row.find(
            (item) => item.name === openItem && item.children,
          );

          return (
            <div key={rowIdx} className="flex flex-col">
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

              {row.some((item) => item.children) &&
                (() => {
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
        <ExitPopup onConfirm={logout} onCancel={() => setShowExit(false)} />
      )}
    </div>
  );
}