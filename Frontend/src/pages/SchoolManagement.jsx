import { useEffect, useState } from "react";
import { FaPlus, FaEye, FaEdit, FaTrash, FaArrowLeft, FaLock, FaKey } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { MODULES } from "../constants/module.js"; 
import api from "../config/axios";

const SchoolManagement = () => {
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

  const [schools, setSchools] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedModules, setSelectedModules] = useState([]);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [changePassword, setChangePassword] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);

  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  /* ── FETCH ──────────────────────────────────────── */
  const fetchSchools = async () => {
    try {
      const res = await api.get(`/schools`);
      setSchools(res.data.data);
    } catch {
      toast.error("Failed to load schools");
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await api.get(`/subscriptions`);
      setSubscriptions(res.data.data);
    } catch {
      toast.error("Failed to load subscriptions");
    }
  };

  useEffect(() => {
    fetchSchools();
    fetchSubscriptions();
  }, []);

  /* ── FORM CHANGE ────────────────────────────────── */
  const handleChange = (e) => {
    setDirty(true);
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleModuleToggle = (key) => {
    setDirty(true);
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    setDirty(true);
    if (selectedModules.length === MODULES.length) {
      setSelectedModules([]);
    } else {
      setSelectedModules(MODULES.map((m) => m.key));
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.type)) {
      toast.error("Only jpg, jpeg, png, webp images allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setDirty(true);
  };

  /* ── EDIT — prefill everything ──────────────────── */
  const editSchool = (school) => {
    setForm({
      school_name:       school.school_name || "",
      slug:              school.slug || "",
      subscription_plan: school.subscription_plan?._id || "",
      start_date:        school.start_date?.slice(0, 10) || "",
      end_date:          school.end_date?.slice(0, 10) || "",
      address:           school.address || "",
      contact_email:     school.contact_email || "",
      contact_phone:     school.contact_phone || "",
      admin_name:        school.admin_name || "",
      admin_email:       school.admin_email || "",
      admin_password:    "",
      status:            school.status || "Active",
    });

    // prefill modules from school record
    setSelectedModules(school.subscribed_modules || []);

    // prefill logo preview from Cloudinary URL
    setLogoPreview(school.school_logo || null);
    setLogoFile(null);

    setChangePassword(false);
    setEditingId(school._id);
    setShowModal(true);
    setDirty(false);
  };

  /* ── VALIDATE ───────────────────────────────────── */
  const validate = () => {
    if (!form.school_name.trim())  return "School name is required";
    if (!form.slug.trim())         return "Slug is required";
    if (!form.contact_email.trim()) return "Contact email is required";
    if (!form.contact_phone.trim()) return "Contact phone is required";
    if (!form.admin_email.trim())  return "Admin email is required";
    if (changePassword && !form.admin_password.trim())
                                   return "Enter new password or cancel password change";
    if (selectedModules.length === 0) return "Select at least one module";
    return null;
  };

  /* ── SAVE (edit only) ───────────────────────────── */
  const handleSave = () => {
    const error = validate();
    if (error) return toast.error(error);

    setConfirmMessage("Update this school?");
    setConfirmAction(() => async () => {
      try {
        setLoading(true);

        const formData = new FormData();

        // append text fields
        Object.entries(form).forEach(([key, value]) => {
          // skip password if not changing
          if (key === "admin_password" && !changePassword) return;
          if (value !== "") formData.append(key, value);
        });

        // modules as JSON string
        formData.append("subscribed_modules", JSON.stringify(selectedModules));

        // new logo if picked
        if (logoFile) {
          formData.append("school_logo", logoFile);
        }

        await api.put(`/schools/${editingId}`, formData);

        toast.success("School updated successfully");
        setShowModal(false);
        resetModal();
        fetchSchools();
      } catch (err) {
        toast.error(err.response?.data?.message || "Error updating school");
      } finally {
        setLoading(false);
      }
    });

    setConfirmModal(true);
  };

  /* ── DELETE ─────────────────────────────────────── */
  const deleteSchool = (id) => {
    setConfirmMessage("Delete this school permanently? This cannot be undone.");
    setConfirmAction(() => async () => {
      try {
        await api.delete(`/schools/${id}`);
        toast.success("School deleted");
        fetchSchools();
      } catch {
        toast.error("Failed to delete school");
      }
    });
    setConfirmModal(true);
  };

  /* ── RESET + CLOSE ──────────────────────────────── */
  const resetModal = () => {
    setForm(emptyForm);
    setSelectedModules([]);
    setLogoFile(null);
    setLogoPreview(null);
    setChangePassword(false);
    setEditingId(null);
    setDirty(false);
  };

  const closeModal = () => {
    if (dirty) {
      setConfirmMessage("Discard unsaved changes?");
      setConfirmAction(() => () => {
        setShowModal(false);
        resetModal();
      });
      setConfirmModal(true);
    } else {
      setShowModal(false);
      resetModal();
    }
  };

  const allSelected = selectedModules.length === MODULES.length;

  return (
    <div className="p-4 md:p-6 min-h-screen">

      {/* BACK — mobile */}
      {isMobile && (
        <div className="pt-2 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
              bg-white shadow-sm border border-slate-100
              text-sm font-bold text-slate-600 active:scale-95 transition-transform"
          >
            <FaArrowLeft size={14} />
            Back
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[rgb(var(--text))]">
            School Management
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{schools.length} school(s) registered</p>
        </div>
        <button
          onClick={() => navigate("/admin/add-school")}
          className="flex items-center gap-2 bg-[rgb(var(--primary))] text-white
            px-4 py-2 rounded-lg shadow text-sm font-medium"
        >
          <FaPlus size={12} />
          Add School
        </button>
      </div>

      {/* TABLE */}
      <div className="rounded-xl overflow-hidden border border-[rgb(var(--border))] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] border-b border-[rgb(var(--border))]">
              <tr>
                <th className="p-4 text-left">School</th>
                <th className="p-4 text-left">Plan</th>
                <th className="p-4 text-left">Modules</th>
                <th className="p-4 text-left">End Date</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    No schools found. Click "Add School" to create one.
                  </td>
                </tr>
              )}
              {schools.map((school) => (
                <tr
                  key={school._id}
                  className="border-t border-[rgb(var(--border))]
                    bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                >
                  {/* logo + name */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg overflow-hidden border border-gray-200 shrink-0 bg-gray-100 flex items-center justify-center">
                        {school.school_logo ? (
                          <img
                            src={school.school_logo}
                            alt={school.school_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-gray-400 font-bold">
                            {school.school_name?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium leading-tight">{school.school_name}</p>
                        <p className="text-xs text-gray-400">{school.contact_email}</p>
                      </div>
                    </div>
                  </td>

                  {/* plan */}
                  <td className="p-4">
                    <span className="bg-indigo-100 text-indigo-600 px-2 py-1 rounded text-xs font-medium">
                      {school.subscription_plan?.name || "—"}
                    </span>
                  </td>

                  {/* modules count */}
                  <td className="p-4">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {school.subscribed_modules?.length || 0} modules
                    </span>
                  </td>

                  {/* end date */}
                  <td className="p-4 text-gray-500">
                    {school.end_date?.slice(0, 10) || "—"}
                  </td>

                  {/* status */}
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium
                      ${school.status === "Active"
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-500"}`}
                    >
                      {school.status}
                    </span>
                  </td>

                  {/* actions */}
                  <td className="p-4">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => navigate(`/admin/school-view/${school._id}`)}
                        className="text-indigo-500 hover:text-indigo-700 transition hover:scale-110"
                        title="View"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => editSchool(school)}
                        className="text-blue-500 hover:text-blue-700 transition hover:scale-110"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => deleteSchool(school._id)}
                        className="text-red-500 hover:text-red-700 transition hover:scale-110"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── EDIT MODAL ───────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl
            shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">

            {/* modal header */}
            <div className="px-6 py-4 border-b border-[rgb(var(--border))] shrink-0">
              <h2 className="text-lg font-semibold">Edit School</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Update school info, modules, and logo
              </p>
            </div>

            {/* scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

              {/* ── LOGO ── */}
              <div>
                <p className="text-sm font-semibold mb-2">School Logo</p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300
                    flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-gray-400 text-center px-1">No logo</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleLogoChange}
                      className="text-sm text-gray-500
                        file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0
                        file:text-sm file:font-medium file:bg-[rgb(var(--primary))]
                        file:text-white file:cursor-pointer hover:file:opacity-90"
                    />
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={() => { setLogoFile(null); setLogoPreview(null); setDirty(true); }}
                        className="text-xs text-red-400 hover:text-red-600 text-left"
                      >
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── BASIC INFO ── */}
              <div>
                <p className="text-sm font-semibold mb-3">Basic Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ModalInput label="School Name" name="school_name" value={form.school_name} onChange={handleChange} required />
                  <ModalInput label="Slug" name="slug" value={form.slug} onChange={handleChange} required />
                  <ModalInput label="Contact Email" name="contact_email" type="email" value={form.contact_email} onChange={handleChange} required />
                  <ModalInput label="Contact Phone" name="contact_phone" value={form.contact_phone} onChange={handleChange} required />
                  <ModalInput label="Start Date" name="start_date" type="date" value={form.start_date} onChange={handleChange} />
                  <ModalInput label="End Date" name="end_date" type="date" value={form.end_date} onChange={handleChange} />

                  {/* subscription plan */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">
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

                  {/* status */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                        bg-[rgb(var(--surface))] text-[rgb(var(--text))]
                        focus:outline-none focus:ring-2 transition"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  {/* address full width */}
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Address</label>
                    <textarea
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                        focus:outline-none focus:ring-2 transition resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* ── ADMIN CREDENTIALS ── */}
              <div>
                <p className="text-sm font-semibold mb-3">Admin Credentials</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ModalInput label="Admin Name" name="admin_name" value={form.admin_name} onChange={handleChange} />
                  <ModalInput label="Admin Email" name="admin_email" type="email" value={form.admin_email} onChange={handleChange} required />

                  {/* password toggle */}
                  <div className="sm:col-span-2">
                    {!changePassword ? (
                      <button
                        type="button"
                        onClick={() => setChangePassword(true)}
                        className="flex items-center gap-2 text-sm text-[rgb(var(--primary))]
                          font-medium hover:underline"
                      >
                        <FaKey size={12} />
                        Change Admin Password
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <ModalInput
                          label="New Password"
                          name="admin_password"
                          type="password"
                          value={form.admin_password}
                          onChange={handleChange}
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setChangePassword(false);
                            setForm((p) => ({ ...p, admin_password: "" }));
                          }}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Cancel password change
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── MODULE ACCESS ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold">Module Access</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selectedModules.length} of {MODULES.length} modules enabled
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-300
                      hover:bg-gray-50 transition font-medium"
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {MODULES.map((mod) => {
                    const isChecked = selectedModules.includes(mod.key);
                    return (
                      <label
                        key={mod.key}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer
                          transition select-none text-sm
                          ${isChecked
                            ? "border-[rgb(var(--primary))] bg-[rgba(var(--primary),0.08)]"
                            : "border-gray-200 hover:border-gray-300"}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleModuleToggle(mod.key)}
                          className="accent-[rgb(var(--primary))] w-4 h-4 shrink-0"
                        />
                        <span className="font-medium leading-tight">{mod.label}</span>
                        {mod.default && (
                          <FaLock size={9} className="text-gray-400 ml-auto shrink-0" title="Core module" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* modal footer */}
            <div className="flex justify-between items-center px-6 py-4
              border-t border-[rgb(var(--border))] shrink-0">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-5 py-2 bg-[rgb(var(--primary))] text-white rounded-lg
                  text-sm font-medium shadow-sm transition disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM POPUP ────────────────────────────── */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]
            rounded-xl p-6 w-full max-w-sm shadow-xl">
            <p className="text-base font-medium mb-1">Are you sure?</p>
            <p className="text-sm text-gray-400 mb-6">{confirmMessage}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmAction();
                  setConfirmModal(false);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium transition hover:bg-red-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── REUSABLE MODAL INPUT ───────────────────────── */
const ModalInput = ({ label, type = "text", required = false, placeholder, ...props }) => (
  <div>
    <label className="text-xs font-medium text-gray-500 mb-1 block">
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

export default SchoolManagement;