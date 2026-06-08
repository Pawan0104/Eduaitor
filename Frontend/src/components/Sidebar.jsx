// import {
//   FaTachometerAlt,
//   FaUserGraduate,
//   FaChevronDown,
//   FaChevronRight,
//   FaSignOutAlt,
//   FaClock,
//   FaWallet,
//   FaTimes,
//   FaUserShield,
//   FaSchool,
//   FaCalendarAlt,
//   FaBell,
//   FaBusAlt,
//   FaBookDead,
//   FaCalendar,
//   FaBookOpen,
//   FaUserAlt,
//   FaUsers,
//   FaLock, // ADDED — lock icon for disabled modules
// } from "react-icons/fa";

// import {
//   FaBookJournalWhills,
//   FaSchoolFlag,
//   FaUserGroup,
// } from "react-icons/fa6";

// import { GiOpenBook, GiSchoolBag, GiTeacher } from "react-icons/gi";
// import { HiAcademicCap } from "react-icons/hi2";

// import { useNavigate, useLocation } from "react-router-dom";
// import { useState } from "react";
// import { useAuth } from "../context/AuthContext";
// import axios from "axios";
// import { toast } from "react-toastify";

// const API = import.meta.env.VITE_API_URL;

// // ── UPGRADE POPUP — shown when clicking a disabled module ──
// // ADDED: new component
// const UpgradePopup = ({ moduleName, onClose }) => (
//   <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999] p-4">
//     <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl
//       shadow-xl w-full max-w-sm p-6 text-center">
//       <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center
//         justify-center mx-auto mb-4">
//         <FaLock className="text-orange-500" size={20} />
//       </div>
//       <h3 className="text-base font-semibold mb-1">Module Not Subscribed</h3>
//       <p className="text-sm mb-5">
//         <span className="font-medium text-[rgb(var(--text))]">{moduleName}</span> is
//         not included in your current subscription plan.
//         Contact your administrator to upgrade.
//       </p>
//       <button
//         onClick={onClose}
//         className="w-full py-2 bg-[rgb(var(--primary))] text-white rounded-lg
//           text-sm font-medium transition hover:opacity-90"
//       >
//         Got it
//       </button>
//     </div>
//   </div>
// );

// const Sidebar = ({ closeSidebar }) => {
//   const { user, setUser } = useAuth();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const [openMenu, setOpenMenu] = useState(null);

//   // ADDED: upgrade popup state
//   const [upgradePopup, setUpgradePopup] = useState(null); // stores { moduleName }

//   const role = user?.role;

//   // ADDED: subscribed_modules from auth context
//   // super_admin gets all access, others check their school's modules
//   const subscribedModules = user?.subscribed_modules || [];

//   // ADDED: helper — does this role need module checking?
//   const needsModuleCheck = role !== "super_admin";

//   // ADDED: check if a module key is accessible
//   const hasModule = (moduleKey) => {
//     if (!needsModuleCheck) return true;        // super admin always yes
//     if (!moduleKey) return true;               // no module key = always visible (Dashboard, Notices etc.)
//     return subscribedModules.includes(moduleKey);
//   };

//   const logout = async () => {
//     try {
//       await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
//       toast.info("You have been logged out successfully.");
//     } catch (err) {
//       console.error("Backend logout failed:", err);
//       toast.error("Logout failed. Please try again.");
//     }
//     setUser(null);
//     localStorage.clear();
//     sessionStorage.clear();
//     navigate("/admin/login", { replace: true });
//   };

//   const isMobile = window.innerWidth <= 768;

//   /* ── SUPER ADMIN MENU ── no module keys needed, full access */
//   const superAdminMenu = [
//     ...(isMobile
//       ? [{ name: "Menu", icon: <FaTachometerAlt />, path: "/admin/menu" }]
//       : []),
//     { name: "Dashboard", icon: <FaTachometerAlt />, path: "/admin/dashboard" },
//     {
//       name: "Access Control",
//       icon: <FaUserShield />,
//       children: [
//         { name: "Access", path: "/admin/access-control" },
//         { name: "Role Management", path: "/admin/roles" },
//       ],
//     },
//     {
//       name: "School",
//       icon: <FaSchool />,
//       children: [
//         { name: "All Schools", path: "/admin/schools" },
//         { name: "Add School", path: "/admin/add-school" },
//         { name: "School Management", path: "/admin/school-manage" },
//         { name: "School Subscription Plan", path: "/admin/subscription-plan" },
//       ],
//     },
//     {
//       name: "School Detail",
//       icon: <FaSchoolFlag />,
//       path: "/admin/school-detail",
//     },
//   ];

