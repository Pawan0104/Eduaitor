import { useEffect, useState } from "react";
import axios from "axios";
import { FaArrowLeft, FaEdit, FaPlus, FaStream, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const emptyForm = () => ({
  name: "",
  code: "",
  description: "",
  status: "Active",
});

export default function StreamManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const canManage =
    user?.role === "school_admin" || user?.role === "super_admin";

  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/streams/all`, {
        withCredentials: true,
      });
      setStreams(data?.streams || data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load streams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (stream) => {
    setEditing(stream);
    setForm({
      name: stream.name || "",
      code: stream.code || "",
      description: stream.description || "",
      status: stream.status || "Active",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const saveStream = async () => {
    if (!form.name.trim()) {
      toast.error("Stream name is required");
      return;
    }
    try {
      setSaving(true);
      if (editing?._id) {
        await axios.put(
          `${API}/streams/update/${editing._id}`,
          form,
          { withCredentials: true },
        );
        toast.success("Stream updated");
      } else {
        await axios.post(`${API}/streams/create`, form, {
          withCredentials: true,
        });
        toast.success("Stream created");
      }
      closeModal();
      fetchStreams();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save stream");
    } finally {
      setSaving(false);
    }
  };

  const deleteStream = async (id) => {
    if (!window.confirm("Delete this stream?")) return;
    try {
      await axios.delete(`${API}/streams/delete/${id}`, {
        withCredentials: true,
      });
      toast.success("Stream deleted");
      fetchStreams();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] p-4 text-[rgb(var(--text))] md:p-6">
      {isMobile && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5 text-sm font-bold"
        >
          <FaArrowLeft size={12} /> Back
        </button>
      )}

      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          {!isMobile && (
            <button
              type="button"
              onClick={() => navigate("/school/menu")}
              className="mb-3 flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5 text-sm font-bold"
            >
              <FaArrowLeft size={12} /> Back
            </button>
          )}
          <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
            <FaStream className="text-[rgb(var(--primary))]" />
            Streams
          </h1>
          <p className="mt-0.5 text-sm text-[rgb(var(--text-muted))]">
            Manage academic streams used in leads, registration and admission.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-[rgb(var(--primary))] px-4 py-2.5 text-sm font-medium text-white sm:self-auto"
          >
            <FaPlus size={12} /> Add Stream
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        {loading ? (
          <p className="px-5 py-10 text-center text-[rgb(var(--text-muted))]">
            Loading streams…
          </p>
        ) : streams.length === 0 ? (
          <p className="px-5 py-10 text-center text-[rgb(var(--text-muted))]">
            No streams yet. Add Science, Commerce, Arts or any custom stream.
          </p>
        ) : (
          <div className="divide-y divide-[rgb(var(--border))]">
            {streams.map((stream) => (
              <div
                key={stream._id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold">{stream.name}</p>
                    {stream.code ? (
                      <span className="rounded-full bg-[rgb(var(--bg))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                        {stream.code}
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        stream.status === "Active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {stream.status}
                    </span>
                  </div>
                  {stream.description ? (
                    <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
                      {stream.description}
                    </p>
                  ) : null}
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(stream)}
                      className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm font-medium"
                    >
                      <FaEdit size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteStream(stream._id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-500"
                    >
                      <FaTrash size={12} /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-[rgb(var(--surface))] text-[rgb(var(--text))] shadow-2xl">
            <div className="border-b border-[rgb(var(--border))] px-6 py-4">
              <h2 className="text-lg font-semibold">
                {editing ? "Edit Stream" : "Add Stream"}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">
                Stream Name *
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5"
                  placeholder="e.g. Science"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Code
                <input
                  value={form.code}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, code: e.target.value }))
                  }
                  className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5"
                  placeholder="e.g. SCI"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Status
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">
                Description
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5"
                  placeholder="Optional notes"
                />
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-[rgb(var(--border))] px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-[rgb(var(--border))] px-4 py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveStream}
                disabled={saving}
                className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
