import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUserGraduate,
  FaUserAlt,
  FaWallet,
  FaHome,
  FaBusAlt,
  FaClock,
  FaBookDead,
  FaBookOpen,
  FaClipboardList,
  FaBell,
  FaCalendar,
  FaCalendarAlt,
  FaIdCard,
  FaHotel,
} from "react-icons/fa";
import { FaBookJournalWhills, FaUserGroup } from "react-icons/fa6";
import { FiUsers } from "react-icons/fi";
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
import { COLOR_MAP as TEACHER_COLORS } from "./TeacherMenu";
import { clearSessionKeepPrefs } from "../utils/clearSessionKeepPrefs";
import { applyTheme, getTheme } from "../utils/theme";

const COLOR_MAP = {
  ...TEACHER_COLORS,
  Fees: { bg: "#FFFBEB", icon: "#D97706", dot: "#FDE68A" },
  "My ID Card": { bg: "#ECFDF5", icon: "#059669", dot: "#A7F3D0" },
  "House Allocation": { bg: "#F0FDF4", icon: "#22C55E", dot: "#BBF7D0" },
  Transport: { bg: "#F0FDFA", icon: "#0D9488", dot: "#99F6E4" },
  Assignments: { bg: "#F8FAFC", icon: "#64748B", dot: "#CBD5E1" },
  "Lead Management": { bg: "#EEF2FF", icon: "#4F46E5", dot: "#C7D2FE" },
  Groups: { bg: "#F0FDF4", icon: "#22C55E", dot: "#BBF7D0" },
  Staff: { bg: "#EFF6FF", icon: "#3B82F6", dot: "#BFDBFE" },
};

export default function StaffMenu() {
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

  const menu = useMemo(() => {
    const all = [
      { name: "Dashboard", icon: <FaTachometerAlt />, path: "/staff/dashboard" },
      { name: "My ID Card", icon: <FaIdCard />, path: "/staff/id-card" },
      { name: "Notifications", icon: <FaBell />, path: "/staff/notification" },
      {
        name: "Students",
        icon: <FaUserGraduate />,
        path: "/staff/students",
        module: "students",
      },
      {
        name: "Attendance",
        icon: <FaUserAlt />,
        path: "/staff/attendance",
        module: "attendance",
      },
      {
        name: "Fees",
        icon: <FaWallet />,
        module: "fees",
        children: [
          { name: "Fee Collection", path: "/staff/fees" },
          { name: "Fee History", path: "/staff/fee-history" },
          { name: "Financial Report", path: "/staff/financial-report" },
          { name: "Defaulters", path: "/staff/defaulters" },
        ],
      },
      {
        name: "Library",
        icon: <FaBookJournalWhills />,
        path: "/staff/library",
        module: "library",
      },
      {
        name: "House Allocation",
        icon: <FaHome />,
        path: "/staff/house",
        module: "house",
      },
      {
        name: "Transport",
        icon: <FaBusAlt />,
        path: "/staff/transport",
        module: "transport",
      },
      {
        name: "Hostel Management",
        icon: <FaHotel />,
        path: "/staff/hostel",
        module: "hostel",
      },
      {
        name: "Timetable",
        icon: <FaClock />,
        path: "/staff/timetable",
        module: "timetable",
      },
      {
        name: "Syllabus",
        icon: <FaBookDead />,
        path: "/staff/syllabus",
        module: "syllabus",
      },
      {
        name: "Diary",
        icon: <FaBookOpen />,
        path: "/staff/diary",
        module: "diary",
      },
      {
        name: "Homework",
        icon: <FaClipboardList />,
        path: "/staff/homework",
        module: "homework",
      },
      {
        name: "Exams",
        icon: <GiOpenBook />,
        module: "exams",
        children: [
          { name: "Schedule Exams", path: "/staff/exams" },
          { name: "Marks Entry", path: "/staff/exam-marks" },
          { name: "Report Card", path: "/staff/report-card" },
        ],
      },
      {
        name: "Assignments",
        icon: <GiSchoolBag />,
        path: "/staff/assignments",
        module: "assignments",
      },
      {
        name: "Lead Management",
        icon: <FaClipboardList />,
        path: "/staff/leads",
      },
      {
        name: "Groups",
        icon: <FaUserGroup />,
        path: "/staff/group",
        module: "groups",
      },
      {
        name: "Staff",
        icon: <FiUsers />,
        module: "staff",
        children: [
          { name: "Staff Management", path: "/staff/staff" },
          { name: "Staff Roles", path: "/staff/staff-roles" },
        ],
      },
      { name: "Notices", icon: <FaBell />, path: "/staff/notice" },
      { name: "Events", icon: <FaCalendar />, path: "/staff/event" },
      { name: "Calendar", icon: <FaCalendarAlt />, path: "/staff/calendar" },
    ];

    return all.filter((item) => {
      if (!item.module) return true;
      if (item.module === "staff") return true;
      return user?.permissions?.includes(item.module);
    });
  }, [user?.permissions]);

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