//   /* ── SCHOOL ADMIN MENU ── UPDATED: module keys added to relevant items */
//   const schoolAdminMenu = [
//     ...(isMobile
//       ? [{ name: "Menu", icon: <FaTachometerAlt />, path: "/school/menu" }]
//       : []),

//     // no module key — always visible
//     { name: "Dashboard", icon: <FaTachometerAlt />, path: "/school/dashboard" },
//     { name: "Notifications", icon: <FaBell />, path: "/school/notification" },

//     // UPDATED: module key added
//     {
//       name: "Students",
//       icon: <FaUserGraduate />,
//       module: "students", // ← ADDED
//       children: [
//         { name: "All Students", path: "/school/students" },
//         { name: "Add Student", path: "/school/student-manage" },
//       ],
//     },
//     {
//       name: "Teachers",
//       icon: <GiTeacher />,
//       module: "teachers", // ← ADDED
//       children: [
//         { name: "All Teachers", path: "/school/teachers" },
//         { name: "Add Teacher", path: "/school/teacher-manage" },
//       ],
//     },
//     {
//       name: "Classes",
//       icon: <HiAcademicCap />,
//       module: "classes", // ← ADDED
//       children: [
//         { name: "Class", path: "/school/class" },
//         { name: "Section", path: "/school/section" },
//         { name: "Subjects", path: "/school/subject" },
//       ],
//     },
//     {
//       name: "Attendance",
//       icon: <FaUserAlt />,
//       path: "/school/attendance",
//       module: "attendance", // ← ADDED
//     },
//     {
//       name: "Exam Management",
//       icon: <GiOpenBook />,
//       module: "exams", // ← ADDED
//       children: [
//         { name: "Exam Structure", path: "/school/exam-structure" },
//       ],
//     },
//     {
//       name: "Syllabus",
//       icon: <FaBookDead />,
//       path: "/school/syllabus",
//       module: "syllabus", // ← ADDED
//     },
//     {
//       name: "Timetable",
//       icon: <FaClock />,
//       path: "/school/timetable",
//       module: "timetable", // ← ADDED
//     },
//     {
//       name: "Fee Management",
//       icon: <FaWallet />,
//       module: "fees", // ← ADDED
//       children: [
//         { name: "Fee Structure", path: "/school/fee-structure" },
//         { name: "Fee Collection", path: "/school/fee-collection" },
//         { name: "Fee History", path: "/school/fee-history" },
//         { name: "Defaulters", path: "/school/defaulters" },
//       ],
//     },
//     {
//       name: "Group",
//       icon: <FaUserGroup />,
//       path: "/school/group",
//       module: "groups", // ← ADDED
//     },
//     {
//       name: "Diary",
//       icon: <FaBookOpen />,
//       path: "/school/diary",
//       module: "diary", // ← ADDED
//     },
//     { name: "Events",   icon: <FaCalendar />,    path: "/school/event"    }, // no module — always visible
//     { name: "Notices",  icon: <FaBell />,         path: "/school/notice"   }, // no module — always visible
//     { name: "Calendar", icon: <FaCalendarAlt />,  path: "/school/calendar" }, // no module — always visible
//     {
//       name: "Transport Management",
//       icon: <FaBusAlt />,
//       module: "transport", // ← ADDED
//       children: [
//         { name: "Transport", path: "/school/transport" },
//         { name: "Route Manage", path: "/school/transport-route" },
//         { name: "Bus Manage", path: "/school/transport-bus" },
//         { name: "Driver Manage", path: "/school/transport-driver" },
//       ],
//     },
//     {
//       name: "Library",
//       icon: <FaBookJournalWhills />,
//       path: "/school/library",
//       module: "library", // ← ADDED
//     },
//     {
//       name: "Blogs",
//       icon: <FaBookJournalWhills />,
//       path: "/school/blogs",
//       module: "blogs", // ← ADDED
//     },
//   ];

