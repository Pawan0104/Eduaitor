import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaRoute,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const EMPTY_FORM = {
  name: "",
  bus: "",
  driver: "",
  stops: "",
  startTime: "",
  endTime: "",
  stopsList: "",
  status: "Active",
};

const RouteManagement = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [expandedRoute, setExpandedRoute] = useState(null);

  // Modals
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [formModal, setFormModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);

  /* ── FETCH ────────────────────────────────────────────────────────────── */

  const fetchMeta = async () => {
    try {
      const [b, d] = await Promise.all([
        axios.get(`${API}/transport/buses`, { withCredentials: true }),
        axios.get(`${API}/transport/drivers`, { withCredentials: true }),
      ]);

      setBuses(b.data.data || []);
      setDrivers(d.data.data || []);
    } catch {
      toast.error("Failed to load buses/drivers");
    }
  };

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/transport/routes`, {
        withCredentials: true,
      });
      setRoutes(res.data.data || []);
    } catch {
      toast.error("Failed to load routes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
    fetchMeta();
  }, []);

  /* ── ADD / EDIT ───────────────────────────────────────────────────────── */

  const openAdd = () => {
    setIsEdit(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormModal(true);
  };

  const openEdit = (route) => {
    setIsEdit(true);
    setEditId(route._id);
    setForm({
      _id: route._id,
      name: route.name || "",
      bus: route.bus?._id || "",
      driver: route.driver?._id || "",
      stops: String(route.stops || ""),
      startTime: convertTo24Hour(route.startTime),
      endTime: convertTo24Hour(route.endTime),
      stopsList: Array.isArray(route.stopsList)
        ? route.stopsList.join(", ")
        : route.stopsList || "",
    });
    setFormModal(true);
  };

  const handleFormSubmit = async () => {
    if (!form.name.trim()) return toast.error("Route name is required");
    try {
      setFormLoading(true);
      const payload = {
        name: form.name.trim(),
        bus: form.bus || null,
        driver: form.driver || null,
        status: form.status,
        stops: Number(form.stops) || 0,
        startTime: form.startTime.trim(),
        endTime: form.endTime.trim(),
        stopsList: form.stopsList
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (isEdit) {
        await axios.put(`${API}/transport/routes/${editId}`, payload, {
          withCredentials: true,
        });
        toast.success("Route updated successfully");
      } else {
        await axios.post(`${API}/transport/routes`, payload, {
          withCredentials: true,
        });
        toast.success("Route added successfully");
      }
      setFormModal(false);
      fetchRoutes();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save route");
    } finally {
      setFormLoading(false);
    }
  };

  /* ── DELETE ───────────────────────────────────────────────────────────── */

  const handleDeleteClick = (route) => {
    setDeleteTarget(route);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API}/transport/routes/${deleteTarget._id}`, {
        withCredentials: true,
      });
      toast.success("Route deleted successfully");
      setDeleteModal(false);
      setDeleteTarget(null);
      if (expandedRoute === deleteTarget._id) setExpandedRoute(null);
      fetchRoutes();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete route");
    }
  };

  /* ── FILTER ───────────────────────────────────────────────────────────── */

  const filtered = routes.filter((r) => {
    const s = search.toLowerCase();
    const matchSearch =
      r.name?.toLowerCase().includes(s) ||
      r.bus?.busId?.toLowerCase().includes(s) ||
      r.driver?.name?.toLowerCase().includes(s);
    const matchStatus = filterStatus ? r.status === filterStatus : true;
    return matchSearch && matchStatus;
  });

  /* ── STATS ────────────────────────────────────────────────────────────── */

  const totalRoutes = routes.length;
  const activeRoutes = routes.filter((r) => r.status === "Active").length;
  const suspendedRoutes = routes.filter((r) => r.status === "Suspended").length;

  /* ── HELPER ──────────────────────────────────────────────────────────── */

  const convertTo24Hour = (time) => {
    if (!time) return "";
    if (!time.includes(" ")) return time;

    // already correct format
    if (
      time.includes(":") &&
      !time.toLowerCase().includes("am") &&
      !time.toLowerCase().includes("pm")
    ) {
      return time;
    }

    const [timePart, modifier] = time.split(" ");
    let [hours, minutes] = timePart.split(":");

    if (modifier?.toLowerCase() === "pm" && hours !== "12") {
      hours = String(parseInt(hours, 10) + 12);
    }

    if (modifier?.toLowerCase() === "am" && hours === "12") {
      hours = "00";
    }

    return `${hours.padStart(2, "0")}:${minutes}`;
  };

  const formatTime = (time) => {
    if (!time) return "";

    const [h, m] = time.split(":");
    let hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return `${hour}:${m} ${ampm}`;
  };

  /* ── LOADING ──────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading routes...</p>
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
            Route Management
          </h1>
          <p className=" text-sm sm:text-base">
            Configure and monitor school transport routes
          </p>
        </div>
        <button
          onClick={openAdd}
          className="text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-4 py-2 rounded-lg flex items-center gap-2 shadow  transition"
        >
          <FaPlus />
          Add Route
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard title="TOTAL ROUTES" value={totalRoutes} color="blue" />
        <StatCard title="ACTIVE" value={activeRoutes} color="green" />
        <StatCard title="SUSPENDED" value={suspendedRoutes} color="red" />
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-[rgb(var(--primary))]">Route Directory</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search route, bus, driver..."
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
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="btext-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="">
              <tr>
                <th className="p-4 text-left">Route</th>
                <th className="p-4 text-left">Bus / Driver</th>
                <th className="p-4 text-left">Stops</th>
                <th className="p-4 text-left">Timing</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((route) => (
                <React.Fragment key={route._id}>
                  <tr className="border-t ">
                    {/* ROUTE NAME */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 text-[rgb(var(--text))] bg-[rgb(var(--primary))] rounded-full flex items-center justify-center shrink-0">
                          <FaRoute className="text-sm" />
                        </div>
                        <div>
                          <p className="font-semibold text-[rgb(var(--text))]">
                            {route.name}
                          </p>
                          <p className="text-xs text-[rgb(var(--text-light))]">
                            {route.routeId}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* BUS / DRIVER */}
                    <td className="p-4">
                      <p className="font-medium text-[rgb(var(--primary))]">
                        {route.bus?.busId || "unassigned"}
                      </p>
                      <p className="text-xs text-[rgb(var(--text-light))]">
                        {route.driver?.name || "unassigned"}
                      </p>
                    </td>

                    {/* STOPS */}
                    <td className="p-4 text-[rgb(var(--text))]">
                      {route.stops ?? 0} stops
                    </td>

                    {/* TIMING */}
                    <td className="p-4 text-[rgb(var(--text-light))] text-xs">
                      {route.startTime && route.endTime
                        ? `${formatTime(route.startTime)} – ${formatTime(route.endTime)}`
                        : "—"}
                    </td>

                    {/* STATUS */}
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          route.status === "Active"
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {route.status}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button
                          onClick={() =>
                            setExpandedRoute(
                              expandedRoute === route._id ? null : route._id,
                            )
                          }
                          className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition text-xs font-medium flex items-center gap-1"
                        >
                          {expandedRoute === route._id ? (
                            <FaChevronUp className="text-xs" />
                          ) : (
                            <FaChevronDown className="text-xs" />
                          )}
                          Stops
                        </button>
                        <button
                          onClick={() => openEdit(route)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-xs font-medium flex items-center gap-1"
                        >
                          <FaEdit className="text-xs" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(route)}
                          className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition text-xs font-medium flex items-center gap-1"
                        >
                          <FaTrash className="text-xs" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* STOPS EXPANDED ROW */}
                  {expandedRoute === route._id && (
                    <tr key={`${route._id}-stops`} className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] bprder">
                      <td colSpan="6" className="px-6 py-3">
                        <p className="text-xs font-semibold  uppercase tracking-wide mb-2">
                          Stops
                        </p>
                        {Array.isArray(route.stopsList) &&
                        route.stopsList.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {route.stopsList.map((stop, i) => (
                              <span
                                key={`${stop}-${i}`}
                                className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium"
                              >
                                {i + 1}. {stop}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm ">
                            No stops configured for this route.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-[rgb(var(--text-light))]">
                    {filterStatus || search
                      ? "No routes match your filters."
                      : "No routes found. Click 'Add Route' to get started."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}

      {formModal && (
        <RouteFormModal
          isEdit={isEdit}
          form={form}
          setForm={setForm}
          onClose={() => setFormModal(false)}
          onSubmit={handleFormSubmit}
          loading={formLoading}
          buses={buses}
          drivers={drivers}
        />
      )}

      {deleteModal && deleteTarget && (
        <DeleteModal
          route={deleteTarget}
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

export default RouteManagement;

/* ── STAT CARD ────────────────────────────────────────────────────────────── */

const StatCard = ({ title, value, color = "blue" }) => {
  const colors = {
    blue: "border-l-blue-500",
    green: "border-l-green-500",
    red: "border-l-red-500",
    purple: "border-l-purple-500",
  };
  return (
    <div
      className={`text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl shadow p-5 border-l-4 ${colors[color]}`}
    >
      <p className="text-xs sm:text-sm text-[rgb(var(--text-light))] font-medium">{title}</p>
      <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
    </div>
  );
};

/* ── ROUTE FORM MODAL (ADD / EDIT) ────────────────────────────────────────── */

const RouteFormModal = ({
  isEdit,
  form,
  setForm,
  onClose,
  onSubmit,
  loading,
  buses = [],
  drivers = [],
}) => {
  const fields = [
    {
      label: "Route Name",
      key: "name",
      placeholder: "e.g. Route A – North Zone",
      full: true,
    },
    {
      label: "Number of Stops",
      key: "stops",
      placeholder: "e.g. 8",
      type: "number",
    },
    {
      label: "Start Time",
      key: "startTime",
      type: "time",
    },
    {
      label: "End Time",
      key: "endTime",
      type: "time",
    },
    {
      label: "Stop Names (comma-separated)",
      key: "stopsList",
      placeholder: "Jalupura, Raja Park, C-Scheme...",
      full: true,
    },
  ];

  const availableBuses = buses.filter((b) => {
    const assignedRoute = typeof b.route === "object" ? b.route?._id : b.route;
    return !assignedRoute || assignedRoute === form._id;
  });

  const availableDrivers = drivers.filter((d) => {
    const assignedRoute = typeof d.route === "object" ? d.route?._id : d.route;
    return !assignedRoute || assignedRoute === form._id;
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 text-[rgb(var(--text))] bg-[rgb(var(--primary))] rounded-full flex items-center justify-center">
              <FaRoute className="text-[rgb(var(--primary))]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {isEdit ? "Edit Route" : "Add New Route"}
              </h3>
              <p className="text-sm text-[rgb(var(--text-light))]">
                {isEdit
                  ? "Update route details"
                  : "Create a new transport route"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[rgb(var(--text-light))] hover:text-[rgb(var(--text))] text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(({ label, key, placeholder, type, full }) => (
            <div key={key} className={full ? "sm:col-span-2" : ""}>
              <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
                {label}
              </label>
              <input
                type={type || "text"}
                step={type === "time" ? 60 : undefined}
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) =>
                  setForm((p) => ({ ...p, [key]: e.target.value }))
                }
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          ))}

          <div>
            <label className="text-xs font-semibold text-[rgb(var(--text-light))] mb-1 block">
              Assigned Bus
            </label>
            <select
              value={form.bus}
              onChange={(e) =>
                setForm((p) => ({ ...p, bus: e.target.value, driver: "" }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
            >
              <option value="" className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">Select Bus</option>
              {availableBuses.map((b) => (
                <option key={b._id} value={b._id} className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                  {b.busId}
                </option>
              ))}
            </select>
          </div>

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
              <option value="" className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">Select Driver</option>
              {availableDrivers.map((d) => (
                <option key={d._id} value={d._id} className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[rgb(var(--text-light))] mb-1 block">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  status: e.target.value,
                  ...(e.target.value !== "Active" && { bus: "", driver: "" }),
                }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
            >
              <option value="Active" className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">Active</option>
              <option value="Suspended" className="text-[rgb(var(--text))] bg-[rgb(var(--surface))]">Suspended</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))] rounded-lg 00 transition text-sm font-medium"
          >
            Discard
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="px-4 py-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))] rounded-lg  transition text-sm font-medium"
          >
            {loading ? "Saving..." : isEdit ? "Update Route" : "Add Route"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── DELETE MODAL ─────────────────────────────────────────────────────────── */

const DeleteModal = ({ route, onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl p-6 w-96 max-w-full mx-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <FaTrash className="text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Delete Route</h3>
          <p className="text-sm text-[rgb(var(--text-light))]">This action cannot be undone</p>
        </div>
      </div>
      <p className="text-[rgb(var(--text))] mb-6 text-sm">
        Are you sure you want to delete{" "}
        <span className="font-semibold">"{route.name}"</span>? All associated
        stop and assignment data will be permanently removed.
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-[rgb(var(--text))] bg-[rgb(var(--surface))]
            cursor-pointer
          rounded-lg hover:bg-[rgb(var(--surface-light))] transition text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-[rgb(var(--text))] bg-[rgb(var(--primary))] 
            cursor-pointer
          rounded-lg hover:bg-[rgb(var(--primary-light))] transition text-sm"
        >
          Delete Route
        </button>
      </div>
    </div>
  </div>
);
