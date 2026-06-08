import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import CreateNotification from "../components/CreateNotification.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const TYPE_COLORS = {
  general:    { bg: "bg-slate-100",   text: "text-slate-600"   },
  exam:       { bg: "bg-violet-100",  text: "text-violet-600"  },
  result:     { bg: "bg-emerald-100", text: "text-emerald-600" },
  attendance: { bg: "bg-amber-100",   text: "text-amber-600"   },
  fee:        { bg: "bg-rose-100",    text: "text-rose-600"    },
  diary:      { bg: "bg-sky-100",     text: "text-sky-600"     },
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
};

const NotificationPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [showCreate, setShowCreate]       = useState(false);
  const [filter, setFilter]               = useState("all"); // "all" | "unread"
  const [mobileView, setMobileView]       = useState("list"); // "list" | "detail"
  const [loading, setLoading]             = useState(true);

  const API      = import.meta.env.VITE_API_URL;
  const { user } = useAuth();
  const location = useLocation();

  // helper 
 const currentUserId =
  user?._id ||
  user?.id ||
  user?.school_id;
const isNotificationRead = (notification) => {
  if (!notification?.readBy || !currentUserId) return false;

  return notification.readBy.some((id) => {
    if (!id) return false;

    if (typeof id === "object" && id._id) {
      return id._id.toString() === currentUserId.toString();
    }

    return id.toString() === currentUserId.toString();
  });
};
const getPriority = (n) => {
  if (!n.startingDate) return 3;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(n.startingDate);
  start.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (start - today) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return 4; // passed
  if (diffDays <= 1) return 0; // today/tomorrow
  if (diffDays <= 3) return 1; // next 3 days
  if (diffDays <= 7) return 2; // this week

  return 3; // future
};

