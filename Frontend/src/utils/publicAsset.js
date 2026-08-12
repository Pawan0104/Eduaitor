/** Public-folder asset URL that respects Vite `base` (e.g. `/admin/`). */
export function publicAsset(path) {
  const base = import.meta.env.BASE_URL || "/";
  const clean = String(path || "").replace(/^\/+/, "");
  if (!clean) return base;
  return `${base.endsWith("/") ? base : `${base}/`}${clean}`;
}
