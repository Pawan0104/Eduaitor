import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaIdCard,
  FaArrowLeft,
  FaSignOutAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const ID_PROOF_TYPES = [
  "Aadhaar",
  "PAN",
  "Driving License",
  "Voter ID",
  "Passport",
  "Other",
];

const EMPTY_FORM = {
  hostelId: "",
  visitorName: "",
  phone: "",
  idProofType: "Aadhaar",
  idProofNumber: "",
  purpose: "",
  whomVisiting: "",
  residentId: "",
  approvedByName: "",
  notes: "",
};

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const HostelVisitors = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const [hostels, setHostels] = useState([]);
  const [residents, setResidents] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterHostel, setFilterHostel] = useState("");
  const [filterStatus, setFilterStatus] = useState("CheckedIn");

  const [formModal, setFormModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [h, r, v] = await Promise.all([
        axios.get(`${API}/hostel`, { withCredentials: true }),
        axios.get(`${API}/hostel/residents`, {
          withCredentials: true,
          params: { status: "Active" },
        }),
        axios.get(`${API}/hostel/visitors`, {
          withCredentials: true,
          params: { status: filterStatus === "" ? "all" : filterStatus },
        }),
      ]);
      setHostels(h.data.data || []);
      setResidents(r.data.data || []);
      setVisitors(v.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load visitors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const residentsForHostel = useMemo(() => {
    if (!form.hostelId) return [];
    return residents.filter(
      (r) => String(r.hostelId?._id || r.hostelId) === String(form.hostelId),
    );
  }, [residents, form.hostelId]);

  const openAdd = () => {
    setIsEdit(false);
    setEditId(null);
    setForm({
      ...EMPTY_FORM,
      hostelId: filterHostel || hostels[0]?._id || "",
    });
    setFormModal(true);
  };

  const openEdit = (v) => {
    setIsEdit(true);
    setEditId(v._id);
    setForm({
      hostelId: v.hostelId?._id || "",
      visitorName: v.visitorName || "",
      phone: v.phone || "",
      idProofType: v.idProofType || "Other",
      idProofNumber: v.idProofNumber || "",
      purpose: v.purpose || "",
      whomVisiting: v.whomVisiting || "",
      residentId: v.residentId?._id || "",
      approvedByName: v.approvedByName || "",
      notes: v.notes || "",
    });
    setFormModal(true);
  };

  const handleFormSubmit = async () => {
    if (!form.hostelId) return toast.error("Select a hostel");
    if (!form.visitorName.trim()) return toast.error("Enter visitor name");

    const payload = {
      hostelId: form.hostelId,
      visitorName: form.visitorName.trim(),
      phone: form.phone.trim(),
      idProofType: form.idProofType,
      idProofNumber: form.idProofNumber.trim(),
      purpose: form.purpose.trim(),
      whomVisiting: form.whomVisiting.trim(),
      residentId: form.residentId || null,
      approvedByName: form.approvedByName.trim(),
      notes: form.notes.trim(),
    };

    try {
      setFormLoading(true);
      if (isEdit) {
        await axios.put(`${API}/hostel/visitors/${editId}`, payload, {
          withCredentials: true,
        });
        toast.success("Visitor updated");
      } else {
        await axios.post(`${API}/hostel/visitors`, payload, {
          withCredentials: true,
        });
        toast.success("Visitor checked in");
      }
      setFormModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save visitor");
    } finally {
      setFormLoading(false);
    }
  };

  const handleCheckout = async (visitor) => {
    try {
      await axios.post(
        `${API}/hostel/visitors/${visitor._id}/checkout`,
        {},
        { withCredentials: true },
      );
      toast.success("Visitor checked out");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Checkout failed");
    }
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API}/hostel/visitors/${deleteTarget._id}`, {
        withCredentials: true,
      });
      toast.success("Visitor record deleted");
      setDeleteModal(false);
      setDeleteTarget(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const filtered = visitors.filter((v) => {
    const s = search.toLowerCase();
    const student = v.studentId || v.residentId?.studentId;
    const studentName = `${student?.firstName || ""} ${student?.lastName || ""}`
      .trim()
      .toLowerCase();
    const matchSearch =
      !s ||
      v.visitorName?.toLowerCase().includes(s) ||
      v.phone?.toLowerCase().includes(s) ||
      v.whomVisiting?.toLowerCase().includes(s) ||
      v.purpose?.toLowerCase().includes(s) ||
      v.hostelId?.name?.toLowerCase().includes(s) ||
      studentName.includes(s) ||
      student?.studentId?.toLowerCase().includes(s);
    const matchHostel = filterHostel
      ? String(v.hostelId?._id || v.hostelId) === String(filterHostel)
      : true;
    return matchSearch && matchHostel;
  });

  const checkedInCount = visitors.filter((v) => v.status === "CheckedIn").length;
  const checkedOutCount = visitors.filter(
    (v) => v.status === "CheckedOut",
  ).length;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading visitors...</p>
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
          <h1 className="text-2xl sm:text-3xl font-bold">Visitor Management</h1>
          <p className="text-sm sm:text-base text-[rgb(var(--text-muted))]">
            Check in / out hostel visitors and track who they meet
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={hostels.length === 0}
          className="text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-4 py-2 rounded-lg flex items-center gap-2 shadow transition disabled:opacity-50"
        >
          <FaPlus />
          Check In Visitor
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard title="SHOWING" value={filtered.length} color="blue" />
        <StatCard title="CHECKED IN" value={checkedInCount} color="green" />
        <StatCard title="CHECKED OUT" value={checkedOutCount} color="gray" />
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold">Visitor Log</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search visitor, phone, resident..."
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
            <option value="CheckedIn">Checked In</option>
            <option value="CheckedOut">Checked Out</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <div className="bg-[rgb(var(--surface))] rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-[rgb(var(--text-muted))]">
              <th className="p-4">Visitor</th>
              <th className="p-4">Hostel / Meeting</th>
              <th className="p-4">Purpose</th>
              <th className="p-4">Check-in</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => {
              const student = v.studentId || v.residentId?.studentId;
              const meeting =
                v.whomVisiting ||
                (student
                  ? `${student.firstName || ""} ${student.lastName || ""}`.trim()
                  : "—");
              return (
                <tr key={v._id} className="border-t border-slate-100">
                  <td className="p-4">
                    <p className="font-semibold">{v.visitorName}</p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">
                      {v.phone || "No phone"}
                      {v.idProofNumber
                        ? ` · ${v.idProofType}: ${v.idProofNumber}`
                        : ""}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium">{v.hostelId?.name || "—"}</p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">
                      Visiting: {meeting}
                      {v.residentId?.roomId?.roomNumber
                        ? ` · Room ${v.residentId.roomId.roomNumber}`
                        : ""}
                    </p>
                  </td>
                  <td className="p-4 text-xs max-w-[160px] truncate" title={v.purpose}>
                    {v.purpose || "—"}
                  </td>
                  <td className="p-4 text-xs">
                    <p>{fmtDateTime(v.checkInAt)}</p>
                    {v.checkOutAt && (
                      <p className="text-[rgb(var(--text-muted))]">
                        Out: {fmtDateTime(v.checkOutAt)}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        v.status === "CheckedIn"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {v.status === "CheckedIn" ? "Checked In" : "Checked Out"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      {v.status === "CheckedIn" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCheckout(v)}
                            className="p-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100"
                            title="Check out"
                          >
                            <FaSignOutAlt size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(v)}
                            className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                            title="Edit"
                          >
                            <FaEdit size={13} />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(v);
                          setDeleteModal(true);
                        }}
                        className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                        title="Delete"
                      >
                        <FaTrash size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-14 text-[rgb(var(--text-muted))]"
                >
                  No visitors found. Check in a visitor to start the log.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form modal */}
      {formModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--surface))] rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <FaIdCard className="text-violet-600" />
              <h3 className="font-bold text-lg">
                {isEdit ? "Edit Visitor" : "Check In Visitor"}
              </h3>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="sm:col-span-2 text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                Hostel
                <select
                  value={form.hostelId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      hostelId: e.target.value,
                      residentId: "",
                    }))
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                >
                  <option value="">Select hostel</option>
                  {hostels.map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.name} ({h.type})
                    </option>
                  ))}
                </select>
              </label>

              <label className="sm:col-span-2 text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                Visitor name *
                <input
                  value={form.visitorName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, visitorName: e.target.value }))
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                  placeholder="Full name"
                />
              </label>

              <label className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                Phone
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                  placeholder="10-digit mobile"
                />
              </label>

              <label className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                ID proof type
                <select
                  value={form.idProofType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, idProofType: e.target.value }))
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                >
                  {ID_PROOF_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sm:col-span-2 text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                ID proof number
                <input
                  value={form.idProofNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, idProofNumber: e.target.value }))
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                />
              </label>

              <label className="sm:col-span-2 text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                Visiting resident (optional)
                <select
                  value={form.residentId}
                  onChange={(e) => {
                    const rid = e.target.value;
                    const res = residentsForHostel.find(
                      (r) => String(r._id) === String(rid),
                    );
                    const name = res?.studentId
                      ? `${res.studentId.firstName || ""} ${res.studentId.lastName || ""}`.trim()
                      : "";
                    setForm((f) => ({
                      ...f,
                      residentId: rid,
                      whomVisiting: name || f.whomVisiting,
                    }));
                  }}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                >
                  <option value="">— Select resident —</option>
                  {residentsForHostel.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.studentId?.firstName} {r.studentId?.lastName}
                      {r.roomId?.roomNumber
                        ? ` · Room ${r.roomId.roomNumber}`
                        : ""}
                      {r.bedNumber ? ` · Bed ${r.bedNumber}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sm:col-span-2 text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                Whom visiting
                <input
                  value={form.whomVisiting}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, whomVisiting: e.target.value }))
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                  placeholder="Resident / relative name"
                />
              </label>

              <label className="sm:col-span-2 text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                Purpose
                <input
                  value={form.purpose}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, purpose: e.target.value }))
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                  placeholder="Meeting, delivery, guardian visit…"
                />
              </label>

              <label className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                Approved by
                <input
                  value={form.approvedByName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, approvedByName: e.target.value }))
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                  placeholder="Warden / staff name"
                />
              </label>

              <label className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                Notes
                <input
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                />
              </label>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFormModal(false)}
                className="px-4 py-2 rounded-lg border text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={formLoading}
                onClick={handleFormSubmit}
                className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {formLoading
                  ? "Saving…"
                  : isEdit
                    ? "Update"
                    : "Check In"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--surface))] rounded-2xl w-full max-w-sm p-5 shadow-xl">
            <h3 className="font-bold text-lg mb-2">Delete visitor record?</h3>
            <p className="text-sm text-[rgb(var(--text-muted))] mb-4">
              This will permanently remove{" "}
              <span className="font-semibold text-[rgb(var(--text))]">
                {deleteTarget?.visitorName}
              </span>
              .
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModal(false)}
                className="px-4 py-2 rounded-lg border text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm"
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

const StatCard = ({ title, value, color }) => {
  const border = {
    blue: "border-l-blue-500",
    green: "border-l-emerald-500",
    gray: "border-l-slate-400",
  }[color] || "border-l-blue-500";
  return (
    <div
      className={`bg-[rgb(var(--surface))] rounded-xl shadow p-5 border-l-4 ${border}`}
    >
      <p className="text-xs sm:text-sm font-medium text-[rgb(var(--text-muted))]">
        {title}
      </p>
      <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
    </div>
  );
};

export default HostelVisitors;
