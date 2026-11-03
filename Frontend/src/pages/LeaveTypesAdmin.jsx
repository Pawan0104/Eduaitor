import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft, FaEdit, FaPlus, FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const emptyForm = {
  name: "",
  code: "",
  description: "",
  isPaid: true,
  isActive: true,
  sortOrder: 0,
};

export default function LeaveTypesAdmin() {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/staff-leave/types`, {
        withCredentials: true,
      });
      setTypes(data.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load leave types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      name: row.name || "",
      code: row.code || "",
      description: row.description || "",
      isPaid: row.isPaid !== false,
      isActive: row.isActive !== false,
      sortOrder: row.sortOrder || 0,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        await axios.put(`${API}/staff-leave/types/${editingId}`, form, {
          withCredentials: true,
        });
        toast.success("Leave type updated");
      } else {
        await axios.post(`${API}/staff-leave/types`, form, {
          withCredentials: true,
        });
        toast.success("Leave type created");
      }
      setShowModal(false);
      fetchTypes();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id) => {
    if (!window.confirm("Deactivate this leave type?")) return;
    try {
      await axios.delete(`${API}/staff-leave/types/${id}`, {
        withCredentials: true,
      });
      toast.success("Leave type deactivated");
      fetchTypes();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to deactivate");
    }
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))]">
      {isMobile && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl mb-4 bg-[rgb(var(--surface))] border border-[rgb(var(--border))] text-sm font-bold"
        >
          <FaArrowLeft size={13} /> Back
        </button>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Staff Leave Types</h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-1">
            Platform-wide leave types (CL, SL, EL…). School admins can also
            create their own types under Staff Leave.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="app-btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
        >
          <FaPlus size={12} /> Add leave type
        </button>
      </div>

      <div className="bg-[rgb(var(--surface))] rounded-2xl border border-[rgb(var(--border))] overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-[rgb(var(--text-muted))]">Loading…</p>
        ) : types.length === 0 ? (
          <p className="p-6 text-sm text-[rgb(var(--text-muted))]">
            No leave types yet. Add Casual Leave, Sick Leave, etc.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[rgb(var(--bg))] text-left text-xs uppercase tracking-wide text-[rgb(var(--text-muted))]">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {types.map((t) => (
                  <tr key={t._id}>
                    <td className="px-4 py-3 font-mono font-semibold">
                      {t.code}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{t.name}</div>
                      {t.description ? (
                        <div className="text-xs text-[rgb(var(--text-muted))]">
                          {t.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {t.isPaid ? "Paid" : "Unpaid"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          t.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {t.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          className="p-2 rounded-lg border border-[rgb(var(--border))]"
                        >
                          <FaEdit size={12} />
                        </button>
                        {t.isActive && (
                          <button
                            type="button"
                            onClick={() => deactivate(t._id)}
                            className="p-2 rounded-lg border border-red-200 text-red-600"
                          >
                            <FaTrash size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-[rgb(var(--surface))] p-5 shadow-xl">
            <h2 className="text-lg font-bold mb-4">
              {editingId ? "Edit leave type" : "Add leave type"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase">Name</label>
                <input
                  className="mt-1 w-full border border-[rgb(var(--border))] rounded-xl px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Casual Leave"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase">Code</label>
                <input
                  className="mt-1 w-full border border-[rgb(var(--border))] rounded-xl px-3 py-2 text-sm uppercase"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="CL"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase">
                  Description
                </label>
                <textarea
                  className="mt-1 w-full border border-[rgb(var(--border))] rounded-xl px-3 py-2 text-sm"
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isPaid}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isPaid: e.target.checked }))
                    }
                  />
                  Paid leave
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                  />
                  Active
                </label>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="flex-1 py-2.5 rounded-xl app-btn-primary text-sm font-semibold disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
