import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft, FaMapMarkerAlt, FaSchool, FaStreetView } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const fmtTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

async function getCurrentPosition() {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported on this device.");
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        }),
      (err) =>
        reject(
          new Error(
            err?.message ||
              "Location permission denied. Allow GPS to mark attendance.",
          ),
        ),
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      },
    );
  });
}

export default function StaffSelfAttendance() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;
  const basePath =
    user?.role === "teacher_admin"
      ? "/teacher"
      : user?.role === "staff_admin"
        ? "/staff"
        : "/school";

  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [locationMode, setLocationMode] = useState("InCampus");
  const [note, setNote] = useState("");
  const [campus, setCampus] = useState(null);
  const [record, setRecord] = useState(null);
  const [liveLoc, setLiveLoc] = useState(null);
  const [locError, setLocError] = useState("");

  const loadToday = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/staff-attendance/me/today`, {
        withCredentials: true,
      });
      setCampus(data.data?.campus || null);
      setRecord(data.data?.record || null);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to load attendance status",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  const refreshLocation = async () => {
    try {
      setLocError("");
      const loc = await getCurrentPosition();
      setLiveLoc(loc);
      return loc;
    } catch (err) {
      setLocError(err.message);
      setLiveLoc(null);
      throw err;
    }
  };

  const handlePunch = async () => {
    if (record) {
      toast.info("Attendance already marked for today");
      return;
    }
    try {
      setPunching(true);
      const loc = liveLoc || (await refreshLocation());
      const { data } = await axios.post(
        `${API}/staff-attendance/me/punch`,
        {
          locationMode,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracyM: loc.accuracyM,
          status: "Present",
          note: note.trim(),
        },
        { withCredentials: true },
      );
      toast.success(data.message || "Attendance marked");
      setRecord(data.data);
      setNote("");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to mark attendance";
      toast.error(msg);
      if (err?.response?.data?.data?.distanceFromSchoolM != null) {
        // keep live location so user can retry
      }
    } finally {
      setPunching(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[rgb(var(--text-muted))]">
        Loading attendance…
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 text-[rgb(var(--text))]">
      <div className="max-w-lg mx-auto space-y-4">
        {isMobile && (
          <button
            type="button"
            onClick={() => navigate(`${basePath}/menu`)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-bold bg-[rgb(var(--surface))]"
          >
            <FaArrowLeft size={14} /> Back
          </button>
        )}

        <div>
          <h1 className="text-xl font-bold">Mark My Attendance</h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-1">
            Choose In campus or Out campus, then punch with live GPS.
          </p>
        </div>

        {record ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-800">
              Today&apos;s attendance marked
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              {record.status} · {record.locationMode || "Manual"} ·{" "}
              {fmtTime(record.markedAt || record.createdAt)}
            </p>
            {record.latitude != null && (
              <p className="text-xs text-emerald-700 mt-1 font-mono">
                {Number(record.latitude).toFixed(5)},{" "}
                {Number(record.longitude).toFixed(5)}
                {record.distanceFromSchoolM != null
                  ? ` · ${record.distanceFromSchoolM} m from campus`
                  : ""}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[rgb(var(--bg))] border border-[rgb(var(--border))]">
              <button
                type="button"
                onClick={() => setLocationMode("InCampus")}
                className={`rounded-xl py-3 px-2 text-sm font-bold flex flex-col items-center gap-1 ${
                  locationMode === "InCampus"
                    ? "bg-[rgb(var(--primary))] text-white shadow"
                    : "text-[rgb(var(--text))]"
                }`}
              >
                <FaSchool />
                In campus
              </button>
              <button
                type="button"
                onClick={() => setLocationMode("OutCampus")}
                className={`rounded-xl py-3 px-2 text-sm font-bold flex flex-col items-center gap-1 ${
                  locationMode === "OutCampus"
                    ? "bg-[rgb(var(--primary))] text-white shadow"
                    : "text-[rgb(var(--text))]"
                }`}
              >
                <FaStreetView />
                Out campus
              </button>
            </div>

            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 text-sm">
              {locationMode === "InCampus" ? (
                <p>
                  Attendance will mark only if you are within{" "}
                  <strong>{campus?.geofenceRadiusM || 150} m</strong> of the
                  school campus.
                  {!campus?.configured && (
                    <span className="block mt-2 text-amber-700 text-xs font-semibold">
                      Campus GPS is not set yet — ask school admin to configure
                      school location.
                    </span>
                  )}
                </p>
              ) : (
                <p>
                  You can mark from anywhere. Your current latitude &amp;
                  longitude will be saved with this attendance.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                  Live location
                </p>
                <button
                  type="button"
                  onClick={() =>
                    refreshLocation().catch((e) => toast.error(e.message))
                  }
                  className="text-xs font-semibold text-[rgb(var(--primary))] inline-flex items-center gap-1"
                >
                  <FaMapMarkerAlt /> Refresh GPS
                </button>
              </div>
              {liveLoc ? (
                <p className="text-sm font-mono">
                  {liveLoc.latitude.toFixed(5)}, {liveLoc.longitude.toFixed(5)}
                  {liveLoc.accuracyM != null
                    ? ` ±${Math.round(liveLoc.accuracyM)} m`
                    : ""}
                </p>
              ) : (
                <p className="text-sm text-[rgb(var(--text-muted))]">
                  {locError || "Tap Refresh GPS before punching."}
                </p>
              )}
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[rgb(var(--text-muted))]">
                Note (optional)
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-[rgb(var(--surface))]"
                placeholder={
                  locationMode === "OutCampus"
                    ? "Reason for out-campus punch…"
                    : "Optional note"
                }
              />
            </label>

            <button
              type="button"
              disabled={punching || (locationMode === "InCampus" && !campus?.configured)}
              onClick={handlePunch}
              className="w-full py-3 rounded-2xl bg-[rgb(var(--primary))] text-white font-bold text-sm disabled:opacity-50"
            >
              {punching ? "Marking…" : "Mark Present"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
