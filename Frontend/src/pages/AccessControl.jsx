import { useState, useEffect } from "react";
import { FaSearch, FaEdit, FaLock, FaLockOpen, FaUserCog } from "react-icons/fa";
import { toast } from "react-toastify";
import { MODULES, MODULE_KEYS } from "../constants/module.js";
import api from "../config/axios";

const EMPTY_LOGO =
  "https://ui-avatars.com/api/?name=E&background=6d28d9&color=fff&size=64";

const AccessControl = () => {
  const [schools, setSchools] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [selectedModules, setSelectedModules] = useState([]);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({
    admin_name: "",
    admin_email: "",
    admin_password: "",
    admin_confirm: "",
  });
  const [adminSaving, setAdminSaving] = useState(false);

  const fetchSchools = async () => {
    try {
      const res = await api.get(`/schools`);
      setSchools(res.data.data);
    } catch {
      toast.error("Failed to load schools");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const openModal = (school) => {
    setEditingSchool(school);
    setSelectedModules(
      (school.subscribed_modules || []).filter((m) => MODULE_KEYS.includes(m)),
    );
    setShowModal(true);
  };

  const openAdminModal = (school) => {
    setEditingSchool(school);
    setAdminForm({
      admin_name: school.admin_name || "",
      admin_email: school.admin_email || "",
      admin_password: "",
      admin_confirm: "",
    });
    setShowAdminModal(true);
  };

  const handleAdminChange = (e) => {
    setAdminForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAdminSave = async () => {
    const name = adminForm.admin_name.trim();
    const email = adminForm.admin_email.trim();

    if (!name) {
      toast.error("Admin name is required");
      return;
    }
    if (!email) {
      toast.error("Admin email is required");
      return;
    }
    if (adminForm.admin_password && adminForm.admin_password !== adminForm.admin_confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (adminForm.admin_password && adminForm.admin_password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setAdminSaving(true);

      const formData = new FormData();
      formData.append("admin_name", name);
      formData.append("admin_email", email);
      if (adminForm.admin_password) {
        formData.append("admin_password", adminForm.admin_password);
      }

      await api.put(`/schools/${editingSchool._id}`, formData);

      toast.success(
        adminForm.admin_password
          ? "School admin updated — password reset"
          : "School admin updated",
      );
      setShowAdminModal(false);
      fetchSchools();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Update failed");
    } finally {
      setAdminSaving(false);
    }
  };

  const handleModuleToggle = (key) => {
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key],
    );
  };

  const allSelected = selectedModules.length === MODULES.length;

  const handleSelectAll = () => {
    setSelectedModules(allSelected ? [] : MODULE_KEYS);
  };

  const handleSave = async () => {
    if (selectedModules.length === 0) {
      toast.error("Select at least one module");
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("subscribed_modules", JSON.stringify(selectedModules));

      await api.put(`/schools/${editingSchool._id}`, formData);

      toast.success(`${editingSchool.school_name} modules updated`);
      setShowModal(false);
      fetchSchools();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const filtered = schools.filter(
    (s) =>
      !search.trim() ||
      (s.school_name || "").toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[rgb(var(--text))]">Access Control</h1>
          <p className="text-sm text-gray-400 mt-1">
            Configure which modules each school can access.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search school..."
            className="input w-full pl-9 bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[rgb(var(--surface))] rounded-xl shadow overflow-hidden">
        <div className="table-x-scroll">
          <table className="w-full">
            <thead className="bg-[rgb(var(--surface))]">
              <tr>
                <th className="px-6 py-3 text-left text-sm">School</th>
                <th className="px-6 py-3 text-left text-sm">Plan</th>
                <th className="px-6 py-3 text-left text-sm">Modules</th>
                <th className="px-6 py-3 text-left text-sm">Status</th>
                <th className="px-6 py-3 text-right text-sm">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    Loading schools...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    No schools found
                  </td>
                </tr>
              ) : (
                filtered.map((school) => (
                  <tr key={school._id} className="border-t">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={school.school_logo || EMPTY_LOGO}
                          alt=""
                          className="w-9 h-9 rounded-lg object-cover bg-gray-100"
                        />
                        <div>
                          <div className="font-medium">{school.school_name}</div>
                          <div className="text-xs text-gray-400">
                            {school.admin_email || school.contact_email || ""}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-3 text-sm text-gray-600">
                      {school.subscription_plan?.plan_name || "—"}
                    </td>

                    <td className="px-6 py-3 text-sm text-gray-600">
                      {(school.subscribed_modules || []).length} / {MODULES.length} modules
                    </td>

                    <td className="px-6 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          school.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : school.status === "Inactive"
                              ? "bg-red-100 text-red-600"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {school.status || "Active"}
                      </span>
                    </td>

                    <td className="px-6 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-4">
                        <button
                          onClick={() => openAdminModal(school)}
                          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          <FaUserCog size={14} />
                          Manage Admin
                        </button>
                        <button
                          onClick={() => openModal(school)}
                          className="inline-flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-700"
                        >
                          <FaEdit size={14} />
                          Manage Modules
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADMIN MODAL */}
      {showAdminModal && editingSchool && (
        <div className="app-modal-backdrop p-4">
          <div className="app-modal max-w-full sm:max-w-md max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-1">Manage School Admin</h2>
            <p className="text-sm text-gray-400 mb-4">
              {editingSchool.school_name}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Admin Name</label>
                <input
                  name="admin_name"
                  value={adminForm.admin_name}
                  onChange={handleAdminChange}
                  className="input w-full bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Admin Login Email</label>
                <input
                  name="admin_email"
                  type="email"
                  value={adminForm.admin_email}
                  onChange={handleAdminChange}
                  className="input w-full bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                />
                <p className="text-xs text-gray-400 mt-1">
                  This is the email the school admin uses to log in.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">New Password</label>
                  <input
                    name="admin_password"
                    type="password"
                    value={adminForm.admin_password}
                    onChange={handleAdminChange}
                    placeholder="Leave blank to keep"
                    className="input w-full bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Confirm Password</label>
                  <input
                    name="admin_confirm"
                    type="password"
                    value={adminForm.admin_confirm}
                    onChange={handleAdminChange}
                    placeholder="Repeat password"
                    className="input w-full bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAdminModal(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleAdminSave}
                disabled={adminSaving}
                className="px-4 py-2 bg-[rgb(var(--primary))] text-[rgb(var(--text))] rounded-lg disabled:opacity-60"
              >
                {adminSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODULE MODAL */}
      {showModal && editingSchool && (
        <div className="app-modal-backdrop p-4">
          <div className="app-modal max-w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-1">Module Access</h2>
            <p className="text-sm text-gray-400 mb-4">{editingSchool.school_name}</p>

            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">
                {selectedModules.length} of {MODULES.length} modules selected
              </p>
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
                    {isChecked ? (
                      <FaLockOpen size={11} className="text-gray-400 ml-auto shrink-0" />
                    ) : (
                      <FaLock size={11} className="text-gray-400 ml-auto shrink-0" />
                    )}
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[rgb(var(--primary))] text-[rgb(var(--text))] rounded-lg disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessControl;