/**
 * WhatsApp adapter — no-op until Meta Cloud API credentials are set.
 */
export function isWhatsAppConfigured() {
  return Boolean(
    process.env.WHATSAPP_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID,
  );
}

export async function sendWhatsApp({ job }) {
  if (!isWhatsAppConfigured()) {
    return {
      ok: false,
      permanent: true,
      provider: "whatsapp",
      result: "skipped",
      errorCode: "WHATSAPP_NOT_CONFIGURED",
      responseSummary: "WhatsApp Cloud API credentials not set",
    };
  }

  const mobile = job.recipient?.mobile;
  if (!mobile) {
    return {
      ok: false,
      permanent: true,
      provider: "whatsapp",
      result: "skipped",
      errorCode: "NO_MOBILE",
      responseSummary: "Recipient has no mobile",
    };
  }

  return {
    ok: false,
    permanent: true,
    provider: "whatsapp",
    result: "skipped",
    errorCode: "WHATSAPP_PROVIDER_STUB",
    responseSummary: "WhatsApp adapter stub — credentials present but send not wired",
  };
}
