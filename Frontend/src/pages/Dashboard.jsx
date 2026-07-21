import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaUserShield, FaUsers, FaSchool, FaBook } from "react-icons/fa";
import { FaArrowLeft } from "react-icons/fa";
import { FiSettings } from "react-icons/fi";
import RoleCampusDashboard from "../components/dashboards/RoleCampusDashboard";
import DashboardLayoutPicker, {
  useDashboardLayout,
} from "../components/dashboards/DashboardLayoutPicker";

const API = import.meta.env.VITE_API_URL;

const Dashboard = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const [layout, setLayout] = useDashboardLayout();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);

  const fetchData = async () => {
    try {
      const rolesRes = await axios.get(`${API}/roles`);
      const usersRes = await axios.get(`${API}/access`);

      setRoles(rolesRes.data.data);
      setUsers(usersRes.data.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeRoles = roles.filter((r) => r.status === "Active").length;
  const inactiveRoles = roles.filter((r) => r.status === "Inactive").length;

  const activeUsers = users.filter((u) => u.status === "Active").length;
  const inactiveUsers = users.filter((u) => u.status === "Inactive").length;

  const campusSummaries = [
    {
      title: "Roles",
      tone: "violet",
      path: "/admin/roles",
      rows: [
        ["Total", roles.length],
        ["Active", activeRoles],
        ["Inactive", inactiveRoles],
      ],
    },
    {
      title: "Users",
      tone: "blue",
      path: "/admin/access-control",
      rows: [
        ["Total", users.length],
        ["Active", activeUsers],
        ["Inactive", inactiveUsers],
      ],
    },
    {
      title: "Schools",
      tone: "green",
      path: "/admin/schools",
      rows: [
        ["Directory", "All schools"],
        ["Add", "New school"],
        ["Plans", "Subscriptions"],
      ],
    },
    {
      title: "Platform",
      tone: "orange",
      path: "/admin/syllabus-catalog",
      rows: [
        ["Catalog", "Syllabus"],
        ["Messages", "Inbox"],
        ["Access", "Control"],
      ],
    },
  ];

  const campusModules = [
    { label: "Roles", path: "/admin/roles", icon: FaUserShield },
    { label: "Access", path: "/admin/access-control", icon: FaUsers },
    { label: "Schools", path: "/admin/schools", icon: FaSchool },
    { label: "Syllabus", path: "/admin/syllabus-catalog", icon: FaBook },
  ];

  return (
    <div className="p-6">
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="mb-2.5 flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 shadow-sm transition-transform active:scale-95"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-[rgb(var(--text))]">
          Dashboard
        </h1>
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
        <div className="mb-6 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
          <DashboardLayoutPicker layout={layout} onLayoutChange={setLayout} />
        </div>
      )}

      {layout === "campus" ? (
        <RoleCampusDashboard
          roleLabel="Super Admin"
          profilePath="/admin/dashboard"
          menuPath="/admin/dashboard"
          summaries={campusSummaries}
          modules={campusModules}
          showStatBars
          showFeeTrend={false}
          showNotices={false}
          showEvents={false}
          statBarsTitle="Platform Snapshot"
          statBars={[
            { label: "Roles", value: roles.length, color: "bg-violet-500" },
            { label: "Active", value: activeRoles, color: "bg-emerald-500" },
            { label: "Users", value: users.length, color: "bg-sky-500" },
            { label: "Active U", value: activeUsers, color: "bg-amber-500" },
          ]}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div
            onClick={() => navigate("/admin/roles")}
            className="cursor-pointer rounded-xl bg-[rgb(var(--surface))] p-6 text-[rgb(var(--text))] shadow transition hover:shadow-lg"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Roles</h2>
              <FaUserShield className="text-3xl text-indigo-500" />
            </div>
            <p className="mb-3 text-3xl font-bold">{roles.length}</p>
            <div className="flex gap-6 text-sm text-gray-600">
              <span className="text-green-600">Active: {activeRoles}</span>
              <span className="text-red-500">Inactive: {inactiveRoles}</span>
            </div>
          </div>

          <div
            onClick={() => navigate("/admin/access-control")}
            className="cursor-pointer rounded-xl bg-[rgb(var(--surface))] p-6 text-[rgb(var(--text))] shadow transition hover:shadow-lg"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Users</h2>
              <FaUsers className="text-3xl text-blue-500" />
            </div>
            <p className="mb-3 text-3xl font-bold">{users.length}</p>
            <div className="flex gap-6 text-sm text-[rgb(var(--text))]">
              <span className="text-green-600">Active: {activeUsers}</span>
              <span className="text-red-500">Inactive: {inactiveUsers}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
