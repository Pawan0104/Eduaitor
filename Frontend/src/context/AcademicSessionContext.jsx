import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { API } from "../config/api";
import { useAuth } from "./AuthContext";
import {
  canManageSessions,
  clearStoredSession,
  readStoredSession,
  storeSession,
} from "../lib/academicSession";

const AcademicSessionContext = createContext(null);

export const AcademicSessionProvider = ({ children }) => {
  const { user } = useAuth();
  const role = user?.role || "";
  const schoolId = user?.school_id || "";
  const userId = String(user?._id || user?.id || schoolId || "");

  const [sessions, setSessions] = useState([]);
  const [activeName, setActiveName] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [suggestedNext, setSuggestedNext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSwitch = canManageSessions(role);

  const load = useCallback(async () => {
    if (!userId || !schoolId) {
      setSessions([]);
      setActiveName("");
      setSelectedName("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`${API}/academic-years`, {
        withCredentials: true,
      });
      const list = data?.data?.sessions || [];
      const active =
        data?.data?.activeSession?.name ||
        list.find((session) => session.isActive)?.name ||
        list[0]?.name ||
        "";

      setSessions(list);
      setActiveName(active);
      setSuggestedNext(data?.data?.suggestedNext || "");

      if (canSwitch) {
        const stored = readStoredSession();
        const chosen = list.some((session) => session.name === stored)
          ? stored
          : active;
        setSelectedName(chosen);
        storeSession(chosen);
      } else {
        clearStoredSession();
        setSelectedName(active);
      }
    } catch {
      setError("Could not load academic sessions.");
    } finally {
      setLoading(false);
    }
  }, [userId, schoolId, canSwitch]);

  useEffect(() => {
    if (userId && schoolId) load();
    else {
      setSessions([]);
      setActiveName("");
      setSelectedName("");
    }
  }, [userId, schoolId, load]);

  const switchSession = useCallback(
    (name) => {
      if (!canSwitch || !name || name === selectedName) return false;
      if (!sessions.some((session) => session.name === name)) return false;
      storeSession(name);
      setSelectedName(name);
      // Every page fetches on mount, so a reload is the most reliable way to
      // re-scope the whole ERP to the newly selected session.
      window.location.reload();
      return true;
    },
    [canSwitch, selectedName, sessions]
  );

  const value = useMemo(
    () => ({
      sessions,
      activeName,
      selectedName: canSwitch ? selectedName : activeName,
      suggestedNext,
      loading,
      error,
      canSwitch,
      canManage: canSwitch,
      refresh: load,
      switchSession,
    }),
    [
      sessions,
      activeName,
      selectedName,
      suggestedNext,
      loading,
      error,
      canSwitch,
      load,
      switchSession,
    ]
  );

  return (
    <AcademicSessionContext.Provider value={value}>
      {children}
    </AcademicSessionContext.Provider>
  );
};

export const useAcademicSession = () => {
  const ctx = useContext(AcademicSessionContext);
  if (ctx) return ctx;
  return {
    sessions: [],
    activeName: "",
    selectedName: "",
    suggestedNext: "",
    loading: false,
    error: "",
    canSwitch: false,
    canManage: false,
    refresh: () => {},
    switchSession: () => false,
  };
};

export default AcademicSessionContext;
