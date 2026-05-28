import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

const SchoolView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [school, setSchool] = useState(null);

  const fetchSchool = async () => {
    const res = await axios.get(`${API}/schools/${id}`);

    setSchool(res.data.data);
  };

  useEffect(() => {
    fetchSchool();
  }, []);

  if (!school) return null;

  return (
    <div className="p-4 min-h-screen">
      <button
        onClick={() => navigate("/admin/schools")}
        className="flex items-center gap-2 text-indigo-600 mb-6"
      >
        <FaArrowLeft />
        Back to Schools
      </button>

      {/* HEADER */}

      <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl shadow p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">{school.school_name}</h1>

        <p className="text-[rgb(var(--text))] text-sm">{school.address}</p>
      </div>

      {/* SCHOOL DETAILS */}

      <div className="grid md:grid-cols-3 gap-6">
        <Info label="Slug" value={school.slug} />
        <Info label="Email" value={school.contact_email} />
        <Info label="Phone" value={school.contact_phone} />
        <Info label="Start Date" value={school.start_date?.slice(0, 10)} />
        <Info label="End Date" value={school.end_date?.slice(0, 10)} />
        <Info label="Status" value={school.status} />
      </div>

      {/* SUBSCRIPTION */}

      <div className="mt-8 bg-[rgb(var(--surface))] text-[rgb(var(--text))] shadow rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-6">Subscription Plan</h2>

        <p className="font-medium">{school.subscription_plan?.name}</p>

        <p className="text-[rgb(var(--text))] text-sm">
          {school.subscription_plan?.currency} {school.subscription_plan?.price}{" "}
          / {school.subscription_plan?.billing_cycle}
        </p>
      </div>

      {/* ADMIN LOGIN */}

      <div className="mt-8 bg-[rgb(var(--surface))] text-[rgb(var(--text))] shadow rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-6">School Admin Login</h2>

        <div className="grid md:grid-cols-3 gap-6">
          <Info label="Admin Name" value={school.admin_name} />
          <Info label="Admin Email" value={school.admin_email} />
          <Info label="Password" value={school.admin_password} />
        </div>
      </div>
    </div>
  );
};

export default SchoolView;

/* INFO CARD */

const Info = ({ label, value }) => (
  <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl shadow p-5">
    <p className="text-sm text-[rgb(var(--text))] mb-1">{label}</p>

    <p className="font-medium text-[rgb(var(--text))]">{value}</p>
  </div>
);
