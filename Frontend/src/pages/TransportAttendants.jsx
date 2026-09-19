import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaUserShield,
  FaClipboardCheck,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const EMPTY_FORM = {
  _id: null,
  name: "",
  phone: "",
  gender: "Male",
  bloodGroup: "",
  vehicle: "",
  route: "",
  policeVerified: false,
  aadharVerified: false,
  status: "Active",
};

const EMPTY_ATTENDANCE = {
  date: new Date().toISOString().slice(0, 10),
  status: "Present",
  note: "",
};

const TransportAttendants = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const [attendants, setAttendants] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
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

  const [attModal, setAttModal] = useState(false);
  const [attTarget, setAttTarget] = useState(null);
  const [attForm, setAttForm] = useState(EMPTY_ATTENDANCE);
  const [attLoading, setAttLoading] = useState(false);

  /* ── FETCH ────────────────────────────────────────────────────────────── */

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [attRes, busRes, routeRes] = await Promise.all([
        axios.get(`${API}/transport/attendants`, { withCredentials: true }),
        axios.get(`${API}/transport/buses`, { withCredentials: true }),
        axios.get(`${API}/transport/routes`, { withCredentials: true }),
      ]);
      setAttendants(attRes.data.data || []);
      setBuses(busRes.data.data || []);
      setRoutes(routeRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load attendants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  /* ── ADD / EDIT ───────────────────────────────────────────────────────── */

  const openAdd = () => {
    setIsEdit(false);
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setFormModal(true);
  };

  const openEdit = (att) => {
    setIsEdit(true);
    setEditId(att._id);
    const now = new Date(att.createdAt || Date.now());
    const today = now.toISOString().slice(0, 10);
    setForm({
      _id: att._id,
      name: att.name || "",
      phone: att.phone || "",
      gender: att.gender || "Male",
      bloodGroup: att.bloodGroup || "",
      vehicle: att.vehicle?._id || att.vehicle || "",
      route: att.route?._id || att.route || "",
      policeVerified: att.verification?.policeVerified || false,
      aadharVerified: att.verification?.aadharVerified || false,
      status: att.status || "Active",
      _today: today,
    });
    setFormModal(true);
  };

  const handleFormSubmit = async () => {
    if (!form.name.trim()) return toast.error("Attendant name is required");
    if (form.phone && !/^[0-9]{10}$/.test(form.phone))
      return toast.error("Phone must be 10 digits");

    try {
      setFormLoading(true);
      const payload = {
        name: form.name.trim(),
        phone: form.phone || undefined,
        gender: form.gender,
        bloodGroup: form.bloodGroup || "",
        vehicle: form.vehicle || null,
        route: form.route || null,
        verification: {
          policeVerified: form.policeVerified,
          aadharVerified: form.aadharVerified,
        },
        status: form.status,
      };
      if (isEdit) {
        await axios.put(`${API}/transport/attendants/${editId}`, payload, {
          withCredentials: true,
        });
        toast.success("Attendant updated successfully");
      } else {
        await axios.post(`${API}/transport/attendants`, payload, {
          withCredentials: true,
        });
        toast.success("Attendant added successfully");
      }
      setFormModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save attendant");
    } finally {
      setFormLoading(false);
    }
  };

  /* ── ATTENDANCE ───────────────────────────────────────────────────────── */

  const openAttendance = (att) => {
    setAttTarget(att);
    setAttForm({ ...EMPTY_ATTENDANCE });
    setAttModal(true);
  };

  const submitAttendance = async () => {
    if (!attForm.date) return toast.error("Date is required");
    try {
      setAttLoading(true);
      await axios.patch(
        `${API}/transport/attendants/${attTarget._id}/attendance`,
        {
          date: attForm.date,
          status: attForm.status,
          note: attForm.note,
        },
        { withCredentials: true },
      );
      toast.success("Attendance marked");
      setAttModal(false);
      setAttTarget(null);
      setAttForm({ ...EMPTY_ATTENDANCE });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark attendance");
    } finally {
      setAttLoading(false);
    }
  };

  /* ── DELETE ───────────────────────────────────────────────────────────── */

  const handleDeleteClick = (att) => {
    setDeleteTarget(att);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API}/transport/attendants/${deleteTarget._id}`, {
        withCredentials: true,
      });
      toast.success("Attendant deleted successfully");
      setDeleteModal(false);
      setDeleteTarget(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete attendant");
    }
  };

  /* ── FILTER ───────────────────────────────────────────────────────────── */

  const filtered = attendants.filter((att) => {
    const s = search.toLowerCase();
    const matchSearch =
      att.name?.toLowerCase().includes(s) ||
      att.attendantId?.toLowerCase().includes(s) ||
      att.phone?.toLowerCase().includes(s);
    const matchStatus = filterStatus ? att.status === filterStatus : true;
    return matchSearch && matchStatus;
  });

  /* ── STATS ────────────────────────────────────────────────────────────── */

  const total = attendants.length;
  const active = attendants.filter((a) => a.status === "Active").length;
  const onLeave = attendants.filter((a) => a.status === "On Leave").length;
  const assigned = attendants.filter((a) => a.vehicle).length;

  const lastAttendance = (att) => {
    const list = att.attendances || [];
    if (!list.length) return null;
    return list[list.length - 1];
  };

  /* ── LOADING ──────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading attendants...</p>
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
          <h1 className="text-2xl sm:text-3xl font-bold ">Transport Attendants</h1>
          <p className="text-sm sm:text-base">
            Manage van attendants, verification & daily attendance
          </p>
        </div>
        <button
          onClick={openAdd}
          className="text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-4 py-2 rounded-lg flex items-center gap-2 shadow transition"
        >
          <FaPlus />
          Add Attendant
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="TOTAL ATTENDANTS" value={total} color="blue" />
        <StatCard title="ACTIVE" value={active} color="green" />
        <StatCard title="ON LEAVE" value={onLeave} color="yellow" />
        <StatCard title="ASSIGNED" value={assigned} color="violet" />
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold ">Attendant Directory</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search name, ID, phone..."
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
            <option value="On Leave">On Leave</option>
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
                <th className="p-4 text-left">Attendant</th>
                <th className="p-4 text-left">Assignment</th>
                <th className="p-4 text-left">Verification</th>
                <th className="p-4 text-left">Last Attendance</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((att) => {
                const last = lastAttendance(att);
                return (
                  <tr key={att._id} className="border-t ">
                    {/* ATTENDANT */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center">
                          <FaUserShield />
                        </div>
                        <div>
                          <p className="font-bold text-[rgb(var(--primary))]">
                            {att.name}
                          </p>
                          <p className="text-xs">
                            {att.attendantId || "-"}
                            {att.phone ? ` • ${att.phone}` : ""}
                          </p>
                          <p className="text-xs text-[rgb(var(--text-light))]">
                            {att.gender}
                            {att.bloodGroup ? ` • ${att.bloodGroup}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* ASSIGNMENT */}
                    <td className="p-4">
                      <p className="text-xs">
                        Bus: {att.vehicle?.regNo || att.vehicleName || "-"}
                      </p>
                      <p className="text-xs mt-0.5 text-[rgb(var(--text-light))]">
                        Route: {att.route?.name || "-"}
                      </p>
                    </td>

                    {/* VERIFICATION */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`flex items-center gap-1 text-xs ${
                            att.verification?.policeVerified
                              ? "text-green-600"
                              : "text-gray-400"
                          }`}
                        >
                          {att.verification?.policeVerified ? (
                            <FaCheckCircle />
                          ) : (
                            <FaExclamationCircle />
                          )}
                          Police
                        </span>
                        <span
                          className={`flex items-center gap-1 text-xs ${
                            att.verification?.aadharVerified
                              ? "text-green-600"
                              : "text-gray-400"
                          }`}
                        >
                          {att.verification?.aadharVerified ? (
                            <FaCheckCircle />
                          ) : (
                            <FaExclamationCircle />
                          )}
                          Aadhar
                        </span>
                      </div>
                    </td>

                    {/* LAST ATTENDANCE */}
                    <td className="p-4">
                      {last ? (
                        <div>
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${
                              last.status === "Present"
                                ? "bg-green-100 text-green-600"
                                : last.status === "Absent"
                                  ? "bg-red-100 text-red-600"
                                  : "bg-yellow-100 text-yellow-600"
                            }`}
                          >
                            {last.status}
                          </span>
                          <p className="text-xs text-[rgb(var(--text-light))] mt-1">
                            {last.date}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-[rgb(var(--text-light))]">
                          No record
                        </p>
                      )}
                    </td>

                    {/* STATUS */}
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          att.status === "Active"
                            ? "bg-green-100 text-green-600"
                            : att.status === "On Leave"
                              ? "bg-yellow-100 text-yellow-600"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {att.status || "Active"}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button
                          onClick={() => openAttendance(att)}
                          className="px-3 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition text-xs font-medium flex items-center gap-1"
                        >
                          <FaClipboardCheck className="text-xs" />
                          Attendance
                        </button>
                        <button
                          onClick={() => openEdit(att)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-xs font-medium flex items-center gap-1"
                        >
                          <FaEdit className="text-xs" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(att)}
                          className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition text-xs font-medium flex items-center gap-1"
                        >
                          <FaTrash className="text-xs" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                    No attendants found. Click "Add Attendant" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {formModal && (
        <AttendantFormModal
          isEdit={isEdit}
          form={form}
          setForm={setForm}
          buses={buses}
          routes={routes}
          onClose={() => {
            setFormModal(false);
            setForm({ ...EMPTY_FORM });
          }}
          onSubmit={handleFormSubmit}
          loading={formLoading}
        />
      )}

      {attModal && attTarget && (
        <AttendanceModal
          attendant={attTarget}
          form={attForm}
          setForm={setAttForm}
          onClose={() => {
            setAttModal(false);
            setAttTarget(null);
            setAttForm({ ...EMPTY_ATTENDANCE });
          }}
          onSubmit={submitAttendance}
          loading={attLoading}
        />
      )}

      {deleteModal && deleteTarget && (
        <DeleteModal
          attendant={deleteTarget}
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

export default TransportAttendants;

/* ── STAT CARD ────────────────────────────────────────────────────────────── */

const StatCard = ({ title, value, color = "blue" }) => {
  const colors = {
    blue: "border-l-blue-500",
    green: "border-l-green-500",
    yellow: "border-l-yellow-500",
    violet: "border-l-violet-500",
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

/* ── ATTENDANT FORM MODAL (ADD / EDIT) ────────────────────────────────────── */

const AttendantFormModal = ({
  isEdit,
  form,
  setForm,
  buses,
  routes,
  onClose,
  onSubmit,
  loading,
}) => {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
              <FaUserShield className="text-violet-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {isEdit ? "Edit Attendant" : "Add New Attendant"}
              </h3>
              <p className="text-sm ">
                {isEdit ? "Update attendant details" : "Register a new van attendant"}
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
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Phone
            </label>
            <input
              type="tel"
              maxLength={10}
              placeholder="10 digit mobile"
              value={form.phone}
              onChange={(e) =>
                setForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "") }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Gender
            </label>
            <select
              value={form.gender || "Male"}
              onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Blood Group
            </label>
            <input
              type="text"
              placeholder="e.g. B+"
              value={form.bloodGroup}
              onChange={(e) =>
                setForm((p) => ({ ...p, bloodGroup: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Assigned Bus
            </label>
            <select
              value={form.vehicle || ""}
              onChange={(e) => setForm((p) => ({ ...p, vehicle: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
            >
              <option value="">Unassigned</option>
              {buses.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.regNo || b.busNumber || b.id || "Bus"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Assigned Route
            </label>
            <select
              value={form.route || ""}
              onChange={(e) => setForm((p) => ({ ...p, route: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
            >
              <option value="">Unassigned</option>
              {routes.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name || "Route"}
                </option>
              ))}
            </select>
          </div>

          {/* Verification */}
          <div className="sm:col-span-2 border rounded-lg p-3">
            <p className="text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-2">
              Verification Status
            </p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.policeVerified}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, policeVerified: e.target.checked }))
                  }
                  className="accent-violet-600"
                />
                Police Verified
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.aadharVerified}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, aadharVerified: e.target.checked }))
                  }
                  className="accent-violet-600"
                />
                Aadhar Verified
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Status
            </label>
            <select
              value={form.status || "Active"}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
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
            className="px-4 py-2 rounded-lg transition text-sm font-medium text-[rgb(var(--text))] bg-[rgb(var(--primary))]"
          >
            Discard
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg transition text-sm font-medium text-[rgb(var(--text))] bg-[rgb(var(--primary))]"
          >
            {loading ? "Saving..." : isEdit ? "Update Attendant" : "Add Attendant"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── ATTENDANCE MODAL ─────────────────────────────────────────────────────── */

const AttendanceModal = ({ attendant, form, setForm, onClose, onSubmit, loading }) => {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <FaClipboardCheck className="text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Mark Attendance</h3>
              <p className="text-sm text-[rgb(var(--text-light))]">
                {attendant.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[rgb(var(--primary))] text-xl font-bold">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Date
            </label>
            <input
              type="date"
              value={form.date || ""}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Status
            </label>
            <select
              value={form.status || "Present"}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
            >
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Left early"
              value={form.note || ""}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg transition text-sm font-medium text-[rgb(var(--text))] bg-[rgb(var(--primary))]"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg transition text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            {loading ? "Marking..." : "Mark Attendance"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── DELETE MODAL ─────────────────────────────────────────────────────────── */

const DeleteModal = ({ attendant, onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl p-6 w-96 max-w-full mx-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <FaTrash className="text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Delete Attendant</h3>
          <p className="text-sm text-[rgb(var(--text-light))]">This action cannot be undone</p>
        </div>
      </div>
      <p className="text-[rgb(var(--text))] mb-6 text-sm">
        Are you sure you want to delete{" "}
        <span className="font-semibold">{attendant.name}</span>? It will be
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
          Delete Attendant
        </button>
      </div>
    </div>
  </div>
);