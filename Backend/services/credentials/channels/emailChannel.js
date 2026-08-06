import nodemailer from "nodemailer";

let transporter = null;
let warnedMissingConfig = false;

function isEmailConfigured() {
  return Boolean(
    process.env.EMAIL_HOST &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS &&
      process.env.EMAIL_FROM,
  );
}

function getTransporter() {
  if (!isEmailConfigured()) return null;
  if (transporter) return transporter;

  const port = Number(process.env.EMAIL_PORT || 587);
  const secure =
    String(process.env.EMAIL_SECURE || "").toLowerCase() === "true" ||
    port === 465;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
}

function buildBodies({
  name,
  username,
  password,
  schoolName,
  loginUrl,
  roleLabel,
  extraLines = [],
}) {
  const greeting = name ? `Hello ${name},` : "Hello,";
  const schoolLine = schoolName ? `School: ${schoolName}` : null;
  const lines = [
    greeting,
    "",
    `Your Eduaitor ${roleLabel} account has been created.`,
    schoolLine,
    `Username: ${username}`,
    `Password: ${password}`,
    loginUrl ? `Login: ${loginUrl}` : null,
    ...extraLines,
    "",
    "Please sign in and consider changing your password.",
    "",
    "— Eduaitor",
  ].filter((line) => line !== null && line !== undefined);

  const text = lines.join("\n");

  const htmlExtra = extraLines
    .map((line) => `<p style="margin:4px 0;">${escapeHtml(line)}</p>`)
    .join("");

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#1f2937">
      <p>${escapeHtml(greeting)}</p>
      <p>Your Eduaitor <strong>${escapeHtml(roleLabel)}</strong> account has been created.</p>
      ${schoolName ? `<p><strong>School:</strong> ${escapeHtml(schoolName)}</p>` : ""}
      <p><strong>Username:</strong> ${escapeHtml(String(username || ""))}</p>
      <p><strong>Password:</strong> ${escapeHtml(String(password || ""))}</p>
      ${loginUrl ? `<p><strong>Login:</strong> <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></p>` : ""}
      ${htmlExtra}
      <p>Please sign in and consider changing your password.</p>
      <p>— Eduaitor</p>
    </div>
  `;

  return { text, html };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Send credential email. Never throws — returns a result object.
 */
export async function sendCredentialEmail(payload) {
  const {
    to,
    name,
    username,
    password,
    schoolName,
    roleLabel = "account",
    extraLines = [],
  } = payload || {};

  if (!to) {
    return { sent: false, skipped: true, reason: "No email address" };
  }

  if (!isEmailConfigured()) {
    if (!warnedMissingConfig) {
      console.warn(
        "[credentials/email] SMTP not configured (set EMAIL_HOST, EMAIL_USER, EMAIL_PASS, EMAIL_FROM). Skipping credential emails.",
      );
      warnedMissingConfig = true;
    }
    console.info(
      `[credentials/email] Would email ${to} username=${username} (SMTP unset)`,
    );
    return { sent: false, skipped: true, reason: "SMTP not configured" };
  }

  const mailer = getTransporter();
  if (!mailer) {
    return { sent: false, skipped: true, reason: "SMTP not configured" };
  }

  const loginUrl = (process.env.CLIENT_URL || "").replace(/\/$/, "")
    ? `${String(process.env.CLIENT_URL).replace(/\/$/, "")}/admin/login`
    : null;

  const { text, html } = buildBodies({
    name,
    username,
    password,
    schoolName,
    loginUrl,
    roleLabel,
    extraLines,
  });

  try {
    await mailer.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: `Your Eduaitor ${roleLabel} login credentials`,
      text,
      html,
    });
    return { sent: true, skipped: false, channel: "email", to };
  } catch (err) {
    console.error("[credentials/email] send failed:", err?.message || err);
    return {
      sent: false,
      skipped: false,
      error: err?.message || "Email send failed",
    };
  }
}
