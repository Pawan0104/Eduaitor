import { useEffect, useState } from "react";
import { FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../config/axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

/**
 * Optional first-login password change modal.
 * Shown when user.firstTimeLogin is true — Change or Skip (dismisses without changing password).
 */
export default function OptionalPasswordChangeModal() {
  const { user, setUser } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.firstTimeLogin) {
      setOpen(true);
      setShowForm(false);
    } else {
      setOpen(false);
    }
  }, [user?.firstTimeLogin, user?._id, user?.student_id, user?.role]);

  if (!open || !user?.firstTimeLogin) return null;

  const clearFlagLocally = () => {
    setUser((prev) => (prev ? { ...prev, firstTimeLogin: false } : prev));
    setOpen(false);
  };

  const handleSkip = async () => {
    try {
      setLoading(true);
      await api.post("/auth/dismiss-password-prompt");
      toast.info(
        t(
          "password.promptSkipped",
          "You can change your password later from settings.",
        ),
      );
      clearFlagLocally();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          t("password.skipFailed", "Could not dismiss password prompt"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 6) {
      toast.error(
        t("password.minLength", "Password must be at least 6 characters."),
      );
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error(t("password.mismatch", "Passwords do not match."));
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/change-password", {
        newPassword: form.newPassword,
      });
      toast.success(
        t("password.updated", "Password updated successfully."),
      );
      clearFlagLocally();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          t("password.updateFailed", "Failed to change password."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
      style={{ background: "rgba(15, 23, 42, 0.55)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="optional-pw-title"
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl border p-6"
        style={{
          background: "rgb(var(--card-bg, 255 255 255))",
          borderColor: "rgba(148, 163, 184, 0.35)",
        }}
      >
        <div className="text-center mb-5">
          <FaLock className="mx-auto text-3xl mb-3" style={{ color: "#4f46e5" }} />
          <h2
            id="optional-pw-title"
            className="text-xl font-bold"
            style={{ color: "rgb(var(--text, 31 41 55))" }}
          >
            {t("password.promptTitle", "Change your password?")}
          </h2>
          <p
            className="text-sm mt-2"
            style={{ color: "rgb(var(--muted, 107 114 128))" }}
          >
            {t(
              "password.promptBody",
              "For security, we recommend setting a new password. This is optional — you can skip and continue.",
            )}
          </p>
        </div>

        {!showForm ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowForm(true)}
              className="app-btn-primary w-full py-3 rounded-xl disabled:opacity-60"
            >
              {t("password.changeNow", "Change password")}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSkip}
              className="w-full py-3 rounded-xl font-semibold border border-slate-200 hover:bg-slate-50 disabled:opacity-60"
              style={{ color: "rgb(var(--text, 55 65 81))" }}
            >
              {loading
                ? t("common.pleaseWait", "Please wait…")
                : t("password.skipForNow", "Skip for now")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                name="newPassword"
                placeholder={t("password.new", "New password")}
                value={form.newPassword}
                onChange={(e) =>
                  setForm((f) => ({ ...f, newPassword: e.target.value }))
                }
                required
                className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="button"
                className="absolute right-3 top-3.5 text-gray-400"
                onClick={() => setShowNew((v) => !v)}
                aria-label="Toggle password visibility"
              >
                {showNew ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                placeholder={t("password.confirm", "Confirm new password")}
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((f) => ({ ...f, confirmPassword: e.target.value }))
                }
                required
                className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="button"
                className="absolute right-3 top-3.5 text-gray-400"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label="Toggle confirm visibility"
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="app-btn-primary w-full py-3 rounded-xl disabled:opacity-60"
            >
              {loading
                ? t("common.updating", "Updating…")
                : t("password.update", "Update password")}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowForm(false)}
              className="w-full py-2 text-sm text-slate-500"
            >
              {t("common.back", "Back")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
