import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft, FaCheck, FaEdit, FaPlus, FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const emptyTypeForm = {
  name: "",
  code: "",
  description: "",
  isPaid: true,
  isActive: true,
};

const FREQ = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half-yearly", label: "Half yearly" },
  { value: "yearly", label: "Yearly" },
];

const STATUS = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
  cancelled: "bg-slate-100 text-slate-500",
};

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function StaffLeaveAdmin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;
  const schoolId = user?.school_id;
  const canEditTypes = user?.role === "school_admin";
  const [tab, setTab] = useState("types");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [frequency, setFrequency] = useState("yearly");
  const [daysMap, setDaysMap] = useState({});
  const [periodLabel, setPeriodLabel] = useState("");
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [typeForm, setTypeForm] = useState(emptyTypeForm);

  const loadPolicy = async () => {
    const { data } = await axios.get(`${API}/staff-leave/policy`, {
      withCredentials: true,
    });
    const types = data.data?.leaveTypes || [];
    const policy = data.data?.policy || {};
    setLeaveTypes(types);
    setFrequency(policy.creditFrequency || "yearly");
    setPeriodLabel(data.data?.periodLabel || "");
    const map = {};
    for (const t of types) map[t._id] = 0;
    for (const a of policy.allotments || []) {
      const id = a.leaveTypeId?._id || a.leaveTypeId;
      if (id) map[id] = Number(a.daysPerPeriod) || 0;
    }
    setDaysMap(map);
  };

  const loadBalances = async () => {
    const { data } = await axios.get(`${API}/staff-leave/balances`, {
      withCredentials: true,
    });
    setBalances(data.data?.people || []);
    setPeriodLabel(data.data?.periodLabel || periodLabel);
  };

  const loadRequests = async () => {
    const params = {};
    if (filterStatus !== "all") params.status = filterStatus;
    const { data } = await axios.get(`${API}/staff-leave/manage`, {
      params,
      withCredentials: true,
    });
    setRequests(data.data || []);
  };

  const isSchoolOwnedType = (t) =>
    t?.schoolId && schoolId && String(t.schoolId) === String(schoolId);

  const openCreateType = () => {
    setEditingTypeId(null);
    setTypeForm(emptyTypeForm);
    setShowTypeModal(true);
  };

  const openEditType = (row) => {
    setEditingTypeId(row._id);
    setTypeForm({
      name: row.name || "",
      code: row.code || "",
      description: row.description || "",
      isPaid: row.isPaid !== false,
      isActive: row.isActive !== false,
    });
    setShowTypeModal(true);
  };

  const saveLeaveType = async () => {
    if (!typeForm.name.trim() || !typeForm.code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    try {
      setSaving(true);
      if (editingTypeId) {
        await axios.put(
          `${API}/staff-leave/types/${editingTypeId}`,
          typeForm,
          { withCredentials: true },
        );
        toast.success("Leave type updated");
      } else {
        await axios.post(`${API}/staff-leave/types`, typeForm, {
          withCredentials: true,
        });
        toast.success("Leave type created for your school");
      }
      setShowTypeModal(false);
      await loadPolicy();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deactivateLeaveType = async (id) => {
    if (!window.confirm("Deactivate this leave type?")) return;
    try {
      await axios.delete(`${API}/staff-leave/types/${id}`, {
        withCredentials: true,
      });
      toast.success("Leave type deactivated");
      await loadPolicy();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to deactivate");
    }
  };

  const refresh = async () => {
    try {
      setLoading(true);
      await loadPolicy();
      if (tab === "balances") await loadBalances();
      if (tab === "requests") await loadRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filterStatus]);

  const allotmentsPayload = useMemo(
    () =>
      Object.entries(daysMap)
        .filter(([, days]) => Number(days) >= 0)
        .map(([leaveTypeId, daysPerPeriod]) => ({
          leaveTypeId,
          daysPerPeriod: Number(daysPerPeriod) || 0,
        })),
    [daysMap],
  );

  const savePolicy = async () => {
    try {
      setSaving(true);
      const { data } = await axios.put(
        `${API}/staff-leave/policy`,
        { creditFrequency: frequency, allotments: allotmentsPayload },
        { withCredentials: true },
      );
      toast.success(data.message || "Policy saved");
      await loadBalances();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runCredits = async () => {
    try {
      setSaving(true);
      const { data } = await axios.post(
        `${API}/staff-leave/credits/run`,
        {},
        { withCredentials: true },
      );
      toast.success(data.message || "Credits applied");
      await loadBalances();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Credit run failed");
    } finally {
      setSaving(false);
    }
  };

  const decide = async (id, action) => {
    const note =
      action === "rejected"
        ? window.prompt("Rejection reason (optional):") || ""
        : "";
    try {
      await axios.patch(
        `${API}/staff-leave/manage/${id}/action`,
        { action, note },
        { withCredentials: true },
      );
      toast.success(action === "approved" ? "Approved" : "Rejected");
      loadRequests();
      loadBalances();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed");
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

      <div className="mb-5">
        <h1 className="text-2xl font-bold">Staff Leave Management</h1>
        <p className="text-sm text-[rgb(var(--text-muted))] mt-1">
          Define leave types (CL, SL…), set credit frequency, and manage
          applications. Leave is cut automatically when staff apply.
        </p>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {[
          ["types", "Leave types"],
          ["policy", "Credit policy"],
          ["balances", "Balances"],
          ["requests", "Applications"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${
              tab === key
                ? "bg-[rgb(var(--primary))] text-white"
                : "bg-[rgb(var(--surface))] border border-[rgb(var(--border))]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[rgb(var(--text-muted))]">Loading…</p>
      ) : tab === "types" ? (
        <div className="bg-[rgb(var(--surface))] rounded-2xl border border-[rgb(var(--border))] overflow-hidden max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[rgb(var(--border))]">
            <p className="text-sm text-[rgb(var(--text-muted))]">
              Create school leave types, or use platform types from Super Admin.
            </p>
            {canEditTypes && (
              <button
                type="button"
                onClick={openCreateType}
                className="app-btn-primary inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
              >
                <FaPlus size={11} /> Add leave type
              </button>
            )}
          </div>
          {leaveTypes.length === 0 ? (
            <p className="p-5 text-sm text-[rgb(var(--text-muted))]">
              No leave types yet. Add CL, SL, EL for your school.
            </p>
          ) : (
            <div className="divide-y divide-[rgb(var(--border))]">
              {leaveTypes.map((t) => {
                const owned = isSchoolOwnedType(t);
                return (
                  <div
                    key={t._id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">
                        {t.name}{" "}
                        <span className="font-mono text-xs text-[rgb(var(--text-muted))]">
                          ({t.code})
                        </span>
                      </p>
                      <p className="text-[11px] text-[rgb(var(--text-muted))]">
                        {owned ? "School type" : "Platform type"}
                        {t.isPaid === false ? " · Unpaid" : " · Paid"}
                        {!t.isActive ? " · Inactive" : ""}
                      </p>
                    </div>
                    {canEditTypes && owned && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditType(t)}
                          className="p-2 rounded-lg border border-[rgb(var(--border))]"
                        >
                          <FaEdit size={12} />
                        </button>
                        {t.isActive && (
                          <button
                            type="button"
                            onClick={() => deactivateLeaveType(t._id)}
                            className="p-2 rounded-lg border border-red-200 text-red-600 text-xs font-semibold px-2"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : tab === "policy" ? (
        <div className="bg-[rgb(var(--surface))] rounded-2xl border border-[rgb(var(--border))] p-4 md:p-5 space-y-4 max-w-2xl">
          <div>
            <label className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
              Credit frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="mt-1 w-full border border-[rgb(var(--border))] rounded-xl px-3 py-2.5 text-sm bg-[rgb(var(--surface))]"
            >
              {FREQ.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-[rgb(var(--text-muted))] mt-1.5">
              Current period: {periodLabel || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-[rgb(var(--text-muted))] mb-2">
              Days credited per period (by leave type)
            </p>
            {leaveTypes.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
                No leave types from Super Admin yet. Ask Super Admin to add CL,
                SL, etc.
              </p>
            ) : (
              <div className="space-y-2">
                {leaveTypes.map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-[rgb(var(--border))]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">
                        {t.name}{" "}
                        <span className="font-mono text-xs text-[rgb(var(--text-muted))]">
                          ({t.code})
                        </span>
                      </p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={daysMap[t._id] ?? 0}
                      onChange={(e) =>
                        setDaysMap((m) => ({
                          ...m,
                          [t._id]: e.target.value,
                        }))
                      }
                      className="w-24 border border-[rgb(var(--border))] rounded-lg px-2 py-1.5 text-sm text-right"
                    />
                    <span className="text-xs text-[rgb(var(--text-muted))]">
                      days
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={savePolicy}
              className="app-btn-primary px-4 py-2.5 rounded-xl text-sm disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save & credit now"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={runCredits}
              className="app-btn-secondary px-4 py-2.5 rounded-xl text-sm disabled:opacity-60"
            >
              Re-run credits
            </button>
          </div>
        </div>
      ) : tab === "balances" ? (
        <div className="bg-[rgb(var(--surface))] rounded-2xl border border-[rgb(var(--border))] overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgb(var(--border))] text-sm">
            Period: <strong>{periodLabel || "—"}</strong>
          </div>
          {balances.length === 0 ? (
            <p className="p-5 text-sm text-[rgb(var(--text-muted))]">
              No staff/teachers found or policy not set.
            </p>
          ) : (
            <div className="divide-y divide-[rgb(var(--border))]">
              {balances.map((p) => (
                <div key={`${p.personType}-${p.personId}`} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <span className="text-[10px] uppercase font-bold text-[rgb(var(--text-muted))]">
                      {p.personType}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(p.balances || []).length === 0 ? (
                      <span className="text-xs text-[rgb(var(--text-muted))]">
                        No credits yet
                      </span>
                    ) : (
                      p.balances.map((b) => (
                        <span
                          key={String(b.leaveTypeId)}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))]"
                        >
                          <strong>{b.leaveTypeCode || b.leaveTypeName}</strong>:{" "}
                          {b.balance} left ({b.used}/{b.credited} used)
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto">
            {["pending", "approved", "rejected", "cancelled", "all"].map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${
                    filterStatus === s
                      ? "bg-[rgb(var(--primary))] text-white"
                      : "bg-[rgb(var(--surface))] border border-[rgb(var(--border))]"
                  }`}
                >
                  {s}
                </button>
              ),
            )}
          </div>
          {requests.length === 0 ? (
            <p className="text-sm text-[rgb(var(--text-muted))] p-4">
              No applications.
            </p>
          ) : (
            requests.map((r) => (
              <div
                key={r._id}
                className="bg-[rgb(var(--surface))] rounded-2xl border border-[rgb(var(--border))] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">
                      {r.personName}{" "}
                      <span className="text-xs font-normal text-[rgb(var(--text-muted))]">
                        · {r.personType}
                      </span>
                    </p>
                    <p className="text-sm mt-0.5">
                      {r.leaveTypeName} ({r.leaveTypeCode}) · {r.days} day(s)
                    </p>
                    <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
                      {fmtDate(r.fromDate)} → {fmtDate(r.toDate)}
                    </p>
                    <p className="text-xs mt-1">{r.reason}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                      STATUS[r.status] || STATUS.pending
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => decide(r._id, "approved")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                      <FaCheck size={10} /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(r._id, "rejected")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200"
                    >
                      <FaTimes size={10} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-[rgb(var(--surface))] p-5 shadow-xl">
            <h2 className="text-lg font-bold mb-4">
              {editingTypeId ? "Edit leave type" : "Add leave type"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase">Name</label>
                <input
                  className="mt-1 w-full border border-[rgb(var(--border))] rounded-xl px-3 py-2 text-sm"
                  value={typeForm.name}
                  onChange={(e) =>
                    setTypeForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Casual Leave"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase">Code</label>
                <input
                  className="mt-1 w-full border border-[rgb(var(--border))] rounded-xl px-3 py-2 text-sm uppercase"
                  value={typeForm.code}
                  onChange={(e) =>
                    setTypeForm((f) => ({
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
                  value={typeForm.description}
                  onChange={(e) =>
                    setTypeForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={typeForm.isPaid}
                  onChange={(e) =>
                    setTypeForm((f) => ({ ...f, isPaid: e.target.checked }))
                  }
                />
                Paid leave
              </label>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowTypeModal(false)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveLeaveType}
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
