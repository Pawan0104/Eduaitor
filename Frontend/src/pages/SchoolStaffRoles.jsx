import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaPlus,
  FaEdit,
  FaTrash,
  FaTimes,
  FaShieldAlt,
  FaToggleOn,
  FaToggleOff,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { MODULES } from "../constants/module.js";

const API = import.meta.env.VITE_API_URL;

const emptyForm = {
  name: "",
  description: "",
  permissions: [],
  isActive: true,
};

export default function SchoolStaffRoles() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;

  const authModules = useMemo(
    () =>
      MODULES.filter((m) => user?.subscribed_modules?.includes(m.key)),
    [user?.subscribed_modules],
  );

  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      setLoading(true);
      const [rolesRes, modsRes] = await Promise.all([
        axios.get(`${API}/school-staff-roles`, { withCredentials: true }),
        axios.get(`${API}/school-staff-roles/modules`, { withCredentials: true }),
      ]);
      setRoles(rolesRes.data.data || []);
      const apiModules = modsRes.data.data || [];
      setModules(apiModules.length ? apiModules : authModules);
    } catch (err) {
      setRoles([]);
      // Keep modules from auth so the page is usable even if API gate fails
      setModules(authModules);
      toast.error(err.response?.data?.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authModules.length]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      permissions: modules.map((m) => m.key),
    });
    setShowModal(true);
  };

  const openEdit = (role) => {
    setEditingId(role._id);
    setForm({
      name: role.name || "",
      description: role.description || "",
      permissions: role.permissions || [],
      isActive: role.isActive !== false,
    });
    setShowModal(true);
  };

  const togglePerm = (key) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((k) => k !== key)
        : [...f.permissions, key],
    }));
  };

  const selectAll = () => {
    setForm((f) => ({
      ...f,
      permissions:
        f.permissions.length === modules.length
          ? []
          : modules.map((m) => m.key),
    }));
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Role name is required");
    if (form.permissions.length === 0) {
      return toast.error("Select at least one module");
    }
    try {
      setSaving(true);
      if (editingId) {
        await axios.put(
          `${API}/school-staff-roles/${editingId}`,
          form,
          { withCredentials: true },
        );
        toast.success("Role updated — assigned staff permissions synced");
      } else {
        await axios.post(`${API}/school-staff-roles`, form, {
          withCredentials: true,
        });
        toast.success("Role created");
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (role) => {
    try {
      await axios.put(
        `${API}/school-staff-roles/${role._id}`,
        { isActive: !role.isActive },
        { withCredentials: true },
      );
      toast.success(role.isActive ? "Role deactivated" : "Role activated");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  const remove = async (role) => {
    if (
      !window.confirm(
        `Delete role "${role.name}"? This only works if no staff are assigned.`,
      )
    ) {
      return;
    }
    try {
      await axios.delete(`${API}/school-staff-roles/${role._id}`, {
        withCredentials: true,
      });
      toast.success("Role deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen text-[rgb(var(--text))]">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          {isMobile && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-1.5 mb-3 rounded-xl bg-[rgb(var(--surface))] border text-sm font-bold"
            >
              <FaArrowLeft /> Back
            </button>
          )}
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaShieldAlt className="text-[rgb(var(--primary))]" />
            Staff Roles
          </h1>
          <p className="text-sm text-[rgb(var(--text-light))] mt-1">
            Create roles from modules your school can access, then assign them
            when adding staff
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={modules.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          <FaPlus size={12} /> New role
        </button>
      </div>

      {modules.length === 0 && !loading && (
        <div className="rounded-2xl border bg-[rgb(var(--surface))] p-6 text-sm text-[rgb(var(--text-muted))]">
          No modules are enabled for your school. Ask Super Admin to enable
          modules first.
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[rgb(var(--text-muted))]">Loading…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role._id}
              className={`rounded-2xl border bg-[rgb(var(--surface))] p-4 ${
                role.isActive === false ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-[rgb(var(--text))]">
                    {role.name}
                  </h3>
                  {role.description ? (
                    <p className="text-xs text-[rgb(var(--text-muted))] mt-1">
                      {role.description}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    role.isActive === false
                      ? "bg-slate-200 text-slate-600"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {role.isActive === false ? "Inactive" : "Active"}
                </span>
              </div>

              <p className="text-xs text-[rgb(var(--text-muted))] mt-3">
                {(role.permissions || []).length} modules · {role.staffCount || 0}{" "}
                staff
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(role.permissions || []).slice(0, 6).map((key) => {
                  const label =
                    modules.find((m) => m.key === key)?.label || key;
                  return (
                    <span
                      key={key}
                      className="text-[10px] px-2 py-0.5 rounded-lg border border-[rgb(var(--border))]"
                    >
                      {label}
                    </span>
                  );
                })}
                {(role.permissions || []).length > 6 ? (
                  <span className="text-[10px] text-[rgb(var(--text-muted))]">
                    +{role.permissions.length - 6} more
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(role)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold"
                >
                  <FaEdit size={11} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(role)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold"
                >
                  {role.isActive === false ? (
                    <>
                      <FaToggleOff size={11} /> Activate
                    </>
                  ) : (
                    <>
                      <FaToggleOn size={11} /> Deactivate
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove(role)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 text-red-600 px-3 py-1.5 text-xs font-bold"
                >
                  <FaTrash size={11} /> Delete
                </button>
              </div>
            </div>
          ))}

          {!roles.length && modules.length > 0 && (
            <div className="sm:col-span-2 xl:col-span-3 rounded-2xl border border-dashed p-10 text-center text-sm text-[rgb(var(--text-muted))]">
              No roles yet. Create your first staff role.
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[rgb(var(--surface))] border shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-[rgb(var(--border))]">
              <h2 className="font-bold text-lg">
                {editingId ? "Edit role" : "New role"}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-[rgb(var(--bg))]"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                  Role name
                </span>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm"
                  placeholder="e.g. Fee Clerk"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                  Description
                </span>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={2}
                  className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm resize-none"
                  placeholder="What this role can do"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                />
                Active (can be assigned to staff)
              </label>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                    Module access ({form.permissions.length}/{modules.length})
                  </p>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs font-bold text-[rgb(var(--primary))]"
                  >
                    {form.permissions.length === modules.length
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                </div>
                <p className="text-[11px] text-[rgb(var(--text-muted))] mb-2">
                  Only modules enabled for your school by Super Admin are listed.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {modules.map((mod) => {
                    const checked = form.permissions.includes(mod.key);
                    return (
                      <label
                        key={mod.key}
                        className={`flex items-center gap-2 rounded-xl border p-2.5 text-sm cursor-pointer ${
                          checked
                            ? "border-[rgb(var(--primary))] bg-[rgba(var(--primary),0.08)]"
                            : "border-[rgb(var(--border))]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePerm(mod.key)}
                          className="accent-[rgb(var(--primary))]"
                        />
                        <span className="font-medium leading-tight">
                          {mod.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-[rgb(var(--border))]">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border px-4 py-2 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-bold text-white"
              >
                {saving ? "Saving…" : "Save role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
