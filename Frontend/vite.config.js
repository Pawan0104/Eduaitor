import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { emitAppVersionPlugin } from "./scripts/emitAppVersionPlugin.js";

/** Ensure API base always ends with /api (Netlify often sets Render root only). */
function normalizeApiUrl(url) {
  let base = String(url || "").trim().replace(/\/+$/, "");
  if (!base) return "";
  if (!/\/api$/i.test(base)) base = `${base}/api`;
  return base;
}

function normalizeBase(base) {
  let b = String(base || "/").trim() || "/";
  if (!b.startsWith("/")) b = `/${b}`;
  if (!b.endsWith("/")) b = `${b}/`;
  // Vite treats "./" as relative; keep that for APK if requested
  if (base === "./" || base === ".") return "./";
  return b === "//" ? "/" : b;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = normalizeApiUrl(env.VITE_API_URL);

  // Shared hosting / Netlify: "/" at domain or subdomain root (recommended).
  // APK mode may use "./". Override with VITE_BASE=/admin/ only for subfolder deploys.
  const base =
    mode === "apk"
      ? normalizeBase(env.VITE_BASE || "./")
      : normalizeBase(env.VITE_BASE || "/");

  return {
    base,
    plugins: [react(), tailwindcss(), emitAppVersionPlugin()],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
    },
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(apiUrl),
    },
  };
});
