import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiEdit2,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { API } from "../config/api";
import { useAcademicSession } from "../context/AcademicSessionContext";
import {
  formatSessionDate,
  nextSessionName,
  sessionDateRange,
} from "../lib/academicSession";

const emptyForm = (suggestedNext = "") => {
  const name = suggestedNext || nextSessionName("");
  const { startDate, endDate } = sessionDateRange(name);
  return { name, startDate, endDate, isActive: false };
};

const AcademicSessions = () => {
  const navigate = useNavigate();
  const { refresh, activeName, suggestedNext } = useAcademicSession();

  const [sessions, setSessions] = useState([]);
  const [usage, setUsage] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm(suggestedNext));
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/academic-years`, {
        withCredentials: true,
      });
      const list = data?.data?.sessions || [];
      setSessions(list);

      const counts = await Promise.all(
        list.map(async (session) => {
          try {
            const res = await axios.get(
              `${API}/academic-years/${session._id}/usage`,
              { withCredentials: true }
            );
            return [session._id, res.data?.data || { total: 0, usage: {} }];
          } catch {
            return [session._id, { total: 0, usage: {} }];
          }
        })
      );
      setUsage(Object.fromEntries(counts));
    } catch {
      toast.error("Could not load academic sessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm(suggestedNext));
    setModalOpen(true);
  };

  const openEdit = (session) => {
    setEditId(session._id);
    setForm({
      name: session.name,
      startDate: session.startDate
        ? new Date(session.startDate).toISOString().slice(0, 10)
        : "",
      endDate: session.endDate
        ? new Date(session.endDate).toISOString().slice(0, 10)
        : "",
      isActive: Boolean(session.isActive),
    });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Session name is required.");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };
      if (editId) {
        await axios.put(`${API}/academic-years/${editId}`, payload, {
          withCredentials: true,
        });
        toast.success("Session updated.");
      } else {
        await axios.post(
          `${API}/academic-years`,
          { ...payload, isActive: form.isActive },
          { withCredentials: true }
        );
        toast.success("Session created.");
      }
      setModalOpen(false);
      await load();
      await refresh();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Could not save the session. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const activate = async (session) => {
    try {
      await axios.post(
        `${API}/academic-years/${session._id}/activate`,
        {},
        { withCredentials: true }
      );
      toast.success(`${session.name} is now the active session.`);
      await load();
      await refresh();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Could not activate the session."
      );
    }
  };

  const assignExisting = async (session) => {
    try {
      const { data } = await axios.post(
        `${API}/academic-years/${session._id}/assign-existing`,
        {},
        { withCredentials: true }
      );
      const assigned = data?.data?.assigned || {};
      const total = Object.values(assigned).reduce(
        (sum, count) => sum + Number(count || 0),
        0
      );
      toast.success(
        total
          ? `${total} existing record(s) assigned to ${session.name}.`
          : `No untagged records left to assign to ${session.name}.`
      );
      await load();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Could not assign existing records."
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API}/academic-years/${deleteTarget._id}`, {
        withCredentials: true,
      });
      toast.success(`Session ${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
      await load();
      await refresh();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Could not delete the session."
      );
      setDeleteTarget(null);
    }
  };

  const usageLabel = (session) => {
    const info = usage[session._id];
    if (!info) return "";
    if (!info.total) return "No records yet";
    const parts = Object.entries(info.usage || {})
      .map(([key, count]) => `${count} ${key}`)
      .join(", ");
    return `${info.total} record(s) · ${parts}`;
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--surface))] p-4 text-[rgb(var(--text))] md:p-8">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-sm text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
        >
          <FiArrowLeft size={13} /> Back
        </button>

        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold">Academic Sessions</h1>
            <p className="text-sm text-[rgb(var(--text-muted))]">
              Each session keeps its own students, attendance, fees, exams,
              results, timetable, homework, diary, notices and events. Classes,
              sections, subjects and staff are shared across sessions.
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              onClick={load}
              className="flex items-center justify-center gap-2 rounded-xl border border-[rgb(var(--border))] px-4 py-2.5 text-sm font-semibold transition hover:bg-[rgba(var(--primary),0.08)]"
              title="Refresh"
            >
              <FiRefreshCw size={14} /> Refresh
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-5 py-2.5 font-semibold shadow-lg transition active:scale-95 sm:flex-none"
            >
              <FiPlus /> New Session
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[rgb(var(--border))] p-8 text-center text-sm opacity-70">
            Loading sessions…
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {sessions.map((session) => {
              const isActive = session.name === activeName || session.isActive;
              const info = usage[session._id];
              return (
                <div
                  key={session._id}
                  className="min-w-70 flex-1 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-sm sm:flex-none"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold">{session.name}</h3>
                        {isActive && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[rgb(var(--text-light))]">
                        {formatSessionDate(session.startDate) || "—"} →{" "}
                        {formatSessionDate(session.endDate) || "—"}
                      </p>
                      <p className="mt-1 text-xs opacity-70">
                        {usageLabel(session)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 border-t border-[rgb(var(--border))] pt-4">
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => activate(session)}
                        className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        <FiCheckCircle size={15} /> Activate
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(session)}
                      className="flex items-center gap-1.5 text-sm font-bold text-cyan-600 hover:text-cyan-700"
                    >
                      <FiEdit2 size={15} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => assignExisting(session)}
                      className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      <FiRefreshCw size={15} /> Assign existing
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(session)}
                      disabled={Boolean(info?.total)}
                      title={
                        info?.total
                          ? "Delete or move this session's records first"
                          : "Delete session"
                      }
                      className="flex items-center gap-1.5 text-sm font-bold text-red-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FiTrash2 size={15} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}

            {!sessions.length && (
              <div className="w-full rounded-2xl border border-dashed border-[rgb(var(--border))] p-8 text-center">
                <p className="text-sm opacity-70">
                  No sessions yet. Create the first one to get started.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-[rgb(var(--border))] p-5 text-xs leading-relaxed opacity-80">
          <p className="font-bold">How sessions work</p>
          <p className="mt-1">
            Use the session selector in the header to view a past session.
            Teachers, parents and students always see the active session. New
            records are stamped with the session you are currently viewing; use
            “Activate” to change the default for everyone.
          </p>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-[rgb(var(--surface))] p-8 text-[rgb(var(--text))] shadow-2xl">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-6 top-6"
            >
              <FiX size={20} />
            </button>
            <h2 className="mb-6 text-2xl font-bold">
              {editId ? "Update" : "Create"} Session
            </h2>

            <div className="space-y-4">
              <Field
                label="Session name"
                value={form.name}
                onChange={(value) => {
                  const next = { ...form, name: value };
                  if (!editId) {
                    const range = sessionDateRange(value);
                    next.startDate = range.startDate;
                    next.endDate = range.endDate;
                  }
                  setForm(next);
                }}
                placeholder="e.g. 2026-27"
              />
              <Field
                label="Start date"
                type="date"
                value={form.startDate}
                onChange={(value) => setForm({ ...form, startDate: value })}
              />
              <Field
                label="End date"
                type="date"
                value={form.endDate}
                onChange={(value) => setForm({ ...form, endDate: value })}
              />

              {!editId && (
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-[rgb(var(--bg))] p-4">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm({ ...form, isActive: event.target.checked })
                    }
                    className="mt-0.5 h-4 w-4"
                  />
                  <span className="text-sm">
                    <span className="font-semibold">Set as active session</span>
                    <span className="block text-xs opacity-70">
                      New records and teachers/parents will use this session.
                    </span>
                  </span>
                </label>
              )}
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="mt-8 w-full rounded-2xl bg-[rgb(var(--primary))] py-4 font-bold disabled:opacity-60"
            >
              {saving ? "Saving…" : editId ? "Update Session" : "Save Session"}
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[340px] rounded-3xl bg-[rgb(var(--surface))] p-6 text-center text-[rgb(var(--text))] shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <FiAlertTriangle size={30} />
            </div>
            <h2 className="text-xl font-bold">Delete {deleteTarget.name}?</h2>
            <p className="mt-2 text-sm leading-relaxed opacity-80">
              This cannot be undone. Sessions with existing records cannot be
              deleted.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-2xl bg-slate-100 py-3 font-bold text-[rgb(var(--primary))] hover:bg-slate-200"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-2xl bg-red-500 py-3 font-bold text-white hover:bg-red-600"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div>
    <label className="mb-2 ml-1 block text-xs font-bold uppercase">{label}</label>
    <input
      type={type}
      className="w-full rounded-2xl border-none bg-[rgb(var(--bg))] p-4 outline-none focus:ring-2 focus:ring-cyan-500"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  </div>
);

export default AcademicSessions;
