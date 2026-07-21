import {
  FiBook,
  FiBookOpen,
  FiCalendar,
  FiCheckSquare,
  FiClipboard,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiHome,
  FiList,
  FiUsers,
} from "react-icons/fi";
import { FaBus } from "react-icons/fa";
import { FaUserGraduate } from "react-icons/fa6";
import RoleCampusDashboard from "./RoleCampusDashboard";

const MODULE_TILES = [
  { label: "Homework", path: "/school/homework", icon: FiBookOpen },
  { label: "Syllabus", path: "/school/syllabus", icon: FiBook },
  { label: "Attendance", path: "/school/attendance", icon: FiCheckSquare },
  { label: "Fee Report", path: "/school/fee-history", icon: FiCreditCard },
  { label: "Transport", path: "/school/transport", icon: FaBus },
  { label: "Notices", path: "/school/notice", icon: FiFileText },
  { label: "Calendar", path: "/school/calendar", icon: FiCalendar },
  { label: "Students", path: "/school/students", icon: FaUserGraduate },
  { label: "Exams", path: "/school/exam-marks", icon: FiClipboard },
  { label: "Classes", path: "/school/class", icon: FiGrid },
  { label: "Teachers", path: "/school/teachers", icon: FiUsers },
  { label: "Diary", path: "/school/diary", icon: FiList },
];

export default function SchoolCampusDashboard({
  metrics,
  dashboard,
  feeTrend,
  visibility,
  formatCurrency,
}) {
  const inactiveStudents = Math.max(
    0,
    metrics.totalStudents -
      Math.round((metrics.studentAttendanceRate / 100) * metrics.totalStudents),
  );
  const activeStudents = Math.max(0, metrics.totalStudents - inactiveStudents);
  const studentPresent = Math.round(
    (metrics.studentAttendanceRate / 100) * metrics.totalStudents,
  );
  const studentLeave = Math.max(0, metrics.totalStudents - studentPresent);
  const staffOnLeave = Math.max(
    0,
    metrics.totalTeachers - metrics.teachersPresent,
  );
  const feePending = dashboard.defaulters?.length || 0;
  const feeCollected = dashboard.feeSummary?.totalAmount || 0;

  const summaries = [
    {
      title: "Fee Summary",
      tone: "blue",
      path: "/school/fee-history",
      rows: [
        ["Total Fee", formatCurrency(feeCollected)],
        ["Fee Collected", formatCurrency(feeCollected)],
        ["Fee Pending", `${feePending} students`],
      ],
    },
    {
      title: "Student",
      tone: "orange",
      path: "/school/students",
      rows: [
        ["Total Student", metrics.totalStudents],
        ["Active", activeStudents],
        ["Inactive", inactiveStudents],
      ],
    },
    {
      title: "Student Summary",
      tone: "green",
      path: "/school/attendance",
      rows: [
        ["Total Student", metrics.totalStudents],
        ["Student Present", studentPresent],
        ["Student On Leave", studentLeave],
      ],
    },
    {
      title: "Teaching Staff",
      tone: "red",
      path: "/school/teachers",
      rows: [
        ["Total Staff", metrics.totalTeachers],
        ["Staff Present", metrics.teachersPresent],
        ["Staff On Leave", staffOnLeave],
      ],
    },
    {
      title: "Class & Section",
      tone: "yellow",
      path: "/school/class",
      rows: [
        ["Classes", metrics.totalClasses],
        ["Sections", metrics.totalSections],
        ["Capacity", metrics.totalCapacity || "—"],
      ],
      actions: [
        { label: "Manage Classes" },
        { label: "Sections" },
      ],
    },
  ];

  const banner = (
    <div className="flex items-center justify-between gap-3 rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 sm:col-span-2 xl:col-span-1 dark:border-sky-900/40 dark:bg-sky-950/40">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700 dark:text-sky-300">
          Total Students Enrolled
        </p>
        <p className="mt-1 text-3xl font-black text-sky-900 dark:text-sky-100">
          {metrics.enrolledStudents.toLocaleString()}
        </p>
      </div>
      <FiHome className="text-3xl text-sky-500 opacity-70" />
    </div>
  );

  return (
    <RoleCampusDashboard
      roleLabel="Admin"
      profilePath="/school/menu"
      menuPath="/school/menu"
      summaries={summaries}
      banner={banner}
      modules={MODULE_TILES}
      showModules={visibility.quickActions !== false}
      showStatBars={visibility.attendance !== false}
      showFeeTrend={visibility.feeTrends !== false}
      showNotices={visibility.notices !== false}
      showEvents={visibility.events !== false}
      statBarsTitle="Student Statistics"
      statBars={[
        { label: "Total", value: metrics.totalStudents, color: "bg-emerald-500" },
        { label: "Active", value: activeStudents, color: "bg-sky-500" },
        { label: "Present", value: studentPresent, color: "bg-green-600" },
        { label: "Leave", value: studentLeave, color: "bg-amber-500" },
      ]}
      feeTrend={feeTrend}
      formatMoney={formatCurrency}
      notices={(dashboard.notices || []).slice(0, 3).map((n) => ({
        id: n._id,
        title: n.title,
        meta: n.audience || "All",
      }))}
      events={(dashboard.events || [])
        .filter((e) => new Date(e.startDate) >= new Date())
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        .slice(0, 3)
        .map((e) => ({
          id: e._id,
          title: e.title,
          meta: e.location || "Campus",
        }))}
    />
  );
}
