// import { useState, useEffect, useCallback } from "react";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import { useAuth } from "../../context/AuthContext";
// import { FiSearch, FiArrowLeft } from "react-icons/fi";

// const API = import.meta.env.VITE_API_URL;

// // ─────────────────────────────────────────────────────────────
// // HELPER — Avatar with initials fallback
// // ─────────────────────────────────────────────────────────────
// const Avatar = ({ photo, name, size = 48 }) => {
//   const initials = name
//     ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
//     : "?";

//   if (photo) {
//     return (
//       <img
//         src={photo}
//         alt={name}
//         style={{ width: size, height: size }}
//         className="rounded-full object-cover shrink-0"
//       />
//     );
//   }

//   return (
//     <div
//       className="rounded-full shrink-0 flex items-center justify-center
//                  text-sm font-semibold"
//       style={{
//         width: size,
//         height: size,
//         backgroundColor: "rgb(var(--surface))",
//         color: "rgb(var(--primary))",
//       }}
//     >
//       {initials}
//     </div>
//   );
// };

// // ─────────────────────────────────────────────────────────────
// // COMPONENT — single user row
// // ─────────────────────────────────────────────────────────────
// const UserItem = ({ user, onClick, loading }) => (
//   <div
//     onClick={() => !loading && onClick(user)}
//     className="flex items-center gap-3 px-4 py-3 border-b transition-colors"
//     style={{
//       borderColor: "rgb(var(--border))",
//       cursor: loading ? "not-allowed" : "pointer",
//       opacity: loading ? 0.5 : 1,
//     }}
//     onMouseEnter={(e) => {
//       if (!loading)
//         e.currentTarget.style.backgroundColor = "rgb(var(--surface))";
//     }}
//     onMouseLeave={(e) => {
//       e.currentTarget.style.backgroundColor = "transparent";
//     }}
//   >
//     {/* Avatar */}
//     <Avatar photo={user.photo} name={user.name} />

//     {/* Name + role */}
//     <div className="flex-1 min-w-0">
//       <p
//         className="font-semibold text-sm truncate"
//         style={{ color: "rgb(var(--text))" }}
//       >
//         {user.name}
//       </p>
//       <p
//         className="text-xs capitalize"
//         style={{ color: "rgb(var(--text-muted))" }}
//       >
//         {user.role}
//       </p>
//     </div>

//     {/* Chevron */}
//     <span
//       className="text-lg shrink-0"
//       style={{ color: "rgb(var(--border-strong))" }}
//     >
//       ›
//     </span>
//   </div>
// );

// // ─────────────────────────────────────────────────────────────
// // MAIN — NewMessagePage
// // Layout: fixed header + fixed search + scrollable user list
// // ─────────────────────────────────────────────────────────────
// export default function NewMessagePage() {
//   const { user } = useAuth();
//   const navigate = useNavigate();

//   const [users, setUsers] = useState([]);
//   const [filtered, setFiltered] = useState([]);
//   const [search, setSearch] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [starting, setStarting] = useState(false);
//   const [error, setError] = useState("");

//   // ── Role based path ────────────────────────────────────────
//   let path = "";
//   if (user?.role === "school_admin") path = "/school";
//   else if (user?.role === "teacher_admin") path = "/teacher";
//   else if (user?.role === "student_admin")
//     path = user.loginAs === "student" ? "/student" : "/parent";
//   else if (user?.role === "staff_admin") path = "/staff";

//   // ── Fetch users ────────────────────────────────────────────
//   const fetchUsers = useCallback(async () => {
//     try {
//       setLoading(true);
//       setError("");
//       const res = await axios.get(`${API}/message-signal/users`, {
//         withCredentials: true,
//       });
//       setUsers(res.data.users || []);
//       setFiltered(res.data.users || []);
//     } catch (err) {
//       console.error("❌ fetchUsers error:", err.message);
//       setError("Failed to load users. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchUsers();
//   }, [fetchUsers]);

//   // ── Client side search ─────────────────────────────────────
//   useEffect(() => {
//     if (!search.trim()) {
//       setFiltered(users);
//       return;
//     }
//     const q = search.toLowerCase();
//     setFiltered(
//       users.filter(
//         (u) =>
//           u.name?.toLowerCase().includes(q) ||
//           u.role?.toLowerCase().includes(q)
//       )
//     );
//   }, [search, users]);

