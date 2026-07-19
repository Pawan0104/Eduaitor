/**
 * Normalize VITE_API_URL so builds always hit `/api` even if the env
 * was set as the Render root (common Netlify misconfig).
 */
export function resolveApiBase(url = import.meta.env.VITE_API_URL) {
  let base = String(url || "").trim().replace(/\/+$/, "");
  if (!base) return "";
  if (!/\/api$/i.test(base)) base = `${base}/api`;
  return base;
}

export const API = resolveApiBase();
