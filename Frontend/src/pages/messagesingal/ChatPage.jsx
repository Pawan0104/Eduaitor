import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import {
  FiArrowLeft,
  FiSend,
  FiPaperclip,
  FiX,
  FiFile,
} from "react-icons/fi";

const API = import.meta.env.VITE_API_URL;

const formatTime = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateSeparator = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const Avatar = ({ photo, name, size = 38 }) => {
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
                 text-xs font-semibold"
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

const MessageBubble = ({ message, isMe }) => {
  const hasText = message.text?.trim();
  const hasAttachment = message.attachment?.url;
  const isImage = message.attachment?.type?.startsWith("image/");
  const isPdf = message.attachment?.type === "application/pdf";

  return (
    <div className={`flex mb-2 ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[75%] sm:max-w-[60%] rounded-2xl px-4 py-2 shadow-sm"
        style={
          isMe
            ? {
                backgroundColor: "rgb(var(--primary))",
                color: "#fff",
                borderBottomRightRadius: "4px",
              }
            : {
                backgroundColor: "rgb(var(--surface))",
                color: "rgb(var(--text))",
                borderBottomLeftRadius: "4px",
              }
        }
      >
        {hasAttachment && isImage && (
          <img
            src={message.attachment.url}
            alt={message.attachment.name || "image"}
            className="rounded-xl max-w-full mb-1 cursor-pointer"
            onClick={() => window.open(message.attachment.url, "_blank")}
          />
        )}

        {hasAttachment && !isImage && (
          <a
            href={message.attachment.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 mb-1 underline text-sm"
            style={{ color: isMe ? "#fff" : "rgb(var(--primary))" }}
          >
            {isPdf ? <FiFile size={16} /> : <FiPaperclip size={16} />}
            <span className="truncate max-w-[180px]">
              {message.attachment.name || "Open file"}
            </span>
          </a>
        )}

        {hasText && (
          <p className="text-sm leading-relaxed break-words">{message.text}</p>
        )}

        <p
          className="text-[10px] mt-1 text-right"
          style={{
            color: isMe ? "rgba(255,255,255,0.7)" : "rgb(var(--text-muted))",
          }}
        >
          {formatTime(message.createdAt)}
          {isMe && (
            <span className="ml-1">{message.seen ? "✓✓" : "✓"}</span>
          )}
        </p>
      </div>
    </div>
  );
};

const DateSeparator = ({ date }) => (
  <div className="flex items-center gap-2 my-4">
    <div className="flex-1 h-px" style={{ backgroundColor: "rgb(var(--border))" }} />
    <span
      className="text-xs shrink-0 px-2"
      style={{ color: "rgb(var(--text-muted))" }}
    >
      {formatDateSeparator(date)}
    </span>
    <div className="flex-1 h-px" style={{ backgroundColor: "rgb(var(--border))" }} />
  </div>
);

// ─────────────────────────────────────────────────────────────
// HELPER — get my ID + subType from auth context
// subType needed for correct isMe check with student/parent
// ─────────────────────────────────────────────────────────────
const SUPER_ADMIN_PARTICIPANT_ID = "000000000000000000000001";

const getMyInfo = (user) => {
  if (!user) return { id: null, subType: "default" };
  if (user.role === "super_admin")
    return { id: SUPER_ADMIN_PARTICIPANT_ID, subType: "default" };
  if (user.role === "teacher_admin")
    return { id: user.teacher_id, subType: "default" };
  if (user.role === "student_admin")
    return {
      id: user.student_id,
      subType: user.loginAs === "parent" ? "parent" : "student",
    };
  if (user.role === "staff_admin")
    return { id: user.staff_id, subType: "default" };
  if (user.role === "school_admin")
    return { id: user.school_id, subType: "default" };
  return { id: null, subType: "default" };
};

export default function ChatPage() {
  const { threadId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const { id: myId, subType: mySubType } = getMyInfo(user);

  // ── Role based path ────────────────────────────────────────
  let path = "";
  if (user?.role === "super_admin") path = "/admin";
  else if (user?.role === "school_admin") path = "/school";
  else if (user?.role === "teacher_admin") path = "/teacher";
  else if (user?.role === "student_admin")
    path = user.loginAs === "student" ? "/student" : "/parent";
  else if (user?.role === "staff_admin") path = "/staff";

  const fetchMessages = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
        setError("");
      }
      const res = await axios.get(
        `${API}/message-signal/thread/${threadId}`,
        { withCredentials: true }
      );
      const next = res.data.messages || [];
      setMessages((prev) => {
        // Avoid re-render flash when nothing changed
        if (
          prev.length === next.length &&
          prev[prev.length - 1]?._id === next[next.length - 1]?._id
        ) {
          return prev;
        }
        return next;
      });
    } catch (err) {
      console.error("❌ fetchMessages error:", err.message);
      if (!silent) setError("Failed to load messages.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [threadId]);

  const fetchOtherUser = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/message-signal/threads`, {
        withCredentials: true,
      });
      const thread = res.data.threads?.find((t) => t._id === threadId);
      if (thread) setOtherUser(thread.otherUser);
    } catch (err) {
      console.error("❌ fetchOtherUser error:", err.message);
    }
  }, [threadId]);

  const markAsRead = useCallback(async () => {
    try {
      await axios.put(
        `${API}/message-signal/thread/${threadId}/read`,
        {},
        { withCredentials: true }
      );
    } catch (err) {
      console.error("❌ markAsRead error:", err.message);
    }
  }, [threadId]);

  useEffect(() => {
    fetchMessages({ silent: false });
    fetchOtherUser();
    markAsRead();
  }, [fetchMessages, fetchOtherUser, markAsRead]);

  // Live refresh — poll while chat is open (no socket server yet)
  useEffect(() => {
    if (!threadId) return undefined;

    const tick = () => {
      if (document.hidden) return;
      fetchMessages({ silent: true });
    };

    const id = setInterval(tick, 2500);
    const onFocus = () => fetchMessages({ silent: true });
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [threadId, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) {
      alert("File size must be under 10MB.");
      return;
    }
    setFile(selected);
    setFilePreview(
      selected.type.startsWith("image/")
        ? URL.createObjectURL(selected)
        : null
    );
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!text.trim() && !file) return;
    try {
      setSending(true);
      const formData = new FormData();
      if (text.trim()) formData.append("text", text.trim());
      if (file) formData.append("attachment", file);

      const res = await axios.post(
        `${API}/message-signal/thread/${threadId}/send`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setMessages((prev) => [...prev, res.data.data]);
      setText("");
      removeFile();
    } catch (err) {
      console.error("❌ handleSend error:", err.message);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const groupedMessages = messages.reduce((acc, msg) => {
    const key = new Date(msg.createdAt).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(msg);
    return acc;
  }, {});

  // ── isMe — checks both senderId AND senderSubType ─────────
  // Critical for student/parent — same _id but different subType
  const isMyMessage = (msg) => {
    const sameId = msg.senderId?.toString() === myId?.toString();
    const sameSubType =
      (msg.senderSubType || "default") === mySubType;
    return sameId && sameSubType;
  };

  // ── Chat header subtitle ───────────────────────────────────
  // Shows child name for parent threads
  const headerSubtitle = () => {
    if (otherUser?.subType === "parent" && otherUser?.childName) {
      return `Parent • Child: ${otherUser.childName}`;
    }
    if (otherUser?.subType === "student" && otherUser?.className) {
      return `Student • Class ${otherUser.className}${
        otherUser.sectionName ? ` ${otherUser.sectionName}` : ""
      }`;
    }
    return otherUser?.role || "";
  };

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
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
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

        <Avatar photo={otherUser?.photo} name={otherUser?.name} size={38} />

        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-sm truncate"
            style={{ color: "rgb(var(--text))" }}
          >
            {otherUser?.name || "Loading..."}
          </p>
          {/* Subtitle — role or parent/child info */}
          <p
            className="text-xs capitalize truncate"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {headerSubtitle()}
          </p>
        </div>
      </div>

      {/* ── SCROLLABLE MESSAGES AREA ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">

        {loading && (
          <div className="flex justify-center py-10">
            <div
              className="w-8 h-8 border-4 border-t-transparent
                         rounded-full animate-spin"
              style={{
                borderColor: "rgb(var(--primary))",
                borderTopColor: "transparent",
              }}
            />
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-10">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={fetchMessages}
              className="mt-2 text-sm underline"
              style={{ color: "rgb(var(--primary))" }}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center
                          h-full gap-2 py-10">
            <p className="text-sm" style={{ color: "rgb(var(--text-muted))" }}>
              No messages yet. Say hello! 👋
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          messages.length > 0 &&
          Object.entries(groupedMessages).map(([dateKey, msgs]) => (
            <div key={dateKey}>
              <DateSeparator date={msgs[0].createdAt} />
              {msgs.map((msg) => (
                <MessageBubble
                  key={msg._id}
                  message={msg}
                  isMe={isMyMessage(msg)}
                />
              ))}
            </div>
          ))}

        <div ref={bottomRef} />
      </div>

      {/* ── FILE PREVIEW BAR ── */}
      {file && (
        <div
          className="shrink-0 px-4 py-2 border-t flex items-center gap-3"
          style={{
            backgroundColor: "rgb(var(--surface))",
            borderColor: "rgb(var(--border))",
          }}
        >
          {filePreview ? (
            <img
              src={filePreview}
              alt="preview"
              className="w-12 h-12 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-lg flex items-center
                         justify-center shrink-0"
              style={{ backgroundColor: "rgb(var(--bg))" }}
            >
              <FiFile size={20} style={{ color: "rgb(var(--primary))" }} />
            </div>
          )}
          <p
            className="text-sm truncate flex-1"
            style={{ color: "rgb(var(--text))" }}
          >
            {file.name}
          </p>
          <button
            onClick={removeFile}
            className="shrink-0 transition"
            style={{ color: "rgb(var(--text-muted))" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgb(var(--text-muted))")
            }
          >
            <FiX size={18} />
          </button>
        </div>
      )}

      {/* ── FIXED INPUT BAR ── */}
      <div
        className="shrink-0 px-4 py-3 border-t flex items-end gap-2"
        style={{
          backgroundColor: "rgb(var(--bg))",
          borderColor: "rgb(var(--border))",
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,application/pdf"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="mb-1 shrink-0 transition"
          style={{ color: "rgb(var(--text-muted))" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "rgb(var(--primary))")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgb(var(--text-muted))")
          }
          title="Attach file"
        >
          <FiPaperclip size={20} />
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none rounded-2xl px-4 py-2 text-sm
                     outline-none overflow-y-auto"
          style={{
            backgroundColor: "rgb(var(--surface))",
            color: "rgb(var(--text))",
            lineHeight: "1.5",
            maxHeight: "120px",
            border: `1px solid rgb(var(--border))`,
          }}
        />

        <button
          onClick={handleSend}
          disabled={sending || (!text.trim() && !file)}
          className="mb-1 shrink-0 p-2 rounded-full transition"
          style={
            sending || (!text.trim() && !file)
              ? {
                  backgroundColor: "rgb(var(--surface))",
                  color: "rgb(var(--text-muted))",
                  cursor: "not-allowed",
                }
              : {
                  backgroundColor: "rgb(var(--primary))",
                  color: "#fff",
                }
          }
        >
          {sending ? (
            <div
              className="w-4 h-4 border-2 border-t-transparent
                         rounded-full animate-spin"
              style={{
                borderColor: "rgb(var(--text-muted))",
                borderTopColor: "transparent",
              }}
            />
          ) : (
            <FiSend size={16} />
          )}
        </button>
      </div>
    </div>
  );
}