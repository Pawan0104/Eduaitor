//   import { FaBell, FaBars } from "react-icons/fa";
//   import { AiOutlineLogout } from "react-icons/ai";
//   import { useEffect, useState } from "react";
//   import { useAuth } from "../context/AuthContext";
//   import { useNavigate } from "react-router-dom";
//   import axios from "axios";
//   import { toast } from "react-toastify";

//   const Topbar = ({ toggleSidebar }) => {
//     const [time, setTime] = useState({});
//     const [openDropdown, setOpenDropdown] = useState(false);

//     // --- NEW NOTIFICATION STATES ---
//     const [notifications, setNotifications] = useState([]);
//     const [openNotifications, setOpenNotifications] = useState(false);

//     const { user } = useAuth();
//     const navigate = useNavigate();
//     const API = import.meta.env.VITE_API_URL;

//     const name = user?.name || user?.school_name || "User";
//     const role = user?.role || "User";
//     let path =  undefined;
//     // console.log(role)
//     if(role == "school_admin") path="/school";
//     else if(role=="teacher_admin") path="/teacher";
//     else path="/parent"
//     const userId = user?._id || null;

//     // --- FETCH NOTIFICATIONS ---
//     const fetchNotifications = async () => {
//       try {
//         const res = await axios.get(`${API}/notifications`, {
//           withCredentials: true,
//         });

//         setNotifications(res.data);
//       } catch (err) {
//         console.error("Notification fetch error");
//       }
//     };

//     // --- MARK AS READ ---
//     const handleMarkAsRead = async (id) => {
//       try {
//         await axios.patch(
//           `${API}/notifications/${id}/read`,
//           {},
//           { withCredentials: true },
//         );
//         // Update local state so the badge disappears immediately
//         setNotifications((prev) =>
//           prev.map((n) =>
//             n._id === id ? { ...n, readBy: [...n.readBy, user._id] } : n,
//           ),
//         );
//       } catch (err) {
//         console.error("Error marking read");
//       }
//     };

//     const unreadCount = notifications.filter(
//       (n) => !n.readBy?.includes(user?._id),
//     ).length;

//     const getInitials = (name) => {
//       if (!name) return "U";
//       return name
//         .split(" ")
//         .map((n) => n[0])
//         .join("")
//         .toUpperCase()
//         .slice(0, 2);
//     };

//     const initials = getInitials(name);

//   const logout = async () => {
//     try {
//       await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
//       toast.info("Logged out successfully");
//     } catch (err) {
//       toast.error("Logout failed");
//     }
//     localStorage.clear();
//     sessionStorage.clear();
//     navigate("/admin/login", { replace: true });
//   };

//   useEffect(() => {
//     fetchNotifications();
//     const updateTime = () => {
//       const now = new Date();
//       setTime({
//         t: now.toLocaleTimeString("en-IN", {
//           hour: "2-digit",
//           minute: "2-digit",
//         }),
//         d: now.toLocaleDateString("en-IN", {
//           weekday: "short",
//           day: "2-digit",
//           month: "short",
//         }),
//       });
//     };
//     updateTime();
//     const interval = setInterval(updateTime, 1000);
//     return () => clearInterval(interval);
//   }, []);

//   setInterval(() => {
//     fetchNotifications();
//   }, 300000); 

//   // clear notification on clear button-
//   // ─── ADD this function alongside handleMarkAsRead ──────────────────────────
//   const handleClearAll = async (e) => {
//     e.stopPropagation();
//     try {
//       const res = await axios.patch(
//         `${API}/notifications/clear-all`,
//         {},
//         { withCredentials: true },
//       );
//       if (res.status === 200) {
//         toast.success("All notifications cleared");
//         setNotifications([]); // instantly empty the UI list
//         setOpenNotifications(false); // close the dropdown
//       }
//     } catch (err) {
//       toast.error("Failed to clear notifications");
//       console.error("Error clearing notifications");
//     }
//   };

