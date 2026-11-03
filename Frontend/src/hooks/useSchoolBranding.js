import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { normalizeSchoolBranding } from "../utils/reportBranding";

const API = import.meta.env.VITE_API_URL;

/**
 * Loads school logo/name/address/contact for report headers & footers.
 */
export default function useSchoolBranding() {
  const [branding, setBranding] = useState({
    name: "",
    logo: "",
    address: "",
    phone: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/schools/me/branding`, {
        withCredentials: true,
      });
      if (data?.success) {
        setBranding(normalizeSchoolBranding(data.data));
      }
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { branding, loading, refresh };
}
