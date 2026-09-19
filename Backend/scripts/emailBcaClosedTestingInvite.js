/**
 * Send branded closed-testing checklist email to all BCA seeded parents.
 * Usage: node scripts/emailBcaClosedTestingInvite.js
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { sendMail } from "../services/mail/mailer.js";
import { buildClosedTestingChecklistEmail } from "../services/mail/emailTemplates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

process.env.MAIL_RELAY_URL =
  process.env.MAIL_RELAY_URL || "https://www.eduaitor.com/mail-relay/send.php";
process.env.MAIL_RELAY_SECRET =
  process.env.MAIL_RELAY_SECRET || "L9lcMJayX8GfQ7tbiSeYDOKTw5BrmZ4xFpVP3WEu";
process.env.EMAIL_LOGO_URL =
  process.env.EMAIL_LOGO_URL || "https://www.eduaitor.com/admin/eduaitor.png";

const PASSWORD = "#Parent@2026";
const SCHOOL = "Bright Children Academy (BCA)";

const PARENTS = [
  { email: "aryaeduhub@gmail.com", mobile: "9876510000", name: "Arya" },
  { email: "basant181442@gmail.com", mobile: "9876510001", name: "Basant" },
  { email: "coolpawant09@gmail.com", mobile: "9876510002", name: "Pawan" },
  { email: "kanta456sharma@gmail.com", mobile: "9876510003", name: "Kanta" },
  { email: "kgupta112511@gmail.com", mobile: "9876510004", name: "K Gupta" },
  { email: "nexbigstep@gmail.com", mobile: "9876510005", name: "Nex" },
  { email: "pawan.eduaitor@gmail.com", mobile: "9876510006", name: "Pawan" },
  { email: "rishitiwari1286@gmail.com", mobile: "9876510007", name: "Rishi" },
  { email: "shilpaverma1212@gmail.com", mobile: "9876510008", name: "Shilpa" },
  { email: "sonusrivastava1512@gmail.com", mobile: "9876510009", name: "Sonu" },
  { email: "suveers6886@gmail.com", mobile: "9876510010", name: "Suveer" },
  { email: "suveersamsung@gmail.com", mobile: "9876510011", name: "Suveer" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const run = async () => {
  const results = [];

  for (const parent of PARENTS) {
    const payload = buildClosedTestingChecklistEmail({
      name: parent.name,
      schoolName: SCHOOL,
      username: parent.mobile,
      password: PASSWORD,
    });

    const result = await sendMail({
      to: parent.email,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    const status = result?.sent
      ? "SENT"
      : result?.skipped
        ? `SKIPPED ${result.reason || ""}`
        : `FAIL ${result?.error || ""}`;

    console.log(`${parent.email} → ${status}`);
    results.push({ email: parent.email, sent: Boolean(result?.sent), status });
    await sleep(2000);
  }

  const ok = results.filter((r) => r.sent).length;
  console.log(`\nDone: ${ok}/${results.length} branded checklist emails sent`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