//   // Close both dropdowns on outside click
//   useEffect(() => {
//     const close = () => {
//       setOpenDropdown(false);
//       setOpenNotifications(false);
//     };
//     if (openDropdown || openNotifications)
//       window.addEventListener("click", close);
//     return () => window.removeEventListener("click", close);
//   }, [openDropdown, openNotifications]);

//   //  fetch color them function
//   const [theme, setTheme] = useState("");

// useEffect(() => {
//   const savedTheme = localStorage.getItem("theme");
//   if (savedTheme) {
//     setTheme(savedTheme);
//     document.documentElement.className = savedTheme;
//   }
// }, []);

//   useEffect(() => {
//     const savedTheme = localStorage.getItem("theme");
//     if (savedTheme) {
//       document.documentElement.className = savedTheme;
//     }
//   }, []);

  

//   return (
//     <header className="h-16 bg-[rgb(var(--bg))] backdrop-blur border-b border-[rgb(var(--border-strong))] flex items-center justify-between px-5 sticky top-0 z-30 shadow-md">
//       {/* LEFT */}
//       <div className="flex items-center gap-3">
//         <button
//           onClick={toggleSidebar}
//           className="lg:hidden text-[rgb(var(--text))] hover:text-[rgb(var(--text))]"
//         >
//           <FaBars size={18} />
//         </button>
//         <div className="flex items-center gap-2.5">
//           <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary))] flex items-center justify-center text-[rgb(var(--text))] text-lg shadow">
//             🎓
//           </div>
//           <div className="hidden sm:block">
//             <h1 className="text-base font-bold text-[rgb(var(--text))]">
//               EduAltor
//             </h1>
//             <p className="text-[11px] bg-[rgba(0,0,0,0.05)] ">
//               Track. Assess. Improve.
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* RIGHT */}
//       <div className="flex items-center gap-4">
//         <div className="hidden md:block text-right">
//           <p className="text-sm font-semibold text-[rgb(var(--text))]">
//             {time.t}
//           </p>
//           <p className="text-xs text-[rgb(var(--text))]">{time.d}</p>
//         </div>

//         {/* --- NOTIFICATION ICON & DROPDOWN --- */}
//         <div className="relative">
//           <div
//             onClick={(e) => {
//               e.stopPropagation();
//               setOpenNotifications(!openNotifications);
//             }}
//             className="w-10 h-10 flex items-center justify-center rounded-xl bg-[rgb(var(--bg))] hover:bg-[rgb(var(--bg-hover))] transition cursor-pointer"
//           >
//             <FaBell className="text-[rgb(var(--text))]" />
//           </div>

//           {unreadCount > 0 && (
//             <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-px rounded-full shadow">
//               {unreadCount}
//             </span>
//           )}

//           {openNotifications && (
//             <div
//               onClick={(e) => e.stopPropagation()}
//               className="absolute right-0 mt-3 w-72 md:w-80 bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden z-50 animate-fadeIn"
//             >
//               {/* ── HEADER ── */}
//               <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
//                 <span className="font-bold text-gray-700">Notifications</span>
//                 <div className="flex items-center gap-2">
//                   <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
//                     {unreadCount} New
//                   </span>
//                   {/* ── CLEAR ALL BUTTON ── */}
//                   {notifications.length > 0 && (
//                     <button
//                       onClick={handleClearAll}
//                       className="text-[10px] text-red-400 hover:text-red-600 font-medium transition"
//                       title="Clear all notifications"
//                     >
//                       ✕ Clear All
//                     </button>
//                   )}
//                 </div>
//               </div>

