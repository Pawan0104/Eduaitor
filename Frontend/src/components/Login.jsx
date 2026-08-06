import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaUserShield,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaMobileAlt,
  FaArrowLeft,
  FaSchool,
  FaChevronRight,
} from "react-icons/fa";
import { toast } from "react-toastify";
import logo from "/eduaitor.png";
import LanguageSwitcher from "./LanguageSwitcher";
import api, { setAuthToken } from "../config/axios";
import { getMenuPath } from "./AdminLayout";

function homePathForRole(role, loginAs) {
  return getMenuPath(role, loginAs) || "/admin/login";
}

function childCountLabel(count, t) {
  const n = Number(count) || 0;
  if (n === 1) return t("login.childCountOne", "1 child");
  return t("login.childrenCount", `${n} children`).replace(
    "{{count}}",
    String(n),
  );
}

export default function Login() {
  const [mode, setMode] = useState("other"); // "parent" | "other"
  const [parentStep, setParentStep] = useState("mobile"); // mobile | school | password
  const [mobile, setMobile] = useState("");
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { fetchUser, setUser } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const resetParentFlow = () => {
    setParentStep("mobile");
    setSchools([]);
    setSelectedSchool(null);
    setForm((prev) => ({ ...prev, password: "" }));
    setError("");
  };

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setShowPassword(false);
    if (next === "parent") resetParentFlow();
    else setForm({ email: "", password: "" });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const finishLogin = async (res) => {
    if (res.data?.token) setAuthToken(res.data.token);

    const role = res.data.data.role;
    const loginAs = res.data.data.loginAs;

    if (res.data?.data) setUser(res.data.data);

    await fetchUser();

    const intended = location.state?.from?.pathname;
    const safeIntended =
      intended &&
      intended !== "/dashboard" &&
      intended !== "/admin/login" &&
      !intended.endsWith("/login")
        ? intended
        : null;

    const dest = safeIntended || homePathForRole(role, loginAs);
    navigate(dest, { replace: true });
    toast.success(t("login.success"));
  };

  const mapLoginError = (err) => {
    const rawMsg = String(err?.message || "");
    const isTimeout =
      err?.code === "ECONNABORTED" || /timeout/i.test(rawMsg);
    const isNetwork =
      !err?.response &&
      (/Network/i.test(rawMsg) || /Failed to fetch/i.test(rawMsg));
    return (
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      (isTimeout
        ? "API is waking up (Render cold start). Wait ~30s and try again."
        : isNetwork
          ? "Cannot reach API. Check VITE_API_URL on Netlify and CLIENT_URL=https://admineduaitor.netlify.app on Render."
          : "Invalid credentials")
    );
  };

  const handleOtherSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const res = await api.post(`/auth/login`, {
        email: form.email.trim(),
        password: form.password,
      });

      await finishLogin(res);
    } catch (err) {
      const backendMessage = mapLoginError(err);
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

  const handleMobileContinue = async (e) => {
    e.preventDefault();
    const value = mobile.trim();
    if (!value) {
      setError(t("login.mobilePlaceholder", "Mobile number"));
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api.post("/auth/parent/lookup", { mobile: value });
      const list = Array.isArray(res.data?.schools) ? res.data.schools : [];
      const resolvedMobile = res.data?.mobile || value;
      setMobile(resolvedMobile);
      setSchools(list);

      if (list.length === 0) {
        setError(
          t("login.mobileNotFound", "No parent account found for this mobile"),
        );
        return;
      }

      if (list.length === 1) {
        setSelectedSchool(list[0]);
        setParentStep("password");
      } else {
        setSelectedSchool(null);
        setParentStep("school");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        t("login.mobileNotFound", "No parent account found for this mobile");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSchool = (school) => {
    setSelectedSchool(school);
    setForm((prev) => ({ ...prev, password: "" }));
    setError("");
    setParentStep("password");
  };

  const handleParentLogin = async (e) => {
    e.preventDefault();
    if (!selectedSchool?.schoolId) {
      setError(t("login.chooseSchool", "Choose your school"));
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await api.post(`/auth/login`, {
        email: mobile.trim(),
        password: form.password,
        schoolId: selectedSchool.schoolId,
      });

      await finishLogin(res);
    } catch (err) {
      const backendMessage = mapLoginError(err);
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

  const brandPanelLogo =
    mode === "parent" && parentStep === "password" && selectedSchool?.school_logo
      ? selectedSchool.school_logo
      : logo;

  const brandPanelTitle =
    mode === "parent" && parentStep === "password" && selectedSchool
      ? selectedSchool.school_name
      : "Eduaitor";

  return (
    <div className="app-safe-top login-shell grid min-h-dvh md:grid-cols-2">
      <div className="login-brand-panel hidden min-h-dvh flex-col items-center justify-center p-12 md:flex">
        <img
          className="h-44 max-w-full object-contain"
          src={brandPanelLogo}
          alt={brandPanelTitle}
        />
        <p className="mt-4 text-sm font-semibold text-[rgb(var(--text-muted))]">
          {mode === "parent" && parentStep === "password" && selectedSchool
            ? selectedSchool.school_name
            : t("brand.tagline", "Smarter Schools. Stronger Students.")}
        </p>
      </div>

      <div className="login-form-panel flex min-h-[calc(100dvh-env(safe-area-inset-top,0px))] items-center justify-center p-6 md:min-h-dvh">
        <div className="login-card w-full max-w-md p-8">
          <LanguageSwitcher variant="login" />

          {/* Mode toggle */}
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-[rgb(var(--bg))] p-1">
            <button
              type="button"
              onClick={() => switchMode("parent")}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                mode === "parent"
                  ? "bg-[rgb(var(--primary))] text-white shadow"
                  : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
              }`}
            >
              {t("login.modeParent", "Parent")}
            </button>
            <button
              type="button"
              onClick={() => switchMode("other")}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                mode === "other"
                  ? "bg-[rgb(var(--primary))] text-white shadow"
                  : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
              }`}
            >
              {t("login.modeOther", "Staff / Admin")}
            </button>
          </div>

          {error && (
            <p className="mb-4 text-center text-sm text-red-500">{error}</p>
          )}

          {/* â”€â”€ Staff / Admin classic form â”€â”€ */}
          {mode === "other" && (
            <>
              <div className="mb-8 text-center">
                <FaUserShield className="mx-auto mb-3 text-4xl text-[rgb(var(--primary))]" />
                <h2 className="mb-2 text-3xl font-bold text-[rgb(var(--text))]">
                  {t("login.title")}
                </h2>
                <p className="text-sm text-[rgb(var(--text-muted))]">
                  {t("login.subtitle")}
                </p>
              </div>

              <form onSubmit={handleOtherSubmit} className="space-y-5">
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
            </>
          )}

          {/* â”€â”€ Parent: mobile step â”€â”€ */}
          {mode === "parent" && parentStep === "mobile" && (
            <>
              <div className="mb-8 text-center">
                <FaMobileAlt className="mx-auto mb-3 text-4xl text-[rgb(var(--primary))]" />
                <h2 className="mb-2 text-3xl font-bold text-[rgb(var(--text))]">
                  {t("login.parentMobileTitle", "Parent login")}
                </h2>
                <p className="text-sm text-[rgb(var(--text-muted))]">
                  {t(
                    "login.parentMobileSubtitle",
                    "Enter your registered mobile number",
                  )}
                </p>
              </div>

              <form onSubmit={handleMobileContinue} className="space-y-5">
                <div className="relative">
                  <FaMobileAlt className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
                  <input
                    name="mobile"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={t("login.mobilePlaceholder", "Mobile number")}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                    className="input !pl-12"
                  />
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
                      {t("login.lookingUp", "Looking up...")}
                    </div>
                  ) : (
                    t("login.continue", "Continue")
                  )}
                </button>
              </form>
            </>
          )}

          {/* â”€â”€ Parent: school picker â”€â”€ */}
          {mode === "parent" && parentStep === "school" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setParentStep("mobile");
                  setError("");
                }}
                className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--primary))]"
              >
                <FaArrowLeft size={12} />
                {t("login.back", "Back")}
              </button>

              <div className="mb-6 text-center">
                <FaSchool className="mx-auto mb-3 text-4xl text-[rgb(var(--primary))]" />
                <h2 className="mb-2 text-2xl font-bold text-[rgb(var(--text))]">
                  {t("login.chooseSchool", "Choose your school")}
                </h2>
                <p className="text-sm text-[rgb(var(--text-muted))]">
                  {t(
                    "login.chooseSchoolSubtitle",
                    "This mobile is linked to more than one school",
                  )}
                </p>
                <p className="mt-2 text-sm font-medium text-[rgb(var(--text))]">
                  {mobile}
                </p>
              </div>

              <div className="space-y-3">
                {schools.map((school) => (
                  <button
                    key={school.schoolId}
                    type="button"
                    onClick={() => handleSelectSchool(school)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 text-left shadow-sm transition hover:border-[rgb(var(--primary))] hover:shadow-md"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[rgb(var(--bg))]">
                      {school.school_logo ? (
                        <img
                          src={school.school_logo}
                          alt={t("login.schoolLogoAlt", "School logo")}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <FaSchool className="text-xl text-[rgb(var(--primary))]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-[rgb(var(--text))]">
                        {school.school_name}
                      </p>
                      <p className="text-xs text-[rgb(var(--text-muted))]">
                        {childCountLabel(school.childCount, t)}
                      </p>
                    </div>
                    <FaChevronRight className="shrink-0 text-[rgb(var(--text-muted))]" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* â”€â”€ Parent: password step â”€â”€ */}
          {mode === "parent" && parentStep === "password" && selectedSchool && (
            <>
              <button
                type="button"
                onClick={() => {
                  setForm((prev) => ({ ...prev, password: "" }));
                  setError("");
                  setParentStep(schools.length > 1 ? "school" : "mobile");
                }}
                className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--primary))]"
              >
                <FaArrowLeft size={12} />
                {t("login.back", "Back")}
              </button>

              <div className="mb-8 text-center">
                <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-[rgb(var(--bg))] shadow-sm ring-1 ring-[rgb(var(--border))]">
                  {selectedSchool.school_logo ? (
                    <img
                      src={selectedSchool.school_logo}
                      alt={t("login.schoolLogoAlt", "School logo")}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <FaSchool className="text-3xl text-[rgb(var(--primary))]" />
                  )}
                </div>
                <h2 className="mb-1 text-2xl font-bold text-[rgb(var(--text))]">
                  {selectedSchool.school_name}
                </h2>
                <p className="text-sm text-[rgb(var(--text-muted))]">
                  {t("login.enterPassword", "Enter password")}
                </p>
              </div>

              <form onSubmit={handleParentLogin} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[rgb(var(--text-muted))]">
                    {t("login.mobileLabel", "Mobile number")}
                  </label>
                  <div className="relative">
                    <FaMobileAlt className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
                    <input
                      value={mobile}
                      readOnly
                      className="input !pl-12 bg-[rgb(var(--bg))] text-[rgb(var(--text-muted))]"
                    />
                  </div>
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
                    autoFocus
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
