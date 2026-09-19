import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  FaSearch, FaCheckCircle, FaTimesCircle, FaClock,
  FaBan, FaArrowLeft, FaCalendarAlt, FaInfoCircle, FaCheck, FaTimes,
} from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

/* ── STATUS CONFIG ───────────────────────────────── */
const STATUS = {
  pending:   { label: "Pending",   color: "bg-yellow-100 text-yellow-600", icon: <FaClock size={11}/>   },
  approved:  { label: "Approved",  color: "bg-green-100 text-green-600",   icon: <FaCheckCircle size={11}/> },
  rejected:  { label: "Rejected",  color: "bg-red-100 text-red-500",       icon: <FaTimesCircle size={11}/> },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500",     icon: <FaBan size={11}/>     },
};

const LEAVE_TYPE_MAP = {
  sick:           "Sick Leave",
  vacation:       "Vacation",
  family_function:"Family Function",
  personal:       "Personal",
  other:          "Other",
};

const fmtDate = (v) => {
  if (!v) return "";
  return new Date(v).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
};

/* ══════════════════════════════════════════════════
   MAIN COMPONENT — teacher | school admin | staff
══════════════════════════════════════════════════ */
const ManageLeaveRequests = ({ pageTitle = "Leave Requests" }) => {
  const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;
  const isTeacher = user?.role === "teacher_admin";
  const isStaff = user?.role === "staff_admin";

  /* ── STATE ──────────────────────────────────────── */
  const [requests, setRequests]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [decisionId, setDecisionId]     = useState(null);
  const [decisionAction, setDecisionAction] = useState("approved");
  const [decisionNote, setDecisionNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [savingId, setSavingId]         = useState(null);

  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch]             = useState("");

  /* ── FETCH ──────────────────────────────────────── */
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== "all") params.status = filterStatus;
      if (search.trim())           params.search = search.trim();

      const res = await axios.get(`${API}/leave-request/manage`, {
        params,
        withCredentials: true,
      });
      setRequests(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchRequests, 350);
    return () => clearTimeout(t);
  }, [filterStatus, search]);

  /* ── DECISION MODAL ─────────────────────────────── */
  const openDecision = (id, action) => {
    setDecisionId(id);
    setDecisionAction(action);
    setDecisionNote("");
  };

  const closeDecision = () => {
    setDecisionId(null);
    setDecisionNote("");
  };

  const submitDecision = async () => {
    if (decisionAction === "rejected" && !decisionNote?.trim()) {
      return toast.error("Please provide a reason for rejection");
    }

    try {
      setActionLoading(true);
      setSavingId(decisionId);
      await axios.patch(
        `${API}/leave-request/${decisionId}/action`,
        { action: decisionAction, note: decisionNote },
        { withCredentials: true }
      );
      toast.success(
        decisionAction === "approved"
          ? "Leave request approved"
          : "Leave request rejected"
      );
      closeDecision();
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update request");
    } finally {
      setActionLoading(false);
      setSavingId(null);
    }
  };

  /* ── STATUS BADGE ───────────────────────────────── */
  const StatusBadge = ({ status }) => {
    const s = STATUS[status] || STATUS.pending;
    return (
      <span className={`flex items-center gap-1 px-2.5 py-1
        rounded-full text-xs font-medium ${s.color}`}>
        {s.icon} {s.label}
      </span>
    );
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  /* ══════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════ */
  return (
    <div className="p-4 md:p-6 min-h-screen bg-[rgb(var(--bg))]">

      {/* BACK — mobile */}
      {isMobile && (
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl mb-4
            bg-[rgb(var(--surface))] border border-[rgb(var(--border))]
            text-sm font-bold text-[rgb(var(--text))]
            active:scale-95 transition-transform"
        >
          <FaArrowLeft size={13}/> Back
        </button>
      )}

      {/* ── HEADER ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center
        justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold
            text-[rgb(var(--text))]">
            {pageTitle}
          </h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">
            {isTeacher
              ? "Leave requests from students in your class"
              : isStaff
                ? "Manage leave requests from all students"
                : "Review and manage parent leave requests"}
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl
            bg-yellow-50 border border-yellow-100 text-xs font-medium
            text-yellow-700 self-start sm:self-auto">
            <FaClock size={12}/>
            {pendingCount} pending request{pendingCount === 1 ? "" : "s"}
          </div>
        )}
      </div>

      {/* ── FILTERS ───────────────────────────────── */}
      <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))]
        rounded-2xl p-4 mb-5 flex flex-col sm:flex-row gap-3">

        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium
                transition capitalize
                ${filterStatus === s
                  ? "bg-[rgb(var(--primary))] text-white"
                  : "bg-[rgb(var(--bg))] text-[rgb(var(--text-muted))] border border-[rgb(var(--border))] hover:border-[rgb(var(--border-strong))]"
                }`}
            >
              {s === "all" ? "All" : STATUS[s]?.label}
            </button>
          ))}
        </div>

        {/* search */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <FaSearch className="text-[rgb(var(--text-muted))]" size={13}/>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name..."
            className="text-sm px-3 py-1.5 rounded-lg
              border border-[rgb(var(--border))]
              bg-[rgb(var(--bg))] text-[rgb(var(--text))]
              focus:outline-none focus:ring-2
              focus:ring-[rgb(var(--primary))] transition"
          />
        </div>
      </div>

      {/* ── LIST ──────────────────────────────────── */}
      {loading ? (
        <p className="text-center py-12 text-[rgb(var(--text-muted))]">
          Loading leave requests...
        </p>
      ) : requests.length === 0 ? (
        <div className="text-center py-16">
          <FaInfoCircle size={32}
            className="text-[rgb(var(--text-muted))] mx-auto mb-3"/>
          <p className="text-[rgb(var(--text-muted))] text-sm">
            No leave requests found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r._id}
              className="bg-[rgb(var(--surface))]
                border border-[rgb(var(--border))] rounded-2xl p-4
                hover:shadow-sm transition">

              {/* top row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={r.status}/>
                    <span className="text-xs text-[rgb(var(--text-muted))]">
                      #{r._id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm font-semibold
                    text-[rgb(var(--text))] mt-1.5">
                    {r.studentId?.firstName} {r.studentId?.lastName}
                    <span className="font-normal
                      text-[rgb(var(--text-muted))] ml-2">
                      {r.studentId?.studentId || ""}
                    </span>
                  </p>
                  <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
                    {LEAVE_TYPE_MAP[r.leaveType] || r.leaveType} • requested by {r.requestedByName || "parent"}
                  </p>
                </div>

                {/* actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {r.status === "pending" && (
                    <>
                      <button
                        onClick={() => openDecision(r._id, "approved")}
                        disabled={savingId === r._id}
                        className="flex items-center gap-1 px-3 py-1.5
                          rounded-lg bg-green-50 text-green-600 text-xs
                          font-medium hover:opacity-80 transition
                          disabled:opacity-50"
                      >
                        <FaCheck size={12}/> Approve
                      </button>
                      <button
                        onClick={() => openDecision(r._id, "rejected")}
                        disabled={savingId === r._id}
                        className="flex items-center gap-1 px-3 py-1.5
                          rounded-lg bg-red-50 text-red-500 text-xs
                          font-medium hover:opacity-80 transition
                          disabled:opacity-50"
                      >
                        <FaTimes size={12}/> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* details row */}
              <div className="mt-3 pt-3 border-t border-[rgb(var(--border))]
                flex flex-wrap gap-4 text-xs text-[rgb(var(--text-muted))]">
                <span className="flex items-center gap-1.5">
                  <FaCalendarAlt size={11}/>
                  {fmtDate(r.fromDate)}
                  {r.toDate && r.toDate.slice(0, 10) !== r.fromDate.slice(0, 10) &&
                    ` → ${fmtDate(r.toDate)}`}
                </span>
                <span className="flex items-center gap-1.5 flex-1 min-w-0">
                  <FaInfoCircle size={11} className="shrink-0"/>
                  <span className="truncate">{r.reason}</span>
                </span>
              </div>

              {/* action note — if rejected */}
              {r.status === "rejected" && r.actionByName && (
                <div className="mt-2 px-3 py-2 rounded-lg
                  bg-red-50 border border-red-100">
                  <p className="text-xs text-red-600">
                    <span className="font-medium">
                      Rejected by {r.actionByName}
                      {r.actionByRole && ` (${r.actionByRole.replace("_admin", "")})`}
                      {r.actionAt && ` on ${fmtDate(r.actionAt)}`}:
                    </span>
                    {" "}{r.actionNote || "No reason provided"}
                  </p>
                </div>
              )}

              {/* approved by */}
              {r.status === "approved" && r.actionByName && (
                <div className="mt-2 px-3 py-2 rounded-lg
                  bg-green-50 border border-green-100">
                  <p className="text-xs text-green-600">
                    <span className="font-medium">
                      Approved by {r.actionByName}
                      {r.actionByRole && ` (${r.actionByRole.replace("_admin", "")})`}
                    </span>
                    {r.actionAt && ` on ${fmtDate(r.actionAt)}`}
                  </p>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          DECISION MODAL
      ══════════════════════════════════════════════ */}
      {decisionId && (
        <div className="fixed inset-0 bg-black/50 flex items-center
          justify-center z-50 p-4">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]
            rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                {decisionAction === "approved" ? "Approve Leave" : "Reject Leave"}
              </h2>
              <button
                onClick={closeDecision}
                className="text-[rgb(var(--text-muted))]
                  hover:text-red-400 transition">
                <FaTimes size={18}/>
              </button>
            </div>

            {decisionAction === "rejected" ? (
              <div>
                <label className="text-xs font-medium
                  text-[rgb(var(--text-muted))] mb-1 block">
                  Reason for rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  rows={3}
                  placeholder="Explain why this leave is rejected..."
                  className="w-full border border-[rgb(var(--border))]
                    rounded-lg px-3 py-2 text-sm
                    bg-[rgb(var(--bg))] text-[rgb(var(--text))]
                    focus:outline-none focus:ring-2
                    focus:ring-[rgb(var(--primary))]
                    transition resize-none"
                />
              </div>
            ) : (
              <p className="text-sm text-[rgb(var(--text-muted))]">
                Are you sure you want to approve this leave request?
              </p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeDecision}
                className="px-4 py-2 border border-[rgb(var(--border))]
                  rounded-lg text-sm hover:bg-[rgba(var(--primary),0.06)]
                  transition">
                Cancel
              </button>
              <button
                onClick={submitDecision}
                disabled={actionLoading}
                className={`px-4 py-2 text-white rounded-lg
                  text-sm font-medium hover:opacity-90 transition
                  disabled:opacity-50
                  ${decisionAction === "approved" ? "bg-green-500" : "bg-red-500"}`}
              >
                {actionLoading
                  ? "Updating..."
                  : decisionAction === "approved" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageLeaveRequests;