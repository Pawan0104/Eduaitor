// import { useState, useEffect } from "react";
// import { useLocation } from "react-router-dom";
// import axios from "axios";
// import CreateNotification from "../components/CreateNotification.jsx";
// import { useAuth } from "../context/AuthContext.jsx";

// const TYPE_COLORS = {
//   general:    { bg: "bg-slate-100",   text: "text-slate-600"   },
//   exam:       { bg: "bg-violet-100",  text: "text-violet-600"  },
//   result:     { bg: "bg-emerald-100", text: "text-emerald-600" },
//   attendance: { bg: "bg-amber-100",   text: "text-amber-600"   },
//   fee:        { bg: "bg-rose-100",    text: "text-rose-600"    },
//   diary:      { bg: "bg-sky-100",     text: "text-sky-600"     },
// };

// const formatDate = (dateString) => {
//   if (!dateString) return "—";
//   return new Date(dateString).toLocaleDateString("en-US", {
//     month: "short", day: "numeric", year: "numeric",
//   });
// };

// // Extract a clean filename for display when attachment.name is missing
// const getFileName = (att) => {
//   if (att.name) return att.name;
//   try {
//     const parts = att.url.split("/");
//     return decodeURIComponent(parts[parts.length - 1]);
//   } catch {
//     return "document.pdf";
//   }
// };

// const NotificationPage = () => {
//   const [notifications, setNotifications] = useState([]);
//   const [selectedNotif, setSelectedNotif] = useState(null);
//   const [showCreate, setShowCreate]       = useState(false);
//   const [filter, setFilter]               = useState("all");
//   const [mobileView, setMobileView]       = useState("list");
//   const [loading, setLoading]             = useState(true);

//   const API      = import.meta.env.VITE_API_URL;
//   const { user } = useAuth();
//   const location = useLocation();

//   const currentUserId =
//     user?._id ||
//     user?.id ||
//     user?.school_id;

//   const isNotificationRead = (notification) => {
//     if (!notification?.readBy || !currentUserId) return false;
//     return notification.readBy.some((id) => {
//       if (!id) return false;
//       if (typeof id === "object" && id._id) {
//         return id._id.toString() === currentUserId.toString();
//       }
//       return id.toString() === currentUserId.toString();
//     });
//   };

//   const getPriority = (n) => {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);

//   const relevantDate = n.startingDate || n.endingDate;
//   if (!relevantDate) return 5; // no date → bottom, sort by createdAt

//   const start = new Date(relevantDate);
//   start.setHours(0, 0, 0, 0);

//   // If endingDate exists and has fully passed → lowest priority
//   if (n.endingDate) {
//     const end = new Date(n.endingDate);
//     end.setHours(0, 0, 0, 0);
//     if (end < today) return 6;
//   }

//   const diffDays = Math.floor((start - today) / (1000 * 60 * 60 * 24));

//   // startingDate passed but event still ongoing (endingDate >= today)
//   if (diffDays < 0 && n.endingDate && new Date(n.endingDate) >= today) return 0;
//   if (diffDays < 0) return 6; // fully passed, no endingDate to save it

//   if (diffDays === 0) return 0; // today
//   if (diffDays === 1) return 1; // tomorrow
//   if (diffDays <= 3)  return 2; // next 3 days
//   if (diffDays <= 7)  return 3; // this week
//   return 4;                      // future
// };

//   const sortedNotifications = [...notifications].sort((a, b) => {
//     const priorityDiff = getPriority(a) - getPriority(b);
//     if (priorityDiff !== 0) return priorityDiff;
//     return new Date(b.createdAt) - new Date(a.createdAt);
//   });

//   const fetchNotifications = async () => {
//     try {
//       setLoading(true);
//       const { data } = await axios.get(`${API}/notifications`, {
//         withCredentials: true,
//       });
//       setNotifications(data);
//       return data;
//     } catch (err) {
//       console.error(err);
//       return [];
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//   const { selectedId } = location.state || {};

//   if (selectedId && notifications.length > 0) {
//     const target = notifications.find((n) => n._id === selectedId);
//     if (target) {
//       openNotif(target, notifications);
//       window.history.replaceState({}, "");
//     }
//   }
// }, [location.state, notifications]);

