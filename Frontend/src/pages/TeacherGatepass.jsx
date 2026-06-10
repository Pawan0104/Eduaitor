import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  FaSearch, FaFilter, FaTimes, FaEye,
  FaCheckCircle, FaTimesCircle, FaClock,
  FaBan, FaArrowLeft, FaUser, FaPhone,
  FaInfoCircle, FaCalendarAlt, FaChalkboardTeacher,
} from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

/* ── STATUS CONFIG ───────────────────────────────── */
const STATUS = {
  pending:   { label: "Pending",   color: "bg-yellow-100 text-yellow-600", icon: <FaClock size={11}/>       },
  approved:  { label: "Approved",  color: "bg-green-100 text-green-600",   icon: <FaCheckCircle size={11}/> },
  rejected:  { label: "Rejected",  color: "bg-red-100 text-red-500",       icon: <FaTimesCircle size={11}/> },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500",     icon: <FaBan size={11}/>         },
};

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
const TeacherGatepass = () => {
  const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;

  /* ── STATE ──────────────────────────────────────── */
  const [gatepasses, setGatepasses]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [notClassTeacher, setNotClassTeacher] = useState(false);

  // filters
  const [search, setSearch]                 = useState("");
  const [filterStatus, setFilterStatus]     = useState("all");
  const [filterDate, setFilterDate]         = useState("");

  // view + action
  const [showView, setShowView]             = useState(false);
  const [viewItem, setViewItem]             = useState(null);
  const [showAction, setShowAction]         = useState(false);
  const [actionItem, setActionItem]         = useState(null);
  const [actionType, setActionType]         = useState(""); // "approved" | "rejected"
  const [actionNote, setActionNote]         = useState("");
  const [actioning, setActioning]           = useState(false);

  /* ── FETCH ──────────────────────────────────────── */
  const fetchGatepasses = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterDate)             params.date   = filterDate;
      if (search.trim())          params.search = search;

      const res = await axios.get(`${API}/gatepass/manage`, {
        params,
        withCredentials: true,
      });

      // backend returns notClassTeacher flag
      if (res.data.notClassTeacher) {
        setNotClassTeacher(true);
        setGatepasses([]);
      } else {
        setNotClassTeacher(false);
        setGatepasses(res.data.data);
      }
    } catch {
      toast.error("Failed to load gate passes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGatepasses();
  }, [filterStatus, filterDate]);

  // search with small debounce
  useEffect(() => {
    const t = setTimeout(() => fetchGatepasses(), 400);
    return () => clearTimeout(t);
  }, [search]);

  /* ── OPEN ACTION MODAL ──────────────────────────── */
  const openAction = (item, type) => {
    setActionItem(item);
    setActionType(type);
    setActionNote("");
    setShowAction(true);
  };

  /* ── SUBMIT ACTION ──────────────────────────────── */
  const handleAction = async () => {
    if (actionType === "rejected" && !actionNote.trim()) {
      return toast.error("Please provide a reason for rejection");
    }

    try {
      setActioning(true);
      await axios.patch(
        `${API}/gatepass/${actionItem._id}/action`,
        { action: actionType, note: actionNote },
        { withCredentials: true }
      );

      toast.success(
        `Gate pass ${actionType === "approved" ? "approved" : "rejected"} successfully`
      );
      setShowAction(false);
      setActionItem(null);
      setActionNote("");

      // update local state immediately — no refetch needed
      setGatepasses((prev) =>
        prev.map((g) =>
          g._id === actionItem._id
            ? {
                ...g,
                status:       actionType,
                actionByName: user.name,
                actionByRole: user.role,
                actionNote:   actionNote || null,
                actionAt:     new Date().toISOString(),
              }
            : g
        )
      );

      // also update view item if open
      if (showView && viewItem?._id === actionItem._id) {
        setViewItem((prev) => ({
          ...prev,
          status:       actionType,
          actionByName: user.name,
          actionNote:   actionNote || null,
          actionAt:     new Date().toISOString(),
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    } finally {
      setActioning(false);
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
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold
          text-[rgb(var(--text))]">
          Gate Pass Requests
        </h1>
        <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">
          Manage gate pass requests from your class students
        </p>
      </div>

      {/* ── NOT CLASS TEACHER MESSAGE ─────────────── */}
      {notClassTeacher ? (
        <div className="flex flex-col items-center justify-center
          py-20 text-center">
          <div className="w-16 h-16 rounded-2xl
            bg-[rgba(var(--primary),0.1)]
            flex items-center justify-center mb-4">
            <FaChalkboardTeacher size={28}
              className="text-[rgb(var(--primary))]"/>
          </div>
          <h2 className="text-lg font-semibold
            text-[rgb(var(--text))] mb-2">
            Not Assigned as Class Teacher
          </h2>
          <p className="text-sm text-[rgb(var(--text-muted))]
            max-w-sm">
            You are not assigned as class teacher of any class.
            Please contact your school administrator.
          </p>
        </div>
      ) : (
        <>
          {/* ── FILTERS ─────────────────────────────── */}
          <div className="bg-[rgb(var(--surface))]
            border border-[rgb(var(--border))]
            rounded-2xl p-4 mb-5
            flex flex-col sm:flex-row gap-3">

            {/* search */}
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2
                -translate-y-1/2 text-[rgb(var(--text-muted))]"
                size={13}/>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg
                  border border-[rgb(var(--border))]
                  bg-[rgb(var(--bg))] text-[rgb(var(--text))]
                  focus:outline-none focus:ring-2
                  focus:ring-[rgb(var(--primary))] transition"
              />
            </div>

            {/* status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg
                border border-[rgb(var(--border))]
                bg-[rgb(var(--bg))] text-[rgb(var(--text))]
                focus:outline-none focus:ring-2
                focus:ring-[rgb(var(--primary))] transition"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* date filter */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="text-sm px-3 py-2 rounded-lg
                  border border-[rgb(var(--border))]
                  bg-[rgb(var(--bg))] text-[rgb(var(--text))]
                  focus:outline-none focus:ring-2
                  focus:ring-[rgb(var(--primary))] transition"
              />
              {filterDate && (
                <button
                  onClick={() => setFilterDate("")}
                  className="text-xs text-red-400
                    hover:text-red-600 shrink-0">
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* ── LIST ──────────────────────────────────── */}
          {loading ? (
            <p className="text-center py-12
              text-[rgb(var(--text-muted))]">
              Loading gate passes...
            </p>
          ) : gatepasses.length === 0 ? (
            <div className="text-center py-16">
              <FaInfoCircle size={32}
                className="text-[rgb(var(--text-muted))]
                  mx-auto mb-3"/>
              <p className="text-sm text-[rgb(var(--text-muted))]">
                No gate pass requests found.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {gatepasses.map((g) => (
                <div key={g._id}
                  className="bg-[rgb(var(--surface))]
                    border border-[rgb(var(--border))]
                    rounded-2xl p-4 hover:shadow-sm transition">

                  {/* top row */}
                  <div className="flex items-start
                    justify-between gap-3">
                    <div className="flex-1 min-w-0">

                      {/* student name + status */}
                      <div className="flex items-center
                        gap-2 flex-wrap mb-1">
                        <StatusBadge status={g.status}/>
                        <span className="text-xs
                          text-[rgb(var(--text-muted))]">
                          #{g._id.slice(-6).toUpperCase()}
                        </span>
                      </div>

                      {/* student info */}
                      <p className="text-sm font-semibold
                        text-[rgb(var(--text))]">
                        {g.studentId?.firstName} {g.studentId?.lastName}
                      </p>
                      <p className="text-xs
                        text-[rgb(var(--text-muted))]">
                        {g.studentId?.studentId}
                      </p>

                      {/* pickup + date */}
                      <div className="flex flex-wrap gap-3 mt-2
                        text-xs text-[rgb(var(--text-muted))]">
                        <span className="flex items-center gap-1">
                          <FaUser size={10}/>
                          {g.pickupPerson.name}
                          {" "}({g.pickupPerson.relation === "Other"
                            ? g.pickupPerson.customRelation
                            : g.pickupPerson.relation})
                        </span>
                        <span className="flex items-center gap-1">
                          <FaCalendarAlt size={10}/>
                          {new Date(g.exitDate)
                            .toLocaleDateString()} at {g.exitTime}
                        </span>
                      </div>
                    </div>

                    {/* action buttons */}
                    <div className="flex items-center
                      gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setViewItem(g);
                          setShowView(true);
                        }}
                        className="p-1.5 rounded-lg
                          bg-[rgba(var(--primary),0.1)]
                          text-[rgb(var(--primary))]
                          hover:opacity-80 transition"
                        title="View">
                        <FaEye size={13}/>
                      </button>

                      {g.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              openAction(g, "approved")}
                            className="p-1.5 rounded-lg
                              bg-green-50 text-green-600
                              hover:opacity-80 transition"
                            title="Approve">
                            <FaCheckCircle size={13}/>
                          </button>
                          <button
                            onClick={() =>
                              openAction(g, "rejected")}
                            className="p-1.5 rounded-lg
                              bg-red-50 text-red-500
                              hover:opacity-80 transition"
                            title="Reject">
                            <FaTimesCircle size={13}/>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* reason */}
                  <div className="mt-3 pt-3
                    border-t border-[rgb(var(--border))]">
                    <p className="text-xs
                      text-[rgb(var(--text-muted))]">
                      <span className="font-medium">Reason:</span>
                      {" "}{g.reason}
                    </p>
                  </div>

                  {/* action note */}
                  {g.status === "rejected" && g.actionNote && (
                    <div className="mt-2 px-3 py-2 rounded-lg
                      bg-red-50 border border-red-100">
                      <p className="text-xs text-red-600">
                        <span className="font-medium">
                          Rejected:
                        </span> {g.actionNote}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════
          VIEW MODAL
      ══════════════════════════════════════════════ */}
      {showView && viewItem && (
        <div className="fixed inset-0 bg-black/50
          flex items-center justify-center z-50 p-4">
          <div className="bg-[rgb(var(--surface))]
            text-[rgb(var(--text))] rounded-2xl shadow-2xl
            w-full max-w-md max-h-[92vh] flex flex-col">

            {/* header */}
            <div className="flex items-center justify-between
              px-6 py-4 border-b border-[rgb(var(--border))]
              shrink-0">
              <h2 className="text-lg font-semibold">
                Gate Pass Details
              </h2>
              <button onClick={() => setShowView(false)}
                className="text-[rgb(var(--text-muted))]
                  hover:text-red-400 transition">
                <FaTimes size={18}/>
              </button>
            </div>

            {/* body */}
            <div className="overflow-y-auto flex-1
              px-6 py-5 space-y-4">

              {/* status + id */}
              <div className="flex items-center justify-between">
                <StatusBadge status={viewItem.status}/>
                <span className="text-xs
                  text-[rgb(var(--text-muted))]">
                  #{viewItem._id.slice(-6).toUpperCase()}
                </span>
              </div>

              {/* student */}
              <ViewSection title="Student">
                <ViewRow icon={<FaUser/>} label="Name"
                  value={`${viewItem.studentId?.firstName} ${viewItem.studentId?.lastName}`}/>
                <ViewRow icon={<FaInfoCircle/>} label="Student ID"
                  value={viewItem.studentId?.studentId}/>
              </ViewSection>

              {/* pickup */}
              <ViewSection title="Pickup Person">
                <ViewRow icon={<FaUser/>} label="Name"
                  value={viewItem.pickupPerson.name}/>
                <ViewRow icon={<FaInfoCircle/>} label="Relation"
                  value={viewItem.pickupPerson.relation === "Other"
                    ? viewItem.pickupPerson.customRelation
                    : viewItem.pickupPerson.relation}/>
                <ViewRow icon={<FaPhone/>} label="Mobile"
                  value={viewItem.pickupPerson.mobile}/>
              </ViewSection>

              {/* exit details */}
              <ViewSection title="Exit Details">
                <ViewRow icon={<FaCalendarAlt/>} label="Date"
                  value={new Date(viewItem.exitDate)
                    .toLocaleDateString()}/>
                <ViewRow icon={<FaClock/>} label="Time"
                  value={viewItem.exitTime}/>
                {viewItem.expectedReturn && (
                  <ViewRow icon={<FaClock/>}
                    label="Expected Return"
                    value={viewItem.expectedReturn}/>
                )}
              </ViewSection>

              {/* reason */}
              <ViewSection title="Reason">
                <p className="text-sm text-[rgb(var(--text))]">
                  {viewItem.reason}
                </p>
              </ViewSection>

              {/* photo */}
              {viewItem.photo?.url && (
                <ViewSection title="Photo">
                  <img src={viewItem.photo.url}
                    alt="gatepass"
                    className="w-full rounded-xl
                      object-cover max-h-48"/>
                </ViewSection>
              )}

              {/* action info */}
              {(viewItem.status === "approved" ||
                viewItem.status === "rejected") && (
                <ViewSection
                  title={viewItem.status === "approved"
                    ? "Approval Info" : "Rejection Info"}
                  color={viewItem.status === "approved"
                    ? "green" : "red"}
                >
                  <ViewRow icon={<FaUser/>} label="By"
                    value={viewItem.actionByName}/>
                  {viewItem.actionAt && (
                    <ViewRow icon={<FaCalendarAlt/>}
                      label="On"
                      value={new Date(viewItem.actionAt)
                        .toLocaleDateString()}/>
                  )}
                  {viewItem.actionNote && (
                    <ViewRow icon={<FaInfoCircle/>}
                      label="Note"
                      value={viewItem.actionNote}/>
                  )}
                </ViewSection>
              )}
            </div>

            {/* footer */}
            <div className="flex justify-between items-center
              px-6 py-4 border-t border-[rgb(var(--border))]
              shrink-0">
              {viewItem.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowView(false);
                      openAction(viewItem, "approved");
                    }}
                    className="flex items-center gap-1.5
                      px-3 py-2 bg-green-50 text-green-600
                      rounded-lg text-sm font-medium
                      hover:opacity-80 transition">
                    <FaCheckCircle size={12}/> Approve
                  </button>
                  <button
                    onClick={() => {
                      setShowView(false);
                      openAction(viewItem, "rejected");
                    }}
                    className="flex items-center gap-1.5
                      px-3 py-2 bg-red-50 text-red-500
                      rounded-lg text-sm font-medium
                      hover:opacity-80 transition">
                    <FaTimesCircle size={12}/> Reject
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowView(false)}
                className="ml-auto px-4 py-2
                  border border-[rgb(var(--border))]
                  rounded-lg text-sm
                  hover:bg-[rgba(var(--primary),0.06)]
                  transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ACTION MODAL — approve / reject
      ══════════════════════════════════════════════ */}
      {showAction && actionItem && (
        <div className="fixed inset-0 bg-black/50
          flex items-center justify-center z-[60] p-4">
          <div className="bg-[rgb(var(--surface))]
            text-[rgb(var(--text))] rounded-2xl
            shadow-2xl w-full max-w-sm">

            {/* header */}
            <div className="flex items-center justify-between
              px-6 py-4 border-b border-[rgb(var(--border))]">
              <h2 className="text-base font-semibold">
                {actionType === "approved"
                  ? "Approve Gate Pass"
                  : "Reject Gate Pass"}
              </h2>
              <button
                onClick={() => setShowAction(false)}
                className="text-[rgb(var(--text-muted))]
                  hover:text-red-400 transition">
                <FaTimes size={16}/>
              </button>
            </div>

            {/* body */}
            <div className="px-6 py-5">

              {/* student info */}
              <div className="p-3 rounded-xl mb-4
                bg-[rgba(var(--primary),0.06)]
                border border-[rgb(var(--border))]">
                <p className="text-xs text-[rgb(var(--text-muted))]
                  mb-0.5">Student</p>
                <p className="text-sm font-semibold
                  text-[rgb(var(--text))]">
                  {actionItem.studentId?.firstName}{" "}
                  {actionItem.studentId?.lastName}
                </p>
                <p className="text-xs text-[rgb(var(--text-muted))]">
                  Exit: {new Date(actionItem.exitDate)
                    .toLocaleDateString()} at {actionItem.exitTime}
                </p>
              </div>

              {/* note */}
              <div>
                <label className="text-xs font-medium
                  text-[rgb(var(--text-muted))] mb-1 block">
                  {actionType === "rejected"
                    ? <>Reason for Rejection <span className="text-red-500">*</span></>
                    : "Note (optional)"}
                </label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  rows={3}
                  placeholder={
                    actionType === "rejected"
                      ? "Explain why this request is rejected..."
                      : "Any note for the parent... (optional)"
                  }
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
            <div className="flex justify-end gap-3
              px-6 py-4 border-t border-[rgb(var(--border))]">
              <button
                onClick={() => setShowAction(false)}
                className="px-4 py-2
                  border border-[rgb(var(--border))]
                  rounded-lg text-sm
                  hover:bg-[rgba(var(--primary),0.06)]
                  transition">
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actioning}
                className={`px-5 py-2 text-white rounded-lg
                  text-sm font-medium shadow-sm
                  hover:opacity-90 transition
                  disabled:opacity-50
                  ${actionType === "approved"
                    ? "bg-green-500"
                    : "bg-red-500"}`}>
                {actioning
                  ? "Processing..."
                  : actionType === "approved"
                    ? "Confirm Approve"
                    : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

/* ── REUSABLE MINI COMPONENTS ───────────────────── */
const ViewSection = ({ title, children, color }) => (
  <div className={`p-3 rounded-xl border
    ${color === "green"
      ? "bg-green-50 border-green-100"
      : color === "red"
        ? "bg-red-50 border-red-100"
        : "bg-[rgba(var(--primary),0.04)] border-[rgb(var(--border))]"
    }`}>
    <p className={`text-xs font-semibold mb-2
      ${color === "green"
        ? "text-green-600"
        : color === "red"
          ? "text-red-500"
          : "text-[rgb(var(--text-muted))]"
      }`}>
      {title}
    </p>
    {children}
  </div>
);

const ViewRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-2 mb-1.5 last:mb-0">
    <span className="text-[rgb(var(--primary))]
      mt-0.5 shrink-0 text-xs">
      {icon}
    </span>
    <div className="flex gap-1 text-xs">
      <span className="text-[rgb(var(--text-muted))] shrink-0">
        {label}:
      </span>
      <span className="text-[rgb(var(--text))] font-medium">
        {value || "—"}
      </span>
    </div>
  </div>
);

export default TeacherGatepass;