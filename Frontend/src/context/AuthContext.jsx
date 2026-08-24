import { createContext, useContext, useEffect, useState } from "react";
import api, { clearAuthToken, setAuthToken } from "../config/axios";
import { signalAppShellReady } from "../utils/initNativeShell.js";

const AuthContext = createContext();

/** Boot session check — keep short so splash isn't followed by a long blank wait. */
const AUTH_BOOT_TIMEOUT_MS = 8000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switchingChild, setSwitchingChild] = useState(false);

  const fetchUser = async () => {
    try {
      const res = await api.get(`/auth/me`, { timeout: AUTH_BOOT_TIMEOUT_MS });
      setUser(res.data.user);
    } catch (err) {
      const status = err?.response?.status;
      // Only clear session on auth failures — keep user on transient/network errors
      if (status === 401 || status === 403) {
        setUser(null);
        clearAuthToken();
      }
    } finally {
      setLoading(false);
      signalAppShellReady();
    }
  };

  const switchChild = async (studentId) => {
    if (!studentId) return false;
    setSwitchingChild(true);
    try {
      const res = await api.post("/auth/parent/switch-child", { studentId });
      if (res.data?.token) setAuthToken(res.data.token);
      if (res.data?.data) {
        setUser(res.data.data);
      } else {
        await fetchUser();
      }
      return true;
    } catch (err) {
      console.error("switchChild failed:", err);
      return false;
    } finally {
      setSwitchingChild(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        fetchUser,
        switchChild,
        switchingChild,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
