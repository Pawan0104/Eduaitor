import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaArrowRotateRight,
  FaBus,
  FaClock,
  FaRoute,
  FaScrewdriverWrench,
  FaUserGraduate,
  FaUserTie,
} from "react-icons/fa6";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const emptySummary = {
  buses: 0,
  routes: 0,
  drivers: 0,
  students: 0,
  maintenance: 0,
  suspended: 0,
  on_leave: 0,
};

const Transport = () => {
  const [summary, setSummary] = useState(emptySummary);
  const [activity, setActivity] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const [sumRes, actRes, busRes, routeRes, driverRes] = await Promise.all([
        axios.get(`${API}/transport/summary`, { withCredentials: true }),
        axios.get(`${API}/transport/activity`, { withCredentials: true }),
        axios.get(`${API}/transport/buses`, { withCredentials: true }),
        axios.get(`${API}/transport/routes`, { withCredentials: true }),
        axios.get(`${API}/transport/drivers`, { withCredentials: true }),
      ]);

      setSummary({
        buses: sumRes.data.buses || 0,
        routes: sumRes.data.routes || 0,
        drivers: sumRes.data.drivers || 0,
        students: sumRes.data.students || 0,
        maintenance: sumRes.data.maintenance || 0,
        suspended: sumRes.data.suspended || 0,
        on_leave: sumRes.data.on_leave || 0,
      });
      setActivity(actRes.data.data || []);
      setBuses(busRes.data.data || []);
      setRoutes(routeRes.data.data || []);
      setDrivers(driverRes.data.data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load transport dashboard",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fleetHealth = useMemo(() => {
    const activeBuses = buses.filter((bus) => bus.status === "Active").length;
    const activeRoutes = routes.filter(
      (route) => route.status === "Active",
    ).length;
    const activeDrivers = drivers.filter(
      (driver) => driver.status === "Active",
    ).length;
    const assignedBuses = buses.filter((bus) => bus.driver || bus.route).length;

    return {
      activeBuses,
      activeRoutes,
      activeDrivers,
      assignedBuses,
    };
  }, [buses, routes, drivers]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredBuses = useMemo(() => {
    if (!normalizedSearch) return buses;

    return buses.filter((bus) =>
      [bus.busId, bus.regNo, bus.model, bus.driver?.name, bus.route?.name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [buses, normalizedSearch]);

  const filteredRoutes = useMemo(() => {
    if (!normalizedSearch) return routes;

    return routes.filter((route) =>
      [
        route.routeId,
        route.name,
        route.driver?.name,
        route.bus?.busId,
        ...(route.stopsList || []),
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [routes, normalizedSearch]);

  const filteredDrivers = useMemo(() => {
    if (!normalizedSearch) return drivers;

    return drivers.filter((driver) =>
      [
        driver.driverId,
        driver.name,
        driver.phone,
        driver.license,
        driver.bus?.busId,
        driver.route?.name,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [drivers, normalizedSearch]);

  const filteredActivity = useMemo(() => {
    if (!normalizedSearch) return activity;

    return activity.filter((item) =>
      [item.bus, item.route, item.driver, item.status]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [activity, normalizedSearch]);

  const priorityAlerts = [
    {
      label: "Maintenance Due",
      value: summary.maintenance,
      helper: "Buses that need service attention",
      tone: "amber",
    },
    {
      label: "Routes Suspended",
      value: summary.suspended,
      helper: "Routes currently not running",
      tone: "red",
    },
    {
      label: "Drivers On Leave",
      value: summary.on_leave,
      helper: "Staff temporarily unavailable",
      tone: "blue",
    },
    {
      label: "Fleet Assigned",
      value: `${fleetHealth.assignedBuses}/${summary.buses}`,
      helper: "Buses linked to a route or driver",
      tone: "emerald",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
          <p className="text-sm font-semibold text-slate-600">
            Loading transport dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8">
      {/* 🔙 BACK BUTTON */}
      {isMobile && (
          <div className="pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                 bg-white shadow-sm border border-slate-100
                 text-sm font-bold text-slate-600 active:scale-95 transition-transform mb-2.5"
          >
            <FaArrowLeft size={16} />
            Back
          </button>
        </div>
      )}
      <div className="border-b text-[rgb(var(--text))] bg-[rgb(var(--surface))] rounded-2xl">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[rgb(var(--primary))]">
                Fleet Control
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight ">
                Transport Management
              </h1>
              <p className="mt-2 max-w-2xl text-sm ">
                Track buses, routes, drivers, and today&apos;s activity from one
                place.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Search bus, route, driver, phone..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-slate-200  px-4 py-3 text-sm outline-none transition focus:border-cyan-400  sm:w-80"
              />
              <button
                onClick={fetchDashboard}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--primary))] px-4 py-3 text-sm font-bold  transition hover:bg-slate-800"
              >
                <FaArrowRotateRight className="text-xs" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
          <StatCard
            title="Total Buses"
            value={summary.buses}
            note={`${fleetHealth.activeBuses} active on the road`}
            icon={<FaBus />}
            tone="amber"
          />
          <StatCard
            title="Routes"
            value={summary.routes}
            note={`${fleetHealth.activeRoutes} routes running`}
            icon={<FaRoute />}
            tone="cyan"
          />
          <StatCard
            title="Drivers"
            value={summary.drivers}
            note={`${fleetHealth.activeDrivers} available now`}
            icon={<FaUserTie />}
            tone="emerald"
          />
          <StatCard
            title="Students Covered"
            value={summary.students.toLocaleString()}
            note="Total students assigned across routes"
            icon={<FaUserGraduate />}
            tone="violet"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="overflow-hidden rounded-3xl bg-linear-to-br text-[rgb(var(--text))] bg-[rgb(var(--surface))] p-4 shadow-lg border border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[rgb(var(--primary))]">
                  Operations Snapshot
                </p>
                <h2 className="mt-3 text-2xl font-black ">
                  Keep the fleet balanced and ready
                </h2>
                <p className="mt-2 max-w-xl text-sm ">
                  This panel highlights how much of the fleet is actively
                  assigned so gaps stand out quickly.
                </p>
              </div>

              <div className="hidden rounded-2xl bg-cyan-50 p-4 text-2xl text-cyan-600 sm:block">
                <FaClock />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <HighlightCard
                label="Assigned Buses"
                value={`${fleetHealth.assignedBuses}/${summary.buses}`}
              />
              <HighlightCard label="Maintenance" value={summary.maintenance} />
              <HighlightCard label="On Leave" value={summary.on_leave} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 text-[rgb(var(--text))] bg-[rgb(var(--surface))] p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                <FaScrewdriverWrench />
              </div>
              <div>
                <h2 className="text-lg font-black text-[rgb(var(--text))]">
                  Priority Alerts
                </h2>
                <p className="text-sm text-[rgb(var(--text))]">
                  Quick operational issues to review first.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {priorityAlerts.map((item) => (
                <AlertRow key={item.label} {...item} />
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6 w-full">
          {/* BUS PANEL */}
          <Panel
            title="Bus Registry"
            subtitle="Registration, assignment, capacity and service visibility"
            count={filteredBuses.length}
          >
            {filteredBuses.length === 0 ? (
              <EmptyState message="No buses matched your search." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBuses.map((bus) => (
                  <InfoCard
                    key={bus._id}
                    title={bus.busId || "Bus"}
                    subtitle={bus.regNo || "No registration number"}
                    status={bus.status}
                    tone={getToneByStatus(bus.status)}
                    details={[
                      `Model: ${bus.model || "Not added"}`,
                      `Capacity: ${bus.capacity || 0} students`,
                      `Driver: ${bus.driver?.name || "Unassigned"}`,
                      `Route: ${bus.route?.name || "Unassigned"}`,
                      `Next service: ${formatDate(bus.nextService)}`,
                    ]}
                  />
                ))}
              </div>
            )}
          </Panel>

          {/* ROUTE PANEL */}
          <Panel
            title="Route Coverage"
            subtitle="Useful route details and current assignments"
            count={filteredRoutes.length}
          >
            {filteredRoutes.length === 0 ? (
              <EmptyState message="No routes matched your search." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRoutes.map((route) => (
                  <InfoCard
                    key={route._id}
                    title={route.name}
                    subtitle={route.routeId || "Route ID pending"}
                    status={route.status}
                    tone={getToneByStatus(route.status)}
                    details={[
                      `Bus: ${route.bus?.busId || "Unassigned"}`,
                      `Driver: ${route.driver?.name || "Unassigned"}`,
                      `Stops: ${route.stops || route.stopsList?.length || 0}`,
                      `Students: ${route.students || 0}`,
                      `Timing: ${formatTimeRange(route.startTime, route.endTime)}`,
                      `Stop list: ${formatStops(route.stopsList)}`,
                    ]}
                  />
                ))}
              </div>
            )}
          </Panel>

          {/* DRIVER PANEL */}
          <Panel
            title="Driver Desk"
            subtitle="Key contact and assignment details"
            count={filteredDrivers.length}
          >
            {filteredDrivers.length === 0 ? (
              <EmptyState message="No drivers matched your search." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDrivers.map((driver) => (
                  <InfoCard
                    key={driver._id}
                    title={driver.name}
                    subtitle={driver.driverId || "Driver ID pending"}
                    status={driver.status}
                    tone={getToneByStatus(driver.status)}
                    details={[
                      `Phone: ${driver.phone || "Not added"}`,
                      `License: ${driver.license || "Not added"}`,
                      `License expiry: ${formatDate(driver.licenseExpiry)}`,
                      `Bus: ${driver.bus?.busId || "Unassigned"}`,
                      `Route: ${driver.route?.name || "Unassigned"}`,
                      `Experience: ${driver.experience || "Not added"}`,
                    ]}
                  />
                ))}
              </div>
            )}
          </Panel>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 text-[rgb(var(--text))] bg-[rgb(var(--surface))] shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-[rgb(var(--text))]">
                Today&apos;s Activity
              </h2>
              <p className="text-sm text-[rgb(var(--text))]">
                Latest transport events recorded for this school.
              </p>
            </div>
            <span className="w-fit rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-[rgb(var(--primary))]">
              {filteredActivity.length} records
            </span>
          </div>

          {filteredActivity.length === 0 ? (
            <div className="p-8 text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
              <EmptyState message="No transport activity found for today." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[rgb(var(--text))] bg-[rgb(var(--surface))] text-xs uppercase tracking-wide ">
                  <tr>
                    <th className="px-5 py-4 text-left font-bold">Event</th>
                    <th className="px-5 py-4 text-left font-bold">Bus</th>
                    <th className="px-5 py-4 text-left font-bold">Route</th>
                    <th className="px-5 py-4 text-left font-bold">Driver</th>
                    <th className="px-5 py-4 text-left font-bold">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredActivity.map((row) => (
                    <tr key={row._id} className="">
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${badgeClasses(
                            row.status,
                          )}`}
                        >
                          {row.status || "Activity Logged"}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-[rgb(var(--text))]">
                        {row.bus || "-"}
                      </td>
                      <td className="px-5 py-4 text-[rgb(var(--text))]">
                        {row.route || "-"}
                      </td>
                      <td className="px-5 py-4 text-[rgb(var(--text))]">
                        {row.driver || "-"}
                      </td>
                      <td className="px-5 py-4 text-[rgb(var(--text))]">
                        {row.time || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, note, icon, tone }) => {
  const tones = {
    amber: "bg-amber-50 text-amber-600",
    cyan: "bg-cyan-50 text-cyan-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="rounded-3xl border border-slate-200 text-[rgb(var(--text))] bg-[rgb(var(--surface))]  p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] ">
            {title}
          </p>
          <p className="mt-3 text-3xl font-black ">{value}</p>
          <p className="mt-2 text-sm ">{note}</p>
        </div>
        <div className={`rounded-2xl p-3 text-xl ${tones[tone]}`}>{icon}</div>
      </div>
    </div>
  );
};

const HighlightCard = ({ label, value }) => (
  <div className="rounded-2xl bg-[rgb(var(--surface))] p-4 border border-slate-200 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-[0.2em]">
      {label}
    </p>
    <p className="mt-2 text-2xl font-black ">{value}</p>
  </div>
);

const Panel = ({ title, subtitle, count, children }) => (
  <div className="rounded-3xl border border-slate-200  text-[rgb(var(--text))] bg-[rgb(var(--surface))] p-5 shadow-sm">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-black ">{title}</h2>
        <p className="mt-1 text-sm ">{subtitle}</p>
      </div>
      <span className="rounded-full  px-3 py-1 text-xs font-bold ">
        {count}
      </span>
    </div>
    {children}
  </div>
);

const InfoCard = ({ title, subtitle, status, tone, details }) => (
  <div className="rounded-2xl border border-slate-200 text-[rgb(var(--text))] bg-[rgb(var(--surface))] p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-black text-[rgb(var(--text))]">{title}</h3>
        <p className="mt-1 text-sm text-[rgb(var(--text))]">{subtitle}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone}`}>
        {status || "Unknown"}
      </span>
    </div>

    <div className="mt-4 space-y-2">
      {details.map((detail) => (
        <p key={detail} className="text-sm text-[rgb(var(--text))]">
          {detail}
        </p>
      ))}
    </div>
  </div>
);

const AlertRow = ({ label, value, helper, tone }) => {
  const tones = {
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border p-3">
      <div>
        <p className="text-sm font-bold text-[rgb(var(--text))] ">{label}</p>
        <p className="text-xs text-[rgb(var(--text))]">{helper}</p>
      </div>
      <span
        className={`rounded-full px-3 py-1 text-xs font-bold ${tones[tone]}`}
      >
        {value}
      </span>
    </div>
  );
};

const EmptyState = ({ message }) => (
  <div className="rounded-2xl border border-dashed border-slate-300  p-6 text-center text-sm font-medium ">
    {message}
  </div>
);

const getToneByStatus = (status) => {
  const map = {
    Active: "bg-emerald-50 text-emerald-700",
    Maintenance: "bg-amber-50 text-amber-700",
    Inactive: "bg-slate-100 text-slate-600",
    Suspended: "bg-red-50 text-red-700",
    "On Leave": "bg-blue-50 text-blue-700",
  };

  return map[status] || "bg-slate-100 text-slate-600";
};

const badgeClasses = (status) => {
  const map = {
    "Driver Assigned": "bg-blue-50 text-blue-700",
    "Route Created": "bg-emerald-50 text-emerald-700",
    "On Time": "bg-emerald-50 text-emerald-700",
    Delayed: "bg-red-50 text-red-700",
  };

  return map[status] || "bg-slate-100 text-slate-700";
};

const formatDate = (value) => {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString();
};

const formatTimeRange = (startTime, endTime) => {
  if (!startTime && !endTime) return "Not scheduled";
  if (!startTime) return `Until ${endTime}`;
  if (!endTime) return `Starts ${startTime}`;
  return `${startTime} - ${endTime}`;
};

const formatStops = (stopsList) => {
  if (!Array.isArray(stopsList) || stopsList.length === 0) return "Not added";
  return stopsList.slice(0, 3).join(", ");
};

export default Transport;
