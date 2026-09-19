/**
 * Marketing AI — website content source for the super admin autopilot.
 * Fetches the Eduaitor website (SPA — little static HTML), so we collect:
 *  - <title> / meta description / OpenGraph tags from the homepage,
 *  - the sitemap (if any) to discover feature pages, then their titles.
 * Output becomes the brand-voice context the AI riff on for daily posts.
 */

const DEFAULT_SITE = "https://eduaitor.com";
const MAX_PAGES = 5;
const MAX_BYTES = 1_200_000; // 1.2 MB of html is plenty
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const siteUrl = () =>
  process.env.EDUAITOR_WEBSITE_URL?.replace(/\/+$/, "") || DEFAULT_SITE;

const decodeEntities = (s) =>
  String(s || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const stripHtml = (s) =>
  decodeEntities(String(s || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));

const fetchHtml = async (url) => {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  return new TextDecoder("utf-8").decode(
    buf.length > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf,
  );
};

const extractMeta = (html) => {
  const out = [];
  for (const m of html.matchAll(
    /<meta[^>]+(?:property|name)=["'](og:[a-z:]+|description)["'][^>]+content=["']([^"']*)/gi,
  )) {
    const clean = stripHtml(m[2]);
    if (clean && clean.length >= 12) out.push(clean);
  }
  return [...new Set(out)];
};

const extractTitle = (html) =>
  stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]) || "";

/** Pull useful static blocks (headings/paragraphs/lists) if the page has them. */
const extractBlocks = (html) => {
  const blocks = [];
  const seen = new Set();
  const push = (t) => {
    const clean = stripHtml(t);
    if (clean.length >= 24 && !seen.has(clean)) {
      seen.add(clean);
      blocks.push(clean);
    }
  };
  for (const m of html.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi)) push(m[1]);
  for (const m of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) push(m[1]);
  for (const m of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) push(m[1]);
  return blocks;
};

/** Discover inner pages via sitemap.xml (best-effort). */
const discoverPages = async (base) => {
  try {
    const xml = await fetchHtml(`${base}/sitemap.xml`);
    if (!xml) return [];
    const locs = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
      .map((m) => m[1].trim())
      .filter((u) => u.startsWith(base) || u.startsWith("http"))
      .slice(0, MAX_PAGES);
    return locs;
  } catch {
    return [];
  }
};

/** Small in-memory cache so a plan run reuses one crawl. */
let cache = null;
let cacheAt = 0;

export const fetchWebsiteSnippet = async ({ url, force = false } = {}) => {
  const target = (url || siteUrl()).replace(/\/+$/, "");
  if (!force && cache && Date.now() - cacheAt < 10 * 60 * 1000) {
    return { ...cache, url: target };
  }

  const html = await fetchHtml(target);
  if (!html) throw new Error(`Website fetch failed for ${target}.`);

  const title = extractTitle(html);
  const meta = extractMeta(html);
  const blocks = extractBlocks(html).slice(0, 14);

  // Learn a bit more from the sitemap pages (title + description only).
  const pages = [];
  const urls = await discoverPages(target);
  for (let i = 0; i < urls.length; i++) {
    try {
      const pageHtml = await fetchHtml(urls[i]);
      if (!pageHtml) continue;
      const t = extractTitle(pageHtml);
      const [d] = extractMeta(pageHtml);
      pages.push(`${t}${d ? ` — ${d}` : ""}`);
    } catch {
      // keep going
    }
  }

  const description = meta.find((m) => m.length > 25) || meta[0] || "";
  const body = [description, ...blocks].filter(Boolean).join("\n");
  const featured = pages.slice(0, MAX_PAGES).map((t) => stripHtml(t));

  const snippet = {
    url: target,
    title,
    description,
    content: body.slice(0, 6000),
    pages: featured,
    summary:
      [title, description, ...featured.slice(0, 3)].filter(Boolean).join(". ") ||
      "Eduaitor — AI tools for schools.",
  };

  cache = snippet;
  cacheAt = Date.now();
  return snippet;
};

export const getEduaitorSite = () => siteUrl();