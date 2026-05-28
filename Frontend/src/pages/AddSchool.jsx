import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

import { toast } from "react-toastify";

const API = import.meta.env.VITE_API_URL;

const AddSchool = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const emptyForm = {
    school_name: "",
    slug: "",
    subscription_plan: "",
    start_date: "",
    end_date: "",
    address: "",
    contact_email: "",
    contact_phone: "",
    admin_name: "",
    admin_email: "",
    admin_password: "",
    status: "Active",
  };

  const [form, setForm] = useState(emptyForm);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);

  /* FETCH */
  const fetchSubscriptions = async () => {
    try {
      const res = await axios.get(`${API}/subscriptions`);
      setSubscriptions(res.data.data);
    } catch {
      toast.error("Failed to load subscriptions");
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Auto-generate slug if school_name changes
    if (name === "school_name") {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      setForm((prev) => ({
        ...prev,
        [name]: value,
        slug: generatedSlug,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const validate = () => {
    if (!form.school_name.trim()) return "School name is required";
    if (!form.slug.trim()) return "Slug is required";
    if (!form.subscription_plan) return "Select subscription plan";
    if (!form.contact_email) return "Email is required";
    if (!form.contact_phone) return "Phone is required";
    if (!form.admin_email) return "Admin email required";
    if (!form.admin_password) return "Admin password required";
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) return toast.error(error);

    try {
      setLoading(true);
      await axios.post(`${API}/schools`, form);
      toast.success("School created successfully");
      navigate("/admin/schools");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error creating school");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
      <div className="min-h-screen  p-6 flex justify-center">
        <div className="w-full max-w-5xl">
          {/* HEADER */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[rgb(var(--text))]">Create School</h1>
            <p className="text-[rgb(var(--text))] text-sm">
              Fill the details below to onboard a new school
            </p>
          </div>

          {/* CARD */}
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl shadow-sm border border-[rgb(var(--border))]">
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="School Name"
                name="school_name"
                placeholder="e.g. Oakridge International School"
                value={form.school_name}
                onChange={handleChange}
                required
              />

              <Input
                label="Slug"
                name="slug"
                placeholder="e.g. oakridge-intl"
                value={form.slug}
                onChange={handleChange}
                required
              />

              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-1 block">
                  Subscription Plan <span className="text-red-500">*</span>
                </label>
                <select
                  name="subscription_plan"
                  value={form.subscription_plan}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm 
                    bg-[rgb(var(--surface))] text-[rgb(var(--text))]
                  focus:outline-none focus:ring-2  transition"
                >
                  <option value="">Select Plan</option>
                  {subscriptions.map((plan) => (
                    <option key={plan._id} value={plan._id}>
                      {plan.name} — {plan.currency} {plan.price} /{" "}
                      {plan.billing_cycle}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                type="date"
                label="Start Date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
              />
              <Input
                type="date"
                label="End Date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
              />

              <Input
                label="Contact Email"
                type="email"
                name="contact_email"
                placeholder="contact@school.edu"
                value={form.contact_email}
                onChange={handleChange}
                required
              />
              <Input
                label="Contact Phone"
                name="contact_phone"
                placeholder="+1 234 567 890"
                value={form.contact_phone}
                onChange={handleChange}
                required
              />

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-[rgb(var(--text))] mb-1 block">
                  Address
                </label>
                <textarea
                  name="address"
                  placeholder="123 Education Lane, Learning City, 10001"
                  value={form.address}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-22.5 focus:outline-none focus:ring-2  transition"
                />
              </div>

              <div className="md:col-span-2 mt-6">
                <h3 className="text-lg font-semibold text-[rgb(var(--text))] border-b pb-2">
                  School Admin Login
                </h3>
              </div>

              <Input
                label="Admin Name"
                name="admin_name"
                placeholder="Full Name"
                value={form.admin_name}
                onChange={handleChange}
              />
              <Input
                label="Admin Email"
                type="email"
                name="admin_email"
                placeholder="admin@school.edu"
                value={form.admin_email}
                onChange={handleChange}
                required
              />
              <Input
                type="password"
                label="Admin Password"
                name="admin_password"
                placeholder="••••••••"
                value={form.admin_password}
                onChange={handleChange}
                required
              />

              <div>
                <label className="text-sm font-medium text-[rgb(var(--text))] mb-1 block">
                  Status
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 
                  bg-[rgb(var(--surface))] text-[rgb(var(--text))]
                  py-2 text-sm focus:outline-none focus:ring-2  transition"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center px-8 py-6 border-t bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-b-2xl">
              <button
                onClick={() => navigate("/admin/schools")}
                className="px-5 py-2 border border-gray-300 rounded-lg transition"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-[rgb(var(--primary))] text-[rgb(var(--text))] rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {loading ? "Saving..." : "Create School"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const Input = ({
  label,
  type = "text",
  placeholder,
  required = false,
  ...props
}) => (
  <div>
    <label className="text-sm font-medium text-[rgb(var(--text))] mb-1 block">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      placeholder={placeholder}
      {...props}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2  transition"
    />
  </div>
);

export default AddSchool;
