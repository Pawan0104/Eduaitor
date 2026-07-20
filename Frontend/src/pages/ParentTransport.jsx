import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import BusLiveMap from "../components/BusLiveMap";

const API = import.meta.env.VITE_API_URL;
const GPS_POLL_MS = 20000;

/* ─── helpers ─── */
const fmt = (v) => (v !== null && v !== undefined && v !== "" ? v : "—");
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";

/* ─── status configs ─── */
const STATUS = {
  route: {
    Active: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    Suspended: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  },
  bus: {
    Active: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    Maintenance: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      dot: "bg-amber-500",
    },
    Inactive: {
      bg: "bg-slate-100",
      text: "text-slate-500",
      dot: "bg-slate-400",
    },
  },
  driver: {
    Active: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    "On Leave": {
      bg: "bg-amber-50",
      text: "text-amber-700",
      dot: "bg-amber-500",
    },
    Inactive: {
      bg: "bg-slate-100",
      text: "text-slate-500",
      dot: "bg-slate-400",
    },
  },
};

/* ─── StatusPill ─── */
const StatusPill = ({ status, type = "route" }) => {
  const cfg = STATUS[type]?.[status] || {
    bg: "bg-slate-100",
    text: "text-slate-500",
    dot: "bg-slate-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status || "Unknown"}
    </span>
  );
};

/* ─── InfoCell ─── */
const InfoCell = ({ label, value, mono = false }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text))]">
      {label}
    </span>
    <span
      className={`text-sm font-semibold text-[rgb(var(--text))] ${mono ? "font-mono" : ""}`}
    >
      {fmt(value)}
    </span>
  </div>
);

/* ─── Card ─── */
const Card = ({ children, className = "" }) => (
  <div
    className={`bg-[rgb(var(--surface))] rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${className}`}
  >
    {children}
  </div>
);

const CardHeader = ({ icon, title, accent }) => (
  <div
    className="flex items-center gap-3 px-5 py-4 border-b border-slate-100"
    style={{ borderLeft: `3px solid ${accent}` }}
  >
    <span className="text-base">{icon}</span>
    <h3 className="text-[11px] font-bold uppercase tracking-widest text-[rgb(var(--text))]">
      {title}
    </h3>
  </div>
);