//   /* ── TEACHER ADMIN MENU ── UPDATED: module keys added */
//   const teacherAdminMenu = [
//     ...(isMobile
//       ? [{ name: "Menu", icon: <FaTachometerAlt />, path: "/teacher/menu" }]
//       : []),
//     { name: "Dashboard",     icon: <FaTachometerAlt />, path: "/teacher/dashboard"    },
//     { name: "Notifications", icon: <FaBell />,          path: "/teacher/notification" },
//     {
//       name: "Students",
//       icon: <FaUserGraduate />,
//       path: "/teacher/students",
//       module: "students", // ← ADDED
//     },
//     {
//       name: "Attendance",
//       icon: <FaUserAlt />,
//       module: "attendance", // ← ADDED
//       children: [
//         { name: "Mark Attendance",    path: "/teacher/attendance/mark"   },
//         { name: "Attendance Report",  path: "/teacher/attendance/report" },
//       ],
//     },
//     {
//       name: "My Classes",
//       icon: <HiAcademicCap />,
//       path: "/teacher/class",
//       module: "classes", // ← ADDED
//     },
//     {
//       name: "Syllabus",
//       icon: <FaBookDead />,
//       path: "/teacher/syllabus",
//       module: "syllabus", // ← ADDED
//     },
//     {
//       name: "Assignment",
//       icon: <GiSchoolBag />,
//       module: "assignments", // ← ADDED
//       children: [
//         { name: "My Assignments",     path: "/teacher/assignment"        },
//         { name: "Assignment Result",  path: "/teacher/assignment/result" },
//       ],
//     },
//     {
//       name: "Exams",
//       icon: <GiOpenBook />,
//       module: "exams", // ← ADDED
//       children: [
//         { name: "Marks Entry",  path: "/teacher/exam"        },
//         { name: "Exam Report",  path: "/teacher/exam-report" },
//       ],
//     },
//     { name: "Timetable", icon: <FaClock />,     path: "/teacher/timetable", module: "timetable"   },
//     { name: "Diary",     icon: <FaBookOpen />,  path: "/teacher/diary",     module: "diary"        },
//     { name: "Group",     icon: <FaUserGroup />, path: "/teacher/group",     module: "groups"       },
//     { name: "Notices",   icon: <FaBell />,      path: "/teacher/notice"                            },
//     { name: "Events",    icon: <FaCalendar />,  path: "/teacher/event"                             },
//     { name: "Calendar",  icon: <FaCalendarAlt />, path: "/teacher/calendar"                        },
//   ];

//   /* ── STUDENT / PARENT MENU ── UPDATED: module keys added */
//   const studentAdminMenu = [
//     ...(isMobile
//       ? [{ name: "Menu", icon: <FaTachometerAlt />, path: "/parent/menu" }]
//       : []),
//     { name: "Dashboard",    icon: <FaTachometerAlt />, path: "/parent/dashboard"    },
//     { name: "Notifications",icon: <FaBell />,          path: "/parent/notification" },
//     { name: "My Child",     icon: <FaUserGraduate />,  path: "/parent/student",     module: "students"    },
//     { name: "Fee Details",  icon: <FaWallet />,         path: "/parent/fees",        module: "fees"        },
//     { name: "Attendance",   icon: <FaUsers />,          path: "/parent/attendance",  module: "attendance"  },
//     { name: "Diary",        icon: <FaBookOpen />,       path: "/parent/diary",       module: "diary"       },
//     {
//       name: "Assignment",
//       icon: <GiSchoolBag />,
//       module: "assignments", // ← ADDED
//       children: [
//         { name: "My Assignments",    path: "/parent/assignment"        },
//         { name: "Assignment Result", path: "/parent/assignment/result" },
//       ],
//     },
//     { name: "Exam Results", icon: <GiSchoolBag />,      path: "/parent/exam-result", module: "exams"       },
//     { name: "Calendar",     icon: <FaCalendarAlt />,    path: "/parent/calendar"                           },
//     { name: "Transport",    icon: <FaBusAlt />,          path: "/parent/transport",   module: "transport"   },
//     { name: "Timetable",    icon: <FaClock />,           path: "/parent/timetable",   module: "timetable"   },
//     { name: "Notices",      icon: <FaBell />,            path: "/parent/notice"                             },
//     { name: "Events",       icon: <FaCalendar />,        path: "/parent/event"                              },
//     { name: "Group",        icon: <FaUserGroup />,       path: "/parent/group",       module: "groups"      },
//     { name: "Library",      icon: <FaBookJournalWhills />, path: "/parent/library",   module: "library"     },
//   ];

