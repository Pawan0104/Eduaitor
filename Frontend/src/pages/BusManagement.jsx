import { useEffect, useState } from "react";
import axios from "axios";
import { FaPlus, FaTrash, FaEdit, FaBus } from "react-icons/fa";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const EMPTY_FORM = {
  _id: null,
  busId: "",
  regNo: "",
  model: "",
  capacity: "",
  driver: "",
  route: "",
  nextService: "",
  status: "Active",
};

const BusManagement = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modals
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [formModal, setFormModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);

  /* ── FETCH ────────────────────────────────────────────────────────────── */
  const fetchMeta = async () => {
    try {
      const [d, r] = await Promise.all([
        axios.get(`${API}/transport/drivers`, { withCredentials: true }),
        axios.get(`${API}/transport/routes`, { withCredentials: true }),
      ]);

      setDrivers(d.data.data || []);
      setRoutes(r.data.data || []);
    } catch (err) {
      toast.error("Failed to load drivers/routes");
    }
  };

  const fetchBuses = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/transport/buses`, {
        withCredentials: true,
      });
      setBuses(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load buses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
    fetchMeta();
  }, []);

  /* ── ADD / EDIT ───────────────────────────────────────────────────────── */

  const openAdd = () => {
    setIsEdit(false);
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setFormModal(true);
  };

  const openEdit = (bus) => {
    setIsEdit(true);
    setEditId(bus._id);
    setForm({
      _id: bus._id,
      busId: bus.busId || "",
      regNo: bus.regNo || "",
      model: bus.model || "",
      capacity: String(bus.capacity || ""),
      driver: bus.driver?._id || "",
      route: bus.route?._id || "",
      nextService:
        bus.nextService &&
        bus.nextService !== "N/A" &&
        !isNaN(new Date(bus.nextService))
          ? new Date(bus.nextService).toISOString().slice(0, 10)
          : "",
      status: bus.status || "Active",
    });
    setFormModal(true);
  };

  const handleFormSubmit = async () => {
    if (!form.busId.trim() || !form.regNo.trim()) {
      return toast.error("Bus ID and registration number are required");
    }

    const capacityNum = Number(form.capacity);
    if (form.capacity && (capacityNum < 1 || capacityNum > 100)) {
      return toast.error("Capacity must be between 1–100");
    }

    try {
      setFormLoading(true);
      const payload = {
        id: form.busId,
        regNo: form.regNo,
        model: form.model,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        driver: form.driver || null,
        route: form.route || null,
        nextService: form.nextService || null,
        status: form.status,
      };
      if (isEdit) {
        await axios.put(`${API}/transport/buses/${editId}`, payload, {
          withCredentials: true,
        });
        toast.success("Bus updated successfully");
      } else {
        await axios.post(`${API}/transport/buses`, payload, {
          withCredentials: true,
        });
        toast.success("Bus registered successfully");
      }
      setFormModal(false);
      fetchBuses();
      fetchMeta();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save bus");
    } finally {
      setFormLoading(false);
    }
  };

  /* ── DELETE ───────────────────────────────────────────────────────────── */

  const handleDeleteClick = (bus) => {
    setDeleteTarget(bus);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API}/transport/buses/${deleteTarget._id}`, {
        withCredentials: true,
      });
      toast.success("Bus deleted successfully");
      setDeleteModal(false);
      setDeleteTarget(null);
      fetchBuses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete bus");
    }
  };

  /* ── FILTER ───────────────────────────────────────────────────────────── */

  const filtered = buses.filter((b) => {
    const s = search.toLowerCase();
    const matchSearch =
      b.busId?.toLowerCase().includes(s) ||
      b.model?.toLowerCase().includes(s) ||
      b.regNo?.toLowerCase().includes(s) ||
      b.driver?.name?.toLowerCase().includes(s) ||
      b.route?.name?.toLowerCase().includes(s);
    const matchStatus = filterStatus ? b.status === filterStatus : true;
    return matchSearch && matchStatus;
  });

  /* ── STATS ────────────────────────────────────────────────────────────── */

  const totalBuses = buses.length;
  const activeBuses = buses.filter((b) => b.status === "Active").length;
  const inMaintenance = buses.filter((b) => b.status === "Maintenance").length;
  const inactiveBuses = buses.filter((b) => b.status === "Inactive").length;

  /* ── LOADING ──────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading buses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-[rgb(var(--text))]  min-h-screen">
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
          <h1 className="text-2xl sm:text-3xl font-bold ">
            Bus Management (WORKING)
          </h1>
          <p className=" text-sm sm:text-base">
            Manage school fleet & maintenance
          </p>
        </div>
        <button
          onClick={openAdd}
          className="text-[rgb(var(--text))] bg-[rgb(var(--primary))]  px-4 py-2 rounded-lg flex items-center gap-2 shadow transition"
        >
          <FaPlus />
          Add Bus
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="TOTAL FLEET" value={totalBuses} color="blue" />
        <StatCard title="ACTIVE" value={activeBuses} color="green" />
        <StatCard title="IN MAINTENANCE" value={inMaintenance} color="yellow" />
        <StatCard title="INACTIVE" value={inactiveBuses} color="gray" />
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold ">Fleet Directory</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search bus ID, model, driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full sm:w-64 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]  rounded-xl shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="">
              <tr>
                <th className="p-4 text-left">Bus</th>
                <th className="p-4 text-left">Model</th>
                <th className="p-4 text-left">Driver / Route</th>
                <th className="p-4 text-left">Capacity</th>
                <th className="p-4 text-left">Next Service</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((bus) => (
                <tr key={bus._id} className="border-t ">
                  {/* BUS ID */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                        <FaBus />
                      </div>
                      <div>
                        <p className="font-bold text-[rgb(var(--primary))]">{bus.busId}</p>
                        <p className=" text-xs">{bus.regNo}</p>
                      </div>
                    </div>
                  </td>

                  {/* MODEL */}
                  <td className="p-4 ">{bus.model || "-"}</td>

                  {/* DRIVER / ROUTE */}
                  <td className="p-4">
                    <p className="font-medium text-[rgb(var(--text))]">
                      {bus.driver?.name || "Unassigned"}
                    </p>
                    <p className="text-xs text-[rgb(var(--text-light))]">
                      {bus.route?.name || "No route"}
                    </p>
                  </td>

                  {/* CAPACITY */}
                  <td className="p-4 ">
                    {bus.capacity ?? 0}
                    <span className="text-[rgb(var(--text-light))] text-xs"> seats</span>
                  </td>

                  {/* NEXT SERVICE */}
                  <td
                    className={`p-4 text-xs ${
                      bus.nextService && new Date(bus.nextService) <= new Date()
                        ? "text-red-600 font-semibold"
                        : ""
                    }`}
                  >
                    {bus.nextService
                      ? new Date(bus.nextService).toLocaleDateString()
                      : "N/A"}
                  </td>

                  {/* STATUS */}
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        bus.status === "Active"
                          ? "bg-green-100 text-green-600"
                          : bus.status === "Maintenance"
                            ? "bg-yellow-100 text-yellow-600"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {bus.status || "Active"}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button
                        onClick={() => openEdit(bus)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-xs font-medium flex items-center gap-1"
                      >
                        <FaEdit className="text-xs" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(bus)}
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
                  <td colSpan="8" className="text-center py-10 text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                    No buses found. Click "Add Bus" to register one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}

      {formModal && (
        <BusFormModal
          isEdit={isEdit}
          form={form}
          setForm={setForm}
          onClose={() => {
            setFormModal(false);
            setForm({ ...EMPTY_FORM });
          }}
          onSubmit={handleFormSubmit}
          loading={formLoading}
          drivers={drivers}
          routes={routes}
        />
      )}

      {deleteModal && deleteTarget && (
        <DeleteModal
          bus={deleteTarget}
          onCancel={() => {
            setDeleteModal(false);
            setDeleteTarget(null);
          }}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

export default BusManagement;

/* ── STAT CARD ────────────────────────────────────────────────────────────── */

const StatCard = ({ title, value, color = "blue" }) => {
  const colors = {
    blue: "border-l-blue-500",
    green: "border-l-green-500",
    yellow: "border-l-yellow-500",
    gray: "border-l-gray-400",
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

/* ── BUS FORM MODAL (ADD / EDIT) ──────────────────────────────────────────── */

const BusFormModal = ({
  isEdit,
  form,
  setForm,
  onClose,
  onSubmit,
  loading,
  drivers,
  routes,
}) => {
  const fields = [
    {
      label: "Bus ID",
      key: "busId",
      placeholder: "e.g. BUS-07",
      disabled: false,
    },
    {
      label: "Registration No.",
      key: "regNo",
      placeholder: "e.g. RJ14-CA-2211",
    },
    { label: "Model", key: "model", placeholder: "e.g. Tata Starbus" },
    {
      label: "Seating Capacity",
      key: "capacity",
      placeholder: "e.g. 48",
      type: "number",
    },
  ];

  const availableDrivers = drivers.filter((d) => {
    const assignedBus = typeof d.bus === "object" ? d.bus?._id : d.bus;
    return !assignedBus || assignedBus === form._id;
  });

  const availableRoutes = routes.filter((r) => {
    const assignedBus = typeof r.bus === "object" ? r.bus?._id : r.bus;
    return !assignedBus || assignedBus === form._id;
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FaBus className="text-[rgb(var(--primary))]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {isEdit ? "Edit Bus" : "Register New Bus"}
              </h3>
              <p className="text-sm ">
                {isEdit ? "Update bus details" : "Add a new bus to the fleet"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[rgb(var(--primary))] text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(({ label, key, placeholder, type, disabled }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
                {label}
              </label>
              <input
                type={type || "text"}
                placeholder={placeholder}
                value={form[key]}
                disabled={disabled}
                onChange={(e) =>
                  setForm((p) => ({ ...p, [key]: e.target.value }))
                }
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                  disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""
                }`}
              />
            </div>
          ))}
          {/* DRIVER */}
          <div>
            <label className="text-xs font-semibold text-[rgb(var(--text-light))] mb-1 block">
              Assigned Driver
            </label>
            <select
              value={form.driver}
              onChange={(e) =>
                setForm((p) => ({ ...p, driver: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
            >
              <option value="" className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                Select Driver
              </option>

              {drivers.length === 0 ? (
                <option disabled>No drivers available</option>
              ) : (
                availableDrivers.map((d) => (
                  <option key={d._id} value={d._id} className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                    {d.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* ROUTE */}
          <div>
            <label className="text-xs font-semibold text-[rgb(var(--text-light))] mb-1 block">
              Assigned Route
            </label>
            <select
              value={form.route}
              onChange={(e) =>
                setForm((p) => ({ ...p, route: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
            >
              <option value="" className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                Select Route
              </option>

              {routes.length === 0 ? (
                <option disabled>No routes available</option>
              ) : (
                availableRoutes.map((r) => (
                  <option key={r._id} value={r._id} className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                    {r.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] mb-1">
              Next Service Date
            </label>
            <input
              type="date"
              value={form.nextService}
              onChange={(e) =>
                setForm((p) => ({ ...p, nextService: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] mb-1">
              Status
            </label>
            <select
              value={form.status || "Active"}
              onChange={(e) =>
                setForm((p) => ({ ...p, status: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
            >
              <option value="Active">Active</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))]  rounded-lg transition text-sm font-medium"
          >
            Discard
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg transition text-sm font-medium text-[rgb(var(--text))] bg-[rgb(var(--primary))]"
          >
            {loading ? "Saving..." : isEdit ? "Update Bus" : "Register Bus"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── DELETE MODAL ─────────────────────────────────────────────────────────── */

const DeleteModal = ({ bus, onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl p-6 w-96 max-w-full mx-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <FaTrash className="text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Delete Bus</h3>
          <p className="text-sm text-[rgb(var(--text-light))]">This action cannot be undone</p>
        </div>
      </div>
      <p className="text-[rgb(var(--text))] mb-6 text-sm">
        Are you sure you want to delete{" "}
        <span className="font-semibold">{bus.busId}</span> ({bus.regNo})? It
        will be permanently removed from the fleet.
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))] rounded-lg hover:bg-[rgb(var(--primary-light))] transition text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
        >
          Delete Bus
        </button>
      </div>
    </div>
  </div>
);
