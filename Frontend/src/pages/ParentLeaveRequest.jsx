import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  FaPlus, FaTimes, FaSearch, FaFilter,
  FaCheckCircle, FaTimesCircle, FaClock,
  FaBan, FaArrowLeft, FaCalendarAlt, FaInfoCircle,
} from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

/* ── STATUS CONFIG ───────────────────────────────── */
const STATUS = {
  pending:   { label: "Pending",   color: "bg-yellow-100 text-yellow-600", icon: <FaClock size={11}/>   },
  approved:  { label: "Approved",  color: "bg-green-100 text-green-600",   icon: <FaCheckCircle size={11}/> },
  rejected:  { label: "Rejected",  color: "bg-red-100 text-red-500",       icon: <FaTimesCircle size={11}/> },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500",     icon: <FaBan size={11}/>     },
};

const LEAVE_TYPES = [
  { value: "sick",          label: "Sick Leave" },
  { value: "vacation",      label: "Vacation" },
  { value: "family_function", label: "Family Function" },
  { value: "personal",      label: "Personal" },
  { value: "other",         label: "Other" },
];

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
   MAIN COMPONENT
══════════════════════════════════════════════════ */
const ParentLeaveRequest = () => {
  const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;

  /* ── STATE ──────────────────────────────────────── */
  const [requests, setRequests]         = useState([]);
  const [student, setStudent]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [moduleDisabled, setModuleDisabled] = useState(false);

  const [showForm, setShowForm]         = useState(false);

  const [filterStatus, setFilterStatus] = useState("all");

  // form
  const [leaveType, setLeaveType]       = useState("");
  const [fromDate, setFromDate]         = useState("");
  const [toDate, setToDate]             = useState("");
  const [reason, setReason]             = useState("");

  // confirm cancel
  const [confirmModal, setConfirmModal] = useState(false);
  const [cancelId, setCancelId]         = useState(null);

  /* ── FETCH STUDENT ──────────────────────────────── */
  const fetchStudent = async () => {
    try {
      const res = await axios.get(
        `${API}/students/${user.student_id}`,
        { withCredentials: true }
      );
      setStudent(res.data.data);
    } catch {
      /* non-critical — header will just omit class info */
    }
  };

  /* ── FETCH LEAVE REQUESTS ───────────────────────── */
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== "all") params.status = filterStatus;

      const res = await axios.get(`${API}/leave-request/my`, {
        params,
        withCredentials: true,
      });
      setRequests(res.data.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setModuleDisabled(true);
      } else {
        toast.error("Failed to load leave requests");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  /* ── RESET FORM ─────────────────────────────────── */
  const resetForm = () => {
    setLeaveType("");
    setFromDate("");
    setToDate("");
    setReason("");
  };

  /* ── VALIDATE ───────────────────────────────────── */
  const validate = () => {
    if (!leaveType) return "Please select leave type";
    if (!fromDate) return "Please select from date";
    if (!toDate) return "Please select to date";
    if (fromDate > toDate) return "From date cannot be after To date";
    if (!reason?.trim()) return "Please provide a reason";
    return "";
  };

  /* ── SUBMIT ─────────────────────────────────────── */
  const handleSubmit = async () => {
    const error = validate();
    if (error) return toast.error(error);

    try {
      setSaving(true);
      await axios.post(
        `${API}/leave-request`,
        { leaveType, reason, fromDate, toDate },
        { withCredentials: true }
      );
      toast.success("Leave request submitted successfully");
      setShowForm(false);
      resetForm();
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit request");
    } finally {
      setSaving(false);
    }
  };

  /* ── CANCEL ─────────────────────────────────────── */
  const handleCancel = async () => {
    try {
      await axios.patch(
        `${API}/leave-request/${cancelId}/cancel`,
        {},
        { withCredentials: true }
      );
      toast.success("Leave request cancelled");
      setConfirmModal(false);
      setCancelId(null);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel");
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

  /* ── MODULE DISABLED STATE ──────────────────────── */
  if (moduleDisabled) {
    return (
      <div className="p-4 md:p-6 min-h-screen bg-[rgb(var(--bg))]">
        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))]
          rounded-2xl p-10 text-center">
          <FaBan size={36} className="text-[rgb(var(--text-muted))] mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-[rgb(var(--text))]">
            Leave Requests not available
          </h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-2 max-w-md mx-auto">
            Your school has not enabled this feature yet. Please contact your
            school administrator if you need to submit a leave request.
          </p>
        </div>
      </div>
    );
  }

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
            Leave Request
          </h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">
            {student
              ? `${student.firstName} ${student.lastName} — ${student.classId?.name || ""} ${student.sectionId?.name || ""}`
              : "Loading student info..."}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-[rgb(var(--primary))]
            text-white px-4 py-2.5 rounded-xl shadow text-sm font-medium
            hover:opacity-90 transition self-start sm:self-auto"
        >
          <FaPlus size={12}/> Request Leave
        </button>
      </div>

      {/* ── FILTERS ───────────────────────────────── */}
      <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))]
        rounded-2xl p-4 mb-5 flex flex-col sm:flex-row gap-3">

        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "approved", "rejected", "cancelled"].map((s) => (
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
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="mt-4 text-sm text-[rgb(var(--primary))]
              hover:underline font-medium">
            Request your first leave
          </button>
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
                    {LEAVE_TYPE_MAP[r.leaveType] || r.leaveType}
                  </p>
                </div>

                {/* actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {r.status === "pending" && (
                    <button
                      onClick={() => { setCancelId(r._id); setConfirmModal(true); }}
                      className="p-1.5 rounded-lg bg-red-50
                        text-red-500 hover:opacity-80 transition"
                      title="Cancel request">
                      <FaBan size={13}/>
                    </button>
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
          REQUEST FORM MODAL
      ══════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center
          justify-center z-50 p-4">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]
            rounded-2xl shadow-2xl w-full max-w-lg
            max-h-[94vh] flex flex-col">

            {/* header */}
            <div className="flex items-center justify-between
              px-6 py-4 border-b border-[rgb(var(--border))] shrink-0">
              <div>
                <h2 className="text-lg font-semibold">
                  Request Leave
                </h2>
                <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
                  Submit a leave request for your child
                </p>
              </div>
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="text-[rgb(var(--text-muted))]
                  hover:text-red-400 transition">
                <FaTimes size={18}/>
              </button>
            </div>

            {/* body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* student info — read only */}
              {student && (
                <div className="p-3 rounded-xl
                  bg-[rgba(var(--primary),0.06)]
                  border border-[rgb(var(--border))]">
                  <p className="text-xs font-medium
                    text-[rgb(var(--text-muted))] mb-1">
                    Student
                  </p>
                  <p className="text-sm font-semibold
                    text-[rgb(var(--text))]">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-xs text-[rgb(var(--text-muted))]">
                    {student.classId?.name} {student.sectionId?.name}
                    {student.rollNo && ` — Roll No. ${student.rollNo}`}
                  </p>
                </div>
              )}

              {/* leave type */}
              <div>
                <label className="text-xs font-medium
                  text-[rgb(var(--text-muted))] mb-1 block">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full border border-[rgb(var(--border))]
                    rounded-lg px-3 py-2 text-sm
                    bg-[rgb(var(--bg))] text-[rgb(var(--text))]
                    focus:outline-none focus:ring-2
                    focus:ring-[rgb(var(--primary))] transition"
                >
                  <option value="">Select leave type</option>
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* dates */}
              <div className="grid grid-cols-2 gap-3">
                <FInput
                  label="From Date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  required
                />
                <FInput
                  label="To Date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  required
                />
              </div>

              {/* reason */}
              <div>
                <label className="text-xs font-medium
                  text-[rgb(var(--text-muted))] mb-1 block">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Reason for leave..."
                  className="w-full border border-[rgb(var(--border))]
                    rounded-lg px-3 py-2 text-sm
                    bg-[rgb(var(--bg))] text-[rgb(var(--text))]
                    focus:outline-none focus:ring-2
                    focus:ring-[rgb(var(--primary))]
                    transition resize-none"
                />
              </div>

            </div>

            {/* footer */}
            <div className="flex justify-between items-center
              px-6 py-4 border-t border-[rgb(var(--border))] shrink-0">
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 border border-[rgb(var(--border))]
                  rounded-lg text-sm
                  hover:bg-[rgba(var(--primary),0.06)] transition">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2 bg-[rgb(var(--primary))] text-white
                  rounded-lg text-sm font-medium shadow-sm
                  hover:opacity-90 transition disabled:opacity-50">
                {saving ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          CANCEL CONFIRM MODAL
      ══════════════════════════════════════════════ */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center
          justify-center z-50 p-4">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]
            rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-2">Cancel Leave Request</h2>
            <p className="text-sm text-[rgb(var(--text-muted))]">
              Are you sure you want to cancel this pending leave request?
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setConfirmModal(false); setCancelId(null); }}
                className="px-4 py-2 border border-[rgb(var(--border))]
                  rounded-lg text-sm hover:bg-[rgba(var(--primary),0.06)]
                  transition">
                No, keep it
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-500 text-white rounded-lg
                  text-sm font-medium hover:opacity-90 transition">
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

/* ── FORM INPUT ──────────────────────────────────── */
const FInput = ({
  label, type = "text", required = false,
  placeholder, value, onChange
}) => (
  <div>
    <label className="text-xs font-medium
      text-[rgb(var(--text-muted))] mb-1 block">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full border border-[rgb(var(--border))]
        rounded-lg px-3 py-2 text-sm
        bg-[rgb(var(--bg))] text-[rgb(var(--text))]
        focus:outline-none focus:ring-2
        focus:ring-[rgb(var(--primary))] transition"
    />
  </div>
);

export default ParentLeaveRequest;