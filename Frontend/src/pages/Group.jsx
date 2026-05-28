import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FiPlus,
  FiSearch,
  FiX,
  FiSend,
  FiPaperclip,
  FiTrash2,
  FiLoader,
  FiImage,
  FiFile,
  FiDownload,
  FiArrowLeft,
  FiUserPlus,
  FiUserMinus,
  FiUsers,
  FiHash,
  FiLock,
  FiChevronDown,
  FiCheck,
} from "react-icons/fi";
import {
  MdOutlineGroups,
  MdAnnouncement,
  MdEventNote,
  MdSubject,
  MdOutlineClass,
  MdAdminPanelSettings,
  MdPin,
  MdGroupAdd,
} from "react-icons/md";
import {
  BsThreeDotsVertical,
  BsFileEarmarkPdf,
  BsPlayCircleFill,
  BsCameraVideo,
} from "react-icons/bs";

// ─── API ──────────────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const GROUP_TYPE_META = {
  class: {
    label: "Class",
    Icon: MdOutlineClass,
    bg: "bg-indigo-500",
    soft: "bg-indigo-50",
    text: "text-indigo-600",
  },
  section: {
    label: "Section",
    Icon: FiHash,
    bg: "bg-violet-500",
    soft: "bg-violet-50",
    text: "text-violet-600",
  },
  subject: {
    label: "Subject",
    Icon: MdSubject,
    bg: "bg-sky-500",
    soft: "bg-sky-50",
    text: "text-sky-600",
  },
  teacher: {
    label: "Teacher",
    Icon: FiUsers,
    bg: "bg-emerald-500",
    soft: "bg-emerald-50",
    text: "text-emerald-600",
  },
  event: {
    label: "Event",
    Icon: MdEventNote,
    bg: "bg-amber-500",
    soft: "bg-amber-50",
    text: "text-amber-600",
  },
  announcement: {
    label: "Announce",
    Icon: MdAnnouncement,
    bg: "bg-rose-500",
    soft: "bg-rose-50",
    text: "text-rose-600",
  },
  custom: {
    label: "Custom",
    Icon: MdOutlineGroups,
    bg: "bg-slate-500",
    soft: "bg-slate-50",
    text: "text-slate-600",
  },
};

