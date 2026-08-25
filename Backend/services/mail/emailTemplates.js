import { adminLoginUrl, clientOrigin, escapeHtml } from "./mailer.js";

/** Eduaitor brand tokens for transactional email. */
export const BRAND = {
  name: "Eduaitor",
  teal: "#0d9488",
  tealDark: "#0f766e",
  violet: "#6d28d9",
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
  soft: "#f0fdfa",
  white: "#ffffff",
};

/**
 * Absolute logo URL for email clients.
 * Prefer EMAIL_LOGO_URL; else CLIENT_URL/eduaitor.png; else live hosting fallback.
 */
export function brandLogoUrl() {
  const fromEnv = String(process.env.EMAIL_LOGO_URL || "").trim();
  if (fromEnv) return fromEnv;

  // Email clients cannot load localhost images — prefer live hosting logo.
  const origin = clientOrigin();
  if (origin && !/localhost|127\.0\.0\.1/i.test(origin)) {
    if (/eduaitor\.com/i.test(origin)) {
      return "https://www.eduaitor.com/admin/eduaitor.png";
    }
    return `${origin}/eduaitor.png`;
  }
  return "https://www.eduaitor.com/admin/eduaitor.png";
}

function credentialRowsHtml(blocks = []) {
  return blocks
    .filter((b) => b && (b.username || b.password))
    .map((block) => {
      const title = escapeHtml(block.title || "Login details");
      const user = escapeHtml(String(block.username || ""));
      const pass = escapeHtml(String(block.password || ""));
      return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;background:${BRAND.soft};border:1px solid ${BRAND.line};border-radius:12px">
          <tr><td style="padding:14px 16px">
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;color:${BRAND.tealDark}">${title}</p>
            <p style="margin:0 0 6px;font-size:14px;color:${BRAND.ink}"><strong>Username:</strong> ${user}</p>
            <p style="margin:0;font-size:14px;color:${BRAND.ink}"><strong>Password:</strong> ${pass}</p>
          </td></tr>
        </table>`;
    })
    .join("");
}

function ctaButton(href, label) {
  if (!href) return "";
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px">
      <tr>
        <td style="border-radius:10px;background:linear-gradient(135deg,${BRAND.teal},${BRAND.violet})">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:${BRAND.white};text-decoration:none">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`;
}

/**
 * Shared branded shell (logo header + footer).
 */
export function wrapBrandedEmail({
  title,
  preheader = "",
  bodyHtml,
  footerNote = "",
} = {}) {
  const logo = brandLogoUrl();
  const safeTitle = escapeHtml(title || BRAND.name);
  const safePre = escapeHtml(preheader || "");
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink}">
  ${safePre ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${safePre}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.white};border-radius:16px;overflow:hidden;border:1px solid ${BRAND.line};box-shadow:0 8px 24px rgba(15,23,42,0.06)">
          <tr>
            <td style="padding:22px 28px 16px;text-align:center;background:linear-gradient(180deg,#f8fffd 0%,${BRAND.white} 100%);border-bottom:1px solid ${BRAND.line}">
              <img src="${escapeHtml(logo)}" alt="${escapeHtml(BRAND.name)}" width="148" style="display:block;margin:0 auto 10px;max-width:148px;height:auto;border:0" />
              <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.violet}">School ERP</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${BRAND.ink}">${safeTitle}</h1>
              ${bodyHtml || ""}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px">
              ${footerNote ? `<p style="margin:0 0 12px;font-size:13px;color:${BRAND.muted}">${footerNote}</p>` : ""}
              <p style="margin:0;font-size:12px;color:${BRAND.muted}">© ${year} ${escapeHtml(BRAND.name)}. Track · Assess · Improve</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Welcome + login credentials (teacher, staff, parent, school admin, etc.).
 *
 * @param {object} opts
 * @param {string} [opts.name]
 * @param {string} opts.roleLabel
 * @param {string} [opts.schoolName]
 * @param {Array<{title?:string,username?:string,password?:string}>} opts.credentialBlocks
 * @param {string} [opts.loginUrl]
 * @param {string[]} [opts.extraLines]
 */
export function buildCredentialWelcomeEmail(opts = {}) {
  const {
    name,
    roleLabel = "account",
    schoolName,
    credentialBlocks = [],
    loginUrl = adminLoginUrl(),
    extraLines = [],
  } = opts;

  const greeting = name ? `Hello ${name},` : "Hello,";
  const schoolBit = schoolName ? ` at ${schoolName}` : "";
  const title = `Welcome to ${BRAND.name}`;
  const preheader = `Your ${roleLabel} login details for Eduaitor`;

  const extraHtml = (extraLines || [])
    .filter(Boolean)
    .map(
      (line) =>
        `<p style="margin:0 0 8px;font-size:14px;color:${BRAND.ink}">${escapeHtml(line)}</p>`,
    )
    .join("");

  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${BRAND.ink}">${escapeHtml(greeting)}</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${BRAND.ink}">
      Your <strong>${escapeHtml(roleLabel)}</strong> account${schoolName ? ` for <strong>${escapeHtml(schoolName)}</strong>` : ""} is ready.
      Use the details below to sign in.
    </p>
    ${credentialRowsHtml(credentialBlocks)}
    ${extraHtml}
    ${ctaButton(loginUrl, "Open Eduaitor login")}
    ${loginUrl ? `<p style="margin:10px 0 0;font-size:12px;color:${BRAND.muted};word-break:break-all">${escapeHtml(loginUrl)}</p>` : ""}
    <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:${BRAND.muted}">
      For security, please sign in and change your password after your first login.
    </p>
  `;

  const html = wrapBrandedEmail({
    title,
    preheader,
    bodyHtml,
    footerNote: "This message was sent because an account was created for you on Eduaitor.",
  });

  const textLines = [
    greeting,
    "",
    `Welcome to Eduaitor. Your ${roleLabel} account${schoolBit} is ready.`,
    "",
    ...credentialBlocks.flatMap((b) => [
      b.title || "Login details",
      `Username: ${b.username || ""}`,
      `Password: ${b.password || ""}`,
      "",
    ]),
    ...extraLines,
    loginUrl ? `Login: ${loginUrl}` : null,
    "",
    "Please sign in and change your password after your first login.",
    "",
    "— Eduaitor",
  ].filter((l) => l !== null && l !== undefined);

  return {
    subject: `Welcome to Eduaitor — your ${roleLabel} login`,
    text: textLines.join("\n"),
    html,
  };
}

export function buildPasswordResetEmail({
  name,
  roleLabel = "account",
  resetUrl,
  loginUrl = adminLoginUrl(),
} = {}) {
  const greeting = name ? `Hello ${name},` : "Hello,";
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6">${escapeHtml(greeting)}</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${BRAND.ink}">
      We received a request to reset your Eduaitor <strong>${escapeHtml(roleLabel)}</strong> password.
    </p>
    ${ctaButton(resetUrl, "Reset password")}
    <p style="margin:12px 0 0;font-size:12px;color:${BRAND.muted};word-break:break-all">${escapeHtml(resetUrl || "")}</p>
    <p style="margin:18px 0 0;font-size:14px;color:${BRAND.muted}">
      This link expires in <strong>1 hour</strong>. If you did not request this, you can ignore this email.
    </p>
    ${loginUrl ? `<p style="margin:12px 0 0;font-size:13px;color:${BRAND.muted}">Login: <a href="${escapeHtml(loginUrl)}" style="color:${BRAND.teal}">${escapeHtml(loginUrl)}</a></p>` : ""}
  `;

  return {
    subject: "Reset your Eduaitor password",
    text: [
      greeting,
      "",
      `We received a request to reset your Eduaitor ${roleLabel} password.`,
      `Open this link within 1 hour:`,
      resetUrl,
      "",
      "If you did not request this, ignore this email.",
      loginUrl ? `Login: ${loginUrl}` : null,
      "",
      "— Eduaitor",
    ]
      .filter(Boolean)
      .join("\n"),
    html: wrapBrandedEmail({
      title: "Reset your password",
      preheader: "Use this link within 1 hour to choose a new password",
      bodyHtml,
    }),
  };
}

export function buildPasswordChangedEmail({ loginUrl = adminLoginUrl() } = {}) {
  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${BRAND.ink}">
      Your Eduaitor account password was changed successfully.
    </p>
    ${ctaButton(loginUrl, "Sign in to Eduaitor")}
    <p style="margin:18px 0 0;font-size:14px;color:${BRAND.muted}">
      If you did not do this, contact your school admin immediately.
    </p>
  `;

  return {
    subject: "Your Eduaitor password was changed",
    text: [
      "Your Eduaitor account password was changed successfully.",
      loginUrl ? `Login: ${loginUrl}` : null,
      "",
      "If you did not do this, contact your school admin immediately.",
      "",
      "— Eduaitor",
    ]
      .filter(Boolean)
      .join("\n"),
    html: wrapBrandedEmail({
      title: "Password updated",
      preheader: "Your Eduaitor password was changed",
      bodyHtml,
    }),
  };
}
