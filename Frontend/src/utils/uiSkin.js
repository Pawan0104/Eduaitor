/** Global UI skin (full-app look) — Classic / Campus / Forest. */

export const UI_SKIN_KEY = "uiSkin";
export const UI_SKIN_EVENT = "uiSkinChange";

export const UI_SKIN_OPTIONS = [
  {
    id: "classic",
    label: "Classic",
    helper: "Current Eduaitor purple control-center look",
    swatch: ["#5B3DF5", "#F8F9FD", "#FFFFFF"],
  },
  {
    id: "campus",
    label: "Campus",
    helper: "Navy academy shell with gold accents",
    swatch: ["#0B1F3A", "#F5C518", "#F1F5F9"],
  },
  {
    id: "forest",
    label: "Forest",
    helper: "Deep green academic panels and soft mint surfaces",
    swatch: ["#0F3D2E", "#34D399", "#F0FDF4"],
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
