import {
  FaTachometerAlt,
  FaUserGraduate,
  FaChevronDown,
  FaChevronRight,
  FaSignOutAlt,
  FaClock,
  FaWallet,
  FaTimes,
  FaUserShield,
  FaSchool,
  FaCalendarAlt,
  FaBell,
  FaBusAlt,
  FaBookDead,
  FaCalendar,
  FaBookOpen,
  FaUserAlt,
  FaUsers,
} from "react-icons/fa";

import {
  FaBookJournalWhills,
  FaSchoolFlag,
  FaUserGroup,
} from "react-icons/fa6";
import { FiUsers } from "react-icons/fi";

import { GiOpenBook, GiSchoolBag, GiTeacher } from "react-icons/gi";
import { HiAcademicCap } from "react-icons/hi2";

import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { toast } from "react-toastify";

const API = import.meta.env.VITE_API_URL;

const Sidebar = ({ closeSidebar }) => {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);

  // const role = localStorage.getItem("userRole"); // super_admin / school_admin / teacher_admin / student_admin

  const role = user?.role;
  const logout = async () => {
    try {
      const res = await axios.post(
        `${API}/auth/logout`,
        {},
        {
          withCredentials: true,
        },
      );
      toast.info("You have been logged out successfully.");
    } catch (err) {
      console.error("Backend logout failed:", err);
      toast.error("Logout failed. Please try again.");
    }
    setUser(null); // Clear user from context
    localStorage.clear();
    sessionStorage.clear();
    navigate("/admin/login", { replace: true });
  };

  const isMobile = window.innerWidth <= 768;

  /* ---------------- SUPER ADMIN MENU ---------------- */

  const superAdminMenu = [
    ...(isMobile
      ? [{ name: "Menu", icon: <FaTachometerAlt />, path: "/admin/menu" }]
      : []),
    { name: "Dashboard", icon: <FaTachometerAlt />, path: "/admin/dashboard" },

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
  ];

  /* ---------------- SCHOOL ADMIN MENU ---------------- */

  const schoolAdminMenu = [
    ...(isMobile
      ? [{ name: "Menu", icon: <FaTachometerAlt />, path: "/school/menu" }]
      : []),
    { name: "Dashboard", icon: <FaTachometerAlt />, path: "/school/dashboard" },
    {
      name: "Notifications",
      icon: <FaTachometerAlt />,
      path: "/school/notification",
    },

    {
      name: "Students",
      icon: <FaUserGraduate />,
      children: [
        { name: "All Students", path: "/school/students" },
        { name: "Add Student", path: "/school/student-manage" },
      ],
    },

    {
      name: "Teachers",
      icon: <GiTeacher />,
      children: [
        { name: "All Teachers", path: "/school/teachers" },
        { name: "Add Teacher", path: "/school/teacher-manage" },
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

    { name: "Attendance", icon: <FaUserAlt />, path: "/school/attendance" },
    {
      name: "Exam Management",
      icon: <GiOpenBook />,
      children: [{ name: "Exam Structure", path: "/school/exam-structure" }],
    },
    { name: "Syllabus", icon: <FaBookDead />, path: "/school/syllabus" },
    { name: "Timetable", icon: <FaClock />, path: "/school/timetable" },
    {
      name: "Fee Management",
      icon: <FaWallet />,
      children: [
        { name: "Fee Structure", path: "/school/fee-structure" },
        { name: "Fee Collection", path: "/school/fee-collection" },
        { name: "Fee History", path: "/school/fee-history" },
        { name: "Defaulters", path: "/school/defaulters" },
      ],
    },
    { name: "Group", icon: <FaUserGroup />, path: "/school/group" },
    { name: "Diary", icon: <FaBookOpen />, path: "/school/diary" },
    { name: "Events", icon: <FaCalendar />, path: "/school/event" },
    { name: "Notices", icon: <FaBell />, path: "/school/notice" },
    { name: "Calendar", icon: <FaCalendarAlt />, path: "/school/calendar" },
    // { name: "Reports", icon: <FiBarChart2 />, path: "/school/reports" },
    {
      name: "Transport Management",
      icon: <FaBusAlt />,
      children: [
        { name: "Transport", path: "/school/transport" },
        { name: "Route Manage", path: "/school/transport-route" },
        { name: "Bus Manage", path: "/school/transport-bus" },
        { name: "Driver Manage", path: "/school/transport-driver" },
      ],
    },
    { name: "Library", icon: <FaBookJournalWhills />, path: "/school/library" },
    { name: "Blogs", icon: <FaBookJournalWhills />, path: "/school/blogs" },
  ];

  /* ---------------- TEACHER ADMIN MENU ---------------- */

  const teacherAdminMenu = [
    ...(isMobile
      ? [{ name: "Menu", icon: <FaTachometerAlt />, path: "/teacher/menu" }]
      : []),
    {
      name: "Dashboard",
      icon: <FaTachometerAlt />,
      path: "/teacher/dashboard",
    },
    {
      name: "Notifications",
      icon: <FaTachometerAlt />,
      path: "/teacher/notification",
    },

    {
      name: "Students",
      icon: <FaUserGraduate />,
      path: "/teacher/students",
    },

    {
      name: "Attendance",
      icon: <FaUserAlt />,
      children: [
        { name: "Mark Attendance", path: "/teacher/attendance/mark" },
        { name: "Attendance Report", path: "/teacher/attendance/report" },
      ],
    },

    {
      name: "My Classes",
      icon: <HiAcademicCap />,
      path: "/teacher/class",
    },
    { name: "Syllabus", icon: <FaBookDead />, path: "/teacher/syllabus" },
    {
      name: "Assignment",
      icon: <GiSchoolBag />,
      children: [
        { name: "My Assignments", path: "/teacher/assignment" },
        { name: "Assignment   Result", path: "/teacher/assignment/result" },
      ],
    },

    {
      name: "Exams",
      icon: <GiOpenBook />,
      children: [
        { name: "Marks Entry", path: "/teacher/exam" },
        { name: "Exam Report", path: "/teacher/exam-report" },
      ],
    },

    { name: "Timetable", icon: <FaClock />, path: "/teacher/timetable" },

    { name: "Diary", icon: <FaBookOpen />, path: "/teacher/diary" },

    { name: "Group", icon: <FaUserGroup />, path: "/teacher/group" },

    { name: "Notices", icon: <FaBell />, path: "/teacher/notice" },

    { name: "Events", icon: <FaCalendar />, path: "/teacher/event" },

    { name: "Calendar", icon: <FaCalendarAlt />, path: "/teacher/calendar" },
    // { name: "Blogs", icon: <FaBookJournalWhills />, path: "/teacher/blogs" },
  ];

  /* ---------------- STUDENT / PARENT ADMIN MENU ---------------- */

  const studentAdminMenu = [
    ...(isMobile
      ? [{ name: "Menu", icon: <FaTachometerAlt />, path: "/parent/menu" }]
      : []),
    { name: "Dashboard", icon: <FaTachometerAlt />, path: "/parent/dashboard" },
    {
      name: "Notifications",
      icon: <FaTachometerAlt />,
      path: "/parent/notification",
    },
    { name: "My Child", icon: <FaUserGraduate />, path: "/parent/student" },
    { name: "Fee Details", icon: <FaWallet />, path: "/parent/fees" },
    { name: "Attendance", icon: <FaUsers />, path: "/parent/attendance" },
    { name: "Diary", icon: <FaBookOpen />, path: "/parent/diary" },
    {
      name: "Assignment",
      icon: <GiSchoolBag />,
      children: [
        { name: "My Assignments", path: "/parent/assignment" },
        { name: "Assignment Result", path: "/parent/assignment/result" },
      ],
    },
    {
      name: "Exam Results",
      icon: <GiSchoolBag />,
      path: "/parent/exam-result",
    },
    { name: "Calendar", icon: <FaCalendarAlt />, path: "/parent/calendar" },
    { name: "Transport", icon: <FaBusAlt />, path: "/parent/transport" },
    { name: "Timetable", icon: <FaClock />, path: "/parent/timetable" },
    { name: "Notices", icon: <FaBell />, path: "/parent/notice" },
    { name: "Events", icon: <FaCalendar />, path: "/parent/event" },
    { name: "Group", icon: <FaUserGroup />, path: "/parent/group" },
    { name: "Library", icon: <FaBookJournalWhills />, path: "/parent/library" },
    // { name: "Blogs", icon: <FaBookJournalWhills />, path: "/parent/blogs" },
  ];

  let menu = [];

  if (role === "super_admin") {
    menu = superAdminMenu;
  } else if (role === "school_admin") {
    menu = schoolAdminMenu;
  } else if (role === "teacher_admin") {
    menu = teacherAdminMenu;
  } else if (role === "student_admin") {
    menu = studentAdminMenu;
  }

  const toggleMenu = (name) => {
    setOpenMenu(openMenu === name ? null : name);
  };

  return (
    <aside className="h-full w-56 bg-[rgb(var(--sidebar))] border-r border-[rgb(var(--border))] flex flex-col">
      {/* MOBILE HEADER */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))]">
        <h2 className="font-semibold text-[rgb(var(--sidebar-text))]">Menu</h2>
        <button
          onClick={closeSidebar}
          className="text-[rgb(var(--sidebar-text))] hover:text-red-400 transition"
        >
          <FaTimes />
        </button>
      </div>

      {/* MENU */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {menu.map((item, index) => {
          const isParentActive =
            item.children &&
            item.children.some((c) => location.pathname === c.path);

          if (item.children) {
            const isOpen = openMenu === item.name;

            return (
              <div key={index}>
                <div
                  onClick={() => toggleMenu(item.name)}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition text-sm border-l-4
              ${
                isParentActive
                  ? "bg-[rgba(var(--primary),0.15)] text-[rgb(var(--sidebar-active))] border-[rgb(var(--primary))]"
                  : "text-[rgb(var(--sidebar-text))] border-transparent hover:bg-[rgba(var(--primary),0.08)] hover:text-[rgb(var(--sidebar-active))]"
              }`}
                >
                  <div className="flex items-center gap-3">
                    <span>{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {isOpen ? (
                    <FaChevronDown size={10} />
                  ) : (
                    <FaChevronRight size={10} />
                  )}
                </div>

                {isOpen && (
                  <div className="bg-black/10">
                    {item.children.map((child, i) => {
                      const isActive = location.pathname === child.path;
                      return (
                        <div
                          key={i}
                          onClick={() => {
                            navigate(child.path);
                            closeSidebar && closeSidebar();
                          }}
                          className={`pl-11 pr-4 py-2 text-sm cursor-pointer transition
                      ${
                        isActive
                          ? "text-[rgb(var(--sidebar-active))] font-semibold"
                          : "text-[rgb(var(--sidebar-text))] hover:text-[rgb(var(--sidebar-active))]"
                      }`}
                        >
                          {child.name}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = location.pathname === item.path;

          return (
            <div
              key={index}
              onClick={() => {
                navigate(item.path);
                closeSidebar && closeSidebar();
              }}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm border-l-4 transition
          ${
            isActive
              ? "bg-[rgba(var(--primary),0.15)] text-[rgb(var(--sidebar-active))] border-[rgb(var(--primary))]"
              : "text-[rgb(var(--sidebar-text))] border-transparent hover:bg-[rgba(var(--primary),0.08)] hover:text-[rgb(var(--sidebar-active))]"
          }`}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </div>
          );
        })}
      </div>

      {/* LOGOUT */}
      <div className="p-3 border-t border-[rgb(var(--border))]">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-[rgb(var(--sidebar-text))] hover:bg-red-500/10 hover:text-red-400 transition text-sm"
        >
          <FaSignOutAlt />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
