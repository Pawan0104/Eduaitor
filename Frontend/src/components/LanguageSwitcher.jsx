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
      <div className="mb-6 flex items-center justify-center gap-2">
        <div className="inline-flex rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-0.5">
          {SUPPORTED_LANGS.map((item) => {
            const active = lang === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setLang(item.code)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? "bg-[rgb(var(--primary))] text-[rgb(var(--on-primary,255_255_255))] shadow"
                    : "text-[rgb(var(--text))] hover:bg-[rgba(var(--primary),0.08)]"
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
      {SUPPORTED_LANGS.map((item) => {
        const active = lang === item.code;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLang(item.code)}
            className={`min-w-8 px-2 py-1.5 text-[11px] font-bold rounded-lg transition sm:min-w-9 sm:px-2.5 sm:text-xs ${
              active
                ? "bg-[rgb(var(--primary))] text-[rgb(var(--on-primary,255_255_255))] shadow-sm"
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
