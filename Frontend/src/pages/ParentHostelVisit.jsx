import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCheck, FaHotel, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

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

export default function ParentHostelVisit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;

  const [visitorName, setVisitorName] = useState("");
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const [pendingAuth, setPendingAuth] = useState([]);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [actionId, setActionId] = useState("");
  const [rejectId, setRejectId] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const loadPendingAuth = useCallback(async () => {
    try {
      setLoadingAuth(true);
      const { data } = await axios.get(
        `${API}/hostel/visitors/parent-pending-auth`,
        { withCredentials: true },
      );
      setPendingAuth(data.data || []);
    } catch {
      setPendingAuth([]);
    } finally {
      setLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    loadPendingAuth();
  }, [loadPendingAuth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!visitorName.trim()) return toast.error("Visitor name is required");
    if (!visitDate) return toast.error("Visit date is required");

    try {
      setSaving(true);
      await axios.post(
        `${API}/hostel/visitors/parent-request`,
        {
          visitorName: visitorName.trim(),
          phone: phone.trim(),
          purpose: purpose.trim(),
          visitDate,
        },
        { withCredentials: true },
      );
      const msg =
        "Your visit request was sent to the hostel warden for approval.";
      toast.success(msg);
      setSubmitMessage(msg);
      setVisitorName("");
      setPhone("");
      setPurpose("");
      setVisitDate("");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to submit visit request",
      );
    } finally {
      setSaving(false);
    }
  };

  const authorizeVisitor = async (id) => {
    try {
      setActionId(id);
      const { data } = await axios.post(
        `${API}/hostel/visitors/${id}/parent-authorize`,
        {},
        { withCredentials: true },
      );
      toast.success(data.message || "Authorized — sent to warden");
      loadPendingAuth();
    } catch (err) {
      toast.error(err.response?.data?.message || "Authorization failed");
    } finally {
      setActionId("");
    }
  };

  const rejectVisitor = async () => {
    if (!rejectId) return;
    try {
      setActionId(rejectId);
      const { data } = await axios.post(
        `${API}/hostel/visitors/${rejectId}/parent-reject`,
        { reason: rejectReason.trim() || "Parent did not authorize" },
        { withCredentials: true },
      );
      toast.success(data.message || "Visitor rejected");
      setRejectId("");
      setRejectReason("");
      loadPendingAuth();
    } catch (err) {
      toast.error(err.response?.data?.message || "Rejection failed");
    } finally {
      setActionId("");
    }
  };

  return (
    <div
      className="min-h-screen p-4 md:p-6"
      style={{ background: "rgb(var(--bg))" }}
    >
      <div className="max-w-lg mx-auto space-y-5">
        <button
          onClick={() => navigate("/parent/menu")}
          className="flex items-center gap-2 text-sm text-[rgb(var(--text-muted))] mb-1"
        >
          <FaArrowLeft /> Back to Menu
        </button>

        <div className="bg-[rgb(var(--surface))] rounded-xl shadow p-5 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
              <FaHotel className="text-sky-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[rgb(var(--text))]">
                Authorize visitors
              </h2>
              <p className="text-sm text-[rgb(var(--text-muted))]">
                New / unregistered visitors need your OK before warden approval
              </p>
            </div>
          </div>

          {loadingAuth ? (
            <p className="text-sm text-[rgb(var(--text-muted))]">Loading…</p>
          ) : pendingAuth.length === 0 ? (
            <p className="text-sm text-[rgb(var(--text-muted))] rounded-xl border border-dashed px-3 py-4 text-center">
              No visitor requests waiting for your authorization.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingAuth.map((v) => (
                <div
                  key={v._id}
                  className="rounded-xl border border-[rgb(var(--border))] p-3"
                >
                  <div className="flex gap-3">
                    {v.photo?.url ? (
                      <img
                        src={v.photo.url}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover border"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center font-bold">
                        {(v.visitorName || "?").charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[rgb(var(--text))]">
                        {v.visitorName}
                      </p>
                      <p className="text-xs text-[rgb(var(--text-muted))]">
                        {v.phone || "No phone"} · {v.hostelId?.name || "Hostel"}
                      </p>
                      <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
                        {v.purpose || "Visit request"} · {fmtDateTime(v.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={actionId === v._id}
                      onClick={() => authorizeVisitor(v._id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      <FaCheck size={12} /> Authorize
                    </button>
                    <button
                      type="button"
                      disabled={actionId === v._id}
                      onClick={() => {
                        setRejectId(v._id);
                        setRejectReason("");
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      <FaTimes size={12} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[rgb(var(--surface))] rounded-xl shadow p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <FaHotel className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[rgb(var(--text))]">
                Request your visit
              </h1>
              <p className="text-sm text-[rgb(var(--text-muted))]">
                Parent visits go straight to the warden for approval
                {user?.name ? ` · ${user.name}` : ""}
              </p>
            </div>
          </div>

          {submitMessage && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              {submitMessage}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">
                Visitor Name *
              </label>
              <input
                type="text"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="Your full name"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contact number"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">
                Purpose
              </label>
              <textarea
                rows={3}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Reason for visit"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))] text-[rgb(var(--text))] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">
                Visit Date *
              </label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-[rgb(var(--surface))] text-[rgb(var(--text))]"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-lg font-semibold text-sm bg-indigo-600 text-white disabled:opacity-60"
              style={isMobile ? { minHeight: 44 } : undefined}
            >
              {saving ? "Submitting…" : "Submit to warden"}
            </button>
          </form>
        </div>
      </div>

      {rejectId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[rgb(var(--surface))] rounded-2xl w-full max-w-sm p-5 shadow-xl">
            <h3 className="font-bold text-lg mb-2">Reject visitor?</h3>
            <p className="text-sm text-[rgb(var(--text-muted))] mb-3">
              This request will be rejected immediately. It will not go to the
              warden.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Reason (optional)"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectId("");
                  setRejectReason("");
                }}
                className="flex-1 py-2 rounded-lg border text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={rejectVisitor}
                disabled={!!actionId}
                className="flex-1 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