// useEffect(() => {
//   fetchNotifications();
// }, []);

//   const openNotif = async (notif, list) => {
//     setSelectedNotif(notif);
//     setShowCreate(false);
//     setMobileView("detail");

//     if (!isNotificationRead(notif)) {
//       try {
//         await axios.patch(
//           `${API}/notifications/${notif._id}/read`, {}, { withCredentials: true }
//         );
//         const source = list || notifications;
//         setNotifications(
//           source.map((n) =>
//             n._id === notif._id
//               ? { ...n, readBy: [...(n.readBy || []), user._id || user.id] }
//               : n
//           )
//         );
//         setSelectedNotif((prev) => ({
//           ...prev,
//           readBy: [...(prev?.readBy || []), user._id || user.id],
//         }));
//         fetchNotifications();
//       } catch {
//         // silent
//       }
//     }
//   };

//   const handleOpenCreate = () => {
//     setShowCreate(true);
//     setSelectedNotif(null);
//     setMobileView("detail");
//   };

//   const visible = filter === "unread"
//     ? sortedNotifications.filter((n) => !isNotificationRead(n))
//     : sortedNotifications;

//   const unreadCount = notifications.filter(
//     (n) => !isNotificationRead(n)
//   ).length;

//   return (
//     <div className="flex flex-col h-[calc(100vh-4rem)] w-full p-3 md:p-4 gap-3 md:gap-4">

//       {/* ── MOBILE TOP BAR ───────────────────────────────────────────────── */}
//       <div className="flex items-center justify-between md:hidden">
//         {mobileView === "detail" ? (
//           <button
//             onClick={() => setMobileView("list")}
//             className="flex items-center gap-1.5 text-sm font-medium text-[rgb(var(--primary))]"
//           >
//             ← Back
//           </button>
//         ) : (
//           <h1 className="text-base font-bold text-[rgb(var(--text))]">
//             Notifications
//           </h1>
//         )}
//         {user.role === "school_admin" && mobileView === "list" && (
//           <button
//             onClick={handleOpenCreate}
//             className="text-xs bg-[rgb(var(--primary))] text-white px-3 py-1.5 rounded-lg font-medium"
//           >
//             Create +
//           </button>
//         )}
//       </div>

//       {/* ── MAIN LAYOUT ──────────────────────────────────────────────────── */}
//       <div className="flex flex-1 gap-3 md:gap-4 overflow-hidden">

//         {/* ── LEFT: LIST ───────────────────────────────────────────────── */}
//         <div className={`
//           flex flex-col bg-[rgb(var(--surface))] rounded-2xl border border-[rgb(var(--border))] overflow-hidden
//           w-full md:w-[300px] lg:w-[320px] md:shrink-0
//           ${mobileView === "detail" ? "hidden md:flex" : "flex"}
//         `}>

//           <div className="hidden md:flex p-4 border-b border-[rgb(var(--border))] items-center justify-between">
//             <div>
//               <h2 className="font-bold text-[rgb(var(--text))]">Notifications</h2>
//               {unreadCount > 0 && (
//                 <p className="text-[11px] text-[rgb(var(--text-muted))]">
//                   {unreadCount} unread
//                 </p>
//               )}
//             </div>
//             {user.role === "school_admin" && (
//               <button
//                 onClick={handleOpenCreate}
//                 className={`text-xs px-3 py-1.5 rounded-lg font-medium transition
//                   ${showCreate
//                     ? "bg-[rgb(var(--border))] text-[rgb(var(--text-muted))]"
//                     : "bg-[rgb(var(--primary))] text-white"
//                   }`}
//               >
//                 {showCreate ? "← List" : "Create +"}
//               </button>
//             )}
//           </div>

//           <div className="flex border-b border-[rgb(var(--border))]">
//             {["all", "unread"].map((f) => (
//               <button
//                 key={f}
//                 onClick={() => setFilter(f)}
//                 className={`flex-1 py-2 text-xs font-medium capitalize transition
//                   ${filter === f
//                     ? "text-[rgb(var(--primary))] border-b-2 border-[rgb(var(--primary))]"
//                     : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
//                   }`}
//               >
//                 {f}
//                 {f === "unread" && unreadCount > 0 && (
//                   <span className="ml-1 bg-rose-500 text-white text-[9px] px-1 rounded-full">
//                     {unreadCount}
//                   </span>
//                 )}
//               </button>
//             ))}
//           </div>

