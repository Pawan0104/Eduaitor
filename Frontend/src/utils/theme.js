/** Safe theme class apply — never wipe non-theme classes on <html>. */

export const THEME_OPTIONS = [
  { id: "theme-light", label: "Light", color: "#5B3DF5" },
  { id: "theme-dark", label: "Dark", color: "#0f172a" },
  { id: "theme-blue", label: "Blue", color: "#2563eb" },
  { id: "theme-green", label: "Green", color: "#059669" },
];

const VALID = new Set(THEME_OPTIONS.map((o) => o.id));

export const getTheme = () => {
  const saved = localStorage.getItem("theme");
  return VALID.has(saved) ? saved : "theme-light";
};

export const applyTheme = (themeId) => {
  const next = VALID.has(themeId) ? themeId : "theme-light";
  const el = document.documentElement;
  [...el.classList]
    .filter((c) => c.startsWith("theme-"))
    .forEach((c) => el.classList.remove(c));
  el.classList.add(next);
  localStorage.setItem("theme", next);
  return next;
};

export const initTheme = () => {
  applyTheme(getTheme());
};
