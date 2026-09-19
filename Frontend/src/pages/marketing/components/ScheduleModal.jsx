import { useState } from "react";

/** Modal for publish-now vs schedule-at-a-time (local datetime). */
export default function ScheduleModal({ open, onClose, onSubmit, title = "Approve & publish" }) {
  const [mode, setMode] = useState("now");
  const [when, setWhen] = useState("");

  if (!open) return null;

  const submit = () => {
    if (mode === "now") onSubmit(null);
    else {
      const dt = new Date(when);
      if (!when || Number.isNaN(dt.getTime())) return;
      onSubmit(dt.toISOString());
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6"
        style={{ background: "rgb(var(--bg))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-extrabold mb-4" style={{ color: "rgb(var(--text))" }}>
          {title}
        </h2>

        <div className="flex flex-col gap-2 mb-4">
          <label
            className="flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer"
            style={{ borderColor: mode === "now" ? "rgb(var(--primary))" : "rgb(var(--border))" }}
          >
            <input type="radio" checked={mode === "now"} onChange={() => setMode("now")} />
            <span className="text-sm font-bold" style={{ color: "rgb(var(--text))" }}>
              Publish now
            </span>
          </label>
          <label
            className="flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer"
            style={{ borderColor: mode === "schedule" ? "rgb(var(--primary))" : "rgb(var(--border))" }}
          >
            <input type="radio" checked={mode === "schedule"} onChange={() => setMode("schedule")} />
            <span className="text-sm font-bold" style={{ color: "rgb(var(--text))" }}>
              Schedule
            </span>
          </label>
          {mode === "schedule" && (
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm"
              style={{ background: "rgb(var(--surface))", color: "rgb(var(--text))", borderColor: "rgb(var(--border))" }}
            />
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border py-3 text-sm font-extrabold"
            style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--text))" }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex-1 rounded-2xl py-3 text-sm font-extrabold text-white active:scale-95 transition-transform"
            style={{
              background: "linear-gradient(135deg, rgb(var(--sidebar)) 0%, rgb(var(--primary)) 100%)",
            }}
          >
            Approve ✓
          </button>
        </div>
      </div>
    </div>
  );
}