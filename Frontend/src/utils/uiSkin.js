/** Global UI skin (full-app look) — Classic / Campus / Forest. */

export const UI_SKIN_KEY = "uiSkin";
export const UI_SKIN_EVENT = "uiSkinChange";

export const UI_SKIN_OPTIONS = [
  {
    id: "classic",
    label: "Classic Blue",
    helper: "Professional & Clean",
    swatch: ["#1E40AF", "#3B82F6", "#EFF6FF"],
  },
  {
    id: "fresh",
    label: "Fresh Green",
    helper: "Calm & Trustworthy",
    swatch: ["#15803D", "#22C55E", "#F0FDF4"],
  },
  {
    id: "warm",
    label: "Warm Purple",
    helper: "Modern & Friendly",
    swatch: ["#7E22CE", "#A855F7", "#FAF5FF"],
  },
  {
    id: "sunrise",
    label: "Sunrise Orange",
    helper: "Energetic & Vibrant",
    swatch: ["#C2410C", "#F97316", "#FFF7ED"],
  },
  {
    id: "sky",
    label: "Sky Teal",
    helper: "Fresh & Modern",
    swatch: ["#0891B2", "#06B6D4", "#ECFEFF"],
  },
  {
    id: "nature",
    label: "Nature Pastel",
    helper: "Light & Soothing",
    swatch: ["#4D7C0F", "#84CC16", "#F7FEE7"],
  },
];

const VALID = new Set(UI_SKIN_OPTIONS.map((o) => o.id));

const normalize = (value) => (VALID.has(value) ? value : null);

/** Migrate from older dashboardLayout preference when uiSkin is unset. */
export const getUiSkin = () => {
  const saved = normalize(localStorage.getItem(UI_SKIN_KEY));
  if (saved) return saved;
  const layout = localStorage.getItem("dashboardLayout");
  if (layout === "campus") return "campus";
  return "classic";
};

export const applyUiSkin = (id) => {
  const next = normalize(id) || "classic";
  document.documentElement.setAttribute("data-skin", next);
  localStorage.setItem(UI_SKIN_KEY, next);

  // Keep dashboard layout in sync so Campus/Forest use the richer dashboard shell
  try {
    const layout = next === "classic" ? "classic" : "campus";
    localStorage.setItem("dashboardLayout", layout);
    localStorage.setItem("schoolDashboardLayout", layout);
    window.dispatchEvent(
      new CustomEvent("dashboardLayoutChange", { detail: layout }),
    );
  } catch {
    /* ignore */
  }

  window.dispatchEvent(new CustomEvent(UI_SKIN_EVENT, { detail: next }));
  return next;
};

export const setUiSkin = applyUiSkin;

export const initUiSkin = () => {
  applyUiSkin(getUiSkin());
};
