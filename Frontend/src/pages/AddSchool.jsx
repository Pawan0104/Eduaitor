import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaLock } from "react-icons/fa";
import { toast } from "react-toastify";
import { MODULES, DEFAULT_MODULES } from "../constants/module.js"; // adjust path
import api from "../config/axios";
import LoadingSpinner from "../components/LoadingSpinner";

const AddSchool = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [form, setForm] = useState({
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
  });

  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── MODULES STATE ─────────────────────────────────
  const [selectedModules, setSelectedModules] = useState(DEFAULT_MODULES);

  // ── LOGO STATE ────────────────────────────────────
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  /* FETCH SUBSCRIPTIONS */
  const fetchSubscriptions = async () => {
    try {
      const res = await api.get(`/subscriptions`);
      setSubscriptions(res.data.data);
    } catch {
      toast.error("Failed to load subscriptions");
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  /* HANDLERS */
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "school_name") {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      setForm((prev) => ({ ...prev, [name]: value, slug: generatedSlug }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // toggle a module checkbox
  const handleModuleToggle = (key) => {
    setSelectedModules((prev) =>
      prev.includes(key)
        ? prev.filter((m) => m !== key)
        : [...prev, key]
    );
  };

  // select all / deselect all
  const handleSelectAll = () => {
    if (selectedModules.length === MODULES.length) {
      setSelectedModules(DEFAULT_MODULES); // reset to defaults
    } else {
      setSelectedModules(MODULES.map((m) => m.key));
    }
  };

  // logo file pick
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.mimetype || file.type)) {
      toast.error("Only jpg, jpeg, png, webp images allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  /* VALIDATE */
  const validate = () => {
    if (!form.school_name.trim()) return "School name is required";
    if (!form.slug.trim())        return "Slug is required";
    if (!form.subscription_plan)  return "Subscription plan is required";
    if (!form.contact_email)      return "Contact email is required";
    if (!form.contact_phone)      return "Contact phone is required";
    if (!form.admin_name.trim())  return "Admin name is required";
    if (!form.admin_email)        return "Admin email is required";
    if (!form.admin_password)     return "Admin password is required";
    if (selectedModules.length === 0) return "Select at least one module";
    return null;
  };

  /* SUBMIT */
  const handleSubmit = async () => {
    const error = validate();
    if (error) return toast.error(error);

    try {
      setLoading(true);

      // must use FormData because of file upload
      const formData = new FormData();

      // append all text fields
      Object.entries(form).forEach(([key, value]) => {
        if (value !== "") formData.append(key, value);
      });

      // append modules as JSON string (controller will JSON.parse it)
      formData.append("subscribed_modules", JSON.stringify(selectedModules));

      // append logo file if selected
      if (logoFile) {
        formData.append("school_logo", logoFile);
      }

      // Shared api client attaches Bearer token (required on Netlify → Render)
      await api.post(`/schools`, formData);

      toast.success("School created successfully");
      navigate("/admin/schools");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error creating school");
    } finally {
      setLoading(false);
    }
  };

  const allSelected = selectedModules.length === MODULES.length;

  return (
    <>
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

      <div className="min-h-screen p-6 flex justify-center">
        <div className="w-full max-w-5xl">
          {/* HEADER */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[rgb(var(--text))]">Create School</h1>
            <p className="text-[rgb(var(--text))] text-sm">
              Fill the details below to onboard a new school
            </p>
          </div>

          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl shadow-sm border border-[rgb(var(--border))]">
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* SCHOOL NAME */}
              <Input
                label="School Name"
                name="school_name"
                placeholder="e.g. Oakridge International School"
                value={form.school_name}
                onChange={handleChange}
                required
              />

              {/* SLUG */}
              <Input
                label="Slug"
                name="slug"
                placeholder="e.g. oakridge-intl"
                value={form.slug}
                onChange={handleChange}
                required
              />

              {/* SUBSCRIPTION PLAN */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-1 block">
                  Subscription Plan
                </label>
                <select
                  name="subscription_plan"
                  value={form.subscription_plan}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                    bg-[rgb(var(--surface))] text-[rgb(var(--text))]
                    focus:outline-none focus:ring-2 transition"
                >
                  <option value="">Select Plan (optional)</option>
                  {subscriptions.map((plan) => (
                    <option key={plan._id} value={plan._id}>
                      {plan.name} — {plan.currency} {plan.price} / {plan.billing_cycle}
                    </option>
                  ))}
                </select>
              </div>

              {/* DATES */}
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

              {/* CONTACT */}
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
                placeholder="+91 98765 43210"
                value={form.contact_phone}
                onChange={handleChange}
                required
              />

              {/* ADDRESS */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-[rgb(var(--text))] mb-1 block">
                  Address
                </label>
                <textarea
                  name="address"
                  placeholder="123 Education Lane, Learning City"
                  value={form.address}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[90px] focus:outline-none focus:ring-2 transition"
                />
              </div>

              {/* ── SCHOOL LOGO ──────────────────────────────── */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-[rgb(var(--text))] mb-2 block">
                  School Logo
                  <span className="text-gray-400 font-normal ml-1">(optional, max 2MB)</span>
                </label>
                <div className="flex items-center gap-4">
                  {/* preview */}
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="logo preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-gray-400 text-center px-1">No logo</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleLogoChange}
                      className="text-sm text-gray-500
                        file:mr-3 file:py-1.5 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-medium
                        file:bg-[rgb(var(--primary))] file:text-white
                        file:cursor-pointer hover:file:opacity-90"
                    />
                    {logoFile && (
                      <button
                        type="button"
                        onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                        className="text-xs text-red-400 hover:text-red-600 text-left"
                      >
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── SUBSCRIBED MODULES ───────────────────────── */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-[rgb(var(--text))]">
                      Module Access
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Select which modules this school can access.
                      Locked modules are enabled by default.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-300
                      hover:bg-gray-50 transition font-medium shrink-0"
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {MODULES.map((mod) => {
                    const isChecked = selectedModules.includes(mod.key);
                    const isDefault = mod.default;

                    return (
                      <label
                        key={mod.key}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer
                          transition select-none
                          ${isChecked
                            ? "border-[rgb(var(--primary))] bg-[rgba(var(--primary),0.08)]"
                            : "border-gray-200 hover:border-gray-300"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleModuleToggle(mod.key)}
                          className="accent-[rgb(var(--primary))] w-4 h-4 shrink-0"
                        />
                        <span className="text-sm font-medium text-[rgb(var(--text))] leading-tight break-words min-w-0">
                          {mod.label}
                        </span>
                        {isDefault && (
                          <FaLock
                            size={10}
                            className="text-gray-400 ml-auto shrink-0"
                            title="Core module"
                          />
                        )}
                      </label>
                    );
                  })}
                </div>

                <p className="text-xs text-gray-400 mt-2">
                  {selectedModules.length} of {MODULES.length} modules selected
                </p>
              </div>

              {/* ── SCHOOL ADMIN SECTION ─────────────────────── */}
              <div className="md:col-span-2 mt-2">
                <h3 className="text-lg font-semibold text-[rgb(var(--text))] border-b pb-2">
                  School Admin Login
                </h3>
              </div>

              <Input
                label="Admin Name (must be unique)"
                name="admin_name"
                placeholder="Full Name"
                value={form.admin_name}
                onChange={handleChange}
                required
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
                    py-2 text-sm focus:outline-none focus:ring-2 transition"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

            </div>

            {/* FOOTER */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-between items-stretch sm:items-center px-4 sm:px-8 py-6 border-t
              bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-b-2xl">
              <button
                onClick={() => navigate("/admin/schools")}
                className="app-btn app-btn-secondary w-full sm:w-auto min-h-11"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="app-btn app-btn-primary w-full sm:w-auto min-h-11"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" label="" inline />
                    Saving…
                  </>
                ) : (
                  "Create School"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const Input = ({ label, type = "text", placeholder, required = false, ...props }) => (
  <div>
    <label className="text-sm font-medium text-[rgb(var(--text))] mb-1 block">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      placeholder={placeholder}
      {...props}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
        focus:outline-none focus:ring-2 transition"
    />
  </div>
);

export default AddSchool;