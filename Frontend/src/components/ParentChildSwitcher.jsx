import { useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import UserAvatar from "./UserAvatar";

/**
 * Parent multi-child switcher — shows when loginAs=parent.
 * compact: topbar chip next to profile
 * card: full list (optional pages)
 */
export default function ParentChildSwitcher({
  className = "",
  variant = "card", // "card" | "compact"
  menuAlign = "right", // "left" | "right" — dropdown side for compact
}) {
  const { user, switchChild, switchingChild } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  if (user?.loginAs !== "parent") return null;

  const children = Array.isArray(user?.children) ? user.children : [];
  const activeId = String(user?.activeChildId || user?.student_id || "");
  const active =
    children.find((c) => String(c._id) === activeId) || children[0] || null;

  if (!active && children.length === 0) return null;

  const onPick = async (id) => {
    if (String(id) === activeId) {
      setOpen(false);
      return;
    }
    const ok = await switchChild(id);
    setOpen(false);
    if (ok) toast.success(t("parent.switched", "Switched active child"));
    else toast.error(t("parent.switchFailed", "Could not switch child"));
  };

  if (variant === "compact") {
    const canSwitch = children.length > 1;
    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (canSwitch) setOpen((v) => !v);
          }}
          disabled={switchingChild || !canSwitch}
          className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-xl border px-2 py-1 text-left transition active:scale-95 disabled:opacity-100 lg:h-10 lg:gap-2 lg:px-2.5"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--bg))",
            color: "rgb(var(--text))",
            cursor: canSwitch ? "pointer" : "default",
          }}
          aria-label={t("parent.activeChild", "Active child")}
          title={
            canSwitch
              ? t("parent.switchHint", "Tap to switch child").replace(
                  "{n}",
                  String(children.length),
                )
              : active?.name || ""
          }
        >
          <UserAvatar
            name={active?.name || user?.name}
            photoUrl={active?.photo_url || user?.photo_url}
            size="sm"
            className="!h-7 !w-7 !text-[10px] shrink-0"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11px] font-extrabold leading-tight sm:text-[12px]">
              {active?.name || "Child"}
            </span>
            {canSwitch && (
              <span
                className="hidden truncate text-[9px] font-semibold leading-tight sm:block"
                style={{ color: "rgb(var(--text-muted))" }}
              >
                {t("parent.switchShort", "Switch child")}
              </span>
            )}
          </span>
          {canSwitch && (
            <FaChevronDown size={9} className="shrink-0 opacity-55" />
          )}
        </button>

        {open && canSwitch && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              aria-label="Close"
              onClick={() => setOpen(false)}
            />
            <div
              className={`absolute z-50 mt-1.5 min-w-[15rem] max-w-[18rem] overflow-hidden rounded-2xl border shadow-lg ${
                menuAlign === "left" ? "left-0" : "right-0"
              }`}
              style={{
                background: "rgb(var(--surface))",
                borderColor: "rgb(var(--border))",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p
                className="border-b px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide"
                style={{
                  borderColor: "rgb(var(--border))",
                  color: "rgb(var(--text-muted))",
                }}
              >
                {t("parent.activeChild", "Active child")}
              </p>
              {children.map((c) => {
                const selected = String(c._id) === activeId;
                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => onPick(c._id)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[12px] font-bold hover:bg-[rgba(var(--primary),0.06)]"
                    style={{
                      color: "rgb(var(--text))",
                      background: selected
                        ? "rgba(var(--primary),0.08)"
                        : "transparent",
                    }}
                  >
                    <UserAvatar name={c.name} photoUrl={c.photo_url} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{c.name}</span>
                      <span
                        className="block truncate text-[10px] font-semibold"
                        style={{ color: "rgb(var(--text-muted))" }}
                      >
                        {[c.className, c.sectionName].filter(Boolean).join(" · ") ||
                          c.studentId}
                      </span>
                    </span>
                    {selected && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase text-white"
                        style={{ background: "rgb(var(--primary))" }}
                      >
                        {t("parent.active", "Active")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-[1.25rem] border px-3.5 py-3 ${className}`}
      style={{
        background: "rgb(var(--surface))",
        borderColor: "rgb(var(--border))",
        boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p
            className="text-[12px] font-extrabold"
            style={{ color: "rgb(var(--text))" }}
          >
            {t("parent.activeChild", "Active child")}
          </p>
          <p
            className="text-[10px] font-semibold"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {children.length > 1
              ? t(
                  "parent.switchHint",
                  "You have {n} children — tap to switch",
                ).replace("{n}", String(children.length))
              : t("parent.singleChild", "Linked student profile")}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {(children.length ? children : active ? [active] : []).map((c) => {
          const selected = String(c._id) === activeId;
          return (
            <button
              key={c._id}
              type="button"
              disabled={switchingChild || children.length <= 1}
              onClick={() => children.length > 1 && onPick(c._id)}
              className="flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.99] disabled:opacity-100"
              style={{
                borderColor: selected
                  ? "rgba(var(--primary),0.45)"
                  : "rgb(var(--border))",
                background: selected
                  ? "rgba(var(--primary),0.08)"
                  : "rgb(var(--bg))",
              }}
            >
              <UserAvatar
                name={c.name}
                photoUrl={c.photo_url}
                size="md"
                rounded="2xl"
              />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[13px] font-extrabold"
                  style={{ color: "rgb(var(--text))" }}
                >
                  {c.name}
                </p>
                <p
                  className="truncate text-[11px] font-semibold"
                  style={{ color: "rgb(var(--text-muted))" }}
                >
                  {[c.className, c.sectionName].filter(Boolean).join(" · ") ||
                    c.studentId ||
                    "—"}
                  {c.rollNo ? ` · #${c.rollNo}` : ""}
                </p>
              </div>
              {selected && (
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase text-white"
                  style={{ background: "rgb(var(--primary))" }}
                >
                  {t("parent.active", "Active")}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
