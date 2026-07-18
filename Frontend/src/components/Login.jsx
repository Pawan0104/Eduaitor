import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
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
import logo from "/eduaitor.png";
import LanguageSwitcher from "./LanguageSwitcher"; 

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
  const { t } = useLanguage();

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

  const isMobile = window.innerWidth < 1024;

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const payload = {
        email: form.email.trim(),
        password: form.password,
      };

      const res = await axios.post(`${API}/auth/login`, payload, {
        withCredentials: true,
      });

      const role = res.data.data.role;
      const loginAs = res.data.data.loginAs; // "student" or "parent"
      const isFirstTime = res.data.data.firstTimeLogin;

      if (role === "student_admin" && isFirstTime) {
        await fetchUser(); // need user in context for /change-password ProtectedRoute
        toast.info(t("login.changePassword"));
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
        toast.success(t("login.success"));
      } 
      else if (role === "school_admin") {
        if (isMobile) {
          navigate(from, { replace: true });
          navigate("/school/menu"); // mobile page
        } else {
          navigate("/school/dashboard"); // desktop page
        }
        toast.success(t("login.success"));
      } else if (role === "teacher_admin") {
        if (isMobile) {
          navigate(from, { replace: true });
          navigate("/teacher/menu"); // mobile page
        } else {
          navigate("/teacher/dashboard"); // desktop page
        }
        toast.success(t("login.success"));
      } 
      else if (role === "student_admin") {
        if (isFirstTime) {
          await fetchUser();
          toast.info(t("login.changePassword"));
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
        toast.success(t("login.success"));
      } else if (role === "staff_admin") {
        navigate(isMobile ? "/staff/menu" : "/staff/dashboard", {
          replace: true,
        });
        toast.success(t("login.success"));
      }
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Invalid credentials";
      setError(backendMessage);
      toast.error(
        backendMessage === "Invalid credentials"
          ? t("login.failed")
          : backendMessage,
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* LEFT PANEL */}
      <div className="hidden md:flex flex-col justify-center items-center bg-linear-to-br from-[#e6edf8] via-[#d7e2f5] to-[#eef1fb]  text-white p-12">
       <img className="h-44" src={logo} alt="" />
      </div>

      {/* RIGHT PANEL */}
      <div className="flex items-center justify-center bg-linear-to-br from-indigo-600 via-purple-600 to-indigo-700 p-6">
        <div className="w-full max-w-md bg-white backdrop-blur-xl shadow-xl rounded-2xl p-8 border border-white/40">
          <LanguageSwitcher variant="login" />

          {/* HEADER */}
          <div className="text-center mb-8">
            <FaUserShield className="mx-auto text-4xl text-indigo-500 mb-3" />

            <h2 className="text-3xl font-bold text-gray-700 mb-2">
              {t("login.title")}
            </h2>

            <p className="text-gray-500 text-sm">{t("login.subtitle")}</p>
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
                placeholder={t("login.emailPlaceholder")}
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
                placeholder={t("login.passwordPlaceholder")}
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
                  {t("login.loggingIn")}
                </div>
              ) : (
                t("login.button")
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}