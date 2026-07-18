import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translations } from "../i18n/translations";
import { PHRASE_HI } from "../i18n/phraseHi";

const LanguageContext = createContext(null);
const STORAGE_KEY = "app_lang";

/** Map English dictionary values → first matching key (for free-text lookup). */
const EN_VALUE_TO_KEY = (() => {
  const map = new Map();
  for (const [key, val] of Object.entries(translations.en || {})) {
    if (typeof val === "string" && val && !map.has(val)) map.set(val, key);
  }
  for (const en of Object.keys(PHRASE_HI)) {
    if (!map.has(en)) map.set(en, `__phrase__:${en}`);
  }
  return map;
})();

const getInitialLang = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "hi") return saved;
  } catch {
    // ignore
  }
  return "en";
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(getInitialLang);

  const setLang = useCallback((next) => {
    if (next !== "en" && next !== "hi") return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next = prev === "en" ? "hi" : "en";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "hi" ? "hi" : "en";
  }, [lang]);

  // Cross-tab / external sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      if (e.newValue === "en" || e.newValue === "hi") setLangState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const t = useCallback(
    (key, fallback) => {
      if (!key) return fallback ?? "";
      const fromCurrent = translations[lang]?.[key];
      if (fromCurrent != null) return fromCurrent;
      const fromEn = translations.en?.[key];
      if (fromEn != null) return fromEn;
      return fallback ?? key;
    },
    [lang]
  );

  const tn = useCallback((name) => t(`nav.${name}`, name), [t]);

  /** Translate by key, nav name, phrase map, or English dictionary value. */
  const tx = useCallback(
    (text, fallback) => {
      if (text == null || text === "") return fallback ?? "";
      const str = String(text).replace(/\s+/g, " ").trim();
      if (!str) return fallback ?? "";

      // Direct phrase table (covers most hardcoded UI + long descriptions)
      if (lang === "hi" && PHRASE_HI[str] != null) return PHRASE_HI[str];
      if (lang === "en" && PHRASE_HI[str] != null) return str;

      if (translations[lang]?.[str] != null) return translations[lang][str];
      if (translations.en?.[str] != null) return t(str);
      const navHit = translations[lang]?.[`nav.${str}`];
      if (navHit != null) return navHit;
      if (translations.en?.[`nav.${str}`] != null) return tn(str);
      const key = EN_VALUE_TO_KEY.get(str);
      if (key) {
        if (String(key).startsWith("__phrase__:")) {
          const en = key.slice("__phrase__:".length);
          return lang === "hi" ? PHRASE_HI[en] ?? en : en;
        }
        return t(key);
      }
      return fallback ?? str;
    },
    [lang, t, tn]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang,
      t,
      tn,
      tx,
      locale: lang === "hi" ? "hi-IN" : "en-IN",
    }),
    [lang, setLang, toggleLang, t, tn, tx]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
};
