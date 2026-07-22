import { useState } from "react";
import { Outlet } from "react-router-dom";
import {
  FaTachometerAlt,
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

/* ─── Role → menu hub path ──────────────────────────────────── */
export const getMenuPath = (role, loginAs) => {
  switch (role) {
    case "super_admin":
      return "/admin/menu";
    case "school_admin":
      return "/school/menu";
    case "teacher_admin":
      return "/teacher/menu";
    case "staff_admin":
      return "/staff/menu";
    case "student_admin":
      return loginAs === "parent" ? "/parent/menu" : "/student/menu";
    default:
      return "/";
  }
};

/* ─── Bottom nav items per role ─────────────────────────────── */
const getNavItems = (role, loginAs, openProfile, tn) => {
  const profileItem = {
    label: tn("Profile"),
    icon: <FaUserAlt />,
    onClick: openProfile,
  };

  switch (role) {
    case "teacher_admin":
      return [
        {
          label: tn("Dashboard"),
          icon: <FaTachometerAlt />,
          path: "/teacher/dashboard",
        },
        { label: tn("Classes"), icon: <HiAcademicCap />, path: "/teacher/class" },
        { label: tn("Tasks"), icon: <GiSchoolBag />, path: "/teacher/assignment" },
        { label: tn("Chat"), icon: <FaComments />, path: "/teacher/messages" },
        profileItem,
      ];

    case "school_admin":
      return [
        {
          label: tn("Dashboard"),
          icon: <FaTachometerAlt />,
          path: "/school/dashboard",
        },
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
        {
          label: tn("Dashboard"),
          icon: <FaTachometerAlt />,
          path: "/staff/dashboard",
        },
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
          {
            label: tn("Dashboard"),
            icon: <FaTachometerAlt />,
            path: "/parent/dashboard",
          },
          { label: tn("Child"), icon: <FaUserGraduate />, path: "/parent/student" },
          { label: tn("Fees"), icon: <FaWallet />, path: "/parent/fees" },
          { label: tn("Chat"), icon: <FaComments />, path: "/parent/messages" },
          profileItem,
        ];
      }
      return [
        {
          label: tn("Dashboard"),
          icon: <FaTachometerAlt />,
          path: "/student/dashboard",
        },
        { label: tn("Timetable"), icon: <FaClock />, path: "/student/timetable" },
        { label: tn("Tasks"), icon: <GiSchoolBag />, path: "/student/assignment" },
        { label: tn("Chat"), icon: <FaComments />, path: "/student/messages" },
        profileItem,
      ];

    case "super_admin":
      return [
        {
          label: tn("Dashboard"),
          icon: <FaTachometerAlt />,
          path: "/admin/dashboard",
        },
        { label: tn("Schools"), icon: <FaSchool />, path: "/admin/schools" },
        {
          label: tn("Access"),
          icon: <FaShieldAlt />,
          path: "/admin/access-control",
        },
        {
          label: tn("Analytics"),
          icon: <FaChartLine />,
          path: "/admin/platform-analytics",
        },
        profileItem,
      ];

    default:
      return [profileItem];
  }
};

const AdminLayout = () => {
  const [showProfile, setShowProfile] = useState(false);
  const { user } = useAuth();
  const { tn } = useLanguage();

  const menuPath = getMenuPath(user?.role, user?.loginAs);
  const navItems = getNavItems(user?.role, user?.loginAs, () =>
    setShowProfile(true), tn
  );

  return (
    <div className="app-shell h-screen bg-[rgb(var(--bg))] overflow-hidden flex flex-col">
      <Topbar menuPath={menuPath} />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Desktop Sidebar only — mobile uses Menu hub + bottom nav */}
        <aside className="hidden lg:flex w-70 shrink-0">
          <Sidebar />
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
