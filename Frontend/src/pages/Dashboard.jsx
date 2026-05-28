import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaChartLine, FaUserShield, FaUsers } from "react-icons/fa";
import { FaArrowLeft } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

const Dashboard = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

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

  return (
    <div className="p-6">
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                 bg-white shadow-sm border border-slate-100
                 text-sm font-bold text-slate-600 active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Roles Card */}

        <div
          onClick={() => navigate("/admin/roles")}
          className="cursor-pointer bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl shadow p-6 hover:shadow-lg transition"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Roles</h2>

            <FaUserShield className="text-indigo-500 text-3xl" />
          </div>

          <p className="text-3xl font-bold mb-3">{roles.length}</p>

          <div className="text-sm text-gray-600 flex gap-6">
            <span className="text-green-600">Active: {activeRoles}</span>

            <span className="text-red-500">Inactive: {inactiveRoles}</span>
          </div>
        </div>

        {/* Users Card */}

        <div
          onClick={() => navigate("/admin/access-control")}
          className="cursor-pointer bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl shadow p-6 hover:shadow-lg transition"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Users</h2>

            <FaUsers className="text-blue-500 text-3xl" />
          </div>

          <p className="text-3xl font-bold mb-3">{users.length}</p>

          <div className="text-sm text-[rgb(var(--text))] flex gap-6">
            <span className="text-green-600">Active: {activeUsers}</span>

            <span className="text-red-500">Inactive: {inactiveUsers}</span>
          </div>
        </div>

        <div
          onClick={() => navigate("/admin/platform-analytics")}
          className="cursor-pointer bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl shadow p-6 hover:shadow-lg transition"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Platform Analytics</h2>

            <FaChartLine className="text-violet-500 text-3xl" />
          </div>

          <p className="text-3xl font-bold mb-3">School Health</p>

          <div className="text-sm text-[rgb(var(--text))] flex gap-6">
            <span className="text-violet-600">KPIs</span>

            <span className="text-slate-500">Actions</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
