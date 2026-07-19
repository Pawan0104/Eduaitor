import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaUserFriends,
  FaArrowLeft,
  FaSignOutAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const EMPTY_FORM = {
  studentId: "",
  hostelId: "",
  roomId: "",
  bedId: "",
  checkInDate: new Date().toISOString().slice(0, 10),
  notes: "",
};

const HostelResidents = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = user?.role === "staff_admin" ? "/staff" : "/school";
  const isMobile = window.innerWidth <= 768;

  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterHostel, setFilterHostel] = useState("");
  const [filterStatus, setFilterStatus] = useState("Active");

  const [formModal, setFormModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [assignedStudentIds, setAssignedStudentIds] = useState([]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [h, r, s, res, activeRes] = await Promise.all([
        axios.get(`${API}/hostel`, { withCredentials: true }),
        axios.get(`${API}/hostel/rooms`, { withCredentials: true }),
        axios.get(`${API}/students`, { withCredentials: true }),
        axios.get(`${API}/hostel/residents`, {
          withCredentials: true,
          params: { status: filterStatus === "" ? "all" : filterStatus },
        }),
        axios.get(`${API}/hostel/residents`, {
          withCredentials: true,
          params: { status: "Active" },
        }),
      ]);
      setHostels(h.data.data || []);
      setRooms(r.data.data || []);
      setStudents(s.data.data || []);
      setResidents(res.data.data || []);
      setAssignedStudentIds(
        (activeRes.data.data || []).map((item) =>
          String(item.studentId?._id || item.studentId)
        )
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load residents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const normalizeGender = (gender) => {
    const value = String(gender || "")
      .trim()
      .toLowerCase();
    if (["male", "m", "boy", "boys"].includes(value)) return "Male";
    if (["female", "f", "girl", "girls"].includes(value)) return "Female";
    return "";
  };

  const canStayInHostel = (studentGender, hostelType) => {
    const gender = normalizeGender(studentGender);
    if (!gender) return false;
    if (hostelType === "Boys") return gender === "Male";
    if (hostelType === "Girls") return gender === "Female";
    return true; // Co-ed
  };

  const availableStudents = useMemo(() => {
    const assigned = new Set(assignedStudentIds);
    return students.filter((s) => {
      if (isEdit && form.studentId && String(s._id) === String(form.studentId)) {
        return true;
      }
      return !assigned.has(String(s._id));
    });
  }, [students, assignedStudentIds, isEdit, form.studentId]);

  const selectedStudent = useMemo(
    () => students.find((s) => String(s._id) === String(form.studentId)),
    [students, form.studentId]
  );

  const hostelsForStudent = useMemo(() => {
    const active = hostels.filter((h) => h.status === "Active");
    if (!selectedStudent) return active;
    return active.filter((h) => canStayInHostel(selectedStudent.gender, h.type));
  }, [hostels, selectedStudent]);

  const roomsForHostel = useMemo(() => {
    if (!form.hostelId) return [];
    return rooms.filter(
      (r) =>
        String(r.hostelId?._id || r.hostelId) === String(form.hostelId) &&
        r.status === "Active"
    );
  }, [rooms, form.hostelId]);

  const bedsForRoom = useMemo(() => {
    const room = rooms.find((r) => String(r._id) === String(form.roomId));
    if (!room) return [];
    return (room.beds || []).filter((b) => {
      if (isEdit && String(b._id) === String(form.bedId)) return true;
      return b.status === "Available";
    });
  }, [rooms, form.roomId, form.bedId, isEdit]);

  const openAdd = () => {
    setIsEdit(false);
    setEditId(null);
    setForm({
      ...EMPTY_FORM,
      hostelId: filterHostel || hostels[0]?._id || "",
      checkInDate: new Date().toISOString().slice(0, 10),
    });
    setFormModal(true);
  };

  const openEdit = (resident) => {
    setIsEdit(true);
    setEditId(resident._id);
    setForm({
      studentId: resident.studentId?._id || "",
      hostelId: resident.hostelId?._id || "",
      roomId: resident.roomId?._id || "",
      bedId: String(resident.bedId || ""),
      checkInDate: resident.checkInDate
        ? new Date(resident.checkInDate).toISOString().slice(0, 10)
        : "",
      notes: resident.notes || "",
    });
    setFormModal(true);
  };

  const handleFormSubmit = async () => {
    if (!form.studentId) return toast.error("Select a student");
    if (!form.hostelId) return toast.error("Select a hostel");
    if (!form.roomId) return toast.error("Select a room");
    if (!form.bedId) return toast.error("Select a bed");

    const hostel = hostels.find((h) => String(h._id) === String(form.hostelId));
    if (
      selectedStudent &&
      hostel &&
      !canStayInHostel(selectedStudent.gender, hostel.type)
    ) {
      return toast.error(
        hostel.type === "Boys"
          ? "Female students cannot check in to a Boys hostel."
          : "Male students cannot check in to a Girls hostel."
      );
    }

    const payload = {
      studentId: form.studentId,
      roomId: form.roomId,
      bedId: form.bedId,
      checkInDate: form.checkInDate || undefined,
      notes: form.notes.trim(),
    };

    try {
      setFormLoading(true);
      if (isEdit) {
        await axios.put(`${API}/hostel/residents/${editId}`, payload, {
          withCredentials: true,
        });
        toast.success("Resident updated successfully");
      } else {
        await axios.post(`${API}/hostel/residents`, payload, {
          withCredentials: true,
        });
        toast.success("Student assigned successfully");
      }
      setFormModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save resident");
    } finally {
      setFormLoading(false);
    }
  };

  const handleCheckout = async (resident) => {
    try {
      await axios.post(
        `${API}/hostel/residents/${resident._id}/checkout`,
        {},
        { withCredentials: true }
      );
      toast.success("Student checked out");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Checkout failed");
    }
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API}/hostel/residents/${deleteTarget._id}`, {
        withCredentials: true,
      });
      toast.success("Resident record deleted");
      setDeleteModal(false);
      setDeleteTarget(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const filtered = residents.filter((r) => {
    const s = search.toLowerCase();
    const name = `${r.studentId?.firstName || ""} ${r.studentId?.lastName || ""}`
      .trim()
      .toLowerCase();
    const matchSearch =
      !s ||
      name.includes(s) ||
      r.studentId?.studentId?.toLowerCase().includes(s) ||
      r.bedNumber?.toLowerCase().includes(s) ||
      r.roomId?.roomNumber?.toLowerCase().includes(s) ||
      r.hostelId?.name?.toLowerCase().includes(s);
    const matchHostel = filterHostel
      ? String(r.hostelId?._id || r.hostelId) === String(filterHostel)
      : true;
    return matchSearch && matchHostel;
  });

  const activeCount = residents.filter((r) => r.status === "Active").length;
  const checkedOutCount = residents.filter(
    (r) => r.status === "CheckedOut"
  ).length;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading residents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-[rgb(var(--text))] min-h-screen">
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(`${basePath}/hostel`)}
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
              onClick={() => navigate(`${basePath}/hostel`)}
              className="flex items-center gap-2 text-sm text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] mb-2"
            >
              <FaArrowLeft size={12} /> Hostel Management
            </button>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold">Residents</h1>
          <p className="text-sm sm:text-base text-[rgb(var(--text-muted))]">
            Assign students to hostel rooms and beds
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={hostels.length === 0 || rooms.length === 0}
          className="text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-4 py-2 rounded-lg flex items-center gap-2 shadow transition disabled:opacity-50"
        >
          <FaPlus />
          Assign Student
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard title="SHOWING" value={filtered.length} color="blue" />
        <StatCard title="ACTIVE" value={activeCount} color="green" />
        <StatCard title="CHECKED OUT" value={checkedOutCount} color="gray" />
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold">Resident Directory</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search student, room, bed..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full sm:w-56 text-sm bg-[rgb(var(--surface))]"
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
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
          >
            <option value="Active">Active</option>
            <option value="CheckedOut">Checked Out</option>
            <option value="">All</option>
          </select>
        </div>
      </div>

      <div className="bg-[rgb(var(--surface))] rounded-xl shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-4 text-left">Student</th>
                <th className="p-4 text-left">Hostel</th>
                <th className="p-4 text-left">Room / Bed</th>
                <th className="p-4 text-left">Check-in</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((resident) => {
                const student = resident.studentId;
                const fullName = `${student?.firstName || ""} ${student?.lastName || ""}`.trim();
                const className =
                  student?.classId?.name || student?.classId?.className || "";
                return (
                  <tr key={resident._id} className="border-t">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                          <FaUserFriends />
                        </div>
                        <div>
                          <p className="font-bold text-[rgb(var(--primary))]">
                            {fullName || "—"}
                          </p>
                          <p className="text-xs text-[rgb(var(--text-muted))]">
                            {student?.studentId || "—"}
                            {className ? ` · ${className}` : ""}
                            {student?.gender ? ` · ${student.gender}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{resident.hostelId?.name || "—"}</p>
                      <p className="text-xs text-[rgb(var(--text-muted))]">
                        {resident.hostelId?.code || ""}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">
                        Room {resident.roomId?.roomNumber || "—"}
                      </p>
                      <p className="text-xs text-[rgb(var(--text-muted))]">
                        Bed {resident.bedNumber}
                        {resident.roomId?.floor != null
                          ? ` · Floor ${resident.roomId.floor}`
                          : ""}
                      </p>
                    </td>
                    <td className="p-4 text-xs">
                      {resident.checkInDate
                        ? new Date(resident.checkInDate).toLocaleDateString()
                        : "—"}
                      {resident.checkOutDate && (
                        <p className="text-[rgb(var(--text-muted))] mt-0.5">
                          Out:{" "}
                          {new Date(resident.checkOutDate).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          resident.status === "Active"
                            ? "bg-green-100 text-green-600"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {resident.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {resident.status === "Active" && (
                          <>
                            <button
                              onClick={() => openEdit(resident)}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium flex items-center gap-1"
                            >
                              <FaEdit className="text-xs" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleCheckout(resident)}
                              className="px-3 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium flex items-center gap-1"
                            >
                              <FaSignOutAlt className="text-xs" />
                              Checkout
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setDeleteTarget(resident);
                            setDeleteModal(true);
                          }}
                          className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs font-medium flex items-center gap-1"
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
                  <td
                    colSpan="6"
                    className="text-center py-10 text-[rgb(var(--text-muted))]"
                  >
                    No residents found. Click &quot;Assign Student&quot; to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <FaUserFriends className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {isEdit ? "Edit Assignment" : "Assign Student"}
                  </h3>
                  <p className="text-sm text-[rgb(var(--text-muted))]">
                    Place a student on an available hostel bed
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFormModal(false)}
                className="text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase mb-1 text-[rgb(var(--text-muted))]">
                  Student *
                </label>
                <select
                  value={form.studentId}
                  disabled={isEdit}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      studentId: e.target.value,
                      hostelId: "",
                      roomId: "",
                      bedId: "",
                    }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))] disabled:opacity-60"
                >
                  <option value="">Select student</option>
                  {availableStudents.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.firstName} {s.lastName}
                      {s.studentId ? ` (${s.studentId})` : ""}
                      {s.gender ? ` · ${s.gender}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase mb-1 text-[rgb(var(--text-muted))]">
                  Hostel *
                </label>
                <select
                  value={form.hostelId}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      hostelId: e.target.value,
                      roomId: "",
                      bedId: "",
                    }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
                >
                  <option value="">Select hostel</option>
                  {hostelsForStudent.map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.name} ({h.type})
                    </option>
                  ))}
                </select>
                {selectedStudent && hostelsForStudent.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    No matching hostel for this student&apos;s gender.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1 text-[rgb(var(--text-muted))]">
                  Room *
                </label>
                <select
                  value={form.roomId}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      roomId: e.target.value,
                      bedId: "",
                    }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
                >
                  <option value="">Select room</option>
                  {roomsForHostel.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.roomNumber} · Floor {r.floor} ·{" "}
                      {r.availableBeds ?? 0} free
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1 text-[rgb(var(--text-muted))]">
                  Bed *
                </label>
                <select
                  value={form.bedId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, bedId: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
                >
                  <option value="">Select bed</option>
                  {bedsForRoom.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.bedNumber} ({b.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1 text-[rgb(var(--text-muted))]">
                  Check-in Date
                </label>
                <input
                  type="date"
                  value={form.checkInDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, checkInDate: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase mb-1 text-[rgb(var(--text-muted))]">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))] resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setFormModal(false)}
                className="px-4 py-2 rounded-lg border text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFormSubmit}
                disabled={formLoading}
                className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] text-sm font-medium disabled:opacity-60"
              >
                {formLoading
                  ? "Saving..."
                  : isEdit
                    ? "Update Assignment"
                    : "Assign Student"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Resident?</h3>
            <p className="text-sm text-[rgb(var(--text-muted))] mb-5">
              Remove allocation for{" "}
              <span className="font-semibold text-[rgb(var(--text))]">
                {deleteTarget.studentId?.firstName}{" "}
                {deleteTarget.studentId?.lastName}
              </span>
              ? The bed will be freed if still active.
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

export default HostelResidents;

const StatCard = ({ title, value, color = "blue" }) => {
  const colors = {
    blue: "border-l-blue-500",
    green: "border-l-green-500",
    gray: "border-l-gray-400",
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
