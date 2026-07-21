import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaBook,
  FaBus,
  FaIdCard,
  FaTachometerAlt,
  FaUserGraduate,
  FaUsers,
} from "react-icons/fa";
import { FiCalendar, FiCheckSquare, FiCreditCard, FiSettings } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import LibrarianDashboard from "./LibrarianDashboard";
import SchoolDashboard from "./SchoolDashboard";
import RoleCampusDashboard from "../components/dashboards/RoleCampusDashboard";
import DashboardLayoutPicker, {
  useDashboardLayout,
} from "../components/dashboards/DashboardLayoutPicker";

function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [layout, setLayout] = useDashboardLayout();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const roleLabel = user?.staffRole
    ? user.staffRole.charAt(0).toUpperCase() + user.staffRole.slice(1)
    : "Staff";

  const idCardBtn = (
    <button
      type="button"
      onClick={() => navigate("/staff/id-card")}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium mb-4"
    >
      <FaIdCard /> Download My ID Card
    </button>
  );

  const staffModules = [
    { label: "Students", path: "/staff/students", icon: FaUserGraduate },
    { label: "Attendance", path: "/staff/attendance", icon: FiCheckSquare },
    { label: "Fees", path: "/staff/fees", icon: FiCreditCard },
    { label: "Library", path: "/staff/library", icon: FaBook },
    { label: "Transport", path: "/staff/transport", icon: FaBus },
    { label: "Staff", path: "/staff/staff", icon: FaUsers },
    { label: "Notices", path: "/staff/notice", icon: FaBell },
    { label: "Calendar", path: "/staff/calendar", icon: FiCalendar },
  ];

  const staffSummaries = [
    {
      title: "My Role",
      tone: "blue",
      path: "/staff/dashboard",
      rows: [
        ["Role", roleLabel],
        ["Portal", "Staff"],
        ["Access", "Assigned modules"],
      ],
    },
    {
      title: "Daily Work",
      tone: "green",
      path: "/staff/students",
      rows: [
        ["Students", "Open module"],
        ["Attendance", "Mark / report"],
        ["Fees", "Collect / view"],
      ],
    },
    {
      title: "Operations",
      tone: "orange",
      path: "/staff/library",
      rows: [
        ["Library", "Books & issues"],
        ["Transport", "Routes"],
        ["Notices", "School updates"],
      ],
    },
    {
      title: "Profile",
      tone: "violet",
      path: "/staff/id-card",
      rows: [
        ["ID Card", "Download"],
        ["Notifications", "Alerts"],
        ["Help", "Support"],
      ],
    },
  ];

  return (
    <div>
      {user?.staffRole === "librarian" && (
        <div className="p-4">
          {idCardBtn}
          <LibrarianDashboard />
        </div>
      )}
      {user?.staffRole === "administrator" && (
        <div>
          <div className="px-4 pt-4">{idCardBtn}</div>
          <SchoolDashboard />
        </div>
      )}

      {user?.staffRole !== "librarian" &&
        user?.staffRole !== "administrator" && (
          <div className="min-h-screen p-4 sm:p-6">
            {idCardBtn}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[rgb(var(--text))]">
                  {roleLabel} Dashboard
                </h2>
                <p className="text-sm text-[rgb(var(--text-muted))]">
                  Welcome to your staff dashboard. Use Classic or Campus layout
                  from settings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3 text-sm font-bold text-[rgb(var(--text))]"
              >
                <FiSettings />
                Dashboard Settings
              </button>
            </div>

            {settingsOpen && (
              <div className="mb-5 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
                <DashboardLayoutPicker
                  layout={layout}
                  onLayoutChange={setLayout}
                />
              </div>
            )}

            {layout === "campus" ? (
              <RoleCampusDashboard
                roleLabel={roleLabel}
                profilePath="/staff/id-card"
                menuPath="/staff/dashboard"
                summaries={staffSummaries}
                modules={staffModules}
                showStatBars={false}
                showFeeTrend={false}
                showNotices={false}
                showEvents={false}
              />
            ) : (
              <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-sm">
                <div className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--text-muted))]">
                  <FaTachometerAlt />
                  Classic staff hub
                </div>
                <p className="mb-4 text-sm text-[rgb(var(--text-muted))]">
                  Use the menu to access your assigned modules and manage your
                  daily tasks.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
                    <h3 className="mb-2 font-semibold text-[rgb(var(--text))]">
                      Assigned Role
                    </h3>
                    <p className="text-sm text-[rgb(var(--text-muted))]">
                      {roleLabel}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
                    <h3 className="mb-2 font-semibold text-[rgb(var(--text))]">
                      Quick access
                    </h3>
                    <p className="text-sm text-[rgb(var(--text-muted))]">
                      Open the sidebar to access students, attendance, fees,
                      library, and other modules assigned to you.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
}

export default StaffDashboard;
