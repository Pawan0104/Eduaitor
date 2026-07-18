import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../i18n/translations";
import { PHRASE_HI } from "../i18n/phraseHi";

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

/** Multi-word phrases sorted longest-first for in-string replace. */
const MULTI_PHRASES = [...EN_STRINGS]
  .filter((p) => p.length >= 5 && (/\s/.test(p) || p.length >= 8))
  .sort((a, b) => b.length - a.length);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Collapse JSX line-breaks / extra spaces so dictionary matches work. */
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
  return false;
}

function translateDeep(text, tx) {
  const normalized = norm(text);
  if (!normalized) return text;

  if (canTranslate(normalized)) {
    const out = tx(normalized);
    if (out === normalized) return text;
    return out;
  }

  // Partial: replace known multi-word / long phrases inside longer copy
  let result = normalized;
  let changed = false;
  for (const phrase of MULTI_PHRASES) {
    if (!result.includes(phrase)) continue;
    const re = new RegExp(`(?<![A-Za-z])${escapeRe(phrase)}(?![A-Za-z])`, "g");
    const next = result.replace(re, () => tx(phrase));
    if (next !== result) {
      result = next;
      changed = true;
    }
  }
  return changed ? result : text;
}

function applyText(node, tx) {
  const raw = node.textContent;
  if (!raw || !raw.trim()) return;

  // Prefer original English source if we already captured it
  let src = node.__i18nSrc;
  if (src == null) {
    const normalized = norm(raw);
    const hasPhrase =
      canTranslate(normalized) ||
      MULTI_PHRASES.some((p) => normalized.includes(p));
    if (!hasPhrase) return;
    src = normalized;
    node.__i18nSrc = src;
  }

  const translated = translateDeep(src, tx);
  if (norm(raw) !== norm(translated) || raw !== translated) {
    node.textContent = translated;
  }
}

function applyAttrs(el, tx) {
  for (const attr of ATTRS) {
    if (!el.hasAttribute(attr)) continue;
    const current = el.getAttribute(attr);
    if (!current?.trim()) continue;
    const key = `__i18nAttr_${attr}`;
    let src = el[key];
    if (src == null) {
      const normalized = norm(current);
      const hasPhrase =
        canTranslate(normalized) ||
        MULTI_PHRASES.some((p) => normalized.includes(p));
      if (!hasPhrase) continue;
      src = normalized;
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
 */
export default function DomI18n({ children, className = "" }) {
  const { lang, tx } = useLanguage();
  const location = useLocation();
  const ref = useRef(null);
  const txRef = useRef(tx);
  txRef.current = tx;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // Drop cached English sources so a language switch always re-resolves
    const clearCache = (node) => {
      if (!node) return;
      if (node.nodeType === Node.TEXT_NODE) {
        delete node.__i18nSrc;
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      for (const attr of ATTRS) delete node[`__i18nAttr_${attr}`];
      const kids = node.childNodes;
      for (let i = 0; i < kids.length; i++) clearCache(kids[i]);
    };
    clearCache(root);

    let timer = null;
    let raf = null;
    const run = () => {
      timer = null;
      walk(root, txRef.current);
      // Second pass after React paint settles
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => walk(root, txRef.current));
    };
    const schedule = () => {
      if (timer != null) return;
      timer = window.setTimeout(run, 30);
    };

    run();

    const mo = new MutationObserver(schedule);
    mo.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });

    return () => {
      mo.disconnect();
      if (timer != null) window.clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [lang, location.pathname, location.search]);

  return (
    <div ref={ref} className={className || undefined} data-dom-i18n="">
      {children}
    </div>
  );
}
