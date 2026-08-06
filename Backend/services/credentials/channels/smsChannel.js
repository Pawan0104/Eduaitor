/**
 * Future SMS delivery (Twilio / MSG91 / etc.).
 * Stub only — never throws; create flows stay non-blocking.
 */
export async function sendCredentialSms(payload) {
  const { mobile, username } = payload || {};
  if (!mobile) {
    return { sent: false, skipped: true, reason: "No mobile number" };
  }

  // When SMS is wired, check SMS_PROVIDER / API keys here and send.
  console.info(
    `[credentials/sms] Stub — would SMS ${mobile} username=${username} (SMS not configured)`,
  );
  return { sent: false, skipped: true, reason: "SMS not configured" };
}