//   let menu = [];
//   if (role === "super_admin")   menu = superAdminMenu;
//   else if (role === "school_admin")  menu = schoolAdminMenu;
//   else if (role === "teacher_admin") menu = teacherAdminMenu;
//   else if (role === "student_admin") menu = studentAdminMenu;

//   const toggleMenu = (name) => {
//     setOpenMenu(openMenu === name ? null : name);
//   };

//   // ADDED: handle click on any menu item (parent or leaf)
//   // if module not subscribed → show popup instead of navigating
//   const handleItemClick = (item, childPath = null) => {
//     if (!hasModule(item.module)) {
//       // blocked — show upgrade popup
//       setUpgradePopup({ moduleName: item.name });
//       return;
//     }
//     // allowed
//     if (childPath) {
//       navigate(childPath);
//       closeSidebar && closeSidebar();
//     } else if (item.path) {
//       navigate(item.path);
//       closeSidebar && closeSidebar();
//     } else {
//       // it's a parent with children — toggle dropdown
//       toggleMenu(item.name);
//     }
//   };
//   const finalMenu =
//   user?.role === "student_admin"
//     ? menu.filter(
//         (item) => !item.module || hasModule(item.module)
//       )
//     : menu;

  
//   return (
//     <>
//       {/* ADDED: upgrade popup rendered outside aside so it overlays everything */}
//       {upgradePopup && (
//         <UpgradePopup
//           moduleName={upgradePopup.moduleName}
//           onClose={() => setUpgradePopup(null)}
//         />
//       )}

//       <aside className="h-full w-56 bg-[rgb(var(--sidebar))] border-r border-[rgb(var(--border))] flex flex-col">

//         {/* MOBILE HEADER */}
//         <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))]">
//           <h2 className="font-semibold text-[rgb(var(--sidebar-text))]">Menu</h2>
//           <button
//             onClick={closeSidebar}
//             className="text-[rgb(var(--sidebar-text))] hover:text-red-400 transition"
//           >
//             <FaTimes />
//           </button>
//         </div>

//         {/* MENU */}
//         <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
//           {finalMenu.map((item, index) => {
//             const isSubscribed = hasModule(item.module); // ADDED
//             const isParentActive = item.children?.some((c) => location.pathname === c.path);

//             if (item.children) {
//               const isOpen = openMenu === item.name;

//               return (
//                 <div key={index}>
//                   {/* UPDATED: onClick now uses handleItemClick */}
//                   <div
//                     onClick={() => handleItemClick(item)}
//                     className={`flex items-center justify-between px-4 py-2.5 cursor-pointer
//                       transition text-sm border-l-4
//                       ${!isSubscribed
//                         // ADDED: disabled style for unsubscribed modules
//                         ? "opacity-50 border-transparent text-[rgb(var(--sidebar-text))] cursor-not-allowed"
//                         : isParentActive
//                           ? "bg-[rgba(var(--primary),0.15)] text-[rgb(var(--sidebar-active))] border-[rgb(var(--primary))]"
//                           : "text-[rgb(var(--sidebar-text))] border-transparent hover:bg-[rgba(var(--primary),0.08)] hover:text-[rgb(var(--sidebar-active))]"
//                       }`}
//                   >
//                     <div className="flex items-center gap-3">
//                       <span>{item.icon}</span>
//                       <span className="font-medium">{item.name}</span>
//                     </div>
//                     {/* ADDED: show lock icon if not subscribed, else chevron */}
//                     {!isSubscribed
//                       ? <FaLock size={10} className="text-gray-400" />
//                       : isOpen
//                         ? <FaChevronDown size={10} />
//                         : <FaChevronRight size={10} />
//                     }
//                   </div>

