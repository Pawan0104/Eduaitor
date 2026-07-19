import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCheck,
  FaChevronDown,
  FaSearch,
  FaThLarge,
  FaTimes,
} from "react-icons/fa";
import { useLanguage } from "../context/LanguageContext";

export const DEFAULT_COLOR = { bg: "#F3F4F6", icon: "#6B7280", dot: "#E5E7EB" };

/** Align with Tailwind `lg` / bottom-nav shell (1024px). */
export const isAppMobile = () =>
  /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
  window.innerWidth < 1024;

export function useMenuExitGuard(setShowExit) {
  useEffect(() => {
    if (!isAppMobile()) return;

    let isActive = true;
    const push = () => {
      if (window.history.state !== "menu-lock")
        window.history.pushState("menu-lock", "");
    };
    push();

    const onPopState = () => {
      if (!isActive) return;
      push();
      setShowExit(true);
    };
    const onFocus = () => push();

    window.addEventListener("popstate", onPopState);
    window.addEventListener("focus", onFocus);
    return () => {
      isActive = false;
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("focus", onFocus);
    };
  }, [setShowExit]);
}

export function GreetingHeader({ name, role, loginAs }) {
  const { t, tn, locale } = useLanguage();
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setDateStr(
        now.toLocaleDateString(locale, {
          weekday: "long",
          day: "2-digit",
          month: "short",
        }),
      );
    };
    update();
  }, [locale]);

  const rawRole = (loginAs ? loginAs : role || "").replace(/_/g, " ");
  const displayRole = rawRole ? t(`role.${rawRole}`, tn(rawRole)) : "";

  return (
    <div
      className="rounded-2xl px-5 py-5 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--sidebar)) 85%)",
      }}
    >
      <div
        className="absolute -top-8 -right-6 w-28 h-28 rounded-full opacity-15 pointer-events-none"
        style={{ background: "#fff" }}
      />
      {displayRole && (
        <p className="relative text-white/75 text-[11px] font-bold uppercase tracking-wide mb-1">
          {displayRole}
        </p>
      )}
      <h1 className="relative text-white text-xl font-extrabold mb-1 capitalize">
        {t("menu.welcome", "Welcome")}, {name}
      </h1>
      <p className="relative text-white/80 text-[12.5px] font-semibold">
        {dateStr}
      </p>
    </div>
  );
}

