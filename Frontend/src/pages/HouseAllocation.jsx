import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaArrowLeft,
  FaRandom,
  FaUsers,
  FaHome,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const EMPTY_FORM = {
  name: "",
  code: "",
  color: "#6366F1",
  description: "",
  status: "Active",
};

const HouseAllocation = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [houses, setHouses] = useState([]);
  const [summary, setSummary] = useState({
    totalHouses: 0,
    activeHouses: 0,
    assignedStudents: 0,
    unassignedStudents: 0,
  });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);

  const [filterHouse, setFilterHouse] = useState("");
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [search, setSearch] = useState("");

  const [formModal, setFormModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [confirmRandom, setConfirmRandom] = useState(null); // "unassigned" | "all"

  const fetchHouses = async () => {
    const res = await axios.get(`${API}/house`, { withCredentials: true });
    setHouses(res.data.data || []);
    setSummary(
      res.data.summary || {
        totalHouses: 0,
        activeHouses: 0,
        assignedStudents: 0,
        unassignedStudents: 0,
      },
    );
  };

  const fetchStudents = async () => {
    const params = {};
    if (showUnassigned) params.unassigned = "true";
    else if (filterHouse) params.houseId = filterHouse;
    if (search.trim()) params.search = search.trim();

    const res = await axios.get(`${API}/house/students`, {
      params,
      withCredentials: true,
    });
    setStudents(res.data.data || []);
  };

  const refresh = async () => {
    try {
      setLoading(true);
      await fetchHouses();
      await fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load houses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!loading) fetchStudents().catch(() => {});
  }, [filterHouse, showUnassigned, search]);

  const openAdd = () => {
    setIsEdit(false);
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setFormModal(true);
  };

  const openEdit = (house) => {
    setIsEdit(true);
    setEditId(house._id);
    setForm({
      name: house.name || "",
      code: house.code || "",
      color: house.color || "#6366F1",
      description: house.description || "",
      status: house.status || "Active",
    });
    setFormModal(true);
  };

  const handleFormSubmit = async () => {
    if (!form.name.trim()) return toast.error("House name is required");

    try {
      setFormLoading(true);
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        color: form.color,
        description: form.description,
        status: form.status,
      };
      if (isEdit) {
        await axios.put(`${API}/house/${editId}`, payload, {
          withCredentials: true,
        });
        toast.success("House updated");
      } else {
        await axios.post(`${API}/house`, payload, { withCredentials: true });
        toast.success("House added");
      }
      setFormModal(false);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save house");
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API}/house/${deleteTarget._id}`, {
        withCredentials: true,
      });
      toast.success("House deleted");
      setDeleteModal(false);
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete house");
    }
  };

  const runRandomAllocate = async (onlyUnassigned) => {
    try {
      setAllocating(true);
      const res = await axios.post(
        `${API}/house/allocate-random`,
        { onlyUnassigned },
        { withCredentials: true },
      );
      toast.success(res.data.message || "Allocation complete");
      setConfirmRandom(null);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Allocation failed");
    } finally {
      setAllocating(false);
    }
  };

  const assignStudent = async (studentId, houseId) => {
    try {
      await axios.post(
        `${API}/house/assign`,
        { studentId, houseId: houseId || null },
        { withCredentials: true },
      );
      toast.success("Student house updated");
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign student");
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading house allocation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-[rgb(var(--text))] min-h-screen">
      {isMobile && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 mb-4 rounded-xl bg-[rgb(var(--surface))] shadow-sm border border-slate-100 text-sm font-bold text-slate-600"
        >
          <FaArrowLeft size={14} /> Back
        </button>
      )}

      <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">House Allocation</h1>
          <p className="text-sm text-[rgb(var(--text-light))] mt-1">
            4 default houses per school — rename them, add more, and allocate
            students randomly
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setConfirmRandom("unassigned")}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium flex items-center gap-2"
          >
            <FaRandom /> Allocate unassigned
          </button>
          <button
            onClick={() => setConfirmRandom("all")}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-[rgb(var(--surface))] text-sm font-medium flex items-center gap-2"
          >
            <FaRandom /> Reallocate all
          </button>
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] text-[rgb(var(--text))] text-sm font-medium flex items-center gap-2"
          >
            <FaPlus /> Add house
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="HOUSES" value={summary.totalHouses} icon={<FaHome />} />
        <StatCard
          title="ACTIVE"
          value={summary.activeHouses}
          icon={<FaHome />}
        />
        <StatCard
          title="ASSIGNED"
          value={summary.assignedStudents}
          icon={<FaUsers />}
        />
        <StatCard
          title="UNASSIGNED"
          value={summary.unassignedStudents}
          icon={<FaUsers />}
        />
      </div>

      {/* HOUSES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {houses.map((house) => (
          <div
            key={house._id}
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl shrink-0"
                  style={{ backgroundColor: house.color || "#6366F1" }}
                />
                <div className="min-w-0">
                  <p className="font-semibold truncate">{house.name}</p>
                  <p className="text-xs text-[rgb(var(--text-light))]">
                    {house.code || "—"} · {house.studentCount} students
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  house.status === "Active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {house.status}
              </span>
            </div>
            {house.description && (
              <p className="text-xs text-[rgb(var(--text-light))] mb-3 line-clamp-2">
                {house.description}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => openEdit(house)}
                className="flex-1 px-2 py-1.5 text-xs rounded-lg bg-slate-100 flex items-center justify-center gap-1"
              >
                <FaEdit /> Rename
              </button>
              <button
                onClick={() => {
                  setDeleteTarget(house);
                  setDeleteModal(true);
                }}
                className="px-2 py-1.5 text-xs rounded-lg bg-red-50 text-red-600 flex items-center justify-center gap-1"
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* STUDENTS */}
      <div className="bg-[rgb(var(--surface))] rounded-xl shadow">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100">
          <h2 className="text-lg font-semibold">Students</h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Search student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full sm:w-48 bg-[rgb(var(--surface))]"
            />
            <select
              value={showUnassigned ? "unassigned" : filterHouse}
              onChange={(e) => {
                if (e.target.value === "unassigned") {
                  setShowUnassigned(true);
                  setFilterHouse("");
                } else {
                  setShowUnassigned(false);
                  setFilterHouse(e.target.value);
                }
              }}
              className="border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
            >
              <option value="">All students</option>
              <option value="unassigned">Unassigned only</option>
              {houses.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-3 text-left">Student</th>
                <th className="p-3 text-left">Class</th>
                <th className="p-3 text-left">Current house</th>
                <th className="p-3 text-left">Assign</th>
              </tr>
            </thead>
            <tbody>
              {students.map((stu) => (
                <tr key={stu._id} className="border-t">
                  <td className="p-3">
                    <p className="font-medium">
                      {stu.firstName} {stu.lastName}
                    </p>
                    <p className="text-xs text-[rgb(var(--text-light))]">
                      {stu.studentId || "—"}
                    </p>
                  </td>
                  <td className="p-3">
                    {stu.classId?.name || "—"}
                    {stu.sectionId?.name ? ` · ${stu.sectionId.name}` : ""}
                  </td>
                  <td className="p-3">
                    {stu.houseId ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor: stu.houseId.color || "#6366F1",
                          }}
                        />
                        {stu.houseId.name}
                      </span>
                    ) : (
                      <span className="text-[rgb(var(--text-light))]">
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <select
                      value={stu.houseId?._id || stu.houseId || ""}
                      onChange={(e) => assignStudent(stu._id, e.target.value)}
                      className="border rounded-lg px-2 py-1.5 text-sm bg-[rgb(var(--surface))]"
                    >
                      <option value="">Unassigned</option>
                      {houses
                        .filter((h) => h.status === "Active")
                        .map((h) => (
                          <option key={h._id} value={h._id}>
                            {h.name}
                          </option>
                        ))}
                    </select>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="text-center py-10 text-[rgb(var(--text-light))]"
                  >
                    No students found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL */}
      {formModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {isEdit ? "Edit / rename house" : "Add new house"}
            </h3>
            <div className="space-y-3">
              <Field
                label="House name"
                value={form.name}
                onChange={(v) => setForm((p) => ({ ...p, name: v }))}
                placeholder="e.g. Ashoka House"
              />
              <Field
                label="Code"
                value={form.code}
                onChange={(v) => setForm((p) => ({ ...p, code: v }))}
                placeholder="e.g. ASH"
              />
              <div>
                <label className="block text-xs font-semibold mb-1">Color</label>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, color: e.target.value }))
                  }
                  className="w-full h-10 rounded-lg border cursor-pointer"
                />
              </div>
              <Field
                label="Description"
                value={form.description}
                onChange={(v) => setForm((p) => ({ ...p, description: v }))}
                placeholder="Optional"
              />
              <div>
                <label className="block text-xs font-semibold mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, status: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setFormModal(false)}
                className="px-4 py-2 rounded-lg border text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleFormSubmit}
                disabled={formLoading}
                className="px-4 py-2 rounded-lg bg-[rgb(var(--primary))] text-sm font-medium"
              >
                {formLoading ? "Saving..." : isEdit ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Delete house?</h3>
            <p className="text-sm text-[rgb(var(--text-light))] mb-6">
              Delete <strong>{deleteTarget.name}</strong>? Students must be
              reallocated first.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteModal(false)}
                className="px-4 py-2 rounded-lg border text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RANDOM CONFIRM */}
      {confirmRandom && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[rgb(var(--surface))] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">
              {confirmRandom === "all"
                ? "Reallocate all students?"
                : "Allocate unassigned students?"}
            </h3>
            <p className="text-sm text-[rgb(var(--text-light))] mb-6">
              {confirmRandom === "all"
                ? "Every student will be randomly reassigned across active houses in a balanced way."
                : "Only students without a house will be randomly assigned across active houses."}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmRandom(null)}
                className="px-4 py-2 rounded-lg border text-sm"
                disabled={allocating}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  runRandomAllocate(confirmRandom === "unassigned")
                }
                disabled={allocating}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm"
              >
                {allocating ? "Allocating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon }) => (
  <div className="bg-[rgb(var(--surface))] rounded-xl shadow p-4 border-l-4 border-l-indigo-500">
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium">{title}</p>
      <span className="text-indigo-500">{icon}</span>
    </div>
    <p className="text-2xl font-bold mt-1">{value}</p>
  </div>
);

const Field = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-xs font-semibold mb-1">{label}</label>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
    />
  </div>
);

export default HouseAllocation;