//                   {/* children only shown if subscribed AND open */}
//                   {isOpen && isSubscribed && (
//                     <div className="bg-black/10">
//                       {item.children.map((child, i) => {
//                         const isActive = location.pathname === child.path;
//                         return (
//                           <div
//                             key={i}
//                             // UPDATED: onClick uses handleItemClick with child path
//                             onClick={() => handleItemClick(item, child.path)}
//                             className={`pl-11 pr-4 py-2 text-sm cursor-pointer transition
//                               ${isActive
//                                 ? "text-[rgb(var(--sidebar-active))] font-semibold"
//                                 : "text-[rgb(var(--sidebar-text))] hover:text-[rgb(var(--sidebar-active))]"
//                               }`}
//                           >
//                             {child.name}
//                           </div>
//                         );
//                       })}
//                     </div>
//                   )}
//                 </div>
//               );
//             }

//             // leaf item (no children)
//             const isActive = location.pathname === item.path;

//             return (
//               <div
//                 key={index}
//                 // UPDATED: onClick uses handleItemClick
//                 onClick={() => handleItemClick(item)}
//                 className={`flex items-center justify-between px-4 py-2.5 cursor-pointer
//                   text-sm border-l-4 transition
//                   ${!isSubscribed
//                     // ADDED: disabled style
//                     ? "opacity-50 border-transparent text-[rgb(var(--sidebar-text))] cursor-not-allowed"
//                     : isActive
//                       ? "bg-[rgba(var(--primary),0.15)] text-[rgb(var(--sidebar-active))] border-[rgb(var(--primary))]"
//                       : "text-[rgb(var(--sidebar-text))] border-transparent hover:bg-[rgba(var(--primary),0.08)] hover:text-[rgb(var(--sidebar-active))]"
//                   }`}
//               >
//                 <div className="flex items-center gap-3">
//                   {item.icon}
//                   <span className="font-medium">{item.name}</span>
//                 </div>
//                 {/* ADDED: lock icon on leaf items too */}
//                 {!isSubscribed && <FaLock size={10} className="text-gray-400" />}
//               </div>
//             );
//           })}
//         </div>

//         {/* LOGOUT — unchanged */}
//         <div className="p-3 border-t border-[rgb(var(--border))]">
//           <button
//             onClick={logout}
//             className="flex items-center gap-3 w-full px-4 py-2 rounded-lg
//               text-[rgb(var(--sidebar-text))] hover:bg-red-500/10 hover:text-red-400
//               transition text-sm"
//           >
//             <FaSignOutAlt />
//             <span className="font-medium">Logout</span>
//           </button>
//         </div>
//       </aside>
//     </>
//   );
// };

// export default Sidebar;
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
  FaLock, // ADDED — lock icon for disabled modules
} from "react-icons/fa";

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
import axios from "axios";
import { toast } from "react-toastify";

const API = import.meta.env.VITE_API_URL;

