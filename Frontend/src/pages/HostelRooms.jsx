import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaBed,
  FaArrowLeft,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const EMPTY_FORM = {
  hostelId: "",
  roomNumber: "",
  floor: "1",
  roomType: "Double",
  bedCount: "2",
  amenities: "",
  notes: "",
  status: "Active",
};

const TYPE_BEDS = {
  Single: 1,
  Double: 2,
  Triple: 3,
  Quad: 4,
  Dormitory: 6,
};

const HostelRooms = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterHostel, setFilterHostel] = useState("");
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
      const res = await axios.get(`${API}/hostel`, { withCredentials: true });
      setHostels(res.data.data || []);
    } catch {
      toast.error("Failed to load hostels");
    }
  };

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/hostel/rooms`, {
        withCredentials: true,
      });
      setRooms(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostels();
    fetchRooms();
  }, []);

  const openAdd = () => {
    setIsEdit(false);
    setEditId(null);
    setForm({
      ...EMPTY_FORM,
      hostelId: filterHostel || hostels[0]?._id || "",
    });
    setFormModal(true);
  };

  const openEdit = (room) => {
    setIsEdit(true);
    setEditId(room._id);
    setForm({
      hostelId: room.hostelId?._id || room.hostelId || "",
      roomNumber: room.roomNumber || "",
      floor: String(room.floor ?? 1),
      roomType: room.roomType || "Double",
      bedCount: String(room.totalBeds || room.beds?.length || 2),
      amenities: room.amenities || "",
      notes: room.notes || "",
      status: room.status || "Active",
    });
    setFormModal(true);
  };

  const handleTypeChange = (roomType) => {
    setForm((p) => ({
      ...p,
      roomType,
      bedCount: String(TYPE_BEDS[roomType] || p.bedCount || 2),
    }));
  };

  const handleFormSubmit = async () => {
    if (!form.hostelId) return toast.error("Please select a hostel");
    if (!form.roomNumber.trim()) return toast.error("Room number is required");

    const bedCount = Number(form.bedCount);
    if (!bedCount || bedCount < 1) {
      return toast.error("Bed count must be at least 1");
    }

    const payload = {
      hostelId: form.hostelId,
      roomNumber: form.roomNumber.trim(),
      floor: Number(form.floor) || 0,
      roomType: form.roomType,
      bedCount,
      amenities: form.amenities.trim(),
      notes: form.notes.trim(),
      status: form.status,
    };

    try {
      setFormLoading(true);
      if (isEdit) {
        await axios.put(`${API}/hostel/rooms/${editId}`, payload, {
          withCredentials: true,
        });
        toast.success("Room updated successfully");
      } else {
        await axios.post(`${API}/hostel/rooms`, payload, {
          withCredentials: true,
        });
        toast.success("Room created successfully");
      }
      setFormModal(false);
      fetchRooms();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save room");
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API}/hostel/rooms/${deleteTarget._id}`, {
        withCredentials: true,
      });
      toast.success("Room deleted successfully");
      setDeleteModal(false);
      setDeleteTarget(null);
      fetchRooms();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete room");
    }
  };

  const filtered = rooms.filter((r) => {
    const s = search.toLowerCase();
    const hostelName = r.hostelId?.name?.toLowerCase() || "";
    const matchSearch =
      !s ||
      r.roomNumber?.toLowerCase().includes(s) ||
      hostelName.includes(s) ||
      r.amenities?.toLowerCase().includes(s) ||
      r.beds?.some((b) => b.bedNumber?.toLowerCase().includes(s));
    const matchHostel = filterHostel
      ? (r.hostelId?._id || r.hostelId) === filterHostel
      : true;
    const matchStatus = filterStatus ? r.status === filterStatus : true;
    const matchType = filterType ? r.roomType === filterType : true;
    return matchSearch && matchHostel && matchStatus && matchType;
  });

  const totalRooms = rooms.length;
  const totalBeds = rooms.reduce((sum, r) => sum + (r.totalBeds || 0), 0);
  const availableBeds = rooms.reduce(
    (sum, r) => sum + (r.availableBeds || 0),
    0
  );
  const occupiedBeds = rooms.reduce(
    (sum, r) => sum + (r.occupiedBeds || 0),
    0
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading rooms...</p>
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white shadow-sm border border-slate-100 text-sm font-bold text-slate-600 mb-2.5"
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
          <h1 className="text-2xl sm:text-3xl font-bold">Rooms & Beds</h1>
          <p className="text-sm sm:text-base text-[rgb(var(--text-muted))]">
            Allocate rooms and beds under each hostel building
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={hostels.length === 0}
          className="text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-4 py-2 rounded-lg flex items-center gap-2 shadow transition disabled:opacity-50"
        >
          <FaPlus />
          Add Room
        </button>
      </div>

      {hostels.length === 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Create a hostel building first before adding rooms.{" "}
          <button
            type="button"
            onClick={() => navigate("/school/hostel/buildings")}
            className="underline font-semibold"
          >
            Go to Hostels
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="TOTAL ROOMS" value={totalRooms} color="blue" />
        <StatCard title="TOTAL BEDS" value={totalBeds} color="indigo" />
        <StatCard title="AVAILABLE" value={availableBeds} color="green" />
        <StatCard title="OCCUPIED" value={occupiedBeds} color="amber" />
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold">Room Directory</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search room, bed, hostel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full sm:w-56 focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-[rgb(var(--surface))]"
          />
          <select
            value={filterHostel}
            onChange={(e) => setFilterHostel(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
          >
            <option value="">All Hostels</option>
            {hostels.map((h) => (
              <option key={h._id} value={h._id}>
                {h.name}
              </option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
          >
            <option value="">All Types</option>
            {Object.keys(TYPE_BEDS).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      <div className="bg-[rgb(var(--surface))] rounded-xl shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-4 text-left">Room</th>
                <th className="p-4 text-left">Hostel</th>
                <th className="p-4 text-left">Type</th>
                <th className="p-4 text-left">Beds</th>
                <th className="p-4 text-left">Availability</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((room) => (
                <tr key={room._id} className="border-t">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                        <FaBed />
                      </div>
                      <div>
                        <p className="font-bold text-[rgb(var(--primary))]">
                          {room.roomNumber}
                        </p>
                        <p className="text-xs text-[rgb(var(--text-muted))]">
                          Floor {room.floor ?? 0}
                          {room.amenities ? ` · ${room.amenities}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium">{room.hostelId?.name || "—"}</p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">
                      {room.hostelId?.code || ""}
                    </p>
                  </td>
                  <td className="p-4">{room.roomType}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {(room.beds || []).map((bed) => (
                        <span
                          key={bed._id || bed.bedNumber}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            bed.status === "Available"
                              ? "bg-green-100 text-green-700"
                              : bed.status === "Occupied"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                          title={bed.status}
                        >
                          {bed.bedNumber}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium">
                      {room.availableBeds ?? 0}/{room.totalBeds ?? 0}
                    </p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">
                      {room.occupiedBeds ?? 0} occupied
                    </p>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        room.status === "Active"
                          ? "bg-green-100 text-green-600"
                          : room.status === "Maintenance"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {room.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button
                        onClick={() => openEdit(room)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-xs font-medium flex items-center gap-1"
                      >
                        <FaEdit className="text-xs" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setDeleteTarget(room);
                          setDeleteModal(true);
                        }}
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
                    No rooms found. Click &quot;Add Room&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formModal && (
        <RoomFormModal
          isEdit={isEdit}
          form={form}
          setForm={setForm}
          hostels={hostels}
          onTypeChange={handleTypeChange}
          onClose={() => {
            setFormModal(false);
            setForm({ ...EMPTY_FORM });
          }}
          onSubmit={handleFormSubmit}
          loading={formLoading}
        />
      )}

      {deleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Room?</h3>
            <p className="text-sm text-[rgb(var(--text-muted))] mb-5">
              Delete room{" "}
              <span className="font-semibold text-[rgb(var(--text))]">
                {deleteTarget.roomNumber}
              </span>
              {deleteTarget.hostelId?.name
                ? ` in ${deleteTarget.hostelId.name}`
                : ""}
              ? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 rounded-lg border text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostelRooms;

const StatCard = ({ title, value, color = "blue" }) => {
  const colors = {
    blue: "border-l-blue-500",
    indigo: "border-l-indigo-500",
    green: "border-l-green-500",
    amber: "border-l-amber-500",
  };
  return (
    <div
      className={`bg-[rgb(var(--surface))] rounded-xl shadow p-5 border-l-4 ${colors[color]}`}
    >
      <p className="text-xs sm:text-sm font-medium">{title}</p>
      <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
    </div>
  );
};

const RoomFormModal = ({
  isEdit,
  form,
  setForm,
  hostels,
  onTypeChange,
  onClose,
  onSubmit,
  loading,
}) => {
  const set = (key) => (e) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <FaBed className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {isEdit ? "Edit Room" : "Add Room"}
              </h3>
              <p className="text-sm text-[rgb(var(--text-muted))]">
                Link room and beds to a hostel building
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-xl font-bold">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">
              Hostel *
            </label>
            <select
              value={form.hostelId}
              onChange={set("hostelId")}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
            >
              <option value="">Select hostel</option>
              {hostels.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name} {h.code ? `(${h.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">
              Room Number *
            </label>
            <input
              type="text"
              placeholder="e.g. 101"
              value={form.roomNumber}
              onChange={set("roomNumber")}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-[rgb(var(--surface))]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">
              Floor
            </label>
            <input
              type="number"
              min="0"
              value={form.floor}
              onChange={set("floor")}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-[rgb(var(--surface))]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">
              Room Type
            </label>
            <select
              value={form.roomType}
              onChange={(e) => onTypeChange(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
            >
              {Object.keys(TYPE_BEDS).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">
              Number of Beds
            </label>
            <input
              type="number"
              min="1"
              value={form.bedCount}
              onChange={set("bedCount")}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-[rgb(var(--surface))]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">
              Amenities
            </label>
            <input
              type="text"
              placeholder="e.g. Fan, Attached bath"
              value={form.amenities}
              onChange={set("amenities")}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-[rgb(var(--surface))]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={set("notes")}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-[rgb(var(--surface))] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={set("status")}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Saving..." : isEdit ? "Update Room" : "Create Room"}
          </button>
        </div>
      </div>
    </div>
  );
};
