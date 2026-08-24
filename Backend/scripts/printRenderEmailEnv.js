/**
 * Print Render Environment values to paste into the dashboard.
 * Does NOT call Render API (no token required).
 *
 * Usage: node scripts/printRenderEmailEnv.js
 * Reads Backend/.env via dotenv.
 */
import "dotenv/config";

const keys = [
  "EMAIL_HOST",
  "EMAIL_PORT",
  "EMAIL_SECURE",
  "EMAIL_TLS_REJECT_UNAUTHORIZED",
  "EMAIL_USER",
  "EMAIL_PASS",
  "EMAIL_FROM",
  "CLIENT_URL",
];

console.log("Paste these into Render → eduaitor-api → Environment:\n");
for (const key of keys) {
  const val = process.env[key];
  if (!val) {
    console.log(`${key}=(MISSING — set in Backend/.env)`);
    continue;
  }
  if (key === "EMAIL_PASS") {
    console.log(`${key}=******** (loaded from .env — copy from webmail password)`);
    continue;
  }
  console.log(`${key}=${val}`);
}
console.log("\nThen: Manual Deploy → Clear build cache & deploy (or Restart).");
