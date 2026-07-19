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
  FaClipboardList,
  FaCalendar,
  FaBookOpen,
  FaChevronDown,
  FaUserGraduate,
  FaClipboardCheck,
  FaBook,
  FaBlog,
  FaHotel,
  FaStore,
  FaHeadset,
} from "react-icons/fa";
import { FaBookJournalWhills } from "react-icons/fa6";
import { FiUsers } from "react-icons/fi";
import { GiOpenBook, GiTeacher } from "react-icons/gi";
import { HiAcademicCap } from "react-icons/hi2";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import axios from "axios";
import BlogFeed from "../components/BlogFeed";
import UpComingNotifications from "../components/UpComingNotifications";
import { ModuleGrid, useMenuExitGuard } from "../components/RoleMenuShell";
import { clearSessionKeepPrefs } from "../utils/clearSessionKeepPrefs";

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
  Certificates: { bg: "#F5F3FF", icon: "#7C3AED", dot: "#DDD6FE" },
  "Lead Management": { bg: "#FFF7ED", icon: "#EA580C", dot: "#FED7AA" },
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

  Homework: { bg: "#FFFBEB", icon: "#D97706", dot: "#FDE68A" },

  Events: { bg: "#FFF1F2", icon: "#E11D48", dot: "#FECDD3" },

  Notices: { bg: "#FFF7ED", icon: "#EA580C", dot: "#FED7AA" },

  Calendar: { bg: "#EFF6FF", icon: "#0EA5E9", dot: "#BAE6FD" },

  Library: { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },

  "Hostel Management": { bg: "#EEF2FF", icon: "#4F46E5", dot: "#C7D2FE" },
  "School Commerce Suite": { bg: "#ECFDF5", icon: "#059669", dot: "#A7F3D0" },

  Blog: { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },
  Blogs: { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },
  "Help / Support": { bg: "#FFFBEB", icon: "#D97706", dot: "#FDE68A" },

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
          "linear-gradient(135deg, rgb(var(--sidebar)) 0%, rgb(var(--primary)) 10%)",
      }}
    >
      {/* Decorative dot */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 pointer-events-none"
        style={{ background: "#fff" }}
      />

      {/* Decorative wave — echoes the hero-card wave in the reference mock */}
      <svg
        className="absolute bottom-0 left-0 w-full pointer-events-none"
        viewBox="0 0 400 24"
        preserveAspectRatio="none"
        style={{ height: 22 }}
      >
        <path
          d="M0,14 C50,26 100,2 150,14 C200,26 250,2 300,14 C350,26 400,14 400,14 L400,24 L0,24 Z"
          fill="rgba(255,255,255,0.08)"
        />
      </svg>

      {displayRole && (
        <p className="relative text-white/80 text-[11px] font-bold uppercase tracking-wide mb-1">
          {displayRole}
        </p>
      )}
      <h1 className="relative text-white text-xl font-extrabold mb-1 capitalize">
        Welcome, {name}
      </h1>
      <p className="relative text-white/80 text-[12.5px] font-semibold">
        {dateStr}
      </p>
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
/* Restyled to match the flat colored quick-action tiles in the
   reference mock — solid icon square (white icon) instead of a
   light icon bubble, and the tinted color now fills the whole
   tile rather than just an accent dot. */
function MenuCard({ item, color, globalIdx, isOpen, onToggle, isDark }) {
  const navigate = useNavigate();
  const { tn } = useLanguage();
  const hasChildren = Boolean(item.children);

  const cardBg = isDark ? "rgb(var(--surface))" : color.bg;

  return (
    <div
      onClick={() => (hasChildren ? onToggle() : navigate(item.path))}
      className={[
        "relative overflow-hidden flex flex-col items-center cursor-pointer select-none",
        "px-3.5 pt-5 pb-4 transition-all duration-150 active:scale-95",
        isOpen ? "rounded-t-[18px] shadow-md" : "rounded-[18px] shadow-sm",
      ].join(" ")}
      style={{
        background: cardBg,
        border: isOpen
          ? `2px solid ${color.icon}55`
          : `1px solid ${color.icon}22`,
        animationDelay: `${globalIdx * 45}ms`,
      }}
    >
      {/* Decorative glossy circle */}
      <div
        className="absolute -top-3 -right-3 w-14 h-14 rounded-full pointer-events-none"
        style={{ background: "rgba(255,255,255,0.35)" }}
      />

      {/* Icon square — solid accent color, white icon */}
      <div
        className="relative flex items-center justify-center mb-3 rounded-[15px] text-[20px] shadow-sm"
        style={{ width: 48, height: 48, background: color.icon, color: "#fff" }}
      >
        {item.icon}
      </div>

      {/* Name */}
      <p
        className="relative m-0 text-[12.5px] font-extrabold text-center leading-snug"
        style={{ color: "rgb(var(--text))" }}
      >
        {tn(item.name)}
      </p>

      {/* Badge */}
      {hasChildren && (
        <div
          className="relative mt-2 px-2.5 py-0.5 rounded-full flex items-center gap-1"
          style={{ background: "rgba(255,255,255,0.55)" }}
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
  const { tn } = useLanguage();
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
              {tn(child.name)}
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
  const { t } = useLanguage();
  const API = import.meta.env.VITE_API_URL;

  // ── Read + apply saved theme on mount ───────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("theme") || "theme-light";
    document.documentElement.className = saved;
    setIsDark(saved === "theme-dark");

    const onStorage = () => {
      const themeName = localStorage.getItem("theme") || "theme-light";
      document.documentElement.className = themeName;
      setIsDark(themeName === "theme-dark");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      toast.info(t("topbar.logoutSuccess"));
    } catch (err) {
      toast.error(t("topbar.logoutFailed"));
    }
    setUser(null);
    clearSessionKeepPrefs();
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
        { name: "House Allocation", path: "/school/house" },
        { name: "Certificates", path: "/school/certificates" },
        {
          name: "Document Designs",
          path: "/school/certificates/settings",
        },
      ],
    },
    {
      name: "Lead Management",
      icon: <FaClipboardList />,
      path: "/school/leads",
    },
    {
      name: "Teachers",
      icon: <GiTeacher />,
      children: [
        { name: "All Teachers", path: "/school/teachers" },
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
      name: "Staff",
      icon: <FiUsers />,
      children: [
        { name: "Staff Management", path: "/school/staff" },
        { name: "Staff Roles", path: "/school/staff-roles" },
        { name: "Staff Attendance", path: "/school/staff-attendance" },
      ],
    },
    {
      name: "Exam Management",
      icon: <GiOpenBook />,
      children: [
        { name: "Exam Structure", path: "/school/exam-structure" },
        { name: "Marks Entry", path: "/school/exam-marks-entry" },
        { name: "Exam Marks", path: "/school/exam-marks" },
        { name: "Report Card", path: "/school/report-card" },
      ],
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
        { name: "Financial Report", path: "/school/financial-report" },
        { name: "Defaulters", path: "/school/defaulters" },
      ],
    },
    {
      name: "Diary",
      icon: <FaBookOpen />,
      path: "/school/diary",
    },
    {
      name: "Homework",
      icon: <FaClipboardList />,
      path: "/school/homework",
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
        { name: "GPS Tracking", path: "/school/transport-gps" },
      ],
    },
    {
      name: "Library",
      icon: <FaBookJournalWhills />,
      path: "/school/library",
    },
    {
      name: "Hostel Management",
      icon: <FaHotel />,
      path: "/school/hostel",
    },
    {
      name: "School Commerce Suite",
      icon: <FaStore />,
      path: "/school/commerce",
    },
    {
      name: "Blog",
      icon: <FaBlog />,
      path: "/school/blogs",
    },
    {
      name: "Help / Support",
      icon: <FaHeadset />,
      path: "/school/help",
    },
  ];

  useMenuExitGuard(setShowExit);

  return (
    <div
      className="min-h-screen font-nunito"
      style={{ background: "rgb(var(--bg))" }}
    >
      <div className="flex flex-col gap-3">
        <GreetingHeader
          name={greetingName}
          role={greetingRole}
          loginAs={greetingLoginAs}
        />
        <UpComingNotifications />
        <ModuleGrid
          menu={menu}
          colorMap={COLOR_MAP}
          openItem={openItem}
          setOpenItem={setOpenItem}
          isDark={isDark}
        />
      </div>

      <BlogFeed />

      {showExit && (
        <ExitPopup onConfirm={logout} onCancel={() => setShowExit(false)} />
      )}
    </div>
  );
}