//           <div className="overflow-y-auto flex-1 divide-y divide-[rgb(var(--border))]">
//             {loading ? (
//               <div className="flex items-center justify-center py-16">
//                 <div className="w-6 h-6 border-2 border-[rgb(var(--primary))] border-t-transparent rounded-full animate-spin" />
//               </div>
//             ) : visible.length === 0 ? (
//               <div className="flex flex-col items-center justify-center py-16 gap-2">
//                 <span className="text-4xl">🔔</span>
//                 <p className="text-sm text-[rgb(var(--text-muted))]">
//                   {filter === "unread" ? "No unread notifications" : "No notifications yet"}
//                 </p>
//               </div>
//             ) : (
//               visible.map((n) => {
//                 const isUnread = !isNotificationRead(n);
//                 const isActive =
//                   (selectedNotif?._id === n._id ||
//                     selectedNotif?.id === n.id) &&
//                   !showCreate;
//                 const colors = TYPE_COLORS[n.notificationType] || TYPE_COLORS.general;

//                 return (
//                   <div
//                     key={n._id}
//                     onClick={() => openNotif(n)}
//                     className={`relative px-4 py-3 cursor-pointer transition
//                       ${isActive
//                         ? "bg-[rgb(var(--primary))]/10 border-r-2 border-r-[rgb(var(--primary))]"
//                         : "hover:bg-[rgb(var(--bg))]"
//                       }`}
//                   >
//                     {isUnread && (
//                       <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[rgb(var(--primary))]" />
//                     )}

//                     <div className="flex items-center justify-between mb-1">
//                       <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded ${colors.bg} ${colors.text}`}>
//                         {n.notificationType}
//                       </span>
//                       <span className="text-[10px] text-[rgb(var(--text-muted))]">
//                         {new Date(n.createdAt).toLocaleDateString()}
//                       </span>
//                     </div>

//                     <h3 className={`text-sm truncate
//                       ${isUnread
//                         ? "font-semibold text-[rgb(var(--text))]"
//                         : "font-medium text-[rgb(var(--text-muted))]"
//                       }`}
//                     >
//                       {n.title}
//                     </h3>
//                     <p className="text-xs text-[rgb(var(--text-muted))] truncate mt-0.5">
//                       {n.message}
//                     </p>

//                     {/* Attachment indicator in list */}
//                     {n.attachments?.length > 0 && (
//                       <span className="inline-flex items-center gap-1 text-[10px] text-[rgb(var(--text-muted))] mt-1">
//                         📎 {n.attachments.length} file{n.attachments.length > 1 ? "s" : ""}
//                       </span>
//                     )}
//                   </div>
//                 );
//               })
//             )}
//           </div>
//         </div>

//         {/* ── RIGHT: DETAIL or CREATE ──────────────────────────────────── */}
//         <div className={`
//           flex-1 bg-[rgb(var(--surface))] rounded-2xl border border-[rgb(var(--border))] overflow-y-auto min-w-0
//           ${mobileView === "list" ? "hidden md:block" : "block"}
//         `}>

//           {showCreate ? (
//             <div className="p-4 md:p-6">
//               <CreateNotification />
//             </div>

//           ) : selectedNotif ? (
//             <div className="p-5 md:p-8">
//               {(() => {
//                 const colors = TYPE_COLORS[selectedNotif.notificationType] || TYPE_COLORS.general;
//                 return (
//                   <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
//                     {selectedNotif.notificationType}
//                   </span>
//                 );
//               })()}

//               <h1 className="text-xl md:text-2xl font-bold text-[rgb(var(--text))] mt-4 mb-3 leading-snug">
//                 {selectedNotif.title}
//               </h1>

