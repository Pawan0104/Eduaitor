import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaCheck, FaPalette, FaTimes } from "react-icons/fa";
import {
  UI_SKIN_EVENT,
  UI_SKIN_OPTIONS,
  applyUiSkin,
  getUiSkin,
} from "../utils/uiSkin";

/**
 * Visible Design switcher — changes the full-app UI skin for every role.
 * variant: "topbar" | "login" | "inline"
 */
export default function DesignSkinPicker({
  variant = "topbar",
  className = "",
}) {
  const [value, setValue] = useState(() => getUiSkin());
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const sheetRef = useRef(null);

  useEffect(() => {
    const onChange = (e) => setValue(e?.detail || getUiSkin());
    window.addEventListener(UI_SKIN_EVENT, onChange);
    return () => window.removeEventListener(UI_SKIN_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const t = e.target;
      if (rootRef.current?.contains(t) || sheetRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active =
    UI_SKIN_OPTIONS.find((o) => o.id === value) || UI_SKIN_OPTIONS[0];

  const pick = (id) => {
    const next = applyUiSkin(id);
    setValue(next);
    setOpen(false);
  };

  const sheet =
    open &&
    createPortal(
      <div
        className="fixed inset-0 z-[220] flex items-end justify-center p-3 sm:items-center"
        style={{
          background: "rgba(15, 23, 42, 0.5)",
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
        role="presentation"
        onClick={() => setOpen(false)}
      >
        <div
          ref={sheetRef}
          role="dialog"
          aria-label="App design"
          onClick={(e) => e.stopPropagation()}
          className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-2xl"
          style={{ maxHeight: "min(88dvh, 36rem)" }}
        >
          <div className="shrink-0 border-b border-[rgb(var(--border))] px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black text-[rgb(var(--text))]">
                  App Design
                </p>
                <p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">
                  Changes login, menus, and every screen for all roles on this
                  device.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgb(var(--border))]"
                aria-label="Close"
              >
                <FaTimes size={12} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
            {UI_SKIN_OPTIONS.map((opt) => {
              const selected = value === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => pick(opt.id)}
                  className={`flex w-full items-stretch gap-3 rounded-2xl border p-3 text-left transition ${
                    selected
                      ? "border-[rgb(var(--primary))] ring-2 ring-[rgb(var(--primary))]"
                      : "border-[rgb(var(--border))] hover:border-[rgb(var(--border-strong))]"
                  }`}
                >
                  <div className="flex w-16 shrink-0 flex-col overflow-hidden rounded-xl border border-[rgb(var(--border))]">
                    <span
                      className="h-8 flex-1"
                      style={{ background: opt.swatch[0] }}
                    />
                    <span
                      className="h-4"
                      style={{ background: opt.swatch[1] }}
                    />
                    <span
                      className="h-4"
                      style={{ background: opt.swatch[2] }}
                    />
                  </div>
                  <div className="min-w-0 flex-1 self-center">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-[rgb(var(--text))]">
                        {opt.label}
                      </p>
                      {selected && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgb(var(--primary))] text-white">
                          <FaCheck size={9} />
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-[rgb(var(--text-muted))]">
                      {opt.helper}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>,
      document.body,
    );

  if (variant === "inline") {
    return (
      <div className={`space-y-2 ${className}`}>
        <p className="text-xs font-black uppercase tracking-wide text-[rgb(var(--text-muted))]">
          App Design
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {UI_SKIN_OPTIONS.map((opt) => {
            const selected = value === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => pick(opt.id)}
                className={`rounded-2xl border p-3 text-left ${
                  selected
                    ? "border-[rgb(var(--primary))] ring-2 ring-[rgb(var(--primary))]"
                    : "border-[rgb(var(--border))]"
                }`}
              >
                <div className="mb-2 flex h-8 overflow-hidden rounded-lg">
                  {opt.swatch.map((c) => (
                    <span
                      key={c}
                      className="flex-1"
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <p className="text-xs font-black text-[rgb(var(--text))]">
                  {opt.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const isLogin = variant === "login";

  return (
    <div ref={rootRef} className={`shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="App design"
        title="App design"
        className={
          isLogin
            ? "mb-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-slate-300"
            : "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text))] transition hover:border-[rgba(var(--primary),0.35)] sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3"
        }
      >
        <span
          className={`flex items-center justify-center rounded-lg text-white ${
            isLogin ? "h-8 w-8" : "h-6 w-6"
          }`}
          style={{
            background: `linear-gradient(135deg, ${active.swatch[0]}, ${active.swatch[1]})`,
          }}
        >
          <FaPalette size={isLogin ? 13 : 10} />
        </span>
        <span className={`min-w-0 ${isLogin ? "flex-1" : "hidden sm:block"}`}>
          <span
            className={`block font-black text-[rgb(var(--text))] ${
              isLogin ? "text-sm" : "text-[11px] sm:text-xs"
            }`}
          >
            {isLogin ? "Design" : active.label}
          </span>
          {isLogin && (
            <span className="block text-[11px] text-slate-500">
              {active.label} — tap to change look
            </span>
          )}
        </span>
        {!isLogin && (
          <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))] lg:inline">
            Design
          </span>
        )}
      </button>
      {sheet}
    </div>
  );
}

export function useUiSkin() {
  const [skin, setSkinState] = useState(() => getUiSkin());
  useEffect(() => {
    const onChange = (e) => setSkinState(e?.detail || getUiSkin());
    window.addEventListener(UI_SKIN_EVENT, onChange);
    return () => window.removeEventListener(UI_SKIN_EVENT, onChange);
  }, []);
  const setSkin = (id) => {
    const next = applyUiSkin(id);
    setSkinState(next);
    return next;
  };
  return [skin, setSkin];
}