export function ExitPopup({ onConfirm, onCancel }) {
  const { t } = useLanguage();
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl px-6 pt-3 pb-10"
        style={{ background: "rgb(var(--bg))" }}
      >
        <div
          className="w-10 h-1 rounded-full mx-auto mb-6"
          style={{ background: "rgb(var(--border))" }}
        />
        <div className="flex flex-col items-center mb-7">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-4"
            style={{ background: "rgb(var(--surface))" }}
          >
            🚪
          </div>
          <h2
            className="text-lg font-extrabold mb-1"
            style={{ color: "rgb(var(--text))" }}
          >
            {t("menu.exitTitle", "Exit App?")}
          </h2>
          <p
            className="text-sm text-center leading-relaxed"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {t("menu.exitBody", "Are you sure you want to logout and exit?")}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-2xl text-sm font-extrabold active:scale-95 transition-transform border"
            style={{
              borderColor: "rgb(var(--border))",
              background: "rgb(var(--surface))",
              color: "rgb(var(--text))",
            }}
          >
            {t("menu.stay", "Stay")}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 rounded-2xl text-sm font-extrabold text-white active:scale-95 transition-transform"
            style={{
              background:
                "linear-gradient(135deg, rgb(var(--sidebar)) 0%, rgb(var(--primary)) 100%)",
            }}
          >
            {t("menu.logoutExit", "Logout & Exit")}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccordionPanel({ isOpen, children }) {
  const innerRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (innerRef.current) setHeight(innerRef.current.scrollHeight);
  });

  return (
    <div
      className="overflow-hidden col-span-full"
      style={{
        maxHeight: isOpen ? `${height + 8}px` : "0px",
        opacity: isOpen ? 1 : 0,
        transition:
          "max-height 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease",
      }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
}

export const MENU_STYLE_OPTIONS = [
  { id: "glass", label: "Glass chip" },
  { id: "solid", label: "Solid icon" },
  { id: "soft", label: "Soft stack" },
  { id: "list", label: "List grid" },
  { id: "minimal", label: "Minimal" },
];

export const MENU_STYLE_KEY = "menuGridStyle";
export const MENU_STYLE_EVENT = "menuGridStyleChange";

export function getSavedMenuStyle() {
  try {
    const saved = localStorage.getItem(MENU_STYLE_KEY);
    if (MENU_STYLE_OPTIONS.some((o) => o.id === saved)) return saved;
  } catch {
    /* ignore */
  }
  return "glass";
}

export function setSavedMenuStyle(id) {
  try {
    localStorage.setItem(MENU_STYLE_KEY, id);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(MENU_STYLE_EVENT, { detail: id }));
}

function FolderBadge({ count, color }) {
  return (
    <span
      className="absolute -top-0.5 -right-0.5 min-w-[22px] h-[22px] px-1 rounded-full
        text-[10px] font-extrabold text-white flex items-center justify-center
        border-2 border-[rgb(var(--bg))]"
      style={{
        background: color.icon,
        boxShadow: `0 4px 10px -2px ${color.icon}99`,
      }}
    >
      {count}
    </span>
  );
}

function MenuCard({ item, color, globalIdx, isOpen, onToggle, styleId }) {
  const navigate = useNavigate();
  const { t, tn } = useLanguage();
  const hasChildren = Boolean(item.children);
  const label = tn(item.name);
  const delay = { animationDelay: `${Math.min(globalIdx, 16) * 35}ms` };

  const onClick = () => (hasChildren ? onToggle() : navigate(item.path));

  const openCue = hasChildren && (
    <span
      className="relative mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide opacity-80"
      style={{ color: color.icon }}
    >
      {t("menu.open", "Open")}
      <FaChevronDown
        size={9}
        style={{
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </span>
  );

  /* ── 4. List grid ── */
  if (styleId === "list") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group flex items-center gap-3 w-full min-h-[64px] px-3 py-2.5 text-left
          rounded-2xl select-none active:scale-[0.98] transition-all menu-tile-enter
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary))]"
        style={{
          background: isOpen
            ? `color-mix(in srgb, ${color.icon} 12%, transparent)`
            : "transparent",
          border: `1px solid ${isOpen ? `${color.icon}44` : "rgb(var(--border))"}`,
          ...delay,
        }}
      >
        <div
          className="relative flex items-center justify-center shrink-0 rounded-xl text-[20px] text-white"
          style={{
            width: 44,
            height: 44,
            background: color.icon,
            boxShadow: `0 6px 14px -8px ${color.icon}`,
          }}
        >
          {item.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="m-0 text-[13.5px] font-extrabold leading-snug truncate"
            style={{ color: "rgb(var(--text))" }}
          >
            {label}
          </p>
          {hasChildren && (
            <p className="m-0 text-[11px] font-semibold" style={{ color: color.icon }}>
              {t("menu.itemsCount", "{n} items").replace(
                "{n}",
                String(item.children.length),
              )}
            </p>
          )}
        </div>
        {hasChildren ? (
          <FaChevronDown
            size={11}
            style={{
              color: color.icon,
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.28s ease",
            }}
          />
        ) : (
          <span className="text-lg opacity-40" style={{ color: "rgb(var(--text))" }}>
            ›
          </span>
        )}
      </button>
    );
  }

  /* Shared vertical shell for icon styles */
  let iconWrapStyle = {};
  let iconClass =
    "relative flex items-center justify-center shrink-0 transition-transform duration-200 group-active:scale-90";

  if (styleId === "solid") {
    iconClass += " rounded-[20px] text-white";
    iconWrapStyle = {
      width: 68,
      height: 68,
      fontSize: 28,
      background: `linear-gradient(145deg, ${color.icon}, color-mix(in srgb, ${color.icon} 72%, #000))`,
      boxShadow: `0 12px 22px -12px ${color.icon}cc`,
    };
  } else if (styleId === "soft") {
    iconClass += " rounded-[20px]";
    iconWrapStyle = {
      width: 68,
      height: 68,
      fontSize: 28,
      color: color.icon,
      background: `linear-gradient(160deg, ${color.bg} 0%, color-mix(in srgb, ${color.icon} 22%, ${color.bg}) 100%)`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.55), 0 10px 18px -10px ${color.icon}aa`,
    };
  } else if (styleId === "minimal") {
    iconClass += " rounded-2xl";
    iconWrapStyle = {
      width: 64,
      height: 64,
      fontSize: 30,
      color: color.icon,
      background: "transparent",
    };
  } else {
    /* glass (default) */
    iconClass += " rounded-full";
    iconWrapStyle = {
      width: 72,
      height: 72,
      fontSize: 28,
      color: color.icon,
      background: isOpen
        ? `color-mix(in srgb, ${color.icon} 22%, rgba(255,255,255,0.35))`
        : `color-mix(in srgb, ${color.icon} 14%, rgba(255,255,255,0.28))`,
      border: `1.5px solid color-mix(in srgb, ${color.icon} 35%, rgba(255,255,255,0.55))`,
      boxShadow: `
        inset 0 1px 0 rgba(255,255,255,0.65),
        0 8px 22px -12px ${color.icon}99,
        0 0 0 6px color-mix(in srgb, ${color.icon} 8%, transparent)
      `,
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
    };
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative flex flex-col items-center justify-start w-full",
        "min-h-[128px] px-2 pt-3 pb-3 select-none",
        "rounded-2xl transition-all duration-200",
        "active:scale-[0.94] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary))]",
        "menu-tile-enter",
      ].join(" ")}
      style={{ background: "transparent", ...delay }}
    >
      {styleId === "soft" && (
        <span
          className="pointer-events-none absolute top-5 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full blur-xl opacity-35"
          style={{ background: color.icon }}
        />
      )}
      <div className={iconClass} style={iconWrapStyle}>
        {item.icon}
        {hasChildren && <FolderBadge count={item.children.length} color={color} />}
      </div>
      <p
        className="relative mt-3 m-0 text-[13px] font-extrabold text-center leading-snug line-clamp-2 w-full tracking-tight"
        style={{ color: "rgb(var(--text))" }}
      >
        {label}
      </p>
      {openCue}
    </button>
  );
}

function ChildList({ children, color, parentName, onClose }) {
  const navigate = useNavigate();
  const { t, tn } = useLanguage();

  return (
    <div
      className="mt-1 mb-1 rounded-2xl border overflow-hidden"
      style={{
        background: "rgb(var(--surface))",
        borderColor: `${color.icon}33`,
        boxShadow: `0 10px 28px -18px ${color.icon}99`,
      }}
    >
      <div
        className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b"
        style={{
          borderColor: "rgb(var(--border))",
          background: `color-mix(in srgb, ${color.icon} 10%, rgb(var(--surface)))`,
        }}
      >
        <div className="min-w-0">
          <p
            className="text-[10px] font-bold uppercase tracking-wide"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {t("menu.folder", "Folder")}
          </p>
          <p
            className="text-[13px] font-extrabold truncate"
            style={{ color: "rgb(var(--text))" }}
          >
            {tn(parentName)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-95
            border border-[rgb(var(--border))] bg-[rgb(var(--bg))]"
          aria-label={t("common.close")}
        >
          <FaTimes size={11} className="text-[rgb(var(--text-muted))]" />
        </button>
      </div>

      <div className="flex flex-col p-2 gap-1">
        {children.map((child, idx) => (
          <button
            key={child.name}
            type="button"
            onClick={() => navigate(child.path)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-left
              active:scale-[0.98] transition-transform
              hover:bg-[rgba(var(--primary),0.05)]"
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 text-white"
              style={{ background: color.icon }}
            >
              {String(child.name).charAt(0)}
            </span>
            <span
              className="flex-1 text-[13.5px] font-bold"
              style={{ color: "rgb(var(--text))" }}
            >
              {tn(child.name)}
            </span>
            <span
              className="text-lg font-light leading-none"
              style={{ color: color.icon }}
            >
              ›
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function useGridColumns(styleId) {
  const [cols, setCols] = useState(2);

  useEffect(() => {
    const apply = () => {
      if (styleId === "list") {
        setCols(window.innerWidth >= 520 ? 2 : 1);
      } else {
        setCols(window.innerWidth >= 380 ? 3 : 2);
      }
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [styleId]);

  return cols;
}

/** Tiny layout sketch shown inside each style option. */
function MenuStylePreview({ id, active }) {
  const accent = active
    ? "rgb(var(--primary))"
    : "color-mix(in srgb, rgb(var(--text)) 28%, transparent)";
  const soft = active
    ? "color-mix(in srgb, rgb(var(--primary)) 22%, transparent)"
    : "color-mix(in srgb, rgb(var(--text)) 10%, transparent)";

  if (id === "list") {
    return (
      <div className="flex h-9 w-11 flex-col justify-center gap-1 px-0.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-sm shrink-0"
              style={{ background: accent }}
            />
            <span
              className="h-1 flex-1 rounded-full"
              style={{ background: soft }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (id === "minimal") {
    return (
      <div className="grid h-9 w-11 grid-cols-2 gap-1 place-content-center">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="mx-auto h-1.5 w-1.5 rounded-full"
            style={{ background: accent }}
          />
        ))}
      </div>
    );
  }

  if (id === "solid") {
    return (
      <div className="grid h-9 w-11 grid-cols-2 gap-1 place-content-center">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-3 w-3 rounded-md"
            style={{ background: accent }}
          />
        ))}
      </div>
    );
  }

  if (id === "soft") {
    return (
      <div className="grid h-9 w-11 grid-cols-2 gap-1 place-content-center">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="flex h-3.5 w-3.5 items-center justify-center rounded-lg"
            style={{ background: soft }}
          >
            <span
              className="h-1.5 w-1.5 rounded-sm"
              style={{ background: accent }}
            />
          </span>
        ))}
      </div>
    );
  }

  /* glass */
  return (
    <div className="grid h-9 w-11 grid-cols-2 gap-1 place-content-center">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="h-3.5 w-3.5 rounded-full border"
          style={{
            background: soft,
            borderColor: accent,
          }}
        />
      ))}
    </div>
  );
}

/** Compact visual picker for Topbar (mobile only). */
export function MenuStylePicker({ className = "" }) {
  const { t } = useLanguage();
  const [value, setValue] = useState(getSavedMenuStyle);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onChange = (e) => setValue(e.detail || getSavedMenuStyle());
    window.addEventListener(MENU_STYLE_EVENT, onChange);
    return () => window.removeEventListener(MENU_STYLE_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeOpt =
    MENU_STYLE_OPTIONS.find((o) => o.id === value) || MENU_STYLE_OPTIONS[0];

  const pick = (id) => {
    setValue(id);
    setSavedMenuStyle(id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("menu.style", "Menu style")}
        title={t("menu.style", "Menu style")}
        className="group flex h-9 items-center gap-1.5 rounded-xl border px-2 pl-2.5
          transition active:scale-[0.97]
          border-[rgb(var(--border))] bg-[rgb(var(--surface))]
          hover:border-[rgba(var(--primary),0.35)]
          hover:bg-[rgba(var(--primary),0.06)]"
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-lg text-white shadow-sm"
          style={{
            background:
              "linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--sidebar)) 100%)",
          }}
        >
          <FaThLarge size={10} />
        </span>
        <span className="max-w-[4.5rem] truncate text-left text-[11px] font-bold leading-tight text-[rgb(var(--text))]">
          {t(`menuStyle.${activeOpt.id}`, activeOpt.label)}
        </span>
        <FaChevronDown
          size={9}
          className={`opacity-45 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          style={{ color: "rgb(var(--text-muted))" }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t("menu.style", "Menu style")}
          className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-[min(18.5rem,calc(100vw-1rem))]
            overflow-hidden rounded-2xl border border-[rgb(var(--border))]
            bg-[rgb(var(--surface))] shadow-[0_12px_40px_rgba(0,0,0,0.14)]"
        >
          <div
            className="border-b border-[rgb(var(--border))] px-3.5 py-2.5"
            style={{
              background:
                "linear-gradient(135deg, rgba(var(--primary),0.10) 0%, transparent 70%)",
            }}
          >
            <p className="text-[12px] font-extrabold text-[rgb(var(--text))]">
              {t("menu.style", "Menu style")}
            </p>
            <p className="mt-0.5 text-[10.5px] font-medium text-[rgb(var(--text-muted))]">
              {t("menu.styleHint", "Choose how modules look on your menu")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-1.5 p-2">
            {MENU_STYLE_OPTIONS.map((opt) => {
              const active = value === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(opt.id)}
                  className={`flex items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition
                    active:scale-[0.99]
                    ${
                      active
                        ? "border-[rgba(var(--primary),0.45)] bg-[rgba(var(--primary),0.08)] shadow-sm"
                        : "border-transparent hover:bg-[rgba(var(--primary),0.05)]"
                    }`}
                >
                  <div
                    className={`flex shrink-0 items-center justify-center rounded-xl border px-1.5 py-1
                      ${
                        active
                          ? "border-[rgba(var(--primary),0.35)] bg-[rgb(var(--surface))]"
                          : "border-[rgb(var(--border))] bg-[rgba(var(--bg),0.65)]"
                      }`}
                  >
                    <MenuStylePreview id={opt.id} active={active} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-extrabold text-[rgb(var(--text))]">
                      {t(`menuStyle.${opt.id}`, opt.label)}
                    </p>
                    <p className="truncate text-[10px] font-medium text-[rgb(var(--text-muted))]">
                      {t(`menuStyle.${opt.id}Desc`, opt.label)}
                    </p>
                  </div>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition
                      ${
                        active
                          ? "bg-[rgb(var(--primary))] text-white"
                          : "border border-[rgb(var(--border))] text-transparent"
                      }`}
                  >
                    <FaCheck size={9} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Shared app-style module grid for role menu hubs.
 * Style picker + 2/3-col grid (or list) with search + folder expand.
 */
export function ModuleGrid({
  menu,
  colorMap,
  openItem,
  setOpenItem,
  isDark: _isDark,
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [styleId, setStyleId] = useState(getSavedMenuStyle);
  const cols = useGridColumns(styleId);
  const folderRef = useRef(null);

  useEffect(() => {
    const onChange = (e) => setStyleId(e.detail || getSavedMenuStyle());
    window.addEventListener(MENU_STYLE_EVENT, onChange);
    return () => window.removeEventListener(MENU_STYLE_EVENT, onChange);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return menu;
    return menu.filter((item) => {
      if (item.name.toLowerCase().includes(q)) return true;
      return item.children?.some((c) => c.name.toLowerCase().includes(q));
    });
  }, [menu, query]);

  // When searching, auto-expand matching folders that have child hits
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const folderHit = filtered.find(
      (item) =>
        item.children?.some((c) => c.name.toLowerCase().includes(q)) &&
        !item.name.toLowerCase().includes(q),
    );
    if (folderHit) setOpenItem(folderHit.name);
  }, [query, filtered, setOpenItem]);

  const openIndex = filtered.findIndex(
    (i) => i.name === openItem && i.children,
  );
  const openItemData = openIndex >= 0 ? filtered[openIndex] : null;
  const openColor = openItemData
    ? colorMap[openItemData.name] ?? DEFAULT_COLOR
    : DEFAULT_COLOR;

  // Insert folder panel after the last tile in the open item's row
  const insertAfter =
    openIndex >= 0
      ? Math.min(
          filtered.length - 1,
          Math.floor(openIndex / cols) * cols + (cols - 1),
        )
      : -1;

  useEffect(() => {
    if (!openItemData || !folderRef.current) return;
    const t = setTimeout(() => {
      folderRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
    return () => clearTimeout(t);
  }, [openItemData?.name]);

  const gridClass =
    styleId === "list"
      ? "grid grid-cols-1 min-[520px]:grid-cols-2 gap-2.5"
      : "grid grid-cols-2 min-[380px]:grid-cols-3 gap-3.5 sm:gap-4";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-0.5 gap-2">
        <h2
          className="text-[13px] font-extrabold uppercase tracking-wide"
          style={{ color: "rgb(var(--text-muted))" }}
        >
          {t("menu.allModules", "All modules")}
        </h2>
        <span
          className="text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full"
          style={{
            color: "rgb(var(--primary))",
            background: "rgba(var(--primary),0.1)",
          }}
        >
          {filtered.length}
          {filtered.length !== menu.length ? ` / ${menu.length}` : ""}
        </span>
      </div>

      {menu.length > 8 && (
        <div
          className="flex items-center gap-2 rounded-2xl px-3.5 h-11 border"
          style={{
            background: "rgb(var(--surface))",
            borderColor: "rgb(var(--border))",
          }}
        >
          <FaSearch
            size={13}
            className="shrink-0"
            style={{ color: "rgb(var(--text-muted))" }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("menu.searchModules", "Search modules…")}
            className="flex-1 bg-transparent outline-none text-[13.5px] font-semibold
              placeholder:font-medium"
            style={{ color: "rgb(var(--text))" }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-95"
              style={{ background: "rgb(var(--bg))" }}
              aria-label={t("common.close", "Close")}
            >
              <FaTimes size={10} style={{ color: "rgb(var(--text-muted))" }} />
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div
          className="rounded-2xl border px-4 py-10 text-center"
          style={{
            background: "rgb(var(--surface))",
            borderColor: "rgb(var(--border))",
          }}
        >
          <p
            className="text-sm font-bold"
            style={{ color: "rgb(var(--text))" }}
          >
            {t("menu.noneFound", "No modules found")}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {t("menu.trySearch", "Try a different search term")}
          </p>
        </div>
      ) : (
        <div className={gridClass}>
          {filtered.map((item, idx) => {
            const color = colorMap[item.name] ?? DEFAULT_COLOR;
            const isOpen = openItem === item.name;

            return (
              <React.Fragment key={item.name}>
                <MenuCard
                  item={item}
                  color={color}
                  globalIdx={idx}
                  isOpen={isOpen}
                  styleId={styleId}
                  onToggle={() => setOpenItem(isOpen ? null : item.name)}
                />
                {idx === insertAfter && (
                  <div ref={folderRef} className="col-span-full">
                    <AccordionPanel isOpen={Boolean(openItemData)}>
                      {openItemData && (
                        <ChildList
                          children={openItemData.children}
                          color={openColor}
                          parentName={openItemData.name}
                          onClose={() => setOpenItem(null)}
                        />
                      )}
                    </AccordionPanel>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes menuTileIn {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .menu-tile-enter {
          animation: menuTileIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .menu-tile-enter { animation: none; }
        }
      `}</style>
    </div>
  );
}
