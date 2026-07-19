import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaIdCard,
  FaArrowLeft,
  FaSignOutAlt,
  FaCheck,
  FaTimes,
  FaCamera,
  FaSync,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const ID_PROOF_TYPES = [
  "Aadhaar",
  "PAN",
  "Driving License",
  "Voter ID",
  "Passport",
  "Other",
];

const EMPTY_FORM = {
  hostelId: "",
  visitorName: "",
  phone: "",
  idProofType: "Aadhaar",
  idProofNumber: "",
  purpose: "",
  whomVisiting: "",
  residentId: "",
  notes: "",
};

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const statusStyle = (status) => {
  switch (status) {
    case "Pending":
      return "bg-amber-100 text-amber-800";
    case "CheckedIn":
      return "bg-emerald-100 text-emerald-700";
    case "Rejected":
      return "bg-rose-100 text-rose-700";
    case "CheckedOut":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

const statusLabel = (status) => {
  switch (status) {
    case "Pending":
      return "Pending approval";
    case "CheckedIn":
      return "Entry granted";
    case "Rejected":
      return "Rejected";
    case "CheckedOut":
      return "Checked out";
    default:
      return status || "—";
  }
};

/* ── Live camera capture (security guard) ─────────────────── */
const LivePhotoCapture = ({ photoBlob, setPhotoBlob, existingUrl }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [cameraOn, setCameraOn] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks()?.forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const startCamera = async () => {
    setCameraError("");
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (err) {
      setCameraError(
        err?.message || "Unable to access camera. Allow camera permission.",
      );
      setCameraOn(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!photoBlob) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(photoBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoBlob]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast.error("Camera not ready yet");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Failed to capture photo");
          return;
        }
        setPhotoBlob(blob);
        stopCamera();
      },
      "image/jpeg",
      0.92,
    );
  };

  const retake = async () => {
    setPhotoBlob(null);
    await startCamera();
  };

  return (
    <div className="sm:col-span-2 rounded-xl border border-dashed border-violet-300 bg-violet-50/40 p-3">
      <p className="text-xs font-bold uppercase text-violet-700 mb-2 flex items-center gap-2">
        <FaCamera /> Live visitor photo *
      </p>

      {previewUrl || (!cameraOn && existingUrl) ? (
        <div className="space-y-2">
          <img
            src={previewUrl || existingUrl}
            alt="Visitor"
            className="w-full max-h-64 object-cover rounded-xl border bg-black"
          />
          <button
            type="button"
            onClick={retake}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium bg-white"
          >
            <FaSync size={12} /> Retake photo
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full max-h-64 rounded-xl bg-black object-cover"
          />
          {cameraError ? (
            <p className="text-xs text-rose-600">{cameraError}</p>
          ) : (
            <p className="text-[11px] text-[rgb(var(--text-muted))]">
              Position the visitor in frame, then capture.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={capture}
              disabled={!cameraOn}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium disabled:opacity-50"
            >
              <FaCamera size={12} /> Capture photo
            </button>
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium bg-white"
            >
              Restart camera
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const HostelVisitors = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const basePath = user?.role === "staff_admin" ? "/staff" : "/school";
  const canApprove =
    user?.role === "school_admin" || user?.role === "staff_admin";

  const [hostels, setHostels] = useState([]);
  const [residents, setResidents] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterHostel, setFilterHostel] = useState("");
  const [filterStatus, setFilterStatus] = useState("Pending");

  const [formModal, setFormModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [photoBlob, setPhotoBlob] = useState(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState("");

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [h, r, v] = await Promise.all([
        axios.get(`${API}/hostel`, { withCredentials: true }),
        axios.get(`${API}/hostel/residents`, {
          withCredentials: true,
          params: { status: "Active" },
        }),
        axios.get(`${API}/hostel/visitors`, {
          withCredentials: true,
          params: { status: filterStatus === "" ? "all" : filterStatus },
        }),
      ]);
      setHostels(h.data.data || []);
      setResidents(r.data.data || []);
      setVisitors(v.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load visitors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const residentsForHostel = useMemo(() => {
    if (!form.hostelId) return [];
    return residents.filter(
      (r) => String(r.hostelId?._id || r.hostelId) === String(form.hostelId),
    );
  }, [residents, form.hostelId]);

  const openAdd = () => {
    setIsEdit(false);
    setEditId(null);
    setPhotoBlob(null);
    setExistingPhotoUrl("");
    setForm({
      ...EMPTY_FORM,
      hostelId: filterHostel || hostels[0]?._id || "",
    });
    setFormModal(true);
  };

  const openEdit = (v) => {
    setIsEdit(true);
    setEditId(v._id);
    setPhotoBlob(null);
    setExistingPhotoUrl(v.photo?.url || "");
    setForm({
      hostelId: v.hostelId?._id || "",
      visitorName: v.visitorName || "",
      phone: v.phone || "",
      idProofType: v.idProofType || "Other",
      idProofNumber: v.idProofNumber || "",
      purpose: v.purpose || "",
      whomVisiting: v.whomVisiting || "",
      residentId: v.residentId?._id || "",
      notes: v.notes || "",
    });
    setFormModal(true);
  };

  const handleFormSubmit = async () => {
    if (!form.hostelId) return toast.error("Select a hostel");
    if (!form.visitorName.trim()) return toast.error("Enter visitor name");
    if (!isEdit && !photoBlob) {
      return toast.error("Capture live visitor photo before submitting");
    }
    if (isEdit && !photoBlob && !existingPhotoUrl) {
      return toast.error("Visitor photo is required");
    }

    const fd = new FormData();
    fd.append("hostelId", form.hostelId);
    fd.append("visitorName", form.visitorName.trim());
    fd.append("phone", form.phone.trim());
    fd.append("idProofType", form.idProofType);
    fd.append("idProofNumber", form.idProofNumber.trim());
    fd.append("purpose", form.purpose.trim());
    fd.append("whomVisiting", form.whomVisiting.trim());
    if (form.residentId) fd.append("residentId", form.residentId);
    fd.append("notes", form.notes.trim());
    if (photoBlob) {
      fd.append("photo", photoBlob, `visitor-${Date.now()}.jpg`);
    }

    try {
      setFormLoading(true);
      if (isEdit) {
        await axios.put(`${API}/hostel/visitors/${editId}`, fd, {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Visitor updated");
      } else {
        await axios.post(`${API}/hostel/visitors`, fd, {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Sent to hostel warden for approval");
      }
      setFormModal(false);
      setPhotoBlob(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save visitor");
    } finally {
      setFormLoading(false);
    }
  };

  const handleApprove = async (visitor) => {
    try {
      setActionLoadingId(visitor._id);
      await axios.post(
        `${API}/hostel/visitors/${visitor._id}/approve`,
        {},
        { withCredentials: true },
      );
      toast.success("Entry granted — visitor checked in");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Approval failed");
    } finally {
      setActionLoadingId("");
    }
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      return toast.error("Enter rejection reason");
    }
    try {
      setActionLoadingId(rejectTarget._id);
      await axios.post(
        `${API}/hostel/visitors/${rejectTarget._id}/reject`,
        { reason: rejectReason.trim() },
        { withCredentials: true },
      );
      toast.success("Visitor request rejected");
      setRejectModal(false);
      setRejectTarget(null);
      setRejectReason("");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Rejection failed");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleCheckout = async (visitor) => {
    try {
      await axios.post(
        `${API}/hostel/visitors/${visitor._id}/checkout`,
        {},
        { withCredentials: true },
      );
      toast.success("Visitor checked out");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Checkout failed");
    }
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API}/hostel/visitors/${deleteTarget._id}`, {
        withCredentials: true,
      });
      toast.success("Visitor record deleted");
      setDeleteModal(false);
      setDeleteTarget(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const filtered = visitors.filter((v) => {
    const s = search.toLowerCase();
    const student = v.studentId || v.residentId?.studentId;
    const studentName = `${student?.firstName || ""} ${student?.lastName || ""}`
      .trim()
      .toLowerCase();
    const matchSearch =
      !s ||
      v.visitorName?.toLowerCase().includes(s) ||
      v.phone?.toLowerCase().includes(s) ||
      v.whomVisiting?.toLowerCase().includes(s) ||
      v.purpose?.toLowerCase().includes(s) ||
      v.hostelId?.name?.toLowerCase().includes(s) ||
      studentName.includes(s) ||
      student?.studentId?.toLowerCase().includes(s);
    const matchHostel = filterHostel
      ? String(v.hostelId?._id || v.hostelId) === String(filterHostel)
      : true;
    return matchSearch && matchHostel;
  });

  const pendingCount = visitors.filter((v) => v.status === "Pending").length;
  const checkedInCount = visitors.filter((v) => v.status === "CheckedIn").length;
  const rejectedCount = visitors.filter((v) => v.status === "Rejected").length;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading visitors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-[rgb(var(--text))] min-h-screen">
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(`${basePath}/hostel`)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white shadow-sm border border-slate-100 text-sm font-bold text-slate-600 mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          {!isMobile && (
            <button
              onClick={() => navigate(`${basePath}/hostel`)}
              className="flex items-center gap-2 text-sm text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] mb-2"
            >
              <FaArrowLeft size={12} /> Hostel Management
            </button>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold">Visitor Management</h1>
          <p className="text-sm sm:text-base text-[rgb(var(--text-muted))]">
            Security guard submits visitor + live photo → hostel warden approves entry
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={hostels.length === 0}
          className="text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-4 py-2 rounded-lg flex items-center gap-2 shadow transition disabled:opacity-50"
        >
          <FaPlus />
          New visitor request
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard title="PENDING APPROVAL" value={pendingCount} color="amber" />
        <StatCard title="CHECKED IN" value={checkedInCount} color="green" />
        <StatCard title="REJECTED" value={rejectedCount} color="rose" />
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold">Visitor log</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search visitor, phone, resident..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full sm:w-56 text-sm bg-[rgb(var(--surface))]"
          />
          <select
            value={filterHostel}
            onChange={(e) => setFilterHostel(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
          >
            <option value="">All Hostels</option>
            {hostels.map((h) => (
              <option key={h._id} value={h._id}>
                {h.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))]"
          >
            <option value="Pending">Pending approval</option>
            <option value="CheckedIn">Checked in</option>
            <option value="CheckedOut">Checked out</option>
            <option value="Rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <div className="bg-[rgb(var(--surface))] rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-[rgb(var(--text-muted))]">
              <th className="p-4">Visitor</th>
              <th className="p-4">Hostel / Meeting</th>
              <th className="p-4">Submitted</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => {
              const student = v.studentId || v.residentId?.studentId;
              const meeting =
                v.whomVisiting ||
                (student
                  ? `${student.firstName || ""} ${student.lastName || ""}`.trim()
                  : "—");
              return (
                <tr key={v._id} className="border-t border-slate-100">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {v.photo?.url ? (
                        <img
                          src={v.photo.url}
                          alt={v.visitorName}
                          className="w-11 h-11 rounded-full object-cover border shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold shrink-0">
                          {(v.visitorName || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{v.visitorName}</p>
                        <p className="text-xs text-[rgb(var(--text-muted))]">
                          {v.phone || "No phone"}
                          {v.idProofNumber
                            ? ` · ${v.idProofType}: ${v.idProofNumber}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium">{v.hostelId?.name || "—"}</p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">
                      Visiting: {meeting}
                      {v.residentId?.roomId?.roomNumber
                        ? ` · Room ${v.residentId.roomId.roomNumber}`
                        : ""}
                    </p>
                    {v.purpose && (
                      <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5 truncate max-w-[220px]">
                        {v.purpose}
                      </p>
                    )}
                  </td>
                  <td className="p-4 text-xs">
                    <p>{fmtDateTime(v.createdAt)}</p>
                    {v.submittedBy?.name && (
                      <p className="text-[rgb(var(--text-muted))]">
                        By: {v.submittedBy.name}
                      </p>
                    )}
                    {v.checkInAt && (
                      <p className="text-emerald-700 mt-0.5">
                        In: {fmtDateTime(v.checkInAt)}
                      </p>
                    )}
                    {v.rejectionReason && (
                      <p className="text-rose-600 mt-0.5" title={v.rejectionReason}>
                        {v.rejectionReason}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyle(v.status)}`}
                    >
                      {statusLabel(v.status)}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2 flex-wrap">
                      {v.status === "Pending" && canApprove && (
                        <>
                          <button
                            type="button"
                            disabled={actionLoadingId === v._id}
                            onClick={() => handleApprove(v)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
                            title="Approve entry"
                          >
                            <FaCheck size={11} /> Approve
                          </button>
                          <button
                            type="button"
                            disabled={actionLoadingId === v._id}
                            onClick={() => {
                              setRejectTarget(v);
                              setRejectReason("");
                              setRejectModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold disabled:opacity-50"
                            title="Reject"
                          >
                            <FaTimes size={11} /> Reject
                          </button>
                        </>
                      )}
                      {v.status === "CheckedIn" && (
                        <button
                          type="button"
                          onClick={() => handleCheckout(v)}
                          className="p-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100"
                          title="Check out"
                        >
                          <FaSignOutAlt size={13} />
                        </button>
                      )}
                      {(v.status === "Pending" || v.status === "CheckedIn") && (
                        <button
                          type="button"
                          onClick={() => openEdit(v)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                          title="Edit"
                        >
                          <FaEdit size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(v);
                          setDeleteModal(true);
                        }}
                        className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                        title="Delete"
                      >
                        <FaTrash size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-14 text-[rgb(var(--text-muted))]"
                >
                  No visitors in this view. Security can submit a new visitor request.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form modal — security guard */}
      {formModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--surface))] rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <FaIdCard className="text-violet-600" />
              <div>
                <h3 className="font-bold text-lg">
                  {isEdit ? "Edit visitor request" : "Visitor entry request"}
                </h3>
                <p className="text-xs text-[rgb(var(--text-muted))]">
                  Filled by security guard · sent to hostel warden for approval
                </p>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LivePhotoCapture
                photoBlob={photoBlob}
                setPhotoBlob={setPhotoBlob}
                existingUrl={existingPhotoUrl}
              />

              <label className="sm:col-span-2 text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                Hostel
                <select
                  value={form.hostelId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      hostelId: e.target.value,
                      residentId: "",
                    }))
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                >
                  <option value="">Select hostel</option>
                  {hostels.map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.name} ({h.type})
                      {h.wardenName ? ` · Warden: ${h.wardenName}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sm:col-span-2 text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                Visitor name *
                <input
                  value={form.visitorName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, visitorName: e.target.value }))
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                  placeholder="Full name"
                />
              </label>

              <label className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                Phone
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                  placeholder="10-digit mobile"
                />
              </label>

              <label className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                ID proof type
                <select
                  value={form.idProofType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, idProofType: e.target.value }))
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                >
                  {ID_PROOF_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sm:col-span-2 text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                ID proof number
                <input
                  value={form.idProofNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, idProofNumber: e.target.value }))
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                />
              </label>

              <label className="sm:col-span-2 text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                Visiting resident (optional)
                <select
                  value={form.residentId}
                  onChange={(e) => {
                    const rid = e.target.value;
                    const res = residentsForHostel.find(
                      (r) => String(r._id) === String(rid),
                    );
                    const name = res?.studentId
                      ? `${res.studentId.firstName || ""} ${res.studentId.lastName || ""}`.trim()
                      : "";
                    setForm((f) => ({
                      ...f,
                      residentId: rid,
                      whomVisiting: name || f.whomVisiting,
                    }));
                  }}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                >
                  <option value="">— Select resident —</option>
                  {residentsForHostel.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.studentId?.firstName} {r.studentId?.lastName}
                      {r.roomId?.roomNumber
                        ? ` · Room ${r.roomId.roomNumber}`
                        : ""}
                      {r.bedNumber ? ` · Bed ${r.bedNumber}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sm:col-span-2 text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                Whom visiting
                <input
                  value={form.whomVisiting}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, whomVisiting: e.target.value }))
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                  placeholder="Resident / relative name"
                />
              </label>

              <label className="sm:col-span-2 text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                Purpose
                <input
                  value={form.purpose}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, purpose: e.target.value }))
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                  placeholder="Meeting, delivery, guardian visit…"
                />
              </label>

              <label className="sm:col-span-2 text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                Notes for warden
                <input
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--bg))]"
                />
              </label>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormModal(false);
                  setPhotoBlob(null);
                }}
                className="px-4 py-2 rounded-lg border text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={formLoading}
                onClick={handleFormSubmit}
                className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {formLoading
                  ? "Submitting…"
                  : isEdit
                    ? "Update"
                    : "Submit for approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--surface))] rounded-2xl w-full max-w-sm p-5 shadow-xl">
            <h3 className="font-bold text-lg mb-2">Reject visitor?</h3>
            <p className="text-sm text-[rgb(var(--text-muted))] mb-3">
              {rejectTarget?.visitorName} will not be granted entry.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Reason for rejection *"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4 bg-[rgb(var(--bg))]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModal(false)}
                className="px-4 py-2 rounded-lg border text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReject}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--surface))] rounded-2xl w-full max-w-sm p-5 shadow-xl">
            <h3 className="font-bold text-lg mb-2">Delete visitor record?</h3>
            <p className="text-sm text-[rgb(var(--text-muted))] mb-4">
              This will permanently remove{" "}
              <span className="font-semibold text-[rgb(var(--text))]">
                {deleteTarget?.visitorName}
              </span>
              .
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModal(false)}
                className="px-4 py-2 rounded-lg border text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, color }) => {
  const border = {
    amber: "border-l-amber-500",
    green: "border-l-emerald-500",
    rose: "border-l-rose-500",
    blue: "border-l-blue-500",
    gray: "border-l-slate-400",
  }[color] || "border-l-blue-500";
  return (
    <div
      className={`bg-[rgb(var(--surface))] rounded-xl shadow p-5 border-l-4 ${border}`}
    >
      <p className="text-xs sm:text-sm font-medium text-[rgb(var(--text-muted))]">
        {title}
      </p>
      <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
    </div>
  );
};

export default HostelVisitors;
