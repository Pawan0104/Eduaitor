import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUserGraduate,
  FaWallet,
  FaBusAlt,
  FaCalendarAlt,
  FaBell,
  FaCalendar,
  FaBlog,
  FaStore,
  FaIdCard,
  FaHeadset,
  FaClipboardList,
  FaBookDead,
  FaBookOpen,
} from "react-icons/fa";
import { GiOpenBook } from "react-icons/gi";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import BlogFeed from "../components/BlogFeed";
import UpComingNotifications from "../components/UpComingNotifications";
import {
  GreetingHeader,
  ExitPopup,
  ModuleGrid,
  useMenuExitGuard,
} from "../components/RoleMenuShell";
import { clearSessionKeepPrefs } from "../utils/clearSessionKeepPrefs";

const COLOR_MAP = {
  Dashboard: { bg: "#FFF7ED", icon: "#F97316", dot: "#FED7AA" },
  "My Child": { bg: "#EFF6FF", icon: "#3B82F6", dot: "#BFDBFE" },
  "Fee Details": { bg: "#FDF4FF", icon: "#C026D3", dot: "#F5D0FE" },
  "Pay Fee": { bg: "#FDF4FF", icon: "#C026D3", dot: "#F5D0FE" },
  "School Store": { bg: "#EEF2FF", icon: "#4F46E5", dot: "#C7D2FE" },
  Transport: { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },
  Notices: { bg: "#FFF7ED", icon: "#EA580C", dot: "#FED7AA" },
  Events: { bg: "#FFF1F2", icon: "#E11D48", dot: "#FECDD3" },
  Calendar: { bg: "#EFF6FF", icon: "#0EA5E9", dot: "#BAE6FD" },
  Blogs: { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },
  "Student ID Card": { bg: "#ECFDF5", icon: "#059669", dot: "#A7F3D0" },
  "Report Card": { bg: "#FFF7ED", icon: "#EF4444", dot: "#FEE2E2" },
  "Exam Results": { bg: "#FFF7ED", icon: "#EF4444", dot: "#FEE2E2" },
  "Transport & GPS": { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },
  "Help / Support": { bg: "#FFFBEB", icon: "#D97706", dot: "#FDE68A" },
  Homework: { bg: "#FFFBEB", icon: "#D97706", dot: "#FDE68A" },
  "Learned today": { bg: "#ECFDF5", icon: "#059669", dot: "#A7F3D0" },
  "Daily learning": { bg: "#EEF2FF", icon: "#4F46E5", dot: "#C7D2FE" },
  "Syllabus Books": { bg: "#F0FDF4", icon: "#10B981", dot: "#A7F3D0" },
};

export default function ParentMenu() {
  const navigate = useNavigate();
  const [openItem, setOpenItem] = useState(null);
  const [showExit, setShowExit] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { user, setUser } = useAuth();
  const API = import.meta.env.VITE_API_URL;

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

  useMenuExitGuard(setShowExit);

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      toast.info("You have been logged out successfully.");
    } catch {
      toast.error("Logout failed. Please try again.");
    }
    setUser(null);
    clearSessionKeepPrefs();
    navigate("/admin/login", { replace: true });
  };

  const menu = [
    { name: "Dashboard", icon: <FaTachometerAlt />, path: "/parent/dashboard" },
    { name: "My Child", icon: <FaUserGraduate />, path: "/parent/student" },
    { name: "Pay Fee", icon: <FaWallet />, path: "/parent/fees" },
    { name: "School Store", icon: <FaStore />, path: "/parent/store" },
    { name: "Transport & GPS", icon: <FaBusAlt />, path: "/parent/transport" },
    { name: "Exam Results", icon: <GiOpenBook />, path: "/parent/exam-result" },
    { name: "Report Card", icon: <GiOpenBook />, path: "/parent/report-card" },
    { name: "Student ID Card", icon: <FaIdCard />, path: "/parent/id-card" },
    { name: "Notices", icon: <FaBell />, path: "/parent/notice" },
    { name: "Events", icon: <FaCalendar />, path: "/parent/event" },
    { name: "Calendar", icon: <FaCalendarAlt />, path: "/parent/calendar" },
    { name: "Blogs", icon: <FaBlog />, path: "/parent/blogs" },
    { name: "Homework", icon: <FaClipboardList />, path: "/parent/homework" },
    { name: "Learned today", icon: <FaBookOpen />, path: "/parent/learning-today" },
    { name: "Daily learning", icon: <FaClipboardList />, path: "/parent/daily-learning" },
    { name: "Syllabus Books", icon: <FaBookDead />, path: "/parent/syllabus-books" },
    { name: "Help / Support", icon: <FaHeadset />, path: "/parent/help" },
  ];

  return (
    <div className="min-h-screen font-nunito" style={{ background: "rgb(var(--bg))" }}>
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
      <BlogFeed />
      {showExit && (
        <ExitPopup onConfirm={logout} onCancel={() => setShowExit(false)} />
      )}
    </div>
  );
}
