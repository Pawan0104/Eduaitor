import { FaGlobe } from "react-icons/fa";
import { useLanguage } from "../context/LanguageContext";
import { SUPPORTED_LANGS } from "../i18n/translations";

/**
 * Compact EN | हि toggle for header / login.
 * variant: "header" | "login"
 */
const LanguageSwitcher = ({ variant = "header" }) => {
  const { lang, setLang, t } = useLanguage();

  if (variant === "login") {
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        <FaGlobe className="text-indigo-500" size={14} />
        <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 p-0.5">
          {SUPPORTED_LANGS.map((item) => {
            const active = lang === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setLang(item.code)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                  active
                    ? "bg-indigo-600 text-white shadow"
                    : "text-indigo-700 hover:bg-indigo-100"
                }`}
              >
                {t(item.labelKey)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-0.5"
      title={t("lang.switch")}
    >
      <FaGlobe
        className="ml-2 mr-1 text-[rgb(var(--text-muted))] hidden sm:block"
        size={12}
      />
      {SUPPORTED_LANGS.map((item) => {
        const active = lang === item.code;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLang(item.code)}
            className={`min-w-9 px-2.5 py-1.5 text-xs font-bold rounded-lg transition ${
              active
                ? "bg-[rgb(var(--primary))] text-white shadow-sm"
                : "text-[rgb(var(--text))] hover:bg-[rgba(var(--primary),0.08)]"
            }`}
            aria-pressed={active}
          >
            {item.short}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;
