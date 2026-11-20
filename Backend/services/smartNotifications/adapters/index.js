import { sendInApp } from "./inApp.js";
import { sendPush } from "./push.js";
import { sendEmail } from "./email.js";
import { sendSms, isSmsConfigured } from "./sms.js";
import { sendWhatsApp, isWhatsAppConfigured } from "./whatsapp.js";
import { isMailConfigured } from "../../mail/mailer.js";

export async function dispatchChannel(channel, ctx) {
  switch (channel) {
    case "in_app":
      return sendInApp(ctx);
    case "push":
      return sendPush(ctx);
    case "email":
      return sendEmail(ctx);
    case "sms":
      return sendSms(ctx);
    case "whatsapp":
      return sendWhatsApp(ctx);
    default:
      return {
        ok: false,
        permanent: true,
        provider: channel,
        result: "failed",
        errorCode: "UNKNOWN_CHANNEL",
        responseSummary: `Unknown channel ${channel}`,
      };
  }
}

export function getChannelStatus() {
  const fcmConfigured = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
  return {
    in_app: { enabled: true, configured: true, label: "In-app inbox" },
    push: {
      enabled: true,
      configured: fcmConfigured,
      label: "Push (FCM)",
    },
    email: {
      enabled: true,
      configured: isMailConfigured(),
      label: "Email",
    },
    sms: {
      enabled: true,
      configured: isSmsConfigured(),
      label: "SMS",
    },
    whatsapp: {
      enabled: true,
      configured: isWhatsAppConfigured(),
      label: "WhatsApp",
    },
  };
}
