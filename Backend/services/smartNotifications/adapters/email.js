import { isMailConfigured, sendMail } from "../../mail/mailer.js";

export async function sendEmail({ job }) {
  if (!isMailConfigured()) {
    return {
      ok: false,
      permanent: true,
      provider: "email",
      result: "skipped",
      errorCode: "EMAIL_NOT_CONFIGURED",
      responseSummary: "Mail relay not configured",
    };
  }

  const to = job.recipient?.email;
  if (!to) {
    return {
      ok: false,
      permanent: true,
      provider: "email",
      result: "skipped",
      errorCode: "NO_EMAIL",
      responseSummary: "Recipient has no email",
    };
  }

  try {
    const info = await sendMail({
      to,
      subject: job.subject || "Notification",
      text: job.body,
      html: `<pre style="font-family:inherit;white-space:pre-wrap">${String(job.body || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</pre>`,
    });
    return {
      ok: true,
      provider: "email",
      providerMessageId: info?.id || info?.messageId || "",
      result: "sent",
    };
  } catch (err) {
    return {
      ok: false,
      permanent: false,
      provider: "email",
      result: "failed",
      errorCode: "SEND_FAILED",
      responseSummary: err.message,
    };
  }
}
