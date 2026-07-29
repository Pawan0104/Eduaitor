/**
 * Normalize VITE_API_URL so builds always hit `/api` even if the env
 * was set as the Render root (common Netlify misconfig).
 */
const PROD_API_FALLBACK = "https://eduaitor-api.onrender.com/api";

export function resolveApiBase(url = import.meta.env.VITE_API_URL) {
  let base = String(url || "").trim().replace(/\/+$/, "");
  // Production builds without VITE_API_URL would otherwise POST to the
  // frontend host and surface a confusing CORS/network error.
  if (!base && import.meta.env.PROD) base = PROD_API_FALLBACK;
  if (!base) return "";
  if (!/\/api$/i.test(base)) base = `${base}/api`;
  return base;
}

export const API = resolveApiBase();
