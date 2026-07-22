import React, { useState, useEffect } from "react";
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
  FaClipboardCheck,
  FaClipboardList,
  FaBookDead,
  FaIdCard,
  FaHeadset,
} from "react-icons/fa";
import { FaBookJournalWhills } from "react-icons/fa6";
import { GiOpenBook, GiSchoolBag } from "react-icons/gi";
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
import { applyTheme, getTheme } from "../utils/theme";

export const COLOR_MAP = {
  Dashboard: { bg: "#FFF7ED", icon: "#F97316", dot: "#FED7AA" },
  Attendance: { bg: "#FFF1F2", icon: "#F43F5E", dot: "#FFD5DB" },
  Timetable: { bg: "#EFF6FF", icon: "#6366F1", dot: "#C7D2FE" },
  Assignment: { bg: "#F8FAFC", icon: "#64748B", dot: "#CBD5E1" },
  "Exam Results": { bg: "#FFF7ED", icon: "#EF4444", dot: "#FEE2E2" },
  "My ID Card": { bg: "#ECFDF5", icon: "#059669", dot: "#A7F3D0" },
  Diary: { bg: "#FDF4FF", icon: "#C026D3", dot: "#F5D0FE" },
  Homework: { bg: "#FFFBEB", icon: "#D97706", dot: "#FDE68A" },
  "Daily learning": { bg: "#EEF2FF", icon: "#4F46E5", dot: "#C7D2FE" },
  "Syllabus Books": { bg: "#F0FDF4", icon: "#10B981", dot: "#A7F3D0" },
  Library: { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },
  Group: { bg: "#F0FDF4", icon: "#22C55E", dot: "#BBF7D0" },
  Notices: { bg: "#FFF7ED", icon: "#EA580C", dot: "#FED7AA" },
  Events: { bg: "#FFF1F2", icon: "#E11D48", dot: "#FECDD3" },
  Calendar: { bg: "#EFF6FF", icon: "#0EA5E9", dot: "#BAE6FD" },
  Blogs: { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },
  "Help / Support": { bg: "#FFFBEB", icon: "#D97706", dot: "#FDE68A" },
};

export default function StudentMenu() {
  const navigate = useNavigate();
  const [openItem, setOpenItem] = useState(null);
  const [showExit, setShowExit] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { user, setUser } = useAuth();
  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "theme-light";
    applyTheme(saved);
    setIsDark(saved === "theme-dark");
    const onStorage = () => {
      const t = localStorage.getItem("theme") || "theme-light";
      applyTheme(t);
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
    { name: "Dashboard", icon: <FaTachometerAlt />, path: "/student/dashboard" },
    { name: "Attendance", icon: <FaClipboardCheck />, path: "/student/attendance" },
    { name: "Timetable", icon: <FaClock />, path: "/student/timetable" },
    {
      name: "Assignment",
      icon: <GiSchoolBag />,
      children: [
        { name: "My Assignments", path: "/student/assignment" },
        { name: "Assignment Result", path: "/student/assignment/result" },
      ],
    },
    { name: "Exam Results", icon: <GiOpenBook />, path: "/student/exam-result" },
    { name: "My ID Card", icon: <FaIdCard />, path: "/student/id-card" },
    { name: "Diary", icon: <FaBookOpen />, path: "/student/diary" },
    { name: "Homework", icon: <FaClipboardList />, path: "/student/homework" },
    { name: "Daily learning", icon: <FaClipboardList />, path: "/student/daily-learning" },
    { name: "Syllabus Books", icon: <FaBookDead />, path: "/student/syllabus-books" },
    { name: "Library", icon: <FaBookJournalWhills />, path: "/student/library" },
    { name: "Group", icon: <FaUsers />, path: "/student/group" },
    { name: "Notices", icon: <FaBell />, path: "/student/notice" },
    { name: "Events", icon: <FaCalendar />, path: "/student/event" },
    { name: "Calendar", icon: <FaCalendarAlt />, path: "/student/calendar" },
    { name: "Blogs", icon: <FaBlog />, path: "/student/blogs" },
    { name: "Help / Support", icon: <FaHeadset />, path: "/student/help" },
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
