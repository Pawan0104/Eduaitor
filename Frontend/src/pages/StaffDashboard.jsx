import React from "react";
import { useNavigate } from "react-router-dom";
import { FaIdCard } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import LibrarianDashboard from "./LibrarianDashboard";
import SchoolDashboard from "./SchoolDashboard";

function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
          <div className="p-6 bg-white rounded-lg shadow-sm">
            {idCardBtn}
            <h2 className="text-2xl font-semibold mb-3">{roleLabel} Dashboard</h2>
            <p className="text-sm text-gray-600 mb-4">
              Welcome to your staff dashboard. Use the menu to access your
              assigned modules and manage your daily tasks.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-xl bg-gray-50">
                <h3 className="font-semibold mb-2">Assigned Role</h3>
                <p className="text-sm text-gray-700">{roleLabel}</p>
              </div>
              <div className="p-4 border rounded-xl bg-gray-50">
                <h3 className="font-semibold mb-2">Quick access</h3>
                <p className="text-sm text-gray-700">
                  Open the sidebar to access students, attendance, fees,
                  library, and other modules assigned to you.
                </p>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default StaffDashboard
