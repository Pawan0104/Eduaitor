import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

/**
 * App chrome brand mark.
 * Super admin → Eduaitor branding.
 * School-bound roles → school logo only (never Eduaitor); school name if no logo.
 */
export default function BrandMark({ user, compact = false }) {
  const { t } = useLanguage();
  const [logoBroken, setLogoBroken] = useState(false);

  const role = user?.role;
  const isSuperAdmin = role === "super_admin";
  const schoolName =
    user?.school_name ||
    (role === "school_admin" ? user?.name : null) ||
    "";
  const schoolLogo = user?.school_logo && !logoBroken ? user.school_logo : null;

  if (isSuperAdmin || !role) {
    return (
      <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
        <img
          src="/eduaitor.png"
          alt="Eduaitor"
          className={`shrink-0 rounded-lg object-contain ${
            compact ? "h-8 w-auto max-w-20" : "h-8 w-auto max-w-24 lg:h-10 lg:max-w-35"
          }`}
        />
        {!compact && (
          <div className="min-w-0 hidden sm:block">
            <h1 className="truncate text-sm font-bold text-[rgb(var(--text))] lg:text-base">
              Eduaitor
            </h1>
            <p className="hidden text-[11px] text-[rgb(var(--text-muted))] lg:block">
              {t("brand.tagline")}
            </p>
          </div>
        )}
      </div>
    );
  }

  // School / teacher / parent / student / staff — school identity only
  if (schoolLogo) {
    return (
      <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
        <img
          src={schoolLogo}
          alt={schoolName || "School"}
          onError={() => setLogoBroken(true)}
          className={`shrink-0 rounded-lg object-contain bg-white/80 ${
            compact
              ? "h-9 w-9 max-w-none object-cover"
              : "h-9 w-auto max-w-28 lg:h-11 lg:max-w-40"
          }`}
        />
        {schoolName && !compact && (
          <div className="min-w-0 hidden md:block">
            <h1 className="truncate text-sm font-bold text-[rgb(var(--text))] lg:text-base">
              {schoolName}
            </h1>
          </div>
        )}
      </div>
    );
  }

  const initial = (schoolName || "S").trim().charAt(0).toUpperCase();

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
      <div
        className={`flex shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--primary))] font-black text-white shadow ${
          compact ? "h-9 w-9 text-sm" : "h-9 w-9 text-base lg:h-10 lg:w-10 lg:text-lg"
        }`}
        aria-hidden
      >
        {initial}
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-sm font-bold text-[rgb(var(--text))] lg:text-base">
          {schoolName || "School"}
        </h1>
      </div>
    </div>
  );
}
