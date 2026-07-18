import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { FaHeadset } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

/**
 * Opens a direct help chat with platform Super Admin.
 * Available for school, teacher, student, and parent accounts.
 */
export default function HelpButton({
  label = "Help / Support",
  className = "",
  iconOnly = false,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const getBasePath = () => {
    if (!user) return "";
    if (user.role === "school_admin") return "/school";
    if (user.role === "teacher_admin") return "/teacher";
    if (user.role === "student_admin")
      return user.loginAs === "parent" ? "/parent" : "/student";
    return "";
  };

  const canUseHelp =
    user?.role === "school_admin" ||
    user?.role === "teacher_admin" ||
    user?.role === "student_admin";

  const handleClick = async () => {
    if (!canUseHelp) {
      toast.error("Help chat is not available for your account.");
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.post(
        `${API}/message-signal/help/start`,
        {},
        { withCredentials: true },
      );
      if (!data?.threadId) {
        toast.error("Could not open help chat.");
        return;
      }
      navigate(`${getBasePath()}/messages/${data.threadId}`);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to open help chat.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!canUseHelp) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title="Message Super Admin for help"
      className={`
        inline-flex items-center justify-center gap-2
        rounded-xl font-medium text-sm transition
        bg-amber-500 hover:bg-amber-600 text-white
        disabled:opacity-50 disabled:cursor-not-allowed
        ${iconOnly ? "p-2" : "px-4 py-2"}
        ${className}
      `}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <FaHeadset size={16} />
      )}
      {!iconOnly && <span>{loading ? "Opening…" : label}</span>}
    </button>
  );
}