//               <div className="flex flex-wrap gap-3 text-xs md:text-sm text-[rgb(var(--text-muted))] mb-6">
//                 {selectedNotif.startingDate && (
//                   <span className="flex items-center gap-1.5">
//                     📅 {formatDate(selectedNotif.startingDate)}
//                   </span>
//                 )}
//                 <span className="flex items-center gap-1.5">
//                   🕐 {new Date(selectedNotif.createdAt).toLocaleString("en-US", {
//                     dateStyle: "medium", timeStyle: "short",
//                   })}
//                 </span>
//                 <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium
//                 ${isNotificationRead(selectedNotif)
//                     ? "bg-emerald-100 text-emerald-600"
//                     : "bg-amber-100 text-amber-600"
//                   }`}
//                 >
//                   {isNotificationRead(selectedNotif) ? "✓ Read" : "● Unread"}
//                 </span>
//               </div>

//               <hr className="mb-6 border-[rgb(var(--border))]" />

//               <div className="text-[rgb(var(--text))] leading-relaxed whitespace-pre-wrap text-sm md:text-base">
//                 {selectedNotif.message}
//               </div>

//               {/* ── PDF ATTACHMENTS ───────────────────────────────── */}
//               {selectedNotif.attachments?.length > 0 && (
//                 <div className="mt-8">
//                   <h4 className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))] mb-3">
//                     Attachments ({selectedNotif.attachments.length})
//                   </h4>
//                   <div className="flex flex-col gap-2">
//                     {selectedNotif.attachments.map((att, i) => (
//                       <div
//                         key={att.public_id || i}
//                         className="flex items-center justify-between gap-3 rounded-xl border
//                           border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-3"
//                       >
//                         <div className="flex items-center gap-3 min-w-0">
//                           <span className="text-2xl shrink-0">📄</span>
//                           <div className="min-w-0">
//                             <p className="text-sm font-medium text-[rgb(var(--text))] truncate">
//                               {getFileName(att)}
//                             </p>
//                             <p className="text-[11px] text-[rgb(var(--text-muted))]">PDF document</p>
//                           </div>
//                         </div>

//                         <div className="flex items-center gap-2 shrink-0">
//                           {/* View in new tab */}
//                           {/* <a
//        href={att.url.replace("/upload/", "/upload/fl_attachment:false/")}
//   target="_blank"
//   rel="noopener noreferrer"
//   className="text-xs font-medium px-3 py-1.5 rounded-lg
//     bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]
//     hover:bg-[rgb(var(--primary))]/20 transition-colors"
// >
//   View
//                           </a> */}
//                           {/* Force download — fl_attachment triggers Cloudinary download */}
//                           <a
        
//   href={att.url.replace("/upload/", "/upload/fl_attachment/")}
//   download
//   className="text-xs font-medium px-3 py-1.5 rounded-lg
//     bg-[rgb(var(--primary))] text-white
//     hover:opacity-90 transition-opacity"
// >
//   ⬇ Download
// </a>             </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>

//           ) : (
//             <div className="h-full flex flex-col items-center justify-center text-[rgb(var(--text-muted))] gap-3 py-16">
//               <span className="text-5xl opacity-30">📬</span>
//               <p className="text-sm">Select a notification to read it</p>
//               {user.role === "school_admin" && (
//                 <button
//                   onClick={handleOpenCreate}
//                   className="mt-2 text-xs bg-[rgb(var(--primary))] text-white px-4 py-2 rounded-lg font-medium"
//                 >
//                   Or create a new one +
//                 </button>
//               )}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default NotificationPage;


import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import CreateNotification from "../components/CreateNotification.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const TYPE_COLORS = {
  general:    { bg: "bg-slate-100",   text: "text-slate-600"   },
  exam:       { bg: "bg-violet-100",  text: "text-violet-600"  },
  result:     { bg: "bg-emerald-100", text: "text-emerald-600" },
  attendance: { bg: "bg-amber-100",   text: "text-amber-600"   },
  fee:        { bg: "bg-rose-100",    text: "text-rose-600"    },
  diary:      { bg: "bg-sky-100",     text: "text-sky-600"     },
  homework:   { bg: "bg-amber-100",   text: "text-amber-700"   },
  daily_learning: { bg: "bg-indigo-100", text: "text-indigo-700" },
  transport:  { bg: "bg-blue-100",    text: "text-blue-700"    },
  gatepass:   { bg: "bg-orange-100",  text: "text-orange-700"  },
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
};

