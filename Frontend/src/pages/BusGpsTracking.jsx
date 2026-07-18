import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaArrowLeft,
  FaBus,
  FaMapMarkerAlt,
  FaSync,
  FaBell,
  FaSchool,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const TRIP_STEPS = [
  {
    key: "pickup",
    event: "pickup",
    label: "1. Pickup",
    doneKey: "pickup",
    hint: "Bus started morning pickup",
  },
  {
    key: "arriveSchool",
    event: "arrive_school",
    label: "2. At school",
    doneKey: "arriveSchool",
    hint: "Arrived at school campus",
  },
  {
    key: "departSchool",
    event: "depart_school",
    label: "3. Leave school",
    doneKey: "departSchool",
    hint: "Departed school for drop-off",
  },
  {
    key: "arriveHome",
    event: "arrive_home",
    label: "4. At home",
    doneKey: "arriveHome",
    hint: "Drop-off / home arrival",
  },
];

const BusGpsTracking = () => {
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;
  const [buses, setBuses] = useState([]);
  const [summary, setSummary] = useState({ total: 0, gpsEnabled: 0, live: 0 });
  const [schoolLocation, setSchoolLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});
  const [locForm, setLocForm] = useState({
    latitude: "",
    longitude: "",
    geofenceRadiusM: "250",
  });
  const [savingLoc, setSavingLoc] = useState(false);

  const fetchGps = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/transport/buses/gps`, {
        withCredentials: true,
      });
      setBuses(res.data.data || []);
      setSummary(res.data.summary || { total: 0, gpsEnabled: 0, live: 0 });
      const loc = res.data.schoolLocation;
      if (loc) {
        setSchoolLocation(loc);
        setLocForm({
          latitude: loc.latitude ?? "",
          longitude: loc.longitude ?? "",
          geofenceRadiusM: loc.geofenceRadiusM ?? 250,
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load GPS fleet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGps();
    const id = setInterval(() => {
      if (!document.hidden) fetchGps();
    }, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapsUrl = (lat, lng) =>
    `https://www.google.com/maps?q=${lat},${lng}`;

  const sendTripEvent = async (busId, event) => {
    const key = `${busId}:${event}`;
    try {
      setSending((s) => ({ ...s, [key]: true }));
      const { data } = await axios.post(
        `${API}/transport/buses/${busId}/trip-event`,
        { event },
        { withCredentials: true },
      );
      if (data.success) {
        toast.success(
          data.message ||
            `Notified ${data.notifiedCount || 0} parent(s)`,
        );
      } else {
        toast.info(data.message || "Already sent today");
      }
      await fetchGps();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to send trip notification",
      );
    } finally {
      setSending((s) => ({ ...s, [key]: false }));
    }
  };

  const saveSchoolLocation = async () => {
    try {
      setSavingLoc(true);
      const { data } = await axios.put(
        `${API}/transport/school-location`,
        {
          latitude: locForm.latitude,
          longitude: locForm.longitude,
          geofenceRadiusM: locForm.geofenceRadiusM,
        },
        { withCredentials: true },
      );
      toast.success(data.message || "School location saved");
      setSchoolLocation(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save location");
    } finally {
      setSavingLoc(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        toast.success("Coordinates filled from your device");
      },
      () => toast.error("Could not read your location"),
    );
  };

  if (loading && buses.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading GPS tracking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-[rgb(var(--text))] min-h-screen">
      {isMobile && (
        <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white shadow-sm border border-slate-100 text-sm font-bold text-slate-600 active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Bus GPS Tracking</h1>
          <p className="text-sm sm:text-base text-[rgb(var(--text-light))]">
            Live location + daily parent trip alerts (pickup → school → home)
          </p>
        </div>
        <button
          onClick={fetchGps}
          className="text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-4 py-2 rounded-lg flex items-center gap-2 shadow transition"
        >
          <FaSync />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="TOTAL BUSES" value={summary.total} />
        <StatCard title="GPS ENABLED" value={summary.gpsEnabled} />
        <StatCard title="LIVE LOCATION" value={summary.live} />
      </div>

      {/* School geofence */}
      <div className="bg-[rgb(var(--surface))] rounded-xl shadow p-4 sm:p-5 mb-6 border border-slate-100">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
            <FaSchool />
          </div>
          <div>
            <h2 className="font-bold text-base">School campus location</h2>
            <p className="text-xs text-[rgb(var(--text-light))] mt-0.5">
              Set this so GPS can auto-notify parents when the bus arrives at /
              leaves school (steps 2 &amp; 3). Steps 1 &amp; 4 are sent with the
              buttons below.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="number"
            step="any"
            placeholder="Latitude"
            value={locForm.latitude}
            onChange={(e) =>
              setLocForm((f) => ({ ...f, latitude: e.target.value }))
            }
            className="px-3 py-2 rounded-lg border text-sm bg-[rgb(var(--bg))]"
          />
          <input
            type="number"
            step="any"
            placeholder="Longitude"
            value={locForm.longitude}
            onChange={(e) =>
              setLocForm((f) => ({ ...f, longitude: e.target.value }))
            }
            className="px-3 py-2 rounded-lg border text-sm bg-[rgb(var(--bg))]"
          />
          <input
            type="number"
            placeholder="Radius (meters)"
            value={locForm.geofenceRadiusM}
            onChange={(e) =>
              setLocForm((f) => ({ ...f, geofenceRadiusM: e.target.value }))
            }
            className="px-3 py-2 rounded-lg border text-sm bg-[rgb(var(--bg))]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={useMyLocation}
              className="flex-1 px-3 py-2 rounded-lg border text-xs font-bold"
            >
              Use my GPS
            </button>
            <button
              type="button"
              disabled={savingLoc}
              onClick={saveSchoolLocation}
              className="flex-1 px-3 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold disabled:opacity-50"
            >
              {savingLoc ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        {schoolLocation?.latitude != null && (
          <p className="text-xs text-emerald-700 mt-2">
            Campus set at {Number(schoolLocation.latitude).toFixed(5)},{" "}
            {Number(schoolLocation.longitude).toFixed(5)} · radius{" "}
            {schoolLocation.geofenceRadiusM || 250}m
          </p>
        )}
      </div>

      <div className="space-y-4">
        {buses.map((bus) => {
          const hasFix =
            bus.gpsEnabled &&
            bus.lastLatitude != null &&
            bus.lastLongitude != null;
          const trip = bus.trip || {};
          return (
            <div
              key={bus._id}
              className="bg-[rgb(var(--surface))] rounded-xl shadow border border-slate-100 p-4 sm:p-5"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4 justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                    <FaBus />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[rgb(var(--primary))]">
                      {bus.busId}{" "}
                      <span className="font-normal text-xs text-[rgb(var(--text-light))]">
                        {bus.regNo}
                      </span>
                    </p>
                    <p className="text-sm">
                      {bus.driver?.name || "Unassigned"} ·{" "}
                      {bus.route?.name || "No route"}
                    </p>
                    <p className="text-xs text-[rgb(var(--text-light))] mt-1">
                      {hasFix
                        ? `${Number(bus.lastLatitude).toFixed(5)}, ${Number(
                            bus.lastLongitude,
                          ).toFixed(5)}`
                        : "No live GPS fix"}
                      {bus.lastGpsAt
                        ? ` · ${new Date(bus.lastGpsAt).toLocaleString()}`
                        : ""}
                      {bus.gpsSpeedKmh != null
                        ? ` · ${bus.gpsSpeedKmh} km/h`
                        : ""}
                    </p>
                  </div>
                </div>
                {hasFix && (
                  <a
                    href={mapsUrl(bus.lastLatitude, bus.lastLongitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium self-start"
                  >
                    <FaMapMarkerAlt /> Open map
                  </a>
                )}
              </div>

              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[rgb(var(--text-light))] mb-2 flex items-center gap-1">
                  <FaBell /> Parent trip alerts (today)
                </p>
                {!bus.route && (
                  <p className="text-xs text-amber-700 mb-2">
                    Assign a route to this bus so parents of students on that
                    route get notified.
                  </p>
                )}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {TRIP_STEPS.map((step) => {
                    const done = !!trip[step.doneKey];
                    const busy = !!sending[`${bus._id}:${step.event}`];
                    return (
                      <button
                        key={step.key}
                        type="button"
                        disabled={done || busy || !bus.route}
                        title={step.hint}
                        onClick={() => sendTripEvent(bus._id, step.event)}
                        className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                          done
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-[rgb(var(--bg))] border-slate-200 hover:border-blue-300"
                        } disabled:opacity-60`}
                      >
                        <p className="font-bold">{step.label}</p>
                        <p className="mt-0.5 opacity-70">
                          {done ? "Sent ✓" : busy ? "Sending…" : "Notify parents"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {buses.length === 0 && (
          <div className="text-center py-16 text-[rgb(var(--text-light))] bg-[rgb(var(--surface))] rounded-xl">
            No buses found. Register buses and enable GPS tracking.
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value }) => (
  <div className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-xl shadow p-5 border-l-4 border-l-blue-500">
    <p className="text-xs sm:text-sm font-medium">{title}</p>
    <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
  </div>
);

export default BusGpsTracking;
