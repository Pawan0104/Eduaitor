import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaHandshake,
  FaBus,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const EMPTY_FORM = {
  _id: null,
  vendorName: "",
  vendorType: "Repair",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  responseHrs: "",
  uptimePct: "100",
  terms: "",
  gstin: "",
  pan: "",
  verified: false,
  vehicles: [],
  status: "Active",
};

const TransportVendors = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const [vendors, setVendors] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [formModal, setFormModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  /* ── FETCH ────────────────────────────────────────────────────────────── */

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [venRes, busRes] = await Promise.all([
        axios.get(`${API}/transport/vendors`, { withCredentials: true }),
        axios.get(`${API}/transport/buses`, { withCredentials: true }),
      ]);
      setVendors(venRes.data.data || []);
      setBuses(busRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load vendors");
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

  const openEdit = (ven) => {
    setIsEdit(true);
    setEditId(ven._id);
    setForm({
      _id: ven._id,
      vendorName: ven.vendorName || "",
      vendorType: ven.vendorType || "Repair",
      contactPerson: ven.contactPerson || "",
      phone: ven.phone || "",
      email: ven.email || "",
      address: ven.address || "",
      responseHrs: String(ven.sla?.responseHrs ?? ""),
      uptimePct: String(ven.sla?.uptimePct ?? 100),
      terms: ven.sla?.terms || "",
      gstin: ven.compliance?.gstin || "",
      pan: ven.compliance?.pan || "",
      verified: ven.compliance?.verified || false,
      vehicles: (ven.vehicles || []).map((v) => v?._id || v),
      status: ven.status || "Active",
    });
    setFormModal(true);
  };

  const handleFormSubmit = async () => {
    if (!form.vendorName.trim())
      return toast.error("Vendor name is required");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return toast.error("Enter a valid email");

    try {
      setFormLoading(true);
      const payload = {
        vendorName: form.vendorName.trim(),
        vendorType: form.vendorType,
        contactPerson: form.contactPerson || "",
        phone: form.phone || "",
        email: form.email || "",
        address: form.address || "",
        sla: {
          responseHrs: form.responseHrs ? Number(form.responseHrs) : 0,
          uptimePct: form.uptimePct ? Number(form.uptimePct) : 100,
          terms: form.terms || "",
        },
        compliance: {
          gstin: form.gstin || "",
          pan: form.pan || "",
          verified: form.verified,
        },
        vehicles: form.vehicles || [],
        status: form.status,
      };
      if (isEdit) {
        await axios.put(`${API}/transport/vendors/${editId}`, payload, {
          withCredentials: true,
        });
        toast.success("Vendor updated successfully");
      } else {
        await axios.post(`${API}/transport/vendors`, payload, {
          withCredentials: true,
        });
        toast.success("Vendor added successfully");
      }
      setFormModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save vendor");
    } finally {
      setFormLoading(false);
    }
  };

  /* ── DELETE ───────────────────────────────────────────────────────────── */

  const handleDeleteClick = (ven) => {
    setDeleteTarget(ven);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API}/transport/vendors/${deleteTarget._id}`, {
        withCredentials: true,
      });
      toast.success("Vendor deleted successfully");
      setDeleteModal(false);
      setDeleteTarget(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete vendor");
    }
  };

  /* ── FILTER ───────────────────────────────────────────────────────────── */

  const filtered = vendors.filter((ven) => {
    const s = search.toLowerCase();
    const matchSearch =
      ven.vendorName?.toLowerCase().includes(s) ||
      ven.contactPerson?.toLowerCase().includes(s) ||
      ven.phone?.toLowerCase().includes(s);
    const matchType = filterType ? ven.vendorType === filterType : true;
    return matchSearch && matchType;
  });

  /* ── STATS ────────────────────────────────────────────────────────────── */

  const total = vendors.length;
  const active = vendors.filter((v) => v.status === "Active").length;
  const verified = vendors.filter((v) => v.compliance?.verified).length;
  const mapped = vendors.filter((v) => (v.vehicles || []).length > 0).length;

  const toggleVehicle = (id) => {
    setForm((p) => ({
      ...p,
      vehicles: p.vehicles.includes(id)
        ? p.vehicles.filter((x) => x !== id)
        : [...p.vehicles, id],
    }));
  };

  const busLabel = (b) => b.regNo || b.busNumber || b.id || "Bus";

  /* ── LOADING ──────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading vendors...</p>
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
          <h1 className="text-2xl sm:text-3xl font-bold ">Transport Vendors</h1>
          <p className="text-sm sm:text-base">
            Manage fuel, repair & compliance vendors and their SLAs
          </p>
        </div>
        <button
          onClick={openAdd}
          className="text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-4 py-2 rounded-lg flex items-center gap-2 shadow transition"
        >
          <FaPlus />
          Add Vendor
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="TOTAL VENDORS" value={total} color="blue" />
        <StatCard title="ACTIVE" value={active} color="green" />
        <StatCard title="COMPLIANCE VERIFIED" value={verified} color="yellow" />
        <StatCard title="VEHICLE MAPPED" value={mapped} color="violet" />
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold ">Vendor Directory</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search name, contact, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full sm:w-64 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
          >
            <option value="">All Types</option>
            <option value="Fuel">Fuel</option>
            <option value="Repair">Repair</option>
            <option value="Insurance">Insurance</option>
            <option value="Contractor">Contractor</option>
            <option value="Compliance">Compliance</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-xl shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="">
              <tr>
                <th className="p-4 text-left">Vendor</th>
                <th className="p-4 text-left">Contact</th>
                <th className="p-4 text-left">SLA & Compliance</th>
                <th className="p-4 text-left">Vehicles</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((ven) => (
                <tr key={ven._id} className="border-t ">
                  {/* VENDOR */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                        <FaHandshake />
                      </div>
                      <div>
                        <p className="font-bold text-[rgb(var(--primary))]">
                          {ven.vendorName}
                        </p>
                        <p className="text-xs">
                          {ven.vendorId || "-"} • {ven.vendorType || "Repair"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* CONTACT */}
                  <td className="p-4">
                    <p className="text-xs font-medium">
                      {ven.contactPerson || "-"}
                    </p>
                    <p className="text-xs text-[rgb(var(--text-light))]">
                      {ven.phone || ""}
                      {ven.phone && ven.email ? " • " : ""}
                      {ven.email || ""}
                    </p>
                    <p className="text-xs text-[rgb(var(--text-light))] mt-0.5">
                      {ven.address || ""}
                    </p>
                  </td>

                  {/* SLA & COMPLIANCE */}
                  <td className="p-4">
                    <p className="text-xs">
                      Response: {ven.sla?.responseHrs ?? 0}h • Uptime:{" "}
                      {ven.sla?.uptimePct ?? 100}%
                    </p>
                    <span
                      className={`flex items-center gap-1 text-xs mt-1 ${
                        ven.compliance?.verified
                          ? "text-green-600"
                          : "text-gray-400"
                      }`}
                    >
                      {ven.compliance?.verified ? (
                        <FaCheckCircle />
                      ) : (
                        <FaExclamationCircle />
                      )}
                      {ven.compliance?.gstin || "No GSTIN"}
                    </span>
                  </td>

                  {/* VEHICLES */}
                  <td className="p-4">
                    {(ven.vehicles || []).length > 0 ? (
                      <div className="flex -space-x-2">
                        {(ven.vehicles || []).slice(0, 3).map((v) => (
                          <div
                            key={v._id || v}
                            title={v.regNo || "Bus"}
                            className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full border-2 border-white flex items-center justify-center"
                          >
                            <FaBus size={12} />
                          </div>
                        ))}
                        {(ven.vehicles || []).length > 3 && (
                          <div className="w-8 h-8 bg-gray-100 text-gray-600 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold">
                            +{(ven.vehicles || []).length - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[rgb(var(--text-light))]">
                        None mapped
                      </p>
                    )}
                  </td>

                  {/* STATUS */}
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        ven.status === "Active"
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {ven.status || "Active"}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button
                        onClick={() => openEdit(ven)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-xs font-medium flex items-center gap-1"
                      >
                        <FaEdit className="text-xs" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(ven)}
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
                  <td colSpan="6" className="text-center py-10 text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                    No vendors found. Click "Add Vendor" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {formModal && (
        <VendorFormModal
          isEdit={isEdit}
          form={form}
          setForm={setForm}
          buses={buses}
          busLabel={busLabel}
          toggleVehicle={toggleVehicle}
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
          vendor={deleteTarget}
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

export default TransportVendors;

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

/* ── VENDOR FORM MODAL (ADD / EDIT) ───────────────────────────────────────── */

const VendorFormModal = ({
  isEdit,
  form,
  setForm,
  buses,
  busLabel,
  toggleVehicle,
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
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <FaHandshake className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {isEdit ? "Edit Vendor" : "Add New Vendor"}
              </h3>
              <p className="text-sm ">
                {isEdit ? "Update vendor details" : "Register a new transport vendor"}
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
              Vendor Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ganesh Auto Works"
              value={form.vendorName}
              onChange={(e) =>
                setForm((p) => ({ ...p, vendorName: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Vendor Type
            </label>
            <select
              value={form.vendorType || "Repair"}
              onChange={(e) =>
                setForm((p) => ({ ...p, vendorType: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))]"
            >
              <option value="Fuel">Fuel</option>
              <option value="Repair">Repair</option>
              <option value="Insurance">Insurance</option>
              <option value="Contractor">Contractor</option>
              <option value="Compliance">Compliance</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Contact Person
            </label>
            <input
              type="text"
              placeholder="e.g. Mr. Rakesh"
              value={form.contactPerson}
              onChange={(e) =>
                setForm((p) => ({ ...p, contactPerson: e.target.value }))
              }
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
              Email
            </label>
            <input
              type="email"
              placeholder="e.g. vendor@example.com"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
              Address
            </label>
            <input
              type="text"
              placeholder="e.g. Industrial Area, Phase 1"
              value={form.address}
              onChange={(e) =>
                setForm((p) => ({ ...p, address: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* SLA */}
          <div className="sm:col-span-2 border rounded-lg p-3">
            <p className="text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-2">
              SLA
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
                  Response Hours
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2"
                  value={form.responseHrs}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, responseHrs: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
                  Uptime %
                </label>
                <input
                  type="number"
                  max="100"
                  min="0"
                  value={form.uptimePct}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, uptimePct: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
                  Terms
                </label>
                <input
                  type="text"
                  placeholder="e.g. 48h breakdown response"
                  value={form.terms}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, terms: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div className="sm:col-span-2 border rounded-lg p-3">
            <p className="text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-2">
              Compliance
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  placeholder="15 char GSTIN"
                  value={form.gstin}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-1">
                  PAN
                </label>
                <input
                  type="text"
                  placeholder="10 char PAN"
                  value={form.pan}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, pan: e.target.value.toUpperCase() }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.verified}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, verified: e.target.checked }))
                    }
                    className="accent-amber-600"
                  />
                  Documents Verified
                </label>
              </div>
            </div>
          </div>

          {/* Vehicles */}
          <div className="sm:col-span-2 border rounded-lg p-3">
            <p className="text-xs font-semibold text-[rgb(var(--text-light))] uppercase tracking-wide mb-2">
              Mapped Vehicles
            </p>
            {buses.length === 0 ? (
              <p className="text-xs text-[rgb(var(--text-light))]">
                No buses available yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {buses.map((b) => {
                  const active = (form.vehicles || []).includes(b._id);
                  return (
                    <button
                      key={b._id}
                      type="button"
                      onClick={() => toggleVehicle(b._id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        active
                          ? "bg-amber-100 text-amber-700 border-amber-300"
                          : "bg-[rgb(var(--surface))] text-[rgb(var(--text-light))] border-slate-200"
                      }`}
                    >
                      {busLabel(b)}
                    </button>
                  );
                })}
              </div>
            )}
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
            {loading ? "Saving..." : isEdit ? "Update Vendor" : "Add Vendor"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── DELETE MODAL ─────────────────────────────────────────────────────────── */

const DeleteModal = ({ vendor, onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl p-6 w-96 max-w-full mx-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <FaTrash className="text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Delete Vendor</h3>
          <p className="text-sm text-[rgb(var(--text-light))]">This action cannot be undone</p>
        </div>
      </div>
      <p className="text-[rgb(var(--text))] mb-6 text-sm">
        Are you sure you want to delete{" "}
        <span className="font-semibold">{vendor.vendorName}</span>? It will be
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
          Delete Vendor
        </button>
      </div>
    </div>
  </div>
);