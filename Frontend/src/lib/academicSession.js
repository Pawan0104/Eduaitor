/**
 * Academic-session helpers shared by the header switcher, the axios layer and
 * the session-management page.
 *
 * The selected label is kept in localStorage so it survives reloads and is sent
 * to the API as the `x-academic-year` header. Non-admin roles ignore it on the
 * server (they always see the active session).
 */
export const ACADEMIC_SESSION_KEY = "eduaitor_academic_year";
export const ALL_SESSIONS = "all";

const ADMIN_ROLES = new Set([
  "school_admin",
  "staff_admin",
  "super_admin",
]);

export const canManageSessions = (role) => ADMIN_ROLES.has(String(role || ""));

export const readStoredSession = () => {
  try {
    return localStorage.getItem(ACADEMIC_SESSION_KEY) || "";
  } catch {
    return "";
  }
};

export const storeSession = (name) => {
  try {
    if (name) localStorage.setItem(ACADEMIC_SESSION_KEY, name);
    else localStorage.removeItem(ACADEMIC_SESSION_KEY);
  } catch {
    // private mode / storage disabled
  }
};

export const clearStoredSession = () => storeSession("");

/** "2026-27" -> "2027-28"; falls back to the current April-March session. */
export const nextSessionName = (name = "") => {
  const match = /(\d{4})/.exec(String(name));
  let startYear;
  if (match) {
    startYear = Number(match[1]) + 1;
  } else {
    const now = new Date();
    startYear = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  }
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
};

/** Default April-March dates for a session label (YYYY-MM-DD). */
export const sessionDateRange = (name = "") => {
  const match = /(\d{4})/.exec(String(name));
  const startYear = match ? Number(match[1]) : new Date().getFullYear();
  return {
    startDate: `${startYear}-04-01`,
    endDate: `${startYear + 1}-03-31`,
  };
};

export const formatSessionDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
