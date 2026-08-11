import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaHotel } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

export default function ParentHostelVisit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;

  const [visitorName, setVisitorName] = useState("");
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [saving, setSaving] = useState(false);

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
      toast.success("Visit request submitted. The warden will review it.");
      setVisitorName("");
      setPhone("");
      setPurpose("");
      setVisitDate("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit visit request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: "rgb(var(--bg))" }}>
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => navigate("/parent/menu")}
          className="flex items-center gap-2 text-sm text-[rgb(var(--text-muted))] mb-4"
        >
          <FaArrowLeft /> Back to Menu
        </button>

        <div className="bg-[rgb(var(--surface))] rounded-xl shadow p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <FaHotel className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[rgb(var(--text))]">Hostel Visit Request</h1>
              <p className="text-sm text-[rgb(var(--text-muted))]">
                Request a visit for {user?.name || "your child"}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] uppercase mb-1">
                Visitor Name *
              </label>
              <input
                type="text"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="Full name of visitor"
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
              {saving ? "Submitting…" : "Submit Request"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
