/** Clear auth/session storage but keep language + theme. */
export function clearSessionKeepPrefs() {
  const savedLang = localStorage.getItem("app_lang");
  const savedTheme = localStorage.getItem("theme");
  const savedMenuStyle = localStorage.getItem("menuGridStyle");
  localStorage.clear();
  sessionStorage.clear();
  if (savedLang) localStorage.setItem("app_lang", savedLang);
  if (savedTheme) localStorage.setItem("theme", savedTheme);
  if (savedMenuStyle) localStorage.setItem("menuGridStyle", savedMenuStyle);
}