const sortedNotifications = [...notifications].sort((a, b) => {
  const priorityDiff = getPriority(a) - getPriority(b);

  if (priorityDiff !== 0) return priorityDiff;

  return new Date(b.createdAt) - new Date(a.createdAt);
});
  // ─── FETCH ALL NOTIFICATIONS (including dismissed ones) ──────────────────
  // Uses GET /notifications — no dismissedBy filter — full archive
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/notifications`, {
        withCredentials: true,
      });
      setNotifications(data);
      return data;
    } catch (err) {
      console.error(err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // ─── ON MOUNT: fetch then auto-select if came from topbar ────────────────
  useEffect(() => {
    fetchNotifications().then((data) => {
      const { selectedId } = location.state || {};
      if (selectedId) {
        const target = data.find((n) => n._id === selectedId);
        if (target) openNotif(target, data);
        // Clear router state so refresh doesn't re-trigger
        window.history.replaceState({}, "");
      }
    });
  }, []);

  // ─── OPEN NOTIFICATION + MARK AS READ ────────────────────────────────────
  const openNotif = async (notif, list) => {
    setSelectedNotif(notif);
    setShowCreate(false);
    setMobileView("detail");

    // Mark as read if not already
 if (!isNotificationRead(notif)) {
      try {
        await axios.patch(
          `${API}/notifications/${notif._id}/read`, {}, { withCredentials: true }
        );
        // Update local state — no full refetch needed
        const source = list || notifications;
        setNotifications(
          source.map((n) =>
            n._id === notif._id
              ? { ...n, readBy: [...(n.readBy || []), user._id || user.id] }
              : n
          )
        );
        // Also update selectedNotif so detail view shows correct read state
        setSelectedNotif((prev) => ({
          ...prev,
          readBy: [...(prev?.readBy || []), user._id || user.id ],
        }));
        fetchNotifications(); // Sync with server to get any other updates (optional)
      } catch {
        // silent — read state will sync on next fetch
      }
    }
  };

  const handleOpenCreate = () => {
    setShowCreate(true);
    setSelectedNotif(null);
    setMobileView("detail");
  };


  // ─── FILTER ──────────────────────────────────────────────────────────────
const visible = filter === "unread"
  ? sortedNotifications.filter((n) => !isNotificationRead(n))
  : sortedNotifications;
 const unreadCount = notifications.filter(
  (n) => !isNotificationRead(n)
).length;
  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full p-3 md:p-4 gap-3 md:gap-4">

      {/* ── MOBILE TOP BAR ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between md:hidden">
        {mobileView === "detail" ? (
          <button
            onClick={() => setMobileView("list")}
            className="flex items-center gap-1.5 text-sm font-medium text-[rgb(var(--primary))]"
          >
            ← Back
          </button>
        ) : (
          <h1 className="text-base font-bold text-[rgb(var(--text))]">
            Notifications
          </h1>
        )}
        {user.role === "school_admin" && mobileView === "list" && (
          <button
            onClick={handleOpenCreate}
            className="text-xs bg-[rgb(var(--primary))] text-white px-3 py-1.5 rounded-lg font-medium"
          >
            Create +
          </button>
        )}
      </div>

      {/* ── MAIN LAYOUT ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 gap-3 md:gap-4 overflow-hidden">

        {/* ── LEFT: LIST ───────────────────────────────────────────────── */}
        <div className={`
          flex flex-col bg-[rgb(var(--surface))] rounded-2xl border border-[rgb(var(--border))] overflow-hidden
          w-full md:w-[300px] lg:w-[320px] md:flex-shrink-0
          ${mobileView === "detail" ? "hidden md:flex" : "flex"}
        `}>

          {/* Header (desktop only) */}
          <div className="hidden md:flex p-4 border-b border-[rgb(var(--border))] items-center justify-between">
            <div>
              <h2 className="font-bold text-[rgb(var(--text))]">Notifications</h2>
              {unreadCount > 0 && (
                <p className="text-[11px] text-[rgb(var(--text-muted))]">
                  {unreadCount} unread
                </p>
              )}
            </div>
            {user.role === "school_admin" && (
              <button
                onClick={handleOpenCreate}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition
                  ${showCreate
                    ? "bg-[rgb(var(--border))] text-[rgb(var(--text-muted))]"
                    : "bg-[rgb(var(--primary))] text-white"
                  }`}
              >
                {showCreate ? "← List" : "Create +"}
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-[rgb(var(--border))]">
            {["all", "unread"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2 text-xs font-medium capitalize transition
                  ${filter === f
                    ? "text-[rgb(var(--primary))] border-b-2 border-[rgb(var(--primary))]"
                    : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
                  }`}
              >
                {f}
                {f === "unread" && unreadCount > 0 && (
                  <span className="ml-1 bg-rose-500 text-white text-[9px] px-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 divide-y divide-[rgb(var(--border))]">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-[rgb(var(--primary))] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <span className="text-4xl">🔔</span>
                <p className="text-sm text-[rgb(var(--text-muted))]">
                  {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                </p>
              </div>
            ) : (
              visible.map((n) => {
                const isUnread = !isNotificationRead(n);
               const isActive =
  (selectedNotif?._id === n._id ||
    selectedNotif?.id === n.id) &&
  !showCreate;
                const colors   = TYPE_COLORS[n.notificationType] || TYPE_COLORS.general;

                return (
                  <div
                    key={n._id}
                    onClick={() => openNotif(n)}
                    className={`relative px-4 py-3 cursor-pointer transition
                      ${isActive
                        ? "bg-[rgb(var(--primary))]/10 border-r-2 border-r-[rgb(var(--primary))]"
                        : "hover:bg-[rgb(var(--bg))]"
                      }`}
                  >
                    {/* Unread indicator dot */}
                    {isUnread && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[rgb(var(--primary))]" />
                    )}

                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded ${colors.bg} ${colors.text}`}>
                        {n.notificationType}
                      </span>
                      <span className="text-[10px] text-[rgb(var(--text-muted))]">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className={`text-sm truncate
                      ${isUnread
                        ? "font-semibold text-[rgb(var(--text))]"
                        : "font-medium text-[rgb(var(--text-muted))]"
                      }`}
                    >
                      {n.title}
                    </h3>
                    <p className="text-xs text-[rgb(var(--text-muted))] truncate mt-0.5">
                      {n.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: DETAIL or CREATE ──────────────────────────────────── */}
        <div className={`
          flex-1 bg-[rgb(var(--surface))] rounded-2xl border border-[rgb(var(--border))] overflow-y-auto min-w-0
          ${mobileView === "list" ? "hidden md:block" : "block"}
        `}>

          {showCreate ? (
            /* CREATE NOTIFICATION */
            <div className="p-4 md:p-6">
              <CreateNotification />
            </div>

          ) : selectedNotif ? (
            /* NOTIFICATION DETAIL */
            <div className="p-5 md:p-8">
              {/* Type badge */}
              {(() => {
                const colors = TYPE_COLORS[selectedNotif.notificationType] || TYPE_COLORS.general;
                return (
                  <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                    {selectedNotif.notificationType}
                  </span>
                );
              })()}

              {/* Title */}
              <h1 className="text-xl md:text-2xl font-bold text-[rgb(var(--text))] mt-4 mb-3 leading-snug">
                {selectedNotif.title}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap gap-3 text-xs md:text-sm text-[rgb(var(--text-muted))] mb-6">
                {(selectedNotif.startingDate || selectedNotif.endingDate) && (
                  <span className="flex items-center gap-1.5">
                    📅 {formatDate(selectedNotif.startingDate)}
                    {selectedNotif.endingDate && ` → ${formatDate(selectedNotif.endingDate)}`}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  🕐 {new Date(selectedNotif.createdAt).toLocaleString("en-US", {
                    dateStyle: "medium", timeStyle: "short",
                  })}
                </span>
                {/* Show read status */}
                <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium
                ${isNotificationRead(selectedNotif)
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-amber-100 text-amber-600"
                  }`}
                >
                 {isNotificationRead(selectedNotif)
  ? "✓ Read"
  : "● Unread"}
                </span>
              </div>

              <hr className="mb-6 border-[rgb(var(--border))]" />

              {/* Body */}
              <div className="text-[rgb(var(--text))] leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                {selectedNotif.message}
              </div>
            </div>

          ) : (
            /* EMPTY STATE */
            <div className="h-full flex flex-col items-center justify-center text-[rgb(var(--text-muted))] gap-3 py-16">
              <span className="text-5xl opacity-30">📬</span>
              <p className="text-sm">Select a notification to read it</p>
              {user.role === "school_admin" && (
                <button
                  onClick={handleOpenCreate}
                  className="mt-2 text-xs bg-[rgb(var(--primary))] text-white px-4 py-2 rounded-lg font-medium"
                >
                  Or create a new one +
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPage;