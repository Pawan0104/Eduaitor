import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaMapMarkerAlt,
  FaBusAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const EMPTY_FORM = {
  _id: null,
  stopCode: "",
  stopName: "",
  latitude: "",
  longitude: "",
  address: "",
  geoFenceRadius: "100",
  pickupTime: "",
  dropTime: "",
  maxStudents: "",
  status: "Active",
};

const TransportStops = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [formModal, setFormModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  /* ── FETCH ────────────────────────────────────────────────────────────── */
  const fetchStops = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/transport/stops`, {
        withCredentials: true,
      });
      setStops(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load stops");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStops();
  }, []);

  /* ── ADD / EDIT ───────────────────────────────────────────────────────── */

  const openAdd = () => {
    setIsEdit(false);
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setFormModal(true);
  };

  const openEdit = (stop) => {
    setIsEdit(true);
    setEditId(stop._id);
    setForm({
      _id: stop._id,
      stopCode: stop.stopCode || "",
      stopName: stop.stopName || "",
      latitude:
        stop.latitude != null && stop.latitude !== "" ? String(stop.latitude) : "",
      longitude:
        stop.longitude != null && stop.longitude !== ""
          ? String(stop.longitude)
          : "",
      address: stop.address || "",
      geoFenceRadius: String(stop.geoFenceRadius ?? 100),
      pickupTime: stop.pickupTime || "",
      dropTime: stop.dropTime || "",
      maxStudents: String(stop.maxStudents ?? ""),
      status: stop.status || "Active",
    });
    setFormModal(true);
  };

  const handleFormSubmit = async () => {
    if (!form.stopName.trim()) {
      return toast.error("Stop name is required");
    }

    try {
      setFormLoading(true);
      const payload = {
        stopCode: form.stopCode?.trim() || undefined,
        stopName: form.stopName.trim(),
        latitude: form.latitude !== "" ? Number(form.latitude) : undefined,
        longitude: form.longitude !== "" ? Number(form.longitude) : undefined,
        address: form.address || "",
        geoFenceRadius: form.geoFenceRadius
          ? Number(form.geoFenceRadius)
          : 100,
        pickupTime: form.pickupTime || "",
        dropTime: form.dropTime || "",
        maxStudents: form.maxStudents ? Number(form.maxStudents) : 0,
        status: form.status,
      };
      if (isEdit) {
        await axios.put(`${API}/transport/stops/${editId}`, payload, {
          withCredentials: true,
        });
        toast.success("Stop updated successfully");
      } else {
        await axios.post(`${API}/transport/stops`, payload, {
          withCredentials: true,
        });
        toast.success("Stop added successfully");
      }
      setFormModal(false);
      fetchStops();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save stop");
    } finally {
      setFormLoading(false);
    }
  };

  /* ── DELETE ───────────────────────────────────────────────────────────── */

  const handleDeleteClick = (stop) => {
    setDeleteTarget(stop);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API}/transport/stops/${deleteTarget._id}`, {
        withCredentials: true,
      });
      toast.success("Stop deleted successfully");
      setDeleteModal(false);
      setDeleteTarget(null);
      fetchStops();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete stop");
    }
  };

  /* ── FILTER ───────────────────────────────────────────────────────────── */

  const filtered = stops.filter((stop) => {
    const s = search.toLowerCase();
    const matchSearch =
      stop.stopName?.toLowerCase().includes(s) ||
      stop.stopCode?.toLowerCase().includes(s) ||
      stop.address?.toLowerCase().includes(s);
    const matchStatus = filterStatus ? stop.status === filterStatus : true;
    return matchSearch && matchStatus;
  });

  /* ── STATS ────────────────────────────────────────────────────────────── */

  const totalStops = stops.length;
  const activeStops = stops.filter((s) => s.status === "Active").length;
  const inactiveStops = stops.filter((s) => s.status === "Inactive").length;
  const totalCapacity = stops.reduce(
    (sum, s) => sum + (Number(s.maxStudents) || 0),
    0,
  );

  /* ── LOADING ──────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading stops...</p>
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
          <h1 className="text-2xl sm:text-3xl font-bold ">Transport Stops</h1>
          <p className="text-sm sm:text-base">
            Manage bus stops, geofencing & pickup/drop schedules
          </p>
        </div>
        <button
          onClick={openAdd}
          className="text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-4 py-2 rounded-lg flex items-center gap-2 shadow transition"
        >
          <FaPlus />
          Add Stop
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="TOTAL STOPS" value={totalStops} color="blue" />
        <StatCard title="ACTIVE" value={activeStops} color="green" />
        <StatCard title="INACTIVE" value={inactiveStops} color="gray" />
        <StatCard title="TOTAL CAPACITY" value={totalCapacity} color="yellow" />
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold ">Stop Directory</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search stop, code, area..."
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
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="">
              <tr>
                <th className="p-4 text-left">Stop</th>
                <th className="p-4 text-left">Location</th>
                <th className="p-4 text-left">Schedule</th>
                <th className="p-4 text-left">Capacity</th>
                <th className="p-4 text-left">Geo-Fence</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((stop) => (
                <tr key={stop._id} className="border-t ">
                  {/* STOP */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                        <FaBusAlt />
                      </div>
                      <div>
                        <p className="font-bold text-[rgb(var(--primary))]">
                          {stop.stopName}
                        </p>
                        <p className="text-xs">{stop.stopCode || "-"}</p>
                      </div>
                    </div>
                  </td>

                  {/* LOCATION */}
                  <td className="p-4">
                    {stop.latitude != null && stop.longitude != null ? (
                      <div>
                        <p className="text-xs">
                          {Number(stop.latitude).toFixed(5)},{" "}
                          {Number(stop.longitude).toFixed(5)}
                        </p>
                        <a
                          href={`https://www.google.com/maps?q=${stop.latitude},${stop.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                        >
                          <FaMapMarkerAlt /> View Map
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-[rgb(var(--text-light))]">
                        {stop.address || "No coordinates"}
                      </p>
                    )}
                  </td>

                  {/* SCHEDULE */}
                  <td className="p-4">
                    <p className="text-xs">
                      <span className="text-[rgb(var(--text-light))]">Up: </span>
                      {stop.pickupTime || "-"}
                    </p>
                    <p className="text-xs mt-0.5">
                      <span className="text-[rgb(var(--text-light))]">Down: </span>
                      {stop.dropTime || "-"}
                    </p>
                  </td>

                  {/* CAPACITY */}
                  <td className="p-4">
                    {stop.maxStudents ?? 0}
                    <span className="text-[rgb(var(--text-light))] text-xs"> seats</span>
                  </td>

                  {/* GEO-FENCE */}
                  <td className="p-4 text-xs">
                    {stop.geoFenceRadius ?? 100} m
                  </td>

                  {/* STATUS */}
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        stop.status === "Active"
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {stop.status || "Active"}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button
                        onClick={() => openEdit(stop)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-xs font-medium flex items-center gap-1"
                      >
                        <FaEdit className="text-xs" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(stop)}
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
                  <td colSpan="7" className="text-center py-10 text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                    No stops found. Click "Add Stop" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {formModal && (
        <StopFormModal
          isEdit={isEdit}
          form={form}
          setForm={setForm}
          onClose={() => {
            setFormModal(false);
            setForm({ ...EMPTY_FORM });
          }}
          onSubmit={handleFormSubmit}
          loading={formLoading}
        />
      )}

      {deleteModal && deleteTarget && (
        <DeleteModal
          stop={deleteTarget}
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

export default TransportStops;

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
      <p className="text-xs sm:text-sm font-medium">{title}</p>
      <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
    </div>
  );
};

/* ── STOP FORM MODAL (ADD / EDIT) ─────────────────────────────────────────── */

const StopFormModal = ({ isEdit, form, setForm, onClose, onSubmit, loading }) => {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FaBusAlt className="text-[rgb(var(--primary))]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {isEdit ? "Edit Stop" : "Add New Stop"}
              </h3>
              <p className="text-sm ">
                {isEdit ? "Update stop details" : "Register a new bus stop"}
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
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Stop Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Gandhi Chowk"
              value={form.stopName}
              onChange={(e) =>
                setForm((p) => ({ ...p, stopName: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Stop Code
            </label>
            <input
              type="text"
              placeholder="Auto if blank"
              value={form.stopCode}
              onChange={(e) =>
                setForm((p) => ({ ...p, stopCode: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 26.9124"
              value={form.latitude}
              onChange={(e) =>
                setForm((p) => ({ ...p, latitude: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 75.7873"
              value={form.longitude}
              onChange={(e) =>
                setForm((p) => ({ ...p, longitude: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Address / Area
            </label>
            <input
              type="text"
              placeholder="e.g. Main Road, Sector 4"
              value={form.address}
              onChange={(e) =>
                setForm((p) => ({ ...p, address: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Geo-Fence Radius (m)
            </label>
            <input
              type="number"
              placeholder="e.g. 100"
              value={form.geoFenceRadius}
              onChange={(e) =>
                setForm((p) => ({ ...p, geoFenceRadius: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Max Students
            </label>
            <input
              type="number"
              placeholder="e.g. 40"
              value={form.maxStudents}
              onChange={(e) =>
                setForm((p) => ({ ...p, maxStudents: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Pickup Time
            </label>
            <input
              type="time"
              value={form.pickupTime}
              onChange={(e) =>
                setForm((p) => ({ ...p, pickupTime: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Drop Time
            </label>
            <input
              type="time"
              value={form.dropTime}
              onChange={(e) =>
                setForm((p) => ({ ...p, dropTime: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
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
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg transition text-sm font-medium text-[rgb(var(--text))] bg-[rgb(var(--primary))]"
          >
            Discard
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg transition text-sm font-medium text-[rgb(var(--text))] bg-[rgb(var(--primary))]"
          >
            {loading ? "Saving..." : isEdit ? "Update Stop" : "Add Stop"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── DELETE MODAL ─────────────────────────────────────────────────────────── */

const DeleteModal = ({ stop, onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl p-6 w-96 max-w-full mx-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <FaTrash className="text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Delete Stop</h3>
          <p className="text-sm text-[rgb(var(--text-light))]">This action cannot be undone</p>
        </div>
      </div>
      <p className="text-[rgb(var(--text))] mb-6 text-sm">
        Are you sure you want to delete{" "}
        <span className="font-semibold">{stop.stopName}</span>? It will be
        permanently removed from the transport module.
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
          Delete Stop
        </button>
      </div>
    </div>
  </div>
);