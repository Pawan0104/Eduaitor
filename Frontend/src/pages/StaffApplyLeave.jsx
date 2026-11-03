import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

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

const countDays = (from, to) => {
  if (!from || !to) return 0;
  const a = new Date(from);
  const b = new Date(to);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  if (a > b) return 0;
  return Math.floor((b - a) / 86400000) + 1;
};

export default function StaffApplyLeave() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(null);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/staff-leave/me`, {
        withCredentials: true,
      });
      setData(res.data.data);
      const firstWithBal = (res.data.data?.balances || []).find(
        (b) => Number(b.balance) > 0,
      );
      setLeaveTypeId(
        firstWithBal?.leaveTypeId
          ? String(firstWithBal.leaveTypeId)
          : res.data.data?.balances?.[0]?.leaveTypeId
            ? String(res.data.data.balances[0].leaveTypeId)
            : "",
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load leave");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const days = useMemo(
    () => countDays(fromDate, toDate),
    [fromDate, toDate],
  );

  const selectedBal = (data?.balances || []).find(
    (b) => String(b.leaveTypeId) === String(leaveTypeId),
  );

  const apply = async () => {
    if (!leaveTypeId) {
      toast.error("Select a leave type");
      return;
    }
    if (!fromDate || !toDate) {
      toast.error("Select from and to dates");
      return;
    }
    if (!reason.trim()) {
      toast.error("Enter a reason");
      return;
    }
    if (days <= 0) {
      toast.error("Invalid date range");
      return;
    }
    if (selectedBal && days > Number(selectedBal.balance)) {
      toast.error(
        `Only ${selectedBal.balance} day(s) available for this leave type`,
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post(
        `${API}/staff-leave/me/apply`,
        { leaveTypeId, fromDate, toDate, reason: reason.trim(), days },
        { withCredentials: true },
      );
      toast.success(res.data.message || "Leave applied");
      setFromDate("");
      setToDate("");
      setReason("");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not apply leave");
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (id) => {
    if (!window.confirm("Cancel this leave and restore balance?")) return;
    try {
      await axios.patch(
        `${API}/staff-leave/me/${id}/cancel`,
        {},
        { withCredentials: true },
      );
      toast.success("Leave cancelled — balance restored");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Cancel failed");
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
        <h1 className="text-2xl font-bold">My Leave</h1>
        <p className="text-sm text-[rgb(var(--text-muted))] mt-1">
          Apply for leave — days are deducted from your balance immediately.
          {user?.role === "teacher_admin" ? " (Teacher)" : " (Staff)"}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[rgb(var(--text-muted))]">Loading…</p>
      ) : !data?.policyConfigured ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 max-w-xl">
          School admin has not configured staff leave credits yet. Please
          contact the office.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 max-w-5xl">
          <div className="space-y-4">
            <div className="bg-[rgb(var(--surface))] rounded-2xl border border-[rgb(var(--border))] p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-sm font-semibold">Leave balance</p>
                <span className="text-[11px] text-[rgb(var(--text-muted))]">
                  {data.periodLabel} · {data.creditFrequency}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(data.balances || []).map((b) => (
                  <div
                    key={String(b.leaveTypeId)}
                    className="rounded-xl border border-[rgb(var(--border))] p-3 bg-[rgb(var(--bg))]"
                  >
                    <p className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                      {b.code || b.name}
                    </p>
                    <p className="text-xl font-bold text-[rgb(var(--primary))] mt-1">
                      {b.balance}
                    </p>
                    <p className="text-[11px] text-[rgb(var(--text-muted))]">
                      Used {b.used} / {b.credited}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[rgb(var(--surface))] rounded-2xl border border-[rgb(var(--border))] p-4 space-y-3">
              <p className="text-sm font-semibold">Apply leave</p>
              <div>
                <label className="text-xs font-semibold uppercase">
                  Leave type
                </label>
                <select
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(e.target.value)}
                  className="mt-1 w-full border border-[rgb(var(--border))] rounded-xl px-3 py-2.5 text-sm bg-[rgb(var(--surface))]"
                >
                  {(data.balances || []).map((b) => (
                    <option
                      key={String(b.leaveTypeId)}
                      value={String(b.leaveTypeId)}
                    >
                      {b.name} ({b.code}) — {b.balance} left
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase">
                    From
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="mt-1 w-full border border-[rgb(var(--border))] rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase">To</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="mt-1 w-full border border-[rgb(var(--border))] rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
              </div>
              {days > 0 && (
                <p className="text-xs text-[rgb(var(--text-muted))]">
                  Duration: <strong>{days}</strong> day(s)
                  {selectedBal
                    ? ` · Available ${selectedBal.balance}`
                    : ""}
                </p>
              )}
              <div>
                <label className="text-xs font-semibold uppercase">
                  Reason
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full border border-[rgb(var(--border))] rounded-xl px-3 py-2.5 text-sm"
                  placeholder="Reason for leave"
                />
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={apply}
                className="app-btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Apply & deduct leave"}
              </button>
            </div>
          </div>

          <div className="bg-[rgb(var(--surface))] rounded-2xl border border-[rgb(var(--border))] p-4">
            <p className="text-sm font-semibold mb-3">My applications</p>
            {(data.requests || []).length === 0 ? (
              <p className="text-sm text-[rgb(var(--text-muted))]">
                No leave applications yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {data.requests.map((r) => (
                  <div
                    key={r._id}
                    className="rounded-xl border border-[rgb(var(--border))] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">
                          {r.leaveTypeName} · {r.days} day(s)
                        </p>
                        <p className="text-xs text-[rgb(var(--text-muted))]">
                          {fmtDate(r.fromDate)} → {fmtDate(r.toDate)}
                        </p>
                        <p className="text-xs mt-1">{r.reason}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                          STATUS[r.status] || STATUS.pending
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    {r.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => cancel(r._id)}
                        className="mt-2 text-xs font-semibold text-red-600 hover:underline"
                      >
                        Cancel & restore balance
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
