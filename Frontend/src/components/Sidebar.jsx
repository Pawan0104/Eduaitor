import {
  FaTachometerAlt,
  FaUserGraduate,
  FaChevronDown,
  FaChevronRight,
  FaSignOutAlt,
  FaClock,
  FaWallet,
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
  FaLock,
  FaIdCard,
  FaClipboardList,
  FaHotel,
  FaHome,
  FaStore,
  FaHeadset,
} from "react-icons/fa";
import { FiUsers } from "react-icons/fi";
import {
  FaBookJournalWhills,
  FaSchoolFlag,
  FaUserGroup,
} from "react-icons/fa6";

import { GiOpenBook, GiSchoolBag, GiTeacher } from "react-icons/gi";
import { HiAcademicCap } from "react-icons/hi2";

import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import axios from "axios";
import { toast } from "react-toastify";
import { clearSessionKeepPrefs as preservePrefsAndClear } from "../utils/clearSessionKeepPrefs";

const API = import.meta.env.VITE_API_URL;

// ── ICON BADGE — small tinted square behind every nav icon ──
// active = filled solid primary (mirrors the bottom-nav active state in the mockup)
// locked = muted/greyed out
// default = soft tinted primary
const IconBadge = ({ icon, variant = "default" }) => {
  const styles = {
    active:
      "bg-[rgb(var(--sidebar-active))] text-[rgb(var(--sidebar))] shadow-sm",
    locked: "bg-[rgba(var(--text-muted),0.15)] text-[rgb(var(--text-muted))]",
    default: "bg-[rgba(var(--sidebar-active),0.14)] text-[rgb(var(--sidebar-active))]",
  };
  return (
    <span
      className={`flex items-center justify-center w-9 h-9 rounded-xl text-[15px] shrink-0 transition-colors duration-200 ${styles[variant]}`}
    >
      {icon}
    </span>
  );
};

// ── UPGRADE POPUP — shown when clicking a disabled module ──
const UpgradePopup = ({ moduleName, onClose }) => {
  const { t, tn } = useLanguage();
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-999 p-4">
      <div className="card w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaLock className="text-orange-500" size={20} />
        </div>
        <h3 className="text-base font-semibold mb-1 text-[rgb(var(--text))]">
          {t("upgrade.title")}
        </h3>
        <p className="text-sm mb-5 text-[rgb(var(--text-muted))]">
          <span className="font-medium text-[rgb(var(--text))]">
            {tn(moduleName)}
          </span>{" "}
          {t("upgrade.message")}
        </p>
        <button
          onClick={onClose}
          className="w-full py-2 bg-[rgb(var(--primary))] text-white rounded-lg
            text-sm font-medium transition hover:opacity-90"
        >
          {t("upgrade.ok")}
        </button>
      </div>
    </div>
  );
};

