import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaClock,
  FaCalendarAlt,
  FaBell,
  FaCalendar,
  FaBookOpen,
  FaUserGraduate,
  FaUsers,
  FaClipboardCheck,
  FaClipboardList,
  FaBook,
  FaBlog,
  FaPassport,
  FaComments,
  FaHeadset,
} from "react-icons/fa";
import { GiOpenBook, GiSchoolBag } from "react-icons/gi";
import { HiAcademicCap } from "react-icons/hi2";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import BlogFeed from "../components/BlogFeed";
import UpComingNotifications from "../components/UpComingNotifications";
import { MdNotificationsActive } from "react-icons/md";
import {
  GreetingHeader,
  ExitPopup,
  ModuleGrid,
  useMenuExitGuard,
} from "../components/RoleMenuShell";
import { clearSessionKeepPrefs } from "../utils/clearSessionKeepPrefs";

export const COLOR_MAP = {
  Dashboard: { bg: "#FFF7ED", icon: "#F97316", dot: "#FED7AA" },
  "Platform Analytics": { bg: "#EEF2FF", icon: "#4F46E5", dot: "#C7D2FE" },
  "Access Control": { bg: "#FDF4FF", icon: "#A855F7", dot: "#E9D5FF" },
  School: { bg: "#EFF6FF", icon: "#3B82F6", dot: "#BFDBFE" },
  "School Detail": { bg: "#F0FDF4", icon: "#22C55E", dot: "#BBF7D0" },
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
  Homework: { bg: "#FFFBEB", icon: "#D97706", dot: "#FDE68A" },
  "Pages taught": { bg: "#ECFDF5", icon: "#059669", dot: "#A7F3D0" },
  "Daily learning": { bg: "#EEF2FF", icon: "#4F46E5", dot: "#C7D2FE" },
  Events: { bg: "#FFF1F2", icon: "#E11D48", dot: "#FECDD3" },
  Notices: { bg: "#FFF7ED", icon: "#EA580C", dot: "#FED7AA" },
  Calendar: { bg: "#EFF6FF", icon: "#0EA5E9", dot: "#BAE6FD" },
  Library: { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },
  Blog: { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },
  Blogs: { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },
  Group: { bg: "#F0FDF4", icon: "#22C55E", dot: "#BBF7D0" },
  "Transport Management": { bg: "#F8FAFC", icon: "#64748B", dot: "#CBD5E1" },
  Notifications: { bg: "#F3F4F6", icon: "#262a8c", dot: "#E5E7EB" },
  "Gate Pass": { bg: "#e6efe6", icon: "#262a8c", dot: "#FECDD3" },
  Messages: { bg: "#FFF1F2", icon: "#C026D3", dot: "#A7F3D0" },
  "Help / Support": { bg: "#FFFBEB", icon: "#D97706", dot: "#FDE68A" },
};

export default function TeacherMenu() {
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

  const allMenu = [
    { name: "Dashboard", icon: <FaTachometerAlt />, path: "/teacher/dashboard" },
    { name: "Notifications", icon: <MdNotificationsActive />, path: "/teacher/notification" },
    { name: "Students", icon: <FaUserGraduate />, path: "/teacher/students", module: "students" },
    {
      name: "Attendance",
      icon: <FaClipboardCheck />,
      module: "attendance",
      children: [
        { name: "Mark Attendance", path: "/teacher/attendance/mark" },
        { name: "Attendance Report", path: "/teacher/attendance/report" },
      ],
    },
    { name: "My Classes", icon: <HiAcademicCap />, path: "/teacher/class", module: "classes" },
    { name: "Syllabus", icon: <FaBook />, path: "/teacher/syllabus", module: "syllabus" },
    {
      name: "Assignment",
      icon: <GiSchoolBag />,
      module: "assignments",
      children: [
        { name: "My Assignments", path: "/teacher/assignment" },
        { name: "Assignment Result", path: "/teacher/assignment/result" },
      ],
    },
    {
      name: "Exams",
      icon: <GiOpenBook />,
      module: "exams",
      children: [{ name: "Marks Entry", path: "/teacher/marks-entry" }],
    },
    { name: "Timetable", icon: <FaClock />, path: "/teacher/timetable", module: "timetable" },
    { name: "Diary", icon: <FaBookOpen />, path: "/teacher/diary", module: "diary" },
    { name: "Homework", icon: <FaClipboardList />, path: "/teacher/homework", module: "homework" },
    { name: "Pages taught", icon: <FaBookOpen />, path: "/teacher/page-progress", module: "daily_learning" },
    { name: "Daily learning", icon: <FaClipboardList />, path: "/teacher/daily-learning", module: "daily_learning" },
    { name: "Group", icon: <FaUsers />, path: "/teacher/group", module: "groups" },
    { name: "Notices", icon: <FaBell />, path: "/teacher/notice", module: "notices" },
    { name: "Events", icon: <FaCalendar />, path: "/teacher/event", module: "events" },
    { name: "Calendar", icon: <FaCalendarAlt />, path: "/teacher/calendar" },
    { name: "Blog", icon: <FaBlog />, path: "/teacher/blogs", module: "blogs" },
    { name: "Gate Pass", icon: <FaPassport />, path: "/teacher/gatepass", module: "gatepass" },
    { name: "Messages", icon: <FaComments />, path: "/teacher/messages", module: "message" },
    { name: "Help / Support", icon: <FaHeadset />, path: "/teacher/help" },
  ];

  const teacherPerms = user?.permissions || [];
  const schoolMods = user?.subscribed_modules || [];
  const menu =
    teacherPerms.length === 0
      ? allMenu
      : allMenu.filter((item) => {
          if (!item.module) return true;
          if (!schoolMods.includes(item.module)) return false;
          return teacherPerms.includes(item.module);
        });

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
