import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../i18n/translations";
import { PHRASE_HI } from "../i18n/phraseHi";
import { HI_TO_EN, hindiToEnglish } from "../i18n/hiToEn";

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "CODE",
  "PRE",
  "SVG",
  "PATH",
  "TEXTAREA",
]);

const ATTRS = ["placeholder", "title", "aria-label", "alt"];

const EN_STRINGS = (() => {
  const set = new Set();
  for (const [key, val] of Object.entries(translations.en || {})) {
    if (typeof val === "string" && val.trim()) {
      set.add(val.trim());
      if (key.startsWith("nav.")) set.add(key.slice(4));
    }
  }
  for (const en of Object.keys(PHRASE_HI)) set.add(en);
  return set;
})();

/** Keep partial replace list small — full dictionary scan freezes large pages. */
const MULTI_PHRASES = [...EN_STRINGS]
  .filter((p) => p.length >= 8 && /\s/.test(p))
  .sort((a, b) => b.length - a.length)
  .slice(0, 120);

const MULTI_HI = Object.keys(HI_TO_EN)
  .filter((p) => p.length >= 8 && /\s/.test(p))
  .sort((a, b) => b.length - a.length)
  .slice(0, 120);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();

export function canTranslate(text) {
  if (!text || typeof text !== "string") return false;
  const s = norm(text);
  if (s.length < 2) return false;
  if (/^[\d\s.,:%+\-_/\\|#@]+$/.test(s)) return false;
  if (/rgb\(|var\(|px-|sm:|md:|lg:/.test(s)) return false;
  if (EN_STRINGS.has(s)) return true;
  if (translations.en?.[s] != null) return true;
  if (translations.en?.[`nav.${s}`] != null) return true;
  if (PHRASE_HI[s] != null) return true;
  if (HI_TO_EN[s] != null) return true;
  return false;
}

function resolveEnglishSource(text) {
  const n = norm(text);
  if (!n) return null;
  if (EN_STRINGS.has(n) || PHRASE_HI[n] != null) return n;
  if (translations.en?.[n] != null || translations.en?.[`nav.${n}`] != null) {
    return n;
  }
  return hindiToEnglish(n);
}

function restoreEnglishDeep(text) {
  const normalized = norm(text);
  if (!normalized) return text;

  const whole = resolveEnglishSource(normalized);
  if (whole) return whole;

  let result = normalized;
  let changed = false;
  for (const hiPhrase of MULTI_HI) {
    if (!result.includes(hiPhrase)) continue;
    const en = HI_TO_EN[hiPhrase];
    if (!en) continue;
    const next = result.split(hiPhrase).join(en);
    if (next !== result) {
      result = next;
      changed = true;
    }
  }
  return changed ? result : text;
}

function translateDeep(englishSrc, tx) {
  const src = norm(englishSrc);
  if (!src) return englishSrc;

  if (canTranslate(src) || EN_STRINGS.has(src)) {
    return tx(src);
  }

  // Partial replace only for short-ish strings (avoid O(phrases×nodes) blowups)
  if (src.length > 160) return englishSrc;

  let result = src;
  let changed = false;
  for (const phrase of MULTI_PHRASES) {
    if (!result.includes(phrase)) continue;
    const next = result.split(phrase).join(tx(phrase));
    if (next !== result) {
      result = next;
      changed = true;
    }
  }
  return changed ? result : englishSrc;
}

function captureEnglishSource(normalized) {
  const resolved = resolveEnglishSource(normalized);
  if (resolved) return resolved;

  if (
    normalized.length <= 160 &&
    (MULTI_PHRASES.some((p) => normalized.includes(p)) ||
      MULTI_HI.some((p) => normalized.includes(p)))
  ) {
    return norm(restoreEnglishDeep(normalized));
  }
  return null;
}

function applyText(node, tx) {
  const raw = node.textContent;
  if (!raw || !raw.trim()) return;

  const normalized = norm(raw);
  let src = node.__i18nSrc;
  const resolved = resolveEnglishSource(normalized);

  if (src == null) {
    src = captureEnglishSource(normalized);
    if (!src) return;
    node.__i18nSrc = src;
  } else if (resolved && resolved !== src && EN_STRINGS.has(resolved)) {
    src = resolved;
    node.__i18nSrc = src;
  }

  const translated = translateDeep(src, tx);
  if (norm(raw) !== norm(translated)) {
    node.textContent = translated;
  }
}

function applyAttrs(el, tx) {
  for (const attr of ATTRS) {
    if (!el.hasAttribute(attr)) continue;
    const current = el.getAttribute(attr);
    if (!current?.trim()) continue;
    const key = `__i18nAttr_${attr}`;
    const normalized = norm(current);
    let src = el[key];
    const resolved = resolveEnglishSource(normalized);

    if (src == null) {
      src = captureEnglishSource(normalized);
      if (!src) continue;
      el[key] = src;
    } else if (resolved && resolved !== src && EN_STRINGS.has(resolved)) {
      src = resolved;
      el[key] = src;
    }

    const translated = translateDeep(src, tx);
    if (norm(current) !== norm(translated)) el.setAttribute(attr, translated);
  }
}

function walk(node, tx) {
  if (!node) return;

  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement;
    if (!parent) return;
    if (parent.closest("[data-no-i18n]")) return;
    if (SKIP_TAGS.has(parent.tagName)) return;
    if (parent.isContentEditable) return;
    applyText(node, tx);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (node.dataset?.noI18n != null) return;
  if (SKIP_TAGS.has(node.tagName)) return;
  if (node.isContentEditable) return;

  if (node.tagName === "INPUT" || node.tagName === "SELECT") {
    applyAttrs(node, tx);
    return;
  }

  applyAttrs(node, tx);
  const children = node.childNodes;
  for (let i = 0; i < children.length; i++) walk(children[i], tx);
}

/**
 * Auto-translates dictionary / phrase-map strings inside page content.
 * Keeps English originals on nodes so EN↔HI toggles fully reverse.
 */
export default function DomI18n({ children, className = "" }) {
  const { lang, tx } = useLanguage();
  const location = useLocation();
  const ref = useRef(null);
  const txRef = useRef(tx);
  const applyingRef = useRef(false);
  txRef.current = tx;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    let timer = null;
    const run = () => {
      timer = null;
      if (applyingRef.current) return;
      applyingRef.current = true;
      try {
        walk(root, txRef.current);
      } finally {
        queueMicrotask(() => {
          applyingRef.current = false;
        });
      }
    };
    const schedule = () => {
      if (applyingRef.current) return;
      if (timer != null) return;
      timer = window.setTimeout(run, 80);
    };

    // Always run once on lang/route change (restores English or applies Hindi)
    run();

    // Only observe while Hindi is active — English mode must not keep rewriting DOM
    if (lang !== "hi") {
      return () => {
        if (timer != null) window.clearTimeout(timer);
        applyingRef.current = false;
      };
    }

    const mo = new MutationObserver(schedule);
    mo.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ATTRS,
    });

    return () => {
      mo.disconnect();
      if (timer != null) window.clearTimeout(timer);
      applyingRef.current = false;
    };
  }, [lang, location.pathname, location.search]);

  return (
    <div ref={ref} className={className || undefined} data-dom-i18n="">
      {children}
    </div>
  );
}
