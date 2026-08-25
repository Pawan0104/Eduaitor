import { isMailConfigured, sendMail } from "../../mail/mailer.js";
import { buildCredentialWelcomeEmail } from "../../mail/emailTemplates.js";

/**
 * Send branded welcome + credential email. Never throws — returns a result object.
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
    credentialBlocks,
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

  const blocks =
    Array.isArray(credentialBlocks) && credentialBlocks.length
      ? credentialBlocks
      : [
          {
            title: `${roleLabel} login`,
            username,
            password,
          },
        ];

  const { subject, text, html } = buildCredentialWelcomeEmail({
    name,
    roleLabel,
    schoolName,
    credentialBlocks: blocks,
    extraLines,
  });

  return sendMail({
    to,
    subject,
    text,
    html,
  });
}
