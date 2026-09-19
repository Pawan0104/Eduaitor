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
  if (key === "CLIENT_URL") {
    console.log("CLIENT_URL=https://www.eduaitor.com");
    console.log(`  (local .env has: ${val || "(unset)"} — do NOT use localhost on Render)`);
    continue;
  }
  if (!val) {
    console.log(`${key}=(MISSING — set in Backend/.env)`);
    continue;
  }
  if (key === "EMAIL_PASS") {
    console.log(`${key}=******** (copy the real mailbox password into Render)`);
    continue;
  }
  console.log(`${key}=${val}`);
}
console.log("\nThen: Manual Deploy → Clear build cache & deploy (or Restart).");
console.log("Verify: GET https://eduaitor-api.onrender.com/api/health/mail");
console.log('  Expect: {"smtpConfigured":true,"clientUrlSet":true}');
