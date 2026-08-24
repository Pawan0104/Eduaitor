/**
 * Verify SMTP config used by credential emails.
 *
 * Usage (from Backend/):
 *   node scripts/verifySmtp.js
 *   node scripts/verifySmtp.js you@example.com
 *
 * Reads EMAIL_* from environment / Backend/.env (via dotenv if present).
 * Does not print the password.
 */
import "dotenv/config";
import nodemailer from "nodemailer";

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function main() {
  const host = required("EMAIL_HOST");
  const user = required("EMAIL_USER");
  const pass = required("EMAIL_PASS");
  const from = required("EMAIL_FROM");
  const port = Number(process.env.EMAIL_PORT || 587);
  const secure =
    String(process.env.EMAIL_SECURE || "").toLowerCase() === "true" ||
    port === 465;

  console.log("SMTP config:");
  console.log(`  HOST=${host}`);
  console.log(`  PORT=${port}`);
  console.log(`  SECURE=${secure}`);
  console.log(`  USER=${user}`);
  console.log(`  FROM=${from}`);
  console.log(`  CLIENT_URL=${process.env.CLIENT_URL || "(unset)"}`);
  console.log(`  PASS=${pass ? "(set)" : "(missing)"}`);
  console.log(
    `  TLS_REJECT_UNAUTHORIZED=${process.env.EMAIL_TLS_REJECT_UNAUTHORIZED || "true"}`,
  );

  const rejectUnauthorized =
    String(process.env.EMAIL_TLS_REJECT_UNAUTHORIZED || "true").toLowerCase() !==
    "false";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized },
    requireTLS: !secure && port === 587,
  });

  console.log("\nVerifying SMTP connection…");
  await transporter.verify();
  console.log("OK: SMTP connection verified.");

  const to = process.argv[2];
  if (!to) {
    console.log("\nSkip send (pass an email to send a test):");
    console.log("  node scripts/verifySmtp.js you@example.com");
    return;
  }

  const loginBase = String(process.env.CLIENT_URL || "")
    .trim()
    .replace(/\/$/, "");
  const loginUrl = loginBase ? `${loginBase}/admin/login` : null;

  console.log(`\nSending test message to ${to}…`);
  const info = await transporter.sendMail({
    from,
    to,
    subject: "Eduaitor SMTP test",
    text: [
      "This is a test email from Eduaitor SMTP verify script.",
      loginUrl ? `Login: ${loginUrl}` : null,
      "",
      "If you received this, live credential email is configured correctly.",
    ]
      .filter(Boolean)
      .join("\n"),
    html: `<p>This is a test email from <strong>Eduaitor</strong> SMTP verify script.</p>
      ${loginUrl ? `<p>Login: <a href="${loginUrl}">${loginUrl}</a></p>` : ""}
      <p>If you received this, live credential email is configured correctly.</p>`,
  });

  console.log("OK: message accepted by SMTP server.");
  console.log(`  messageId=${info.messageId || "(none)"}`);
  if (info.response) console.log(`  response=${info.response}`);
}

main().catch((err) => {
  console.error("FAILED:", err?.message || err);
  process.exit(1);
});
