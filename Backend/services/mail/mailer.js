import nodemailer from "nodemailer";
import { Resend } from "resend";

let transporter = null;
let warnedMissingConfig = false;

export function isSmtpConfigured() {
  return Boolean(
    process.env.EMAIL_HOST &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS &&
      process.env.EMAIL_FROM,
  );
}

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function isMailConfigured() {
  return isSmtpConfigured() || isResendConfigured();
}

function getFrom() {
  return (
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    (process.env.EMAIL_USER
      ? `Eduaitor <${process.env.EMAIL_USER}>`
      : "Eduaitor <onboarding@resend.dev>")
  );
}

function getTransporter() {
  if (!isSmtpConfigured()) return null;
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
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 20_000,
  });

  return transporter;
}

/** Quick SMTP connectivity check (for /api/health/mail). */
export async function verifySmtpConnection(timeoutMs = 10000) {
  if (!isSmtpConfigured()) {
    return { ok: false, reason: "SMTP not configured" };
  }
  const mailer = getTransporter();
  try {
    await Promise.race([
      mailer.verify(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("SMTP verify timeout")), timeoutMs),
      ),
    ]);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err?.message || "SMTP verify failed" };
  }
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

async function sendViaSmtp({ to, subject, text, html, replyTo }) {
  const mailer = getTransporter();
  if (!mailer) throw new Error("SMTP not configured");
  const info = await mailer.sendMail({
    from: getFrom(),
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
    provider: "smtp",
  };
}

async function sendViaResend({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: getFrom(),
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  });
  if (result.error) {
    throw new Error(result.error.message || "Resend failed to send email");
  }
  return {
    sent: true,
    skipped: false,
    messageId: result.data?.id,
    to,
    provider: "resend",
  };
}

/**
 * Send an email via SMTP when reachable; otherwise Resend (needed on Render —
 * GoDaddy mail.eduaitor.com often times out from cloud IPs).
 */
export async function sendMail({ to, subject, text, html, replyTo } = {}) {
  if (!to) {
    return { sent: false, skipped: true, reason: "No email address" };
  }

  if (!isMailConfigured()) {
    if (!warnedMissingConfig) {
      console.warn(
        "[mailer] Mail not configured (set EMAIL_* and/or RESEND_API_KEY).",
      );
      warnedMissingConfig = true;
    }
    return { sent: false, skipped: true, reason: "Mail not configured" };
  }

  const errors = [];

  if (isSmtpConfigured()) {
    try {
      const result = await Promise.race([
        sendViaSmtp({ to, subject, text, html, replyTo }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("SMTP send timeout")), 18_000),
        ),
      ]);
      console.info("[mailer] sent via SMTP", result.messageId, "to:", to);
      return result;
    } catch (err) {
      const msg = err?.message || String(err);
      console.warn("[mailer] SMTP failed, will try Resend if configured:", msg);
      errors.push(`smtp: ${msg}`);
    }
  }

  if (isResendConfigured()) {
    try {
      const result = await sendViaResend({ to, subject, html, text });
      console.info("[mailer] sent via Resend", result.messageId, "to:", to);
      return result;
    } catch (err) {
      const msg = err?.message || String(err);
      console.error("[mailer] Resend failed:", msg);
      errors.push(`resend: ${msg}`);
    }
  }

  return {
    sent: false,
    skipped: false,
    error: errors.join(" | ") || "Email send failed",
  };
}

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
