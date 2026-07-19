import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** Ensure API base always ends with /api (Netlify often sets Render root only). */
function normalizeApiUrl(url) {
  let base = String(url || "").trim().replace(/\/+$/, "");
  if (!base) return "";
  if (!/\/api$/i.test(base)) base = `${base}/api`;
  return base;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = normalizeApiUrl(env.VITE_API_URL);

  return {
    plugins: [react(), tailwindcss()],
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(apiUrl),
    },
  };
});
