import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaUserShield,
  FaLock,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import { toast } from "react-toastify";
import logo from "/eduaitor.png";
import LanguageSwitcher from "./LanguageSwitcher";
import api, { setAuthToken } from "../config/axios";

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

      const res = await api.post(`/auth/login`, payload);

      if (res.data?.token) setAuthToken(res.data.token);

      const role = res.data.data.role;
      const loginAs = res.data.data.loginAs;
      const isFirstTime = res.data.data.firstTimeLogin;

      if (role === "student_admin" && isFirstTime) {
        await fetchUser();
        toast.info(t("login.changePassword"));
        navigate("/change-password", { replace: true });
        return;
      }

      await fetchUser();

      if (role === "super_admin") {
        if (isMobile) {
          navigate(from, { replace: true });
          navigate("/admin/menu");
        } else {
          navigate("/admin/dashboard");
        }
        toast.success(t("login.success"));
      } else if (role === "school_admin") {
        if (isMobile) {
          navigate(from, { replace: true });
          navigate("/school/menu");
        } else {
          navigate("/school/dashboard");
        }
        toast.success(t("login.success"));
      } else if (role === "teacher_admin") {
        if (isMobile) {
          navigate(from, { replace: true });
          navigate("/teacher/menu");
        } else {
          navigate("/teacher/dashboard");
        }
        toast.success(t("login.success"));
      } else if (role === "student_admin") {
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
      const rawMsg = String(error?.message || "");
      const isNetwork =
        !error?.response &&
        (/Network/i.test(rawMsg) || /Failed to fetch/i.test(rawMsg));
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        (isNetwork
          ? "Cannot reach API (CORS/network). Set CLIENT_URL on Render to your Netlify URL."
          : "Invalid credentials");
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

  return (
    <div className="app-safe-top login-shell grid min-h-dvh md:grid-cols-2">
      <div className="login-brand-panel hidden min-h-dvh flex-col items-center justify-center p-12 md:flex">
        <img className="h-44" src={logo} alt="Eduaitor" />
        <p className="mt-4 text-sm font-semibold text-[rgb(var(--text-muted))]">
          {t("brand.tagline", "Smarter Schools. Stronger Students.")}
        </p>
      </div>

      <div className="login-form-panel flex min-h-[calc(100dvh-env(safe-area-inset-top,0px))] items-center justify-center p-6 md:min-h-dvh">
        <div className="login-card w-full max-w-md p-8">
          <LanguageSwitcher variant="login" />

          <div className="mb-8 text-center">
            <FaUserShield className="mx-auto mb-3 text-4xl text-[rgb(var(--primary))]" />
            <h2 className="mb-2 text-3xl font-bold text-[rgb(var(--text))]">
              {t("login.title")}
            </h2>
            <p className="text-sm text-[rgb(var(--text-muted))]">
              {t("login.subtitle")}
            </p>
          </div>

          {error && (
            <p className="mb-4 text-center text-sm text-red-500">{error}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <FaUserShield className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
              <input
                name="email"
                placeholder={t("login.emailPlaceholder")}
                value={form.email}
                onChange={handleChange}
                required
                className="input !pl-12"
              />
            </div>

            <div className="relative">
              <FaLock className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder={t("login.passwordPlaceholder")}
                value={form.password}
                onChange={handleChange}
                required
                className="input !pl-12 !pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-3 z-10 -translate-y-1/2 cursor-pointer p-1 text-[rgb(var(--text-muted))]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-semibold shadow-md transition ${
                loading
                  ? "cursor-not-allowed bg-gray-400 text-white"
                  : "login-submit hover:opacity-90"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
