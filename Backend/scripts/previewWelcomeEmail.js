/**
 * Smoke: render branded credential email + optionally send.
 * Usage:
 *   node scripts/previewWelcomeEmail.js
 *   node scripts/previewWelcomeEmail.js you@example.com
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildCredentialWelcomeEmail } from "../services/mail/emailTemplates.js";
import { sendMail, isMailConfigured } from "../services/mail/mailer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const to = process.argv[2];

const sample = buildCredentialWelcomeEmail({
  name: "Demo Parent",
  roleLabel: "Parent",
  schoolName: "Eduaitor Demo School",
  credentialBlocks: [
    { title: "Parent login", username: "9876543210", password: "Parent@123" },
    { title: "Student login", username: "STU001", password: "Student@123" },
  ],
  extraLines: ["Student: Ava Sharma"],
});

const out = path.join(__dirname, "welcome-email-preview.html");
fs.writeFileSync(out, sample.html, "utf8");
console.log("Wrote", out);
console.log("Subject:", sample.subject);
console.log("SMTP configured:", isMailConfigured());

if (to) {
  const result = await sendMail({
    to,
    subject: `[preview] ${sample.subject}`,
    text: sample.text,
    html: sample.html,
  });
  console.log("Send result:", result);
} else {
  console.log("Pass an email to also send: node scripts/previewWelcomeEmail.js you@example.com");
}
