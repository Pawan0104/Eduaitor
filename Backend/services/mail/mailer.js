import nodemailer from "nodemailer";
import { Resend } from "resend";

let transporter = null;
let warnedMissingConfig = false;

export function isSmtpConfigured() {
  if (String(process.env.EMAIL_SMTP_DISABLED || "").toLowerCase() === "true") {
    return false;
  }
  return Boolean(
    process.env.EMAIL_HOST &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS &&
      (process.env.EMAIL_FROM || process.env.EMAIL_USER),
  );
}

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function isRelayConfigured() {
  return Boolean(process.env.MAIL_RELAY_URL && process.env.MAIL_RELAY_SECRET);
}

export function isMailConfigured() {
  return isSmtpConfigured() || isResendConfigured() || isRelayConfigured();
}

function parseFrom(raw) {
  const s = String(raw || "").trim();
  const m = s.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) return { name: m[1].replace(/^"|"$/g, "").trim(), email: m[2].trim() };
  if (s.includes("@")) return { name: "Eduaitor", email: s };
  return {
    name: "Eduaitor",
    email: process.env.EMAIL_USER || "support@eduaitor.com",
  };
}

function getSmtpFrom() {
  return (
    process.env.EMAIL_FROM ||
    (process.env.EMAIL_USER
      ? `Eduaitor <${process.env.EMAIL_USER}>`
      : "Eduaitor <support@eduaitor.com>")
  );
}

function getResendFrom() {
  return (
    process.env.RESEND_FROM ||
    process.env.EMAIL_FROM ||
    "Eduaitor <onboarding@resend.dev>"
  );
}

function getTransporter() {
  if (!isSmtpConfigured()) return null;
  if (transporter) return transporter;

  const port = Number(process.env.EMAIL_PORT || 587);
  const secure =
    String(process.env.EMAIL_SECURE || "").toLowerCase() === "true" ||
    port === 465;
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
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
  });

  return transporter;
}

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
    from: getSmtpFrom(),
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
    from: getResendFrom(),
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

async function sendViaRelay({ to, subject, text, html }) {
  const url = process.env.MAIL_RELAY_URL;
  const secret = process.env.MAIL_RELAY_SECRET;
  if (!url || !secret) throw new Error("Mail relay not configured");

  const from = parseFrom(getSmtpFrom());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Mail-Relay-Secret": secret,
      },
      body: JSON.stringify({
        to,
        subject,
        text,
        html,
        fromEmail: from.email,
        fromName: from.name,
      }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `Relay HTTP ${res.status}`);
    }
    return {
      sent: true,
      skipped: false,
      messageId: data.id || `relay-${Date.now()}`,
      to,
      provider: "cpanel-relay",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Delivery order on Render:
 * 1) cPanel relay (GoDaddy can send; Render SMTP to mail.eduaitor.com times out)
 * 2) SMTP (works locally / if unblocked)
 * 3) Resend (only if domain verified; testing keys are recipient-limited)
 */
export async function sendMail({ to, subject, text, html, replyTo } = {}) {
  if (!to) {
    return { sent: false, skipped: true, reason: "No email address" };
  }

  if (!isMailConfigured()) {
    if (!warnedMissingConfig) {
      console.warn(
        "[mailer] Mail not configured (set MAIL_RELAY_* and/or EMAIL_* / RESEND_API_KEY).",
      );
      warnedMissingConfig = true;
    }
    return { sent: false, skipped: true, reason: "Mail not configured" };
  }

  const errors = [];

  if (isRelayConfigured()) {
    try {
      const result = await sendViaRelay({ to, subject, text, html });
      console.info("[mailer] sent via cPanel relay", result.messageId, "to:", to);
      return result;
    } catch (err) {
      const msg = err?.message || String(err);
      console.warn("[mailer] relay failed:", msg);
      errors.push(`relay: ${msg}`);
    }
  }

  if (isSmtpConfigured()) {
    try {
      const result = await Promise.race([
        sendViaSmtp({ to, subject, text, html, replyTo }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("SMTP send timeout")), 12_000),
        ),
      ]);
      console.info("[mailer] sent via SMTP", result.messageId, "to:", to);
      return result;
    } catch (err) {
      const msg = err?.message || String(err);
      console.warn("[mailer] SMTP failed:", msg);
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