const Sidebar = ({ closeSidebar }) => {
  const { user, setUser } = useAuth();
  const { t, tn } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);

  const [upgradePopup, setUpgradePopup] = useState(null); // stores { moduleName }

  const role = user?.role;

  const subscribedModules = user?.subscribed_modules || [];
  const needsModuleCheck = role !== "super_admin";

  const hasModule = (moduleKey) => {
    if (!needsModuleCheck) return true;
    if (!moduleKey) return true;
    return subscribedModules.includes(moduleKey);
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      toast.info(t("topbar.logoutSuccess"));
    } catch (err) {
      console.error("Backend logout failed:", err);
      toast.error(t("topbar.logoutFailed"));
    }
    setUser(null);
    preservePrefsAndClear();
    navigate("/admin/login", { replace: true });
  };

  /* ── SUPER ADMIN MENU ── */
  const superAdminMenu = [
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

  /* ── SCHOOL ADMIN MENU ── */
  const schoolAdminMenu = [
    { name: "Dashboard", icon: <FaTachometerAlt />, path: "/school/dashboard" },
    { name: "Notifications", icon: <FaBell />, path: "/school/notification" },
    {
      name: "Students",
      icon: <FaUserGraduate />,
      module: "students",
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
      module: "teachers",
      children: [
        { name: "All Teachers", path: "/school/teachers" },
      ],
    },
    {
      name: "Classes",
      icon: <HiAcademicCap />,
      module: "classes",
      children: [
        { name: "Class", path: "/school/class" },
        { name: "Section", path: "/school/section" },
        { name: "Subjects", path: "/school/subject" },
      ],
    },
    {
      name: "Attendance",
      icon: <FaUserAlt />,
      path: "/school/attendance",
      module: "attendance",
    },
    {
      name: "Exam Management",
      icon: <GiOpenBook />,
      module: "exams",
      children: [
        { name: "Exam Structure", path: "/school/exam-structure" },
        { name: "Marks Entry", path: "/school/exam-marks-entry" },
        { name: "Exam Marks", path: "/school/exam-marks" },
        { name: "Report Card", path: "/school/report-card" },
      ],
    },
    {
      name: "Syllabus",
      icon: <FaBookDead />,
      path: "/school/syllabus",
      module: "syllabus",
    },
    {
      name: "Timetable",
      icon: <FaClock />,
      path: "/school/timetable",
      module: "timetable",
    },
    {
      name: "Fee Management",
      icon: <FaWallet />,
      module: "fees",
      children: [
        { name: "Fee Structure", path: "/school/fee-structure" },
        { name: "Fee Collection", path: "/school/fee-collection" },
        { name: "Fee History", path: "/school/fee-history" },
        { name: "Financial Report", path: "/school/financial-report" },
        { name: "Defaulters", path: "/school/defaulters" },
      ],
    },
    {
      name: "Group",
      icon: <FaUserGroup />,
      path: "/school/group",
      module: "groups",
    },
    {
      name: "Diary",
      icon: <FaBookOpen />,
      path: "/school/diary",
      module: "diary",
    },
    {
      name: "Homework",
      icon: <FaClipboardList />,
      path: "/school/homework",
      module: "homework",
    },
    { name: "Events", icon: <FaCalendar />, path: "/school/event" },
    { name: "Notices", icon: <FaBell />, path: "/school/notice" },
    { name: "Calendar", icon: <FaCalendarAlt />, path: "/school/calendar" },
    {
      name: "Transport Management",
      icon: <FaBusAlt />,
      module: "transport",
      children: [
        { name: "Transport", path: "/school/transport" },
        { name: "Route Manage", path: "/school/transport-route" },
        { name: "Bus Manage", path: "/school/transport-bus" },
        { name: "Driver Manage", path: "/school/transport-driver" },
        { name: "GPS Tracking", path: "/school/transport-gps", module: "gpsTracking" },
      ],
    },
    {
      name: "Library",
      icon: <FaBookJournalWhills />,
      path: "/school/library",
      module: "library",
    },
    {
      name: "Hostel Management",
      icon: <FaHotel />,
      path: "/school/hostel",
      module: "hostel",
    },
    {
      name: "School Commerce Suite",
      icon: <FaStore />,
      path: "/school/commerce",
      module: "commerce",
    },
    {
      name: "Blogs",
      icon: <FaBookJournalWhills />,
      path: "/school/blogs",
      module: "blogs",
    },
    {
      name: "Staff",
      icon: <FaUsers />,
      path: "/school/staff",
      module: "staff",
      children: [
        { name: "Staff Management", path: "/school/staff" },
        { name: "Staff Roles", path: "/school/staff-roles" },
        { name: "Staff Attendance", path: "/school/staff-attendance" },
      ],
    },
    {
      name: "Gate Pass",
      icon: <FaIdCard />,
      path: "/school/gatepass",
    },
    {
      name: "Messages",
      icon: <FaBell />,
      path: "/school/messages",
    },
    {
      name: "Help / Support",
      icon: <FaHeadset />,
      path: "/school/help",
    },
  ];

  /* ── TEACHER ADMIN MENU ── */
  const teacherAdminMenu = [
    {
      name: "Dashboard",
      icon: <FaTachometerAlt />,
      path: "/teacher/dashboard",
    },
    { name: "Notifications", icon: <FaBell />, path: "/teacher/notification" },
    {
      name: "Students",
      icon: <FaUserGraduate />,
      path: "/teacher/students",
      module: "students",
    },
    {
      name: "Attendance",
      icon: <FaUserAlt />,
      module: "attendance",
      children: [
        { name: "Mark Attendance", path: "/teacher/attendance/mark" },
        { name: "Attendance Report", path: "/teacher/attendance/report" },
      ],
    },
    {
      name: "My Classes",
      icon: <HiAcademicCap />,
      path: "/teacher/class",
      module: "classes",
    },
    {
      name: "Syllabus",
      icon: <FaBookDead />,
      path: "/teacher/syllabus",
      module: "syllabus",
    },
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
      children: [
        { name: "Marks Entry", path: "/teacher/exam" },
        { name: "Report Card", path: "/teacher/report-card" },
      ],
    },
    {
      name: "Timetable",
      icon: <FaClock />,
      path: "/teacher/timetable",
      module: "timetable",
    },
    {
      name: "Diary",
      icon: <FaBookOpen />,
      path: "/teacher/diary",
      module: "diary",
    },
    {
      name: "Homework",
      icon: <FaClipboardList />,
      path: "/teacher/homework",
      module: "homework",
    },
    {
      name: "Pages taught",
      icon: <FaBookOpen />,
      path: "/teacher/page-progress",
      module: "daily_learning",
    },
    {
      name: "Daily learning",
      icon: <FaClipboardList />,
      path: "/teacher/daily-learning",
      module: "daily_learning",
    },
    {
      name: "Group",
      icon: <FaUserGroup />,
      path: "/teacher/group",
      module: "groups",
    },
    {
      name: "Notices",
      icon: <FaBell />,
      path: "/teacher/notice",
      module: "notices",
    },
    {
      name: "Events",
      icon: <FaCalendar />,
      path: "/teacher/event",
      module: "events",
    },
    { name: "Calendar", icon: <FaCalendarAlt />, path: "/teacher/calendar" },
    {
      name: "Blogs",
      icon: <FaBookJournalWhills />,
      path: "/teacher/blogs",
      module: "blogs",
    },
    {
      name: "Gate Pass",
      icon: <FaIdCard />,
      path: "/teacher/gatepass",
      module: "gatepass",
    },
    {
      name: "Messages",
      icon: <FaBell />,
      path: "/teacher/messages",
      module: "message",
    },
    {
      name: "Help / Support",
      icon: <FaHeadset />,
      path: "/teacher/help",
    },
  ];

  /* ── PARENT MENU ── */
  const parentMenu = [
    { name: "Dashboard", icon: <FaTachometerAlt />, path: "/parent/dashboard" },
    { name: "Notifications", icon: <FaBell />, path: "/parent/notification" },
    {
      name: "My Child",
      icon: <FaUserGraduate />,
      path: "/parent/student",
      module: "students",
    },
    {
      name: "Pay Fee",
      icon: <FaWallet />,
      path: "/parent/fees",
    },
    {
      name: "School Store",
      icon: <FaStore />,
      path: "/parent/store",
      module: "commerce",
    },
    {
      name: "Transport & GPS",
      icon: <FaBusAlt />,
      path: "/parent/transport",
      module: "transport",
    },
    {
      name: "Exam Results",
      icon: <GiOpenBook />,
      path: "/parent/exam-result",
      module: "exams",
    },
    {
      name: "Report Card",
      icon: <GiOpenBook />,
      path: "/parent/report-card",
      module: "exams",
    },
    {
      name: "Student ID Card",
      icon: <FaIdCard />,
      path: "/parent/id-card",
    },
    { name: "Notices", icon: <FaBell />, path: "/parent/notice" },
    { name: "Events", icon: <FaCalendar />, path: "/parent/event" },
    { name: "Calendar", icon: <FaCalendarAlt />, path: "/parent/calendar" },
    {
      name: "Blogs",
      icon: <FaBookJournalWhills />,
      path: "/parent/blogs",
      module: "blogs",
    },
    {
      name: "Gate Pass",
      icon: <FaIdCard />,
      path: "/parent/gatepass",
      module: "gatepass",
    },
    {
      name: "Homework",
      icon: <FaClipboardList />,
      path: "/parent/homework",
      module: "homework",
    },
    {
      name: "Learned today",
      icon: <FaBookOpen />,
      path: "/parent/learning-today",
      module: "daily_learning",
    },
    {
      name: "Daily learning",
      icon: <FaClipboardList />,
      path: "/parent/daily-learning",
      module: "daily_learning",
    },
    {
      name: "Syllabus Books",
      icon: <FaBookDead />,
      path: "/parent/syllabus-books",
    },
    {
      name: "Messages",
      icon: <FaBell />,
      path: "/parent/messages",
    },
    {
      name: "Help / Support",
      icon: <FaHeadset />,
      path: "/parent/help",
    },
  ];

  /* ── STUDENT MENU ── */
  const studentMenu = [
    {
      name: "Dashboard",
      icon: <FaTachometerAlt />,
      path: "/student/dashboard",
    },
    { name: "Notifications", icon: <FaBell />, path: "/student/notification" },
    {
      name: "Attendance",
      icon: <FaUsers />,
      path: "/student/attendance",
      module: "attendance",
    },
    {
      name: "Timetable",
      icon: <FaClock />,
      path: "/student/timetable",
      module: "timetable",
    },
    {
      name: "Assignment",
      icon: <GiSchoolBag />,
      module: "assignments",
      children: [
        { name: "My Assignments", path: "/student/assignment" },
        { name: "Assignment Result", path: "/student/assignment/result" },
      ],
    },
    {
      name: "Exam Results",
      icon: <GiOpenBook />,
      path: "/student/exam-result",
      module: "exams",
    },
    {
      name: "Report Card",
      icon: <GiOpenBook />,
      path: "/student/report-card",
      module: "exams",
    },
    {
      name: "My ID Card",
      icon: <FaIdCard />,
      path: "/student/id-card",
    },
    {
      name: "Diary",
      icon: <FaBookOpen />,
      path: "/student/diary",
      module: "diary",
    },
    {
      name: "Homework",
      icon: <FaClipboardList />,
      path: "/student/homework",
      module: "homework",
    },
    {
      name: "Daily learning",
      icon: <FaClipboardList />,
      path: "/student/daily-learning",
      module: "daily_learning",
    },
    {
      name: "Syllabus Books",
      icon: <FaBookDead />,
      path: "/student/syllabus-books",
    },
    {
      name: "Library",
      icon: <FaBookJournalWhills />,
      path: "/student/library",
      module: "library",
    },
    {
      name: "Group",
      icon: <FaUserGroup />,
      path: "/student/group",
      module: "groups",
    },
    { name: "Notices", icon: <FaBell />, path: "/student/notice" },
    { name: "Events", icon: <FaCalendar />, path: "/student/event" },
    { name: "Calendar", icon: <FaCalendarAlt />, path: "/student/calendar" },
    {
      name: "Blogs",
      icon: <FaBookJournalWhills />,
      path: "/student/blogs",
      module: "blogs",
    },
    {
      name: "Messages",
      icon: <FaBell />,
      path: "/student/messages",
    },
    {
      name: "Help / Support",
      icon: <FaHeadset />,
      path: "/student/help",
    },
  ];

  const staffAdminMenu = [
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
      name: "Hostel Management",
      icon: <FaHotel />,
      path: "/staff/hostel",
      module: "hostel",
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
      path: "/staff/staff",
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

  let menu = [];
  if (role === "super_admin") menu = superAdminMenu;
  else if (role === "school_admin") menu = schoolAdminMenu;
  else if (role === "teacher_admin") {
    const teacherPerms = user?.permissions || [];
    // Legacy teachers with no access role keep full teaching menu
    menu =
      teacherPerms.length === 0
        ? teacherAdminMenu
        : teacherAdminMenu.filter((item) => {
            if (!item.module) return true;
            return teacherPerms.includes(item.module);
          });
  } else if (role === "student_admin") {
    menu = user?.loginAs === "student" ? studentMenu : parentMenu;
  } else if (role === "staff_admin") {
    menu = staffAdminMenu.filter((item) => {
      if (!item.module) return true;
      if (item.module === "staff") return true;
      return user?.permissions?.includes(item.module);
    });
  }

  const toggleMenu = (name) => {
    setOpenMenu(openMenu === name ? null : name);
  };

  const handleItemClick = (item, childPath = null) => {
    if (!hasModule(item.module)) {
      setUpgradePopup({ moduleName: item.name });
      return;
    }
    if (childPath) {
      navigate(childPath);
      closeSidebar && closeSidebar();
      return;
    }
    if (item.children) {
      toggleMenu(item.name);
      return;
    }
    if (item.path) {
      navigate(item.path);
      closeSidebar && closeSidebar();
      return;
    }
  };

  const finalMenu = (() => {
    if (role === "super_admin") return menu;
    if (role === "school_admin") return menu;
    // Teachers: already filtered by personal permissions; also respect school subscription
    if (role === "teacher_admin") {
      return menu.filter((item) => !item.module || hasModule(item.module));
    }
    return menu.filter((item) => !item.module || hasModule(item.module));
  })();

  return (
    <>
      {upgradePopup && (
        <UpgradePopup
          moduleName={upgradePopup.moduleName}
          onClose={() => setUpgradePopup(null)}
        />
      )}

      <aside className="h-full w-full bg-[rgb(var(--sidebar))] border-r border-[rgb(var(--border))] flex flex-col shadow-sm text-[rgb(var(--sidebar-text))]">
        {/* MENU */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {finalMenu.map((item, index) => {
            const isSubscribed = hasModule(item.module);
            const isParentActive = item.children?.some(
              (c) => location.pathname === c.path,
            );
            const variant = !isSubscribed
              ? "locked"
              : isParentActive
                ? "active"
                : "default";

            if (item.children) {
              const isOpen = openMenu === item.name;

              return (
                <div key={index}>
                  <div
                    onClick={() => handleItemClick(item)}
                    className={`mx-1 mb-1 px-3 py-2.5 rounded-2xl flex items-center justify-between gap-2 transition-all duration-200
                      ${
                        !isSubscribed
                          ? "opacity-50 cursor-not-allowed"
                          : isParentActive
                            ? "bg-[rgba(var(--sidebar-active),0.14)] cursor-pointer"
                            : "cursor-pointer hover:bg-[rgba(var(--sidebar-active),0.08)]"
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <IconBadge icon={item.icon} variant={variant} />
                      <span
                        className={`font-medium text-sm truncate ${
                          isParentActive && isSubscribed
                            ? "text-[rgb(var(--sidebar-active))] font-semibold"
                            : "text-[rgb(var(--sidebar-text))]"
                        }`}
                      >
                        {tn(item.name)}
                      </span>
                    </div>
                    {!isSubscribed ? (
                      <FaLock
                        size={10}
                        className="text-[rgb(var(--sidebar-text))] opacity-70 shrink-0"
                      />
                    ) : isOpen ? (
                      <FaChevronDown
                        size={10}
                        className="text-[rgb(var(--sidebar-text))] opacity-70 shrink-0"
                      />
                    ) : (
                      <FaChevronRight
                        size={10}
                        className="text-[rgb(var(--sidebar-text))] opacity-70 shrink-0"
                      />
                    )}
                  </div>

                  {isOpen && isSubscribed && (
                    <div className="ml-6 my-1 border-l border-[rgba(var(--sidebar-text),0.25)]">
                      {item.children
                        .filter(
                          (child) => !child.module || hasModule(child.module),
                        )
                        .map((child, i) => {
                        const isActive = location.pathname === child.path;
                        return (
                          <div
                            key={i}
                            onClick={() => handleItemClick(item, child.path)}
                            className={`ml-3 mr-2 px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-all
                              ${
                                isActive
                                  ? "text-[rgb(var(--sidebar-active))] font-semibold bg-[rgba(var(--sidebar-active),0.12)]"
                                  : "text-[rgb(var(--sidebar-text))] opacity-85 hover:opacity-100 hover:bg-[rgba(var(--sidebar-active),0.08)]"
                              }`}
                          >
                            {tn(child.name)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // leaf item
            const isActive = location.pathname === item.path;
            const leafVariant = !isSubscribed
              ? "locked"
              : isActive
                ? "active"
                : "default";

            return (
              <div
                key={index}
                onClick={() => handleItemClick(item)}
                className={`mx-1 mb-1 px-3 py-2.5 rounded-2xl flex items-center justify-between gap-2 transition-all duration-200
                  ${
                    !isSubscribed
                      ? "opacity-50 cursor-not-allowed"
                      : isActive
                        ? "bg-[rgba(var(--sidebar-active),0.14)] cursor-pointer"
                        : "cursor-pointer hover:bg-[rgba(var(--sidebar-active),0.08)]"
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <IconBadge icon={item.icon} variant={leafVariant} />
                  <span
                    className={`font-medium text-sm truncate ${
                      isActive && isSubscribed
                        ? "text-[rgb(var(--sidebar-active))] font-semibold"
                        : "text-[rgb(var(--sidebar-text))]"
                    }`}
                  >
                    {tn(item.name)}
                  </span>
                </div>
                {!isSubscribed && (
                  <FaLock
                    size={10}
                    className="text-[rgb(var(--sidebar-text))] opacity-70 shrink-0"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* LOGOUT */}
        <div className="p-3 border-t border-[rgba(var(--sidebar-text),0.2)] bg-[rgb(var(--sidebar))]">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-[rgb(var(--sidebar-text))] hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <IconBadge icon={<FaSignOutAlt />} variant="default" />
            <span className="font-medium text-sm">{t("common.logout")}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
