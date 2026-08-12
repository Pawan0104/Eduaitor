import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { clearSessionKeepPrefs } from "../utils/clearSessionKeepPrefs";
import DesignSkinPicker from "./DesignSkinPicker";
import LanguageSwitcher from "./LanguageSwitcher";
import { MenuStylePicker } from "./RoleMenuShell";
import UserAvatar from "./UserAvatar";

/**
 * Bottom sheet shown from the "Profile" tab of BottomNav.
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
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-2xl"
        style={{
          maxHeight:
            "min(88dvh, calc(100dvh - 5.5rem - env(safe-area-inset-bottom, 0px)))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 mb-3 h-1.5 w-11 shrink-0 rounded-full bg-[rgb(var(--border-strong))]" />

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-[rgba(var(--primary),0.08)] p-3.5">
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

          <div className="mb-4 space-y-4">
            <div>
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                {t("lang.switch", "Language")}
              </p>
              <LanguageSwitcher />
            </div>

            <div>
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                {t("menu.style", "Menu icons")}
              </p>
              <MenuStylePicker className="w-full h-11 [&_button]:h-11 [&_button]:w-full [&_button]:justify-start [&_button]:px-3" />
            </div>

            <div>
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                {t("topbar.appDesign", "App design")}
              </p>
              <DesignSkinPicker
                variant="topbar"
                className="w-full h-11 [&_button]:h-11 [&_button]:w-full [&_button]:justify-start [&_button]:px-3"
              />
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 gap-3 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 pt-3"
          style={{
            paddingBottom:
              "max(1rem, calc(5.25rem + env(safe-area-inset-bottom, 0px)))",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] py-3.5 text-sm font-extrabold text-[rgb(var(--text))] transition-transform active:scale-95"
          >
            {t("common.close")}
          </button>
          <button
            type="button"
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
