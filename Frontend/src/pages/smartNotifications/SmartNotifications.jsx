import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import CreateNotification from "../../components/CreateNotification.jsx";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "events", label: "Events" },
  { id: "templates", label: "Templates" },
  { id: "channels", label: "Channels" },
  { id: "history", label: "Delivery History" },
  { id: "preferences", label: "Preferences" },
  { id: "broadcast", label: "Send broadcast" },
];

const CHANNEL_LABELS = {
  in_app: "In-app",
  push: "Push",
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

const inputCls =
  "w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--text))] outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]/25";

export default function SmartNotifications() {
  const API = import.meta.env.VITE_API_URL;
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [template, setTemplate] = useState(null);
  const [placeholders, setPlaceholders] = useState([]);
  const [preview, setPreview] = useState(null);
  const [channels, setChannels] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [history, setHistory] = useState({ items: [], total: 0 });
  const [historyFilters, setHistoryFilters] = useState({
    q: "",
    status: "",
    channel: "",
    eventType: "",
  });
  const [detail, setDetail] = useState(null);

  const auth = { withCredentials: true };

  const loadOverview = useCallback(async () => {
    const { data } = await axios.get(`${API}/smart-notifications/overview`, auth);
    setOverview(data.overview);
  }, [API]);

  const loadEvents = useCallback(async () => {
    const { data } = await axios.get(`${API}/smart-notifications/events`, auth);
    setCategories(data.categories || []);
    if (!selectedEvent && data.categories?.[0]?.events?.[0]) {
      setSelectedEvent(data.categories[0].events[0].eventType);
    }
  }, [API, selectedEvent]);

  const loadTemplate = useCallback(
    async (eventType) => {
      if (!eventType) return;
      const { data } = await axios.get(
        `${API}/smart-notifications/templates/${eventType}`,
        auth,
      );
      setTemplate(data.template);
      setPlaceholders(data.placeholders || []);
      setPreview(null);
    },
    [API],
  );

  const loadChannels = useCallback(async () => {
    const { data } = await axios.get(`${API}/smart-notifications/channels`, auth);
    setChannels(data);
  }, [API]);

  const loadPrefs = useCallback(async () => {
    const { data } = await axios.get(`${API}/smart-notifications/preferences`, auth);
    setPrefs(data.preferences);
  }, [API]);

  const loadHistory = useCallback(async () => {
    const params = new URLSearchParams();
    Object.entries(historyFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    params.set("limit", "40");
    const { data } = await axios.get(
      `${API}/smart-notifications/history?${params.toString()}`,
      auth,
    );
    setHistory({ items: data.items || [], total: data.total || 0 });
  }, [API, historyFilters]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await Promise.all([loadOverview(), loadEvents(), loadChannels(), loadPrefs()]);
      } catch (err) {
        if (!cancelled) toast.error(err.response?.data?.message || "Failed to load Smart Notifications");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadOverview, loadEvents, loadChannels, loadPrefs]);

  useEffect(() => {
    if (tab === "templates" && selectedEvent) loadTemplate(selectedEvent);
  }, [tab, selectedEvent, loadTemplate]);

  useEffect(() => {
    if (tab === "history") loadHistory().catch(() => toast.error("Failed to load history"));
  }, [tab, loadHistory]);

  const flatEvents = useMemo(
    () => categories.flatMap((c) => c.events || []),
    [categories],
  );

  const patchEvent = async (eventType, patch) => {
    try {
      await axios.patch(`${API}/smart-notifications/events/${eventType}`, patch, auth);
      toast.success("Event updated");
      await loadEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  const saveTemplate = async () => {
    try {
      await axios.put(
        `${API}/smart-notifications/templates/${selectedEvent}`,
        { subject: template.subject, body: template.body, deepLink: template.deepLink || "" },
        auth,
      );
      toast.success("Template saved");
      await loadTemplate(selectedEvent);
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    }
  };

  const runPreview = async (send = false) => {
    try {
      const { data } = await axios.post(
        `${API}/smart-notifications/templates/${selectedEvent}/test`,
        { send },
        auth,
      );
      setPreview(data.preview);
      if (send) toast.success("Test notification queued");
    } catch (err) {
      toast.error(err.response?.data?.message || "Preview failed");
    }
  };

  const saveChannels = async (next) => {
    try {
      await axios.patch(`${API}/smart-notifications/channels`, { channels: next }, auth);
      toast.success("Channels updated");
      await loadChannels();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  const savePrefs = async () => {
    try {
      await axios.patch(
        `${API}/smart-notifications/preferences`,
        {
          quietHoursStart: prefs.quietHoursStart,
          quietHoursEnd: prefs.quietHoursEnd,
          timezone: prefs.timezone,
        },
        auth,
      );
      toast.success("Preferences saved");
      await loadPrefs();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    }
  };

  const openJob = async (jobId) => {
    try {
      const { data } = await axios.get(`${API}/smart-notifications/history/${jobId}`, auth);
      setDetail(data);
    } catch {
      toast.error("Could not load delivery detail");
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-[rgb(var(--text-muted))]">Loading Smart Notifications…</div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--primary))]">
            Communication
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-[rgb(var(--text))]">
            Smart Notifications
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[rgb(var(--text-muted))]">
            One engine for automated school events and manual broadcasts — in-app, push, email, SMS, and WhatsApp.
          </p>
        </header>

        <div className="mb-5 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                tab === t.id
                  ? "bg-[rgb(var(--primary))] text-white"
                  : "bg-[rgb(var(--surface))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && overview && (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Sent today", value: overview.sentToday },
                { label: "Pending / retry", value: overview.pending },
                { label: "Failures", value: overview.failed },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4"
                >
                  <p className="text-xs uppercase tracking-wide text-[rgb(var(--text-muted))]">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-[rgb(var(--text))]">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
              <h2 className="text-sm font-semibold text-[rgb(var(--text))]">Category activity today</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(overview.categoryActivity || {}).length === 0 && (
                  <p className="text-sm text-[rgb(var(--text-muted))]">No activity yet today.</p>
                )}
                {Object.entries(overview.categoryActivity || {}).map(([cat, count]) => (
                  <span
                    key={cat}
                    className="rounded-full bg-[rgb(var(--bg))] px-3 py-1 text-xs font-medium text-[rgb(var(--text))]"
                  >
                    {cat}: {count}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "events" && (
          <section className="space-y-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4"
              >
                <h2 className="text-sm font-semibold text-[rgb(var(--text))]">{cat.label}</h2>
                <div className="mt-3 divide-y divide-[rgb(var(--border))]">
                  {(cat.events || []).map((ev) => (
                    <div
                      key={ev.eventType}
                      className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-medium text-[rgb(var(--text))]">{ev.name}</p>
                        <p className="text-xs text-[rgb(var(--text-muted))]">{ev.eventType}</p>
                        <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{ev.description}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {(ev.channels || []).map((ch) => (
                          <span
                            key={ch}
                            className="rounded-full bg-[rgb(var(--bg))] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[rgb(var(--text-muted))]"
                          >
                            {CHANNEL_LABELS[ch] || ch}
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEvent(ev.eventType);
                            setTab("templates");
                          }}
                          className="rounded-lg border border-[rgb(var(--border))] px-2.5 py-1 text-xs"
                        >
                          Template
                        </button>
                        <button
                          type="button"
                          onClick={() => patchEvent(ev.eventType, { enabled: !ev.enabled })}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                            ev.enabled
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {ev.enabled ? "Enabled" : "Disabled"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === "templates" && (
          <section className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                Events
              </p>
              <div className="max-h-[70vh] space-y-1 overflow-y-auto">
                {flatEvents.map((ev) => (
                  <button
                    key={ev.eventType}
                    type="button"
                    onClick={() => setSelectedEvent(ev.eventType)}
                    className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs ${
                      selectedEvent === ev.eventType
                        ? "bg-[rgb(var(--primary))] text-white"
                        : "hover:bg-[rgb(var(--bg))] text-[rgb(var(--text))]"
                    }`}
                  >
                    {ev.name}
                  </button>
                ))}
              </div>
            </div>

            {template && (
              <div className="space-y-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
                <h2 className="font-semibold text-[rgb(var(--text))]">{selectedEvent}</h2>
                <label className="block text-xs font-medium text-[rgb(var(--text-muted))]">
                  Subject
                  <input
                    className={`${inputCls} mt-1`}
                    value={template.subject || ""}
                    onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
                  />
                </label>
                <label className="block text-xs font-medium text-[rgb(var(--text-muted))]">
                  Body
                  <textarea
                    rows={8}
                    className={`${inputCls} mt-1 font-mono`}
                    value={template.body || ""}
                    onChange={(e) => setTemplate({ ...template, body: e.target.value })}
                  />
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {placeholders.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      title={p.label}
                      onClick={() =>
                        setTemplate({
                          ...template,
                          body: `${template.body || ""}{{${p.key}}}`,
                        })
                      }
                      className="rounded-full border border-[rgb(var(--border))] px-2 py-0.5 text-[10px] text-[rgb(var(--text-muted))]"
                    >
                      {`{{${p.key}}}`}
                      {p.required ? "*" : ""}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={saveTemplate}
                    className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Save template
                  </button>
                  <button
                    type="button"
                    onClick={() => runPreview(false)}
                    className="rounded-xl border border-[rgb(var(--border))] px-4 py-2 text-sm"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => runPreview(true)}
                    className="rounded-xl border border-[rgb(var(--border))] px-4 py-2 text-sm"
                  >
                    Test send
                  </button>
                </div>
                {preview && (
                  <div className="rounded-xl bg-[rgb(var(--bg))] p-3 text-sm">
                    <p className="font-semibold">{preview.subject}</p>
                    <p className="mt-2 whitespace-pre-wrap text-[rgb(var(--text-muted))]">{preview.body}</p>
                    {!preview.ok && (
                      <p className="mt-2 text-rose-600">{preview.reason}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {tab === "channels" && channels && (
          <section className="space-y-3">
            {Object.entries(channels.providers || {}).map(([key, meta]) => {
              const enabled = channels.schoolChannels?.[key];
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4"
                >
                  <div>
                    <p className="font-medium text-[rgb(var(--text))]">{meta.label}</p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">
                      Provider {meta.configured ? "configured" : "not configured"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      saveChannels({
                        ...channels.schoolChannels,
                        [key]: !enabled,
                      })
                    }
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {enabled ? "On" : "Off"}
                  </button>
                </div>
              );
            })}
          </section>
        )}

        {tab === "preferences" && prefs && (
          <section className="max-w-lg space-y-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
            <h2 className="font-semibold text-[rgb(var(--text))]">Quiet hours</h2>
            <p className="text-xs text-[rgb(var(--text-muted))]">
              Non-urgent notifications are delayed until quiet hours end. Urgent events bypass this window.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs">
                Start
                <input
                  type="time"
                  className={`${inputCls} mt-1`}
                  value={prefs.quietHoursStart || "21:00"}
                  onChange={(e) => setPrefs({ ...prefs, quietHoursStart: e.target.value })}
                />
              </label>
              <label className="text-xs">
                End
                <input
                  type="time"
                  className={`${inputCls} mt-1`}
                  value={prefs.quietHoursEnd || "07:00"}
                  onChange={(e) => setPrefs({ ...prefs, quietHoursEnd: e.target.value })}
                />
              </label>
            </div>
            <label className="block text-xs">
              Timezone
              <input
                className={`${inputCls} mt-1`}
                value={prefs.timezone || "Asia/Kolkata"}
                onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
              />
            </label>
            <button
              type="button"
              onClick={savePrefs}
              className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white"
            >
              Save preferences
            </button>
          </section>
        )}

        {tab === "history" && (
          <section className="space-y-3">
            <div className="grid gap-2 md:grid-cols-4">
              <input
                className={inputCls}
                placeholder="Search recipient / message"
                value={historyFilters.q}
                onChange={(e) => setHistoryFilters({ ...historyFilters, q: e.target.value })}
              />
              <select
                className={inputCls}
                value={historyFilters.status}
                onChange={(e) => setHistoryFilters({ ...historyFilters, status: e.target.value })}
              >
                <option value="">All statuses</option>
                {["queued", "sent", "delivered", "failed", "retry", "suppressed"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                className={inputCls}
                value={historyFilters.channel}
                onChange={(e) => setHistoryFilters({ ...historyFilters, channel: e.target.value })}
              >
                <option value="">All channels</option>
                {Object.keys(CHANNEL_LABELS).map((c) => (
                  <option key={c} value={c}>
                    {CHANNEL_LABELS[c]}
                  </option>
                ))}
              </select>
              <select
                className={inputCls}
                value={historyFilters.eventType}
                onChange={(e) => setHistoryFilters({ ...historyFilters, eventType: e.target.value })}
              >
                <option value="">All events</option>
                {flatEvents.map((ev) => (
                  <option key={ev.eventType} value={ev.eventType}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[rgb(var(--bg))] text-xs uppercase tracking-wide text-[rgb(var(--text-muted))]">
                  <tr>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Event</th>
                    <th className="px-3 py-2">Recipient</th>
                    <th className="px-3 py-2">Channel</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.items.map((job) => (
                    <tr
                      key={job._id}
                      className="cursor-pointer border-t border-[rgb(var(--border))] hover:bg-[rgb(var(--bg))]"
                      onClick={() => openJob(job._id)}
                    >
                      <td className="px-3 py-2 text-xs text-[rgb(var(--text-muted))]">
                        {new Date(job.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{job.eventName || job.eventType}</td>
                      <td className="px-3 py-2">
                        {job.recipient?.name || job.recipient?.email || job.recipient?.mobile || "—"}
                      </td>
                      <td className="px-3 py-2">{CHANNEL_LABELS[job.channel] || job.channel}</td>
                      <td className="px-3 py-2">{job.status}</td>
                    </tr>
                  ))}
                  {!history.items.length && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-sm text-[rgb(var(--text-muted))]">
                        No delivery jobs yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {detail?.job && (
              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{detail.job.eventName}</h3>
                    <p className="text-xs text-[rgb(var(--text-muted))]">{detail.job._id}</p>
                  </div>
                  <button type="button" className="text-xs" onClick={() => setDetail(null)}>
                    Close
                  </button>
                </div>
                <p className="mt-3 font-medium">{detail.job.subject}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[rgb(var(--text-muted))]">
                  {detail.job.body}
                </p>
                <div className="mt-3 space-y-1">
                  {(detail.attempts || []).map((a) => (
                    <p key={a._id} className="text-xs text-[rgb(var(--text-muted))]">
                      {new Date(a.attemptedAt).toLocaleString()} · {a.provider} · {a.result}
                      {a.responseSummary ? ` — ${a.responseSummary}` : ""}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {tab === "broadcast" && (
          <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
            <h2 className="mb-3 font-semibold text-[rgb(var(--text))]">Send broadcast</h2>
            <p className="mb-4 text-sm text-[rgb(var(--text-muted))]">
              Manual broadcasts use the same Smart Notifications pipeline and delivery history.
            </p>
            <CreateNotification
              onSuccess={() => {
                toast.success("Broadcast sent");
                setTab("history");
                loadHistory();
                loadOverview();
              }}
            />
          </section>
        )}
      </div>
    </div>
  );
}
