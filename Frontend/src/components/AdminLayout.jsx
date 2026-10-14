import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import axios from "axios";
import {
  FaThLarge,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaComments,
  FaUserAlt,
  FaClipboardCheck,
  FaWallet,
  FaClock,
  FaSchool,
  FaShieldAlt,
  FaChartLine,
} from "react-icons/fa";
import { GiSchoolBag } from "react-icons/gi";
import { HiAcademicCap } from "react-icons/hi2";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import BottomNav from "./BottomNav";
import ProfileSheet from "./ProfileSheet";
import DomI18n from "./DomI18n";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { API } from "../config/api";

/* ─── Role → menu hub path ──────────────────────────────────── */
export const getMenuPath = (role, loginAs) => {
  switch (role) {
    case "super_admin":
      return "/menu";
    case "school_admin":
      return "/school/menu";
    case "teacher_admin":
      return "/teacher/menu";
    case "staff_admin":
      return "/staff/menu";
    case "student_admin":
      return loginAs === "parent" ? "/parent/menu" : "/student/menu";
    default:
      return "/login";
  }
};

/* ─── Bottom nav items per role ─────────────────────────────── */
const getNavItems = (role, loginAs, openProfile, tn) => {
  const profileItem = {
    label: tn("Profile"),
    icon: <FaUserAlt />,
    onClick: openProfile,
  };
  const menuItem = (path) => ({
    label: tn("Menu"),
    icon: <FaThLarge />,
    path,
  });

  switch (role) {
    case "teacher_admin":
      return [
        menuItem("/teacher/menu"),
        { label: tn("Classes"), icon: <HiAcademicCap />, path: "/teacher/class" },
        { label: tn("Tasks"), icon: <GiSchoolBag />, path: "/teacher/assignment" },
        { label: tn("Chat"), icon: <FaComments />, path: "/teacher/messages" },
        profileItem,
      ];

    case "school_admin":
      return [
        menuItem("/school/menu"),
        {
          label: tn("Students"),
          icon: <FaUserGraduate />,
          path: "/school/students",
        },
        {
          label: tn("Teachers"),
          icon: <FaChalkboardTeacher />,
          path: "/school/teachers",
        },
        { label: tn("Chat"), icon: <FaComments />, path: "/school/messages" },
        profileItem,
      ];

    case "staff_admin":
      return [
        menuItem("/staff/menu"),
        {
          label: tn("Students"),
          icon: <FaUserGraduate />,
          path: "/staff/students",
        },
        {
          label: tn("Attendance"),
          icon: <FaClipboardCheck />,
          path: "/staff/attendance",
        },
        { label: tn("Chat"), icon: <FaComments />, path: "/staff/messages" },
        profileItem,
      ];

    case "student_admin":
      if (loginAs === "parent") {
        return [
          menuItem("/parent/menu"),
          { label: tn("Child"), icon: <FaUserGraduate />, path: "/parent/student" },
          { label: tn("Fees"), icon: <FaWallet />, path: "/parent/fees" },
          { label: tn("Chat"), icon: <FaComments />, path: "/parent/messages" },
          profileItem,
        ];
      }
      return [
        menuItem("/student/menu"),
        { label: tn("Timetable"), icon: <FaClock />, path: "/student/timetable" },
        { label: tn("Tasks"), icon: <GiSchoolBag />, path: "/student/assignment" },
        { label: tn("Chat"), icon: <FaComments />, path: "/student/messages" },
        profileItem,
      ];

    case "super_admin":
      return [
        menuItem("/menu"),
        { label: tn("Schools"), icon: <FaSchool />, path: "/schools" },
        {
          label: tn("Access"),
          icon: <FaShieldAlt />,
          path: "/access-control",
        },
        {
          label: tn("Analytics"),
          icon: <FaChartLine />,
          path: "/platform-analytics",
        },
        profileItem,
      ];

    default:
      return [profileItem];
  }
};

const AdminLayout = () => {
  const [showProfile, setShowProfile] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { user } = useAuth();
  const { tn } = useLanguage();

  const menuPath = getMenuPath(user?.role, user?.loginAs);
  const navItems = getNavItems(user?.role, user?.loginAs, () =>
    setShowProfile(true), tn
  ).map((item) =>
    item.path &&
    item.path.endsWith("/messages") &&
    unreadMessages > 0
      ? { ...item, badge: unreadMessages }
      : item,
  );

  // Poll the messages inbox so the Chat nav item shows an unread badge
  // (bell notifications are handled separately by the Topbar).
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (document.hidden) return;
      try {
        const res = await axios.get(`${API}/message-signal/threads`, {
          withCredentials: true,
        });
        const total = (res.data?.threads || []).reduce(
          (sum, t) => sum + (Number(t?.unreadCount) || 0),
          0,
        );
        if (!cancelled) setUnreadMessages(total);
      } catch {
        // best-effort badge — ignore network/permission errors
      }
    };

    load();
    const id = setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  return (
    <div className="app-shell h-screen bg-[rgb(var(--bg))] overflow-hidden flex flex-col">
      <Topbar menuPath={menuPath} />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Desktop Sidebar only — mobile uses Menu hub + bottom nav */}
        <aside className="hidden lg:flex w-70 shrink-0">
          <Sidebar unreadMessages={unreadMessages} />
        </aside>

        <main className="app-main flex-1 overflow-y-auto overscroll-y-contain">
          <div className="app-main-pad px-3 sm:px-4 md:px-6 lg:px-8 py-3 lg:py-6 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:pb-8">
            <DomI18n className="max-w-400 mx-auto">
              <Outlet />
            </DomI18n>
          </div>
        </main>
      </div>

      <BottomNav items={navItems} className="lg:hidden" />

      {showProfile && <ProfileSheet onClose={() => setShowProfile(false)} />}
    </div>
  );
};

export default AdminLayout;
