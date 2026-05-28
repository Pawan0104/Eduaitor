import { useEffect, useState } from "react";
import axios from "axios";
import { FaPlus, FaTrash, FaEdit, FaEye, FaIdCard } from "react-icons/fa";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const EMPTY_FORM = {
  _id: null,
  name: "",
  phone: "",
  license: "",
  licenseExpiry: "",
  bus: "",
  route: "",
  experience: "",
  status: "Active",
};

const DriverManagement = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modals
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [formModal, setFormModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  const [viewModal, setViewModal] = useState(false);
  const [viewDriver, setViewDriver] = useState(null);

  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);

  /* ── FETCH ────────────────────────────────────────────────────────────── */

  const fetchMeta = async () => {
    try {
      const [b, r] = await Promise.all([
        axios.get(`${API}/transport/buses`, {
          withCredentials: true,
        }),
        axios.get(`${API}/transport/routes`, {
          withCredentials: true,
        }),
      ]);

      setBuses(b.data.data || []);
      setRoutes(r.data.data || []);
    } catch {
      toast.error("Failed to load buses/routes");
    }
  };

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/transport/drivers`, {
        withCredentials: true,
      });
      setDrivers(res.data.data || []);
    } catch {
      toast.error("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
    fetchMeta();
  }, []);

  /* ── ADD / EDIT ───────────────────────────────────────────────────────── */

  const openAdd = () => {
    setIsEdit(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormModal(true);
  };

  const openEdit = (driver) => {
    setIsEdit(true);
    setEditId(driver._id);
    setForm({
      _id: driver._id,
      name: driver.name || "",
      phone: driver.phone || "",
      license: driver.license || "",
      licenseExpiry: driver.licenseExpiry?.slice(0, 10) || "",
      bus: driver.bus?._id || "",
      route: driver.route?._id || "",
      experience: driver.experience || "",
      status: driver.status || "Active",
    });
    setFormModal(true);
  };

  const handleFormSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      return toast.error("Name and phone are required");
    }
    if (!/^\d{10}$/.test(form.phone)) {
      return toast.error("Enter valid 10-digit phone number");
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(form.licenseExpiry);
    expiry.setHours(0, 0, 0, 0);

    if (form.licenseExpiry && expiry < today) {
      return toast.error("License expiry cannot be in the past");
    }
    try {
      setFormLoading(true);
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        license: form.license.trim() || "",
        licenseExpiry: form.licenseExpiry || null,
        experience: form.experience.trim() || "",
        bus: form.bus || null,
        route: form.route || null,
        status: form.status,
      };
      if (isEdit) {
        await axios.put(`${API}/transport/drivers/${editId}`, payload, {
          withCredentials: true,
        });
        toast.success("Driver updated successfully");
      } else {
        await axios.post(`${API}/transport/drivers`, payload, {
          withCredentials: true,
        });
        toast.success("Driver added successfully");
      }
      setFormModal(false);
      fetchDrivers();
      fetchMeta();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save driver");
    } finally {
      setFormLoading(false);
    }
  };

  /* ── DELETE ───────────────────────────────────────────────────────────── */

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API}/transport/drivers/${deleteId}`, {
        withCredentials: true,
      });
      toast.success("Driver deleted successfully");
      setDeleteModal(false);
      setDeleteId(null);
      fetchDrivers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete driver");
    }
  };

  /* ── HELPERS ──────────────────────────────────────────────────────────── */

  const isExpiringSoon = (expiry) => {
    if (!expiry) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exp = new Date(expiry);
    exp.setHours(0, 0, 0, 0);

    return (exp - today) / (1000 * 60 * 60 * 24) < 90;
  };

  const initials = (name = "") =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  /* ── FILTER ───────────────────────────────────────────────────────────── */

  const filtered = drivers.filter((d) => {
    const s = search.toLowerCase();
    const matchSearch =
      d.name?.toLowerCase().includes(s) ||
      d.phone?.includes(s) ||
      d.route?.name?.toLowerCase().includes(s) ||
      d.license?.toLowerCase().includes(s);
    const matchStatus = filterStatus ? d.status === filterStatus : true;
    return matchSearch && matchStatus;
  });

  /* ── STATS ────────────────────────────────────────────────────────────── */

  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter((d) => d.status === "Active").length;
  const onLeave = drivers.filter((d) => d.status === "On Leave").length;
  const expiringLicenses = drivers.filter((d) =>
    isExpiringSoon(d.licenseExpiry),
  ).length;

  /* ── LOADING ──────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading drivers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-[rgb(var(--text))] min-h-screen">
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
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--text))]">
            Driver Management
          </h1>
          <p className="text-[rgb(var(--primary))] text-sm sm:text-base">
            Manage school transport drivers
          </p>
        </div>
        <button
          onClick={openAdd}
          className="text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-4 py-2 rounded-lg flex items-center gap-2 shadow  transition"
        >
          <FaPlus />
          Add Driver
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="TOTAL DRIVERS" value={totalDrivers} color="blue" />
        <StatCard title="ACTIVE" value={activeDrivers} color="green" />
        <StatCard title="ON LEAVE" value={onLeave} color="yellow" />
        <StatCard
          title="LICENSE EXPIRING SOON"
          value={expiringLicenses}
          color="red"
        />
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold">
          Driver Directory
        </h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search name, phone, route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full sm:w-64 text-[rgb(var(--text))] bg-[rgb(var(--surface))] focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]  rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[rgb(var(--surface))]">
            <tr>
              <th className="p-4 text-left">Driver</th>
              <th className="p-4 text-left">Phone</th>
              <th className="p-4 text-left">Bus / Route</th>
              <th className="p-4 text-left">License</th>
              <th className="p-4 text-left">Experience</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((driver) => (
              <tr key={driver._id} className="border-t hover:bg[rgb(var(--primary-light))]">
                {/* DRIVER */}
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {driver.photo?.url ? (
                      <img
                        src={driver.photo.url}
                        alt={driver.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-[rgb(var(--primary))] rounded-full flex items-center justify-center font-semibold text-sm">
                        {initials(driver.name)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-[rgb(var(--text))]">{driver.name}</p>
                      <p className="text-[rgb(var(--text))] text-xs">
                        {driver.driverId || driver._id?.slice(-6)}
                      </p>
                    </div>
                  </div>
                </td>

                {/* PHONE */}
                <td className="p-4 text-[rgb(var(--text))]">{driver.phone || "-"}</td>

                {/* BUS / ROUTE */}
                <td className="p-4">
                  <p className="font-medium ">
                    {driver.bus?.busId || "Unassigned"}
                  </p>
                  <p className="text-xs text-[rgb(var(--text))]">
                    {driver.route?.name || "No route"}
                  </p>
                </td>

                {/* LICENSE */}
                <td className="p-4">
                  <p className=" text-xs">
                    {driver.license || "-"}
                  </p>
                  {driver.licenseExpiry && (
                    <p
                      className={`text-xs font-medium mt-0.5 ${
                        isExpiringSoon(driver.licenseExpiry)
                          ? "text-red-500"
                          : "text-gray-400"
                      }`}
                    >
                      {isExpiringSoon(driver.licenseExpiry) && "⚠️ "}
                      Exp: {driver.licenseExpiry?.slice(0, 10)}
                    </p>
                  )}
                </td>

                {/* EXPERIENCE */}
                <td className="p-4 ">
                  {driver.experience ? `${driver.experience}` : "-"}
                </td>

                {/* STATUS */}
                <td className="p-4">
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      driver.status === "Active"
                        ? "bg-green-100 text-green-600"
                        : driver.status === "On Leave"
                          ? "bg-yellow-100 text-yellow-600"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {driver.status || "Active"}
                  </span>
                </td>

                {/* ACTIONS */}
                <td className="p-4">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setViewDriver(driver);
                        setViewModal(true);
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition text-xs font-medium flex items-center gap-1"
                    >
                      <FaEye className="text-xs" />
                      View
                    </button>
                    <button
                      onClick={() => openEdit(driver)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-xs font-medium flex items-center gap-1"
                    >
                      <FaEdit className="text-xs" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(driver._id)}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition text-xs font-medium flex items-center gap-1"
                    >
                      <FaTrash className="text-xs" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-10 bg-[rgb(var(--primary))]/10 text-[rgb(var(--text))]">
                  No drivers found. Click "Add Driver" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODALS */}

      {deleteModal && (
        <DeleteModal
          onCancel={() => {
            setDeleteModal(false);
            setDeleteId(null);
          }}
          onConfirm={confirmDelete}
        />
      )}

      {formModal && (
        <DriverFormModal
          isEdit={isEdit}
          form={form}
          setForm={setForm}
          onClose={() => {
            setFormModal(false);
            setForm(EMPTY_FORM);
          }}
          onSubmit={handleFormSubmit}
          loading={formLoading}
          buses={buses}
          routes={routes}
        />
      )}

      {viewModal && viewDriver && (
        <ViewModal
          driver={viewDriver}
          onClose={() => {
            setViewModal(false);
            setViewDriver(null);
          }}
          isExpiringSoon={isExpiringSoon}
          initials={initials}
        />
      )}
    </div>
  );
};

export default DriverManagement;

/* ── STAT CARD ────────────────────────────────────────────────────────────── */

const StatCard = ({ title, value, color = "blue" }) => {
  const colors = {
    blue: "border-l-blue-500",
    green: "border-l-green-500",
    yellow: "border-l-yellow-500",
    red: "border-l-red-500",
  };
  return (
    <div
      className={`text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl shadow p-5 border-l-4 ${colors[color]}`}
    >
      <p className="text-xs sm:text-sm  font-medium">{title}</p>
      <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
    </div>
  );
};

/* ── DRIVER FORM MODAL (ADD / EDIT) ───────────────────────────────────────── */

const DriverFormModal = ({
  isEdit,
  form,
  setForm,
  onClose,
  onSubmit,
  loading,
  buses,
  routes,
}) => {
  const fields = [
    { label: "Full Name", key: "name", placeholder: "e.g. Ramesh Kumar" },
    { label: "Phone Number", key: "phone", placeholder: "+91 98760 00000" },
    {
      label: "License No.",
      key: "license",
      placeholder: "e.g. RJ-2024-0099123",
    },
    { label: "License Expiry", key: "licenseExpiry", type: "date" },
    { label: "Experience", key: "experience", placeholder: "e.g. 5 years" },
  ];

  const availableBuses = buses.filter((b) => {
    const assignedDriver =
      typeof b.driver === "object" ? b.driver?._id : b.driver;
    return !assignedDriver || assignedDriver === form._id;
  });

  const availableRoutes = routes.filter((r) => {
    const assignedDriver =
      typeof r.driver === "object" ? r.driver?._id : r.driver;
    return !assignedDriver || assignedDriver === form._id;
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FaIdCard className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {isEdit ? "Edit Driver" : "Add New Driver"}
              </h3>
              <p className="text-sm ">
                {isEdit ? "Update driver details" : "Register a new driver"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:text-[rgb(var(--primary))] text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
          {fields.map(({ label, key, placeholder, type }) => (
            <div key={key} className={key === "route" ? "sm:col-span-2" : ""}>
              <label className="block text-xs font-semibold  uppercase tracking-wide mb-1">
                {label}
              </label>
              <input
                type={type || "text"}
                placeholder={placeholder || ""}
                value={form[key]}
                onChange={(e) =>
                  setForm((p) => ({ ...p, [key]: e.target.value }))
                }
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          ))}
          {/* BUS */}
          <div>
            <label className="text-xs font-semibold mb-1 block">
              Assigned Bus (Optional)
            </label>
            <select
              value={form.bus}
              onChange={(e) =>
                setForm((p) => ({ ...p, bus: e.target.value, route: "" }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
            >
              <option value="">Select Bus</option>
              {buses.length === 0 ? (
                <option disabled>No buses available</option>
              ) : (
                availableBuses.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.busId}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* ROUTE */}
          <div>
            <label className="text-xs font-semibold  mb-1 block">
              Assigned Route (Optional)
            </label>
            <select
              value={form.route}
              onChange={(e) =>
                setForm((p) => ({ ...p, route: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
            >
              <option value="">Select Route</option>
              {routes.length === 0 ? (
                <option disabled>No routes available</option>
              ) : (
                availableRoutes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold  mb-1 block">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((p) => ({ ...p, status: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
            >
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-[rgb(var(--text))] bg-[rgb(var(--primary))] transition text-sm font-medium"
          >
            Discard
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-[rgb(var(--text))] bg-[rgb(var(--primary))] transition text-sm font-medium"
          >
            {loading ? "Saving..." : isEdit ? "Update Driver" : "Add Driver"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── VIEW MODAL ───────────────────────────────────────────────────────────── */

const ViewModal = ({ driver, onClose, isExpiringSoon, initials }) => {
  const rows = [
    ["Phone", driver.phone],
    ["License No.", driver.license],
    ["License Expiry", driver.licenseExpiry?.slice(0, 10)],
    ["Assigned Bus", driver.bus?.busId],
    ["Route", driver.route?.name],
    ["Experience", driver.experience],
    ["Status", driver.status],
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-md mx-4">
        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-5">
          {driver.photo?.url ? (
            <img
              src={driver.photo.url}
              alt={driver.name}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 bg-[rgb(var(--primary))] rounded-full flex items-center justify-center text-lg font-bold">
              {initials(driver.name)}
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-[rgb(var(--text))]">{driver.name}</h3>
            <p className="text-sm text-[rgb(var(--text))]">
              {driver.driverId || driver._id?.slice(-8)}
            </p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {rows.map(([label, val]) => (
            <div key={label} className="bg-[rgb(var(--surface))] rounded-lg p-3">
              <p className="text-xs text-[rgb(var(--text))] uppercase font-semibold tracking-wide mb-1">
                {label}
              </p>
              <p
                className={`text-sm font-semibold ${
                  label === "License Expiry" && isExpiringSoon(val)
                    ? "text-red-500"
                    : "text-[rgb(var(--text))]"
                }`}
              >
                {label === "License Expiry" && isExpiringSoon(val) && "⚠️ "}
                {val || "—"}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[rgb(var(--primary-light))] text-[rgb(var(--text))] rounded-lg hover:bg-[rgb(var(--primary))] transition text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── DELETE MODAL ─────────────────────────────────────────────────────────── */

const DeleteModal = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl p-6 w-96 max-w-full mx-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <FaTrash className="text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Delete Driver</h3>
          <p className="text-sm text-[rgb(var(--text))]">This action cannot be undone</p>
        </div>
      </div>
      <p className="text-[rgb(var(--text))] mb-6 text-sm">
        Are you sure you want to delete this driver? All associated data will be
        permanently removed from the system.
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-[rgb(var(--primary-light))] text-[rgb(var(--text))] rounded-lg hover:bg-[rgb(var(--primary))] transition text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
        >
          Delete Driver
        </button>
      </div>
    </div>
  </div>
);
