import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { clearSessionKeepPrefs } from "../utils/clearSessionKeepPrefs";
import DesignSkinPicker from "./DesignSkinPicker";
import UserAvatar from "./UserAvatar";

/**
 * Bottom sheet shown from the "Profile" tab of BottomNav.
 * Shows user info, theme (app design), and logout.
 */
const ProfileSheet = ({ onClose }) => {
  const { user, setUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL;

  const name = user?.name || user?.school_name || "User";
  const role = user?.role || "User";
  const loginAs = user?.loginAs;

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      toast.info(t("topbar.logoutSuccess"));
    } catch {
      toast.error(t("topbar.logoutFailed"));
    }
    setUser(null);
    clearSessionKeepPrefs();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-[1.75rem] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 pt-3 shadow-2xl"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1.5 w-11 rounded-full bg-[rgb(var(--border-strong))]" />

        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-[rgba(var(--primary),0.08)] p-3.5">
          <UserAvatar
            name={name}
            photoUrl={user?.photo_url}
            size="lg"
            rounded="2xl"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[rgb(var(--text))]">
              {name}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--text-muted))]">
              {loginAs
                ? loginAs.toUpperCase()
                : role.replace("_", " ").toUpperCase()}
            </p>
          </div>
        </div>

        <div className="mb-5">
          <DesignSkinPicker variant="inline" />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] py-3.5 text-sm font-extrabold text-[rgb(var(--text))] transition-transform active:scale-95"
          >
            {t("common.close")}
          </button>
          <button
            onClick={logout}
            className="flex-1 rounded-2xl bg-gradient-to-br from-[rgb(var(--sidebar))] to-[rgb(var(--primary))] py-3.5 text-sm font-extrabold text-white transition-transform active:scale-95"
          >
            {t("common.logout")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSheet;
