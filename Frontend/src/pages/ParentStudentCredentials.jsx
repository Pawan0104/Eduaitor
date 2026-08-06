import { useMemo, useState } from "react";
import { FaKey, FaEye, FaEyeSlash, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../config/axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

/**
 * Parent page: view active child's student username and set a new student password.
 */
export default function ParentStudentCredentials() {
  const navigate = useNavigate();
  const { user, switchChild } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const children = Array.isArray(user?.children) ? user.children : [];
  const activeChild = useMemo(() => {
    if (!children.length) return null;
    const id = user?.activeChildId || user?.student_id;
    return (
      children.find((c) => String(c._id) === String(id)) || children[0] || null
    );
  }, [children, user?.activeChildId, user?.student_id]);

  const username =
    activeChild?.username || activeChild?.studentId || "—";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeChild?._id) {
      toast.error(
        t("parentCreds.noChild", "No active child selected."),
      );
      return;
    }
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
      await api.post("/auth/parent/student-password", {
        studentId: activeChild._id,
        newPassword: form.newPassword,
      });
      toast.success(
        t(
          "parentCreds.updated",
          "Student password updated successfully.",
        ),
      );
      setForm({ newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          t("parentCreds.updateFailed", "Failed to update student password."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen font-nunito pb-10"
      style={{ background: "rgb(var(--bg))" }}
    >
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"
        >
          <FaArrowLeft /> {t("common.back", "Back")}
        </button>

        <div
          className="rounded-2xl border p-5 shadow-sm"
          style={{
            background: "rgb(var(--card-bg, 255 255 255))",
            borderColor: "rgba(148,163,184,0.3)",
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: "#EEF2FF", color: "#4F46E5" }}
            >
              <FaKey />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">
                {t("parentCreds.title", "Student login credentials")}
              </h1>
              <p className="text-sm text-slate-500">
                {t(
                  "parentCreds.subtitle",
                  "View your child's username and set a new password.",
                )}
              </p>
            </div>
          </div>

          {children.length > 1 && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                {t("parentCreds.child", "Child")}
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                value={String(activeChild?._id || "")}
                onChange={async (e) => {
                  await switchChild(e.target.value);
                }}
              >
                {children.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name || c.studentId}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 mb-1">
              {t("parentCreds.studentName", "Student")}
            </p>
            <p className="font-semibold text-slate-800">
              {activeChild?.name || "—"}
            </p>
          </div>

          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-500 mb-1">
              {t("parentCreds.username", "Student username")}
            </p>
            <p className="font-mono text-base bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
              {username}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              {t("parentCreds.setPassword", "Set new student password")}
            </p>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
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
              >
                {showNew ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
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
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading || !activeChild}
              className="w-full py-3 rounded-xl text-white font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading
                ? t("common.updating", "Updating…")
                : t("parentCreds.save", "Update student password")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