//   // ── Start or fetch thread then navigate ───────────────────
//   const handleSelectUser = async (selectedUser) => {
//     try {
//       setStarting(true);
//       const res = await axios.post(
//         `${API}/message-signal/thread/start`,
//         {
//           targetId: selectedUser._id,
//           targetModel: selectedUser.model,
//         },
//         { withCredentials: true }
//       );
//       navigate(`${path}/messages/${res.data.threadId}`);
//     } catch (err) {
//       console.error("❌ handleSelectUser error:", err.message);
//       setError("Could not start conversation. Please try again.");
//     } finally {
//       setStarting(false);
//     }
//   };

//   // ─────────────────────────────────────────────────────────
//   // RENDER
//   // Full height, fixed header + search, scrollable list only
//   // ─────────────────────────────────────────────────────────
//   return (
//     <div
//       className="flex flex-col w-full max-w-2xl mx-auto"
//       style={{
//         backgroundColor: "rgb(var(--bg))",
//         height: "calc(100vh - 57px)", // adjust 57px to your topbar height
//       }}
//     >
//       {/* ── FIXED HEADER ── */}
//       <div
//         className="shrink-0 flex items-center gap-3 px-4 pt-5 pb-3 border-b"
//         style={{
//           backgroundColor: "rgb(var(--bg))",
//           borderColor: "rgb(var(--border))",
//         }}
//       >
//         {/* Back button */}
//         <button
//           onClick={() => navigate(`${path}/messages`)}
//           className="p-1 rounded-lg transition shrink-0"
//           style={{ color: "rgb(var(--primary))" }}
//           onMouseEnter={(e) =>
//             (e.currentTarget.style.backgroundColor = "rgb(var(--surface))")
//           }
//           onMouseLeave={(e) =>
//             (e.currentTarget.style.backgroundColor = "transparent")
//           }
//           title="Back"
//         >
//           <FiArrowLeft size={22} />
//         </button>

//         <h1
//           className="text-xl font-bold flex-1 text-center"
//           style={{ color: "rgb(var(--primary))" }}
//         >
//           New Message
//         </h1>

//         {/* Spacer — keeps title centered */}
//         <div className="w-8 shrink-0" />
//       </div>

//       {/* ── FIXED SEARCH BAR ── */}
//       <div
//         className="shrink-0 px-4 py-3 border-b"
//         style={{
//           backgroundColor: "rgb(var(--bg))",
//           borderColor: "rgb(var(--border))",
//         }}
//       >
//         <div
//           className="flex items-center gap-2 rounded-xl px-3 py-2"
//           style={{ backgroundColor: "rgb(var(--surface))" }}
//         >
//           <FiSearch
//             className="shrink-0"
//             style={{ color: "rgb(var(--text-muted))" }}
//           />
//           <input
//             type="text"
//             placeholder="Search"
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="bg-transparent outline-none text-sm w-full"
//             style={{ color: "rgb(var(--text))" }}
//           />
//           {/* Clear button */}
//           {search && (
//             <button
//               onClick={() => setSearch("")}
//               className="text-xs shrink-0"
//               style={{ color: "rgb(var(--text-muted))" }}
//             >
//               ✕
//             </button>
//           )}
//         </div>
//       </div>

//       {/* ── SCROLLABLE USER LIST ── */}
//       <div className="flex-1 overflow-y-auto">

//         {/* Loading */}
//         {loading && (
//           <div className="flex flex-col items-center justify-center
//                           py-20 gap-3">
//             <div
//               className="w-8 h-8 border-4 border-t-transparent
//                          rounded-full animate-spin"
//               style={{
//                 borderColor: "rgb(var(--primary))",
//                 borderTopColor: "transparent",
//               }}
//             />
//             <p className="text-sm" style={{ color: "rgb(var(--text-muted))" }}>
//               Loading...
//             </p>
//           </div>
//         )}

//         {/* Error */}
//         {!loading && error && (
//           <div className="text-center py-20 px-4">
//             <p className="text-red-400 text-sm">{error}</p>
//             <button
//               onClick={fetchUsers}
//               className="mt-3 text-sm underline"
//               style={{ color: "rgb(var(--primary))" }}
//             >
//               Try again
//             </button>
//           </div>
//         )}

