import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaChevronDown,
  FaUserShield,
  FaSchool,
  FaChartLine,
  FaHeadset,
  FaBookDead,
} from "react-icons/fa";
import { FaSchoolFlag } from "react-icons/fa6";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import UpComingNotifications from "../components/UpComingNotifications";
import {
  GreetingHeader,
  ModuleGrid,
  useMenuExitGuard,
} from "../components/RoleMenuShell";
import { clearSessionKeepPrefs } from "../utils/clearSessionKeepPrefs";

/* ─── Color map ─────────────────────────────────────────────── */
const COLOR_MAP = {
  Dashboard: { bg: "#FFF7ED", icon: "#F97316", dot: "#FED7AA" },
  "Platform Analytics": { bg: "#EEF2FF", icon: "#4F46E5", dot: "#C7D2FE" },
  "Access Control": { bg: "#FDF4FF", icon: "#A855F7", dot: "#E9D5FF" },
  School: { bg: "#EFF6FF", icon: "#3B82F6", dot: "#BFDBFE" },
  "School Detail": { bg: "#F0FDF4", icon: "#22C55E", dot: "#BBF7D0" },
  "Help Requests": { bg: "#FFFBEB", icon: "#D97706", dot: "#FDE68A" },
  "Syllabus Catalog": { bg: "#F0FDF4", icon: "#10B981", dot: "#A7F3D0" },
};
const DEFAULT_COLOR = { bg: "#F3F4F6", icon: "#6B7280", dot: "#E5E7EB" };

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

  // In dark mode the hardcoded pastel bg/dot colors look out of place,
  // so we blend them toward the surface color.
  const cardBg = isDark ? "rgb(var(--surface))" : color.bg;
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
        style={{
          width: 52,
          height: 52,
          background: cardBg,
          color: color.icon,
        }}
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
          style={{ background: cardBg }}
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
              style={{
                background: listBg,
                color: color.icon,
              }}
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
export default function SuperAdminMenu() {
  const navigate = useNavigate();
  const [openItem, setOpenItem] = useState(null);
  const [showExit, setShowExit] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { user, setUser } = useAuth();
  const API = import.meta.env.VITE_API_URL;

  // ── Read saved theme on mount (same as Topbar) ──────────────
  useEffect(() => {
    const saved = localStorage.getItem("theme") || "theme-light"; // ← fallback
    if (saved) {
      document.documentElement.className = saved;
      setIsDark(saved === "theme-dark");
    }
    // Re-check when storage changes (e.g. Topbar changed it in another tab)
    const onStorage = () => {
      const t = localStorage.getItem("theme") || "";
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
    clearSessionKeepPrefs();
    navigate("/admin/login", { replace: true });
  };

  const menu = [
    { name: "Dashboard", icon: <FaTachometerAlt />, path: "/admin/dashboard" },
    // {
    //   name: "Platform Analytics",
    //   icon: <FaChartLine />,
    //   path: "/admin/platform-analytics",
    // },
    {
      name: "Access Control",
      icon: <FaUserShield />,
      children: [
        { name: "Access", path: "/admin/access-control" },
        { name: "Role Management", path: "/admin/roles" },
      ],
    },
    {
      name: "School",
      icon: <FaSchool />,
      children: [
        { name: "All Schools", path: "/admin/schools" },
        { name: "Add School", path: "/admin/add-school" },
        { name: "School Management", path: "/admin/school-manage" },
        { name: "School Subscription Plan", path: "/admin/subscription-plan" },
      ],
    },
    {
      name: "School Detail",
      icon: <FaSchoolFlag />,
      path: "/admin/school-detail",
    },
    {
      name: "Syllabus Catalog",
      icon: <FaBookDead />,
      path: "/admin/syllabus-catalog",
    },
    {
      name: "Help Requests",
      icon: <FaHeadset />,
      path: "/admin/messages",
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
          name={user?.name || user?.school_name || "User"}
          role={user?.role || "User"}
          loginAs={user?.loginAs}
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

      {showExit && (
        <ExitPopup onConfirm={logout} onCancel={() => setShowExit(false)} />
      )}
    </div>
  );
}