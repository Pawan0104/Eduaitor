import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { FaHeadset } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

// Deduplicate parallel Help opens (React Strict Mode / double taps)
const helpStartInflight = new Map();

async function startHelpThreadRequest() {
  const key = "help";
  if (helpStartInflight.has(key)) {
    return helpStartInflight.get(key);
  }
  const promise = axios
    .post(`${API}/message-signal/help/start`, {}, { withCredentials: true })
    .then((res) => res.data)
    .finally(() => {
      helpStartInflight.delete(key);
    });
  helpStartInflight.set(key, promise);
  return promise;
}

/**
 * Landing page for Help — opens (or resumes) chat with Super Admin.
 */
export default function HelpSupport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const basePath = (() => {
    if (user?.role === "school_admin") return "/school";
    if (user?.role === "teacher_admin") return "/teacher";
    if (user?.role === "student_admin")
      return user.loginAs === "parent" ? "/parent" : "/student";
    return "";
  })();

  useEffect(() => {
    let cancelled = false;

    const openHelp = async () => {
      try {
        const data = await startHelpThreadRequest();
        if (cancelled) return;
        if (data?.threadId) {
          navigate(`${basePath}/messages/${data.threadId}`, { replace: true });
          return;
        }
        setError("Could not open help chat.");
      } catch (err) {
        if (cancelled) return;
        const msg =
          err.response?.data?.message || "Failed to open help chat.";
        setError(msg);
        toast.error(msg);
      }
    };

    if (basePath) openHelp();
    else setError("Help chat is not available for your account.");

    return () => {
      cancelled = true;
    };
  }, [basePath, navigate]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
        <FaHeadset size={28} />
      </div>
      {error ? (
        <>
          <p className="text-sm text-red-500 max-w-sm">{error}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg border text-sm font-medium"
          >
            Go back
          </button>
        </>
      ) : (
        <>
          <p className="text-base font-semibold text-[rgb(var(--text))]">
            Opening your support chat…
          </p>
          <p className="text-sm text-[rgb(var(--text-light))]">
            You can message the Super Admin directly about any issue.
          </p>
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </>
      )}
    </div>
  );
}