// ── UPGRADE POPUP — shown when clicking a disabled module ──
// ADDED: new component
const UpgradePopup = ({ moduleName, onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-999 p-4">
    <div
      className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl
      shadow-xl w-full max-w-sm p-6 text-center"
    >
      <div
        className="w-12 h-12 bg-orange-100 rounded-full flex items-center
        justify-center mx-auto mb-4"
      >
        <FaLock className="text-orange-500" size={20} />
      </div>
      <h3 className="text-base font-semibold mb-1">Module Not Subscribed</h3>
      <p className="text-sm mb-5">
        <span className="font-medium text-[rgb(var(--text))]">
          {moduleName}
        </span>{" "}
        is not included in your current subscription plan. Contact your
        administrator to upgrade.
      </p>
      <button
        onClick={onClose}
        className="w-full py-2 bg-[rgb(var(--primary))] text-white rounded-lg
          text-sm font-medium transition hover:opacity-90"
      >
        Got it
      </button>
    </div>
  </div>
);

const Sidebar = ({ closeSidebar }) => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);

  // ADDED: upgrade popup state
  const [upgradePopup, setUpgradePopup] = useState(null); // stores { moduleName }

  const role = user?.role;

  // ADDED: subscribed_modules from auth context
  // super_admin gets all access, others check their school's modules
  const subscribedModules = user?.subscribed_modules || [];

  // ADDED: helper — does this role need module checking?
  const needsModuleCheck = role !== "super_admin";

  // ADDED: check if a module key is accessible
  const hasModule = (moduleKey) => {
    if (!needsModuleCheck) return true; // super admin always yes
    if (!moduleKey) return true; // no module key = always visible (Dashboard, Notices etc.)
    return subscribedModules.includes(moduleKey);
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      toast.info("You have been logged out successfully.");
    } catch (err) {
      console.error("Backend logout failed:", err);
      toast.error("Logout failed. Please try again.");
    }
    setUser(null);
    localStorage.clear();
    sessionStorage.clear();
    navigate("/admin/login", { replace: true });
  };

  const isMobile = window.innerWidth <= 768;

  /* ── SUPER ADMIN MENU ── no module keys needed, full access */
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

  /* ── SCHOOL ADMIN MENU ── UPDATED: module keys added to relevant items */
  const schoolAdminMenu = [
    ...(isMobile
      ? [{ name: "Menu", icon: <FaTachometerAlt />, path: "/school/menu" }]
      : []),

    // no module key — always visible
    { name: "Dashboard", icon: <FaTachometerAlt />, path: "/school/dashboard" },
    { name: "Notifications", icon: <FaBell />, path: "/school/notification" },

    // UPDATED: module key added
    {
      name: "Students",
      icon: <FaUserGraduate />,
      module: "students", // ← ADDED
      children: [
        { name: "All Students", path: "/school/students" },
        { name: "Add Student", path: "/school/student-manage" },
      ],
    },
    {
      name: "Teachers",
      icon: <GiTeacher />,
      module: "teachers", // ← ADDED
      children: [
        { name: "All Teachers", path: "/school/teachers" },
        { name: "Add Teacher", path: "/school/teacher-manage" },
      ],
    },
    {
      name: "Classes",
      icon: <HiAcademicCap />,
      module: "classes", // ← ADDED
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
      module: "attendance", // ← ADDED
    },
    {
      name: "Exam Management",
      icon: <GiOpenBook />,
      module: "exams", // ← ADDED
      children: [{ name: "Exam Structure", path: "/school/exam-structure" }],
    },
    {
      name: "Syllabus",
      icon: <FaBookDead />,
      path: "/school/syllabus",
      module: "syllabus", // ← ADDED
    },
    {
      name: "Timetable",
      icon: <FaClock />,
      path: "/school/timetable",
      module: "timetable", // ← ADDED
    },
    {
      name: "Fee Management",
      icon: <FaWallet />,
      module: "fees", // ← ADDED
      children: [
        { name: "Fee Structure", path: "/school/fee-structure" },
        { name: "Fee Collection", path: "/school/fee-collection" },
        { name: "Fee History", path: "/school/fee-history" },
        { name: "Defaulters", path: "/school/defaulters" },
      ],
    },
    {
      name: "Group",
      icon: <FaUserGroup />,
      path: "/school/group",
      module: "groups", // ← ADDED
    },
    {
      name: "Diary",
      icon: <FaBookOpen />,
      path: "/school/diary",
      module: "diary", // ← ADDED
    },
    { name: "Events", icon: <FaCalendar />, path: "/school/event" }, // no module — always visible
    { name: "Notices", icon: <FaBell />, path: "/school/notice" }, // no module — always visible
    { name: "Calendar", icon: <FaCalendarAlt />, path: "/school/calendar" }, // no module — always visible
    {
      name: "Transport Management",
      icon: <FaBusAlt />,
      module: "transport", // ← ADDED
      children: [
        { name: "Transport", path: "/school/transport" },
        { name: "Route Manage", path: "/school/transport-route" },
        { name: "Bus Manage", path: "/school/transport-bus" },
        { name: "Driver Manage", path: "/school/transport-driver" },
      ],
    },
    {
      name: "Library",
      icon: <FaBookJournalWhills />,
      path: "/school/library",
      module: "library", // ← ADDED
    },
    {
      name: "Blogs",
      icon: <FaBookJournalWhills />,
      path: "/school/blogs",
      module: "blogs", // ← ADDED
    },
  ];

  /* ── TEACHER ADMIN MENU ── UPDATED: module keys added */
  const teacherAdminMenu = [
    ...(isMobile
      ? [{ name: "Menu", icon: <FaTachometerAlt />, path: "/teacher/menu" }]
      : []),
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
      module: "students", // ← ADDED
    },
    {
      name: "Attendance",
      icon: <FaUserAlt />,
      module: "attendance", // ← ADDED
      children: [
        { name: "Mark Attendance", path: "/teacher/attendance/mark" },
        { name: "Attendance Report", path: "/teacher/attendance/report" },
      ],
    },
    {
      name: "My Classes",
      icon: <HiAcademicCap />,
      path: "/teacher/class",
      module: "classes", // ← ADDED
    },
    {
      name: "Syllabus",
      icon: <FaBookDead />,
      path: "/teacher/syllabus",
      module: "syllabus", // ← ADDED
    },
    {
      name: "Assignment",
      icon: <GiSchoolBag />,
      module: "assignments", // ← ADDED
      children: [
        { name: "My Assignments", path: "/teacher/assignment" },
        { name: "Assignment Result", path: "/teacher/assignment/result" },
      ],
    },
    {
      name: "Exams",
      icon: <GiOpenBook />,
      module: "exams", // ← ADDED
      children: [
        { name: "Marks Entry", path: "/teacher/exam" },
        { name: "Exam Report", path: "/teacher/exam-report" },
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
      name: "Group",
      icon: <FaUserGroup />,
      path: "/teacher/group",
      module: "groups",
    },
    { name: "Notices", icon: <FaBell />, path: "/teacher/notice" },
    { name: "Events", icon: <FaCalendar />, path: "/teacher/event" },
    { name: "Calendar", icon: <FaCalendarAlt />, path: "/teacher/calendar" },
    {
      name: "Blogs",
      icon: <FaBookJournalWhills />,
      path: "/teacher/blogs",
      module: "blogs",
    },
  ];

  /* ── STUDENT / PARENT MENU ── UPDATED: module keys added */
  const studentAdminMenu = [
    ...(isMobile
      ? [{ name: "Menu", icon: <FaTachometerAlt />, path: "/parent/menu" }]
      : []),
    { name: "Dashboard", icon: <FaTachometerAlt />, path: "/parent/dashboard" },
    { name: "Notifications", icon: <FaBell />, path: "/parent/notification" },
    {
      name: "My Child",
      icon: <FaUserGraduate />,
      path: "/parent/student",
      module: "students",
    },
    {
      name: "Fee Details",
      icon: <FaWallet />,
      path: "/parent/fees",
      module: "fees",
    },
    {
      name: "Attendance",
      icon: <FaUsers />,
      path: "/parent/attendance",
      module: "attendance",
    },
    {
      name: "Diary",
      icon: <FaBookOpen />,
      path: "/parent/diary",
      module: "diary",
    },
    {
      name: "Assignment",
      icon: <GiSchoolBag />,
      module: "assignments", // ← ADDED
      children: [
        { name: "My Assignments", path: "/parent/assignment" },
        { name: "Assignment Result", path: "/parent/assignment/result" },
      ],
    },
    {
      name: "Exam Results",
      icon: <GiSchoolBag />,
      path: "/parent/exam-result",
      module: "exams",
    },
    { name: "Calendar", icon: <FaCalendarAlt />, path: "/parent/calendar" },
    {
      name: "Transport",
      icon: <FaBusAlt />,
      path: "/parent/transport",
      module: "transport",
    },
    {
      name: "Timetable",
      icon: <FaClock />,
      path: "/parent/timetable",
      module: "timetable",
    },
    { name: "Notices", icon: <FaBell />, path: "/parent/notice" },
    { name: "Events", icon: <FaCalendar />, path: "/parent/event" },
    {
      name: "Group",
      icon: <FaUserGroup />,
      path: "/parent/group",
      module: "groups",
    },
    {
      name: "Library",
      icon: <FaBookJournalWhills />,
      path: "/parent/library",
      module: "library",
    },
    {
      name: "Blogs",
      icon: <FaBookJournalWhills />,
      path: "/parent/blogs",
      module: "blogs",
    },
  ];

  let menu = [];
  if (role === "super_admin") menu = superAdminMenu;
  else if (role === "school_admin") menu = schoolAdminMenu;
  else if (role === "teacher_admin") menu = teacherAdminMenu;
  else if (role === "student_admin") menu = studentAdminMenu;

  const toggleMenu = (name) => {
    setOpenMenu(openMenu === name ? null : name);
  };

  // ADDED: handle click on any menu item (parent or leaf)
  // if module not subscribed → show popup instead of navigating
  const handleItemClick = (item, childPath = null) => {
    if (!hasModule(item.module)) {
      // blocked — show upgrade popup
      setUpgradePopup({ moduleName: item.name });
      return;
    }
    // allowed
    if (childPath) {
      navigate(childPath);
      closeSidebar && closeSidebar();
    } else if (item.path) {
      navigate(item.path);
      closeSidebar && closeSidebar();
    } else {
      // it's a parent with children — toggle dropdown
      toggleMenu(item.name);
    }
  };

  const finalMenu =
    user?.role === "student_admin"
      ? menu.filter((item) => !item.module || hasModule(item.module))
      : menu;

  return (
    <>
      {/* ADDED: upgrade popup rendered outside aside so it overlays everything */}
      {upgradePopup && (
        <UpgradePopup
          moduleName={upgradePopup.moduleName}
          onClose={() => setUpgradePopup(null)}
        />
      )}

      <aside className="h-full w-56 bg-[rgb(var(--sidebar))] border-r border-[rgb(var(--border))] flex flex-col">
        {/* MOBILE HEADER */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))]">
          <h2 className="font-semibold text-[rgb(var(--sidebar-text))]">
            Menu
          </h2>
          <button
            onClick={closeSidebar}
            className="text-[rgb(var(--sidebar-text))] hover:text-red-400 transition"
          >
            <FaTimes />
          </button>
        </div>

        {/* MENU */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {finalMenu.map((item, index) => {
            const isSubscribed = hasModule(item.module); // ADDED
            const isParentActive = item.children?.some(
              (c) => location.pathname === c.path,
            );

            if (item.children) {
              const isOpen = openMenu === item.name;

              return (
                <div key={index}>
                  {/* UPDATED: onClick now uses handleItemClick */}
                  <div
                    onClick={() => handleItemClick(item)}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer
                      transition text-sm border-l-4
                      ${
                        !isSubscribed
                          ? // ADDED: disabled style for unsubscribed modules
                            "opacity-50 border-transparent text-[rgb(var(--sidebar-text))] cursor-not-allowed"
                          : isParentActive
                            ? "bg-[rgba(var(--primary),0.15)] text-[rgb(var(--sidebar-active))] border-[rgb(var(--primary))]"
                            : "text-[rgb(var(--sidebar-text))] border-transparent hover:bg-[rgba(var(--primary),0.08)] hover:text-[rgb(var(--sidebar-active))]"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span>{item.icon}</span>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    {/* ADDED: show lock icon if not subscribed, else chevron */}
                    {!isSubscribed ? (
                      <FaLock size={10} className="text-gray-400" />
                    ) : isOpen ? (
                      <FaChevronDown size={10} />
                    ) : (
                      <FaChevronRight size={10} />
                    )}
                  </div>

                  {/* children only shown if subscribed AND open */}
                  {isOpen && isSubscribed && (
                    <div className="bg-black/10">
                      {item.children.map((child, i) => {
                        const isActive = location.pathname === child.path;
                        return (
                          <div
                            key={i}
                            // UPDATED: onClick uses handleItemClick with child path
                            onClick={() => handleItemClick(item, child.path)}
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

            // leaf item (no children)
            const isActive = location.pathname === item.path;

            return (
              <div
                key={index}
                // UPDATED: onClick uses handleItemClick
                onClick={() => handleItemClick(item)}
                className={`flex items-center justify-between px-4 py-2.5 cursor-pointer
                  text-sm border-l-4 transition
                  ${
                    !isSubscribed
                      ? // ADDED: disabled style
                        "opacity-50 border-transparent text-[rgb(var(--sidebar-text))] cursor-not-allowed"
                      : isActive
                        ? "bg-[rgba(var(--primary),0.15)] text-[rgb(var(--sidebar-active))] border-[rgb(var(--primary))]"
                        : "text-[rgb(var(--sidebar-text))] border-transparent hover:bg-[rgba(var(--primary),0.08)] hover:text-[rgb(var(--sidebar-active))]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </div>
                {/* ADDED: lock icon on leaf items too */}
                {!isSubscribed && (
                  <FaLock size={10} className="text-gray-400" />
                )}
              </div>
            );
          })}
        </div>

        {/* LOGOUT — unchanged */}
        <div className="p-3 border-t border-[rgb(var(--border))]">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-lg
              text-[rgb(var(--sidebar-text))] hover:bg-red-500/10 hover:text-red-400
              transition text-sm"
          >
            <FaSignOutAlt />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;