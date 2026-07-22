import { useEffect, useState } from "react";
import DesignSkinPicker from "../DesignSkinPicker";
import {
  DASHBOARD_LAYOUT_OPTIONS,
  getDashboardLayout,
  setDashboardLayout,
  DASHBOARD_LAYOUT_EVENT,
} from "../../utils/dashboardLayout";

/** Shared Classic / Campus picker for any role dashboard settings panel. */
export default function DashboardLayoutPicker({ layout, onLayoutChange }) {
  return (
    <div className="mb-6 space-y-5">
      <DesignSkinPicker variant="inline" />

      <div>
        <div className="mb-3">
          <h2 className="text-base font-black text-[rgb(var(--text))]">
            Dashboard Layout
          </h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            Classic keeps denser control-center cards. Campus uses profile
            cards, colorful summaries, and a module grid. App Design is also
            available from your profile menu.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {DASHBOARD_LAYOUT_OPTIONS.map((opt) => {
            const active = layout === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onLayoutChange?.(opt.id)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  active
                    ? "border-[rgb(var(--primary))] bg-[rgb(var(--surface))] ring-2 ring-[rgb(var(--primary))]"
                    : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:border-[rgb(var(--border-strong))]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black text-[rgb(var(--text))]">
                    {opt.label}
                  </span>
                  {active && (
                    <span className="rounded-full bg-[rgb(var(--primary))] px-2 py-0.5 text-[10px] font-black uppercase text-white">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                  {opt.helper}
                </p>
                <div
                  className={`mt-3 grid h-14 gap-1 rounded-xl p-2 ${
                    opt.id === "campus"
                      ? "grid-cols-3 bg-slate-100 dark:bg-slate-900/40"
                      : "grid-cols-2 bg-slate-50 dark:bg-slate-900/30"
                  }`}
                >
                  {opt.id === "campus" ? (
                    <>
                      <span className="rounded-md bg-blue-500/80" />
                      <span className="rounded-md bg-orange-400/80" />
                      <span className="rounded-md bg-emerald-500/80" />
                      <span className="col-span-3 grid grid-cols-4 gap-1">
                        <span className="rounded bg-sky-200 dark:bg-sky-900" />
                        <span className="rounded bg-sky-200 dark:bg-sky-900" />
                        <span className="rounded bg-sky-200 dark:bg-sky-900" />
                        <span className="rounded bg-sky-200 dark:bg-sky-900" />
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="rounded-md bg-[rgb(var(--primary))]/30" />
                      <span className="rounded-md bg-[rgb(var(--primary))]/20" />
                      <span className="col-span-2 rounded-md bg-[rgb(var(--border))]" />
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Hook: layout state synced to localStorage + cross-tab/event updates. */
export function useDashboardLayout() {
  const [layout, setLayoutState] = useState(() => getDashboardLayout());

  useEffect(() => {
    const onLayout = (e) => {
      if (e?.detail === "campus" || e?.detail === "classic") {
        setLayoutState(e.detail);
      }
    };
    window.addEventListener(DASHBOARD_LAYOUT_EVENT, onLayout);
    return () => window.removeEventListener(DASHBOARD_LAYOUT_EVENT, onLayout);
  }, []);

  const setLayout = (id) => {
    const next = setDashboardLayout(id);
    setLayoutState(next);
    return next;
  };

  return [layout, setLayout];
}
