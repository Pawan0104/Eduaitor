/** Clear auth/session storage but keep language + theme + UI layout prefs. */
export function clearSessionKeepPrefs() {
  const savedLang = localStorage.getItem("app_lang");
  const savedTheme = localStorage.getItem("theme");
  const savedMenuStyle = localStorage.getItem("menuGridStyle");
  const savedDashLayout =
    localStorage.getItem("dashboardLayout") ||
    localStorage.getItem("schoolDashboardLayout");
  localStorage.clear();
  sessionStorage.clear();
  if (savedLang) localStorage.setItem("app_lang", savedLang);
  if (savedTheme) localStorage.setItem("theme", savedTheme);
  if (savedMenuStyle) localStorage.setItem("menuGridStyle", savedMenuStyle);
  if (savedDashLayout) {
    localStorage.setItem("dashboardLayout", savedDashLayout);
    localStorage.setItem("schoolDashboardLayout", savedDashLayout);
  }
}