// Extract a clean filename for display when attachment.name is missing
const getFileName = (att) => {
  if (att.name) return att.name;
  try {
    const parts = att.url.split("/");
    return decodeURIComponent(parts[parts.length - 1]);
  } catch {
    return "document.pdf";
  }
};

const NotificationPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [showCreate, setShowCreate]       = useState(false);
  const [editingNotif, setEditingNotif]   = useState(null);   // notification being edited, or null = creating fresh
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [filter, setFilter]               = useState("all");
  const [mobileView, setMobileView]       = useState("list");
  const [loading, setLoading]             = useState(true);

  const API      = import.meta.env.VITE_API_URL;
  const { user } = useAuth();
  const location = useLocation();

  const currentUserId =
    user?._id ||
    user?.id ||
    user?.school_id;

  // school_admin manages notifications by default; a staff member only
  // gets management rights if their staffRole is specifically "administrator"
  // (same check used in StaffDashboard for routing to SchoolDashboard)
  const canManage =
    user?.role === "school_admin" ||
    (user?.role === "staff_admin" && user?.staffRole === "administrator");

  const EDIT_WINDOW_MINUTES = 10;

  const isOwnNotification = (n) => {
    const createdById = n.createdBy?._id || n.createdBy;
    return createdById && currentUserId && createdById.toString() === currentUserId.toString();
  };

  const isWithinEditWindow = (n) => {
    const now = Date.now();
    if (n.status === "scheduled" && n.scheduledAt && new Date(n.scheduledAt) > now) {
      return true; // hasn't gone out yet — always editable
    }
    const minutesSince = (now - new Date(n.createdAt).getTime()) / 60000;
    return minutesSince <= EDIT_WINDOW_MINUTES;
  };

  const canEditOrDelete = (n) => canManage && isOwnNotification(n) && isWithinEditWindow(n);


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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const relevantDate = n.startingDate || n.endingDate;
  if (!relevantDate) return 5; // no date → bottom, sort by createdAt

  const start = new Date(relevantDate);
  start.setHours(0, 0, 0, 0);

  // If endingDate exists and has fully passed → lowest priority
  if (n.endingDate) {
    const end = new Date(n.endingDate);
    end.setHours(0, 0, 0, 0);
    if (end < today) return 6;
  }

  const diffDays = Math.floor((start - today) / (1000 * 60 * 60 * 24));

  // startingDate passed but event still ongoing (endingDate >= today)
  if (diffDays < 0 && n.endingDate && new Date(n.endingDate) >= today) return 0;
  if (diffDays < 0) return 6; // fully passed, no endingDate to save it

  if (diffDays === 0) return 0; // today
  if (diffDays === 1) return 1; // tomorrow
  if (diffDays <= 3)  return 2; // next 3 days
  if (diffDays <= 7)  return 3; // this week
  return 4;                      // future
};

  const sortedNotifications = [...notifications].sort((a, b) => {
    const priorityDiff = getPriority(a) - getPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

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

  useEffect(() => {
  const { selectedId } = location.state || {};

  if (selectedId && notifications.length > 0) {
    const target = notifications.find((n) => n._id === selectedId);
    if (target) {
      openNotif(target, notifications);
      window.history.replaceState({}, "");
    }
  }
}, [location.state, notifications]);

useEffect(() => {
  fetchNotifications();
}, []);

  const openNotif = async (notif, list) => {
    setSelectedNotif(notif);
    setShowCreate(false);
    setEditingNotif(null);
    setConfirmingDelete(false);
    setMobileView("detail");

    if (!isNotificationRead(notif)) {
      try {
        await axios.patch(
          `${API}/notifications/${notif._id}/read`, {}, { withCredentials: true }
        );
        const source = list || notifications;
        setNotifications(
          source.map((n) =>
            n._id === notif._id
              ? { ...n, readBy: [...(n.readBy || []), user._id || user.id] }
              : n
          )
        );
        setSelectedNotif((prev) => ({
          ...prev,
          readBy: [...(prev?.readBy || []), user._id || user.id],
        }));
        fetchNotifications();
      } catch {
        // silent
      }
    }
  };

  const handleOpenCreate = () => {
    setEditingNotif(null);
    setShowCreate(true);
    setSelectedNotif(null);
    setConfirmingDelete(false);
    setMobileView("detail");
  };

  const handleOpenEdit = (notif) => {
    setEditingNotif(notif);
    setShowCreate(true);
    setSelectedNotif(null);
    setConfirmingDelete(false);
    setMobileView("detail");
  };

  const closeForm = () => {
    setShowCreate(false);
    setEditingNotif(null);
    setMobileView(selectedNotif ? "detail" : "list");
  };

  const handleFormSuccess = async (updatedNotif) => {
    const wasEditing = editingNotif;
    const fresh = await fetchNotifications();

    if (wasEditing) {
      const match = updatedNotif || fresh.find((n) => n._id === wasEditing._id);
      setShowCreate(false);
      setEditingNotif(null);
      setSelectedNotif(match || null);
      setMobileView(match ? "detail" : "list");
    }
    // create mode: stay on the form (list refreshes silently in the background)
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/notifications/${id}`, { withCredentials: true });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setSelectedNotif(null);
      setConfirmingDelete(false);
      setMobileView("list");
      toast.success("Notification deleted");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to delete notification");
    } finally {
      setDeleting(false);
    }
  };

  const visible = filter === "unread"
    ? sortedNotifications.filter((n) => !isNotificationRead(n))
    : sortedNotifications;

  const unreadCount = notifications.filter(
    (n) => !isNotificationRead(n)
  ).length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full p-3 md:p-4 gap-3 md:gap-4">

      {/* ── MOBILE TOP BAR ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between md:hidden">
        {mobileView === "detail" ? (
          <button
            onClick={() => setMobileView("list")}
            className="flex items-center gap-1.5 text-sm font-medium text-[rgb(var(--primary))] active:opacity-60"
          >
            ← Back
          </button>
        ) : (
          <h1 className="text-base font-bold text-[rgb(var(--text))]">
            Notifications
          </h1>
        )}
        {canManage && mobileView === "list" && (
          <button
            onClick={handleOpenCreate}
            className="text-xs bg-[rgb(var(--primary))] text-white px-3 py-1.5 rounded-lg font-semibold
              transition active:scale-95 hover:opacity-90"
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
          w-full md:w-[300px] lg:w-[320px] md:shrink-0
          ${mobileView === "detail" ? "hidden md:flex" : "flex"}
        `}>

          <div className="hidden md:flex p-4 border-b border-[rgb(var(--border))] items-center justify-between">
            <div>
              <h2 className="font-bold text-[rgb(var(--text))]">Notifications</h2>
              {unreadCount > 0 && (
                <p className="text-[11px] text-[rgb(var(--text-muted))] mt-0.5">
                  {unreadCount} unread
                </p>
              )}
            </div>
            {canManage && (
              <button
                onClick={() => (showCreate ? closeForm() : handleOpenCreate())}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition active:scale-95
                  ${showCreate
                    ? "bg-[rgb(var(--border))] text-[rgb(var(--text-muted))]"
                    : "bg-[rgb(var(--primary))] text-white hover:opacity-90"
                  }`}
              >
                {showCreate ? "← List" : "Create +"}
              </button>
            )}
          </div>

          <div className="flex border-b border-[rgb(var(--border))]">
            {["all", "unread"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors
                  ${filter === f
                    ? "text-[rgb(var(--primary))] border-b-2 border-[rgb(var(--primary))]"
                    : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
                  }`}
              >
                {f}
                {f === "unread" && unreadCount > 0 && (
                  <span className="ml-1.5 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

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
                const colors = TYPE_COLORS[n.notificationType] || TYPE_COLORS.general;

                return (
                  <div
                    key={n._id}
                    onClick={() => openNotif(n)}
                    className={`relative px-4 py-3 cursor-pointer transition-colors
                      ${isActive
                        ? "bg-[rgb(var(--primary))]/10 border-r-2 border-r-[rgb(var(--primary))]"
                        : "hover:bg-[rgb(var(--bg))]"
                      }`}
                  >
                    {isUnread && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[rgb(var(--primary))]" />
                    )}

                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
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

                    {/* Attachment indicator in list */}
                    {n.attachments?.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[rgb(var(--text-muted))] mt-1.5">
                        📎 {n.attachments.length} file{n.attachments.length > 1 ? "s" : ""}
                      </span>
                    )}
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
            <div className="p-4 md:p-6">
              <CreateNotification
                key={editingNotif?._id || "new"}
                initialData={editingNotif}
                onSuccess={handleFormSuccess}
                onCancel={closeForm}
              />
            </div>

          ) : selectedNotif ? (
            <div className="p-5 md:p-8">
              <div className="flex items-start justify-between gap-3">
                  {canManage && (
  <p className="text-[10px] text-rose-500 mb-2 w-full">
    only editable in 10 minutes time period after creation
  </p>
)}
                {(() => {
                  const colors = TYPE_COLORS[selectedNotif.notificationType] || TYPE_COLORS.general;
                  return (
                    <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                      {selectedNotif.notificationType}
                    </span>
                  );
                })()}

                {canEditOrDelete(selectedNotif) && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(selectedNotif)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border
                        border-[rgb(var(--border))] text-[rgb(var(--text))]
                        hover:bg-[rgb(var(--bg))] transition"
                    >
                      ✏️ Edit
                    </button>

                    {confirmingDelete ? (
                      <>
                        <button
                          onClick={() => handleDelete(selectedNotif._id)}
                          disabled={deleting}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg
                            bg-rose-500 text-white hover:opacity-90 transition disabled:opacity-50"
                        >
                          {deleting ? "Deleting…" : "Confirm delete"}
                        </button>
                        <button
                          onClick={() => setConfirmingDelete(false)}
                          className="text-xs font-medium px-2 py-1.5 text-[rgb(var(--text-muted))]
                            hover:text-[rgb(var(--text))] transition"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmingDelete(true)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border
                          border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                )}
              </div>

              <h1 className="text-xl md:text-2xl font-bold text-[rgb(var(--text))] mt-4 mb-3 leading-snug">
                {selectedNotif.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-[rgb(var(--text-muted))] mb-6">
                {selectedNotif.startingDate && (
                  <span className="flex items-center gap-1.5">
                    📅 {formatDate(selectedNotif.startingDate)}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  🕐 {new Date(selectedNotif.createdAt).toLocaleString("en-US", {
                    dateStyle: "medium", timeStyle: "short",
                  })}
                </span>
                <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium
                ${isNotificationRead(selectedNotif)
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {isNotificationRead(selectedNotif) ? "✓ Read" : "● Unread"}
                </span>
              </div>

              <hr className="mb-6 border-[rgb(var(--border))]" />

              <div className="text-[rgb(var(--text))] leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                {selectedNotif.message}
              </div>

              {/* ── PDF ATTACHMENTS ───────────────────────────────── */}
              {selectedNotif.attachments?.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))] mb-3">
                    Attachments ({selectedNotif.attachments.length})
                  </h4>
                  <div className="flex flex-col gap-2">
                    {selectedNotif.attachments.map((att, i) => (
                      <div
                        key={att.public_id || i}
                        className="flex items-center justify-between gap-3 rounded-xl border
                          border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-3
                          transition hover:border-[rgb(var(--border-strong))]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
                            bg-[rgb(var(--primary))]/10 text-lg">
                            📄
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[rgb(var(--text))] truncate">
                              {getFileName(att)}
                            </p>
                            <p className="text-[11px] text-[rgb(var(--text-muted))]">PDF document</p>
                          </div>
                        </div>

                        {/* Force download — fl_attachment triggers Cloudinary download */}
                        <a
                          href={att.url.replace("/upload/", "/upload/fl_attachment/")}
                          download
                          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg
                            bg-[rgb(var(--primary))] text-white
                            hover:opacity-90 active:scale-95 transition"
                        >
                          ⬇ Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[rgb(var(--text-muted))] gap-3 py-16">
              <span className="text-5xl opacity-30">📬</span>
              <p className="text-sm">Select a notification to read it</p>
              {canManage && (
                <button
                  onClick={handleOpenCreate}
                  className="mt-2 text-xs bg-[rgb(var(--primary))] text-white px-4 py-2 rounded-lg font-medium
                    transition hover:opacity-90 active:scale-95"
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