/* ─── Alert banner ─── */
const AlertBanner = ({ color, icon, title, desc }) => {
  const map = {
    amber: {
      wrap: "bg-amber-50 border-amber-100",
      stroke: "#d97706",
      title: "text-amber-700",
      desc: "text-amber-600",
    },
    rose: {
      wrap: "bg-rose-50  border-rose-100",
      stroke: "#e11d48",
      title: "text-rose-700",
      desc: "text-rose-600",
    },
  };
  const c = map[color];
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl border ${c.wrap}`}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={c.stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        className="shrink-0 mt-0.5"
      >
        {icon}
      </svg>
      <div>
        <p className={`text-xs font-bold ${c.title}`}>{title}</p>
        <p className={`text-xs mt-0.5 leading-relaxed ${c.desc}`}>{desc}</p>
      </div>
    </div>
  );
};

/* ─── Loading skeleton ─── */
const Sk = ({ h, w = "w-full" }) => (
  <div className={`animate-pulse bg-slate-100 rounded-xl ${h} ${w}`} />
);
const LoadingSkeleton = () => (
  <div className="space-y-4 p-4 max-w-lg mx-auto">
    <Sk h="h-36" />
    <div className="grid grid-cols-3 gap-3">
      <Sk h="h-24" />
      <Sk h="h-24" />
      <Sk h="h-24" />
    </div>
    <Sk h="h-44" />
    <Sk h="h-44" />
    <Sk h="h-60" />
  </div>
);

/* ─── Empty state ─── */
const NoTransport = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
    <div className="relative mb-6">
      <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto">
        <svg
          width="44"
          height="44"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 6v6M16 6v6M2 12h19.6" />
          <path d="M18 18h1a1 1 0 0 0 1-1v-3.65a2 2 0 0 0-.134-.713l-1.41-3.526A2 2 0 0 0 16.586 8H4a2 2 0 0 0-1.867 1.299L.732 12.849A2 2 0 0 0 .6 13.565V17a1 1 0 0 0 1 1h1" />
          <circle cx="6.5" cy="18" r="1.5" />
          <circle cx="16.5" cy="18" r="1.5" />
        </svg>
      </div>
      <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-slate-200 scale-110 opacity-40 pointer-events-none" />
    </div>
    <h2 className="text-lg font-bold text-[rgb(var(--text))] mb-2">
      No transport assigned
    </h2>
    <p className="text-sm text-[rgb(var(--text))] leading-relaxed max-w-xs">
      Your child hasn't been assigned to a transport route yet. Contact school
      admin if this seems incorrect.
    </p>
  </div>
);

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
const ParentTransport = () => {
  const [data, setData] = useState(null);
  const [assigned, setAssigned] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshingGps, setRefreshingGps] = useState(false);
  const [showAllStops, setShowAllStops] = useState(false);

  const fetchTransport = async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshingGps(true);
      else setLoading(true);
      const res = await axios.get(`${API}/transport/parent/my-route`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setAssigned(res.data.assigned);
        setData(res.data.data || null);
      } else {
        toast.error("Failed to load transport details");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Error loading transport info",
      );
    } finally {
      setLoading(false);
      setRefreshingGps(false);
    }
  };

  useEffect(() => {
    fetchTransport();
  }, []);

  // Auto-refresh GPS while parent keeps this page open
  useEffect(() => {
    if (!assigned || !data?.bus?.gps?.enabled) return undefined;
    const id = setInterval(() => {
      fetchTransport({ silent: true });
    }, GPS_POLL_MS);
    return () => clearInterval(id);
  }, [assigned, data?.bus?.gps?.enabled]);

  if (loading) return <LoadingSkeleton />;
  if (!assigned || !data) return <NoTransport />;

  const { route, bus, driver, busFeeFrequency, busFeeQuarter } = data;
  const gps = bus?.gps;
  const stops = route.stopsList || [];
  const PREVIEW = 4;
  const hasMore = stops.length > PREVIEW;
  const visible = showAllStops ? stops : stops.slice(0, PREVIEW);

  return (
    <div className="min-h-screen p-8">
      {/* ───── HERO ───── */}
      <div className="bg-[rgb(var(--surface))] rounded-2xl border-b border-slate-100">
        <div className=" mx-auto px-4 pt-5 pb-4">
          {/* Route identity */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl  border border-indigo-100 flex items-center justify-center shrink-0">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 6v6M16 6v6M2 12h19.6" />
                <path d="M18 18h1a1 1 0 0 0 1-1v-3.65a2 2 0 0 0-.134-.713l-1.41-3.526A2 2 0 0 0 16.586 8H4a2 2 0 0 0-1.867 1.299L.732 12.849A2 2 0 0 0 .6 13.565V17a1 1 0 0 0 1 1h1" />
                <circle cx="6.5" cy="18" r="1.5" />
                <circle cx="16.5" cy="18" r="1.5" />
              </svg>
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-[rgb(var(--text))] leading-tight">
                  {route.name}
                </h1>
                <StatusPill status={route.status} type="route" />
              </div>
              <div className="flex flex-wrap gap-2 ">
                {route.routeId && (
                  <span className="text-[11px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {route.routeId}
                  </span>
                )}
                {route.startTime && route.endTime && (
                  <span className="text-[11px] font-bold bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    {route.startTime} – {route.endTime}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              {
                label: "Departure",
                value: route.startTime || "—",
                sub: route.endTime ? `Return ${route.endTime}` : null,
                color: "bg-indigo-50 border-indigo-100",
                svg: (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                ),
              },
              {
                label: "Stops",
                value: route.stops ?? stops.length ?? "—",
                sub: stops.length ? `${stops.length} listed` : null,
                color: "bg-emerald-50 border-emerald-100",
                svg: (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                ),
              },
              {
                label: "Fee cycle",
                value: busFeeFrequency
                  ? busFeeFrequency.charAt(0).toUpperCase() +
                    busFeeFrequency.slice(1)
                  : "—",
                sub: busFeeQuarter || null,
                color: "bg-amber-50 border-amber-100",
                svg: (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 3h12" />
                    <path d="M6 8h12" />
                    <path d="m6 13 8.5 8" />
                    <path d="M6 13h3" />
                    <path d="M9 13c6.667 0 6.667-10 0-10" />
                  </svg>
                ),
              },
            ].map((s, i) => (
              <div
                key={i}
                className={`rounded-2xl border p-2.5 flex flex-col items-center text-center gap-1 `}
              >
                <div className="w-7 h-7 rounded-lg  border border-white/80 flex items-center justify-center">
                  {s.svg}
                </div>
                <p className="text-base font-bold  leading-none mt-0.5">
                  {s.value}
                </p>
                {s.sub && (
                  <p className="text-xs  leading-tight">
                    {s.sub}
                  </p>
                )}
                <p className="text-xs font-bold uppercase tracking-widest  mt-0.5">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ───── CARDS ───── */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5 ">
        {/* ── BUS CARD ── */}
        <Card>
          <CardHeader icon="🚌" title="Bus details" accent="#6366f1" />
          {bus ? (
            <div className="px-5 py-4 space-y-4 bg-[rgb(var(--surface))]">
              <div className="flex items-center justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl  border border-indigo-100 flex items-center justify-center shrink-0">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 6v6M16 6v6M2 12h19.6" />
                    <path d="M18 18h1a1 1 0 0 0 1-1v-3.65a2 2 0 0 0-.134-.713l-1.41-3.526A2 2 0 0 0 16.586 8H4a2 2 0 0 0-1.867 1.299L.732 12.849A2 2 0 0 0 .6 13.565V17a1 1 0 0 0 1 1h1" />
                    <circle cx="6.5" cy="18" r="1.5" />
                    <circle cx="16.5" cy="18" r="1.5" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-[rgb(var(--text))]">
                    {fmt(bus.busId)}
                  </p>
                  <p className="text-xs  font-mono">
                    {fmt(bus.regNo)}
                  </p>
                </div>
                <StatusPill status={bus.status} type="bus" />
              </div>

              <div className="h-px bg-slate-100" />

              <div className="grid grid-cols-2 gap-5">
                <InfoCell label="Model" value={bus.model} />
                <InfoCell
                  label="Capacity"
                  value={bus.capacity ? `${bus.capacity} seats` : null}
                />
                <InfoCell label="Reg. number" value={bus.regNo} mono />
                <InfoCell
                  label="Next service"
                  value={bus.nextService ? fmtDate(bus.nextService) : null}
                />
              </div>

              {bus.status === "Maintenance" && (
                <AlertBanner
                  color="amber"
                  icon={
                    <>
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </>
                  }
                  title="Bus under maintenance"
                  desc="A replacement bus may be operating this route. Contact school admin for details."
                />
              )}
            </div>
          ) : (
            <p className="px-5 py-4 text-sm text-[rgb(var(--text))] italic">
              No bus assigned to this route.
            </p>
          )}
        </Card>

        {/* ── GPS TRACKING CARD ── */}
        <Card>
          <CardHeader icon="🛰️" title="Live GPS tracking" accent="#0ea5e9" />
          {gps?.enabled ? (
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[rgb(var(--text))]">
                    {gps.hasLiveFix ? "Live location available" : "Waiting for GPS fix"}
                  </p>
                  <p className="text-xs text-[rgb(var(--text-light))] mt-0.5">
                    {gps.lastUpdated
                      ? `Updated ${new Date(gps.lastUpdated).toLocaleString()}`
                      : "No location update yet"}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
                    gps.hasLiveFix
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {gps.hasLiveFix ? "Live" : "Pending"}
                </span>
              </div>

              {gps.hasLiveFix && (
                <BusLiveMap
                  latitude={gps.latitude}
                  longitude={gps.longitude}
                  label={bus?.busId ? `Bus ${bus.busId}` : "School bus"}
                  speedKmh={gps.speedKmh}
                  height={280}
                />
              )}

              <div className="grid grid-cols-2 gap-5">
                <InfoCell
                  label="Latitude"
                  value={
                    gps.latitude != null ? Number(gps.latitude).toFixed(5) : null
                  }
                  mono
                />
                <InfoCell
                  label="Longitude"
                  value={
                    gps.longitude != null
                      ? Number(gps.longitude).toFixed(5)
                      : null
                  }
                  mono
                />
                <InfoCell
                  label="Speed"
                  value={
                    gps.speedKmh != null ? `${gps.speedKmh} km/h` : null
                  }
                />
                <InfoCell label="Bus" value={bus?.busId} mono />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => fetchTransport({ silent: true })}
                  disabled={refreshingGps}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-600 text-white font-bold text-sm active:scale-[.98] transition-all disabled:opacity-60"
                >
                  {refreshingGps ? "Refreshing..." : "Refresh location"}
                </button>
                {gps.hasLiveFix && (
                  <a
                    href={`https://www.google.com/maps?q=${gps.latitude},${gps.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 bg-[rgb(var(--surface))] font-bold text-sm text-[rgb(var(--text))] active:scale-[.98] transition-all"
                  >
                    Open externally
                  </a>
                )}
              </div>
              {gps.hasLiveFix && (
                <p className="text-[11px] text-[rgb(var(--text-light))] text-center">
                  Map updates automatically every 20 seconds
                </p>
              )}
            </div>
          ) : (
            <div className="px-5 py-4">
              <AlertBanner
                color="amber"
                icon={
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </>
                }
                title="GPS not enabled for this bus"
                desc="School admin can enable GPS tracking on your child's bus from Bus Management."
              />
            </div>
          )}
        </Card>

        {/* ── DRIVER CARD ── */}
        <Card>
          <CardHeader icon="👨‍✈️" title="Driver details" accent="#10b981" />
          {driver ? (
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center gap-3">
                {driver.photo?.url ? (
                  <img
                    src={driver.photo.url}
                    alt={driver.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <span className="text-xl font-bold text-emerald-600">
                      {driver.name?.charAt(0)?.toUpperCase() || "D"}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-[rgb(var(--text))]">
                    {fmt(driver.name)}
                  </p>
                  {driver.experience && (
                    <p className="text-xs text-[rgb(var(--text))]">
                      {driver.experience} experience
                    </p>
                  )}
                </div>
                <StatusPill status={driver.status} type="driver" />
              </div>

              <div className="h-px bg-slate-100 my-2" />

              <div className="grid grid-cols-2 gap-5">
                <InfoCell label="License no." value={driver.license} mono />
                <InfoCell
                  label="Expiry"
                  value={
                    driver.licenseExpiry ? fmtDate(driver.licenseExpiry) : null
                  }
                />
                <InfoCell label="Experience" value={driver.experience} />
                <InfoCell label="Status" value={driver.status} />
              </div>

              {/* Tap-to-call */}
              {driver.phone && (
                <a
                  href={`tel:${driver.phone}`}
                  className="mt-2 flex items-center justify-center gap-2.5 w-full py-3 rounded-xl
                    bg-[rgb(var(--primary))] border border-emerald-200 text-[rgb(var(--text))] font-bold text-sm
                     active:scale-[.98] transition-all"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.58a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  Call Driver · {driver.phone}
                </a>
              )}

              {driver.status === "On Leave" && (
                <AlertBanner
                  color="amber"
                  icon={
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </>
                  }
                  title="Driver on leave"
                  desc="A substitute driver may be operating this route. Contact school admin for details."
                />
              )}
            </div>
          ) : (
            <p className="px-5 py-4 text-sm text-[rgb(var(--text))] italic">
              No driver assigned to this route.
            </p>
          )}
        </Card>

        {/* ── ROUTE STOPS CARD ── */}
        <Card>
          <CardHeader icon="📍" title="Route stops" accent="#f59e0b" />

          {/* Timing banner */}
          {route.startTime && route.endTime && (
            <div className="mx-5 mt-4 flex overflow-hidden rounded-xl border border-slate-100">
              <div className="flex-1 bg-[rgb(var(--surface))] px-4 py-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest ">
                  Departure
                </p>
                <p className="text-lg font-bold text-[rgb(var(--primary))] mt-0.5">
                  {route.startTime}
                </p>
              </div>
              <div className="w-px " />
              <div className="flex-1 bg-[rgb(var(--surface))] px-4 py-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest ">
                  Back School
                </p>
                <p className="text-lg font-bold text-[rgb(var(--primary))] mt-0.5">
                  {route.endTime}
                </p>
              </div>
            </div>
          )}

          {stops.length > 0 ? (
            <div className="px-5 py-5">
              <div className="relative pl-8">
                <span className="absolute left-2.25 top-3 bottom-3 w-0.5 bg-slate-200 rounded-full" />

                {visible.map((stop, i) => {
                  const absIndex = i;
                  const isFirst = absIndex === 0;
                  const isLast = showAllStops
                    ? absIndex === stops.length - 1
                    : absIndex === visible.length - 1 && !hasMore;

                  return (
                    <div
                      key={i}
                      className="relative flex items-start justify-between gap-3 py-2 last:mb-0"
                    >
                      <span
                        className={`absolute -left-7 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-10 shrink-0
                          ${isFirst ? "bg-[rgb(var(--primary))]" : isLast ? "bg-[rgb(var(--primary))]" : "bg-slate-300"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[rgb(var(--text))] leading-snug">
                          {stop}
                        </p>
                        {isFirst && (
                          <span className="text-[10px] font-bold uppercase tracking-wide">
                            Start
                          </span>
                        )}
                        {isLast && stops.length > 1 && (
                          <span className="text-[10px] font-bold text-[rgb(var(--primary))] uppercase tracking-wide">
                            End
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-300 font-mono shrink-0 mt-0.5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <button
                  onClick={() => setShowAllStops((v) => !v)}
                  className="mt-4 w-full py-2.5 rounded-xl  border border-slate-100
                    text-xs font-bold
                    flex items-center justify-center gap-1.5 active:scale-[.98]"
                >
                  {showAllStops ? (
                    <>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M18 15l-6-6-6 6" />
                      </svg>
                      Show fewer stops
                    </>
                  ) : (
                    <>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                      Show all {stops.length} stops
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <p className="px-5 py-4 text-sm text-[rgb(var(--text))] italic">
              No stops listed for this route.
            </p>
          )}
        </Card>

        {/* ── Route suspended global alert ── */}
        {route.status === "Suspended" && (
          <AlertBanner
            color="rose"
            icon={
              <>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </>
            }
            title="Route suspended"
            desc="This transport route is currently suspended. Please contact school admin for more information."
          />
        )}
      </div>
    </div>
  );
};

export default ParentTransport;
