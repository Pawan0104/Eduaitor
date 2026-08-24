import nodemailer from "nodemailer";

let transporter = null;
let warnedMissingConfig = false;

export function isMailConfigured() {
  return Boolean(
    process.env.EMAIL_HOST &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS &&
      process.env.EMAIL_FROM,
  );
}

function getTransporter() {
  if (!isMailConfigured()) return null;
  if (transporter) return transporter;

  const port = Number(process.env.EMAIL_PORT || 587);
  const secure =
    String(process.env.EMAIL_SECURE || "").toLowerCase() === "true" ||
    port === 465;

  // Shared hosts (e.g. GoDaddy cPanel) often present a cert for *.secureserver.net
  // while clients connect via mail.yourdomain.com — allow opt-out of strict check.
  const rejectUnauthorized =
    String(process.env.EMAIL_TLS_REJECT_UNAUTHORIZED || "true").toLowerCase() !==
    "false";

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized },
    requireTLS: !secure && port === 587,
  });

  return transporter;
}

/** Public app origin without trailing slash (used in email links). */
export function clientOrigin() {
  return String(process.env.CLIENT_URL || "")
    .trim()
    .replace(/\/$/, "");
}

export function adminLoginUrl() {
  const base = clientOrigin();
  return base ? `${base}/admin/login` : null;
}

/**
 * Send an email via configured SMTP.
 * @returns {{ sent: boolean, skipped?: boolean, reason?: string, error?: string, messageId?: string }}
 */
export async function sendMail({ to, subject, text, html, replyTo } = {}) {
  if (!to) {
    return { sent: false, skipped: true, reason: "No email address" };
  }

  if (!isMailConfigured()) {
    if (!warnedMissingConfig) {
      console.warn(
        "[mailer] SMTP not configured (set EMAIL_HOST, EMAIL_USER, EMAIL_PASS, EMAIL_FROM).",
      );
      warnedMissingConfig = true;
    }
    return { sent: false, skipped: true, reason: "SMTP not configured" };
  }

  const mailer = getTransporter();
  if (!mailer) {
    return { sent: false, skipped: true, reason: "SMTP not configured" };
  }

  try {
    const info = await mailer.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
      replyTo,
    });
    return {
      sent: true,
      skipped: false,
      messageId: info?.messageId,
      to,
    };
  } catch (err) {
    console.error("[mailer] send failed:", err?.message || err);
    return {
      sent: false,
      skipped: false,
      error: err?.message || "Email send failed",
    };
  }
}

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
