import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";

const API = import.meta.env.VITE_API_URL;

export default function ChangePassword() {
  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const isMobile = window.innerWidth <= 768;

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${API}/auth/change-password`,
        { newPassword: form.newPassword },
        { withCredentials: true }
      );

      toast.success("Password changed successfully! Please log in again.");
      navigate("/admin/login");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to change password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e6edf8] via-[#d7e2f5] to-[#eef1fb] p-6">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl shadow-xl rounded-2xl p-8 border border-white/40">
        {/* Header */}
        <div className="text-center mb-8">
          <FaLock className="mx-auto text-4xl text-indigo-500 mb-3" />
          <h2 className="text-2xl font-bold text-gray-700">
            Set New Password
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Your default password is{" "}
            <span className="font-semibold text-indigo-500">123456</span>.
            Please set a new one to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password */}
          <div className="relative">
            <FaLock className="absolute left-4 top-4 text-gray-400" />
            <input
              type={showNew ? "text" : "password"}
              name="newPassword"
              placeholder="New Password"
              value={form.newPassword}
              onChange={handleChange}
              required
              className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none"
            />
            <div
              onClick={() => setShowNew(!showNew)}
              className="absolute right-4 top-4 cursor-pointer text-gray-400"
            >
              {showNew ? <FaEyeSlash /> : <FaEye />}
            </div>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <FaLock className="absolute left-4 top-4 text-gray-400" />
            <input
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm New Password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none"
            />
            <div
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-4 cursor-pointer text-gray-400"
            >
              {showConfirm ? <FaEyeSlash /> : <FaEye />}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl text-white font-semibold transition shadow-md
              ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-500 to-indigo-500 hover:opacity-90"
              }`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Updating...
              </div>
            ) : (
              "Update Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}