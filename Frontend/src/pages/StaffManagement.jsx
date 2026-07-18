import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MODULES } from "../constants/module.js";
import { toast } from "react-toastify";
import {
  FaPlus, FaEdit, FaTrash, FaEye, FaTimes, FaKey,
  FaToggleOn, FaToggleOff, FaSearch, FaArrowLeft,
  FaCamera, FaCheckCircle, FaShieldAlt, FaUserTie,
  FaEnvelope, FaPhone, FaIdBadge, FaCalendarAlt,
  FaMoneyBillWave, FaLock, FaIdCard,
} from "react-icons/fa";
import { GiTeacher } from "react-icons/gi";

const API = import.meta.env.VITE_API_URL;

/* ── CONSTANTS ───────────────────────────────────── */
const STAFF_ROLES = [
  "principal", "administrator", "librarian", "teacher",
  "accountant", "receptionist", "counselor", "other",
];
const EMPLOYMENT_TYPES = ["Full-Time", "Part-Time", "Contract"];

const emptyForm = {
  fullName:        "",
  email:           "",
  phone:           "",
  dob:             "",
  gender:          "",
  address:         "",
  staffRole:       "",
  staffRoleCustom: "",
  joiningDate:     "",
  employmentType:  "Full-Time",
  salary:          "",
  password:        "",
  status:          "Active",
};

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
const StaffManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  /* ── STATE ──────────────────────────────────────── */
  const [staffList, setStaffList]           = useState([]);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);

  const [showFormModal, setShowFormModal]   = useState(false);
  const [showViewModal, setShowViewModal]   = useState(false);
  const [editingId, setEditingId]           = useState(null);
  const [viewStaff, setViewStaff]           = useState(null);

  const [form, setForm]                     = useState(emptyForm);
  const [permissions, setPermissions]       = useState([]);
  const [photoFile, setPhotoFile]           = useState(null);
  const [photoPreview, setPhotoPreview]     = useState(null);
  const [changePassword, setChangePassword] = useState(false);
  const [dirty, setDirty]                   = useState(false);

  const [search, setSearch]                 = useState("");
  const [filterRole, setFilterRole]         = useState("");
  const [filterStatus, setFilterStatus]     = useState("");

  const [confirmModal, setConfirmModal]     = useState(false);
  const [confirmMsg, setConfirmMsg]         = useState("");
  const [confirmAction, setConfirmAction]   = useState(null);

  /* ── SCHOOL SUBSCRIBED MODULES ONLY ─────────────── */
  const schoolModules = MODULES.filter((m) =>
    user?.subscribed_modules?.includes(m.key)
  );

  /* ── FETCH ──────────────────────────────────────── */
  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/staff`, { withCredentials: true });
      setStaffList(res.data.data);
    } catch {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  /* ── FORM HANDLERS ──────────────────────────────── */
  const handleChange = (e) => {
    setDirty(true);
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handlePermissionToggle = (key) => {
    setDirty(true);
    setPermissions((p) =>
      p.includes(key) ? p.filter((k) => k !== key) : [...p, key]
    );
  };

  const handleSelectAllPerms = () => {
    setDirty(true);
    setPermissions(
      permissions.length === schoolModules.length
        ? []
        : schoolModules.map((m) => m.key)
    );
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.type))
      return toast.error("Only jpg, jpeg, png, webp allowed");
    if (file.size > 2 * 1024 * 1024)
      return toast.error("Photo must be under 2MB");
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setDirty(true);
  };

  /* ── OPEN ADD ───────────────────────────────────── */
  const openAddModal = () => {
    setForm(emptyForm);
    // all modules checked by default
    setPermissions(schoolModules.map((m) => m.key));
    setPhotoFile(null);
    setPhotoPreview(null);
    setChangePassword(false);
    setEditingId(null);
    setDirty(false);
    setShowFormModal(true);
  };

  /* ── OPEN EDIT ──────────────────────────────────── */
  const openEditModal = (staff) => {
    setForm({
      fullName:        staff.fullName        || "",
      email:           staff.email           || "",
      phone:           staff.phone           || "",
      dob:             staff.dob?.slice(0, 10) || "",
      gender:          staff.gender          || "",
      address:         staff.address         || "",
      staffRole:       staff.staffRole       || "",
      staffRoleCustom: staff.staffRoleCustom || "",
      joiningDate:     staff.joiningDate?.slice(0, 10) || "",
      employmentType:  staff.employmentType  || "Full-Time",
      salary:          staff.salary          || "",
      password:        "",
      status:          staff.status          || "Active",
    });
    setPermissions(staff.permissions || []);
    setPhotoPreview(staff.photo?.url  || null);
    setPhotoFile(null);
    setChangePassword(false);
    setEditingId(staff._id);
    setDirty(false);
    setShowFormModal(true);
  };

  /* ── OPEN VIEW ──────────────────────────────────── */
  const openViewModal = (staff) => {
    setViewStaff(staff);
    setShowViewModal(true);
  };

  /* ── VALIDATE ───────────────────────────────────── */
  const validate = () => {
    if (!form.fullName.trim())  return "Full name is required";
    if (!form.email.trim())     return "Email is required";
    if (!/\S+@\S+\.\S+/.test(form.email)) return "Valid email is required";
    if (!form.staffRole)        return "Staff role is required";
    if (form.staffRole === "other" && !form.staffRoleCustom.trim())
                                return "Please specify the custom role";
    if (!editingId && !form.password.trim()) return "Password is required";
    if (changePassword && !form.password.trim())
                                return "Enter new password or cancel";
    if (permissions.length === 0) return "Assign at least one module permission";
    return null;
  };

  /* ── SAVE ───────────────────────────────────────── */
  const handleSave = () => {
    const error = validate();
    if (error) return toast.error(error);

    setConfirmMsg(
      editingId ? "Update this staff member?" : "Create this staff member?"
    );
    setConfirmAction(() => async () => {
      try {
        setSaving(true);
        const fd = new FormData();

        Object.entries(form).forEach(([key, val]) => {
          if (key === "password" && editingId && !changePassword) return;
          if (val !== "") fd.append(key, val);
        });

        fd.append("permissions", JSON.stringify(permissions));
        if (photoFile) fd.append("photo", photoFile);

        if (editingId) {
          await axios.put(`${API}/staff/${editingId}`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
            withCredentials: true,
          });
          toast.success("Staff updated successfully");
          setShowFormModal(false);
          resetForm();
          fetchStaff();
        } else {
          const res = await axios.post(`${API}/staff`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
            withCredentials: true,
          });
          toast.success(
            "Staff registered successfully. Opening ID card for download…",
          );
          setShowFormModal(false);
          resetForm();
          const newId = res.data?.data?._id;
          if (newId) {
            const base =
              user?.role === "staff_admin" ? "/staff" : "/school";
            navigate(`${base}/id-card/staff/${newId}`);
          } else {
            fetchStaff();
          }
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Error saving staff");
      } finally {
        setSaving(false);
      }
    });
    setConfirmModal(true);
  };

  /* ── TOGGLE STATUS ──────────────────────────────── */
  const handleToggleStatus = (staff) => {
    const action = staff.status === "Active" ? "deactivate" : "activate";
    setConfirmMsg(`${action.charAt(0).toUpperCase() + action.slice(1)} ${staff.fullName}?`);
    setConfirmAction(() => async () => {
      try {
        await axios.patch(
          `${API}/staff/${staff._id}/toggle-status`, {},
          { withCredentials: true }
        );
        toast.success(`Staff ${action}d successfully`);
        fetchStaff();
      } catch {
        toast.error("Failed to update status");
      }
    });
    setConfirmModal(true);
  };

  /* ── DELETE ─────────────────────────────────────── */
  const handleDelete = (staff) => {
    setConfirmMsg(`Permanently delete ${staff.fullName}? This cannot be undone.`);
    setConfirmAction(() => async () => {
      try {
        await axios.delete(`${API}/staff/${staff._id}`, { withCredentials: true });
        toast.success("Staff deleted");
        fetchStaff();
      } catch {
        toast.error("Failed to delete staff");
      }
    });
    setConfirmModal(true);
  };

  const handleAdminGroupToggle = async (member) => {
    try {
      await axios.patch(
        `${API}/staff/admin-group/${member.model.toLowerCase()}/${member._id}`,
        { isAdminGroup: !member.isAdminGroup },
        { withCredentials: true },
      );

      toast.success(
        `${member.fullName} ${member.isAdminGroup ? "removed from" : "added to"} admin group`,
      );
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update admin group membership");
    }
  };

  /* ── RESET ──────────────────────────────────────── */
  const resetForm = () => {
    setForm(emptyForm);
    setPermissions([]);
    setPhotoFile(null);
    setPhotoPreview(null);
    setChangePassword(false);
    setEditingId(null);
    setDirty(false);
  };

  const closeFormModal = () => {
    if (dirty) {
      setConfirmMsg("Discard unsaved changes?");
      setConfirmAction(() => () => { setShowFormModal(false); resetForm(); });
      setConfirmModal(true);
    } else {
      setShowFormModal(false);
      resetForm();
    }
  };

  /* ── FILTER ─────────────────────────────────────── */
  const filtered = staffList.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      s.fullName?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.staffId?.toLowerCase().includes(q);
    const matchRole   = filterRole   ? s.staffRole === filterRole   : true;
    const matchStatus = filterStatus ? s.status    === filterStatus : true;
    return matchSearch && matchRole && matchStatus;
  });

  /* ── HELPERS ────────────────────────────────────── */
  const getRoleLabel = (s) =>
    s.staffRole === "other" && s.staffRoleCustom
      ? s.staffRoleCustom
      : s.staffRole
          ? s.staffRole.charAt(0).toUpperCase() + s.staffRole.slice(1)
          : "—";

  const roleColor = (role) => {
    const map = {
      principal:     "bg-purple-100 text-purple-600",
      administrator: "bg-blue-100 text-blue-600",
      librarian:     "bg-green-100 text-green-600",
      teacher:       "bg-indigo-100 text-indigo-600",
      accountant:    "bg-yellow-100 text-yellow-700",
      receptionist:  "bg-pink-100 text-pink-600",
      counselor:     "bg-orange-100 text-orange-600",
      other:         "bg-gray-100 text-gray-600",
    };
    return map[role] || "bg-gray-100 text-gray-600";
  };

  /* ══════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════ */
  return (
    <div className="p-4 md:p-6 min-h-screen bg-[rgb(var(--bg))]">

      {/* BACK — mobile only */}
      {isMobile && (
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl mb-4
            bg-[rgb(var(--surface))] border border-[rgb(var(--border))]
            text-sm font-bold text-[rgb(var(--text))]
            active:scale-95 transition-transform"
        >
          <FaArrowLeft size={13} /> Back
        </button>
      )}

      {/* ── HEADER ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center
        justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold
            text-[rgb(var(--text))]">
            Staff Management
          </h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">
            {staffList.length} staff member{staffList.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-[rgb(var(--primary))]
            text-white px-4 py-2.5 rounded-xl shadow text-sm font-medium
            hover:opacity-90 transition self-start sm:self-auto"
        >
          <FaPlus size={12} /> Add Staff
        </button>
      </div>

      {/* ── FILTERS ───────────────────────────────── */}
      <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))]
        rounded-2xl p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2
            text-[rgb(var(--text-muted))]" size={13} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, ID..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg
              border border-[rgb(var(--border))]
              bg-[rgb(var(--bg))] text-[rgb(var(--text))]
              focus:outline-none focus:ring-2
              focus:ring-[rgb(var(--primary))] transition"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg
            border border-[rgb(var(--border))]
            bg-[rgb(var(--bg))] text-[rgb(var(--text))]
            focus:outline-none focus:ring-2
            focus:ring-[rgb(var(--primary))] transition"
        >
          <option value="">All Roles</option>
          {STAFF_ROLES.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg
            border border-[rgb(var(--border))]
            bg-[rgb(var(--bg))] text-[rgb(var(--text))]
            focus:outline-none focus:ring-2
            focus:ring-[rgb(var(--primary))] transition"
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* ── TABLE — desktop ───────────────────────── */}
      <div className="hidden md:block rounded-2xl overflow-hidden
        border border-[rgb(var(--border))] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[750px]">
            <thead className="bg-[rgb(var(--surface))]
              text-[rgb(var(--text-muted))] text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3.5 text-left">Staff</th>
                <th className="px-5 py-3.5 text-left">Role</th>
                <th className="px-5 py-3.5 text-left">Contact</th>
                <th className="px-5 py-3.5 text-left">Permissions</th>
                  <th className="px-5 py-3.5 text-left">Admin Group</th>
                  <th className="px-5 py-3.5 text-left">Joined</th>
                <th className="px-5 py-3.5 text-left">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12
                    text-[rgb(var(--text-muted))]">
                    Loading staff...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12
                    text-[rgb(var(--text-muted))]">
                    No staff found.
                  </td>
                </tr>
              ) : filtered.map((s) => (
                <tr key={s._id}
                  className="border-t border-[rgb(var(--border))]
                    bg-[rgb(var(--surface))]
                    hover:bg-[rgba(var(--primary),0.04)] transition">

                  {/* photo + name */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl overflow-hidden
                        shrink-0 bg-[rgba(var(--primary),0.12)]
                        flex items-center justify-center">
                        {s.photo?.url ? (
                          <img src={s.photo.url} alt={s.fullName}
                            className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[rgb(var(--primary))]
                            font-bold text-sm">
                            {s.fullName?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-[rgb(var(--text))]
                          leading-tight">{s.fullName}</p>
                        <p className="text-xs text-[rgb(var(--text-muted))]">
                          {s.staffId}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* role */}
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-lg text-xs
                      font-medium ${roleColor(s.staffRole)}`}>
                      {getRoleLabel(s)}
                    </span>
                  </td>

                  {/* contact */}
                  <td className="px-5 py-3.5">
                    <p className="text-xs text-[rgb(var(--text))]">
                      {s.email}
                    </p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">
                      {s.phone || "—"}
                    </p>
                  </td>

                  {/* permissions count */}
                  <td className="px-5 py-3.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs
                      font-medium bg-[rgba(var(--primary),0.1)]
                      text-[rgb(var(--primary))]">
                      {s.permissions?.length || 0} modules
                    </span>
                  </td>

                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleAdminGroupToggle(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                        s.isAdminGroup
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {s.isAdminGroup ? "In Admin Group" : "Add to Admin Group"}
                    </button>
                  </td>

                  {/* joined */}
                  <td className="px-5 py-3.5 text-xs
                    text-[rgb(var(--text-muted))]">
                    {s.joiningDate?.slice(0, 10) || "—"}
                  </td>

                  {/* status toggle */}
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleToggleStatus(s)}
                      className={`flex items-center gap-1.5 px-2.5 py-1
                        rounded-full text-xs font-medium transition
                        ${s.status === "Active"
                          ? "bg-green-100 text-green-600 hover:bg-green-200"
                          : "bg-red-100 text-red-500 hover:bg-red-200"}`}
                    >
                      {s.status === "Active"
                        ? <><FaToggleOn size={14}/> Active</>
                        : <><FaToggleOff size={14}/> Inactive</>}
                    </button>
                  </td>

                  {/* actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => openViewModal(s)}
                        title="View"
                        className="text-[rgb(var(--primary))]
                          hover:scale-110 transition">
                        <FaEye />
                      </button>
                      <button onClick={() => openEditModal(s)}
                        title="Edit"
                        className="text-blue-500 hover:scale-110 transition">
                        <FaEdit />
                      </button>
                      <button onClick={() => handleDelete(s)}
                        title="Delete"
                        className="text-red-500 hover:scale-110 transition">
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

      {/* ── CARDS — mobile ────────────────────────── */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <p className="text-center py-10 text-[rgb(var(--text-muted))]">
            Loading...
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10 text-[rgb(var(--text-muted))]">
            No staff found.
          </p>
        ) : filtered.map((s) => (
          <div key={s._id}
            className="bg-[rgb(var(--surface))]
              border border-[rgb(var(--border))] rounded-2xl p-4">

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl overflow-hidden
                  shrink-0 bg-[rgba(var(--primary),0.12)]
                  flex items-center justify-center">
                  {s.photo?.url ? (
                    <img src={s.photo.url} alt={s.fullName}
                      className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[rgb(var(--primary))] font-bold">
                      {s.fullName?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-[rgb(var(--text))]">
                    {s.fullName}
                  </p>
                  <p className="text-xs text-[rgb(var(--text-muted))]">
                    {s.staffId}
                  </p>
                  <span className={`inline-block mt-1 px-2 py-0.5
                    rounded-lg text-xs font-medium ${roleColor(s.staffRole)}`}>
                    {getRoleLabel(s)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleToggleStatus(s)}
                className={`shrink-0 flex items-center gap-1 px-2.5 py-1
                  rounded-full text-xs font-medium transition
                  ${s.status === "Active"
                    ? "bg-green-100 text-green-600"
                    : "bg-red-100 text-red-500"}`}
              >
                {s.status === "Active"
                  ? <><FaToggleOn size={13}/> Active</>
                  : <><FaToggleOff size={13}/> Inactive</>}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-xs
              text-[rgb(var(--text-muted))]">
              <span className="flex items-center gap-1">
                <FaEnvelope size={11}/> {s.email}
              </span>
              {s.phone && (
                <span className="flex items-center gap-1">
                  <FaPhone size={11}/> {s.phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FaShieldAlt size={11}/>
                {s.permissions?.length || 0} modules
              </span>
              <button
                onClick={() => handleAdminGroupToggle(s)}
                className={`px-2 py-1 rounded-lg text-xs font-medium ${
                  s.isAdminGroup
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {s.isAdminGroup ? "Admin Group" : "Assign Admin Group"}
              </button>
            </div>

            <div className="mt-3 pt-3 flex gap-2
              border-t border-[rgb(var(--border))]">
              <button onClick={() => openViewModal(s)}
                className="flex-1 flex items-center justify-center gap-1.5
                  py-1.5 rounded-lg text-xs font-medium
                  bg-[rgba(var(--primary),0.1)] text-[rgb(var(--primary))]">
                <FaEye size={12}/> View
              </button>
              <button onClick={() => openEditModal(s)}
                className="flex-1 flex items-center justify-center gap-1.5
                  py-1.5 rounded-lg text-xs font-medium
                  bg-blue-50 text-blue-600">
                <FaEdit size={12}/> Edit
              </button>
              <button onClick={() => handleDelete(s)}
                className="flex-1 flex items-center justify-center gap-1.5
                  py-1.5 rounded-lg text-xs font-medium
                  bg-red-50 text-red-500">
                <FaTrash size={12}/> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          ADD / EDIT MODAL
      ══════════════════════════════════════════════ */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center
          justify-center z-50 p-4">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]
            rounded-2xl shadow-2xl w-full max-w-2xl
            max-h-[94vh] flex flex-col">

            {/* header */}
            <div className="flex items-center justify-between px-6 py-4
              border-b border-[rgb(var(--border))] shrink-0">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingId ? "Edit Staff Member" : "Add Staff Member"}
                </h2>
                <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
                  {editingId
                    ? "Update staff details and permissions"
                    : "Fill details to onboard a new staff member"}
                </p>
              </div>
              <button onClick={closeFormModal}
                className="text-[rgb(var(--text-muted))]
                  hover:text-red-400 transition">
                <FaTimes size={18}/>
              </button>
            </div>

            {/* scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

              {/* ── PHOTO ── */}
              <div>
                <p className="text-sm font-semibold mb-2">
                  Profile Photo
                  <span className="text-[rgb(var(--text-muted))]
                    font-normal ml-1 text-xs">
                    (optional, max 2MB)
                  </span>
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden
                    shrink-0 border-2 border-dashed
                    border-[rgb(var(--border))]
                    bg-[rgba(var(--primary),0.06)]
                    flex items-center justify-center">
                    {photoPreview ? (
                      <img src={photoPreview} alt="preview"
                        className="w-full h-full object-cover"/>
                    ) : (
                      <FaCamera size={20}
                        className="text-[rgb(var(--text-muted))]"/>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handlePhotoChange}
                      className="text-sm text-[rgb(var(--text-muted))]
                        file:mr-3 file:py-1.5 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-medium
                        file:bg-[rgb(var(--primary))] file:text-white
                        file:cursor-pointer hover:file:opacity-90"
                    />
                    {photoPreview && (
                      <button type="button"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                          setDirty(true);
                        }}
                        className="text-xs text-red-400
                          hover:text-red-600 text-left">
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── BASIC INFO ── */}
              <div>
                <p className="text-sm font-semibold mb-3">
                  Basic Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MInput label="Full Name" name="fullName"
                    value={form.fullName} onChange={handleChange}
                    required placeholder="e.g. John Smith"/>
                  <MInput label="Email" name="email" type="email"
                    value={form.email} onChange={handleChange}
                    required placeholder="staff@school.edu"/>
                  <MInput label="Phone" name="phone"
                    value={form.phone} onChange={handleChange}
                    placeholder="+91 98765 43210"/>
                  <MInput label="Date of Birth" name="dob" type="date"
                    value={form.dob} onChange={handleChange}/>

                  {/* gender */}
                  <div>
                    <label className="text-xs font-medium
                      text-[rgb(var(--text-muted))] mb-1 block">
                      Gender
                    </label>
                    <select name="gender" value={form.gender}
                      onChange={handleChange}
                      className="w-full border border-[rgb(var(--border))]
                        rounded-lg px-3 py-2 text-sm
                        bg-[rgb(var(--bg))] text-[rgb(var(--text))]
                        focus:outline-none focus:ring-2
                        focus:ring-[rgb(var(--primary))] transition">
                      <option value="">Select Gender</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>

                  {/* staff role */}
                  <div>
                    <label className="text-xs font-medium
                      text-[rgb(var(--text-muted))] mb-1 block">
                      Staff Role <span className="text-red-500">*</span>
                    </label>
                    <select name="staffRole" value={form.staffRole}
                      onChange={handleChange}
                      className="w-full border border-[rgb(var(--border))]
                        rounded-lg px-3 py-2 text-sm
                        bg-[rgb(var(--bg))] text-[rgb(var(--text))]
                        focus:outline-none focus:ring-2
                        focus:ring-[rgb(var(--primary))] transition">
                      <option value="">Select Role</option>
                      {STAFF_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* custom role */}
                  {form.staffRole === "other" && (
                    <MInput label="Specify Role" name="staffRoleCustom"
                      value={form.staffRoleCustom} onChange={handleChange}
                      required placeholder="e.g. Sports Coach"/>
                  )}

                  {/* address */}
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium
                      text-[rgb(var(--text-muted))] mb-1 block">
                      Address
                    </label>
                    <textarea name="address" value={form.address}
                      onChange={handleChange} rows={2}
                      placeholder="Full address"
                      className="w-full border border-[rgb(var(--border))]
                        rounded-lg px-3 py-2 text-sm
                        bg-[rgb(var(--bg))] text-[rgb(var(--text))]
                        focus:outline-none focus:ring-2
                        focus:ring-[rgb(var(--primary))]
                        transition resize-none"/>
                  </div>
                </div>
              </div>

              {/* ── EMPLOYMENT ── */}
              <div>
                <p className="text-sm font-semibold mb-3">
                  Employment Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MInput label="Joining Date" name="joiningDate"
                    type="date" value={form.joiningDate}
                    onChange={handleChange}/>
                  <MInput label="Salary" name="salary" type="number"
                    value={form.salary} onChange={handleChange}
                    placeholder="Monthly salary"/>

                  {/* employment type */}
                  <div>
                    <label className="text-xs font-medium
                      text-[rgb(var(--text-muted))] mb-1 block">
                      Employment Type
                    </label>
                    <select name="employmentType"
                      value={form.employmentType}
                      onChange={handleChange}
                      className="w-full border border-[rgb(var(--border))]
                        rounded-lg px-3 py-2 text-sm
                        bg-[rgb(var(--bg))] text-[rgb(var(--text))]
                        focus:outline-none focus:ring-2
                        focus:ring-[rgb(var(--primary))] transition">
                      {EMPLOYMENT_TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* status */}
                  <div>
                    <label className="text-xs font-medium
                      text-[rgb(var(--text-muted))] mb-1 block">
                      Status
                    </label>
                    <select name="status" value={form.status}
                      onChange={handleChange}
                      className="w-full border border-[rgb(var(--border))]
                        rounded-lg px-3 py-2 text-sm
                        bg-[rgb(var(--bg))] text-[rgb(var(--text))]
                        focus:outline-none focus:ring-2
                        focus:ring-[rgb(var(--primary))] transition">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── PASSWORD ── */}
              <div>
                <p className="text-sm font-semibold mb-3">
                  {editingId ? "Password" : "Set Password"}
                </p>
                {editingId ? (
                  !changePassword ? (
                    <button type="button"
                      onClick={() => setChangePassword(true)}
                      className="flex items-center gap-2 text-sm
                        text-[rgb(var(--primary))]
                        font-medium hover:underline">
                      <FaKey size={12}/> Change Password
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <MInput label="New Password" name="password"
                        type="password" value={form.password}
                        onChange={handleChange}
                        placeholder="Enter new password"/>
                      <button type="button"
                        onClick={() => {
                          setChangePassword(false);
                          setForm((p) => ({ ...p, password: "" }));
                        }}
                        className="text-xs text-red-400
                          hover:text-red-600">
                        Cancel password change
                      </button>
                    </div>
                  )
                ) : (
                  <MInput label="Password" name="password"
                    type="password" value={form.password}
                    onChange={handleChange} required
                    placeholder="Set login password"/>
                )}
              </div>

              {/* ── MODULE PERMISSIONS ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Module Permissions
                    </p>
                    <p className="text-xs text-[rgb(var(--text-muted))]
                      mt-0.5">
                      Only your school's subscribed modules are shown.
                      {" "}{permissions.length} of {schoolModules.length} selected.
                    </p>
                  </div>
                  <button type="button" onClick={handleSelectAllPerms}
                    className="text-xs px-3 py-1.5 rounded-lg
                      border border-[rgb(var(--border))]
                      hover:bg-[rgba(var(--primary),0.08)]
                      transition font-medium shrink-0">
                    {permissions.length === schoolModules.length
                      ? "Deselect All" : "Select All"}
                  </button>
                </div>

                {schoolModules.length === 0 ? (
                  <p className="text-sm text-[rgb(var(--text-muted))]
                    bg-[rgba(var(--primary),0.05)] rounded-xl p-4
                    text-center">
                    No modules subscribed. Contact Super Admin.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {schoolModules.map((mod) => {
                      const isChecked = permissions.includes(mod.key);
                      return (
                        <label key={mod.key}
                          className={`flex items-center gap-2.5 p-3
                            rounded-xl border cursor-pointer
                            transition select-none text-sm
                            ${isChecked
                              ? "border-[rgb(var(--primary))] bg-[rgba(var(--primary),0.08)]"
                              : "border-[rgb(var(--border))] hover:border-[rgb(var(--border-strong))]"
                            }`}>
                          <input type="checkbox" checked={isChecked}
                            onChange={() => handlePermissionToggle(mod.key)}
                            className="accent-[rgb(var(--primary))]
                              w-4 h-4 shrink-0"/>
                          <span className="font-medium leading-tight
                            text-[rgb(var(--text))]">
                            {mod.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>{/* end scrollable body */}

            {/* footer */}
            <div className="flex justify-between items-center px-6 py-4
              border-t border-[rgb(var(--border))] shrink-0">
              <button onClick={closeFormModal}
                className="px-4 py-2 border border-[rgb(var(--border))]
                  rounded-lg text-sm
                  hover:bg-[rgba(var(--primary),0.06)] transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 bg-[rgb(var(--primary))] text-white
                  rounded-lg text-sm font-medium shadow-sm
                  hover:opacity-90 transition disabled:opacity-50">
                {saving
                  ? "Saving..."
                  : editingId ? "Save Changes" : "Create Staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          VIEW MODAL
      ══════════════════════════════════════════════ */}
      {showViewModal && viewStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center
          justify-center z-50 p-4">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]
            rounded-2xl shadow-2xl w-full max-w-lg
            max-h-[92vh] flex flex-col">

            {/* header */}
            <div className="flex items-center justify-between px-6 py-4
              border-b border-[rgb(var(--border))] shrink-0">
              <h2 className="text-lg font-semibold">Staff Details</h2>
              <button onClick={() => setShowViewModal(false)}
                className="text-[rgb(var(--text-muted))]
                  hover:text-red-400 transition">
                <FaTimes size={18}/>
              </button>
            </div>

            {/* body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">

              {/* profile top */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl overflow-hidden
                  shrink-0 bg-[rgba(var(--primary),0.12)]
                  flex items-center justify-center">
                  {viewStaff.photo?.url ? (
                    <img src={viewStaff.photo.url}
                      alt={viewStaff.fullName}
                      className="w-full h-full object-cover"/>
                  ) : (
                    <span className="text-2xl font-bold
                      text-[rgb(var(--primary))]">
                      {viewStaff.fullName?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[rgb(var(--text))]">
                    {viewStaff.fullName}
                  </h3>
                  <p className="text-sm text-[rgb(var(--text-muted))]">
                    {viewStaff.staffId}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs
                      font-medium ${roleColor(viewStaff.staffRole)}`}>
                      {getRoleLabel(viewStaff)}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full
                      text-xs font-medium
                      ${viewStaff.status === "Active"
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-500"}`}>
                      {viewStaff.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <ViewField icon={<FaEnvelope/>} label="Email"
                  value={viewStaff.email}/>
                <ViewField icon={<FaPhone/>} label="Phone"
                  value={viewStaff.phone}/>
                <ViewField icon={<FaIdBadge/>} label="Username"
                  value={viewStaff.username}/>
                <ViewField icon={<FaUserTie/>} label="Employment"
                  value={viewStaff.employmentType}/>
                <ViewField icon={<FaCalendarAlt/>} label="Joining Date"
                  value={viewStaff.joiningDate?.slice(0, 10)}/>
                <ViewField icon={<FaMoneyBillWave/>} label="Salary"
                  value={viewStaff.salary ? `₹${viewStaff.salary}` : null}/>
                <ViewField icon={<FaCalendarAlt/>} label="Date of Birth"
                  value={viewStaff.dob?.slice(0, 10)}/>
                <ViewField icon={<FaUserTie/>} label="Gender"
                  value={viewStaff.gender}/>
              </div>

              {/* address */}
              {viewStaff.address && (
                <div className="mb-6 p-3 rounded-xl
                  bg-[rgba(var(--primary),0.05)]
                  border border-[rgb(var(--border))]">
                  <p className="text-xs font-medium
                    text-[rgb(var(--text-muted))] mb-1">Address</p>
                  <p className="text-sm text-[rgb(var(--text))]">
                    {viewStaff.address}
                  </p>
                </div>
              )}

              {/* permissions */}
              <div>
                <p className="text-sm font-semibold mb-3
                  flex items-center gap-2">
                  <FaShieldAlt className="text-[rgb(var(--primary))]"/>
                  Module Permissions
                  <span className="text-xs font-normal
                    text-[rgb(var(--text-muted))]">
                    ({viewStaff.permissions?.length || 0} assigned)
                  </span>
                </p>
                {!viewStaff.permissions?.length ? (
                  <p className="text-sm text-[rgb(var(--text-muted))]">
                    No permissions assigned.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {viewStaff.permissions.map((perm) => {
                      const mod = MODULES.find((m) => m.key === perm);
                      return (
                        <span key={perm}
                          className="flex items-center gap-1.5 px-3 py-1
                            rounded-lg text-xs font-medium
                            bg-[rgba(var(--primary),0.1)]
                            text-[rgb(var(--primary))]">
                          <FaCheckCircle size={10}/>
                          {mod?.label || perm}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* footer */}
            <div className="flex justify-between items-center px-6 py-4
              border-t border-[rgb(var(--border))] shrink-0 gap-2 flex-wrap">
              <div className="flex gap-2">
                {viewStaff.staffRole && (
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      const base =
                        user?.role === "staff_admin" ? "/staff" : "/school";
                      navigate(`${base}/id-card/staff/${viewStaff._id}`);
                    }}
                    className="flex items-center gap-2 px-4 py-2
                      bg-emerald-600 text-white rounded-lg text-sm
                      font-medium hover:opacity-90 transition">
                    <FaIdCard size={12}/> Download ID Card
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(viewStaff);
                  }}
                  className="flex items-center gap-2 px-4 py-2
                    bg-[rgba(var(--primary),0.1)]
                    text-[rgb(var(--primary))] rounded-lg text-sm
                    font-medium hover:opacity-80 transition">
                  <FaEdit size={12}/> Edit
                </button>
              </div>
              <button onClick={() => setShowViewModal(false)}
                className="px-4 py-2 border border-[rgb(var(--border))]
                  rounded-lg text-sm
                  hover:bg-[rgba(var(--primary),0.06)] transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          CONFIRM POPUP
      ══════════════════════════════════════════════ */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center
          justify-center z-[60] p-4">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]
            rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-base font-semibold mb-1">Are you sure?</p>
            <p className="text-sm text-[rgb(var(--text-muted))] mb-6">
              {confirmMsg}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModal(false)}
                className="px-4 py-2 border border-[rgb(var(--border))]
                  rounded-lg text-sm
                  hover:bg-[rgba(var(--primary),0.06)] transition">
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmAction();
                  setConfirmModal(false);
                }}
                className="px-4 py-2 bg-[rgb(var(--primary))] text-white
                  rounded-lg text-sm font-medium
                  hover:opacity-90 transition">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

/* ── REUSABLE COMPONENTS ────────────────────────── */
const MInput = ({
  label, type = "text", required = false, placeholder, ...props
}) => (
  <div>
    <label className="text-xs font-medium
      text-[rgb(var(--text-muted))] mb-1 block">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input type={type} placeholder={placeholder} {...props}
      className="w-full border border-[rgb(var(--border))]
        rounded-lg px-3 py-2 text-sm
        bg-[rgb(var(--bg))] text-[rgb(var(--text))]
        focus:outline-none focus:ring-2
        focus:ring-[rgb(var(--primary))] transition"/>
  </div>
);

const ViewField = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl
    bg-[rgba(var(--primary),0.04)]
    border border-[rgb(var(--border))]">
    <span className="text-[rgb(var(--primary))] mt-0.5 shrink-0">
      {icon}
    </span>
    <div>
      <p className="text-xs text-[rgb(var(--text-muted))]">{label}</p>
      <p className="text-sm font-medium text-[rgb(var(--text))] mt-0.5">
        {value || "—"}
      </p>
    </div>
  </div>
);

export default StaffManagement;