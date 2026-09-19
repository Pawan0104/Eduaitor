import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { marketingApi } from "./marketingApi";

/**
 * Landing page after Facebook/Instagram Login. Reads ?code&state, tells the
 * backend to exchange them for a stored token, then returns to the accounts
 * page for the current role (school/teacher/staff/admin).
 */
export default function OauthCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    const redirectUri = `${window.location.origin}${location.pathname}`;
    const accountsPath = location.pathname
      .replace(/\/oauth\/callback$/, "")
      .replace(/\/+$/, "") + "/accounts";

    if (error) {
      toast.error(decodeURIComponent(error) || "You didn't grant access.");
      navigate(accountsPath, { replace: true });
      return;
    }
    if (!code) {
      toast.error("OAuth did not return a code.");
      navigate(accountsPath, { replace: true });
      return;
    }

    (async () => {
      try {
        await marketingApi.completeOAuth({ code, state, redirectUri });
        toast.success("Account connected — you can publish now!");
      } catch (err) {
        toast.error(err?.response?.data?.message || "Could not complete connection.");
      } finally {
        navigate(accountsPath, { replace: true });
      }
    })();
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4">
      <div className="w-12 h-12 rounded-full animate-spin border-4 border-transparent"
        style={{ borderTopColor: "rgb(var(--primary))" }} />
      <p className="text-sm font-extrabold" style={{ color: "rgb(var(--text))" }}>
        Completing connection…
      </p>
    </div>
  );
}