//         {/* Empty */}
//         {!loading && !error && filtered.length === 0 && (
//           <div className="flex flex-col items-center justify-center
//                           py-20 gap-2 px-4">
//             <p
//               className="text-sm text-center"
//               style={{ color: "rgb(var(--text-muted))" }}
//             >
//               {search ? "No users found." : "No users available."}
//             </p>
//           </div>
//         )}

//         {/* User list */}
//         {!loading && !error && filtered.length > 0 &&
//           filtered.map((u) => (
//             <UserItem
//               key={`${u.model}-${u._id}`}
//               user={u}
//               onClick={handleSelectUser}
//               loading={starting}
//             />
//           ))
//         }
//       </div>

//       {/* ── Starting thread overlay ── */}
//       {starting && (
//         <div className="fixed inset-0 bg-black/30 flex items-center
//                         justify-center z-50">
//           <div
//             className="rounded-2xl px-8 py-6 flex flex-col
//                        items-center gap-3 shadow-xl"
//             style={{ backgroundColor: "rgb(var(--bg))" }}
//           >
//             <div
//               className="w-8 h-8 border-4 border-t-transparent
//                          rounded-full animate-spin"
//               style={{
//                 borderColor: "rgb(var(--primary))",
//                 borderTopColor: "transparent",
//               }}
//             />
//             <p
//               className="text-sm"
//               style={{ color: "rgb(var(--text-muted))" }}
//             >
//               Opening conversation...
//             </p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { FiSearch, FiArrowLeft, FiUsers } from "react-icons/fi";

const API = import.meta.env.VITE_API_URL;

