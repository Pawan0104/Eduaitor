import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCalendarAlt, FaCheck, FaChevronDown } from "react-icons/fa";
import { useAcademicSession } from "../context/AcademicSessionContext";
import { useAuth } from "../context/AuthContext";

/**
 * Header academic-session switcher.
 *
 * Admins get a dropdown that re-scopes the whole ERP. Teachers, parents and
 * students see the active session as a read-only badge (the API also ignores
 * their session header).
 */
const AcademicSessionSwitcher = () => {
  const { user } = useAuth();
  const { sessions, selectedName, activeName, canSwitch, switchSession } =
    useAcademicSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!boxRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  if (!selectedName) return null;

  const role = user?.role || "";
  const managePath =
    role === "staff_admin"
      ? "/staff/academic-sessions"
      : role === "school_admin"
        ? "/school/academic-sessions"
        : "";

  const label = selectedName === activeName ? selectedName : `${selectedName}*`;

  if (!canSwitch) {
    return (
      <span
        className="flex h-9 items-center gap-1.5 rounded-xl border border-[rgb(var(--border))]
          bg-[rgb(var(--bg))] px-2.5 text-[11px] font-semibold text-[rgb(var(--text))]
          lg:h-10 lg:px-3 lg:text-xs"
        title="Academic session"
      >
        <FaCalendarAlt size={12} className="opacity-70" />
        <span className="hidden sm:inline">{selectedName}</span>
      </span>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="flex h-9 items-center gap-1.5 rounded-xl border border-[rgb(var(--border))]
          bg-[rgb(var(--surface))] px-2.5 text-[11px] font-semibold text-[rgb(var(--text))]
          transition hover:bg-[rgba(var(--primary),0.08)] active:scale-95
          lg:h-10 lg:px-3 lg:text-xs"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Academic session"
      >
        <FaCalendarAlt size={12} className="opacity-70" />
        <span className="hidden sm:inline">{label}</span>
        <FaChevronDown
          size={9}
          className={`opacity-60 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="card absolute right-0 z-50 mt-2 w-56 overflow-hidden"
          onClick={(event) => event.stopPropagation()}
          role="listbox"
        >
          <div className="border-b border-[rgb(var(--border))] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">
              Academic session
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {sessions.map((session) => {
              const isSelected = session.name === selectedName;
              return (
                <button
                  key={session._id || session.name}
                  type="button"
                  onClick={() => switchSession(session.name)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs
                    transition hover:bg-[rgba(var(--primary),0.08)] ${
                      isSelected ? "font-bold" : ""
                    }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="flex items-center gap-2">
                    <span>{session.name}</span>
                    {session.isActive && (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                        Active
                      </span>
                    )}
                  </span>
                  {isSelected && <FaCheck size={10} className="text-cyan-600" />}
                </button>
              );
            })}
          </div>
          {managePath && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate(managePath);
              }}
              className="w-full border-t border-[rgb(var(--border))] px-3 py-2 text-left text-xs font-semibold text-cyan-700 hover:bg-[rgba(var(--primary),0.08)]"
            >
              Manage sessions
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AcademicSessionSwitcher;
