import { useEffect, useState } from "react";
import axios from "axios";
import { FaSchool, FaUsers, FaCalendarAlt, FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {FaArrowLeft} from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

const Schools = () => {
  const navigate = useNavigate();
    const isMobile = window.innerWidth <= 768;

  const [schools, setSchools] = useState([]);

  /* ---------------- FETCH ---------------- */

  const fetchSchools = async () => {
    try {
      const res = await axios.get(`${API}/schools`);
      setSchools(res.data.data);
    } catch {
      toast.error("Failed to fetch schools");
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  /* ---------------- STATS ---------------- */

  const totalSchools = schools.length;

  const activeSchools = schools.filter((s) => s.status === "Active").length;

  const totalPlans = schools.filter((s) => s.subscription_plan).length;

  const activePlans = schools.filter(
    (s) => s.subscription_plan && s.subscription_plan.status === "Active"
  ).length;

  return (
    <div className="p-6 space-y-6">
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

      {/* HEADER */}

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--text))]">
          Schools Dashboard
        </h1>

        <p className="text-[rgb(var(--text))] text-sm">
          Manage all schools and their subscriptions
        </p>
      </div>

      {/* STAT CARDS */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        <StatCard
          icon={<FaSchool />}
          title="Total Schools"
          value={totalSchools}
          color="bg-indigo-100 text-indigo-600"
        />

        <StatCard
          icon={<FaUsers />}
          title="Active Schools"
          value={activeSchools}
          color="bg-green-100 text-green-600"
        />

        <StatCard
          icon={<FaCalendarAlt />}
          title="Total Subscription Plans"
          value={totalPlans}
          color="bg-blue-100 text-blue-600"
        />

        <StatCard
          icon={<FaCalendarAlt />}
          title="Active Subscription Plans"
          value={activePlans}
          color="bg-purple-100 text-purple-600"
        />

      </div>

      {/* SCHOOL CARDS */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        {schools.map((school) => (
          <div
            key={school._id}
            className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl shadow hover:shadow-lg transition p-5 flex flex-col justify-between"
          >

            {/* HEADER */}

            <div className="flex justify-between items-start mb-4">

              <div>
                <h2 className="text-lg font-semibold text-[rgb(var(--text))]">
                  {school.school_name}
                </h2>

                <p className="text-xs text-[rgb(var(--text))]">
                  {school.slug}
                </p>
              </div>

              <span
                className={`text-xs px-3 py-1 rounded-full
                ${
                  school.status === "Active"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {school.status}
              </span>

            </div>

            {/* SUBSCRIPTION */}

            {school.subscription_plan && (
              <div className=" border border-indigo-100 rounded-lg p-3 mb-4">

                <p className="text-sm font-medium text-[rgb(var(--primary))]">
                  {school.subscription_plan?.name}
                </p>

                <p className="text-xs text-[rgb(var(--text))]">
                  {school.subscription_plan?.currency}{" "}
                  {school.subscription_plan?.price}
                  {" / "}
                  {school.subscription_plan?.billing_cycle}
                </p>

              </div>
            )}

            {/* DETAILS */}

            <div className="text-sm text-[rgb(var(--text))] space-y-1">

              <p>
                <span className="text-[rgb(var(--text))]">Start:</span>{" "}
                {school.start_date?.slice(0, 10)}
              </p>

              <p>
                <span className="text-[rgb(var(--text))]">End:</span>{" "}
                {school.end_date?.slice(0, 10)}
              </p>

              <p>
                <span className="text-[rgb(var(--text))]">Email:</span>{" "}
                {school.contact_email}
              </p>

              <p>
                <span className="text-[rgb(var(--text))]">Phone:</span>{" "}
                {school.contact_phone}
              </p>

            </div>

            {/* ADDRESS */}

            <p className="text-xs text-[rgb(var(--text))] mt-3 line-clamp-2">
              {school.address}
            </p>

            {/* ACTION */}

            <div className="flex justify-end mt-5">

              <button
                onClick={() => navigate(`/admin/school-view/${school._id}`)}
                className="flex items-center gap-2 text-[rgb(var(--primary))] hover:text-[rgb(var(--primary-dark))] text-sm font-medium"
              >
                <FaEye />
                View Info
              </button>

            </div>

          </div>
        ))}

      </div>

    </div>
  );
};

export default Schools;


/* ---------------- STAT CARD ---------------- */

const StatCard = ({ icon, title, value, color }) => (
  <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl shadow p-5 flex items-center justify-between">

    <div>
      <p className="text-sm text-[rgb(var(--text))] mb-1">
        {title}
      </p>

      <h2 className="text-2xl font-bold text-[rgb(var(--text))]">
        {value}
      </h2>
    </div>

    <div className={`p-3 rounded-lg text-xl ${color}`}>
      {icon}
    </div>

  </div>
);