//               {/* ── LIST ── */}
//               <div className="max-h-80 overflow-y-auto">
//                 {notifications.length === 0 ? (
//                   <div className="p-8 text-center">
//                     <p className="text-3xl mb-2">🔔</p>
//                     <p className="text-gray-400 text-sm">
//                       You're all caught up!
//                     </p>
//                   </div>
//                 ) : (
//                   notifications.map((n) => (
//                     <div
//                       key={n._id}
//                       onClick={() => handleMarkAsRead(n._id)}
//                       className={`p-4 border-b cursor-pointer transition hover:bg-gray-50 
//               ${!n.readBy?.includes(user?._id) ? "bg-indigo-50/40 border-l-4 border-l-indigo-500" : ""}`}
//                     >
//                       <h4 className="text-sm font-bold text-gray-800">
//                         {n.title}
//                       </h4>
//                       <p className="text-xs text-gray-500 mt-1 line-clamp-2">
//                         {n.message}
//                       </p>
//                       <span className="text-[10px] text-gray-400 mt-2 block italic">
//                         {new Date(n.createdAt).toLocaleDateString("en-IN")}
//                       </span>
//                       <span>
//                         {!n.readBy?.includes(user?._id) && (
//                           <span
//                             className="w-2 h-2 bg-blue-500 text-xs p-1 rounded-xl"
//                             title="Read"
//                           >
//                             {" "}
//                             mark as read
//                           </span>
//                         )}
//                       </span>
//                     </div>
//                   ))
//                 )}
//               </div>

//               {/* ── FOOTER ── */}
//               <button className="w-full py-2.5 text-xs bg-[rgb(var(--surface))] text-[rgb(var(--text))]  border-t"
//             onClick={() => { setOpenNotifications(!openNotifications); navigate(`${path}/notification`);  }}
//               >
//                 View All Notifications
//               </button>
//             </div>
//           )}
//         </div>

        

//         {/* USER DROPDOWN */}
//         <div className="relative">
//           <div
//             onClick={(e) => {
//               e.stopPropagation();
//               setOpenDropdown(!openDropdown);
//             }}
//             className="flex items-center gap-3 cursor-pointer  px-2 py-1.5 rounded-xl transition"
//           >
//             <div className="hidden md:block text-right leading-tight">
//               <p className="text-sm font-semibold text-[rgb(var(--text))]">
//                 {name}
//               </p>
//               <p className="text-xs text-[rgb(var(--text))] capitalize">
//                 {role.replace("_", " ")}
//               </p>
//             </div>
//             <div className="w-10 h-10 rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--text))] flex items-center justify-center text-sm font-bold shadow">
//               {initials}
//             </div>
//           </div>

//           {openDropdown && (
//   <div
//     onClick={(e) => e.stopPropagation()}
//     className="absolute right-0 mt-3 w-56 bg-[rgb(var(--bg))] backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
//   >
//     {/* User Header */}
//     <div className="px-5 py-4 bg-gradient-to-b from-black/5 to-transparent">
//       <p className="text-sm font-bold tracking-tight text-[rgb(var(--text))]">
//         {name}
//       </p>
//       <p className="text-[10px] font-medium opacity-60 uppercase tracking-widest">
//         {role.replace("_", " ")}
//       </p>
//     </div>

//     {/* Modern Theme Section */}
//     <div className="px-5 py-4">
//       <div className="flex justify-between items-center mb-3">
//         <span className="text-[11px] font-bold text-[rgb(var(--text))] opacity-40 uppercase">Appearance</span>
//         <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-bold capitalize">
//           {theme.replace("theme-", "")}
//         </span>
//       </div>
      
//       <div className="flex items-center justify-between bg-black/5 p-2 rounded-xl">
//         {[
//           { id: "theme-light", color: "bg-white", border: "border-gray-200" },
//           { id: "theme-dark", color: "bg-slate-800", border: "border-slate-700" },
//           { id: "theme-blue", color: "bg-blue-500", border: "border-blue-400" },
//           { id: "theme-green", color: "bg-emerald-500", border: "border-emerald-400" },
//         ].map((t) => (
//           <button
//             key={t.id}
//             onClick={() => {
//               setTheme(t.id);
//               document.documentElement.className = t.id;
//               localStorage.setItem("theme", t.id);
//             }}
//             className={`relative group w-8 h-8 flex items-center justify-center transition-all duration-300`}
//           >
//             {/* The Outer Glow/Ring for Active Theme */}
//             {theme === t.id && (
//               <span className="absolute inset-0 rounded-full bg-orange-500/20 animate-pulse scale-125" />
//             )}
            