// ─────────────────────────────────────────────────────────────
// HELPER — Avatar with initials fallback
// ─────────────────────────────────────────────────────────────
const Avatar = ({ photo, name, size = 46 }) => {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center
                 text-sm font-semibold"
      style={{
        width: size,
        height: size,
        backgroundColor: "rgb(var(--surface))",
        color: "rgb(var(--primary))",
      }}
    >
      {initials}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// COMPONENT — section header label
// e.g. "TEACHERS", "STUDENTS"
// ─────────────────────────────────────────────────────────────
const SectionHeader = ({ label, count }) => (
  <div
    className="px-4 py-2 flex items-center justify-between"
    style={{ backgroundColor: "rgb(var(--surface))" }}
  >
    <p
      className="text-xs font-semibold uppercase tracking-wider"
      style={{ color: "rgb(var(--text-muted))" }}
    >
      {label}
    </p>
    {count !== undefined && (
      <span
        className="text-xs font-medium px-2 py-0.5 rounded-full"
        style={{
          backgroundColor: "rgb(var(--bg))",
          color: "rgb(var(--text-muted))",
        }}
      >
        {count}
      </span>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────
// COMPONENT — single user row
// Shows extra info for student/parent (class + section)
// ─────────────────────────────────────────────────────────────
const UserItem = ({ user, onClick, disabled }) => {
  // Build subtitle line based on role
  const subtitle = () => {
    if (user.model === "Student" && user.subType === "student") {
      const parts = [];
      if (user.className) parts.push(`Class ${user.className}`);
      if (user.sectionName) parts.push(`Section ${user.sectionName}`);
      return parts.length > 0
        ? `${user.role} • ${parts.join(" • ")}`
        : user.role;
    }
    if (user.model === "Student" && user.subType === "parent") {
      const parts = [];
      if (user.childName) parts.push(`Child: ${user.childName}`);
      if (user.className) parts.push(`Class ${user.className}`);
      return parts.length > 0 ? parts.join(" • ") : user.role;
    }
    return user.role;
  };

  return (
    <div
      onClick={() => !disabled && onClick(user)}
      className="flex items-center gap-3 px-4 py-3 border-b transition-colors"
      style={{
        borderColor: "rgb(var(--border))",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          e.currentTarget.style.backgroundColor = "rgb(var(--surface))";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {/* Avatar */}
      <Avatar photo={user.photo} name={user.name} />

      {/* Name + subtitle */}
      <div className="flex-1 min-w-0">
        <p
          className="font-semibold text-sm truncate"
          style={{ color: "rgb(var(--text))" }}
        >
          {user.name}
        </p>
        <p
          className="text-xs capitalize truncate"
          style={{ color: "rgb(var(--text-muted))" }}
        >
          {subtitle()}
        </p>
      </div>

      {/* Chevron */}
      <span
        className="text-lg shrink-0"
        style={{ color: "rgb(var(--border-strong))" }}
      >
        ›
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// COMPONENT — hint shown when search needed for students
// ─────────────────────────────────────────────────────────────
const SearchHint = ({ role }) => {
  const hint =
    role === "teacher_admin"
      ? "Type 2+ characters to find students from your classes..."
      : "Type 2+ characters to find students & parents...";

  return (
    <div className="px-4 py-5 flex items-center gap-3">
      <FiUsers
        size={20}
        style={{ color: "rgb(var(--border-strong))", flexShrink: 0 }}
      />
      <p
        className="text-sm"
        style={{ color: "rgb(var(--text-muted))" }}
      >
        {hint}
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// HELPER — group flat users array into sections
// Returns object with keys: schoolAdmins, staff, teachers,
//                           students, parents
// ─────────────────────────────────────────────────────────────
const groupUsers = (users) => {
  return users.reduce(
    (acc, u) => {
      if (u.model === "School") acc.schoolAdmins.push(u);
      else if (u.model === "Staff") acc.staff.push(u);
      else if (u.model === "Teacher") acc.teachers.push(u);
      else if (u.model === "Student" && u.subType === "student")
        acc.students.push(u);
      else if (u.model === "Student" && u.subType === "parent")
        acc.parents.push(u);
      return acc;
    },
    { schoolAdmins: [], staff: [], teachers: [], students: [], parents: [] }
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN — NewMessagePage
// ─────────────────────────────────────────────────────────────
export default function NewMessagePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Base users — loaded on mount (no search) ───────────────
  // Contains: school admin, staff, teachers (role dependent)
  const [baseUsers, setBaseUsers] = useState([]);

  // ── Search users — loaded after 2+ char search ────────────
  // Contains: students + parents matching search
  const [searchUsers, setSearchUsers] = useState([]);

  const [search, setSearch] = useState("");
  const [baseLoading, setBaseLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [requiresSearch, setRequiresSearch] = useState(false);

  const searchTimerRef = useRef(null); // debounce timer

  // ── Role based path ────────────────────────────────────────
  let path = "";
  if (user?.role === "school_admin") path = "/school";
  else if (user?.role === "teacher_admin") path = "/teacher";
  else if (user?.role === "student_admin")
    path = user.loginAs === "student" ? "/student" : "/parent";
  else if (user?.role === "staff_admin") path = "/staff";

  // ── Initial load — no search query ────────────────────────
  // Fetches school admin + staff + teachers for all roles
  // For student/parent — fetches their class teachers directly
  const fetchBaseUsers = useCallback(async () => {
    try {
      setBaseLoading(true);
      setError("");

      const res = await axios.get(`${API}/message-signal/users`, {
        withCredentials: true,
      });

      setBaseUsers(res.data.users || []);
      setRequiresSearch(res.data.requiresSearch || false);
    } catch (err) {
      console.error("❌ fetchBaseUsers error:", err.message);
      setError("Failed to load users. Please try again.");
    } finally {
      setBaseLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBaseUsers();
  }, [fetchBaseUsers]);

  // ── Search — debounced 500ms, triggers on 2+ chars ────────
  // Only fetches students/parents — base users already loaded
  const fetchSearchUsers = useCallback(async (query) => {
    if (query.length < 2) {
      setSearchUsers([]);
      return;
    }

    try {
      setSearchLoading(true);

      const res = await axios.get(
        `${API}/message-signal/users?search=${encodeURIComponent(query)}`,
        { withCredentials: true }
      );

      // From search results — keep only students and parents
      // Base users (staff/teachers) already shown from initial load
      const allUsers = res.data.users || [];
      const studentsAndParents = allUsers.filter(
        (u) => u.model === "Student"
      );

      setSearchUsers(studentsAndParents);
    } catch (err) {
      console.error("❌ fetchSearchUsers error:", err.message);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // ── Debounce search input ──────────────────────────────────
  useEffect(() => {
    // Clear previous timer
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (search.length < 2) {
      setSearchUsers([]);
      setSearchLoading(false);
      return;
    }

    // Wait 500ms after user stops typing
    searchTimerRef.current = setTimeout(() => {
      fetchSearchUsers(search);
    }, 500);

    return () => clearTimeout(searchTimerRef.current);
  }, [search, fetchSearchUsers]);

  // ── Filter base users client side when search active ──────
  // Filters school admin + staff + teachers by search text
  const filteredBaseUsers = search.trim()
    ? baseUsers.filter(
        (u) =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.role?.toLowerCase().includes(search.toLowerCase())
      )
    : baseUsers;

  // ── Combined users for display ─────────────────────────────
  // Base (filtered) + search results (students/parents)
  const allUsers = [...filteredBaseUsers, ...searchUsers];
  const grouped = groupUsers(allUsers);

  // ── Start thread and navigate ──────────────────────────────
  const handleSelectUser = async (selectedUser) => {
    try {
      setStarting(true);

      const res = await axios.post(
        `${API}/message-signal/thread/start`,
        {
          targetId: selectedUser._id,
          targetModel: selectedUser.model,
          // Pass subType so backend creates correct thread
          // "student" | "parent" | "default"
          targetSubType: selectedUser.subType || "default",
        },
        { withCredentials: true }
      );

      navigate(`${path}/messages/${res.data.threadId}`);
    } catch (err) {
      console.error("❌ handleSelectUser error:", err.message);
      setError("Could not start conversation. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  // ── Check if any results exist ─────────────────────────────
  const hasAnyUsers =
    grouped.schoolAdmins.length > 0 ||
    grouped.staff.length > 0 ||
    grouped.teachers.length > 0 ||
    grouped.students.length > 0 ||
    grouped.parents.length > 0;

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col w-full max-w-2xl mx-auto"
      style={{
        backgroundColor: "rgb(var(--bg))",
        height: "calc(100vh - 57px)",
      }}
    >
      {/* ── FIXED HEADER ── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 pt-5 pb-3 border-b"
        style={{
          backgroundColor: "rgb(var(--bg))",
          borderColor: "rgb(var(--border))",
        }}
      >
        <button
          onClick={() => navigate(`${path}/messages`)}
          className="p-1 rounded-lg transition shrink-0"
          style={{ color: "rgb(var(--primary))" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "rgb(var(--surface))")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          <FiArrowLeft size={22} />
        </button>

        <h1
          className="text-xl font-bold flex-1 text-center"
          style={{ color: "rgb(var(--primary))" }}
        >
          New Message
        </h1>

        {/* Spacer — keeps title centered */}
        <div className="w-8 shrink-0" />
      </div>

      {/* ── FIXED SEARCH BAR ── */}
      <div
        className="shrink-0 px-4 py-3 border-b"
        style={{
          backgroundColor: "rgb(var(--bg))",
          borderColor: "rgb(var(--border))",
        }}
      >
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ backgroundColor: "rgb(var(--surface))" }}
        >
          <FiSearch
            className="shrink-0"
            style={{ color: "rgb(var(--text-muted))" }}
          />
          <input
            type="text"
            placeholder={
              requiresSearch
                ? "Search by name..."
                : "Search..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm w-full"
            style={{ color: "rgb(var(--text))" }}
            autoFocus
          />
          {/* Loading spinner inside search — shows during API call */}
          {searchLoading && (
            <div
              className="w-4 h-4 border-2 border-t-transparent
                         rounded-full animate-spin shrink-0"
              style={{
                borderColor: "rgb(var(--primary))",
                borderTopColor: "transparent",
              }}
            />
          )}
          {/* Clear button */}
          {search && !searchLoading && (
            <button
              onClick={() => setSearch("")}
              className="text-xs shrink-0"
              style={{ color: "rgb(var(--text-muted))" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── SCROLLABLE LIST ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Base loading — first load */}
        {baseLoading && (
          <div className="flex flex-col items-center justify-center
                          py-20 gap-3">
            <div
              className="w-8 h-8 border-4 border-t-transparent
                         rounded-full animate-spin"
              style={{
                borderColor: "rgb(var(--primary))",
                borderTopColor: "transparent",
              }}
            />
            <p
              className="text-sm"
              style={{ color: "rgb(var(--text-muted))" }}
            >
              Loading...
            </p>
          </div>
        )}

        {/* Error */}
        {!baseLoading && error && (
          <div className="text-center py-20 px-4">
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button
              onClick={fetchBaseUsers}
              className="text-sm underline"
              style={{ color: "rgb(var(--primary))" }}
            >
              Try again
            </button>
          </div>
        )}

        {/* ── Grouped user list ── */}
        {!baseLoading && !error && (
          <>
            {/* SCHOOL ADMIN section */}
            {grouped.schoolAdmins.length > 0 && (
              <>
                <SectionHeader
                  label="School Admin"
                  count={grouped.schoolAdmins.length}
                />
                {grouped.schoolAdmins.map((u) => (
                  <UserItem
                    key={`school-${u._id}`}
                    user={u}
                    onClick={handleSelectUser}
                    disabled={starting}
                  />
                ))}
              </>
            )}

            {/* STAFF section */}
            {grouped.staff.length > 0 && (
              <>
                <SectionHeader
                  label="Staff"
                  count={grouped.staff.length}
                />
                {grouped.staff.map((u) => (
                  <UserItem
                    key={`staff-${u._id}`}
                    user={u}
                    onClick={handleSelectUser}
                    disabled={starting}
                  />
                ))}
              </>
            )}

            {/* TEACHERS section */}
            {grouped.teachers.length > 0 && (
              <>
                <SectionHeader
                  label="Teachers"
                  count={grouped.teachers.length}
                />
                {grouped.teachers.map((u) => (
                  <UserItem
                    key={`teacher-${u._id}`}
                    user={u}
                    onClick={handleSelectUser}
                    disabled={starting}
                  />
                ))}
              </>
            )}

            {/* STUDENTS section */}
            {grouped.students.length > 0 && (
              <>
                <SectionHeader
                  label="Students"
                  count={grouped.students.length}
                />
                {grouped.students.map((u) => (
                  <UserItem
                    key={`student-${u._id}`}
                    user={u}
                    onClick={handleSelectUser}
                    disabled={starting}
                  />
                ))}
              </>
            )}

            {/* PARENTS section */}
            {grouped.parents.length > 0 && (
              <>
                <SectionHeader
                  label="Parents"
                  count={grouped.parents.length}
                />
                {grouped.parents.map((u) => (
                  <UserItem
                    key={`parent-${u._id}`}
                    user={u}
                    onClick={handleSelectUser}
                    disabled={starting}
                  />
                ))}
              </>
            )}

            {/* Search hint — shown below teachers for roles that need search */}
            {requiresSearch && (
              <SearchHint role={user?.role} />
            )}

            {/* No results after search */}
            {!baseLoading &&
              !searchLoading &&
              search.length >= 2 &&
              !hasAnyUsers && (
                <div className="text-center py-10 px-4">
                  <p
                    className="text-sm"
                    style={{ color: "rgb(var(--text-muted))" }}
                  >
                    No users found for "{search}"
                  </p>
                </div>
              )}

            {/* Empty state — no base users at all */}
            {!hasAnyUsers && !search && (
              <div className="flex flex-col items-center justify-center
                              py-20 gap-2 px-4">
                <p
                  className="text-sm text-center"
                  style={{ color: "rgb(var(--text-muted))" }}
                >
                  No users available.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Starting thread overlay ── */}
      {starting && (
        <div className="fixed inset-0 bg-black/30 flex items-center
                        justify-center z-50">
          <div
            className="rounded-2xl px-8 py-6 flex flex-col
                       items-center gap-3 shadow-xl"
            style={{ backgroundColor: "rgb(var(--bg))" }}
          >
            <div
              className="w-8 h-8 border-4 border-t-transparent
                         rounded-full animate-spin"
              style={{
                borderColor: "rgb(var(--primary))",
                borderTopColor: "transparent",
              }}
            />
            <p
              className="text-sm"
              style={{ color: "rgb(var(--text-muted))" }}
            >
              Opening conversation...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}