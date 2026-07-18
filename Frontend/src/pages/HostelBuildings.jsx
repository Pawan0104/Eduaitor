import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaHotel,
  FaArrowLeft,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const EMPTY_FORM = {
  name: "",
  code: "",
  type: "Boys",
  address: "",
  totalFloors: "1",
  capacity: "",
  wardenName: "",
  wardenPhone: "",
  description: "",
  status: "Active",
};

const HostelBuildings = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  const [formModal, setFormModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchHostels = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/hostel`, {
        withCredentials: true,
      });
      setHostels(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load hostels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  const openAdd = () => {
    setIsEdit(false);
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setFormModal(true);
  };

  const openEdit = (hostel) => {
    setIsEdit(true);
    setEditId(hostel._id);
    setForm({
      name: hostel.name || "",
      code: hostel.code || "",
      type: hostel.type || "Boys",
      address: hostel.address || "",
      totalFloors: String(hostel.totalFloors ?? 1),
      capacity: hostel.capacity ? String(hostel.capacity) : "",
      wardenName: hostel.wardenName || "",
      wardenPhone: hostel.wardenPhone || "",
      description: hostel.description || "",
      status: hostel.status || "Active",
    });
    setFormModal(true);
  };

  const handleFormSubmit = async () => {
    if (!form.name.trim()) {
      return toast.error("Hostel name is required");
    }

    const floors = Number(form.totalFloors);
    if (form.totalFloors !== "" && (Number.isNaN(floors) || floors < 0)) {
      return toast.error("Total floors must be 0 or more");
    }

    const capacityNum = form.capacity === "" ? 0 : Number(form.capacity);
    if (Number.isNaN(capacityNum) || capacityNum < 0) {
      return toast.error("Capacity must be 0 or more");
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      type: form.type,
      address: form.address.trim(),
      totalFloors: floors || 0,
      capacity: capacityNum,
      wardenName: form.wardenName.trim(),
      wardenPhone: form.wardenPhone.trim(),
      description: form.description.trim(),
      status: form.status,
    };

    try {
      setFormLoading(true);
      if (isEdit) {
        await axios.put(`${API}/hostel/${editId}`, payload, {
          withCredentials: true,
        });
        toast.success("Hostel updated successfully");
      } else {
        await axios.post(`${API}/hostel`, payload, {
          withCredentials: true,
        });
        toast.success("Hostel created successfully");
      }
      setFormModal(false);
      fetchHostels();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save hostel");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (hostel) => {
    setDeleteTarget(hostel);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API}/hostel/${deleteTarget._id}`, {
        withCredentials: true,
      });
      toast.success("Hostel deleted successfully");
      setDeleteModal(false);
      setDeleteTarget(null);
      fetchHostels();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete hostel");
    }
  };

  const filtered = hostels.filter((h) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      h.name?.toLowerCase().includes(s) ||
      h.code?.toLowerCase().includes(s) ||
      h.wardenName?.toLowerCase().includes(s) ||
      h.address?.toLowerCase().includes(s);
    const matchStatus = filterStatus ? h.status === filterStatus : true;
    const matchType = filterType ? h.type === filterType : true;
    return matchSearch && matchStatus && matchType;
  });

  const total = hostels.length;
  const active = hostels.filter((h) => h.status === "Active").length;
  const inactive = hostels.filter((h) => h.status === "Inactive").length;
  const totalCapacity = hostels.reduce(
    (sum, h) => sum + (Number(h.capacity) || 0),
    0
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading hostels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-[rgb(var(--text))] min-h-screen">
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate("/school/hostel")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white shadow-sm border border-slate-100 text-sm font-bold text-slate-600 active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          {!isMobile && (
            <button
              onClick={() => navigate("/school/hostel")}
              className="flex items-center gap-2 text-sm text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] mb-2"
            >
              <FaArrowLeft size={12} /> Hostel Management
            </button>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold">Hostels</h1>
          <p className="text-sm sm:text-base text-[rgb(var(--text-muted))]">
            Create and manage hostel buildings
          </p>
        </div>
        <button
          onClick={openAdd}
          className="text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-4 py-2 rounded-lg flex items-center gap-2 shadow transition"
        >
          <FaPlus />
          Add Hostel
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="TOTAL HOSTELS" value={total} color="blue" />
        <StatCard title="ACTIVE" value={active} color="green" />
        <StatCard title="INACTIVE" value={inactive} color="gray" />
        <StatCard title="TOTAL CAPACITY" value={totalCapacity} color="indigo" />
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold">Hostel Directory</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search name, code, warden..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full sm:w-64 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
          >
            <option value="">All Types</option>
            <option value="Boys">Boys</option>
            <option value="Girls">Girls</option>
            <option value="Co-ed">Co-ed</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-4 text-left">Hostel</th>
                <th className="p-4 text-left">Type</th>
                <th className="p-4 text-left">Warden</th>
                <th className="p-4 text-left">Floors</th>
                <th className="p-4 text-left">Capacity</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((hostel) => (
                <tr key={hostel._id} className="border-t">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                        <FaHotel />
                      </div>
                      <div>
                        <p className="font-bold text-[rgb(var(--primary))]">
                          {hostel.name}
                        </p>
                        <p className="text-xs text-[rgb(var(--text-muted))]">
                          {hostel.code || "No code"}
                          {hostel.address ? ` · ${hostel.address}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">{hostel.type || "-"}</td>
                  <td className="p-4">
                    <p className="font-medium">
                      {hostel.wardenName || "Unassigned"}
                    </p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">
                      {hostel.wardenPhone || "—"}
                    </p>
                  </td>
                  <td className="p-4">{hostel.totalFloors ?? 0}</td>
                  <td className="p-4">
                    {hostel.capacity ?? 0}
                    <span className="text-[rgb(var(--text-muted))] text-xs">
                      {" "}
                      beds
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        hostel.status === "Active"
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {hostel.status || "Active"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button
                        onClick={() => openEdit(hostel)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-xs font-medium flex items-center gap-1"
                      >
                        <FaEdit className="text-xs" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(hostel)}
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
                  <td
                    colSpan="7"
                    className="text-center py-10 text-[rgb(var(--text-muted))]"
                  >
                    No hostels found. Click &quot;Add Hostel&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formModal && (
        <HostelFormModal
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
          hostel={deleteTarget}
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

export default HostelBuildings;

const StatCard = ({ title, value, color = "blue" }) => {
  const colors = {
    blue: "border-l-blue-500",
    green: "border-l-green-500",
    gray: "border-l-gray-400",
    indigo: "border-l-indigo-500",
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

const HostelFormModal = ({ isEdit, form, setForm, onClose, onSubmit, loading }) => {
  const set = (key) => (e) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <FaHotel className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {isEdit ? "Edit Hostel" : "Add Hostel Building"}
              </h3>
              <p className="text-sm text-[rgb(var(--text-muted))]">
                {isEdit
                  ? "Update hostel building details"
                  : "Create a new hostel building"}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wide mb-1">
              Hostel Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Boys Hostel A"
              value={form.name}
              onChange={set("name")}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-[rgb(var(--surface))]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wide mb-1">
              Code
            </label>
            <input
              type="text"
              placeholder="e.g. HST-A"
              value={form.code}
              onChange={set("code")}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-[rgb(var(--surface))]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wide mb-1">
              Type
            </label>
            <select
              value={form.type}
              onChange={set("type")}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
            >
              <option value="Boys">Boys</option>
              <option value="Girls">Girls</option>
              <option value="Co-ed">Co-ed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wide mb-1">
              Total Floors
            </label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 3"
              value={form.totalFloors}
              onChange={set("totalFloors")}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-[rgb(var(--surface))]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wide mb-1">
              Capacity (beds)
            </label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 120"
              value={form.capacity}
              onChange={set("capacity")}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-[rgb(var(--surface))]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wide mb-1">
              Warden Name
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={form.wardenName}
              onChange={set("wardenName")}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-[rgb(var(--surface))]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wide mb-1">
              Warden Phone
            </label>
            <input
              type="text"
              placeholder="e.g. 9876543210"
              value={form.wardenPhone}
              onChange={set("wardenPhone")}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-[rgb(var(--surface))]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wide mb-1">
              Address / Location
            </label>
            <input
              type="text"
              placeholder="e.g. North Campus, Block B"
              value={form.address}
              onChange={set("address")}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-[rgb(var(--surface))]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wide mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Optional notes"
              value={form.description}
              onChange={set("description")}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-[rgb(var(--surface))] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wide mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={set("status")}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] text-sm font-medium text-[rgb(var(--text))] disabled:opacity-60"
          >
            {loading ? "Saving..." : isEdit ? "Update Hostel" : "Create Hostel"}
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteModal = ({ hostel, onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl p-6 w-full max-w-md mx-4">
      <h3 className="text-lg font-semibold mb-2">Delete Hostel?</h3>
      <p className="text-sm text-[rgb(var(--text-muted))] mb-5">
        Are you sure you want to delete{" "}
        <span className="font-semibold text-[rgb(var(--text))]">
          {hostel.name}
        </span>
        ? This action cannot be undone.
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border text-sm font-medium"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);
