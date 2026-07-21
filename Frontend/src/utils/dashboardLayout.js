/** Global dashboard layout preference (Classic vs Campus) — all roles. */

export const DASHBOARD_LAYOUT_KEY = "dashboardLayout";
export const DASHBOARD_LAYOUT_EVENT = "dashboardLayoutChange";
/** @deprecated migrated into DASHBOARD_LAYOUT_KEY */
const LEGACY_SCHOOL_KEY = "schoolDashboardLayout";

export const DASHBOARD_LAYOUT_OPTIONS = [
  {
    id: "classic",
    label: "Classic",
    helper: "Current control-center style dashboard",
  },
  {
    id: "campus",
    label: "Campus",
    helper: "Profile card, colorful summaries, and module grid",
  },
];

// Back-compat aliases used by SchoolDashboard
export const SCHOOL_DASHBOARD_LAYOUT_KEY = DASHBOARD_LAYOUT_KEY;
export const SCHOOL_DASHBOARD_LAYOUT_EVENT = DASHBOARD_LAYOUT_EVENT;
export const SCHOOL_DASHBOARD_LAYOUT_OPTIONS = DASHBOARD_LAYOUT_OPTIONS;

const normalize = (value) =>
  value === "campus" || value === "classic" ? value : null;

export const getDashboardLayout = () => {
  const saved = normalize(localStorage.getItem(DASHBOARD_LAYOUT_KEY));
  if (saved) return saved;
  const legacy = normalize(localStorage.getItem(LEGACY_SCHOOL_KEY));
  if (legacy) {
    localStorage.setItem(DASHBOARD_LAYOUT_KEY, legacy);
    return legacy;
  }
  return "classic";
};

export const setDashboardLayout = (id) => {
  const next = id === "campus" ? "campus" : "classic";
  localStorage.setItem(DASHBOARD_LAYOUT_KEY, next);
  localStorage.setItem(LEGACY_SCHOOL_KEY, next);
  window.dispatchEvent(
    new CustomEvent(DASHBOARD_LAYOUT_EVENT, { detail: next }),
  );
  return next;
};

export const getSchoolDashboardLayout = getDashboardLayout;
export const setSchoolDashboardLayout = setDashboardLayout;