const AVATAR_BGS = [
  "bg-indigo-500",
  "bg-violet-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-pink-500",
  "bg-teal-500",
];
const avatarBg = (n = "") =>
  AVATAR_BGS[(n || "?").charCodeAt(0) % AVATAR_BGS.length];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function timeAgo(d) {
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
function fmt(d) {
  return new Date(d).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDate(d) {
  const today = new Date(),
    dt = new Date(d);
  if (dt.toDateString() === today.toDateString()) return "Today";
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (dt.toDateString() === y.toDateString()) return "Yesterday";
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/**
 * Extract a display name from any user-like object or raw id string.
 * Handles populated objects ({ fullName, firstName, lastName, name })
 * and falls back gracefully when only an ObjectId string is present.
 */
function resolveName(userIdField, userLookup = {}) {
  if (!userIdField) return "Unknown";

  // Already populated with name fields
  if (typeof userIdField === "object") {
    return (
      userIdField.fullName ||
      userIdField.name ||
      (userIdField.firstName
        ? `${userIdField.firstName} ${userIdField.lastName || ""}`.trim()
        : null) ||
      null
    );
  }

  // It's a raw ObjectId string – look it up in our cache
  const id = userIdField.toString();
  const cached = userLookup[id];
  if (cached)
    return (
      cached.name ||
      cached.fullName ||
      `${cached.firstName || ""} ${cached.lastName || ""}`.trim()
    );

  return null; // caller will show a short id
}

function shortId(id) {
  const s = id?.toString() || "";
  return s.length > 8 ? `…${s.slice(-6)}` : s;
}

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
function Avatar({ name = "", size = "w-10 h-10", fs = "text-sm", url }) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={`${size} rounded-full ${avatarBg(name)} flex items-center justify-center ${fs} font-bold text-white shrink-0 overflow-hidden`}
    >
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

function Skel({ cls = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${cls}`} />;
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ onClose, title, children, wide = false }) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        className={`bg-white w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

const inp =
  "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all";

// ─── CREATE GROUP MODAL ───────────────────────────────────────────────────────
// Only rendered for school_admin, but guard is also in the parent
function CreateGroupModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    type: "custom",
    description: "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Group name required");
    setBusy(true);
    try {
      const { data } = await api.post("/groups", form);
      if (data.success) {
        toast.success("Group created!");
        onCreated(data.data);
        onClose();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to create group");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Create New Group">
      <div className="p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Group Name *
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Grade 10 – Mathematics"
            className={inp}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Type
          </label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className={inp}
          >
            {Object.entries(GROUP_TYPE_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional…"
            rows={3}
            className={`${inp} resize-none`}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {busy ? (
              <FiLoader size={13} className="animate-spin" />
            ) : (
              <FiPlus size={13} />
            )}
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── ADD MEMBER MODAL ─────────────────────────────────────────────────────────
function AddMemberModal({ group, onClose, onAdded }) {
  const [tab, setTab] = useState("search");
  const [userType, setUserType] = useState("student");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [classPeople, setClassPeople] = useState([]);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    api
      .get("/classes/flat")
      .then(({ data }) => {
        if (data.success) setClasses(data.classes);
      })
      .catch(() => {});
  }, []);

  // Search debounce
  useEffect(() => {
    if (tab !== "search" || query.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setFetching(true);
      try {
        const { data } = await api.get(
          userType === "student" ? "/students" : "/teachers",
        );
        if (data.success) {
          const q = query.toLowerCase();
          setResults(
            (data.data || [])
              .filter((p) => {
                const name =
                  p.fullName || `${p.firstName || ""} ${p.lastName || ""}`;
                return name.toLowerCase().includes(q);
              })
              .slice(0, 25),
          );
        }
      } catch {
      } finally {
        setFetching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, userType, tab]);

  // Class fetch
  useEffect(() => {
    if (!classId || tab !== "class") {
      setClassPeople([]);
      return;
    }
    const cId = classId.split("_")[0];
    setFetching(true);
    api
      .get(userType === "student" ? "/students" : "/teachers")
      .then(({ data }) => {
        if (data.success) {
          const filtered =
            userType === "student"
              ? (data.data || []).filter(
                  (p) => (p.classId?._id || p.classId)?.toString() === cId,
                )
              : (data.data || []).filter((p) =>
                  p.assignedClasses?.some(
                    (c) => (c._id || c)?.toString() === cId,
                  ),
                );
          setClassPeople(filtered);
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [classId, userType, tab]);

  const toggle = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const getName = (p) =>
    (p.fullName || `${p.firstName || ""} ${p.lastName || ""}`).trim();
  const isAlreadyMember = (id) =>
    group.members?.some(
      (m) => (m.userId?._id || m.userId)?.toString() === id?.toString(),
    );

  const doAdd = async (people) => {
    const toAdd = people.filter((p) => !isAlreadyMember(p._id));
    if (!toAdd.length) return toast.info("All selected are already members");
    setBusy(true);
    try {
      const { data } = await api.post(`/groups/${group._id}/members`, {
        members: toAdd.map((p) => ({ userId: p._id, userType })),
      });
      if (data.success) {
        toast.success(`${toAdd.length} member(s) added`);
        onAdded(data.data);
        onClose();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const people = tab === "class" ? classPeople : results;
  const chosen = people.filter((p) => selected.includes(p._id));

  return (
    <Modal onClose={onClose} title="Add Members" wide>
      <div className="flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5 gap-1">
          {[
            ["search", "🔍 Search"],
            ["class", "🏫 By Class"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => {
                setTab(v);
                setSelected([]);
                setQuery("");
              }}
              className={`px-4 py-2.5 text-xs font-semibold transition-colors ${tab === v ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-400 hover:text-gray-600"}`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="p-4 flex flex-col gap-3">
          {/* User type toggle */}
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl w-fit">
            {["student", "teacher"].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setUserType(t);
                  setResults([]);
                  setClassPeople([]);
                  setSelected([]);
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${userType === t ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                {t}s
              </button>
            ))}
          </div>

          {tab === "search" ? (
            <div className="relative">
              <FiSearch
                size={13}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${userType}s by name…`}
                className={`${inp} pl-9`}
              />
            </div>
          ) : (
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className={inp}
            >
              <option value="">— Select Class / Section —</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.displayName}
                </option>
              ))}
            </select>
          )}

          {/* People list */}
          <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl">
            {fetching ? (
              <div className="p-8 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                <FiLoader className="animate-spin" size={14} /> Fetching…
              </div>
            ) : people.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                {tab === "search"
                  ? query.length < 2
                    ? "Type at least 2 characters to search"
                    : "No results found"
                  : !classId
                    ? "Select a class first"
                    : `No ${userType}s found in this class`}
              </div>
            ) : (
              people.map((p) => {
                const name = getName(p);
                const already = isAlreadyMember(p._id);
                const sel = selected.includes(p._id);
                return (
                  <div
                    key={p._id}
                    onClick={() => !already && toggle(p._id)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 transition-colors border-b border-gray-50 last:border-0
                      ${already ? "opacity-50 cursor-default" : "cursor-pointer hover:bg-gray-50"} ${sel ? "bg-indigo-50" : ""}`}
                  >
                    <Avatar
                      name={name}
                      size="w-9 h-9"
                      fs="text-xs"
                      url={p.photo?.url || p.documents?.studentPhoto?.url}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {p.email || p.teacherId || p.studentId || ""}
                      </p>
                    </div>
                    {already ? (
                      <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium shrink-0">
                        In group
                      </span>
                    ) : (
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${sel ? "bg-indigo-600 border-indigo-600" : "border-gray-300"}`}
                      >
                        {sel && <FiCheck size={10} className="text-white" />}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-400">
              {selected.length > 0
                ? `${selected.length} selected`
                : "Select people to add"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              {(tab === "search" ? selected.length > 0 : !!classId) && (
                <button
                  onClick={() =>
                    tab === "class" && selected.length === 0
                      ? doAdd(classPeople)
                      : doAdd(chosen)
                  }
                  disabled={busy}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {busy ? (
                    <FiLoader size={13} className="animate-spin" />
                  ) : (
                    <FiUserPlus size={13} />
                  )}
                  {tab === "class" && selected.length === 0
                    ? "Add All"
                    : `Add ${selected.length || ""}`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── MEMBERS PANEL ────────────────────────────────────────────────────────────
function MembersPanel({ group, isAdmin, onRemove, onAdd, userLookup }) {
  const [search, setSearch] = useState("");

  const members = (group.members || []).filter((m) => {
    const name = getMemberName(m, userLookup).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100 shrink-0 bg-[rgb(var(--surface))] text-[rgb(var(--text))]">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold uppercase tracking-wide">
            {group.members?.length || 0} Members
          </span>
          {isAdmin && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-3 py-1.5 rounded-lg transition-colors"
            >
              <MdGroupAdd size={13} /> Add
            </button>
          )}
        </div>
        <div className="flex items-center gap-2  rounded-xl px-3 py-2">
          <FiSearch size={11} className="shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members…"
            className="bg-transparent text-xs border py-2 text-center rounded-2xl flex-1 outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
        {members.map((m, i) => {
          const name = getMemberName(m, userLookup);
          const photo =
            m.userId?.photo?.url || userLookup[m.userId?.toString()]?.photo;
          const userTypeLabel = m.userType || m.role || "member";
          return (
            <div
              key={i}
              className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl border transition-colors group"
            >
              <Avatar name={name} size="w-9 h-9" fs="text-xs" url={photo} />
              <div className="flex-1 min-w-0 text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
                <div className="flex items-center gap-1.5 ">
                  <p className="text-xs font-semibold  truncate">
                    {name}
                  </p>
                  {m.role === "admin" && (
                    <MdAdminPanelSettings
                      size={12}
                      className="text-amber-500 shrink-0"
                    />
                  )}
                </div>
                <div className="flex gap-1 mt-0.5 flex-wrap">
                  {/* userType badge: student / teacher / admin / staff */}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                    ${
                      userTypeLabel === "student"
                        ? "bg-sky-50 text-sky-600"
                        : userTypeLabel === "teacher"
                          ? "bg-emerald-50 text-emerald-600"
                          : userTypeLabel === "admin"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {userTypeLabel}
                  </span>
                  {m.role && m.role !== "member" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold">
                      {m.role}
                    </span>
                  )}
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() =>
                    onRemove(m.userId?._id?.toString() || m.userId?.toString())
                  }
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                >
                  <FiUserMinus size={13} />
                </button>
              )}
            </div>
          );
        })}
        {members.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <FiUsers size={28} className="mx-auto mb-2 opacity-20" />
            <p className="text-xs">{search ? "No match" : "No members yet"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FILE BUBBLE ──────────────────────────────────────────────────────────────
function FileBubble({ file, isOwn }) {
  const isImage =
    file.type === "image" || file.url?.match(/\.(jpe?g|png|gif|webp|svg)/i);
  const isVideo =
    file.type === "video" || file.url?.match(/\.(mp4|mov|webm|avi)/i);
  const isPdf = file.type === "pdf" || file.name?.endsWith(".pdf");

  if (isImage)
    return (
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <img
          src={file.url}
          alt={file.name || "image"}
          className="max-w-55 w-full rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
        />
      </a>
    );

  if (isVideo)
    return (
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl no-underline ${isOwn ? "bg-indigo-700/60" : "bg-gray-100"}`}
      >
        <div className="w-10 h-10 bg-black/30 rounded-xl flex items-center justify-center shrink-0">
          <BsPlayCircleFill size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <p
            className={`text-xs font-semibold truncate max-w-35 ${isOwn ? "text-white" : "text-gray-800"}`}
          >
            {file.name || "Video"}
          </p>
          <p
            className={`text-[10px] ${isOwn ? "text-indigo-200" : "text-gray-400"}`}
          >
            Tap to play
          </p>
        </div>
      </a>
    );

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl no-underline ${isOwn ? "bg-indigo-700/60" : "bg-gray-100"}`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isPdf ? "bg-rose-100" : "bg-blue-100"}`}
      >
        {isPdf ? (
          <BsFileEarmarkPdf size={17} className="text-rose-500" />
        ) : (
          <FiFile size={17} className="text-blue-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs font-semibold truncate max-w-35 ${isOwn ? "text-white" : "text-gray-800"}`}
        >
          {file.name || "File"}
        </p>
        {file.size && (
          <p
            className={`text-[10px] ${isOwn ? "text-indigo-200" : "text-gray-400"}`}
          >
            {(file.size / 1024).toFixed(1)} KB
          </p>
        )}
      </div>
      <FiDownload
        size={12}
        className={isOwn ? "text-indigo-300" : "text-gray-400"}
      />
    </a>
  );
}

// ─── RESOLVE SENDER NAME ──────────────────────────────────────────────────────
// msg.sender.userId may be a populated object OR a raw ObjectId string
function getSenderName(msg, userLookup) {
  const uid = msg?.sender?.userId;
  if (!uid) return "Unknown";

  // Populated object
  if (typeof uid === "object") {
    return (
      uid.fullName ||
      uid.name ||
      (uid.firstName
        ? `${uid.firstName} ${uid.lastName || ""}`.trim()
        : null) ||
      shortId(uid._id)
    );
  }

  // Raw string – look up cache
  const cached = userLookup[uid.toString()];
  if (cached) {
    return (
      cached.fullName ||
      cached.name ||
      (cached.firstName
        ? `${cached.firstName} ${cached.lastName || ""}`.trim()
        : null) ||
      shortId(uid)
    );
  }

  // If it's current user → show Admin / You
  if (uid.toString() === userLookup?.currentUserId) {
    return "You";
  }

  // If unknown → assume admin fallback
  return "School Admin";
}

function getSenderPhoto(msg, userLookup) {
  const uid = msg?.sender?.userId;
  if (!uid) return null;
  if (typeof uid === "object") return uid.photo?.url || null;
  return userLookup[uid.toString()]?.photo || null;
}

function getMemberName(m, userLookup) {
  const uid = m?.userId;
  if (!uid) return "Unknown";
  if (typeof uid === "object") {
    return (
      uid.fullName ||
      uid.name ||
      (uid.firstName
        ? `${uid.firstName} ${uid.lastName || ""}`.trim()
        : null) ||
      shortId(uid._id)
    );
  }
  const cached = userLookup[uid.toString()];
  if (cached) {
    return (
      cached.fullName ||
      cached.name ||
      (cached.firstName
        ? `${cached.firstName} ${cached.lastName || ""}`.trim()
        : null) ||
      shortId(uid)
    );
  }
  // If it's current user → show Admin / You
  if (uid.toString() === userLookup?.currentUserId) {
    return "You";
  }

  // If unknown → assume admin fallback
  return "School Admin";
}

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────────────
function Bubble({ msg, isOwn, isAdmin, onDelete, onPin, userLookup }) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);

  const senderName = getSenderName(msg, userLookup);
  const senderPhoto = getSenderPhoto(msg, userLookup);

  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div
      className={`flex gap-2 mb-1.5 group/bubble ${isOwn ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isOwn && (
        <Avatar
          name={senderName}
          size="w-7 h-7"
          fs="text-[10px]"
          url={senderPhoto}
        />
      )}

      <div
        className={`max-w-[75%] sm:max-w-[62%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}
      >
        {/* Sender label (only for others) */}
        {!isOwn && (
          <div className="flex items-center gap-1.5 mb-1 ml-1">
            <span className="text-[11px] font-bold text-indigo-600">
              {senderName}
            </span>
            {msg.sender?.userType === "admin" && (
              <MdAdminPanelSettings
                size={11}
                className="text-amber-500"
                title="Admin"
              />
            )}
            {msg.sender?.userType === "teacher" && (
              <span className="text-[9px] bg-emerald-50 text-emerald-600 font-bold px-1.5 py-0.5 rounded-full">
                Teacher
              </span>
            )}
          </div>
        )}

        <div
          className={`relative rounded-2xl px-3.5 py-2.5 shadow-sm
          ${isOwn ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-white text-gray-900 rounded-tl-sm border border-gray-100"}`}
        >
          {/* Pinned indicator */}
          {msg.isPinned && (
            <div
              className={`flex items-center gap-1 text-[10px] font-bold mb-1.5 ${isOwn ? "text-indigo-200" : "text-amber-500"}`}
            >
              <MdPin size={10} /> Pinned
            </div>
          )}

          {/* File */}
          {msg.file?.url && (
            <div className="mb-2">
              <FileBubble file={msg.file} isOwn={isOwn} />
            </div>
          )}

          {/* Text */}
          {msg.text && (
            <p
              className={`text-sm leading-relaxed whitespace-pre-wrap wrap-break-word ${isOwn ? "text-white" : "text-gray-800"}`}
            >
              {msg.text}
            </p>
          )}

          {/* Timestamp + tick */}
          <div
            className={`flex items-center gap-1.5 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}
          >
            <span
              className={`text-[10px] ${isOwn ? "text-indigo-200" : "text-gray-400"}`}
            >
              {fmt(msg.createdAt)}
            </span>
            {isOwn && (
              <span
                className={`text-[10px] ${msg.status === "seen" ? "text-sky-300" : "text-indigo-300"}`}
              >
                {msg.status === "seen" || msg.status === "delivered"
                  ? "✓✓"
                  : "✓"}
              </span>
            )}
          </div>

          {/* Context menu */}
          {(isOwn || isAdmin) && (
            <div
              ref={menuRef}
              className={`absolute -top-1 ${isOwn ? "left-0 -translate-x-full -ml-1" : "right-0 translate-x-full ml-1"}`}
            >
              <button
                onClick={() => setMenu((v) => !v)}
                className="opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1.5 bg-white rounded-full shadow border border-gray-100 text-gray-500 hover:text-gray-700"
              >
                <BsThreeDotsVertical size={10} />
              </button>
              {menu && (
                <div
                  className={`absolute z-30 top-6 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-35 ${isOwn ? "right-0" : "left-0"}`}
                >
                  {isAdmin && (
                    <button
                      onClick={() => {
                        onPin(msg._id);
                        setMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <MdPin size={12} className="text-amber-500" />
                      {msg.isPinned ? "Unpin" : "Pin"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onDelete(msg._id);
                      setMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50"
                  >
                    <FiTrash2 size={12} /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DATE SEPARATOR ───────────────────────────────────────────────────────────
function DateSep({ date }) {
  return (
    <div className="flex items-center gap-3 my-4 px-2">
      <div className="flex-1 h-px bg-gray-200/80" />
      <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full shrink-0">
        {fmtDate(date)}
      </span>
      <div className="flex-1 h-px bg-gray-200/80" />
    </div>
  );
}

// ─── PINNED BANNER ────────────────────────────────────────────────────────────
function PinnedBanner({ msg, userLookup }) {
  return (
    <div className="mx-3 mt-2 mb-1 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2.5 shrink-0">
      <MdPin size={13} className="text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
          Pinned · {getSenderName(msg, userLookup)}
        </p>
        <p className="text-xs text-gray-600 truncate">
          {msg.text || "📎 Attachment"}
        </p>
      </div>
    </div>
  );
}

// ─── CHAT WINDOW ──────────────────────────────────────────────────────────────
function ChatWindow({
  group,
  currentUser,
  onGroupUpdated,
  onBack,
  userLookup,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);
  const menuRef = useRef(null);
  const textareaRef = useRef(null);

  const isAdmin = currentUser?.role === "school_admin";
  const isTeacher = currentUser?.role === "teacher_admin";
  const isStudent = currentUser?.role === "student_admin";
  const isParent = currentUser?.role === "parent_admin";

  const canSend =
    group.type === "announcement" ? isAdmin : isAdmin || isTeacher;

  const meta = GROUP_TYPE_META[group.type] || GROUP_TYPE_META.custom;
  const { Icon } = meta;
  const pinnedMsg = messages.find((m) => m.isPinned);

  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setShowMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fetchMessages = useCallback(
    async (pg = 1) => {
      setLoading(true);
      try {
        const { data } = await api.get(`/messages/group/${group._id}`, {
          params: { page: pg, limit: 25 },
        });
        if (data.success) {
          setMessages(pg === 1 ? data.data : (prev) => [...data.data, ...prev]);
          setTotalPages(data.totalPages);
          setPage(pg);
        }
      } catch {
        toast.error("Failed to load messages");
      } finally {
        setLoading(false);
      }
    },
    [group._id],
  );

  useEffect(() => {
    fetchMessages(1);
  }, [group._id, fetchMessages]);

  useEffect(() => {
    if (page === 1 && messages.length > 0) {
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "auto" }),
        80,
      );
    }
  }, [messages.length, page]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      toast.error("File too large. Max 10 MB.");
      return;
    }
    setFile(f);
    e.target.value = "";
  };

  const send = async () => {
    if (!text.trim() && !file) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("groupId", group._id);
      if (text.trim()) fd.append("text", text.trim());
      if (file) fd.append("file", file);
      const { data } = await api.post("/messages", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data.success) {
        setMessages((prev) => [...prev, data.data]);
        setText("");
        setFile(null);
        if (textareaRef.current) textareaRef.current.style.height = "42px";
        setTimeout(
          () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
          60,
        );
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const deleteMsg = async (id) => {
    if (!confirm("Delete this message?")) return;
    try {
      const { data } = await api.delete(`/messages/${id}`);
      if (data.success) {
        setMessages((prev) => prev.filter((m) => m._id !== id));
        toast.success("Deleted");
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  const pinMsg = async (id) => {
    try {
      await api.patch(`/messages/${id}/pin`);
      fetchMessages(1);
    } catch {
      toast.error("Pin failed");
    }
  };

  const removeMember = async (memberId) => {
    if (!confirm("Remove this member?")) return;
    try {
      const { data } = await api.delete(`/groups/${group._id}/members`, {
        data: { memberIds: [memberId] },
      });
      if (data.success) {
        onGroupUpdated(data.data);
        toast.success("Member removed");
      }
    } catch {
      toast.error("Remove failed");
    }
  };

  // Group by date
  const grouped = [];
  let lastDate = null;
  messages.forEach((m) => {
    const d = new Date(m.createdAt).toDateString();
    if (d !== lastDate) {
      grouped.push({ type: "date", date: m.createdAt });
      lastDate = d;
    }
    grouped.push({ type: "msg", data: m });
  });

  const fileIcon = file ? (
    file.type.startsWith("image/") ? (
      <FiImage size={11} />
    ) : file.type.startsWith("video/") ? (
      <BsCameraVideo size={11} />
    ) : file.name?.endsWith(".pdf") ? (
      <BsFileEarmarkPdf size={11} />
    ) : (
      <FiFile size={11} />
    )
  ) : null;

  // Resolve own identity: compare against sender.userId field
  const myId = currentUser?.id;

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col flex-1 min-w-0 h-full text-[rgb(var(--text))] bg-[rgb(var(--surface))]">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-3 sm:px-4 py-3 bg-[rgb(var(--bg))] border-b border-gray-100 shadow-sm shrink-0">
          <button
            onClick={onBack}
            className="md:hidden p-1.5  rounded-lg transition-colors"
          >
            <FiArrowLeft size={18} />
          </button>
          <div
            className={`w-10 h-10 rounded-full ${meta.bg} flex items-center justify-center shrink-0 shadow-sm`}
          >
            <Icon size={18} className="" />
          </div>
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => setShowMembers((v) => !v)}
          >
            <p className="text-sm font-bold  truncate">
              {group.name}
            </p>
            <p className="text-xstruncate flex items-center gap-1.5">
              <span>{group.members?.length || 0} members</span>
              {group.type === "announcement" && (
                <span className="inline-flex items-center gap-0.5 text-amber-500 font-semibold">
                  <FiLock size={9} /> Admin only
                </span>
              )}
            </p>
          </div>
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="p-2  rounded-xl transition-colors"
            >
              <BsThreeDotsVertical size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 z-30 bg-[rgb(var(--surface))] rounded-xl shadow-xl border border-gray-100 py-1 min-w-42.5">
                <button
                  onClick={() => {
                    setShowMembers((v) => !v);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium "
                >
                  <FiUsers size={13} />{" "}
                  {showMembers ? "Hide Members" : "View Members"}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowAddMember(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium "
                  >
                    <FiUserPlus size={13} /> Add Member
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pinned banner */}
        {pinnedMsg && <PinnedBanner msg={pinnedMsg} userLookup={userLookup} />}

        {/* ── Messages ── */}
        <div
          className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 bg-[rgb(var(--surface))]"
          
        >
          {page < totalPages && (
            <div className="text-center py-2 mb-1">
              <button
                onClick={() => fetchMessages(page + 1)}
                disabled={loading}
                className="text-xs font-semibold bg-[rgb(var(--surface))] px-4 py-1.5 rounded-full shadow-sm border border-indigo-100 hover:bg-indigo-50 transition-colors"
              >
                {loading ? (
                  <>
                    <FiLoader
                      size={11}
                      className="animate-spin inline mr-1.5"
                    />
                    Loading…
                  </>
                ) : (
                  <>
                    <FiChevronDown size={11} className="inline mr-1" />
                    Load earlier
                  </>
                )}
              </button>
            </div>
          )}

          {loading && messages.length === 0 ? (
            <div className="flex flex-col gap-3 pt-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}
                >
                  <Skel cls="w-7 h-7 rounded-full shrink-0" />
                  <Skel
                    cls={`h-14 rounded-2xl ${i % 2 === 0 ? "w-48" : "w-52"}`}
                  />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
              <div
                className={`w-16 h-16 rounded-full ${meta.bg} flex items-center justify-center mb-4 opacity-20`}
              >
                <Icon size={30} className="text-[rgb(var(--primary))]" />
              </div>
              <p className="text-sm font-semibold ">
                No messages yet
              </p>
              <p className="text-xs  mt-1">
                {canSend
                  ? "Send the first message!"
                  : "Waiting for an admin to post…"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 pb-2">
              {grouped.map((item, i) =>
                item.type === "date" ? (
                  <DateSep key={`d-${i}`} date={item.date} />
                ) : (
                  <Bubble
                    key={item.data._id}
                    msg={item.data}
                    isOwn={
                      // sender.userId may be an object with _id or a raw string
                      (typeof item.data.sender?.userId === "object"
                        ? item.data.sender?.userId?._id?.toString()
                        : item.data.sender?.userId?.toString()) === myId
                    }
                    isAdmin={isAdmin}
                    onDelete={deleteMsg}
                    onPin={pinMsg}
                    userLookup={userLookup}
                  />
                ),
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Input bar ── */}
        {canSend ? (
          <div className="shrink-0  border-t border-gray-100 px-3 py-2.5">
            {file && (
              <div className="flex items-center gap-1.5 mb-2 bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full w-fit max-w-65">
                {fileIcon}
                <span className="truncate flex-1">{file.name}</span>
                <span className="text-indigo-400 shrink-0">
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
                <button
                  onClick={() => setFile(null)}
                  className="text-indigo-400 hover:text-indigo-700 ml-0.5 shrink-0"
                >
                  <FiX size={11} />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                title="Attach file (image / video / PDF / doc — max 10 MB)"
                className="p-2.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors shrink-0 mb-0.5"
              >
                <FiPaperclip size={17} />
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={handleFile}
              />

              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Type a message… (Enter to send)"
                rows={1}
                className="flex-1 resize-none py-2.5 px-3.5 rounded-2xl border border-gray-200 text-[rgb(var(--text))] bg-[rgb(var(--surface))] focus:outline-none focus:ring-2  transition-all overflow-hidden"
                style={{ minHeight: 42, maxHeight: 120, fontFamily: "inherit" }}
              />

              <button
                onClick={send}
                disabled={sending || (!text.trim() && !file)}
                className="p-2.5  bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-light))] disabled:bg-[rgb(var(--surface))] disabled:cursor-not-allowed rounded-xl transition-colors shrink-0 mb-0.5 shadow-sm"
              >
                {sending ? (
                  <FiLoader size={16} className="animate-spin" />
                ) : (
                  <FiSend size={16} />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="shrink-0 bg-gray-50 border-t border-gray-100 px-4 py-3.5 flex items-center justify-center gap-2 text-gray-400">
            <FiLock size={13} />
            <span className="text-xs font-medium">
              {group.type === "announcement"
                ? "Only admins can send in announcement groups"
                : "You don't have permission to send messages"}
            </span>
          </div>
        )}
      </div>

      {/* ── Members side panel ── */}
      <div
        className={`shrink-0 border-l border-gray-100 bg-white overflow-hidden transition-all duration-300 ${showMembers ? "w-64 xl:w-72" : "w-0"}`}
      >
        {showMembers && (
          <MembersPanel
            group={group}
            isAdmin={isAdmin}
            onRemove={removeMember}
            onAdd={() => {
              setShowAddMember(true);
              setShowMembers(false);
            }}
            userLookup={userLookup}
          />
        )}
      </div>

      {isAdmin && showAddMember && (
        <AddMemberModal
          group={group}
          onClose={() => setShowAddMember(false)}
          onAdded={(updated) => onGroupUpdated(updated)}
        />
      )}
    </div>
  );
}

// ─── GROUP SIDEBAR ITEM ───────────────────────────────────────────────────────
function GroupItem({ group, isActive, onClick }) {
  const meta = GROUP_TYPE_META[group.type] || GROUP_TYPE_META.custom;
  const { Icon } = meta;
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-all rounded-xl mx-1.5 ${isActive ? "bg-[rgb(var(--primary))] shadow-sm" : "hover:bg-[rgb(var(--surface))]"}`}
    >
      <div
        className={`w-12 h-12 rounded-full ${meta.bg} flex items-center justify-center shrink-0 shadow-sm`}
      >
        <Icon size={21} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span
            className={`text-sm font-semibold truncate ${isActive ? "text-[rgb(var(--text))]" : "text-[rgb(var(--primary))]"}`}
          >
            {group.name}
          </span>
          <span className="text-[10px]  shrink-0">
            {timeAgo(group.updatedAt || group.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${meta.soft} ${meta.text}`}
          >
            {meta.label}
          </span>
          <span className="text-[10px]">
            {group.members?.length || 0} members
          </span>
          {group.lastMessage && (
            <span className="text-[10px]  truncate max-w-20">
              · {group.lastMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TYPE FILTER CHIP ─────────────────────────────────────────────────────────
function TypeChip({
  label,
  active,
  onClick,
  text = "text-[rgb(var(--text))]",
  soft = "bg-[rgb(var(--primary))]",
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold  transition-all border
        ${active ? `${soft} ${text}` : "text-[rgb(var(--text))] bg-[rgb(var(--surface))] "}`}
    >
      {label}
    </button>
  );
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────
export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [mobileView, setMobileView] = useState("list");

  /**
   * userLookup: { [mongoId]: { name, fullName, firstName, lastName, photo, userType } }
   * Built by fetching /students + /teachers once, so message senders
   * and member list always show real names even when the backend returns raw ObjectIds.
   */
  const [userLookup, setUserLookup] = useState({});

  // ── Fetch current user ──────────────────────────────────────────────────────
  useEffect(() => {
    api
      .get("/auth/me")
      .then(({ data }) => {
        if (data.success) {
          setCurrentUser({
            ...data.user,
            id: data.user.teacher_id || data.user.school_id,
          });
        }
      })
      .catch(() => {});
  }, []);

  // ── Build user lookup cache ─────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const buildLookup = async () => {
      try {
        const [sRes, tRes] = await Promise.allSettled([
          api.get("/students"),
          api.get("/teachers"),
        ]);
        const map = {};
        if (sRes.status === "fulfilled" && sRes.value.data.success) {
          (sRes.value.data.data || []).forEach((s) => {
            map[s._id] = {
              name: `${s.firstName || ""} ${s.lastName || ""}`.trim(),
              photo: s.documents?.studentPhoto?.url || null,
              userType: "student",
            };
          });
        }
        if (tRes.status === "fulfilled" && tRes.value.data.success) {
          (tRes.value.data.data || []).forEach((t) => {
            map[t._id] = {
              name: t.fullName || t.name || "",
              photo: t.photo?.url || null,
              userType: "teacher",
            };
          });
        }
        if (currentUser?.id) {
          map[currentUser.id] = {
            name: currentUser.name || "Admin",
            photo: null,
            userType: "admin",
          };
        }
        setUserLookup(map);
      } catch {}
    };
    buildLookup();
  }, [currentUser]);

  // ── Fetch groups ────────────────────────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    if (!currentUser) return;
    setLoadingGroups(true);
    try {
      const ep =
        currentUser.role === "school_admin"
          ? "/groups/school-groups"
          : "/groups/my-groups";
      const { data } = await api.get(ep, { params: { limit: 50 } });
      if (data.success) {
        setGroups(data.data || []);
        if (data.data?.length > 0 && !selected) setSelected(data.data[0]);
      }
    } catch {
      toast.error("Failed to load groups");
    } finally {
      setLoadingGroups(false);
    }
  }, [currentUser?.role]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Only school_admin can create groups
  const isAdmin = currentUser?.role === "school_admin";
  const isTeacher = currentUser?.role === "teacher_admin";

  const filtered = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) &&
      (filterType === "all" || g.type === filterType),
  );

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{`
        * { box-sizing: border-box; } body { margin: 0; }
        @keyframes modalIn { from { opacity:0; transform:translateY(12px) scale(.97) } to { opacity:1; transform:none } }
        textarea, input, select { font-family: 'Outfit', sans-serif !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
      `}</style>

      <div
        className="flex h-[85vh] overflow-hidden bg-[rgb(var(--bg))] text-[rgb(var(--text))]"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        {/* ── SIDEBAR ── */}
        <div
          className={`flex flex-col  border-r border-[rgb(var--border)] shrink-0 w-full md:w-72 lg:w-80 ${mobileView === "chat" ? "hidden md:flex" : "flex"}`}
        >
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[rgb(var(--primary))] rounded-xl flex items-center justify-center shadow-sm">
                  <MdOutlineGroups size={17} className="" />
                </div>
                <span className="text-base font-bold ">
                  Groups
                </span>
                <span className="text-xs font-bold text-[rgb(var(--text))] bg-[rgb(var(--primary))] px-2 py-0.5 rounded-full">
                  {groups.length}
                </span>
              </div>

              {/* ✅ Only school_admin sees the New button */}
              {isAdmin && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[rgb(var(--text))] bg-[rgb(var(--primary))] text-xs font-semibold rounded-xl hover:[rgb(var(--primary-light))] transition-colors shadow-sm"
                >
                  <FiPlus size={13} /> New
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 border rounded-xl px-3 py-2.5 mb-3">
              <FiSearch size={13} className="shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search groups…"
                className="bg-transparent text-sm ttext-[rgb(var(--text))] flex-1 outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-[rgb(var(--primary))]"
                >
                  <FiX size={12} />
                </button>
              )}
            </div>

            <div
              className="flex gap-1.5 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none" }}
            >
              <TypeChip
                label="All"
                active={filterType === "all"}
                onClick={() => setFilterType("all")}
              />
              {Object.entries(GROUP_TYPE_META).map(([k, v]) => (
                <TypeChip
                  key={k}
                  label={v.label}
                  active={filterType === k}
                  onClick={() => setFilterType(k)}
                  text={v.text}
                  soft={v.soft}
                />
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {loadingGroups ? (
              <div className="flex flex-col gap-1 px-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-3 items-center p-3">
                    <Skel cls="w-12 h-12 rounded-full" />
                    <div className="flex-1 flex flex-col gap-2">
                      <Skel cls="h-3 w-3/4" />
                      <Skel cls="h-2.5 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 ">
                <MdOutlineGroups size={32} className="mb-2 opacity-20" />
                <p className="text-sm">
                  {search ? "No groups found" : "No groups yet"}
                </p>
              </div>
            ) : (
              filtered.map((g) => (
                <GroupItem
                  key={g._id}
                  group={g}
                  isActive={selected?._id === g._id}
                  onClick={() => {
                    setSelected(g);
                    setMobileView("chat");
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* ── CHAT PANEL ── */}
        <div
          className={`flex-1 min-w-0 h-full overflow-hidden  flex flex-col ${mobileView === "list" ? "hidden md:flex" : "flex"}`}
        >
          {selected ? (
            <ChatWindow
              key={selected._id}
              group={selected}
              currentUser={currentUser}
              userLookup={userLookup}
              onGroupUpdated={(updated) => {
                setGroups((prev) =>
                  prev.map((g) => (g._id === updated._id ? updated : g)),
                );
                setSelected(updated);
              }}
              onBack={() => setMobileView("list")}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-center px-6">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <MdOutlineGroups size={38} className="text-indigo-400" />
              </div>
              <p className="text-base font-bold text-gray-700 mb-1">
                Select a group
              </p>
              <p className="text-sm text-gray-400">
                Choose a group from the sidebar to open the chat
              </p>
              {/* Only school_admin can create */}
              {isAdmin && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <FiPlus size={14} /> Create a group
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Only school_admin can open this modal */}
      {showCreate && isAdmin && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={(g) => {
            setGroups((prev) => [g, ...prev]);
            setSelected(g);
            setMobileView("chat");
          }}
        />
      )}

      <ToastContainer
        position="bottom-right"
        autoClose={3200}
        toastStyle={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 13,
          borderRadius: 12,
        }}
      />
    </>
  );
}