//             {/* The Main Color Ball */}
//             <div className={`
//               w-6 h-6 rounded-full ${t.color} ${t.border} border shadow-sm
//               transition-all duration-300 transform 
//               group-hover:scale-110 group-active:scale-90
//               ${theme === t.id ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-[rgb(var(--bg))]" : "opacity-80 hover:opacity-100"}
//             `} />
//           </button>
//         ))}
//       </div>
//     </div>

//     {/* Logout Button */}
//     <div className="p-2">
//       <button
//         onClick={logout}
//         className="group w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[rgb(var(--text))] hover:bg-red-500 hover:text-white rounded-xl transition-all duration-200"
//       >
//         <span className="transition-transform "><AiOutlineLogout /></span>
//         Logout
//       </button>
//     </div>
//   </div>
// )}
//         </div>
//       </div>

//       {/* ANIMATION STYLES */}
//       <style>{`
//         .animate-fadeIn {
//           animation: fadeIn 0.2s ease-out forwards;
//         }
//         @keyframes fadeIn {
//           from { opacity: 0; transform: translateY(-8px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//       `}</style>
//     </header>
//   );
// };

// export default Topbar;
import { FaBell, FaBars } from "react-icons/fa";
import { AiOutlineLogout } from "react-icons/ai";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const TYPE_COLORS = {
  general:    { bg: "bg-slate-100",   text: "text-slate-600",  dot: "bg-slate-400"   },
  exam:       { bg: "bg-violet-100",  text: "text-violet-600", dot: "bg-violet-500"  },
  result:     { bg: "bg-emerald-100", text: "text-emerald-600",dot: "bg-emerald-500" },
  attendance: { bg: "bg-amber-100",   text: "text-amber-600",  dot: "bg-amber-500"   },
  fee:        { bg: "bg-rose-100",    text: "text-rose-600",   dot: "bg-rose-500"    },
  diary:      { bg: "bg-sky-100",     text: "text-sky-600",    dot: "bg-sky-500"     },
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const Topbar = ({ toggleSidebar }) => {
  const [time, setTime]                   = useState({});
  const [openDropdown, setOpenDropdown]   = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [openNotif, setOpenNotif]         = useState(false);
  const [theme, setTheme]                 = useState("");

  const { user } = useAuth();
  const navigate  = useNavigate();
  const API       = import.meta.env.VITE_API_URL;

  const name   = user?.name || user?.school_name || "User";
  const role   = user?.role || "User";
  const userId = user?._id || null;

  let basePath = "/parent";
  if (role === "school_admin")   basePath = "/school";
  else if (role === "teacher_admin") basePath = "/teacher";

  // ─── FETCH TOPBAR NOTIFICATIONS ───────────────────────────────────────────
  // Uses /topbar endpoint which excludes dismissedBy for this user
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

  // ─── MARK ONE AS READ ────────────────────────────────────────────────────
  const handleMarkAsRead = async (id) => {
    try {
      await axios.patch(
        `${API}/notifications/${id}/read`, {}, { withCredentials: true }
      );
      // Update local state immediately — no refetch needed
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id ? { ...n, readBy: [...(n.readBy || []), userId] } : n
        )
      );
    } catch {
      // silent
    }
  };

  // ─── CLICK A NOTIFICATION: mark read + navigate to page ──────────────────
  const handleNotifClick = async (notif) => {
    // Mark as read immediately (don't await — fire and forget for snappy UX)
    if (!notif.readBy?.includes(userId)) {
      handleMarkAsRead(notif._id);
    }
    setOpenNotif(false);
    // Pass selectedId via router state so NotificationPage auto-selects it
    navigate(`${basePath}/notification`, { state: { selectedId: notif._id } });
  };

  // ─── MARK ALL AS READ ────────────────────────────────────────────────────
  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await axios.patch(
        `${API}/notifications/read-all`, {}, { withCredentials: true }
      );
      // Update all local notifications as read instantly
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          readBy: [...new Set([...(n.readBy || []), userId])],
        }))
      );
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  // ─── DISMISS ALL FROM TOPBAR ─────────────────────────────────────────────
  // Uses /dismiss-all endpoint → adds to dismissedBy (NOT clearedBy)
  // Notifications remain fully visible on the Notification Page
  const handleDismissAll = async (e) => {
    e.stopPropagation();
    try {
      await axios.patch(
        `${API}/notifications/dismiss-all`, {}, { withCredentials: true }
      );
      // Instantly clear topbar UI — page still shows all notifications
      setNotifications([]);
      setOpenNotif(false);
      toast.success("Notifications cleared from topbar");
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  const unreadCount = notifications.filter(
    (n) => !n.readBy?.includes(userId)
  ).length;

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      toast.info("Logged out successfully");
    } catch {
      toast.error("Logout failed");
    }
    localStorage.clear();
    sessionStorage.clear();
    navigate("/admin/login", { replace: true });
  };

  // ─── EFFECTS ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Load saved theme
    const saved = localStorage.getItem("theme");
    if (saved) { setTheme(saved); document.documentElement.className = saved; }
  }, []);

  useEffect(() => {
    // Clock + initial notification fetch
    const updateTime = () => {
      const now = new Date();
      setTime({
        t: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        d: now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }),
      });
    };
    updateTime();
    fetchNotifications();

    const clock = setInterval(updateTime, 1000);
    // Poll every 5 minutes — inside useEffect so only one interval ever exists
    const poll  = setInterval(fetchNotifications, 5 * 60 * 1000);

    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
  }, []); // runs once on mount

  // Close both dropdowns on outside click
  useEffect(() => {
    const close = () => { setOpenDropdown(false); setOpenNotif(false); };
    if (openDropdown || openNotif) window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [openDropdown, openNotif]);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <header className="h-16 bg-[rgb(var(--bg))] backdrop-blur border-b border-[rgb(var(--border-strong))] flex items-center justify-between px-5 sticky top-0 z-30 shadow-md">

      {/* LEFT */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden text-[rgb(var(--text))]"
        >
          <FaBars size={18} />
        </button>
        <div className="flex items-center gap-2.5 pl-2">
        {user?.school_logo ? (
          <img
            src={user.school_logo}
            alt="School Logo"
            className="w-auto h-16 rounded-xl object-contain "
          />
        ) : (
          <>
          <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary))] flex items-center justify-center text-lg shadow">
            🎓
          </div>
        
          <div className="hidden sm:block">
            <h1 className="text-base font-bold text-[rgb(var(--text))]">EduAltor</h1>
            <p className="text-[11px] opacity-50 text-[rgb(var(--text))]">Track. Assess. Improve.</p>
          </div>
          </>
)}
          
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">
        <div className="hidden md:block text-right">
          <p className="text-sm font-semibold text-[rgb(var(--text))]">{time.t}</p>
          <p className="text-xs opacity-60 text-[rgb(var(--text))]">{time.d}</p>
        </div>

        {/* ── BELL + DROPDOWN ───────────────────────────────────────────── */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setOpenNotif((v) => !v); }}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-[rgb(var(--surface))] hover:bg-[rgb(var(--bg-hover))] transition border border-[rgb(var(--border))]"
          >
            <FaBell className="text-[rgb(var(--text))]" size={15} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full px-1 shadow">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {openNotif && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-2 w-80 bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded-2xl shadow-2xl overflow-hidden z-50"
              style={{ animation: "notifSlide 0.18s ease-out" }}
            >
              {/* ── HEADER ── */}
              <div className="px-4 py-3 border-b border-[rgb(var(--border))] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[rgb(var(--text))]">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-[rgb(var(--primary))] hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={handleDismissAll}
                      className="text-[10px] text-rose-400 hover:text-rose-600 font-medium transition"
                      title="Dismiss from topbar — still visible on Notification Page"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* ── LIST ── */}
              <div className="max-h-[360px] overflow-y-auto divide-y divide-[rgb(var(--border))]">
                {notifications.length === 0 ? (
                  <div className="py-12 flex flex-col items-center gap-2">
                    <span className="text-3xl">🔔</span>
                    <p className="text-sm text-[rgb(var(--text-muted))]">
                      You're all caught up!
                    </p>
                    <button
                      onClick={() => { setOpenNotif(false); navigate(`${basePath}/notification`); }}
                      className="mt-1 text-xs text-[rgb(var(--primary))] hover:underline"
                    >
                      View all past notifications →
                    </button>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isUnread = !n.readBy?.includes(userId);
                    const colors   = TYPE_COLORS[n.notificationType] || TYPE_COLORS.general;
                    return (
                      <button
                        key={n._id}
                        onClick={() => handleNotifClick(n)}
                        className={`w-full text-left px-4 py-3 transition hover:bg-[rgb(var(--surface))] flex gap-3 items-start
                          ${isUnread ? "bg-[rgb(var(--surface))]" : ""}`}
                      >
                        {/* Colored dot */}
                        <div className="mt-1.5 flex-shrink-0">
                          <span className={`block w-2 h-2 rounded-full ${isUnread ? colors.dot : "bg-[rgb(var(--border))]"}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded ${colors.bg} ${colors.text}`}>
                              {n.notificationType}
                            </span>
                            <span className="text-[10px] text-[rgb(var(--text-muted))] flex-shrink-0">
                              {timeAgo(n.createdAt)}
                            </span>
                          </div>
                          <p className={`text-xs leading-snug truncate
                            ${isUnread
                              ? "font-semibold text-[rgb(var(--text))]"
                              : "font-medium text-[rgb(var(--text-muted))]"
                            }`}
                          >
                            {n.title}
                          </p>
                          <p className="text-[11px] text-[rgb(var(--text-muted))] line-clamp-1 mt-0.5">
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
                    onClick={() => { setOpenNotif(false); navigate(`${basePath}/notification`); }}
                    className="w-full py-2.5 text-xs font-medium text-[rgb(var(--primary))] hover:bg-[rgb(var(--surface))] transition"
                  >
                    View all notifications →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── USER DROPDOWN ─────────────────────────────────────────────── */}
        <div className="relative">
          <div
            onClick={(e) => { e.stopPropagation(); setOpenDropdown((v) => !v); }}
            className="flex items-center gap-3 cursor-pointer px-2 py-1.5 rounded-xl transition"
          >
            <div className="hidden md:block text-right leading-tight">
              <p className="text-sm font-semibold text-[rgb(var(--text))]">{name}</p>
              <p className="text-xs opacity-60 text-[rgb(var(--text))] capitalize">
                {role.replace("_", " ")}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--text))] flex items-center justify-center text-sm font-bold shadow">
              {getInitials(name)}
            </div>
          </div>

          {openDropdown && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-3 w-56 bg-[rgb(var(--bg))] backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
              style={{ animation: "notifSlide 0.18s ease-out" }}
            >
              <div className="px-5 py-4 bg-gradient-to-b from-black/5 to-transparent">
                <p className="text-sm font-bold tracking-tight text-[rgb(var(--text))]">{name}</p>
                <p className="text-[10px] font-medium opacity-60 uppercase tracking-widest">
                  {role.replace("_", " ")}
                </p>
              </div>

              <div className="px-5 py-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-bold text-[rgb(var(--text))] opacity-40 uppercase">
                    Appearance
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-bold capitalize">
                    {theme.replace("theme-", "")}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-black/5 p-2 rounded-xl">
                  {[
                    { id: "theme-light", color: "bg-white",       border: "border-gray-200"    },
                    { id: "theme-dark",  color: "bg-slate-800",   border: "border-slate-700"   },
                    { id: "theme-blue",  color: "bg-blue-500",    border: "border-blue-400"    },
                    { id: "theme-green", color: "bg-emerald-500", border: "border-emerald-400" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTheme(t.id);
                        document.documentElement.className = t.id;
                        localStorage.setItem("theme", t.id);
                      }}
                      className="relative group w-8 h-8 flex items-center justify-center"
                    >
                      {theme === t.id && (
                        <span className="absolute inset-0 rounded-full bg-orange-500/20 animate-pulse scale-125" />
                      )}
                      <div className={`
                        w-6 h-6 rounded-full ${t.color} ${t.border} border shadow-sm
                        transition-all transform group-hover:scale-110 group-active:scale-90
                        ${theme === t.id
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
                  Logout
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