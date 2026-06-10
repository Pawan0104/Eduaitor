import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaUserShield,
  FaArrowLeft,
  FaLock,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";

const API = import.meta.env.VITE_API_URL;

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";
  const { fetchUser } = useAuth();

  useEffect(() => {
    // Push a dummy entry so back has nowhere protected to go
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const isMobile = window.innerWidth <= 768;

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const res = await axios.post(`${API}/auth/login`, form, {
        withCredentials: true,
      });

      const role = res.data.data.role;
      const loginAs = res.data.data.loginAs; // "student" or "parent"
      const isFirstTime = res.data.data.firstTimeLogin;

      if (role === "student_admin" && isFirstTime) {
        await fetchUser(); // need user in context for /change-password ProtectedRoute
        toast.info("Please change your default password to continue.");
        navigate("/change-password", { replace: true });
        return;
      }

      // For all other roles, fetchUser then navigate
      await fetchUser();

      if (role === "super_admin") {
        if (isMobile) {
          navigate(from, { replace: true });
          navigate("/admin/menu"); // mobile page
        } else {
          navigate("/admin/dashboard"); // desktop page
        }
        toast.success("Login successful! Welcome back.");
      } else if (role === "school_admin") {
        if (isMobile) {
          navigate(from, { replace: true });
          navigate("/school/menu"); // mobile page
        } else {
          navigate("/school/dashboard"); // desktop page
        }
        toast.success("Login successful! Welcome back.");
      } else if (role === "teacher_admin") {
        if (isMobile) {
          navigate(from, { replace: true });
          navigate("/teacher/menu"); // mobile page
        } else {
          navigate("/teacher/dashboard"); // desktop page
        }
        toast.success("Login successful! Welcome back.");
      } else if (role === "student_admin") {
        if (isFirstTime) {
          await fetchUser();
          toast.info("Please change your default password to continue.");
          navigate("/change-password", { replace: true });
          return;
        }

        await fetchUser();

        if (loginAs === "student") {
          navigate(isMobile ? "/student/menu" : "/student/dashboard", {
            replace: true,
          });
        } else {
          navigate(isMobile ? "/parent/menu" : "/parent/dashboard", {
            replace: true,
          });
        }
        toast.success("Login successful! Welcome back.");
      } else if (role === "staff_admin") {
        navigate("/staff/dashboard");
      }
    } catch {
      setError("Invalid credentials");
      toast.error("Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* LEFT PANEL */}
      <div className="hidden md:flex flex-col justify-center items-center bg-linear-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white p-12">
        <h1 className="text-5xl font-bold mb-4">EduAitor</h1>

        <p className="text-lg opacity-90 text-center max-w-md">
          Manage schools, students, teachers, fees and analytics in one powerful
          platform.
        </p>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex items-center justify-center bg-linear-to-br from-[#e6edf8] via-[#d7e2f5] to-[#eef1fb] p-6">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl shadow-xl rounded-2xl p-8 border border-white/40">
          {/* HEADER */}
          <div className="text-center mb-8">
            <FaUserShield className="mx-auto text-4xl text-indigo-500 mb-3" />

            <h2 className="text-3xl font-bold text-gray-700 mb-2">Login</h2>

            <p className="text-gray-500 text-sm">EduAitor Control Panel</p>
          </div>

          {/* ERROR */}
          {error && (
            <p className="text-red-500 text-sm text-center mb-4">{error}</p>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* EMAIL */}
            <div className="relative">
              <FaUserShield className="absolute left-4 top-4 text-gray-400" />

              <input
                name="email"
                placeholder="Enter UserName"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>

            {/* PASSWORD */}
            <div className="relative">
              <FaLock className="absolute left-4 top-4 text-gray-400" />

              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none"
              />

              <div
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4 cursor-pointer text-gray-400"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </div>
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl text-white font-semibold transition shadow-md
              ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-linear-to-r from-purple-500 to-indigo-500 hover:opacity-90"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Logging in...
                </div>
              ) : (
                "Login to Admin Panel"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}