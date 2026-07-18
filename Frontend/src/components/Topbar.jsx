import { FaBell, FaThLarge, FaChevronLeft } from "react-icons/fa";
import { AiOutlineLogout } from "react-icons/ai";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import LanguageSwitcher from "./LanguageSwitcher";
import { MenuStylePicker } from "./RoleMenuShell";
import { clearSessionKeepPrefs } from "../utils/clearSessionKeepPrefs";

const TYPE_COLORS = {
  general: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  exam: { bg: "bg-violet-100", text: "text-violet-600", dot: "bg-violet-500" },
  result: {
    bg: "bg-emerald-100",
    text: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  attendance: {
    bg: "bg-amber-100",
    text: "text-amber-600",
    dot: "bg-amber-500",
  },
  fee: { bg: "bg-rose-100", text: "text-rose-600", dot: "bg-rose-500" },
  diary: { bg: "bg-sky-100", text: "text-sky-600", dot: "bg-sky-500" },
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const getInitials = (name) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const Topbar = ({ menuPath = "/" }) => {
  const [time, setTime] = useState({});
  const [openDropdown, setOpenDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [openNotif, setOpenNotif] = useState(false);
  const [theme, setTheme] = useState("");

  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const API = import.meta.env.VITE_API_URL;

  const name = user?.name || user?.school_name || "User";
  const role = user?.role || "User";
  const userId = user?._id || null;
  const loginAs = user?.loginAs;
  const onMenuHub = Boolean(menuPath && location.pathname === menuPath);
  const canGoBack = !onMenuHub && window.history.length > 1;

  let basePath = "/parent";
  if (role === "school_admin") basePath = "/school";
  else if (role === "teacher_admin") basePath = "/teacher";
  else if (role === "staff_admin") basePath = "/staff";
  else if (role === "super_admin") basePath = "/admin";
  else if (role === "student_admin")
    basePath = loginAs === "parent" ? "/parent" : "/student";

  const fetchNotifications = async () => {
    try {
      const { data } = await axios.get(`${API}/notifications/topbar`, {
        withCredentials: true,
      });
      setNotifications(data);
    } catch {
      // silent — topbar fetch failure shouldn't break the UI
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await axios.patch(
        `${API}/notifications/${id}/read`,
        {},
        { withCredentials: true },
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id ? { ...n, readBy: [...(n.readBy || []), userId] } : n,
        ),
      );
    } catch {
      // silent
    }
  };

  const handleNotifClick = async (notif) => {
    if (!notif.readBy?.includes(userId)) {
      handleMarkAsRead(notif._id);
    }
    setOpenNotif(false);
    navigate(`${basePath}/notification`, { state: { selectedId: notif._id } });
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await axios.patch(
        `${API}/notifications/read-all`,
        {},
        { withCredentials: true },
      );
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          readBy: [...new Set([...(n.readBy || []), userId])],
        })),
      );
    } catch {
      toast.error(t("topbar.markAllFailed"));
    }
  };

  const handleDismissAll = async (e) => {
    e.stopPropagation();
    try {
      await axios.patch(
        `${API}/notifications/dismiss-all`,
        {},
        { withCredentials: true },
      );
      setNotifications([]);
      setOpenNotif(false);
      toast.success(t("topbar.clearSuccess"));
    } catch {
      toast.error(t("topbar.clearFailed"));
    }
  };

  const unreadCount = notifications.filter(
    (n) => !n.readBy?.includes(userId),
  ).length;

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      toast.info(t("topbar.logoutSuccess"));
    } catch {
      toast.error(t("topbar.logoutFailed"));
    }
    clearSessionKeepPrefs();
    navigate("/admin/login", { replace: true });
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      setTheme(saved);
      document.documentElement.className = saved;
    }
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime({
        t: now.toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        }),
        d: now.toLocaleDateString(locale, {
          weekday: "short",
          day: "2-digit",
          month: "short",
        }),
      });
    };
    updateTime();
    fetchNotifications();

    const clock = setInterval(updateTime, 1000);
    const poll = setInterval(fetchNotifications, 5 * 60 * 1000);

    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
  }, [locale]);

  useEffect(() => {
    const close = () => {
      setOpenDropdown(false);
      setOpenNotif(false);
    };
    if (openDropdown || openNotif) window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [openDropdown, openNotif]);

  return (
    <header className="h-14 lg:h-16 bg-[rgb(var(--sidebar))] backdrop-blur border-b border-[rgb(var(--border-strong))] flex items-center justify-between px-3 sm:px-5 sticky top-0 z-30 shadow-md">
      {/* LEFT */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile: back (when nested) + Menu hub — desktop uses permanent sidebar */}
        {canGoBack && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="lg:hidden shrink-0 w-9 h-9 flex items-center justify-center rounded-xl
              bg-[rgb(var(--surface))] border border-[rgb(var(--border))]
              text-[rgb(var(--text))] active:scale-95 transition"
            aria-label="Back"
          >
            <FaChevronLeft size={14} />
          </button>
        )}
        {menuPath && (
          <button
            type="button"
            onClick={() => navigate(menuPath)}
            className={`lg:hidden shrink-0 w-9 h-9 flex items-center justify-center rounded-xl
              border active:scale-95 transition
              ${
                onMenuHub
                  ? "bg-[rgb(var(--primary))] text-white border-transparent"
                  : "bg-[rgb(var(--surface))] border-[rgb(var(--border))] text-[rgb(var(--primary))]"
              }`}
            aria-label="All modules"
          >
            <FaThLarge size={14} />
          </button>
        )}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pl-0.5 sm:pl-2">
          {user?.school_logo ? (
            <img
              src={user.school_logo}
              alt="School Logo"
              className="h-8 lg:h-10 w-auto max-w-28 lg:max-w-35 rounded-lg object-contain"
            />
          ) : (
            <>
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-[rgb(var(--primary))] flex items-center justify-center text-base lg:text-lg shadow shrink-0">
                🎓
              </div>
              <div className="min-w-0">
                <h1 className="text-sm lg:text-base font-bold text-[rgb(var(--text))] truncate">
                  EduAltor
                </h1>
                <p className="hidden lg:block text-[11px] opacity-50 text-[rgb(var(--text))]">
                  {t("brand.tagline")}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <MenuStylePicker />
        <LanguageSwitcher />

        <div className="hidden lg:block text-right">
          <p className="text-sm font-semibold text-[rgb(var(--text))]">
            {time.t}
          </p>
          <p className="text-xs opacity-60 text-[rgb(var(--text))]">{time.d}</p>
        </div>

        {/* ── BELL + DROPDOWN ───────────────────────────────────────────── */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenNotif((v) => !v);
            }}
            className="relative w-9 h-9 lg:w-10 lg:h-10 flex items-center justify-center
            rounded-xl bg-[rgb(var(--surface))]
            hover:bg-[rgba(var(--primary),0.08)] transition
            border border-[rgb(var(--border))] active:scale-95"
          >
            <FaBell className="text-[rgb(var(--text))]" size={14} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-4.5 h-4.5 bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full px-1 shadow">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {openNotif && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="card fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-17 sm:top-auto sm:mt-2 w-auto sm:w-80 overflow-hidden z-50"
            >
              {/* ── HEADER ── */}
              <div className="px-4 py-3 border-b border-[rgb(var(--border))] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs sm:text-sm text-[rgb(var(--text))]">
                    {t("topbar.notifications")}
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                      {unreadCount} {t("topbar.new")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-[rgb(var(--primary))] hover:underline font-medium"
                    >
                      {t("topbar.markAllRead")}
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={handleDismissAll}
                      className="text-[10px] text-rose-400 hover:text-rose-600 font-medium transition"
                      title="Dismiss from topbar — still visible on Notification Page"
                    >
                      {t("topbar.clear")}
                    </button>
                  )}
                </div>
              </div>

              {/* ── LIST ── */}
              <div className="max-h-62.5 sm:max-h-90 overflow-y-auto divide-y divide-[rgb(var(--border))]">
                {notifications.length === 0 ? (
                  <div className="py-12 flex flex-col items-center gap-2">
                    <span className="text-3xl">🔔</span>
                    <p className="text-sm text-[rgb(var(--text-muted))]">
                      {t("topbar.caughtUp")}
                    </p>
                    <button
                      onClick={() => {
                        setOpenNotif(false);
                        navigate(`${basePath}/notification`);
                      }}
                      className="mt-1 text-xs text-[rgb(var(--primary))] hover:underline"
                    >
                      {t("topbar.viewAllPast")}
                    </button>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isUnread = !n.readBy?.includes(userId);
                    const colors =
                      TYPE_COLORS[n.notificationType] || TYPE_COLORS.general;
                    return (
                      <button
                        key={n._id}
                        onClick={() => handleNotifClick(n)}
                        className={`w-full text-left px-4 py-3 transition hover:bg-[rgba(var(--primary),0.05)] flex gap-3 items-start
                          ${isUnread ? "bg-[rgba(var(--primary),0.04)]" : ""}`}
                      >
                        <div className="mt-1.5 shrink-0">
                          <span
                            className={`block w-2 h-2 rounded-full ${isUnread ? colors.dot : "bg-[rgb(var(--border))]"}`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span
                              className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded ${colors.bg} ${colors.text}`}
                            >
                              {n.notificationType}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-[rgb(var(--text-muted))] shrink-0">
                              {timeAgo(n.createdAt)}
                            </span>
                          </div>
                          <p
                            className={`text-[11px] sm:text-xs leading-snug truncate
                            ${
                              isUnread
                                ? "font-semibold text-[rgb(var(--text))]"
                                : "font-medium text-[rgb(var(--text-muted))]"
                            }`}
                          >
                            {n.title}
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-[rgb(var(--text-muted))] line-clamp-1 mt-0.5">
                            {n.message}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* ── FOOTER ── */}
              {notifications.length > 0 && (
                <div className="border-t border-[rgb(var(--border))]">
                  <button
                    onClick={() => {
                      setOpenNotif(false);
                      navigate(`${basePath}/notification`);
                    }}
                    className="w-full py-2.5 text-xs font-medium text-[rgb(var(--primary))] hover:bg-[rgba(var(--primary),0.05)] transition"
                  >
                    {t("topbar.viewAll")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── USER DROPDOWN ─────────────────────────────────────────────── */}
        <div className="relative">
          <div
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdown((v) => !v);
            }}
            className="flex items-center gap-3 cursor-pointer px-2 py-1.5 rounded-xl transition hover:bg-[rgba(var(--primary),0.06)]"
          >
            <div className="hidden md:block text-right leading-tight">
              <p className="text-sm font-semibold text-[rgb(var(--text))]">
                {name}
              </p>
              <p className="text-xs opacity-60 text-[rgb(var(--text))] capitalize">
                {loginAs ? loginAs : role.replace("_", " ")}
              </p>
            </div>
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-[rgb(var(--primary))] text-white flex items-center justify-center text-xs lg:text-sm font-bold shadow">
              {getInitials(name)}
            </div>
          </div>

          {openDropdown && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="card absolute right-0 mt-3 w-56 overflow-hidden"
              style={{ animation: "notifSlide 0.18s ease-out" }}
            >
              <div className="px-5 py-4 bg-linear-to-b from-[rgba(var(--primary),0.06)] to-transparent">
                <p className="text-sm font-bold tracking-tight text-[rgb(var(--text))]">
                  {name}
                </p>
                <p className="text-[10px] font-medium opacity-60 uppercase tracking-widest text-[rgb(var(--text))]">
                  {loginAs
                    ? loginAs.toUpperCase()
                    : role.replace("_", " ").toUpperCase()}
                </p>
              </div>

              <div className="px-5 py-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-bold text-[rgb(var(--text))] opacity-40 uppercase">
                    {t("common.appearance")}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-bold capitalize">
                    {theme.replace("theme-", "")}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-black/5 p-2 rounded-xl">
                  {[
                    {
                      id: "theme-light",
                      color: "bg-white",
                      border: "border-gray-200",
                    },
                    {
                      id: "theme-dark",
                      color: "bg-slate-800",
                      border: "border-slate-700",
                    },
                    {
                      id: "theme-blue",
                      color: "bg-blue-500",
                      border: "border-blue-400",
                    },
                    {
                      id: "theme-green",
                      color: "bg-emerald-500",
                      border: "border-emerald-400",
                    },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setTheme(opt.id);
                        document.documentElement.className = opt.id;
                        localStorage.setItem("theme", opt.id);
                      }}
                      className="relative group w-8 h-8 flex items-center justify-center"
                    >
                      {theme === opt.id && (
                        <span className="absolute inset-0 rounded-full bg-orange-500/20 animate-pulse scale-125" />
                      )}
                      <div
                        className={`
                        w-6 h-6 rounded-full ${opt.color} ${opt.border} border shadow-sm
                        transition-all transform group-hover:scale-110 group-active:scale-90
                        ${
                          theme === opt.id
                            ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-[rgb(var(--bg))]"
                            : "opacity-80 hover:opacity-100"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2">
                <button
                  onClick={logout}
                  className="group w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[rgb(var(--text))] hover:bg-red-500 hover:text-white rounded-xl transition-all"
                >
                  <AiOutlineLogout />
                  {t("common.logout")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes notifSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </header>
  );
};

export default Topbar;
