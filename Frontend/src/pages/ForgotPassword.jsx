import { useState } from "react";
import { Link } from "react-router-dom";
import { FaEnvelope, FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import logo from "/eduaitor.png";
import api from "../config/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", {
        email: email.trim(),
      });
      setSent(true);
      toast.success(
        res.data?.message ||
          "If an account exists for that email, a reset link has been sent.",
      );
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Unable to send reset email right now",
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
            Forgot password
          </h1>
          <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">
            Enter the email on your school admin, teacher, or staff account. We
            will send a reset link if it matches.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-[rgb(var(--text))]">
              Check your inbox (and spam folder). The link expires in 1 hour.
            </p>
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--primary))]"
            >
              <FaArrowLeft /> Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="relative">
              <FaEnvelope className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input !pl-12"
                autoComplete="email"
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
              {loading ? "Sending…" : "Send reset link"}
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
