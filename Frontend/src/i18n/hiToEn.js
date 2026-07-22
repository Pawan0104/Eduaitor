import { PHRASE_HI } from "./phraseHi";
import { translations } from "./translations";

const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();

/**
 * Hindi → English reverse map so DomI18n / tx() can restore English
 * after a language toggle (DOM may still hold Hindi text).
 * First English wins on collisions.
 */
export const HI_TO_EN = (() => {
  const map = Object.create(null);

  for (const [en, hi] of Object.entries(PHRASE_HI || {})) {
    const h = norm(hi);
    if (h && map[h] == null) map[h] = en;
  }

  for (const key of Object.keys(translations.en || {})) {
    const en = translations.en[key];
    const hi = translations.hi?.[key];
    if (typeof en !== "string" || typeof hi !== "string") continue;
    const h = norm(hi);
    if (h && en !== hi && map[h] == null) map[h] = en;
  }

  return map;
})();

/** If text is known Hindi, return its English source; else null. */
export function hindiToEnglish(text) {
  const n = norm(text);
  if (!n) return null;
  return HI_TO_EN[n] || null;
}
