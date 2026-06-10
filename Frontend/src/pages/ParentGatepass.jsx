import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  FaPlus, FaTimes, FaSearch, FaFilter,
  FaCheckCircle, FaTimesCircle, FaClock,
  FaBan, FaEye, FaArrowLeft, FaCamera,
  FaCalendarAlt, FaUser, FaPhone, FaInfoCircle,
} from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

/* ── STATUS CONFIG ───────────────────────────────── */
const STATUS = {
  pending:   { label: "Pending",   color: "bg-yellow-100 text-yellow-600", icon: <FaClock size={11}/>   },
  approved:  { label: "Approved",  color: "bg-green-100 text-green-600",   icon: <FaCheckCircle size={11}/> },
  rejected:  { label: "Rejected",  color: "bg-red-100 text-red-500",       icon: <FaTimesCircle size={11}/> },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500",     icon: <FaBan size={11}/>     },
};

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
const ParentGatepass = () => {
  const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;

  /* ── STATE ──────────────────────────────────────── */
  const [gatepasses, setGatepasses]       = useState([]);
  const [student, setStudent]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);

  const [showForm, setShowForm]           = useState(false);
  const [showView, setShowView]           = useState(false);
  const [viewItem, setViewItem]           = useState(null);

  // filters
  const [filterStatus, setFilterStatus]   = useState("all");
  const [filterDate, setFilterDate]       = useState("");

  // form
  const [pickupRelation, setPickupRelation] = useState("");
  const [pickupName, setPickupName]         = useState("");
  const [pickupCustomRelation, setPickupCustomRelation] = useState("");
  const [pickupMobile, setPickupMobile]     = useState("");
  const [exitDate, setExitDate]             = useState("");
  const [exitTime, setExitTime]             = useState("");
  const [expectedReturn, setExpectedReturn] = useState("");
  const [reason, setReason]                 = useState("");
  const [photoFile, setPhotoFile]           = useState(null);
  const [photoPreview, setPhotoPreview]     = useState(null);

  // confirm cancel
  const [confirmModal, setConfirmModal]   = useState(false);
  const [cancelId, setCancelId]           = useState(null);

  /* ── FETCH STUDENT ──────────────────────────────── */
  const fetchStudent = async () => {
    try {
      const res = await axios.get(
        `${API}/students/${user.student_id}`,
        { withCredentials: true }
      );
      setStudent(res.data.data);
    } catch {
      toast.error("Failed to load student details");
    }
  };

  /* ── FETCH GATEPASSES ───────────────────────────── */
  const fetchGatepasses = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterDate)             params.date   = filterDate;

      const res = await axios.get(`${API}/gatepass/my`, {
        params,
        withCredentials: true,
      });
      setGatepasses(res.data.data);
    } catch {
      toast.error("Failed to load gate passes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, []);

  useEffect(() => {
    fetchGatepasses();
  }, [filterStatus, filterDate]);

  /* ── PICKUP PERSON OPTIONS ──────────────────────── */
  // built from student data
  const pickupOptions = [];
  if (student?.fatherName)   pickupOptions.push({ label: `Father — ${student.fatherName}`,     value: "Father",   name: student.fatherName   });
  if (student?.motherName)   pickupOptions.push({ label: `Mother — ${student.motherName}`,     value: "Mother",   name: student.motherName   });
  if (student?.guardianName) pickupOptions.push({ label: `Guardian — ${student.guardianName}`, value: "Guardian", name: student.guardianName });
  pickupOptions.push({ label: "Other", value: "Other", name: "" });

  /* ── HANDLE RELATION SELECT ─────────────────────── */
  const handleRelationChange = (val) => {
    setPickupRelation(val);
    // prefill name from student data
    const opt = pickupOptions.find((o) => o.value === val);
    if (opt && val !== "Other") {
      setPickupName(opt.name);
    } else {
      setPickupName("");
    }
    setPickupCustomRelation("");
    setPickupMobile("");
  };

  /* ── PHOTO ──────────────────────────────────────── */
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.type))
      return toast.error("Only jpg, jpeg, png, webp allowed");
    if (file.size > 2 * 1024 * 1024)
      return toast.error("Photo must be under 2MB");
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  /* ── RESET FORM ─────────────────────────────────── */
  const resetForm = () => {
    setPickupRelation("");
    setPickupName("");
    setPickupCustomRelation("");
    setPickupMobile("");
    setExitDate("");
    setExitTime("");
    setExpectedReturn("");
    setReason("");
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  /* ── VALIDATE ───────────────────────────────────── */
  const validate = () => {
    if (!pickupRelation)          return "Select pickup person relation";
    if (!pickupName.trim())       return "Pickup person name is required";
    if (pickupRelation === "Other" && !pickupCustomRelation.trim())
                                  return "Please specify the relation";
    if (!pickupMobile.trim())     return "Mobile number is required";
    if (!/^\d{10,15}$/.test(pickupMobile.replace(/\s/g, "")))
                                  return "Enter a valid mobile number";
    if (!exitDate)                return "Exit date is required";
    if (!exitTime)                return "Exit time is required";
    if (!reason.trim())           return "Reason is required";
    return null;
  };

  /* ── SUBMIT ─────────────────────────────────────── */
  const handleSubmit = async () => {
    const error = validate();
    if (error) return toast.error(error);

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("pickupName",           pickupName);
      fd.append("pickupRelation",       pickupRelation);
      fd.append("pickupMobile",         pickupMobile);
      fd.append("exitDate",             exitDate);
      fd.append("exitTime",             exitTime);
      if (pickupRelation === "Other")
        fd.append("pickupCustomRelation", pickupCustomRelation);
      if (expectedReturn)
        fd.append("expectedReturn",     expectedReturn);
      fd.append("reason",               reason);
      if (photoFile)
        fd.append("photo",              photoFile);

      await axios.post(`${API}/gatepass`, fd, {
        headers:         { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      toast.success("Gate pass request submitted successfully");
      setShowForm(false);
      resetForm();
      fetchGatepasses();
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
        `${API}/gatepass/${cancelId}/cancel`,
        {},
        { withCredentials: true }
      );
      toast.success("Gate pass cancelled");
      setConfirmModal(false);
      setCancelId(null);
      fetchGatepasses();
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
            Gate Pass
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
          <FaPlus size={12}/> Request Gate Pass
        </button>
      </div>

      {/* ── FILTERS ───────────────────────────────── */}
      <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))]
        rounded-2xl p-4 mb-5 flex flex-col sm:flex-row gap-3">

        {/* status tabs */}
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

        {/* date filter */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <FaCalendarAlt
            className="text-[rgb(var(--text-muted))]" size={13}/>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg
              border border-[rgb(var(--border))]
              bg-[rgb(var(--bg))] text-[rgb(var(--text))]
              focus:outline-none focus:ring-2
              focus:ring-[rgb(var(--primary))] transition"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate("")}
              className="text-xs text-red-400 hover:text-red-600">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── LIST ──────────────────────────────────── */}
      {loading ? (
        <p className="text-center py-12 text-[rgb(var(--text-muted))]">
          Loading gate passes...
        </p>
      ) : gatepasses.length === 0 ? (
        <div className="text-center py-16">
          <FaInfoCircle size={32}
            className="text-[rgb(var(--text-muted))] mx-auto mb-3"/>
          <p className="text-[rgb(var(--text-muted))] text-sm">
            No gate passes found.
          </p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="mt-4 text-sm text-[rgb(var(--primary))]
              hover:underline font-medium">
            Request your first gate pass
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {gatepasses.map((g) => (
            <div key={g._id}
              className="bg-[rgb(var(--surface))]
                border border-[rgb(var(--border))] rounded-2xl p-4
                hover:shadow-sm transition">

              {/* top row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={g.status}/>
                    <span className="text-xs text-[rgb(var(--text-muted))]">
                      #{g._id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm font-semibold
                    text-[rgb(var(--text))] mt-1.5">
                    {g.pickupPerson.name}
                    <span className="font-normal
                      text-[rgb(var(--text-muted))] ml-1">
                      ({g.pickupPerson.relation === "Other"
                        ? g.pickupPerson.customRelation
                        : g.pickupPerson.relation})
                    </span>
                  </p>
                  <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
                    {g.pickupPerson.mobile}
                  </p>
                </div>

                {/* actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setViewItem(g); setShowView(true); }}
                    className="p-1.5 rounded-lg
                      bg-[rgba(var(--primary),0.1)]
                      text-[rgb(var(--primary))]
                      hover:opacity-80 transition"
                    title="View details">
                    <FaEye size={13}/>
                  </button>
                  {g.status === "pending" && (
                    <button
                      onClick={() => {
                        setCancelId(g._id);
                        setConfirmModal(true);
                      }}
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
                  {new Date(g.exitDate).toLocaleDateString()} at {g.exitTime}
                </span>
                {g.expectedReturn && (
                  <span className="flex items-center gap-1.5">
                    <FaClock size={11}/>
                    Return by {g.expectedReturn}
                  </span>
                )}
                <span className="flex items-center gap-1.5 flex-1 min-w-0">
                  <FaInfoCircle size={11} className="shrink-0"/>
                  <span className="truncate">{g.reason}</span>
                </span>
              </div>

              {/* action note — if rejected */}
              {g.status === "rejected" && g.actionNote && (
                <div className="mt-2 px-3 py-2 rounded-lg
                  bg-red-50 border border-red-100">
                  <p className="text-xs text-red-600">
                    <span className="font-medium">Rejected by {g.actionByName}:</span>
                    {" "}{g.actionNote}
                  </p>
                </div>
              )}

              {/* approved by */}
              {g.status === "approved" && g.actionByName && (
                <div className="mt-2 px-3 py-2 rounded-lg
                  bg-green-50 border border-green-100">
                  <p className="text-xs text-green-600">
                    <span className="font-medium">
                      Approved by {g.actionByName}
                    </span>
                    {g.actionAt && ` on ${new Date(g.actionAt).toLocaleDateString()}`}
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
                  Request Gate Pass
                </h2>
                <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
                  Fill details for gate pass request
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

              {/* ── PICKUP PERSON ── */}
              <div>
                <p className="text-sm font-semibold mb-3">
                  Pickup Person Details
                </p>
                <div className="space-y-3">

                  {/* relation dropdown */}
                  <div>
                    <label className="text-xs font-medium
                      text-[rgb(var(--text-muted))] mb-1 block">
                      Who is picking up?
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={pickupRelation}
                      onChange={(e) => handleRelationChange(e.target.value)}
                      className="w-full border border-[rgb(var(--border))]
                        rounded-lg px-3 py-2 text-sm
                        bg-[rgb(var(--bg))] text-[rgb(var(--text))]
                        focus:outline-none focus:ring-2
                        focus:ring-[rgb(var(--primary))] transition"
                    >
                      <option value="">Select relation</option>
                      {pickupOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* custom relation — if Other */}
                  {pickupRelation === "Other" && (
                    <FInput
                      label="Specify Relation"
                      value={pickupCustomRelation}
                      onChange={(e) => setPickupCustomRelation(e.target.value)}
                      placeholder="e.g. Uncle, Elder Brother"
                      required
                    />
                  )}

                  {/* name */}
                  {pickupRelation && (
                    <FInput
                      label="Full Name"
                      value={pickupName}
                      onChange={(e) => setPickupName(e.target.value)}
                      placeholder="Pickup person full name"
                      required
                    />
                  )}

                  {/* mobile — always manual */}
                  {pickupRelation && (
                    <FInput
                      label="Mobile Number"
                      value={pickupMobile}
                      onChange={(e) => setPickupMobile(e.target.value)}
                      placeholder="Enter mobile number"
                      required
                      type="tel"
                    />
                  )}
                </div>
              </div>

              {/* ── EXIT DETAILS ── */}
              <div>
                <p className="text-sm font-semibold mb-3">Exit Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <FInput
                    label="Exit Date"
                    type="date"
                    value={exitDate}
                    onChange={(e) => setExitDate(e.target.value)}
                    required
                  />
                  <FInput
                    label="Exit Time"
                    type="time"
                    value={exitTime}
                    onChange={(e) => setExitTime(e.target.value)}
                    required
                  />
                  <div className="col-span-2">
                    <FInput
                      label="Expected Return Time (optional)"
                      type="time"
                      value={expectedReturn}
                      onChange={(e) => setExpectedReturn(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* ── REASON ── */}
              <div>
                <label className="text-xs font-medium
                  text-[rgb(var(--text-muted))] mb-1 block">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Reason for early leaving..."
                  className="w-full border border-[rgb(var(--border))]
                    rounded-lg px-3 py-2 text-sm
                    bg-[rgb(var(--bg))] text-[rgb(var(--text))]
                    focus:outline-none focus:ring-2
                    focus:ring-[rgb(var(--primary))]
                    transition resize-none"
                />
              </div>

              {/* ── PHOTO — optional ── */}
              <div>
                <p className="text-sm font-semibold mb-2">
                  Photo
                  <span className="text-[rgb(var(--text-muted))]
                    font-normal text-xs ml-1">
                    (optional, max 2MB)
                  </span>
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden
                    shrink-0 border-2 border-dashed
                    border-[rgb(var(--border))]
                    bg-[rgba(var(--primary),0.06)]
                    flex items-center justify-center">
                    {photoPreview ? (
                      <img src={photoPreview} alt="preview"
                        className="w-full h-full object-cover"/>
                    ) : (
                      <FaCamera size={18}
                        className="text-[rgb(var(--text-muted))]"/>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handlePhotoChange}
                      className="text-sm text-[rgb(var(--text-muted))]
                        file:mr-3 file:py-1.5 file:px-3
                        file:rounded-lg file:border-0
                        file:text-sm file:font-medium
                        file:bg-[rgb(var(--primary))] file:text-white
                        file:cursor-pointer hover:file:opacity-90"
                    />
                    {photoPreview && (
                      <button type="button"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                        }}
                        className="text-xs text-red-400
                          hover:text-red-600 text-left">
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
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
          VIEW MODAL
      ══════════════════════════════════════════════ */}
      {showView && viewItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center
          justify-center z-50 p-4">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]
            rounded-2xl shadow-2xl w-full max-w-md
            max-h-[92vh] flex flex-col">

            {/* header */}
            <div className="flex items-center justify-between
              px-6 py-4 border-b border-[rgb(var(--border))] shrink-0">
              <h2 className="text-lg font-semibold">Gate Pass Details</h2>
              <button onClick={() => setShowView(false)}
                className="text-[rgb(var(--text-muted))]
                  hover:text-red-400 transition">
                <FaTimes size={18}/>
              </button>
            </div>

            {/* body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

              {/* status */}
              <div className="flex items-center justify-between">
                <StatusBadge status={viewItem.status}/>
                <span className="text-xs text-[rgb(var(--text-muted))]">
                  #{viewItem._id.slice(-6).toUpperCase()}
                </span>
              </div>

              {/* pickup person */}
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
                <ViewRow icon={<FaCalendarAlt/>} label="Exit Date"
                  value={new Date(viewItem.exitDate).toLocaleDateString()}/>
                <ViewRow icon={<FaClock/>} label="Exit Time"
                  value={viewItem.exitTime}/>
                {viewItem.expectedReturn && (
                  <ViewRow icon={<FaClock/>} label="Expected Return"
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
                  <img src={viewItem.photo.url} alt="gatepass"
                    className="w-full rounded-xl object-cover max-h-48"/>
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
                    <ViewRow icon={<FaCalendarAlt/>} label="On"
                      value={new Date(viewItem.actionAt)
                        .toLocaleDateString()}/>
                  )}
                  {viewItem.actionNote && (
                    <ViewRow icon={<FaInfoCircle/>} label="Note"
                      value={viewItem.actionNote}/>
                  )}
                </ViewSection>
              )}

            </div>

            {/* footer */}
            <div className="flex justify-between items-center
              px-6 py-4 border-t border-[rgb(var(--border))] shrink-0">
              {viewItem.status === "pending" && (
                <button
                  onClick={() => {
                    setShowView(false);
                    setCancelId(viewItem._id);
                    setConfirmModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2
                    bg-red-50 text-red-500 rounded-lg text-sm
                    font-medium hover:opacity-80 transition">
                  <FaBan size={12}/> Cancel Request
                </button>
              )}
              <button
                onClick={() => setShowView(false)}
                className="ml-auto px-4 py-2
                  border border-[rgb(var(--border))]
                  rounded-lg text-sm
                  hover:bg-[rgba(var(--primary),0.06)] transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          CONFIRM CANCEL POPUP
      ══════════════════════════════════════════════ */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center
          justify-center z-[60] p-4">
          <div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))]
            rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-base font-semibold mb-1">
              Cancel Gate Pass?
            </p>
            <p className="text-sm text-[rgb(var(--text-muted))] mb-6">
              Are you sure you want to cancel this gate pass request?
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setConfirmModal(false);
                  setCancelId(null);
                }}
                className="px-4 py-2 border border-[rgb(var(--border))]
                  rounded-lg text-sm
                  hover:bg-[rgba(var(--primary),0.06)] transition">
                No, Keep it
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-500 text-white
                  rounded-lg text-sm font-medium
                  hover:opacity-90 transition">
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

/* ── REUSABLE MINI COMPONENTS ───────────────────── */
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
    <span className="text-[rgb(var(--primary))] mt-0.5 shrink-0 text-xs">
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

export default ParentGatepass;