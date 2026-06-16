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
import { useAuth } from "../context/AuthContext";

/* ─── Bottom nav items per role ─────────────────────────────── */
const getNavItems = (role, loginAs, openProfile) => {
  const profileItem = {
    label: "Profile",
    icon: <FaUserAlt />,
    onClick: openProfile,
  };

  switch (role) {
    case "teacher_admin":
      return [
        {
          label: "Dashboard",
          icon: <FaTachometerAlt />,
          path: "/teacher/dashboard",
        },
        { label: "Classes", icon: <HiAcademicCap />, path: "/teacher/class" },
        { label: "Tasks", icon: <GiSchoolBag />, path: "/teacher/assignment" },
        { label: "Chat", icon: <FaComments />, path: "/teacher/messages" },
        profileItem,
      ];

    case "school_admin":
      return [
        {
          label: "Dashboard",
          icon: <FaTachometerAlt />,
          path: "/school/dashboard",
        },
        {
          label: "Students",
          icon: <FaUserGraduate />,
          path: "/school/students",
        },
        {
          label: "Teachers",
          icon: <FaChalkboardTeacher />,
          path: "/school/teachers",
        },
        { label: "Chat", icon: <FaComments />, path: "/school/messages" },
        profileItem,
      ];

    case "staff_admin":
      return [
        {
          label: "Dashboard",
          icon: <FaTachometerAlt />,
          path: "/staff/dashboard",
        },
        {
          label: "Students",
          icon: <FaUserGraduate />,
          path: "/staff/students",
        },
        {
          label: "Attendance",
          icon: <FaClipboardCheck />,
          path: "/staff/attendance",
        },
        { label: "Chat", icon: <FaComments />, path: "/staff/messages" },
        profileItem,
      ];

    case "student_admin":
      if (loginAs === "parent") {
        return [
          {
            label: "Dashboard",
            icon: <FaTachometerAlt />,
            path: "/parent/dashboard",
          },
          { label: "Child", icon: <FaUserGraduate />, path: "/parent/student" },
          { label: "Fees", icon: <FaWallet />, path: "/parent/fees" },
          { label: "Chat", icon: <FaComments />, path: "/parent/messages" },
          profileItem,
        ];
      }
      // loginAs === "student"
      return [
        {
          label: "Dashboard",
          icon: <FaTachometerAlt />,
          path: "/student/dashboard",
        },
        { label: "Timetable", icon: <FaClock />, path: "/student/timetable" },
        { label: "Tasks", icon: <GiSchoolBag />, path: "/student/assignment" },
        { label: "Chat", icon: <FaComments />, path: "/student/messages" },
        profileItem,
      ];

    case "super_admin":
      return [
        {
          label: "Dashboard",
          icon: <FaTachometerAlt />,
          path: "/admin/dashboard",
        },
        { label: "Schools", icon: <FaSchool />, path: "/admin/schools" },
        {
          label: "Access",
          icon: <FaShieldAlt />,
          path: "/admin/access-control",
        },
        {
          label: "Analytics",
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { user } = useAuth();

  const navItems = getNavItems(user?.role, user?.loginAs, () =>
    setShowProfile(true),
  );

  return (
    <div className="h-screen flex flex-col">
      {/* TOPBAR */}
      <Topbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        {/* DESKTOP SIDEBAR */}
        <div className="hidden lg:block w-56 border-r">
          <Sidebar />
        </div>

        {/* MOBILE SIDEBAR */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            {/* overlay */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />

            {/* sidebar */}
            <div className="relative z-50 w-56 bg-white h-full">
              <Sidebar closeSidebar={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <div className="">
            <Outlet />
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <BottomNav items={navItems} className="lg:hidden" />

      {showProfile && <ProfileSheet onClose={() => setShowProfile(false)} />}
    </div>
  );
};

export default AdminLayout;