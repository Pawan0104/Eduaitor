/**
 * SMS adapter — no-op until SMS_PROVIDER credentials are set (MSG91/Twilio pattern).
 */
export function isSmsConfigured() {
  return Boolean(
    process.env.SMS_PROVIDER &&
      (process.env.SMS_API_KEY || process.env.TWILIO_AUTH_TOKEN || process.env.MSG91_AUTH_KEY),
  );
}

export async function sendSms({ job }) {
  if (!isSmsConfigured()) {
    return {
      ok: false,
      permanent: true,
      provider: "sms",
      result: "skipped",
      errorCode: "SMS_NOT_CONFIGURED",
      responseSummary: "SMS credentials not set",
    };
  }

  const mobile = job.recipient?.mobile;
  if (!mobile) {
    return {
      ok: false,
      permanent: true,
      provider: "sms",
      result: "skipped",
      errorCode: "NO_MOBILE",
      responseSummary: "Recipient has no mobile",
    };
  }

  // Provider wiring reserved for Phase 1.5 — fail soft with clear reason.
  return {
    ok: false,
    permanent: true,
    provider: process.env.SMS_PROVIDER || "sms",
    result: "skipped",
    errorCode: "SMS_PROVIDER_STUB",
    responseSummary: "SMS provider adapter stub — credentials present but send not wired",
  };
}
