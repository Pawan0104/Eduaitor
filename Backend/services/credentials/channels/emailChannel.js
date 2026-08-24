import {
  adminLoginUrl,
  escapeHtml,
  isMailConfigured,
  sendMail,
} from "../mail/mailer.js";

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

  if (!isMailConfigured()) {
    console.info(
      `[credentials/email] Would email ${to} username=${username} (SMTP unset)`,
    );
    return { sent: false, skipped: true, reason: "SMTP not configured" };
  }

  const loginUrl = adminLoginUrl();
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

  return sendMail({
    to,
    subject: `Your Eduaitor ${roleLabel} login credentials`,
    text,
    html,
  });
}
