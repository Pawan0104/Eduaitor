/**
 * Maps Eduaitor catalog books → official NCERT textbook portal codes/URLs.
 * Source data: ncertPortalBooks.json (from parseNcertPortalCodes.js).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTAL_JSON = path.join(__dirname, "ncertPortalBooks.json");

const NCERT_BASE = "https://ncert.nic.in";

let portalBooks = [];
try {
  portalBooks = JSON.parse(fs.readFileSync(PORTAL_JSON, "utf8"));
} catch {
  portalBooks = [];
}

const normalize = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9\u0900-\u097f\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Strip common suffixes/prefixes so "Rimjhim Bhag 1" ≈ "Rimjhim" */
const looseKey = (s = "") =>
  normalize(s)
    .replace(/\b(bhag|part|volume|vol|class)\s*[ivx0-9]+\b/g, "")
    .replace(/\b(english|hindi|urdu)\b/g, "")
    .replace(/\b(supplementary|textbook|reader)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isEnglishPreferred = (portalTitle = "") => {
  const t = portalTitle.toLowerCase();
  if (
    /\(hindi\)|\(urdu\)|\(marathi\)|\(bengali\)|\(tamil\)|\(telugu\)|\(kannada\)|\(malayalam\)|\(gujarati\)|\(punjabi\)|\(odia\)|\(oriya\)|\(assamese\)|\(sanskrit\)|\(sindhi\)|\(konkani\)|\(manipuri\)|\(nepali\)|\(santhali\)|\(bodo\)|\(dogri\)|\(kashmiri\)|\(maithili\)|\(maithli\)/.test(
      t,
    )
  ) {
    return false;
  }
  return true;
};

/**
 * Catalog title (or subject) → current NCERT portal title fragment / code.
 * NCERT has renamed many books; aliases keep links working.
 */
const TITLE_ALIASES = {
  // primary
  marigold: ["mridang", "marigold"],
  raindrops: ["mridang", "raindrops"],
  "math-magic": ["joyful-mathematics", "math-magic", "joyful mathematics"],
  "math magic": ["joyful-mathematics", "math-magic"],
  "joyful mathematics": ["joyful-mathematics", "joyful mathematics"],
  rimjhim: ["sarangi", "rimjhim"],
  "rimjhim bhag 1": ["sarangi", "rimjhim"],
  "rimjhim bhag 2": ["sarangi", "rimjhim"],
  "rimjhim bhag 3": ["rimjhim"],
  "rimjhim bhag 4": ["rimjhim", "looking around"],
  "rimjhim bhag 5": ["rimjhim"],
  mridang: ["mridang"],
  sarangi: ["sarangi"],
  "vasant bhag 2": ["vasant", "poorvi"],
  "kshitij bhag 1": ["kshitij"],
  "kritika bhag 1": ["kritika"],
  // middle school renames
  mathematics: ["ganita prakash", "ganita manjari", "mathematics"],
  "ganita prakash": ["ganita prakash"],
  honeysuckle: ["poorvi", "honeysuckle"],
  "a pact with the sun": ["poorvi"],
  honeycomb: ["poorvi", "honeycomb"],
  "an alien hand": ["poorvi"],
  honeydew: ["poorvi", "honeydew"],
  "it so happened": ["poorvi", "it so happened"],
  beehive: ["kaveri", "beehive"],
  "moments (supplementary)": ["kaveri", "moments"],
  moments: ["kaveri", "moments"],
  science: ["curiosity", "exploration", "science"],
  curiosity: ["curiosity"],
  // social science renames (class 6–8 often consolidated)
  "our pasts - i (history)": ["exploring society"],
  "our pasts - ii (history)": ["exploring society"],
  "our pasts - iii (history)": ["exploring society"],
  "the earth our habitat (geography)": ["exploring society"],
  "our environment (geography)": ["exploring society"],
  "resource and development (geography)": ["exploring society"],
  "social and political life - i": ["exploring society"],
  "social and political life - ii": ["exploring society"],
  "social and political life - iii": ["exploring society"],
  "looking around": ["looking around"],
  // class 9–10 english
  "first flight": ["first flight"],
  "footprints without feet": ["footprints without feet", "footprints"],
  // hindi
  "vasant bhag 1": ["vasant", "poorvi"],
  "vasant bhag 2": ["vasant"],
  "vasant bhag 3": ["vasant"],
};

const SUBJECT_FALLBACK_TITLE = {
  "6|english": "poorvi",
  "7|english": "poorvi",
  "8|english": "poorvi",
  "9|english": "kaveri",
  "6|mathematics": "ganita prakash",
  "7|mathematics": "ganita prakash",
  "8|mathematics": "mathematics",
  "9|mathematics": "ganita manjari",
  "6|science": "curiosity",
  "7|science": "curiosity",
  "8|science": "curiosity",
  "9|science": "exploration",
  "6|social science": "exploring society",
  "7|social science": "exploring society",
  "8|social science": "exploring society",
  "1|english": "mridang",
  "2|english": "mridang",
  "1|mathematics": "joyful-mathematics",
  "2|mathematics": "joyful-mathematics",
  "1|hindi": "sarangi",
  "2|hindi": "sarangi",
};

/**
 * Find best NCERT portal book for a catalog book.
 * @returns {{ code, chapterCount, portalTitle, subject } | null}
 */
export function resolveNcertBook({ className, subjectName, title, medium }) {
  const cls = String(className || "").trim();
  if (!cls || !portalBooks.length) return null;

  const candidates = portalBooks.filter((b) => b.className === cls);
  if (!candidates.length) return null;

  const wantTitle = normalize(title);
  const wantLoose = looseKey(title);
  const wantSubject = normalize(subjectName);
  const preferEnglish = !medium || /english/i.test(medium);
  const aliasHints = TITLE_ALIASES[wantTitle] || TITLE_ALIASES[wantLoose] || [];
  const subjectFallback =
    SUBJECT_FALLBACK_TITLE[`${cls}|${wantSubject}`] || "";

  const score = (b) => {
    const pt = normalize(b.title);
    const pl = looseKey(b.title);
    const ps = normalize(b.subject);
    let s = 0;

    if (pt === wantTitle) s += 100;
    else if (pt.includes(wantTitle) || wantTitle.includes(pt)) s += 70;
    else if (
      pl &&
      wantLoose &&
      (pl === wantLoose || pl.includes(wantLoose) || wantLoose.includes(pl))
    )
      s += 55;
    else {
      const aliasHit = aliasHints.some(
        (a) => pt.includes(a) || pl.includes(a) || a.includes(pl),
      );
      if (aliasHit) s += 50;
      else if (
        subjectFallback &&
        (pt.includes(subjectFallback) || pl.includes(subjectFallback))
      )
        s += 45;
      else return -1;
    }

    if (ps === wantSubject) s += 20;
    else if (ps.includes(wantSubject) || wantSubject.includes(ps)) s += 10;

    if (preferEnglish && isEnglishPreferred(b.title)) s += 15;
    if (preferEnglish && !isEnglishPreferred(b.title)) s -= 25;

    return s;
  };

  let best = null;
  let bestScore = 0;
  for (const b of candidates) {
    const sc = score(b);
    if (sc > bestScore) {
      bestScore = sc;
      best = b;
    }
  }

  if (!best || bestScore < 45) return null;

  return {
    code: best.code,
    chapterCount: best.chapterCount,
    portalTitle: best.title,
    subject: best.subject,
  };
}

export function ncertPortalBookUrl(code, chapterCount) {
  if (!code) return "";
  const total = Number(chapterCount) || 1;
  return `${NCERT_BASE}/textbook.php?${code}=0-${total}`;
}

export function ncertPortalChapterUrl(code, chapterNumber, chapterCount) {
  if (!code || !chapterNumber) return "";
  const total = Number(chapterCount) || chapterNumber;
  return `${NCERT_BASE}/textbook.php?${code}=${chapterNumber}-${total}`;
}

export function ncertChapterPdfUrl(code, chapterNumber) {
  if (!code || !chapterNumber) return "";
  const n = String(chapterNumber).padStart(2, "0");
  return `${NCERT_BASE}/textbook/pdf/${code}${n}.pdf`;
}

export function buildNcertChapterLinks(code, chapterNumber, chapterCount) {
  if (!code) {
    return {
      ncertBookCode: "",
      ncertPortalUrl: "",
      ncertPdfUrl: "",
    };
  }
  return {
    ncertBookCode: code,
    ncertPortalUrl: ncertPortalChapterUrl(code, chapterNumber, chapterCount),
    ncertPdfUrl: ncertChapterPdfUrl(code, chapterNumber),
  };
}
