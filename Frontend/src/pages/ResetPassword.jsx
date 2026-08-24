import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaLock, FaEye, FaEyeSlash, FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import logo from "/eduaitor.png";
import api from "../config/axios";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = useMemo(() => String(params.get("token") || "").trim(), [params]);
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Reset link is missing or invalid");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", { token, password });
      toast.success(res.data?.message || "Password updated");
      navigate("/admin/login", { replace: true });
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Unable to reset password right now",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--bg))] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-8 shadow-lg">
        <div className="mb-6 text-center">
          <img src={logo} alt="Eduaitor" className="mx-auto mb-3 h-12 w-auto" />
          <h1 className="text-2xl font-bold text-[rgb(var(--text))]">
            Set new password
          </h1>
          <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">
            Choose a new password for your Eduaitor account.
          </p>
        </div>

        {!token ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-red-600">
              This reset link is missing or invalid.
            </p>
            <Link
              to="/admin/forgot-password"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--primary))]"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="relative">
              <FaLock className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min 8 characters)"
                className="input !pl-12 !pr-12"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-3 z-10 -translate-y-1/2 cursor-pointer p-1 text-[rgb(var(--text-muted))]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div className="relative">
              <FaLock className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="input !pl-12"
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl py-3 font-semibold shadow-md transition ${
                loading
                  ? "cursor-not-allowed bg-gray-400 text-white"
                  : "login-submit hover:opacity-90"
              }`}
            >
              {loading ? "Saving…" : "Update password"}
            </button>
            <Link
              to="/admin/login"
              className="flex items-center justify-center gap-2 text-sm text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))]"
            >
              <FaArrowLeft /> Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
